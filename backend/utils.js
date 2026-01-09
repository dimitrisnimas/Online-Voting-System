import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Deterministic hash for tokens (so we can look them up)
// Using SHA-256 for speed and security
export const hashOneTimeToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
};

export const signJwt = (payload, expiresIn = '24h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyJwt = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};

export const generateRandomToken = () => {
    return crypto.randomBytes(32).toString('hex');
};
