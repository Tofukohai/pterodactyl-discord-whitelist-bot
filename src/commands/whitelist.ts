import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { config } from "../config.js";
import { check_channel } from "../guards/channel.js";
import { check_cooldown, set_cooldown } from "../guards/cooldown.js";
import {
  add_entry,
  get_entry_by_mc_username,
  get_user_entries,
  get_user_max_slots,
} from "../services/database.js";
import { add_to_whitelist, is_already_on_server_whitelist } from "../services/pterodactyl.js";
import { check_mojang_username, validate_mc_username } from "../services/validation.js";

export const data = new SlashCommandBuilder()
  .setName("whitelist")
  .setDescription("Füge einen Minecraft-Namen zur Server-Whitelist hinzu")
  .addStringOption((opt) =>
    opt
      .setName("username")
      .setDescription("Dein Minecraft Java Edition Name")
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(16)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!check_channel(interaction)) {
    await interaction.reply({ content: "Dieser Befehl kann nur im dafür vorgesehenen Kanal verwendet werden.", flags: MessageFlags.Ephemeral });
    return;
  }

  const cooldown = check_cooldown(interaction.user.id);
  if (cooldown.on_cooldown) {
    await interaction.reply({
      content: `Du bist noch im Cooldown. Bitte warte noch **${cooldown.remaining_seconds}s**, bevor du diesen Befehl erneut verwendest.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const raw_username = interaction.options.getString("username", true);

  const validation = validate_mc_username(raw_username);
  if (!validation.valid) {
    await interaction.reply({ content: validation.reason, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const mojang = await check_mojang_username(raw_username);
  if (!mojang) {
    await interaction.editReply("Dieser Minecraft-Name existiert nicht. Überprüfe die Schreibweise und versuche es erneut.");
    return;
  }

  const mc_username = mojang.name;

  const existing = get_entry_by_mc_username(mc_username);
  if (existing) {
    if (existing.discord_id === interaction.user.id) {
      await interaction.editReply(`**${mc_username}** ist bereits auf der Whitelist deines Accounts eingetragen.`);
    } else {
      await interaction.editReply("Dieser Name ist bereits von einem anderen Nutzer gewhitelistet.");
    }
    return;
  }

  const entries = get_user_entries(interaction.user.id);
  const max_slots = get_user_max_slots(interaction.user.id, config.limits.max_whitelists_per_user);

  if (entries.length >= max_slots) {
    await interaction.editReply(
      `Du hast dein Whitelist-Limit erreicht (**${max_slots}** Slot${max_slots === 1 ? "" : "s"}). ` +
        `Entferne zuerst einen Eintrag mit \`/unwhitelist\`.`
    );
    return;
  }

  const confirm_btn = new ButtonBuilder()
    .setCustomId("wl_confirm")
    .setLabel(`Ja, ${mc_username} whitelisten`)
    .setStyle(ButtonStyle.Success);

  const cancel_btn = new ButtonBuilder()
    .setCustomId("wl_cancel")
    .setLabel("Abbrechen")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirm_btn, cancel_btn);

  const embed = new EmbedBuilder()
    .setTitle("Whitelist-Anfrage bestätigen")
    .setDescription(
      `Du bist dabei, **${mc_username}** auf dem Minecraft-Server zu whitelisten.\n\nIst das korrekt?`
    )
    .setColor(0x5865f2)
    .setFooter({ text: "Diese Anfrage läuft in 30 Sekunden ab." });

  await interaction.editReply({ embeds: [embed], components: [row] });

  const reply = await interaction.fetchReply();

  let collector;
  try {
    collector = reply.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
      max: 1,
    });
  } catch {
    await interaction.editReply({ content: "Bestätigungsaufforderung konnte nicht erstellt werden. Versuche es erneut.", embeds: [], components: [] });
    return;
  }

  collector.on("collect", async (btn_interaction) => {
    await btn_interaction.deferUpdate();

    if (btn_interaction.customId === "wl_cancel") {
      await interaction.editReply({ content: "Whitelist-Anfrage abgebrochen.", embeds: [], components: [] });
      return;
    }

    const double_check = get_entry_by_mc_username(mc_username);
    if (double_check) {
      await interaction.editReply({ content: "Dieser Name wurde soeben von jemand anderem gewhitelistet.", embeds: [], components: [] });
      return;
    }

    try {
      const already_on_server = await is_already_on_server_whitelist(mc_username);

      if (!already_on_server) {
        await add_to_whitelist(mc_username);
      }

      add_entry(interaction.user.id, interaction.user.tag, mc_username);
      set_cooldown(interaction.user.id);

      const success_embed = new EmbedBuilder()
        .setTitle(already_on_server ? "Bereits gewhitelistet" : "Gewhitelistet!")
        .setDescription(
          already_on_server
            ? `**${mc_username}** war bereits auf der Server-Whitelist — im System eingetragen.`
            : `**${mc_username}** wurde zur Whitelist des Minecraft-Servers hinzugefügt.`
        )
        .setColor(already_on_server ? 0xfee75c : 0x57f287)
        .setTimestamp();

      await interaction.editReply({ embeds: [success_embed], components: [] });
    } catch (err) {
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
