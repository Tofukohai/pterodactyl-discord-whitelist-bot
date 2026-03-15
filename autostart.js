// Loaded automatically via NODE_OPTIONS=--require /home/container/autostart.js
// This bootstraps the bot even when the Pterodactyl startup command is not applied.
if (!process.env.DB_PATH) process.env.DB_PATH = '/home/container/whitelist.db';
require('/home/container/dist/index.js');
