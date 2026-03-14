import { REST, Routes } from "discord.js";
import { config } from "./config.js";

import * as whitelist_cmd from "./commands/whitelist.js";
import * as unwhitelist_cmd from "./commands/unwhitelist.js";
import * as mystatus_cmd from "./commands/mystatus.js";
import * as admin_cmd from "./commands/admin.js";

const commands = [whitelist_cmd, unwhitelist_cmd, mystatus_cmd, admin_cmd].map((c) =>
  c.data.toJSON()
);

const rest = new REST().setToken(config.discord.token);

(async () => {
  console.log(`Registering ${commands.length} slash commands...`);

  // To register globally (takes ~1 hour to propagate):
  // await rest.put(Routes.applicationCommands(config.discord.client_id), { body: commands });

  // To register to a specific guild (instant — good for testing):
  // Uncomment and set GUILD_ID in .env:
  const guild_id = process.env.GUILD_ID;
  if (!guild_id) {
    // Global registration
    await rest.put(Routes.applicationCommands(config.discord.client_id), { body: commands });
    console.log("Commands registered globally.");
  } else {
    // Guild registration
    await rest.put(Routes.applicationGuildCommands(config.discord.client_id, guild_id), {
      body: commands,
    });
    console.log(`Commands registered to guild ${guild_id}.`);
  }
})().catch((err) => {
  console.error("Failed to register commands:", err);
  process.exit(1);
});
