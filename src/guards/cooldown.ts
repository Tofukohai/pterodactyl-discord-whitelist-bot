import { config } from "../config.js";

// Map of discord_id -> timestamp of last whitelisting action
const cooldowns = new Map<string, number>();

export function check_cooldown(discord_id: string): { on_cooldown: boolean; remaining_seconds: number } {
  const last = cooldowns.get(discord_id);
  if (!last) return { on_cooldown: false, remaining_seconds: 0 };

  const elapsed = (Date.now() - last) / 1000;
  const remaining = Math.ceil(config.limits.cooldown_seconds - elapsed);

  if (remaining > 0) return { on_cooldown: true, remaining_seconds: remaining };

  cooldowns.delete(discord_id); // prune expired entry so the map doesn't grow forever
  return { on_cooldown: false, remaining_seconds: 0 };
}

export function set_cooldown(discord_id: string): void {
  cooldowns.set(discord_id, Date.now());
}
