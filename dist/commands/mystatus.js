"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const config_js_1 = require("../config.js");
const channel_js_1 = require("../guards/channel.js");
const cooldown_js_1 = require("../guards/cooldown.js");
const database_js_1 = require("../services/database.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("mystatus")
    .setDescription("Zeige deine gewhitelisteten Minecraft-Namen und verbleibenden Slots");
async function execute(interaction) {
    if (!(0, channel_js_1.check_channel)(interaction)) {
        await interaction.reply({ content: "Dieser Befehl kann nur im dafür vorgesehenen Kanal verwendet werden.", flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    // Check cooldown before hitting the DB
    const cooldown = (0, cooldown_js_1.check_cooldown)(interaction.user.id);
    const entries = (0, database_js_1.get_user_entries)(interaction.user.id);
    const max_slots = (0, database_js_1.get_user_max_slots)(interaction.user.id, config_js_1.config.limits.max_whitelists_per_user);
    const used = entries.length;
    const remaining = max_slots - used;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Dein Whitelist-Status")
        .setColor(0x5865f2)
        .addFields({
        name: "Gewhitelistete Namen",
        value: used > 0 ? entries.map((e) => `• \`${e.mc_username}\``).join("\n") : "Keine",
        inline: false,
    }, {
        name: "Slots",
        value: `${used} / ${max_slots} belegt (${remaining} übrig)`,
        inline: true,
    }, {
        name: "Cooldown",
        value: cooldown.on_cooldown ? `Noch ${cooldown.remaining_seconds}s` : "Bereit",
        inline: true,
    })
        .setTimestamp();
    await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
}
//# sourceMappingURL=mystatus.js.map