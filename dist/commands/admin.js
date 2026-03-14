"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const permissions_js_1 = require("../guards/permissions.js");
const database_js_1 = require("../services/database.js");
const pterodactyl_js_1 = require("../services/pterodactyl.js");
const validation_js_1 = require("../services/validation.js");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("wl-admin")
    .setDescription("Admin-Befehle zur Verwaltung der Whitelist")
    .addSubcommand((sub) => sub.setName("list").setDescription("Alle aktiven Whitelist-Einträge anzeigen")
    .addIntegerOption((opt) => opt.setName("page").setDescription("Seitennummer").setMinValue(1)))
    .addSubcommand((sub) => sub
    .setName("remove")
    .setDescription("Einen Namen zwangsweise von der Whitelist entfernen")
    .addStringOption((opt) => opt.setName("username").setDescription("Minecraft-Name").setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("reset")
    .setDescription("Alle Whitelist-Slots eines Nutzers zurücksetzen")
    .addUserOption((opt) => opt.setName("user").setDescription("Discord-Nutzer").setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("limit")
    .setDescription("Das Whitelist-Slot-Limit eines Nutzers überschreiben")
    .addUserOption((opt) => opt.setName("user").setDescription("Discord-Nutzer").setRequired(true))
    .addIntegerOption((opt) => opt.setName("slots").setDescription("Anzahl der Slots").setRequired(true).setMinValue(0).setMaxValue(50)))
    .addSubcommand((sub) => sub
    .setName("lookup")
    .setDescription("Herausfinden, wem ein Minecraft-Name gehört")
    .addStringOption((opt) => opt.setName("username").setDescription("Minecraft-Name").setRequired(true)));
const PAGE_SIZE = 10;
async function execute(interaction) {
    if (!(0, permissions_js_1.is_admin)(interaction)) {
        await interaction.reply({ content: "Du hast keine Berechtigung, diesen Befehl zu verwenden.", flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    const sub = interaction.options.getSubcommand();
    if (sub === "list") {
        const page = (interaction.options.getInteger("page") ?? 1) - 1;
        const total = (0, database_js_1.get_active_entries_count)();
        const total_pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const slice = (0, database_js_1.get_active_entries_page)(page, PAGE_SIZE);
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`Whitelist-Einträge — Seite ${page + 1} / ${total_pages}`)
            .setColor(0x5865f2)
            .setDescription(slice.length > 0
            ? slice
                .map((e, i) => `**${page * PAGE_SIZE + i + 1}.** \`${e.mc_username}\` — <@${e.discord_id}> (${e.whitelisted_at.split("T")[0]})`)
                .join("\n")
            : "Keine Einträge.")
            .setFooter({ text: `Gesamt: ${total}` });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
    if (sub === "remove") {
        const raw = interaction.options.getString("username", true);
        const v = (0, validation_js_1.validate_mc_username)(raw);
        if (!v.valid) {
            await interaction.reply({ content: v.reason, flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const entry = (0, database_js_1.get_entry_by_mc_username)(raw);
        if (!entry) {
            await interaction.reply({ content: `**${raw}** ist nicht auf der Whitelist.`, flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        try {
            await (0, pterodactyl_js_1.remove_from_whitelist)(entry.mc_username);
            (0, database_js_1.remove_entry)(entry.mc_username);
            await interaction.editReply(`**${entry.mc_username}** wurde entfernt (gehörte <@${entry.discord_id}>).`);
        }
        catch (err) {
            console.error("[admin remove] Error:", err);
            await interaction.editReply("Entfernung vom Server fehlgeschlagen. Überprüfe die Bot-Logs.");
        }
        return;
    }
    if (sub === "reset") {
        const target = interaction.options.getUser("user", true);
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        const removed_names = (0, database_js_1.reset_user_entries)(target.id);
        const results = await Promise.allSettled(removed_names.map((name) => (0, pterodactyl_js_1.remove_from_whitelist)(name)));
        const failed = removed_names.filter((_, i) => results[i]?.status === "rejected");
        if (removed_names.length === 0) {
            await interaction.editReply(`<@${target.id}> hatte keine aktiven Whitelist-Einträge.`);
            return;
        }
        let reply = `<@${target.id}> zurückgesetzt: **${removed_names.join(", ")}** entfernt.`;
        if (failed.length > 0)
            reply += `\n⚠ Entfernung vom Server fehlgeschlagen: ${failed.join(", ")}`;
        await interaction.editReply(reply);
        return;
    }
    if (sub === "limit") {
        const target = interaction.options.getUser("user", true);
        const slots = interaction.options.getInteger("slots", true);
        (0, database_js_1.set_user_override)(target.id, slots);
        await interaction.reply({
            content: `Whitelist-Limit für <@${target.id}> auf **${slots}** Slot${slots === 1 ? "" : "s"} gesetzt.`,
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
        return;
    }
    if (sub === "lookup") {
        const raw = interaction.options.getString("username", true);
        const entry = (0, database_js_1.get_entry_by_mc_username)(raw);
        if (!entry) {
            await interaction.reply({ content: `**${raw}** ist nicht auf der Whitelist.`, flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("Suchergebnis")
            .setColor(0x5865f2)
            .addFields({ name: "Minecraft-Name", value: entry.mc_username, inline: true }, { name: "Discord-Nutzer", value: `<@${entry.discord_id}>`, inline: true }, { name: "Discord-Tag", value: entry.discord_name, inline: true }, { name: "Gewhitelistet am", value: entry.whitelisted_at, inline: false });
        await interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
        return;
    }
}
//# sourceMappingURL=admin.js.map