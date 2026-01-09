import { db } from '../db.js';
import { elections, questions, options, voters, votes } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { hashToken } from '../utils/crypto.js';
import { getElectionStats } from '../utils/stats.js';

export default async function publicRoutes(fastify, _options) {

    // GET /api/public/elections/:slug - Get public election info
    fastify.get('/elections/:slug', async (request, reply) => {
        const { slug } = request.params;

        try {
            const [election] = await db.select().from(elections).where(eq(elections.slug, slug));

            if (!election) return reply.code(404).send({ error: 'Election not found' });
            if (election.status === 'draft') return reply.code(403).send({ error: 'Election is not yet active' });


            // Fetch questions & options
            const electionQuestions = await db.select().from(questions)
                .where(eq(questions.electionId, election.id))
                .orderBy(questions.order);

            const resultQuestions = [];
            for (const q of electionQuestions) {
                const questionOptions = await db.select().from(options)
                    .where(eq(options.questionId, q.id))
                    .orderBy(options.order);
                resultQuestions.push({
                    id: q.id,
                    title: q.title,
                    type: q.type,
                    maxSelections: q.maxSelections,
                    options: questionOptions.map(o => ({ id: o.id, text: o.text }))
                });
            }

            return {
                id: election.id,
                title: election.title,
                description: election.description,
                startDate: election.startDate,
                endDate: election.endDate,
                questions: resultQuestions
            };

        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // POST /api/public/vote - Submit anonymous vote
    fastify.post('/vote', async (request, reply) => {
        const { token, electionId, votes: userVotes } = request.body;
        // userVotes: [{ questionId, optionIds: [uuid, uuid] }]

        if (!token || !electionId || !Array.isArray(userVotes)) {
            return reply.code(400).send({ error: 'Invalid vote data' });
        }

        const tokenHashStr = hashToken(token);

        try {
            await db.transaction(async (tx) => {
                // 1. Verify Token
                const [voter] = await tx.select().from(voters)
                    .where(and(eq(voters.tokenHash, tokenHashStr), eq(voters.electionId, electionId)))
                    .limit(1);

                if (!voter) throw new Error('Invalid token');
                if (voter.hasVoted) throw new Error('Token already used');

                // 2. Mark Token Used (Critical: do this first or same transaction)
                await tx.update(voters)
                    .set({ hasVoted: true, votedAt: new Date() })
                    .where(eq(voters.id, voter.id));

                // 3. Insert Votes (Anonymously)
                // Need to validate that the options belong to the election/questions? 
                // Creating a basic validation check here is good practice.

                for (const voteEntry of userVotes) {
                    const { questionId, optionIds } = voteEntry;

                    if (Array.isArray(optionIds)) {
                        for (const optionId of optionIds) {
                            await tx.insert(votes).values({
                                electionId,
                                questionId,
                                optionId
                            });
                        }
                    }
                }
            });


            // Broadcast update via WebSocket
            (async () => {
                try {
                    const newStats = await getElectionStats(electionId);
                    fastify.io.to(`election:${electionId}`).emit('stats_update', { stats: newStats });
                } catch (e) {
                    fastify.log.error('WS Broadcast failed', e);
                }
            })();

            return { success: true };


        } catch (err) {
            fastify.log.error(err);
            if (err.message === 'Invalid token' || err.message === 'Token already used') {
                return reply.code(403).send({ error: err.message });
            }
            return reply.code(500).send({ error: 'Vote submission failed' });
        }
    });
}
