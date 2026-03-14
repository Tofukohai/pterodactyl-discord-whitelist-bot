import { ChatInputCommandInteraction } from "discord.js";
import { config } from "../config.js";

export function check_channel(interaction: ChatInputCommandInteraction): boolean {
  return interaction.channelId === config.discord.whitelist_channel_id;
}
