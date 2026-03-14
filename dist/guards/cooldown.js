"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check_cooldown = check_cooldown;
exports.set_cooldown = set_cooldown;
const config_js_1 = require("../config.js");
// Map of discord_id -> timestamp of last whitelisting action
const cooldowns = new Map();
function check_cooldown(discord_id) {
    const last = cooldowns.get(discord_id);
    if (!last)
        return { on_cooldown: false, remaining_seconds: 0 };
    const elapsed = (Date.now() - last) / 1000;
    const remaining = Math.ceil(config_js_1.config.limits.cooldown_seconds - elapsed);
    if (remaining > 0)
        return { on_cooldown: true, remaining_seconds: remaining };
    cooldowns.delete(discord_id); // prune expired entry so the map doesn't grow forever
    return { on_cooldown: false, remaining_seconds: 0 };
}
function set_cooldown(discord_id) {
    cooldowns.set(discord_id, Date.now());
}
//# sourceMappingURL=cooldown.js.map