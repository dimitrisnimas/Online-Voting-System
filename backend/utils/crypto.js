import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Ideally these secrets should come from ENV, but for demo we will generate/derive them or use a fixed one if ENV missing.
// In production, ENCRYPTION_KEY must be 32 bytes hex string.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') : crypto.randomBytes(32);
const IV_LENGTH = 16;

export const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

export const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const hashEmail = (email) => {
    return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
};

export const encrypt = (text) => {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decrypt = (text) => {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
