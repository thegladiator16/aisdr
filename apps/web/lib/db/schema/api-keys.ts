import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Personal API keys used to authenticate inbound requests from external
// systems (Zapier, form providers, CRMs, custom scripts) that need to
// push new leads into a user's AryaSDR workspace without going through
// Clerk.
//
// Security model:
//   - We only ever store the sha256 hash of the FULL key (`keyHash`).
//   - The prefix (`keyPrefix`) is stored plaintext so the UI can render
//     "arya_abcd1234…" for humans and so the inbound webhook route can
//     do a fast prefix lookup before hashing to verify.
//   - The plaintext key is returned exactly once — in the POST /api/api-keys
//     response body — and never persisted or logged server-side after that.
//   - `disabledAt` is set instead of deleting rows when a user revokes a
//     key from the settings UI; DELETE /api/api-keys/[id] hard-deletes.
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Human-friendly label chosen at creation time. Shown in the table
    // on the settings page so a user can tell "Zapier prod" from
    // "Typeform newsletter opt-in" without having to memorize prefixes.
    name: varchar("name", { length: 100 }).notNull(),

    // First ~12 chars of the plaintext key (e.g. "arya_a1b2c3d4"). Stored
    // plaintext for two reasons: (1) so the UI can show which key each
    // row represents without exposing the secret, and (2) so the inbound
    // webhook can index a lookup by prefix before running sha256.
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),

    // sha256 hex digest of the FULL plaintext key. 64 hex chars.
    keyHash: varchar("key_hash", { length: 64 }).notNull(),

    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Compound (userId, keyPrefix) lookup — used by the settings list
    // and (indirectly) by the inbound webhook when scoping validation.
    userPrefixIdx: index("idx_api_keys_user_prefix").on(
      table.userId,
      table.keyPrefix
    ),
  })
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
