"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const channel_js_1 = require("../guards/channel.js");
const cooldown_js_1 = require("../guards/cooldown.js");
const database_js_1 = require("../services/database.js");
const pterodactyl_js_1 = require("../services/pterodactyl.js");
const validation_js_1 = require("../services/validation.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("unwhitelist")
    .setDescription("Entferne einen deiner gewhitelisteten Minecraft-Namen")
    .addStringOption((opt) => opt
    .setName("username")
    .setDescription("Der zu entfernende Minecraft-Name")
    .setRequired(true)
    .setMinLength(3)
    .setMaxLength(16));
async function execute(interaction) {
    if (!(0, channel_js_1.check_channel)(interaction)) {
        await interaction.reply({ content: "Dieser Befehl kann nur im dafür vorgesehenen Kanal verwendet werden.", flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const cooldown = (0, cooldown_js_1.check_cooldown)(interaction.user.id);
    if (cooldown.on_cooldown) {
        await interaction.reply({
            content: `Du bist noch im Cooldown. Bitte warte noch **${cooldown.remaining_seconds}s**, bevor du diesen Befehl erneut verwendest.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    const raw_username = interaction.options.getString("username", true);
    const validation = (0, validation_js_1.validate_mc_username)(raw_username);
    if (!validation.valid) {
        await interaction.reply({ content: validation.reason, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const entry = (0, database_js_1.get_entry_by_mc_username)(raw_username);
    if (!entry) {
        await interaction.reply({ content: `**${raw_username}** ist nicht auf der Whitelist.`, flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (entry.discord_id !== interaction.user.id) {
        await interaction.reply({ content: "Du kannst nur Namen entfernen, die deinem eigenen Account gehören.", flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const confirm_btn = new discord_js_1.ButtonBuilder()
        .setCustomId("unwl_confirm")
        .setLabel(`Ja, ${entry.mc_username} entfernen`)
        .setStyle(discord_js_1.ButtonStyle.Danger);
    const cancel_btn = new discord_js_1.ButtonBuilder()
        .setCustomId("unwl_cancel")
        .setLabel("Abbrechen")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirm_btn, cancel_btn);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Entfernung bestätigen")
        .setDescription(`**${entry.mc_username}** von der Whitelist entfernen? Du kannst ihn später erneut hinzufügen, falls du deine Meinung änderst.`)
        .setColor(0xed4245)
        .setFooter({ text: "Diese Anfrage läuft in 30 Sekunden ab." });
    await interaction.reply({ embeds: [embed], components: [row], flags: discord_js_1.MessageFlags.Ephemeral });
    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
        max: 1,
    });
    collector.on("collect", async (btn_interaction) => {
        await btn_interaction.deferUpdate();
        if (btn_interaction.customId === "unwl_cancel") {
            await interaction.editReply({ content: "Entfernung abgebrochen.", embeds: [], components: [] });
            return;
        }
        try {
            await (0, pterodactyl_js_1.remove_from_whitelist)(entry.mc_username);
            (0, database_js_1.remove_entry)(entry.mc_username);
            (0, cooldown_js_1.set_cooldown)(interaction.user.id);
            const success_embed = new discord_js_1.EmbedBuilder()
                .setTitle("Entfernt")
                .setDescription(`**${entry.mc_username}** wurde von der Whitelist entfernt.`)
                .setColor(0xfee75c)
                .setTimestamp();
            await interaction.editReply({ embeds: [success_embed], components: [] });
        }
        catch (err) {
            console.error("[unwhitelist] Failed to remove:", err);
            await interaction.editReply({
                content: "Ein Fehler ist aufgetreten. Bitte versuche es später erneut.",
                embeds: [],
                components: [],
            });
        }
    });
    collector.on("end", async (collected) => {
        if (collected.size === 0) {
            await interaction.editReply({ content: "Zeitüberschreitung bei der Bestätigung.", embeds: [], components: [] }).catch(() => null);
        }
    });
}
//# sourceMappingURL=unwhitelist.js.map