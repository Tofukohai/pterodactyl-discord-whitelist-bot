"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
function require_env(key) {
    const value = process.env[key];
    if (!value)
        throw new Error(`Missing required environment variable: ${key}`);
    return value;
}
function optional_env(key, fallback) {
    return process.env[key] ?? fallback;
}
exports.config = {
    discord: {
        token: require_env("DISCORD_TOKEN"),
        client_id: require_env("DISCORD_CLIENT_ID"),
        whitelist_channel_id: require_env("WHITELIST_CHANNEL_ID"),
        admin_role_id: optional_env("ADMIN_ROLE_ID", ""),
    },
    pterodactyl: {
        api_url: require_env("PTERODACTYL_API_URL").replace(/\/$/, ""),
        api_key: require_env("PTERODACTYL_API_KEY"),
        server_id: require_env("PTERODACTYL_SERVER_ID"),
    },
    limits: {
        max_whitelists_per_user: parseInt(optional_env("MAX_WHITELISTS_PER_USER", "1"), 10),
        cooldown_seconds: parseInt(optional_env("COOLDOWN_SECONDS", "60"), 10),
    },
};
//# sourceMappingURL=config.js.map