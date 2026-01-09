import { db } from '../db.js';
import { elections, questions, options } from '../schema.js';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '../utils/auth.js';
import { getElectionStats } from '../utils/stats.js';

export default async function electionRoutes(fastify, _options) {

    // Protect all routes
    fastify.addHook('preHandler', authenticate);

    // GET /api/elections - List all elections
    fastify.get('/', async (request, reply) => {
        try {
            const allElections = await db.select().from(elections).orderBy(desc(elections.createdAt));
            return allElections;
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to fetch elections' });
        }
    });

    // POST /api/elections - Create new election with questions/options
    fastify.post('/', async (request, reply) => {
        const { title, slug, description, startDate, endDate, questions: questionsData } = request.body;
        const userId = request.user.id;

        if (!title || !slug || !startDate || !endDate) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            const newElection = await db.transaction(async (tx) => {
                // 1. Create Election
                const [election] = await tx.insert(elections).values({
                    title,
                    slug,
                    description,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    createdBy: userId,
                    status: 'draft'
                }).returning();

                // 2. Create Questions & Options
                if (questionsData && Array.isArray(questionsData)) {
                    for (const [qIndex, qData] of questionsData.entries()) {
                        const [question] = await tx.insert(questions).values({
                            electionId: election.id,
                            title: qData.title,
                            type: qData.type || 'single_choice',
                            maxSelections: qData.maxSelections || 1,
                            order: qIndex
                        }).returning();

                        if (qData.options && Array.isArray(qData.options)) {
                            for (const [oIndex, oData] of qData.options.entries()) {
                                await tx.insert(options).values({
                                    questionId: question.id,
                                    text: oData.text,
                                    order: oIndex
                                });
                            }
                        }
                    }
                }
                return election;
            });

            return newElection;

        } catch (err) {
            fastify.log.error(err);
            if (err.code === '23505') { // Unique violation
                return reply.code(409).send({ error: 'Slug already exists' });
            }
            return reply.code(500).send({ error: 'Failed to create election' });
        }
    });

    // GET /api/elections/:id - Get full details
    fastify.get('/:id', async (request, reply) => {
        const { id } = request.params;

        try {
            // Fetch election
            const [election] = await db.select().from(elections).where(eq(elections.id, id));
            if (!election) return reply.code(404).send({ error: 'Election not found' });

            // Fetch questions (manual join for control, or use query builder relations from Drizzle)
            // Using query builder for cleaner nested result if configured, but manual selection is safe
            const electionQuestions = await db.select().from(questions)
                .where(eq(questions.electionId, id))
                .orderBy(questions.order);

            const resultQuestions = [];
            for (const q of electionQuestions) {
                const questionOptions = await db.select().from(options)
                    .where(eq(options.questionId, q.id))
                    .orderBy(options.order);
                resultQuestions.push({ ...q, options: questionOptions });
            }

            return { ...election, questions: resultQuestions };

        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to fetch election details' });
        }
    });

    // GET /api/elections/:id/results - Get aggregated results
    fastify.get('/:id/results', async (request, reply) => {
        const { id } = request.params;
        try {
            const stats = await getElectionStats(id);
            return { stats };
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Failed to fetch results' });
        }
    });
}
