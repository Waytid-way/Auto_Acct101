import { DiscordBotService } from '../modules/discord/DiscordBotService';

export default async () => {
    const discordBot = DiscordBotService.getInstance();
    await discordBot.start();
};
