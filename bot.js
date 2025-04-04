/**
 * Snail to Riches - Telegram Bot с поддержкой Web App
 * Обеспечивает интеграцию с Telegram для игры
 */

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
require('dotenv').config();

// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    // Получаем токен из переменных окружения
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    
    // URL вашей игры (по умолчанию)
    gameUrl: 'http://localhost:8001',
    
    // Файл с URL ngrok
    ngrokUrlFile: 'ngrok-url.txt',
};

// ========== ЛОГГИРОВАНИЕ ==========
function log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefixes = {
        info: '🔷',
        success: '✅',
        error: '❌',
        warning: '⚠️'
    };
    
    const prefix = prefixes[level] || '•';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

// ========== ПОЛУЧЕНИЕ NGROK URL ==========
function getNgrokUrl() {
    try {
        if (fs.existsSync(CONFIG.ngrokUrlFile)) {
            const url = fs.readFileSync(CONFIG.ngrokUrlFile, 'utf8').trim();
            log(`Получен URL из файла: ${url}`, 'success');
            return url;
        } else {
            log(`Файл ${CONFIG.ngrokUrlFile} не найден`, 'warning');
        }
    } catch (error) {
        log(`Ошибка при чтении файла URL: ${error.message}`, 'error');
    }
    
    return CONFIG.gameUrl;
}

// Получаем HTTPS URL из ngrok
CONFIG.gameUrl = getNgrokUrl();

// ========== ПРОВЕРКА КОНФИГУРАЦИИ ==========
if (!CONFIG.botToken) {
    log('TELEGRAM_BOT_TOKEN не установлен! Убедитесь, что токен указан в .env файле.', 'error');
    process.exit(1);
}

// ========== ИНИЦИАЛИЗАЦИЯ БОТА ==========
let bot;
try {
    bot = new TelegramBot(CONFIG.botToken, { polling: true });
    log('Telegram Bot успешно инициализирован', 'success');
    log(`Используется URL игры: ${CONFIG.gameUrl}`, 'info');
} catch (error) {
    log(`Ошибка инициализации Telegram Bot: ${error.message}`, 'error');
    process.exit(1);
}

// ========== ОБРАБОТЧИКИ СООБЩЕНИЙ ==========
/**
 * Отправляет приветственное сообщение с кнопкой для запуска Web App
 */
async function sendWelcomeMessage(chatId) {
    try {
        // Создаем клавиатуру с кнопкой запуска Web App
        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: '🎮 Играть в Snail to Riches',
                        web_app: { url: CONFIG.gameUrl }
                    }
                ]
            ]
        };

        // Отправляем сообщение с кнопкой
        await bot.sendMessage(
            chatId, 
            'Привет! 🐌 Нажмите на кнопку ниже, чтобы запустить игру прямо в Telegram:', 
            { reply_markup: keyboard }
        );
        
        log(`Отправлено приветственное сообщение с Web App пользователю ${chatId}`, 'success');
    } catch (error) {
        log(`Ошибка при отправке сообщения: ${error.message}`, 'error');
    }
}

// Обработка команды /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    log(`Получена команда /start от пользователя ${chatId}`, 'info');
    await sendWelcomeMessage(chatId);
});

// Обработка команды /help
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    log(`Получена команда /help от пользователя ${chatId}`, 'info');
    
    // Создаем клавиатуру с кнопкой запуска Web App
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: '🎮 Играть в Snail to Riches',
                    web_app: { url: CONFIG.gameUrl }
                }
            ]
        ]
    };
    
    const helpMessage = `🐌 *Snail to Riches - Помощь* 🐌

/start - Показать кнопку для запуска игры
/help - Показать это сообщение

Нажмите на кнопку ниже, чтобы открыть игру прямо в Telegram:`;

    await bot.sendMessage(chatId, helpMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
    });
});

// Обработка неизвестных команд
bot.on('message', async (msg) => {
    // Проверяем, что это не команда, которую мы уже обработали
    if (!msg.text || msg.text.startsWith('/start') || msg.text.startsWith('/help')) {
        return;
    }
    
    const chatId = msg.chat.id;
    log(`Получено сообщение от пользователя ${chatId}: ${msg.text}`, 'info');
    
    await bot.sendMessage(chatId, 'Используйте /start для начала игры или /help для помощи.');
});

// ========== ОБРАБОТКА ЗАВЕРШЕНИЯ РАБОТЫ ==========
process.on('SIGINT', async () => {
    log('Завершение работы бота...', 'warning');
    await bot.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    log('Завершение работы бота...', 'warning');
    await bot.close();
    process.exit(0);
});

log('Бот запущен и ожидает сообщений', 'success'); 