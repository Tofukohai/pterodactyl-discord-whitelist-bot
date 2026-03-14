import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { config } from "../config.js";
import { check_channel } from "../guards/channel.js";
import { check_cooldown } from "../guards/cooldown.js";
import { get_user_entries, get_user_max_slots } from "../services/database.js";

export const data = new SlashCommandBuilder()
  .setName("mystatus")
  .setDescription("Zeige deine gewhitelisteten Minecraft-Namen und verbleibenden Slots");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!check_channel(interaction)) {
    await interaction.reply({ content: "Dieser Befehl kann nur im dafür vorgesehenen Kanal verwendet werden.", flags: MessageFlags.Ephemeral });
    return;
  }

  // Check cooldown before hitting the DB
  const cooldown = check_cooldown(interaction.user.id);

  const entries = get_user_entries(interaction.user.id);
  const max_slots = get_user_max_slots(interaction.user.id, config.limits.max_whitelists_per_user);
  const used = entries.length;
  const remaining = max_slots - used;

  const embed = new EmbedBuilder()
    .setTitle("Dein Whitelist-Status")
    .setColor(0x5865f2)
    .addFields(
      {
        name: "Gewhitelistete Namen",
        value: used > 0 ? entries.map((e) => `• \`${e.mc_username}\``).join("\n") : "Keine",
        inline: false,
      },
      {
        name: "Slots",
        value: `${used} / ${max_slots} belegt (${remaining} übrig)`,
        inline: true,
      },
      {
        name: "Cooldown",
        value: cooldown.on_cooldown ? `Noch ${cooldown.remaining_seconds}s` : "Bereit",
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
