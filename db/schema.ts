import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
export const analyses = sqliteTable("analyses", {
    id: text("id").primaryKey(), owner: text("owner").notNull(), type: text("type").notNull(),
    title: text("title").notNull(), createdAt: text("created_at").notNull(), payload: text("payload").notNull(),
}, table => [index("idx_analyses_owner_created").on(table.owner, table.createdAt)]);
