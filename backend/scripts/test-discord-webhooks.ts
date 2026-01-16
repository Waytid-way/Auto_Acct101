/**
 * Discord Webhooks Test Script
 * Tests all 3 Discord webhooks configured in .env
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

interface WebhookPayload {
    username?: string;
    avatar_url?: string;
    content?: string;
    embeds?: Array<{
        title?: string;
        description?: string;
        color?: number;
        fields?: Array<{
            name: string;
            value: string;
            inline?: boolean;
        }>;
        timestamp?: string;
        footer?: {
            text: string;
        };
    }>;
}

async function sendDiscordWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ Webhook failed: ${response.status} - ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error sending webhook:`, error);
        return false;
    }
}

async function testWebhook(name: string, webhookUrl: string | undefined, color: number, icon: string) {
    console.log(`\n${icon} Testing ${name}...`);

    if (!webhookUrl) {
        console.log(`   ⚠️  Webhook URL not configured in .env`);
        return false;
    }

    const payload: WebhookPayload = {
        username: 'Auto-Acct Test',
        embeds: [{
            title: `${icon} ${name} Test`,
            description: `This is a test message from Auto-Acct101 webhook testing script.`,
            color: color,
            fields: [
                {
                    name: '🕐 Timestamp',
                    value: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
                    inline: true
                },
                {
                    name: '🖥️ Environment',
                    value: process.env.NODE_ENV || 'development',
                    inline: true
                },
                {
                    name: '✅ Status',
                    value: 'Webhook is working correctly!',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Auto-Acct101 System Test'
            }
        }]
    };

    const success = await sendDiscordWebhook(webhookUrl, payload);

    if (success) {
        console.log(`   ✅ ${name} webhook sent successfully!`);
    } else {
        console.log(`   ❌ ${name} webhook failed!`);
    }

    return success;
}

async function main() {
    console.log('🔔 Discord Webhooks Test Script');
    console.log('================================\n');

    const webhooks = [
        {
            name: 'CRITICAL Alerts',
            url: process.env.DISCORD_WEBHOOK_CRITICAL,
            color: 0xFF0000, // Red
            icon: '🚨'
        },
        {
            name: 'INFO Messages',
            url: process.env.DISCORD_WEBHOOK_INFO,
            color: 0x00FF00, // Green
            icon: 'ℹ️'
        },
        {
            name: 'ML Notifications',
            url: process.env.DISCORD_WEBHOOK_ML,
            color: 0x0099FF, // Blue
            icon: '🤖'
        }
    ];

    const results = [];

    for (const webhook of webhooks) {
        const success = await testWebhook(webhook.name, webhook.url, webhook.color, webhook.icon);
        results.push({ name: webhook.name, success });

        // Wait 1 second between webhooks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    console.log('\n================================');
    console.log('📊 Test Summary:');
    console.log('================================\n');

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
    });

    console.log(`\n📈 Success Rate: ${successCount}/${totalCount} (${Math.round(successCount / totalCount * 100)}%)\n`);

    if (successCount === totalCount) {
        console.log('🎉 All webhooks are working perfectly!\n');
    } else {
        console.log('⚠️  Some webhooks failed. Please check the URLs in your .env file.\n');
    }
}

main().catch(console.error);
