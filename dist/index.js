"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_js_1 = require("./config.js");
// Import all commands
const whitelist_cmd = __importStar(require("./commands/whitelist.js"));
const unwhitelist_cmd = __importStar(require("./commands/unwhitelist.js"));
const mystatus_cmd = __importStar(require("./commands/mystatus.js"));
const admin_cmd = __importStar(require("./commands/admin.js"));
const commands = new discord_js_1.Collection();
for (const cmd of [whitelist_cmd, unwhitelist_cmd, mystatus_cmd, admin_cmd]) {
    commands.set(cmd.data.name, cmd);
}
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds],
});
client.once(discord_js_1.Events.ClientReady, (ready_client) => {
    console.log(`[bot] Logged in as ${ready_client.user.tag}`);
});
client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const command = commands.get(interaction.commandName);
    if (!command)
        return;
    try {
        await command.execute(interaction);
    }
    catch (err) {
        console.error(`[bot] Error in /${interaction.commandName}:`, err);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.", flags: discord_js_1.MessageFlags.Ephemeral }).catch(() => null);
        }
        else {
            await interaction.reply({ content: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.", flags: discord_js_1.MessageFlags.Ephemeral }).catch(() => null);
        }
    }
});
client.login(config_js_1.config.discord.token);
//# sourceMappingURL=index.js.map