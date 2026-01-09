import { db } from '../db.js';
import { votes } from '../schema.js';
import { eq, sql } from 'drizzle-orm';

export const getElectionStats = async (electionId) => {
    // Group by question and option, count votes
    const rawStats = await db.select({
        questionId: votes.questionId,
        optionId: votes.optionId,
        count: sql`count(${votes.id})::int`
    })
        .from(votes)
        .where(eq(votes.electionId, electionId))
        .groupBy(votes.questionId, votes.optionId);

    return rawStats;
};
