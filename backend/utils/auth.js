import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const signToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

// Fastify helper for protecting routes
export const authenticate = async (request, reply) => {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token);

        if (!decoded) {
            return reply.code(401).send({ error: 'Invalid token' });
        }

        request.user = decoded;
    } catch (err) {
        return reply.code(401).send({ error: 'Authentication failed' });
    }
};
