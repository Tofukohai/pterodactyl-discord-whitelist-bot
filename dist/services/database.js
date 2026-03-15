"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_user_entries = get_user_entries;
exports.get_user_max_slots = get_user_max_slots;
exports.get_entry_by_mc_username = get_entry_by_mc_username;
exports.add_entry = add_entry;
exports.remove_entry = remove_entry;
exports.reset_user_entries = reset_user_entries;
exports.set_user_override = set_user_override;
exports.get_active_entries_count = get_active_entries_count;
exports.get_active_entries_page = get_active_entries_page;
const node_sqlite_1 = require("node:sqlite");
const path_1 = __importDefault(require("path"));
const DB_PATH = process.env.DB_PATH ?? path_1.default.join(__dirname, "../../whitelist.db");
const db = new node_sqlite_1.DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS whitelist_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    discord_name TEXT NOT NULL,
    mc_username TEXT NOT NULL UNIQUE,
    whitelisted_at TEXT NOT NULL DEFAULT (datetime('now')),
    removed_at TEXT DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS user_overrides (
    discord_id TEXT PRIMARY KEY,
    max_slots INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_discord_id ON whitelist_entries(discord_id);
  CREATE INDEX IF NOT EXISTS idx_mc_username ON whitelist_entries(mc_username);
`);
// Prepared once at startup — not re-compiled on every call
const stmt = {
    get_user_entries: db.prepare("SELECT * FROM whitelist_entries WHERE discord_id = ? AND removed_at IS NULL ORDER BY whitelisted_at ASC"),
    get_user_max_slots: db.prepare("SELECT max_slots FROM user_overrides WHERE discord_id = ?"),
    get_entry_by_mc_username: db.prepare("SELECT * FROM whitelist_entries WHERE mc_username = ? AND removed_at IS NULL"),
    add_entry: db.prepare(`
    INSERT INTO whitelist_entries (discord_id, discord_name, mc_username, whitelisted_at, removed_at)
    VALUES (?, ?, ?, datetime('now'), NULL)
    ON CONFLICT(mc_username) DO UPDATE SET
      discord_id      = excluded.discord_id,
      discord_name    = excluded.discord_name,
      whitelisted_at  = datetime('now'),
      removed_at      = NULL
  `),
    remove_entry: db.prepare("UPDATE whitelist_entries SET removed_at = datetime('now') WHERE mc_username = ? AND removed_at IS NULL"),
    reset_user_get: db.prepare("SELECT mc_username FROM whitelist_entries WHERE discord_id = ? AND removed_at IS NULL"),
    reset_user_update: db.prepare("UPDATE whitelist_entries SET removed_at = datetime('now') WHERE discord_id = ? AND removed_at IS NULL"),
    set_user_override: db.prepare("INSERT INTO user_overrides (discord_id, max_slots) VALUES (?, ?) ON CONFLICT(discord_id) DO UPDATE SET max_slots = excluded.max_slots"),
    get_active_count: db.prepare("SELECT COUNT(*) as count FROM whitelist_entries WHERE removed_at IS NULL"),
    get_active_page: db.prepare("SELECT * FROM whitelist_entries WHERE removed_at IS NULL ORDER BY whitelisted_at DESC LIMIT ? OFFSET ?"),
};
function get_user_entries(discord_id) {
    return stmt.get_user_entries.all(discord_id);
}
function get_user_max_slots(discord_id, global_default) {
    const override = stmt.get_user_max_slots.get(discord_id);
    return override?.max_slots ?? global_default;
}
function get_entry_by_mc_username(mc_username) {
    return stmt.get_entry_by_mc_username.get(mc_username);
}
function add_entry(discord_id, discord_name, mc_username) {
    stmt.add_entry.run(discord_id, discord_name, mc_username);
}
function remove_entry(mc_username) {
    const result = stmt.remove_entry.run(mc_username);
    return result.changes > 0;
}
function reset_user_entries(discord_id) {
    const rows = stmt.reset_user_get.all(discord_id);
    const usernames = rows.map((r) => r.mc_username);
    if (usernames.length > 0) {
        stmt.reset_user_update.run(discord_id);
    }
    return usernames;
}
function set_user_override(discord_id, max_slots) {
    stmt.set_user_override.run(discord_id, max_slots);
}
function get_active_entries_count() {
    const row = stmt.get_active_count.get();
    return row.count;
}
function get_active_entries_page(page, page_size) {
    return stmt.get_active_page.all(page_size, page * page_size);
}
//# sourceMappingURL=database.js.map