import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import config from '@config/env';
import { configService } from '@modules/config/services/ConfigService';

export const configCommand = {
    data: new SlashCommandBuilder()
        .setName('acct-config')
        .setDescription('Manage system configuration (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current system configurations')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Update a configuration value')
                .addStringOption(option =>
                    option.setName('setting')
                        .setDescription('The setting to update')
                        .setRequired(true)
                        .addChoices(
                            { name: '📅 Daily Export Time', value: 'DAILY_EXPORT_TIME' },
                            { name: '🤖 AI Confidence Threshold', value: 'AI_CONFIDENCE_THRESHOLD' },
                            { name: '📦 Max Batch Size', value: 'MAX_BATCH_SIZE' },
                            { name: '⏱️ Immediate Export Buffer', value: 'IMMEDIATE_EXPORT_BUFFER' }
                        )
                )
                .addStringOption(option =>
                    option.setName('value')
                        .setDescription('The new value')
                        .setRequired(true)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        // 1. RBAC Check (Admin Only)
        // config.DISCORD_ADMIN_ROLE_ID check logic usually in middleware/service, but good to have explicit check
        const roles = interaction.member?.roles as any;
        const isAdmin = roles.cache.has(config.DISCORD_ADMIN_ROLE_ID);
        if (!isAdmin) {
            await interaction.reply({
                content: '⛔ Access Denied: Admin role required.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            await handleViewConfig(interaction);
        } else if (subcommand === 'set') {
            await handleSetConfig(interaction);
        }
    }
};

async function handleViewConfig(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const configs = await configService.getAll();

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('⚙️ System Configuration')
            .setTimestamp()
            .setFooter({ text: 'Auto-Acct System' });

        // Add fields for each known config
        // Customize display based on key
        const fields = Object.entries(configs).map(([key, value]) => {
            let emoji = '🔧';
            if (key.includes('EXPORT_TIME')) emoji = '📅';
            if (key.includes('AI')) emoji = '🤖';
            if (key.includes('BATCH')) emoji = '📦';

            return {
                name: `${emoji} ${formatKey(key)}`,
                value: `\`${value}\``,
                inline: true
            };
        });

        embed.addFields(fields);

        await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
        await interaction.editReply(`❌ Failed to fetch configs: ${error.message}`);
    }
}

async function handleSetConfig(interaction: ChatInputCommandInteraction) {
    // Ephemeral because we return sensitive confirmation or errors
    await interaction.deferReply({ ephemeral: true });

    const key = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);
    const user = interaction.user.tag; // Audit trail: who changed it

    try {
        const result = await configService.set(key, value, user, 'Updated via Discord Command');

        if (!result.success) {
            await interaction.editReply(`❌ **Update Failed**\nReason: ${result.error}`);
            return;
        }

        let response = `✅ **Successfully Updated**\nSetting: \`${key}\`\nNew Value: \`${value}\` (v${result.version})`;

        if (result.warning) {
            response += `\n\n⚠️ **Warning:** ${result.warning}`;
        }

        // Notify in the channel (publicly) that a config was changed (Auditing)
        // But the detailed reply stays ephemeral to the runner
        /* Optional: Public Audit Log
        const channel = interaction.channel;
        if (channel && channel.isSendable()) {
            channel.send(`🛠️ **System Config Updated** by ${interaction.user}\n${key} -> ${value}`);
        }
        */

        await interaction.editReply(response);

    } catch (error: any) {
        await interaction.editReply(`❌ System Error: ${error.message}`);
    }
}

function formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
