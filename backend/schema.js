import { pgTable, uuid, varchar, text, integer, boolean, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const electionStatusEnum = pgEnum('election_status', ['draft', 'active', 'ended', 'archived']);
export const questionTypeEnum = pgEnum('question_type', ['single_choice', 'multiple_choice']);

// Users
export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(), // 'super_admin' or 'election_admin'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Elections
export const elections = pgTable('elections', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    status: electionStatusEnum('status').default('draft'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Questions
export const questions = pgTable('questions', {
    id: uuid('id').defaultRandom().primaryKey(),
    electionId: uuid('election_id').references(() => elections.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    type: questionTypeEnum('type').notNull(),
    description: text('description'),
    maxSelections: integer('max_selections').default(1),
    order: integer('order').default(0),
});

// Options
export const options = pgTable('options', {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
    text: text('text').notNull(),
    order: integer('order').default(0),
});

// Voters (Registry)
export const voters = pgTable('voters', {
    id: uuid('id').defaultRandom().primaryKey(),
    electionId: uuid('election_id').references(() => elections.id, { onDelete: 'cascade' }).notNull(),
    emailHash: varchar('email_hash', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).unique().notNull(),
    nameEncrypted: text('name_encrypted'),
    hasVoted: boolean('has_voted').default(false),
    votedAt: timestamp('voted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => {
    return {
        tokenHashIdx: index('idx_voters_token_hash').on(table.tokenHash),
        electionIdIdx: index('idx_voters_election_id').on(table.electionId),
    };
});

// Votes (Ballot Box)
export const votes = pgTable('votes', {
    id: uuid('id').defaultRandom().primaryKey(),
    electionId: uuid('election_id').references(() => elections.id, { onDelete: 'cascade' }).notNull(),
    questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
    optionId: uuid('option_id').references(() => options.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => {
    return {
        electionQuestionIdx: index('idx_votes_election_question').on(table.electionId, table.questionId),
    };
});

// Relations
export const electionsRelations = relations(elections, ({ many }) => ({
    questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
    election: one(elections, {
        fields: [questions.electionId],
        references: [elections.id],
    }),
    options: many(options),
}));

export const optionsRelations = relations(options, ({ one }) => ({
    question: one(questions, {
        fields: [options.questionId],
        references: [questions.id],
    }),
}));
