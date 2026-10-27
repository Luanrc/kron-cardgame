import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
export const messages = sqliteTable("messages", {
 id: integer("id").primaryKey({ autoIncrement: true }),
 player: integer("player").notNull(),
 requestId: text("request_id").notNull().unique(),
});