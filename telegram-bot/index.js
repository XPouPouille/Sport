const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('TELEGRAM_BOT_TOKEN not set'); process.exit(1); }

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || msg.from.username || 'utilisateur';
    bot.sendMessage(chatId,
        `👋 Bonjour ${name} !\n\n` +
        `Votre *Chat ID* est : \`${chatId}\`\n\n` +
        `Copiez ce numéro dans votre profil Sport Tracker pour recevoir les notifications.`,
        { parse_mode: 'Markdown' }
    );
});

bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, `Votre Chat ID : \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

console.log('Telegram bot started');
