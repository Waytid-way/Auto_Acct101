import { Client, GatewayIntentBits, Interaction, TextChannel, Events } from 'discord.js';
import config from '../../config/env';
import logger from '../../loaders/logger';
import path from 'path';
import fs from 'fs';

export class DiscordBotService {
    private static instance: DiscordBotService;
    public client: Client;
    public isReady: boolean = false;
    private commands: Map<string, any> = new Map();

    private constructor() {
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds]
        });

        this.setupEventHandlers();
    }

    public static getInstance(): DiscordBotService {
        if (!DiscordBotService.instance) {
            DiscordBotService.instance = new DiscordBotService();
        }
        return DiscordBotService.instance;
    }

    private setupEventHandlers() {
        this.client.on(Events.ClientReady, () => {
            logger.info(`✅ Discord Bot connected as ${this.client.user?.tag}`);
            this.isReady = true;
        });

        this.client.on('disconnect', () => {
            logger.warn('⚠️ Discord Bot disconnected');
            this.isReady = false;
        });

        this.client.on('error', (error) => {
            logger.error('❌ Discord Bot error:', { error });
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            await this.handleCommand(interaction);
        });
    }

    public async start() {
        if (!config.DISCORD_BOT_TOKEN) {
            logger.warn('⚠️ No DISCORD_BOT_TOKEN provided. Bot service disabled.');
            return;
        }

        try {
            await this.loadCommands(); // Load commands before login
            await this.client.login(config.DISCORD_BOT_TOKEN);
        } catch (error) {
            logger.warn('⚠️ Failed to connect Discord Bot. Continuing as Sidecar.', error);
            // Do not throw, allow app to continue
        }
    }

    private async loadCommands() {
        // Simple manual registration for now or load from structure
        // In this implementation, we will manually register handlers for simplicity/reliability
        // as dynamic loading in TS execution environment can be tricky with paths.

        // Dynamic loading if compiled tsc, but here using manual map for robustness
        this.commands.set('acct-status', (await import('./commands/status')).default);
        this.commands.set('acct-trigger', (await import('./commands/trigger')).default);
        this.commands.set('acct-config', (await import('./commands/config')).configCommand); // [NEW]

        logger.info(`Loaded ${this.commands.size} Discord commands`);
    }

    private async handleCommand(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) {
            logger.warn(`Unknown command: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error: any) {
            logger.error(`Error executing command ${interaction.commandName}:`, { error });
            const payload = { content: '❌ There was an error executing this command!', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload);
            } else {
                await interaction.reply(payload);
            }
        }
    }

    // Helper for RBAC
    public hasRole(interaction: any, roleId?: string): boolean {
        if (!roleId) return false;
        return interaction.member?.roles.cache.has(roleId) ?? false;
    }
}
