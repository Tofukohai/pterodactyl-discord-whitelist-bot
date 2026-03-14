"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_admin = is_admin;
const config_js_1 = require("../config.js");
function is_admin(interaction) {
    const member = interaction.member;
    if (!member)
        return false;
    return member.roles.cache.has(config_js_1.config.discord.admin_role_id);
}
//# sourceMappingURL=permissions.js.map