/**
 * Snail to Riches - Главный JavaScript файл
 * Инициализирует игру и интегрируется с Telegram Mini App
 */

import { GameState } from './modules/gameState.js';
import { GAME_CONFIG, TELEGRAM_CONFIG } from './modules/config.js';
import * as UI from './modules/ui.js';

// Главный класс приложения
class SnailToRichesApp {
    constructor() {
        // Создаем экземпляр GameState
        this.gameState = new GameState();
        
        // Привязываем обработчики событий
        this.handleSnailSelection = this.handleSnailSelection.bind(this);
        this.handleBetChange = this.handleBetChange.bind(this);
        this.handleStartRace = this.handleStartRace.bind(this);
        
        // Инициализация Telegram Web App, если запущено в Telegram
        this.initTelegramWebApp();
    }
    
    /**
     * Инициализирует интеграцию с Telegram Web App
     */
    initTelegramWebApp() {
        if (TELEGRAM_CONFIG.isRunningInTelegram()) {
            console.log('Интеграция с Telegram Web App...');
            
            const tg = window.Telegram.WebApp;
            
            // Сообщаем Telegram, что приложение готово
            tg.ready();
            
            // Устанавливаем тему и цвета
            tg.expand();
            
            // Получаем данные пользователя
            const userData = TELEGRAM_CONFIG.getUserData();
            if (userData) {
                console.log('Пользователь Telegram:', userData);
            }
            
            console.log('Telegram Web App успешно интегрирован');
        } else {
            console.log('Приложение запущено вне Telegram');
        }
    }
    
    /**
     * Обрабатывает выбор улитки пользователем
     * @param {string} snailType - Тип выбранной улитки
     */
    handleSnailSelection(snailType) {
        console.log(`handleSnailSelection вызван с типом: ${snailType}`);
        
        // Устанавливаем выбранную улитку в игровом состоянии
        this.gameState.selectSnail(snailType);
        console.log(`Установлен тип улитки: ${this.gameState.selectedSnail}`);
        
        // Визуальное обновление UI (выделение выбранной улитки)
        document.querySelectorAll('.snail-option').forEach(el => {
            el.classList.remove('selected');
            // Убираем inline обработчики, которые могут конфликтовать
            el.removeAttribute('onclick');
        });
        
        const selectedElement = document.querySelector(`.snail-option[data-type="${snailType}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
            
            // Получаем имя и путь к изображению выбранной улитки
            const snailName = selectedElement.querySelector('.snail-name').textContent;
            
            // Обновляем информацию о выбранной улитке в интерфейсе, если такой элемент есть
            const selectedSnailInfo = document.getElementById('selected-snail-info');
            if (selectedSnailInfo) {
                selectedSnailInfo.textContent = `Ваша улитка: ${snailName}`;
                selectedSnailInfo.style.fontWeight = 'bold';
                selectedSnailInfo.style.color = '#FFD700'; // Делаем текст заметнее
            }
            
            // Активируем кнопку старта гонки
            const startButton = document.getElementById('start-race');
            if (startButton) {
                startButton.removeAttribute('disabled');
                startButton.classList.add('active');
            }
            
            console.log(`Выбрана улитка: ${snailName}`);
        } else {
            console.error(`Не найден элемент для типа улитки: ${snailType}`);
        }
    }
    
    /**
     * Обрабатывает изменение суммы ставки
     * @param {number} amount - Новая сумма ставки
     */
    handleBetChange(amount) {
        const validAmount = this.gameState.setBetAmount(amount);
        
        // Обновление UI (поля ввода ставки)
        const betInput = document.getElementById('bet-amount');
        if (betInput && betInput.value !== String(validAmount)) {
            betInput.value = validAmount;
        }
    }
    
    /**
     * Обрабатывает нажатие на кнопку "Начать гонку"
     */
    async handleStartRace() {
        console.log('handleStartRace вызван');
        console.log(`Текущая выбранная улитка: ${this.gameState.selectedSnail}`);
        
        // Если улитка не выбрана, выбираем первую доступную
        if (!this.gameState.selectedSnail) {
            const firstSnail = document.querySelector('.snail-option');
            if (firstSnail) {
                const defaultType = firstSnail.getAttribute('data-type') || 'racer';
                console.log(`Автоматически выбираем улитку: ${defaultType}`);
                this.gameState.selectSnail(defaultType);
            } else {
                console.error('Нет доступных улиток для выбора');
                UI.showError('Выберите улитку', 'Пожалуйста, выберите улитку перед началом гонки');
                return;
            }
        }
        
        try {
            // Отображаем игровой экран перед началом гонки
            const raceContainer = document.getElementById('race-container');
            if (raceContainer) {
                console.log('Отображаем игровой экран');
                document.getElementById('start-screen').style.display = 'none';
                raceContainer.classList.remove('hidden');
            } else {
                console.error('Контейнер гонки не найден');
            }
            
            // Пытаемся инициализировать Canvas
            const canvas = document.getElementById('race-canvas');
            if (canvas) {
                console.log('Canvas найден, устанавливаем размеры');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                
                // Проверяем, что контекст Canvas можно получить
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error('Невозможно получить 2D контекст');
                    throw new Error('Canvas context not available');
                }
                
                // Рисуем что-то на канвасе, чтобы убедиться, что он работает
                ctx.fillStyle = '#222';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.font = '24px Arial';
                ctx.fillText('Загрузка лабиринта...', canvas.width/2 - 120, canvas.height/2);
            } else {
                console.error('Canvas для гонки не найден');
            }

            // Попытка начать гонку
            await this.gameState.startRace();
        } catch (error) {
            console.error('Ошибка при запуске гонки:', error);
            UI.showError('Ошибка запуска', 'Не удалось начать гонку. Пожалуйста, попробуйте еще раз.');
        }
    }
    
    /**
     * Инициализирует элементы управления на странице
     */
    setupControls() {
        console.log('Инициализация элементов управления...');
        
        // Инициализация выбора улиток
        const snailOptions = document.querySelectorAll('.snail-option');
        console.log(`Найдено ${snailOptions.length} кнопок выбора улиток`);
        
        // ОТЛАДКА: проверяем доступность элементов
        console.log('ПРОВЕРКА ЭЛЕМЕНТОВ:');
        console.log('Элементы .snail-option обнаружены:', snailOptions.length > 0);
        
        // Очищаем все существующие обработчики
        snailOptions.forEach(el => {
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        });
        
        // Заново добавляем обработчики ко всем кнопкам
        document.querySelectorAll('.snail-option').forEach((el, index) => {
            const snailType = el.getAttribute('data-type');
            console.log(`Настройка обработчика для улитки типа: ${snailType} (индекс: ${index})`);
            
            // Делаем элемент более интерактивным и заметным
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.2s, box-shadow 0.2s';
            el.style.userSelect = 'none';
            el.style.WebkitTapHighlightColor = 'rgba(0,0,0,0)'; // Убираем эффект тапа на мобильных
            
            // Повышаем z-index для лучшей работы на мобильных
            el.style.position = 'relative';
            el.style.zIndex = '10';
            
            // Разные типы обработчиков для надежности в Telegram
            el.addEventListener('click', event => {
                console.log(`Клик по улитке типа: ${snailType}`);
                this.handleSnailSelection(snailType);
                event.preventDefault();
                event.stopPropagation();
            }, {passive: false});
            
            el.addEventListener('touchstart', event => {
                console.log(`Касание улитки типа: ${snailType}`);
                this.handleSnailSelection(snailType);
                event.preventDefault();
                event.stopPropagation();
            }, {passive: false});
            
            // Дополнительный data-атрибут для прямого доступа
            el.setAttribute('data-selected', 'false');
            
            // Добавляем роль и tabindex для более доступности
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', `Выбрать улитку ${snailType}`);
            
            // Добавляем обработчик для клавиатуры
            el.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    console.log(`Активация с клавиатуры улитки типа: ${snailType}`);
                    this.handleSnailSelection(snailType);
                    event.preventDefault();
                }
            });
            
            // Визуальный эффект при наведении
            el.addEventListener('mouseenter', () => {
                if (!el.classList.contains('selected')) {
                    el.style.transform = 'scale(1.05)';
                    el.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                }
            });
            
            el.addEventListener('mouseleave', () => {
                if (!el.classList.contains('selected')) {
                    el.style.transform = 'scale(1)';
                    el.style.boxShadow = 'none';
                }
            });
        });
        
        // Делаем предварительный выбор первой улитки автоматически
        if (snailOptions.length > 0) {
            const firstSnailType = snailOptions[0].getAttribute('data-type');
            console.log(`Автоматически выбираем улитку типа: ${firstSnailType}`);
            
            // Вызываем клик программно через небольшую задержку
            setTimeout(() => {
                try {
                    this.handleSnailSelection(firstSnailType);
                    console.log('Программный выбор первой улитки выполнен');
                } catch (e) {
                    console.error('Ошибка программного выбора улитки:', e);
                }
            }, 500);
        }
        
        // Инициализация ввода ставки
        const betInput = document.getElementById('bet-amount');
        if (betInput) {
            betInput.addEventListener('change', (e) => {
                this.handleBetChange(parseFloat(e.target.value));
            });
            
            // Устанавливаем начальное значение
            betInput.value = GAME_CONFIG.BETTING.DEFAULT_BET || 10;
        }
        
        // Инициализация кнопки "Начать гонку"
        const startButton = document.getElementById('start-race');
        if (startButton) {
            console.log('Настройка обработчика для кнопки "Начать гонку"');
            startButton.addEventListener('click', (event) => {
                console.log('Клик по кнопке "Начать гонку"');
                event.preventDefault();
                this.handleStartRace();
            });
        }
    }
    
    /**
     * Запускает приложение
     */
    async start() {
        try {
            console.log('Запуск приложения Snail to Riches...');
            
            // Инициализируем игровое состояние
            await this.gameState.initialize();
            
            // Настраиваем элементы управления
            this.setupControls();
            
            // Показываем первый экран (выбор улитки)
            this.showScreen('start-screen');
            
            console.log('Приложение успешно запущено');
        } catch (error) {
            console.error('Ошибка при запуске приложения:', error);
            UI.showError('Ошибка при запуске приложения', error);
        }
    }
    
    /**
     * Показывает указанный экран и скрывает остальные
     * @param {string} screenId - ID экрана для отображения
     */
    showScreen(screenId) {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Показываем нужный экран
        const screenToShow = document.getElementById(screenId);
        if (screenToShow) {
            screenToShow.style.display = 'flex';
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const app = new SnailToRichesApp();
    // Экспортируем экземпляр приложения в глобальную переменную для доступа из inline-обработчиков
    window.app = app;
    app.start();
}); 