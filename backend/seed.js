import { db } from './db.js';
import { users } from './schema.js';
import { hashPassword } from './utils/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const seed = async () => {
    console.log('Seeding database...');

    const email = 'admin@domain.com';
    const password = 'admin'; // Change this in production!

    try {
        const passwordHash = await hashPassword(password);

        await db.insert(users).values({
            email,
            passwordHash,
            role: 'super_admin'
        }).onConflictDoNothing();

        console.log(`Seeding complete. User: ${email} Pwd: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seed();
