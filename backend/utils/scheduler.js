import cron from 'node-cron';
import { db } from '../db.js';
import { elections } from '../schema.js';
import { eq, and, lte } from 'drizzle-orm';

export const startScheduler = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        console.log(`[Scheduler] Running check at ${now.toISOString()}`);

        try {
            // 1. Activate Elections
            // status: draft -> active IF startDate <= now
            const activated = await db.update(elections)
                .set({ status: 'active' })
                .where(and(
                    eq(elections.status, 'draft'),
                    lte(elections.startDate, now)
                ))
                .returning({ title: elections.title });

            if (activated.length > 0) {
                console.log(`[Scheduler] Activated ${activated.length} elections:`, activated.map(e => e.title));
            }

            // 2. End Elections
            // status: active -> ended IF endDate <= now
            const ended = await db.update(elections)
                .set({ status: 'ended' })
                .where(and(
                    eq(elections.status, 'active'),
                    lte(elections.endDate, now)
                ))
                .returning({ title: elections.title });

            if (ended.length > 0) {
                console.log(`[Scheduler] Ended ${ended.length} elections:`, ended.map(e => e.title));
            }

        } catch (err) {
            console.error('[Scheduler] Error:', err);
        }
    });
};
