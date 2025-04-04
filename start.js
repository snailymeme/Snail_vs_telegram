#!/usr/bin/env node

/**
 * Snail to Riches - Универсальный скрипт запуска
 * Управляет запуском всех компонентов проекта: HTTP-сервер, ngrok-туннель и Telegram-бот
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
require('dotenv').config();

// Промисифицируем exec для асинхронного использования
const execAsync = util.promisify(exec);

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const MODE = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'full';
const CLEAN = args.includes('--clean');
const HELP = args.includes('--help') || args.includes('-h');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// Глобальные переменные для портов и процессов
global.httpPort = null;
global.botPort = null;
let serverProcess = null;
let ngrokData = null;
let botProcess = null;

// ========== ФУНКЦИИ ЛОГГИРОВАНИЯ ==========

/**
 * Выводит сообщение в консоль с соответствующим эмодзи
 * @param {string} message - Сообщение для вывода
 * @param {string} type - Тип сообщения (info, success, error, warning)
 * @param {boolean} force - Выводить даже если режим VERBOSE выключен
 */
function log(message, type = 'info', force = true) {
    if (!force && !VERBOSE) return;

    const prefixes = {
        info: '🔷',
        success: '✅',
        error: '❌',
        warning: '⚠️',
        start: '🚀',
        cleanup: '🧹'
    };
    
    const prefix = prefixes[type] || '•';
    console.log(`${prefix} ${message}`);
}

// ========== ФУНКЦИИ СПРАВКИ ==========

/**
 * Выводит справку по использованию скрипта
 */
function showHelp() {
    console.log(`
Snail to Riches - Универсальный скрипт запуска

Использование:
  node start.js [опции]

Опции:
  --mode=<режим>   Режим запуска (full, app, bot, ngrok)
  --clean          Очистить порты и кэш перед запуском
  --verbose, -v    Подробный вывод логов
  --help, -h       Показать эту справку

Режимы:
  full   Запустить все компоненты (по умолчанию)
  app    Запустить только HTTP сервер
  bot    Запустить только Telegram бота
  ngrok  Запустить только ngrok туннель
    `);
    process.exit(0);
}

// ========== ФУНКЦИИ УПРАВЛЕНИЯ ПРОЦЕССАМИ ==========

/**
 * Останавливает процессы по имени
 * @param {string} name - Имя процесса для остановки
 * @returns {Promise<void>}
 */
async function killProcess(name) {
    log(`Попытка остановки процесса: ${name}`, 'cleanup');
    
    try {
        // Используем подходящую команду в зависимости от платформы
        const cmd = process.platform === 'win32'
            ? `taskkill /F /IM ${name} /T`
            : `pkill -f "${name}"`;
        
        await execAsync(cmd);
        log(`Процесс ${name} остановлен`, 'success');
    } catch (error) {
        log(`Процесс ${name} не найден или уже остановлен`, 'info', false);
    }
}

// ========== ФУНКЦИИ УПРАВЛЕНИЯ ПОРТАМИ ==========

/**
 * Проверяет и освобождает используемые порты
 * @returns {Promise<void>}
 */
async function cleanupPorts() {
    log('Очистка занятых портов...', 'cleanup');
    
    // Список портов для очистки
    const ports = [3000, 3001, 4040];
    
    for (const port of ports) {
        log(`Проверка порта ${port}...`, 'info', false);
        
        try {
            // Команда поиска процесса, использующего порт
            const findCmd = process.platform === 'win32'
                ? `netstat -ano | findstr :${port}`
                : `lsof -i :${port} | grep LISTEN`;
            
            const { stdout } = await execAsync(findCmd);
            
            if (stdout) {
                log(`Порт ${port} занят.`, 'warning');
                
                // Получаем PID процесса
                let pid;
                if (process.platform === 'win32') {
                    pid = stdout.trim().split(/\s+/).pop();
                } else {
                    pid = stdout.trim().split(/\s+/)[1];
                }
                
                if (pid) {
                    // Убиваем процесс
                    const killCmd = process.platform === 'win32'
                        ? `taskkill /F /PID ${pid}`
                        : `kill -9 ${pid}`;
                    
                    await execAsync(killCmd);
                    log(`Процесс с PID ${pid} на порту ${port} остановлен`, 'success');
                }
            } else {
                log(`Порт ${port} свободен`, 'info', false);
            }
        } catch (error) {
            // Если команда завершилась с ошибкой, скорее всего порт свободен
            log(`Порт ${port} свободен`, 'info', false);
        }
    }
}

/**
 * Находит свободный порт, начиная с указанного
 * @param {number} startPort - Начальный порт для проверки
 * @param {number} endPort - Конечный порт для проверки
 * @returns {Promise<number>} Свободный порт
 */
async function findFreePort(startPort, endPort = startPort + 100) {
    log(`Поиск свободного порта от ${startPort} до ${endPort}...`, 'info');
    
    for (let port = startPort; port <= endPort; port++) {
        try {
            const findCmd = process.platform === 'win32'
                ? `netstat -ano | findstr :${port}`
                : `lsof -i :${port} | grep LISTEN`;
            
            const { stdout } = await execAsync(findCmd);
            
            if (!stdout) {
                // Порт свободен
                log(`Найден свободный порт: ${port}`, 'success');
                return port;
            }
        } catch (error) {
            // Ошибка обычно означает, что порт свободен
            log(`Найден свободный порт: ${port}`, 'success');
            return port;
        }
    }
    
    throw new Error(`Не удалось найти свободный порт в диапазоне ${startPort}-${endPort}`);
}

// ========== ФУНКЦИИ УПРАВЛЕНИЯ ФАЙЛАМИ ==========

/**
 * Очистка временных файлов
 */
function cleanupFiles() {
    log('Очистка временных файлов...', 'cleanup');
    
    const filesToRemove = [
        'ngrok-url.txt',
        'ngrok_output.txt'
    ];
    
    filesToRemove.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            log(`Файл ${file} удален`, 'success');
        }
    });
}

// ========== ФУНКЦИИ ЗАПУСКА КОМПОНЕНТОВ ==========

/**
 * Запускает HTTP сервер
 * @returns {Promise<object>} Процесс HTTP сервера
 */
async function startServer() {
    log('Запуск HTTP сервера...', 'start');
    
    try {
        // Находим свободный порт, начиная с предпочитаемого порта 3000
        const httpPort = await findFreePort(3000);
        
        // Сохраняем порт в глобальных переменных
        global.httpPort = httpPort;
        
        log(`HTTP сервер будет запущен на порту ${httpPort}`, 'info');
        
        // Запускаем HTTP-сервер с обработкой ошибок
        const serverProcess = spawn('npx', ['http-server', '.', '-p', httpPort.toString()], {
            stdio: ['inherit', 'pipe', 'pipe']
        });

        // Обрабатываем вывод сервера
        serverProcess.stdout.on('data', (data) => {
            log(`HTTP: ${data.toString().trim()}`, 'info', false);
        });

        serverProcess.stderr.on('data', (data) => {
            log(`HTTP ошибка: ${data.toString().trim()}`, 'error');
        });

        serverProcess.on('error', (error) => {
            log(`Ошибка запуска HTTP сервера: ${error.message}`, 'error');
        });

        // Проверяем, запустился ли сервер
        await new Promise((resolve, reject) => {
            // Таймаут для проверки запуска сервера
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут запуска HTTP сервера'));
            }, 5000);

            // При любых данных из stdout считаем, что сервер запустился
            serverProcess.stdout.once('data', () => {
                clearTimeout(timeout);
                resolve();
            });

            // Обрабатываем ошибки запуска
            serverProcess.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    clearTimeout(timeout);
                    reject(new Error(`HTTP сервер завершился с ошибкой ${code}`));
                }
            });
        });

        log(`HTTP сервер успешно запущен на порту ${httpPort}`, 'success');
        return serverProcess;
    } catch (error) {
        log(`Не удалось запустить HTTP сервер: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Запускает ngrok туннель
 * @returns {Promise<object>} Объект с процессом и URL ngrok
 */
async function startNgrok() {
    log('Запуск ngrok туннеля...', 'start');
    
    try {
        // Удаляем старый URL-файл если существует
        if (fs.existsSync('ngrok-url.txt')) {
            fs.unlinkSync('ngrok-url.txt');
        }
        
        // Подготавливаем аргументы для скрипта ngrok
        const args = ['run-ngrok.js'];
        if (global.httpPort) {
            args.push(`--port=${global.httpPort}`);
        }
        
        // Запускаем ngrok с обработкой ошибок
        const ngrokProcess = spawn('node', args, {
            stdio: ['inherit', 'pipe', 'pipe'],
            env: { ...process.env, HTTP_PORT: global.httpPort }
        });

        // Обрабатываем вывод ngrok
        ngrokProcess.stdout.on('data', (data) => {
            log(`NGROK: ${data.toString().trim()}`, 'info', false);
        });

        ngrokProcess.stderr.on('data', (data) => {
            log(`NGROK ошибка: ${data.toString().trim()}`, 'error');
        });

        ngrokProcess.on('error', (error) => {
            log(`Ошибка запуска ngrok: ${error.message}`, 'error');
        });
        
        // Ожидаем создания файла с URL
        return new Promise((resolve, reject) => {
            // Таймаут для ожидания URL
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут ожидания URL ngrok'));
            }, 20000);

            // Функция для проверки создания файла с URL
            const checkUrlFile = () => {
                if (fs.existsSync('ngrok-url.txt')) {
                    try {
                        const url = fs.readFileSync('ngrok-url.txt', 'utf8').trim();
                        if (url) {
                            clearTimeout(timeout);
                            log(`Получен ngrok URL: ${url}`, 'success');
                            resolve({ process: ngrokProcess, url });
                            return;
                        }
                    } catch (e) {
                        // Игнорируем ошибки чтения файла
                    }
                }
                
                // Проверяем, не завершился ли процесс с ошибкой
                if (ngrokProcess.exitCode !== null && ngrokProcess.exitCode !== 0) {
                    clearTimeout(timeout);
                    reject(new Error(`Процесс ngrok завершился с ошибкой ${ngrokProcess.exitCode}`));
                    return;
                }
                
                // Если файла нет, проверяем снова через секунду
                setTimeout(checkUrlFile, 1000);
            };
            
            // Начинаем проверки через 3 секунды
            setTimeout(checkUrlFile, 3000);
        });
    } catch (error) {
        log(`Не удалось запустить ngrok: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Запускает Telegram бота
 * @param {string} ngrokUrl - URL ngrok для использования ботом (опционально)
 * @returns {Promise<object>} Процесс Telegram бота
 */
async function startBot(ngrokUrl) {
    log('Запуск Telegram бота...', 'start');
    
    try {
        // Находим свободный порт, начиная с предпочитаемого порта 3001
        const botPort = await findFreePort(3001);
        
        // Сохраняем порт в глобальных переменных
        global.botPort = botPort;
        
        // Создаем переменные окружения для бота
        const env = { ...process.env };
        if (ngrokUrl) {
            env.NGROK_URL = ngrokUrl;
            log(`Передаем URL в бота: ${ngrokUrl}`, 'info', false);
        }
        
        // Передаем порт боту через переменную окружения
        env.PORT = botPort.toString();
        
        log(`Telegram бот будет запущен на порту ${botPort}`, 'info');
        
        // Запускаем бота с обработкой ошибок
        const botProcess = spawn('node', ['bot.js'], {
            stdio: ['inherit', 'pipe', 'pipe'],
            env
        });

        // Обрабатываем вывод бота
        botProcess.stdout.on('data', (data) => {
            log(`BOT: ${data.toString().trim()}`, 'info', false);
        });

        botProcess.stderr.on('data', (data) => {
            log(`BOT ошибка: ${data.toString().trim()}`, 'error');
        });

        botProcess.on('error', (error) => {
            log(`Ошибка запуска бота: ${error.message}`, 'error');
        });

        // Проверяем, запустился ли бот
        await new Promise((resolve, reject) => {
            // Таймаут для проверки запуска бота
            const timeout = setTimeout(() => {
                reject(new Error('Таймаут запуска Telegram бота'));
            }, 10000);

            // При любых данных из stdout считаем, что бот запустился
            botProcess.stdout.once('data', () => {
                clearTimeout(timeout);
                resolve();
            });

            // Обрабатываем ошибки запуска
            botProcess.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    clearTimeout(timeout);
                    reject(new Error(`Telegram бот завершился с ошибкой ${code}`));
                }
            });
        });

        log(`Telegram бот успешно запущен на порту ${botPort}`, 'success');
        return botProcess;
    } catch (error) {
        log(`Не удалось запустить Telegram бота: ${error.message}`, 'error');
        throw error;
    }
}

// ========== ГЛАВНАЯ ФУНКЦИЯ ==========

/**
 * Главная функция запуска приложения
 */
async function main() {
    try {
        // Выводим информацию о запуске
        console.log('========================================');
        console.log('🐌 Snail to Riches - Запуск приложения');
        console.log('========================================');
        console.log(`Режим: ${MODE}, Очистка: ${CLEAN ? 'Да' : 'Нет'}`);
        
        // Показываем справку если запрошена
        if (HELP) {
            showHelp();
            return;
        }
        
        // Очистка, если запрошена
        if (CLEAN) {
            await cleanupPorts();
            cleanupFiles();
            
            // Убиваем все процессы
            await killProcess('ngrok');
            await killProcess('node bot.js');
            await killProcess('http-server');
            
            // Ждем чтобы процессы завершились
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Запуск в зависимости от режима
        switch (MODE) {
            case 'full':
                // Запускаем все компоненты
                serverProcess = await startServer();
                ngrokData = await startNgrok();
                botProcess = await startBot(ngrokData.url);
                break;
                
            case 'app':
                // Только HTTP сервер
                serverProcess = await startServer();
                break;
                
            case 'bot':
                // Только бот
                botProcess = await startBot();
                break;
                
            case 'ngrok':
                // Только ngrok
                ngrokData = await startNgrok();
                break;
                
            default:
                log(`Неизвестный режим: ${MODE}`, 'error');
                process.exit(1);
        }
        
        // Выводим информацию о успешном запуске
        console.log('========================================');
        log('Компоненты успешно запущены!', 'success');
        if (ngrokData?.url) {
            log(`URL приложения: ${ngrokData.url}`, 'success');
        }
        console.log('========================================');
        
        // Обработка завершения
        process.on('SIGINT', async () => {
            log('Завершение работы...', 'info');
            
            // Останавливаем запущенные процессы
            if (serverProcess) serverProcess.kill();
            if (ngrokData?.process) ngrokData.process.kill();
            if (botProcess) botProcess.kill();
            
            // Дополнительная очистка
            await killProcess('ngrok');
            await killProcess('node bot.js');
            await killProcess('http-server');
            
            log('Приложение корректно остановлено', 'success');
            process.exit(0);
        });
        
    } catch (error) {
        log(`Критическая ошибка: ${error.message}`, 'error');
        
        // Пытаемся остановить запущенные процессы
        if (serverProcess) serverProcess.kill();
        if (ngrokData?.process) ngrokData.process.kill();
        if (botProcess) botProcess.kill();
        
        process.exit(1);
    }
}

// Запуск основной функции
main(); 