import { Client, Collection, Events, GatewayIntentBits, Interaction, MessageFlags } from "discord.js";
import { config } from "./config.js";

// Import all commands
import * as whitelist_cmd from "./commands/whitelist.js";
import * as unwhitelist_cmd from "./commands/unwhitelist.js";
import * as mystatus_cmd from "./commands/mystatus.js";
import * as admin_cmd from "./commands/admin.js";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

interface Command {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();

for (const cmd of [whitelist_cmd, unwhitelist_cmd, mystatus_cmd, admin_cmd]) {
  commands.set(cmd.data.name, cmd as Command);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (ready_client) => {
  console.log(`[bot] Logged in as ${ready_client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[bot] Error in /${interaction.commandName}:`, err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.", flags: MessageFlags.Ephemeral }).catch(() => null);
    } else {
      await interaction.reply({ content: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.", flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  }
});

client.login(config.discord.token);
