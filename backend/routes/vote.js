import { voters, votes, elections, questions, options } from '../schema.js';
import { db } from '../db.js';
import { eq, and, sql } from 'drizzle-orm';
import { verifyJwt } from '../utils.js';

export default async function voteRoutes(fastify, _options) {

    // Middleware to verify voter token
    fastify.addHook('preHandler', async (request, reply) => {
        // Only apply to routes in this plugin? No, Fastify encapsulation helper usually used.
        // We'll enforce it manually or via onRequest if this file serves only protected endpoints.
        // Let's assume this plugin is registered with a prefix and we check auth inside handlers or globally.
        // For simplicity, we check inside handlers here since we might have public GET later.
    });

    // GET /ballot
    // Returns questions and options for the election associated with the token
    fastify.get('/ballot', async (request, reply) => {
        const auth = request.headers.authorization;
        if (!auth) return reply.code(401).send({ error: 'Missing token' });

        const payload = verifyJwt(auth.replace('Bearer ', ''));
        if (!payload || payload.role !== 'voter') {
            return reply.code(401).send({ error: 'Invalid token' });
        }

        const { electionId, voterId } = payload;

        // Check if election is active
        const [election] = await db.select().from(elections).where(eq(elections.id, electionId)).limit(1);
        if (!election) return reply.code(404).send({ error: 'Election not found' });
        if (election.status !== 'active') {
            const [voter] = await db.select().from(voters).where(eq(voters.id, voterId));
            // Allow viewing if they JUST voted (to see thank you screen?)
            // But generally, ballot is only for active elections.
            return reply.code(403).send({ error: 'Election is not active', status: election.status });
        }

        // Check if already voted
        const [voter] = await db.select().from(voters).where(eq(voters.id, voterId)).limit(1);
        if (voter.hasVoted) return reply.code(403).send({ error: 'Already voted', hasVoted: true });

        // Fetch questions and options
        const questionsList = await db.query.questions.findMany({
            where: eq(questions.electionId, electionId),
            orderBy: (qs, { asc }) => [asc(qs.order)],
            with: {
                options: {
                    orderBy: (ops, { asc }) => [asc(ops.order)],
                }
            }
        });

        return { election, questions: questionsList };
    });

    // POST /submit
    fastify.post('/submit', async (request, reply) => {
        const auth = request.headers.authorization;
        if (!auth) return reply.code(401).send({ error: 'Missing token' });
        const payload = verifyJwt(auth.replace('Bearer ', ''));
        if (!payload || payload.role !== 'voter') return reply.code(401).send({ error: 'Invalid token' });

        const { electionId, voterId } = payload;
        const { ballot } = request.body; // Array of { questionId, optionId } (or array of optionIds for multi)

        if (!ballot || !Array.isArray(ballot) || ballot.length === 0) {
            return reply.code(400).send({ error: 'Invalid ballot data' });
        }

        // 1. Validate Election Status
        const [election] = await db.select().from(elections).where(eq(elections.id, electionId));
        if (election.status !== 'active') return reply.code(403).send({ error: 'Election closed' });

        try {
            await db.transaction(async (tx) => {
                // 2. Check & Lock Voter
                // "FOR UPDATE" is ideal but Drizzle depends on driver support.
                // basic check:
                const [voter] = await tx.select().from(voters).where(eq(voters.id, voterId));
                if (voter.hasVoted) {
                    throw new Error('ALREADY_VOTED');
                }

                // 3. Mark Voted
                await tx.update(voters).set({ hasVoted: true, votedAt: new Date() }).where(eq(voters.id, voterId));

                // 4. Insert Votes
                // Transform ballot to rows
                // ballot format expected: [{ questionId: "...", optionId: "..." }, ...]
                // Or simplified: { "qID": "oID", "qID2": ["oID1", "oID2"] }
                // Let's assume normalized array of choices: { questionId, optionId }

                const voteRows = ballot.map(choice => ({
                    electionId,
                    questionId: choice.questionId,
                    optionId: choice.optionId
                }));

                if (voteRows.length > 0) {
                    await tx.insert(votes).values(voteRows);
                }
            });

            // 5. Success - Emit Events
            // (Broadcast participation bump)
            // fastify.io.to(`election:${electionId}`).emit('stats_update', { ... });
            // (Broadcast results to superadmin room)

            // We'll just emit a generic 'new_vote' event for now and let the server agg logic handle it?
            // Or trigger a recalc.
            if (fastify.io) {
                fastify.io.to(`admin_election:${electionId}`).emit('vote_cast', { electionId });
            }

            return { success: true };

        } catch (err) {
            if (err.message === 'ALREADY_VOTED') {
                return reply.code(403).send({ error: 'You have already voted' });
            }
            console.error(err);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
}
