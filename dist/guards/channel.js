"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check_channel = check_channel;
const config_js_1 = require("../config.js");
function check_channel(interaction) {
    return interaction.channelId === config_js_1.config.discord.whitelist_channel_id;
}
//# sourceMappingURL=channel.js.map