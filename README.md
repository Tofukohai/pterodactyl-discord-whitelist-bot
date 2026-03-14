# MC Whitelist Bot

> [!WARNING]
> ## ⚠️ VIBE CODED ⚠️
> **This project was entirely vibe coded with Claude (claude-sonnet-4-6) in a single session.**
> It has not been audited, battle-tested, or reviewed by a senior engineer sober at 9am.
> Use in production at your own risk. Things may break. Edges may be sharp.

---

A Discord bot that lets players whitelist themselves on a Minecraft Java Edition server via the Pterodactyl panel — no admin intervention required.

## Features

- Players self-whitelist using slash commands in a designated channel
- Mojang API lookup — validates the username exists and corrects capitalisation
- Confirmation button flow before any action is taken
- Per-user slot limits (configurable, overridable per-user by admins)
- Per-user cooldown to prevent API spam
- Full audit trail via SQLite (soft deletes — history is kept)
- Admin commands for managing the full whitelist
- All responses are ephemeral (only visible to the user who ran the command)
- All user-facing text is in **German**

---

## Stack

- **Runtime:** Node.js 22+ (uses built-in `node:sqlite` — no native compilation required)
- **Language:** TypeScript
- **Discord library:** discord.js v14
- **Database:** SQLite via `node:sqlite` (built-in, file-based, no external server)
- **Panel integration:** Pterodactyl Client API (console commands + file API)

---

## Commands

### User Commands

These commands are restricted to the configured whitelist channel. All responses are ephemeral.

#### `/whitelist <username>`
Add a Minecraft username to the server whitelist.

**Flow:**
1. Channel check → cooldown check → regex validation (`^[a-zA-Z0-9_]{3,16}$`)
2. Mojang API lookup — confirms the account exists, corrects casing
3. Checks if the name is already in the database (yours or someone else's)
4. Checks if you've reached your slot limit
5. Shows a confirmation embed with **Confirm** / **Cancel** buttons (30s timeout)
6. On confirm: checks `whitelist.json` on the server (handles manually pre-added players), sends `whitelist add <name>` via Pterodactyl, records in DB

**Limits:** Each user gets `MAX_WHITELISTS_PER_USER` slots (default: 1). Admins can override per-user.

---

#### `/unwhitelist <username>`
Remove one of your own whitelisted usernames.

- Only works on usernames registered to your Discord account
- Shows a confirmation embed with **Confirm** / **Cancel** buttons (30s timeout)
- On confirm: sends `whitelist remove <name>` via Pterodactyl, soft-deletes the DB entry
- Subject to the same cooldown as `/whitelist`

---

#### `/mystatus`
Shows your current whitelist status (ephemeral).

Displays:
- Your whitelisted usernames
- Slots used / total available
- Current cooldown status

---

### Admin Commands

Requires the configured `ADMIN_ROLE_ID` role. All responses are ephemeral.

#### `/wl-admin list [page]`
Paginated list of all active whitelist entries (10 per page).

Shows: Minecraft name, Discord mention, date added.

---

#### `/wl-admin remove <username>`
Force-removes any username from the whitelist, regardless of who added it.

Calls `whitelist remove` on the server and soft-deletes the DB entry.

---

#### `/wl-admin reset <@user>`
Wipes all whitelist slots for a Discord user.

Removes all their active entries from both the server and the database simultaneously.

---

#### `/wl-admin limit <@user> <slots>`
Overrides the whitelist slot limit for a specific user.

Range: 0–50. Persists across bot restarts (stored in DB). Does not affect existing entries — only controls how many more they can add.

---

#### `/wl-admin lookup <username>`
Shows who owns a given Minecraft username.

Returns: Minecraft name, Discord mention, Discord tag, date whitelisted.

---

## Setup

### 1. Prerequisites

- Node.js 22 or later
- A Pterodactyl panel with a Minecraft Java server
- A Discord application with a bot token

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
DISCORD_TOKEN=           # Bot token from Discord Developer Portal
DISCORD_CLIENT_ID=       # Application ID (General Information tab)
PTERODACTYL_API_URL=     # e.g. https://panel.yourdomain.com/api
PTERODACTYL_API_KEY=     # Client API key (Account → API Credentials in panel)
PTERODACTYL_SERVER_ID=   # Short server identifier from the panel URL
WHITELIST_CHANNEL_ID=    # Channel where commands are allowed (right-click → Copy ID)
ADMIN_ROLE_ID=           # Role that can use /wl-admin (right-click role → Copy ID)
MAX_WHITELISTS_PER_USER= # Default slot limit per user (default: 1)
COOLDOWN_SECONDS=        # Seconds between whitelist/unwhitelist actions (default: 60)
```

**Getting IDs:** Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode), then right-click any channel, role, or server to copy its ID.

**Pterodactyl API key:** Panel → Account (top right) → API Credentials → Create. Use a **Client** key, not an Application key.

**Pterodactyl Server ID:** The 8-character identifier in your server's URL: `panel.com/server/`**`abc12345`**

### 3. Install dependencies

```bash
npm install
```

### 4. Register slash commands

For instant registration to a single server (recommended for testing):
```bash
# Add to .env:
GUILD_ID=<right-click your server → Copy Server ID>

npm run deploy
```

For global registration (takes up to 1 hour to propagate):
```bash
# Leave GUILD_ID unset, then:
npm run deploy
```

You only need to re-run deploy when command names or options change — not on every restart.

### 5. Run the bot

**Development (no build step):**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

---

## Deployment (Pterodactyl)

The bot is designed to run on Pterodactyl itself using a Node.js git-clone egg (e.g. from [parkervcp/eggs](https://github.com/parkervcp/eggs)).

**Key points:**
- Push your code to a **public** GitHub repo — there are no secrets in the repository (`.env` is gitignored)
- Set all environment variables as **Startup Variables** in the Pterodactyl panel — they are injected directly into `process.env`, no `.env` file needed on the server
- `npm install` automatically compiles TypeScript via the `postinstall` script
- Set the startup file to `dist/index.js`
- The SQLite database (`whitelist.db`) is created automatically in the working directory on first start

---

## Database

SQLite file at `whitelist.db` (or `DB_PATH` env override). Two tables:

**`whitelist_entries`** — full audit log of all whitelist actions
| Column | Description |
|---|---|
| `discord_id` | Discord user ID of the owner |
| `discord_name` | Discord tag at time of whitelisting |
| `mc_username` | Minecraft username (unique among active entries) |
| `whitelisted_at` | Timestamp of addition |
| `removed_at` | Timestamp of removal, or NULL if still active |

**`user_overrides`** — per-user slot limit overrides set by admins

Entries are **soft-deleted** (the `removed_at` column is set). History is preserved. Re-adding a previously removed username reactivates the row.

---

## Security Notes

- Minecraft usernames are validated against `^[a-zA-Z0-9_]{3,16}$` before anything else — no unsanitised input reaches Pterodactyl
- Commands only respond in the configured channel — silently denied elsewhere
- Per-user cooldown prevents API spam
- Ephemeral replies prevent username leakage in public channels
- All admin actions require the configured role — not just any server admin permission
- Error messages never expose API URLs, keys, or stack traces to users
