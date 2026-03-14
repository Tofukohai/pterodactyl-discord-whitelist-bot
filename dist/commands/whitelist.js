"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const config_js_1 = require("../config.js");
const channel_js_1 = require("../guards/channel.js");
const cooldown_js_1 = require("../guards/cooldown.js");
const database_js_1 = require("../services/database.js");
const pterodactyl_js_1 = require("../services/pterodactyl.js");
const validation_js_1 = require("../services/validation.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Füge einen Minecraft-Namen zur Server-Whitelist hinzu")
    .addStringOption((opt) => opt
    .setName("username")
    .setDescription("Dein Minecraft Java Edition Name")
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
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    const mojang = await (0, validation_js_1.check_mojang_username)(raw_username);
    if (!mojang) {
        await interaction.editReply("Dieser Minecraft-Name existiert nicht. Überprüfe die Schreibweise und versuche es erneut.");
        return;
    }
    const mc_username = mojang.name;
    const existing = (0, database_js_1.get_entry_by_mc_username)(mc_username);
    if (existing) {
        if (existing.discord_id === interaction.user.id) {
            await interaction.editReply(`**${mc_username}** ist bereits auf der Whitelist deines Accounts eingetragen.`);
        }
        else {
            await interaction.editReply("Dieser Name ist bereits von einem anderen Nutzer gewhitelistet.");
        }
        return;
    }
    const entries = (0, database_js_1.get_user_entries)(interaction.user.id);
    const max_slots = (0, database_js_1.get_user_max_slots)(interaction.user.id, config_js_1.config.limits.max_whitelists_per_user);
    if (entries.length >= max_slots) {
        await interaction.editReply(`Du hast dein Whitelist-Limit erreicht (**${max_slots}** Slot${max_slots === 1 ? "" : "s"}). ` +
            `Entferne zuerst einen Eintrag mit \`/unwhitelist\`.`);
        return;
    }
    const confirm_btn = new discord_js_1.ButtonBuilder()
        .setCustomId("wl_confirm")
        .setLabel(`Ja, ${mc_username} whitelisten`)
        .setStyle(discord_js_1.ButtonStyle.Success);
    const cancel_btn = new discord_js_1.ButtonBuilder()
        .setCustomId("wl_cancel")
        .setLabel("Abbrechen")
        .setStyle(discord_js_1.ButtonStyle.Secondary);
    const row = new discord_js_1.ActionRowBuilder().addComponents(confirm_btn, cancel_btn);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Whitelist-Anfrage bestätigen")
        .setDescription(`Du bist dabei, **${mc_username}** auf dem Minecraft-Server zu whitelisten.\n\nIst das korrekt?`)
        .setColor(0x5865f2)
        .setFooter({ text: "Diese Anfrage läuft in 30 Sekunden ab." });
    await interaction.editReply({ embeds: [embed], components: [row] });
    const reply = await interaction.fetchReply();
    let collector;
    try {
        collector = reply.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            filter: (i) => i.user.id === interaction.user.id,
            time: 30_000,
            max: 1,
        });
    }
    catch {
        await interaction.editReply({ content: "Bestätigungsaufforderung konnte nicht erstellt werden. Versuche es erneut.", embeds: [], components: [] });
        return;
    }
    collector.on("collect", async (btn_interaction) => {
        await btn_interaction.deferUpdate();
        if (btn_interaction.customId === "wl_cancel") {
            await interaction.editReply({ content: "Whitelist-Anfrage abgebrochen.", embeds: [], components: [] });
            return;
        }
        const double_check = (0, database_js_1.get_entry_by_mc_username)(mc_username);
        if (double_check) {
            await interaction.editReply({ content: "Dieser Name wurde soeben von jemand anderem gewhitelistet.", embeds: [], components: [] });
            return;
        }
        try {
            const already_on_server = await (0, pterodactyl_js_1.is_already_on_server_whitelist)(mc_username);
            if (!already_on_server) {
                await (0, pterodactyl_js_1.add_to_whitelist)(mc_username);
            }
            (0, database_js_1.add_entry)(interaction.user.id, interaction.user.tag, mc_username);
            (0, cooldown_js_1.set_cooldown)(interaction.user.id);
            const success_embed = new discord_js_1.EmbedBuilder()
                .setTitle(already_on_server ? "Bereits gewhitelistet" : "Gewhitelistet!")
                .setDescription(already_on_server
                ? `**${mc_username}** war bereits auf der Server-Whitelist — im System eingetragen.`
                : `**${mc_username}** wurde zur Whitelist des Minecraft-Servers hinzugefügt.`)
                .setColor(already_on_server ? 0xfee75c : 0x57f287)
                .setTimestamp();
            await interaction.editReply({ embeds: [success_embed], components: [] });
        }
        catch (err) {
            console.error("[whitelist] Failed to add:", err);
            await interaction.editReply({
                content: "Bei der Kommunikation mit dem Server ist ein Fehler aufgetreten. Bitte versuche es später erneut.",
                embeds: [],
                components: [],
            });
        }
    });
    collector.on("end", async (collected) => {
        if (collected.size === 0) {
            await interaction.editReply({ content: "Zeitüberschreitung bei der Bestätigung. Führe den Befehl erneut aus.", embeds: [], components: [] }).catch(() => null);
        }
    });
}
//# sourceMappingURL=whitelist.js.map