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
import { check_channel } from "../guards/channel.js";
import { check_cooldown, set_cooldown } from "../guards/cooldown.js";
import { get_entry_by_mc_username, remove_entry } from "../services/database.js";
import { remove_from_whitelist } from "../services/pterodactyl.js";
import { validate_mc_username } from "../services/validation.js";

export const data = new SlashCommandBuilder()
  .setName("unwhitelist")
  .setDescription("Entferne einen deiner gewhitelisteten Minecraft-Namen")
  .addStringOption((opt) =>
    opt
      .setName("username")
      .setDescription("Der zu entfernende Minecraft-Name")
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

  const entry = get_entry_by_mc_username(raw_username);

  if (!entry) {
    await interaction.reply({ content: `**${raw_username}** ist nicht auf der Whitelist.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (entry.discord_id !== interaction.user.id) {
    await interaction.reply({ content: "Du kannst nur Namen entfernen, die deinem eigenen Account gehören.", flags: MessageFlags.Ephemeral });
    return;
  }

  const confirm_btn = new ButtonBuilder()
    .setCustomId("unwl_confirm")
    .setLabel(`Ja, ${entry.mc_username} entfernen`)
    .setStyle(ButtonStyle.Danger);

  const cancel_btn = new ButtonBuilder()
    .setCustomId("unwl_cancel")
    .setLabel("Abbrechen")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirm_btn, cancel_btn);

  const embed = new EmbedBuilder()
    .setTitle("Entfernung bestätigen")
    .setDescription(`**${entry.mc_username}** von der Whitelist entfernen? Du kannst ihn später erneut hinzufügen, falls du deine Meinung änderst.`)
    .setColor(0xed4245)
    .setFooter({ text: "Diese Anfrage läuft in 30 Sekunden ab." });

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });

  const reply = await interaction.fetchReply();

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.Button,
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
      await remove_from_whitelist(entry.mc_username);
      remove_entry(entry.mc_username);
      set_cooldown(interaction.user.id);

      const success_embed = new EmbedBuilder()
        .setTitle("Entfernt")
        .setDescription(`**${entry.mc_username}** wurde von der Whitelist entfernt.`)
        .setColor(0xfee75c)
        .setTimestamp();

      await interaction.editReply({ embeds: [success_embed], components: [] });
    } catch (err) {
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
