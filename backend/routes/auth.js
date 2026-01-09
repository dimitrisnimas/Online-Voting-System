import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';
import { comparePassword, signToken } from '../utils/auth.js';

export default async function authRoutes(fastify, options) {

    fastify.post('/login', async (request, reply) => {
        const { email, password } = request.body;

        if (!email || !password) {
            return reply.code(400).send({ error: 'Email and password are required' });
        }

        try {
            const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
            const user = result[0];

            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            const isValid = await comparePassword(password, user.passwordHash);

            if (!isValid) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            const token = signToken({
                id: user.id,
                email: user.email,
                role: user.role
            });

            return { token, user: { id: user.id, email: user.email, role: user.role } };

        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });
}
