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
const whitelist_cmd = __importStar(require("./commands/whitelist.js"));
const unwhitelist_cmd = __importStar(require("./commands/unwhitelist.js"));
const mystatus_cmd = __importStar(require("./commands/mystatus.js"));
const admin_cmd = __importStar(require("./commands/admin.js"));
const commands = [whitelist_cmd, unwhitelist_cmd, mystatus_cmd, admin_cmd].map((c) => c.data.toJSON());
const rest = new discord_js_1.REST().setToken(config_js_1.config.discord.token);
(async () => {
    console.log(`Registering ${commands.length} slash commands...`);
    // To register globally (takes ~1 hour to propagate):
    // await rest.put(Routes.applicationCommands(config.discord.client_id), { body: commands });
    // To register to a specific guild (instant — good for testing):
    // Uncomment and set GUILD_ID in .env:
    const guild_id = process.env.GUILD_ID;
    if (!guild_id) {
        // Global registration
        await rest.put(discord_js_1.Routes.applicationCommands(config_js_1.config.discord.client_id), { body: commands });
        console.log("Commands registered globally.");
    }
    else {
        // Guild registration
        await rest.put(discord_js_1.Routes.applicationGuildCommands(config_js_1.config.discord.client_id, guild_id), {
            body: commands,
        });
        console.log(`Commands registered to guild ${guild_id}.`);
    }
})().catch((err) => {
    console.error("Failed to register commands:", err);
    process.exit(1);
});
//# sourceMappingURL=deploy-commands.js.map