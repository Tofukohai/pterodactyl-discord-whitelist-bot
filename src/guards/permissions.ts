import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { config } from "../config.js";

export function is_admin(interaction: ChatInputCommandInteraction): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;
  return member.roles.cache.has(config.discord.admin_role_id);
}
