/**
 * Snail to Riches - Модуль запуска ngrok-туннеля
 * Создает защищенный туннель для доступа к локальному серверу из интернета
 */

const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Глобальные настройки
const CONFIG = {
  // Порт по умолчанию
  defaultPort: 8001,
  
  // Файл для сохранения URL
  urlFile: 'ngrok-url.txt',
  
  // Authtoken для ngrok (в идеале должен быть в переменных окружения)
  authtoken: process.env.NGROK_AUTH_TOKEN || '2vB1076Y3cPh8Kif6NVuDIV8eAi_2Vnu9ZFtY3SQSQ4bUQCj1',
  
  // Таймаут соединения в миллисекундах
  connectionTimeout: 30000
};

/**
 * Выводит сообщение в лог с форматированием
 * @param {string} message - Сообщение для вывода
 * @param {string} level - Уровень логирования (info, success, error, warning)
 */
function log(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    info: '🔷',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    start: '🚀',
    cleanup: '🧹'
  }[level] || '•';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Получает порт из аргументов командной строки, переменных окружения или глобальных переменных
 * @returns {number} Порт для использования
 */
function getPort() {
  // Проверяем аргументы командной строки
  const portArg = process.argv.find(arg => arg.startsWith('--port='));
  if (portArg) {
    const port = parseInt(portArg.split('=')[1], 10);
    if (!isNaN(port)) {
      log(`Получен порт из аргументов командной строки: ${port}`);
      return port;
    }
  }
  
  // Проверяем глобальную переменную httpPort
  if (global.httpPort) {
    log(`Получен порт из глобальной переменной: ${global.httpPort}`);
    return global.httpPort;
  }
  
  // Проверяем переменную окружения
  if (process.env.HTTP_PORT) {
    const port = parseInt(process.env.HTTP_PORT, 10);
    if (!isNaN(port)) {
      log(`Получен порт из переменной окружения: ${port}`);
      return port;
    }
  }
  
  // Возвращаем порт по умолчанию
  log(`Используется порт по умолчанию: ${CONFIG.defaultPort}`, 'warning');
  return CONFIG.defaultPort;
}

/**
 * Останавливает предыдущие туннели и очищает файлы
 * @returns {Promise<void>}
 */
async function cleanup() {
  try {
    log('Остановка предыдущих соединений...', 'cleanup');
    await ngrok.kill();
    log('Предыдущие соединения остановлены', 'success');
  } catch (error) {
    log(`Ошибка при остановке соединений: ${error.message}`, 'warning');
    // Продолжаем выполнение даже в случае ошибки
  }

  // Удаляем старый файл URL
  try {
    if (fs.existsSync(CONFIG.urlFile)) {
      fs.unlinkSync(CONFIG.urlFile);
      log(`Удален старый файл URL: ${CONFIG.urlFile}`, 'success');
    }
  } catch (error) {
    log(`Ошибка при удалении файла URL: ${error.message}`, 'warning');
  }
}

/**
 * Сохраняет URL в файл и выполняет необходимую обработку
 * @param {string} url - URL для сохранения
 * @returns {string} Обработанный URL
 */
function saveUrl(url) {
  try {
    // Удаляем символ % из URL если присутствует
    const cleanUrl = url.replace(/%/g, '');
    
    // Сохраняем URL в файл
    fs.writeFileSync(CONFIG.urlFile, cleanUrl);
    
    log(`URL сохранен в ${CONFIG.urlFile}`, 'success');
    return cleanUrl;
  } catch (error) {
    log(`Ошибка при сохранении URL: ${error.message}`, 'error');
    // В случае ошибки возвращаем исходный URL
    return url;
  }
}

/**
 * Запускает ngrok и создает туннель
 * @returns {Promise<void>}
 */
async function startNgrok() {
  log('=== ЗАПУСК NGROK ===', 'start');
  
  try {
    // Очистка
    await cleanup();
    
    // Получаем порт
    const port = getPort();
    
    // Выводим информацию о запуске
    log(`Запуск туннеля для порта ${port}...`, 'info');
    
    // Запускаем ngrok с таймаутом
    let url;
    try {
      // Создаем Promise с таймаутом
      const ngrokPromise = ngrok.connect({
        addr: port,
        authtoken: CONFIG.authtoken
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Превышен таймаут соединения (${CONFIG.connectionTimeout}ms)`)), 
                  CONFIG.connectionTimeout);
      });
      
      // Используем Promise.race для ограничения времени ожидания
      url = await Promise.race([ngrokPromise, timeoutPromise]);
    } catch (error) {
      log(`Ошибка при запуске ngrok: ${error.message}`, 'error');
      
      // Проверяем, существует ли решение для этой ошибки
      if (error.message.includes('authtoken')) {
        log('Ошибка авторизации. Убедитесь, что вы указали правильный authtoken в переменной окружения NGROK_AUTH_TOKEN', 'error');
      } else if (error.message.includes('timeout')) {
        log('Превышено время ожидания. Проверьте интернет-соединение или попробуйте перезапустить', 'error');
      }
      
      process.exit(1);
    }
    
    // Сохраняем URL
    const cleanUrl = saveUrl(url);
    
    log(`УСПЕХ! Туннель создан: ${cleanUrl}`, 'success');
    log('Туннель запущен и готов к использованию', 'success');
    
    // Регистрируем обработчик завершения
    process.on('SIGINT', handleShutdown);
    process.on('SIGTERM', handleShutdown);
    
    // Выводим инструкцию
    log('Нажмите Ctrl+C для остановки', 'info');
    
  } catch (error) {
    log(`Критическая ошибка: ${error.message}`, 'error');
    await ngrok.kill();
    process.exit(1);
  }
}

/**
 * Обработчик завершения работы
 */
async function handleShutdown() {
  log('Получен сигнал завершения, останавливаем ngrok...', 'warning');
  try {
    await ngrok.kill();
    log('ngrok остановлен корректно', 'success');
  } catch (error) {
    log(`Ошибка при остановке ngrok: ${error.message}`, 'error');
  }
  process.exit(0);
}

// Запускаем основную функцию
startNgrok().catch(error => {
  log(`Необработанная ошибка: ${error.message}`, 'error');
  process.exit(1);
}); 