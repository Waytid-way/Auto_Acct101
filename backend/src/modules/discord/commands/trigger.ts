import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../../config/env';
import { DiscordBotService } from '../DiscordBotService';
import { DailyExportJob } from '../../../jobs/DailyExportJob'; // Assuming job can be instantiated or static
import { GoogleDriveService } from '../../../modules/files/GoogleDriveService';
import logger from '../../../loaders/logger';

export default {
    data: new SlashCommandBuilder()
        .setName('acct-trigger')
        .setDescription('Manually trigger daily export job (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction: ChatInputCommandInteraction) {
        const service = DiscordBotService.getInstance();

        // 1. RBAC Check (Strict)
        if (config.DISCORD_ADMIN_ROLE_ID && !service.hasRole(interaction, config.DISCORD_ADMIN_ROLE_ID)) {
            await interaction.reply({
                content: '⛔ **Access Denied**: Admin Role Required.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply({ ephemeral: false });

        // 2. Audit Log
        logger.info(`🔔 Manual Export Triggered via Discord by ${interaction.user.tag}`);

        try {
            // 3. Execute Job with Force Flag
            const driveService = new GoogleDriveService();
            const job = new DailyExportJob(driveService);

            // Force execution to include future scheduled items
            const result = await job.executeDaily(true);

            if (result.processed === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('ℹ️ No Items to Export')
                    .setDescription('Queue is empty or items are not ready.')
                    .setColor(0xFFFF00)
                    .setTimestamp();
                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // 4. Success Response
            const embed = new EmbedBuilder()
                .setTitle('✅ Manual Export Completed')
                .setDescription(`Export job finished successfully.`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Processed', value: `${result.processed} records`, inline: true },
                    { name: 'File ID', value: result.fileId || 'N/A', inline: true },
                    { name: 'Triggered By', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error: any) {
            logger.error('Manual Export Failed', { error });

            await interaction.editReply({
                embeds: [{
                    title: '❌ Export Job Failed',
                    description: `Error: ${error.message}`,
                    color: 0xFF0000,
                    timestamp: new Date().toISOString()
                }]
            });
        }
    }
};
