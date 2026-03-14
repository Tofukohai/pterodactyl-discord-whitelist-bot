import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { is_admin } from "../guards/permissions.js";
import {
  get_active_entries_count,
  get_active_entries_page,
  get_entry_by_mc_username,
  get_user_entries,
  remove_entry,
  reset_user_entries,
  set_user_override,
} from "../services/database.js";
import { remove_from_whitelist } from "../services/pterodactyl.js";
import { validate_mc_username } from "../services/validation.js";

export const data = new SlashCommandBuilder()
  .setName("wl-admin")
  .setDescription("Admin-Befehle zur Verwaltung der Whitelist")
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("Alle aktiven Whitelist-Einträge anzeigen")
      .addIntegerOption((opt) =>
        opt.setName("page").setDescription("Seitennummer").setMinValue(1)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Einen Namen zwangsweise von der Whitelist entfernen")
      .addStringOption((opt) =>
        opt.setName("username").setDescription("Minecraft-Name").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("reset")
      .setDescription("Alle Whitelist-Slots eines Nutzers zurücksetzen")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Discord-Nutzer").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("limit")
      .setDescription("Das Whitelist-Slot-Limit eines Nutzers überschreiben")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Discord-Nutzer").setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt.setName("slots").setDescription("Anzahl der Slots").setRequired(true).setMinValue(0).setMaxValue(50)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("lookup")
      .setDescription("Herausfinden, wem ein Minecraft-Name gehört")
      .addStringOption((opt) =>
        opt.setName("username").setDescription("Minecraft-Name").setRequired(true)
      )
  );

const PAGE_SIZE = 10;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!is_admin(interaction)) {
    await interaction.reply({ content: "Du hast keine Berechtigung, diesen Befehl zu verwenden.", flags: MessageFlags.Ephemeral });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "list") {
    const page = (interaction.options.getInteger("page") ?? 1) - 1;
    const total = get_active_entries_count();
    const total_pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const slice = get_active_entries_page(page, PAGE_SIZE);

    const embed = new EmbedBuilder()
      .setTitle(`Whitelist-Einträge — Seite ${page + 1} / ${total_pages}`)
      .setColor(0x5865f2)
      .setDescription(
        slice.length > 0
          ? slice
              .map(
                (e, i) =>
                  `**${page * PAGE_SIZE + i + 1}.** \`${e.mc_username}\` — <@${e.discord_id}> (${e.whitelisted_at.split("T")[0]})`
              )
              .join("\n")
          : "Keine Einträge."
      )
      .setFooter({ text: `Gesamt: ${total}` });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  if (sub === "remove") {
    const raw = interaction.options.getString("username", true);
    const v = validate_mc_username(raw);
    if (!v.valid) {
      await interaction.reply({ content: v.reason, flags: MessageFlags.Ephemeral });
      return;
    }

    const entry = get_entry_by_mc_username(raw);
    if (!entry) {
      await interaction.reply({ content: `**${raw}** ist nicht auf der Whitelist.`, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await remove_from_whitelist(entry.mc_username);
      remove_entry(entry.mc_username);
      await interaction.editReply(
        `**${entry.mc_username}** wurde entfernt (gehörte <@${entry.discord_id}>).`
      );
    } catch (err) {
      console.error("[admin remove] Error:", err);
      await interaction.editReply("Entfernung vom Server fehlgeschlagen. Überprüfe die Bot-Logs.");
    }
    return;
  }

  if (sub === "reset") {
    const target = interaction.options.getUser("user", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const removed_names = reset_user_entries(target.id);

    const results = await Promise.allSettled(removed_names.map((name) => remove_from_whitelist(name)));
    const failed = removed_names.filter((_, i) => results[i]?.status === "rejected");

    if (removed_names.length === 0) {
      await interaction.editReply(`<@${target.id}> hatte keine aktiven Whitelist-Einträge.`);
      return;
    }

    let reply = `<@${target.id}> zurückgesetzt: **${removed_names.join(", ")}** entfernt.`;
    if (failed.length > 0) reply += `\n⚠ Entfernung vom Server fehlgeschlagen: ${failed.join(", ")}`;
    await interaction.editReply(reply);
    return;
  }

  if (sub === "limit") {
    const target = interaction.options.getUser("user", true);
    const slots = interaction.options.getInteger("slots", true);
    set_user_override(target.id, slots);
    await interaction.reply({
      content: `Whitelist-Limit für <@${target.id}> auf **${slots}** Slot${slots === 1 ? "" : "s"} gesetzt.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "lookup") {
    const raw = interaction.options.getString("username", true);
    const entry = get_entry_by_mc_username(raw);

    if (!entry) {
      await interaction.reply({ content: `**${raw}** ist nicht auf der Whitelist.`, flags: MessageFlags.Ephemeral });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("Suchergebnis")
      .setColor(0x5865f2)
      .addFields(
        { name: "Minecraft-Name", value: entry.mc_username, inline: true },
        { name: "Discord-Nutzer", value: `<@${entry.discord_id}>`, inline: true },
        { name: "Discord-Tag", value: entry.discord_name, inline: true },
        { name: "Gewhitelistet am", value: entry.whitelisted_at, inline: false },
      );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }
}
