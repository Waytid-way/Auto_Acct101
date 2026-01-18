
import { REST, Routes } from 'discord.js';
import config from "../../config/env";
import fs from 'fs';
import path from 'path';

// Import commands explicitly to ensure they are loaded/bundled correctly
// Dynamic import can be tricky in some environments, so we'll try dynamic first found in directory
// But since we are using TS execution, let's use dynamic import
// We'll replicate the logic from DiscordBotService but strictly for registration

async function registerCommands() {
    if (!config.DISCORD_BOT_TOKEN) {
        console.error('โ DISCORD_BOT_TOKEN is missing');
        process.exit(1);
    }

    // We need Client ID. If not in config, we can't register commands globally properly without it.
    // Assuming DISCORD_CLIENT_ID is added to env.ts
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
        console.error('โ DISCORD_CLIENT_ID is missing in .env');
        process.exit(1);
    }

    const commands: any[] = [];
    const commandsPath = path.join(__dirname, '../modules/discord/commands');

    if (!fs.existsSync(commandsPath)) {
        console.error(`โ Commands directory not found: ${commandsPath}`);
        process.exit(1);
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    console.log(`๐“ Found ${commandFiles.length} command files in ${commandsPath}`);

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            // Import the module
            // In Bun/TS, dynamic import works well
            const module = await import(filePath);

            // Handle different export styles
            // trigger.ts exports 'default'
            // config.ts exports 'configCommand'

            let command = module.default;
            if (!command && module.configCommand) {
                command = module.configCommand;
            }

            if (command && command.data && command.execute) {
                commands.push(command.data.toJSON());
                console.log(`โ… Loaded command: ${command.data.name}`);
            } else {
                console.warn(`โ ๏ธ  Skipping ${file}: missing data or execute property`);
            }
        } catch (error) {
            console.error(`โ Error loading ${file}:`, error);
        }
    }

    const rest = new REST({ version: '10' }).setToken(config.DISCORD_BOT_TOKEN);
    const guildId = process.env.DISCORD_GUILD_ID;

    try {
        let data: any;

        if (guildId) {
            console.log(`๐” Registering ${commands.length} commands to Guild (${guildId})...`);
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`โ… Successfully registered ${data.length} Guild commands (Instant)!`);
        } else {
            console.log(`๐” Registering ${commands.length} commands Globally (May take 1 hour)...`);
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`โ… Successfully registered ${data.length} Global commands!`);
        }

        data.forEach((cmd: any) => console.log(`   - /${cmd.name}`));
    } catch (error) {
        console.error('โ Error registering commands:', error);
        process.exit(1);
    }
}

registerCommands().catch(console.error);
