import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  smallint,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sequences } from "./sequences";

// A/Z-testable message variants attached to a single step of a sequence.
// The variant used at send time is chosen by pickVariant() in
// app/api/sequences/[id]/variants/_lib.ts via epsilon-greedy over the
// per-variant positive-response rate (positiveResponseCount / impressionCount).
export const messageVariants = pgTable(
  "message_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceId: uuid("sequence_id")
      .notNull()
      .references(() => sequences.id, { onDelete: "cascade" }),
    // Which step in sequences.steps[] this variant belongs to (1-indexed to
    // match SequenceStep.stepNumber).
    stepNumber: smallint("step_number").notNull(),
    // Short human key: "A", "B", "C". Not enforced globally unique — uniqueness
    // is only meaningful per (sequenceId, stepNumber).
    variantKey: varchar("variant_key", { length: 20 }).notNull(),

    subject: varchar("subject", { length: 1000 }),
    body: text("body"),

    isActive: boolean("is_active").default(true),

    // Live stats fed by the send/reply pipeline; also used by pickVariant().
    impressionCount: integer("impression_count").default(0).notNull(),
    positiveResponseCount: integer("positive_response_count")
      .default(0)
      .notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    stepIdx: index("idx_message_variants_step").on(
      table.sequenceId,
      table.stepNumber
    ),
  })
);

export type MessageVariant = typeof messageVariants.$inferSelect;
export type NewMessageVariant = typeof messageVariants.$inferInsert;
