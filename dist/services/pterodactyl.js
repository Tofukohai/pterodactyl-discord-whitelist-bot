"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_already_on_server_whitelist = is_already_on_server_whitelist;
exports.add_to_whitelist = add_to_whitelist;
exports.remove_from_whitelist = remove_from_whitelist;
const config_js_1 = require("../config.js");
const BASE = `${config_js_1.config.pterodactyl.api_url}/client/servers/${config_js_1.config.pterodactyl.server_id}`;
const HEADERS = {
    Authorization: `Bearer ${config_js_1.config.pterodactyl.api_key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
};
const WHITELIST_FILE_PATH = "%2Fwhitelist.json";
async function send_command(command) {
    const res = await fetch(`${BASE}/command`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ command }),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "(no body)");
        console.error(`[pterodactyl] Command failed (${res.status}): ${text}`);
        throw new Error(`Pterodactyl API error: ${res.status}`);
    }
}
// Reads whitelist.json from the server via the file API.
// Returns true if the player is already present on the server whitelist.
// Fails open (returns false) so an unreachable panel never blocks whitelisting.
async function is_already_on_server_whitelist(mc_username) {
    try {
        const res = await fetch(`${BASE}/files/contents?file=${WHITELIST_FILE_PATH}`, { headers: HEADERS });
        if (!res.ok) {
            console.warn(`[pterodactyl] Could not read whitelist.json (${res.status}), skipping pre-check`);
            return false;
        }
        const entries = (await res.json());
        return entries.some((e) => e.name.toLowerCase() === mc_username.toLowerCase());
    }
    catch (err) {
        console.warn("[pterodactyl] whitelist.json pre-check failed:", err);
        return false;
    }
}
async function add_to_whitelist(mc_username) {
    await send_command("whitelist add " + mc_username);
}
async function remove_from_whitelist(mc_username) {
    await send_command("whitelist remove " + mc_username);
}
//# sourceMappingURL=pterodactyl.js.map