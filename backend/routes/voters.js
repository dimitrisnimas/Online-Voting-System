import { db } from '../db.js';
import { voters, elections } from '../schema.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../utils/auth.js';
import { generateToken, hashToken, hashEmail, encrypt, decrypt } from '../utils/crypto.js';

export default async function voterRoutes(fastify, options) {

    // Protect all routes
    fastify.addHook('preHandler', authenticate);

    // POST /api/elections/:id/voters - Import voters & Generate Tokens
    fastify.post('/:id/voters', async (request, reply) => {
        const { id } = request.params;
        const { voters: voterList } = request.body; // Expects [{ name, email }, ...]

        if (!voterList || !Array.isArray(voterList)) {
            return reply.code(400).send({ error: 'Invalid voter list' });
        }

        // Check if election exists
        const [election] = await db.select().from(elections).where(eq(elections.id, id));
        if (!election) return reply.code(404).send({ error: 'Election not found' });

        const results = [];
        const errors = [];

        for (const voterData of voterList) {
            try {
                const { name, email } = voterData;
                if (!email) continue;

                const token = generateToken();
                const tokenHashStr = hashToken(token);
                const emailHashStr = hashEmail(email);
                const nameEncrypted = name ? encrypt(name) : null;

                // Insert voter
                await db.insert(voters).values({
                    electionId: id,
                    emailHash: emailHashStr,
                    tokenHash: tokenHashStr,
                    nameEncrypted: nameEncrypted,
                    hasVoted: false
                });

                // In a real app, queue email here. For now, we simulate.
                const magicLink = `${process.env.FRONTEND_URL}/vote/${election.slug}?token=${token}`;

                results.push({ email, magicLink }); // Admin sees this once to confirm or debug

                // Log for demo purposes
                console.log(`[EMAIL SEND] To: ${email} | Link: ${magicLink}`);

            } catch (err) {
                // Ignore duplicates gracefully
                if (err.code === '23505') {
                    errors.push({ email: voterData.email, error: 'Duplicate' });
                } else {
                    errors.push({ email: voterData.email, error: 'Failed' });
                }
            }
        }

        return {
            message: 'Voters processed',
            successCount: results.length,
            errorCount: errors.length,
            errors,
            preview: results
        };
    });

    // GET /api/elections/:id/voters - Get participation stats
    fastify.get('/:id/voters', async (request, reply) => {
        const { id } = request.params;

        try {
            const voterRecords = await db.select({
                hasVoted: voters.hasVoted,
                votedAt: voters.votedAt,
                nameEncrypted: voters.nameEncrypted,
                emailHash: voters.emailHash
            }).from(voters).where(eq(voters.electionId, id));

            const safeList = voterRecords.map(v => ({
                hasVoted: v.hasVoted,
                votedAt: v.votedAt,
                name: v.nameEncrypted ? decrypt(v.nameEncrypted) : 'Unknown',
            }));

            return { voters: safeList };
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed' });
        }
    });
}
