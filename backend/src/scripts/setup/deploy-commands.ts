import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import config from '../../config/env';
import logger from '../../loaders/logger';

const commands = [
    new SlashCommandBuilder()
        .setName('acct-status')
        .setDescription('Check accounting system health status')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('acct-trigger')
        .setDescription('Manually trigger daily export job (Admin Only)')
        .toJSON(),
];

const rest = new REST().setToken(config.DISCORD_BOT_TOKEN || '');

(async () => {
    if (!config.DISCORD_BOT_TOKEN || !config.DISCORD_CLIENT_ID) {
        logger.error('โ Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID. Cannot deploy commands.');
        process.exit(1);
    }

    try {
        logger.info(`๐” Started refreshing ${commands.length} application (/) commands.`);

        // Register global commands
        await rest.put(
            Routes.applicationCommands(config.DISCORD_CLIENT_ID),
            { body: commands },
        );

        logger.info('โ… Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error('โ Failed to deploy commands:', error);
    }
})();
