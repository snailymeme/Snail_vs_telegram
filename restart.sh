#!/bin/bash
#
# Snail to Riches - Скрипт перезапуска приложения
# Останавливает все компоненты, проверяет порты и перезапускает приложение
#

# Цветной вывод
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    local level=$1
    local message=$2
    local timestamp=$(date +"%H:%M:%S")
    
    case $level in
        "info")
            echo -e "${BLUE}🔷 [${timestamp}] ${message}${NC}"
            ;;
        "success")
            echo -e "${GREEN}✅ [${timestamp}] ${message}${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️ [${timestamp}] ${message}${NC}"
            ;;
        "error")
            echo -e "${RED}❌ [${timestamp}] ${message}${NC}"
            ;;
        *)
            echo -e "[${timestamp}] ${message}"
            ;;
    esac
}

# Проверка наличия необходимых команд
check_requirements() {
    log "info" "Проверка наличия необходимых команд..."
    
    # Проверяем наличие python3
    if ! command -v python3 &> /dev/null; then
        log "error" "Python3 не установлен. Установите Python3 и повторите попытку."
        exit 1
    fi
    
    # Проверяем наличие node
    if ! command -v node &> /dev/null; then
        log "error" "Node.js не установлен. Установите Node.js и повторите попытку."
        exit 1
    fi
    
    log "success" "Все необходимые команды доступны."
}

# Остановка всех процессов
stop_processes() {
    log "info" "Остановка всех процессов..."
    
    # Находим процессы Python HTTP сервера
    local PYTHON_PIDS=$(ps aux | grep "python3 -m http.server" | grep -v grep | awk '{print $2}')
    
    if [ ! -z "$PYTHON_PIDS" ]; then
        for PID in $PYTHON_PIDS; do
            log "info" "Останавливаем Python процесс $PID..."
            kill -9 $PID 2>/dev/null
        done
    else
        log "info" "Активных процессов HTTP сервера не найдено."
    fi
    
    # Находим процессы Node.js для Telegram бота
    local NODE_PIDS=$(ps aux | grep "node bot.js" | grep -v grep | awk '{print $2}')
    
    if [ ! -z "$NODE_PIDS" ]; then
        for PID in $NODE_PIDS; do
            log "info" "Останавливаем Node.js процесс $PID..."
            kill -9 $PID 2>/dev/null
        done
    else
        log "info" "Активных процессов Telegram бота не найдено."
    fi
    
    # Находим процессы ngrok
    local NGROK_PIDS=$(ps aux | grep "node run-ngrok.js" | grep -v grep | awk '{print $2}')
    
    if [ ! -z "$NGROK_PIDS" ]; then
        for PID in $NGROK_PIDS; do
            log "info" "Останавливаем ngrok процесс $PID..."
            kill -9 $PID 2>/dev/null
        done
    else
        log "info" "Активных процессов ngrok не найдено."
    fi
    
    # Даем процессам время на завершение
    sleep 1
    
    log "success" "Все процессы остановлены."
}

# Проверка и освобождение занятых портов
check_ports() {
    log "info" "Проверка занятых портов..."
    
    # Порт для HTTP сервера
    local PORTS="8001 8000"
    
    for PORT in $PORTS; do
        # Находим PID процесса, использующего порт
        local PID=$(lsof -t -i :$PORT 2>/dev/null)
        
        if [ ! -z "$PID" ]; then
            log "warning" "Порт $PORT занят процессом $PID, завершаем..."
            kill -9 $PID 2>/dev/null
            
            # Проверяем, освободился ли порт
            sleep 1
            local CHECK_PID=$(lsof -t -i :$PORT 2>/dev/null)
            if [ ! -z "$CHECK_PID" ]; then
                log "error" "Не удалось освободить порт $PORT (процесс $CHECK_PID)."
            else
                log "success" "Порт $PORT освобожден."
            fi
        else
            log "info" "Порт $PORT свободен."
        fi
    done
}

# Запуск HTTP-сервера
start_http_server() {
    log "info" "Запуск HTTP-сервера..."
    
    python3 -m http.server 8001 &
    
    # Проверяем запуск сервера
    sleep 2
    if lsof -i :8001 &> /dev/null; then
        log "success" "HTTP-сервер успешно запущен на порту 8001."
    else
        log "error" "Не удалось запустить HTTP-сервер."
        exit 1
    fi
}

# Запуск ngrok-туннеля
start_ngrok() {
    log "info" "Запуск ngrok-туннеля..."
    
    # Проверяем, существует ли файл run-ngrok.js
    if [ ! -f run-ngrok.js ]; then
        log "error" "Файл run-ngrok.js не найден."
        exit 1
    fi
    
    # Запускаем ngrok
    node run-ngrok.js &
    
    # Даем ngrok время на запуск
    sleep 5
    
    # Проверяем, создан ли файл с URL
    if [ -f ngrok-url.txt ]; then
        local URL=$(cat ngrok-url.txt)
        log "success" "ngrok успешно запущен. URL: $URL"
    else
        log "error" "Не удалось получить URL от ngrok."
        exit 1
    fi
}

# Запуск Telegram-бота
start_bot() {
    log "info" "Запуск Telegram-бота..."
    
    # Проверяем, существует ли файл bot.js
    if [ ! -f bot.js ]; then
        log "error" "Файл bot.js не найден."
        exit 1
    fi
    
    # Запускаем бота
    node bot.js &
    
    # Даем боту время на запуск
    sleep 2
    
    # Проверяем, запустился ли бот
    if pgrep -f "node bot.js" > /dev/null; then
        log "success" "Telegram-бот успешно запущен."
    else
        log "error" "Не удалось запустить Telegram-бота."
    fi
}

# Показать статус запущенных процессов
show_status() {
    log "info" "Статус запущенных процессов:"
    
    # Проверяем HTTP-сервер
    if lsof -i :8001 &> /dev/null; then
        log "success" "HTTP-сервер запущен на порту 8001."
        log "info" "URL: http://localhost:8001"
    else
        log "error" "HTTP-сервер не запущен."
    fi
    
    # Проверяем ngrok
    if pgrep -f "node run-ngrok.js" > /dev/null; then
        log "success" "ngrok запущен."
        if [ -f ngrok-url.txt ]; then
            local URL=$(cat ngrok-url.txt)
            log "info" "ngrok URL: $URL"
        else
            log "warning" "Файл с URL ngrok не найден."
        fi
    else
        log "error" "ngrok не запущен."
    fi
    
    # Проверяем бота
    if pgrep -f "node bot.js" > /dev/null; then
        log "success" "Telegram-бот запущен."
    else
        log "error" "Telegram-бот не запущен."
    fi
    
    # Подробная информация о процессах
    echo ""
    ps aux | grep -E 'python3 -m http.server|node bot.js|node run-ngrok.js' | grep -v grep
    echo ""
}

# Главная функция
main() {
    log "info" "Запуск процесса перезапуска Snail to Riches..."
    
    # Проверяем наличие необходимых команд
    check_requirements
    
    # Останавливаем все процессы
    stop_processes
    
    # Проверяем и освобождаем порты
    check_ports
    
    # Запускаем HTTP-сервер
    start_http_server
    
    # Запускаем ngrok
    start_ngrok
    
    # Запускаем бота
    start_bot
    
    # Показываем статус
    show_status
    
    log "success" "Перезапуск завершен! Приложение готово к работе."
    log "info" "Доступ к игре: http://localhost:8001"
    if [ -f ngrok-url.txt ]; then
        local URL=$(cat ngrok-url.txt)
        log "info" "Внешний доступ через HTTPS: $URL"
    fi
    log "info" "Telegram бот запущен и отвечает на команды /start и /help."
    log "info" "Нажмите Ctrl+C для завершения."
    
    # Ожидаем сигнала завершения
    wait
}

# Запуск главной функции
main 