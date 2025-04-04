/**
 * Модуль для управления состоянием игры
 * Централизует управление состоянием и отделяет логику от UI
 */

import { GAME_CONFIG, getDeviceInfo } from './config.js';
import { loadImage, preloadImages } from './imageLoader.js';
import { GameRenderer } from './gameRenderer.js';
import * as UI from './ui.js';

/**
 * Класс управления состоянием игры
 */
export class GameState {
    /**
     * Создает новый экземпляр GameState
     */
    constructor() {
        // Основные компоненты игры
        this.canvas = null;
        this.renderer = null;
        this.maze = null;
        this.slugManager = null;
        this.gameCycle = null;
        
        // Состояние игры
        this.raceStarted = false;
        this.raceFinished = false;
        this.selectedSnail = null;
        this.betAmount = GAME_CONFIG.BETTING.DEFAULT_BET;
        this.wallet = null;
        
        // Информация об устройстве
        this.deviceInfo = getDeviceInfo();
        
        // Загруженные изображения
        this.images = null;
        
        // Привязка контекста для методов
        this.startRace = this.startRace.bind(this);
        this.endRace = this.endRace.bind(this);
        this.resetGame = this.resetGame.bind(this);
        this.selectSnail = this.selectSnail.bind(this);
        this.setBetAmount = this.setBetAmount.bind(this);
    }
    
    /**
     * Инициализирует игру
     * @returns {Promise} Promise, завершающийся после инициализации
     */
    async initialize() {
        try {
            console.log('Инициализация игры...');
            
            // Инициализация UI элементов
            const elements = UI.setupRaceElements();
            this.canvas = elements.raceCanvas;
            
            // Показываем экран загрузки
            UI.showLoadingScreen();
            
            // Предзагружаем изображения
            try {
                this.images = await preloadImages();
                console.log('Изображения успешно загружены:', this.images);
            } catch (error) {
                console.error('Ошибка при загрузке изображений:', error);
                UI.showError('Ошибка при загрузке изображений', error);
                // Продолжаем без изображений
                this.images = {};
            }
            
            // Инициализация рендерера
            this.renderer = new GameRenderer(this.canvas, {
                cellSize: GAME_CONFIG.MAZE.CELL_SIZE
            });
            this.renderer.setImages(this.images);
            
            // Загружаем менеджер улиток и модуль цикла игры асинхронно
            const [SlugManager, GameCycle] = await Promise.all([
                import('./slug-manager.js').then(module => module.default || module.SlugManager),
                import('./game-cycle.js').then(module => module.default || module.GameCycle)
            ]);
            
            this.slugManager = new SlugManager();
            this.gameCycle = new GameCycle();
            
            // Инициализация лабиринта
            await this.initializeMaze();
            
            // Скрываем экран загрузки
            UI.hideLoadingScreen();
            
            console.log('Инициализация завершена успешно');
            return true;
        } catch (error) {
            console.error('Ошибка при инициализации игры:', error);
            UI.showError('Ошибка при инициализации игры', error);
            UI.hideLoadingScreen();
            return false;
        }
    }
    
    /**
     * Инициализирует лабиринт с учетом производительности устройства
     */
    async initializeMaze() {
        try {
            // Импортируем генератор лабиринта
            const MazeGenerator = await import('./mazeGenerator.js')
                .then(module => module.default || module.MazeGenerator);
            
            // Получаем адаптированные под устройство настройки
            const adaptedSettings = this.deviceInfo.getAdaptedMazeSize();
            
            // Создаем генератор с адаптированными размерами
            const mazeGenerator = new MazeGenerator(
                adaptedSettings.width,
                adaptedSettings.height
            );
            
            // Генерируем лабиринт
            this.maze = mazeGenerator.generate({
                complexity: adaptedSettings.complexity,
                branchFactor: GAME_CONFIG.MAZE.DEFAULT_BRANCH_FACTOR,
                randomStart: false,
                randomFinish: false
            });
            
            console.log('Лабиринт успешно сгенерирован:', 
                        `${this.maze.width}x${this.maze.height}`);
            
            // Обновляем canvas
            if (this.renderer) {
                this.renderer.render(this.maze, []);
            }
            
            return this.maze;
        } catch (error) {
            console.error('Ошибка при инициализации лабиринта:', error);
            throw error;
        }
    }
    
    /**
     * Выбирает улитку для ставки
     * @param {string} snailType - Тип выбранной улитки
     */
    selectSnail(snailType) {
        if (this.raceStarted) {
            console.warn('Невозможно выбрать улитку: гонка уже началась');
            return;
        }
        
        this.selectedSnail = snailType;
        console.log(`Выбрана улитка: ${snailType}`);
        
        // Обновляем информацию в UI
        const snailConfig = GAME_CONFIG.SLUG.TYPES[snailType] || GAME_CONFIG.SLUG.TYPES.default;
        UI.updateSelectedSnailInfo(snailConfig.name);
        
        return this.selectedSnail;
    }
    
    /**
     * Устанавливает сумму ставки
     * @param {number} amount - Сумма ставки
     */
    setBetAmount(amount) {
        if (this.raceStarted) {
            console.warn('Невозможно изменить ставку: гонка уже началась');
            return;
        }
        
        // Валидация суммы ставки
        const validAmount = Math.min(
            Math.max(parseFloat(amount) || 0, GAME_CONFIG.BETTING.MIN_BET),
            GAME_CONFIG.BETTING.MAX_BET
        );
        
        this.betAmount = validAmount;
        console.log(`Установлена ставка: ${validAmount}`);
        
        return this.betAmount;
    }
    
    /**
     * Запускает гонку улиток
     */
    async startRace() {
        if (this.raceStarted) {
            console.warn('Гонка уже запущена');
            return;
        }
        
        if (!this.selectedSnail) {
            console.warn('Невозможно начать гонку: улитка не выбрана');
            UI.showError('Выберите улитку', 'Пожалуйста, выберите улитку перед началом гонки');
            return;
        }
        
        try {
            console.log('Начало гонки...');
            UI.showLoadingScreen();
            
            // Инициализируем лабиринт, если его еще нет
            if (!this.maze) {
                console.log('Лабиринт не найден, создаем новый');
                await this.initializeMaze();
            }
            
            // Подготавливаем визуальные элементы
            this.setupRaceUI();
            
            // Инициализируем улиток для гонки
            await this.initializeSlugs();
            
            // Показываем экран гонки
            this.showRaceScreen();
            
            // Настраиваем игровой цикл
            this.setupGameCycle();
            
            // Запускаем игровой цикл и улиток
            this.startGameCycle();
            
            this.raceStarted = true;
            
            console.log('Гонка успешно запущена');
            UI.hideLoadingScreen();
            
            return true;
        } catch (error) {
            console.error('Ошибка при запуске гонки:', error);
            UI.showError('Ошибка при запуске гонки', error);
            UI.hideLoadingScreen();
            return false;
        }
    }
    
    /**
     * Подготавливает UI для отображения гонки
     */
    setupRaceUI() {
        // Настраиваем canvas для отображения гонки
        if (!this.canvas) {
            console.log('Создаем новый canvas для гонки');
            const elements = UI.setupRaceElements();
            this.canvas = elements.raceCanvas;
        }
        
        // Обновляем размеры canvas для соответствия размеру экрана
        const containerWidth = document.getElementById('race-container')?.clientWidth || window.innerWidth;
        const containerHeight = Math.min(window.innerHeight * 0.8, containerWidth * 1.2);
        
        this.canvas.width = containerWidth;
        this.canvas.height = containerHeight;
        
        // Пересчитываем размер ячейки лабиринта
        const cellSize = Math.min(
            Math.floor(containerWidth / (this.maze?.width || 20)),
            Math.floor(containerHeight / (this.maze?.height || 15))
        );
        
        // Обновляем настройки рендерера
        if (this.renderer) {
            this.renderer.setCellSize(cellSize);
            this.renderer.setCanvas(this.canvas);
        } else {
            // Создаем рендерер, если он не существует
            this.renderer = new GameRenderer(this.canvas, {
                cellSize: cellSize
            });
            
            // Устанавливаем изображения
            this.renderer.setImages(this.images || {});
        }
        
        console.log(`Canvas настроен: ${this.canvas.width}x${this.canvas.height}, размер ячейки: ${cellSize}px`);
        
        // Отображаем пустой лабиринт
        if (this.maze && this.renderer) {
            this.renderer.render(this.maze, []);
        }
    }
    
    /**
     * Инициализирует улиток для гонки
     */
    async initializeSlugs() {
        try {
            console.log('Инициализация улиток для гонки...');
            
            // Импортируем SlugManager, если он еще не загружен
            if (!this.slugManager) {
                const SlugManager = await import('./slug-manager.js')
                    .then(module => module.default || module.SlugManager);
                
                this.slugManager = new SlugManager({
                    canvas: this.canvas,
                    maze: this.maze
                });
            } else {
                // Обновляем настройки существующего менеджера
                this.slugManager.setMaze(this.maze);
                this.slugManager.setCanvas(this.canvas);
            }
            
            // Очищаем все существующие улитки
            this.slugManager.clearSlugs();
            
            // Получаем изображения для улиток
            const slugImages = {};
            
            if (this.images) {
                // Собираем все изображения улиток из загруженных ресурсов
                for (const [key, image] of Object.entries(this.images)) {
                    if (key.includes('snail') || key.includes('slug')) {
                        const type = key.replace('snail_', '').replace('slug_', '').replace('.png', '');
                        slugImages[type] = image;
                    }
                }
            }
            
            // Создаем улитки всех типов
            const slugTypes = ['red', 'green', 'blue', 'lilac', 'yellow'];
            const slugTypeMap = {
                'red': 'racer',
                'green': 'explorer', 
                'blue': 'snake',
                'lilac': 'stubborn',
                'yellow': 'default'
            };
            
            // Создаем всех улиток для гонки
            slugTypes.forEach((color, index) => {
                const isPlayer = slugTypeMap[color] === this.selectedSnail;
                const type = slugTypeMap[color];
                
                const slugImage = slugImages[color] || 
                                 this.images[`snail_${color}`] || 
                                 this.images[`slug_${color}`] ||
                                 this.images[`snail${index + 1}`];
                
                // Создаем улитку с соответствующими параметрами
                const slug = this.slugManager.addSlug({
                    type: type,
                    startPosition: this.maze.startPoint,
                    finishPosition: this.maze.finishPoint,
                    color: GAME_CONFIG.SLUG.TYPES[type]?.color || '#' + Math.floor(Math.random()*16777215).toString(16),
                    image: slugImage,
                    isPlayer: isPlayer,
                    startDelay: index * 300 // Разная задержка для разных улиток
                });
                
                if (slug) {
                    console.log(`Улитка типа ${type} (${color}) добавлена${isPlayer ? ' (игрок)' : ''}`);
                }
            });
            
            console.log(`Всего добавлено ${this.slugManager.getSlugsCount()} улиток`);
            
            return true;
        } catch (error) {
            console.error('Ошибка при инициализации улиток:', error);
            throw error;
        }
    }
    
    /**
     * Показывает экран гонки
     */
    showRaceScreen() {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Показываем экран гонки
        const raceContainer = document.getElementById('race-container');
        if (raceContainer) {
            raceContainer.classList.remove('hidden');
            raceContainer.style.display = 'block';
        }
        
        // Обновляем информацию о выбранной улитке
        const snailConfig = GAME_CONFIG.SLUG.TYPES[this.selectedSnail] || GAME_CONFIG.SLUG.TYPES.default;
        UI.updateSelectedSnailInfo(snailConfig.name);
        
        console.log('Экран гонки отображен');
    }
    
    /**
     * Настраивает игровой цикл
     */
    setupGameCycle() {
        try {
            // Импортируем GameCycle, если он еще не загружен
            if (!this.gameCycle) {
                import('./game-cycle.js').then(module => {
                    const GameCycle = module.default || module.GameCycle;
                    
                    this.gameCycle = new GameCycle({
                        slugManager: this.slugManager,
                        canvas: this.canvas
                    });
                    
                    // Настраиваем обработчики событий
                    this.gameCycle.setOnRaceStart(() => {
                        console.log('Гонка началась!');
                    });
                    
                    this.gameCycle.setOnRaceUpdate((state) => {
                        // Обновляем таймер
                        UI.updateRaceTimer(state.elapsedTime / 1000);
                    });
                    
                    this.gameCycle.setOnRaceFinish((results) => {
                        this.endRace(results);
                    });
                    
                    this.gameCycle.setOnError((error) => {
                        console.error('Ошибка в игровом цикле:', error);
                        UI.showError('Ошибка в игровом цикле', error);
                    });
                    
                    // Подготавливаем гонку
                    console.log('Подготовка игрового цикла...');
                    const prepared = this.gameCycle.prepare({
                        mazeWidth: this.maze.width,
                        mazeHeight: this.maze.height
                    });
                    
                    if (prepared) {
                        console.log('Игровой цикл готов');
                    } else {
                        console.error('Ошибка при подготовке игрового цикла');
                    }
                });
            } else {
                // Обновляем существующий игровой цикл
                this.gameCycle.setSlugManager(this.slugManager);
                this.gameCycle.setCanvas(this.canvas);
                
                // Подготавливаем гонку
                console.log('Подготовка игрового цикла...');
                const prepared = this.gameCycle.prepare({
                    mazeWidth: this.maze.width,
                    mazeHeight: this.maze.height
                });
                
                if (prepared) {
                    console.log('Игровой цикл готов');
                } else {
                    console.error('Ошибка при подготовке игрового цикла');
                }
            }
        } catch (error) {
            console.error('Ошибка при настройке игрового цикла:', error);
            throw error;
        }
    }
    
    /**
     * Запускает игровой цикл и улиток
     */
    startGameCycle() {
        try {
            // Если игровой цикл еще не инициализирован, откладываем запуск
            if (!this.gameCycle) {
                console.log('Ожидаем инициализации игрового цикла...');
                setTimeout(() => {
                    if (this.gameCycle) {
                        console.log('Запускаем игровой цикл с задержкой');
                        this.gameCycle.start();
                    } else {
                        console.error('Игровой цикл не инициализирован');
                    }
                }, 500);
            } else {
                console.log('Запускаем игровой цикл');
                this.gameCycle.start();
            }
        } catch (error) {
            console.error('Ошибка при запуске игрового цикла:', error);
            throw error;
        }
    }
    
    /**
     * Завершает гонку
     * @param {Object} results - Результаты гонки
     */
    endRace(results) {
        if (!this.raceStarted || this.raceFinished) {
            return;
        }
        
        this.raceFinished = true;
        console.log('Гонка завершена:', results);
        
        // Останавливаем игровой цикл
        this.gameCycle.stop();
        
        // Определяем, выиграл ли игрок
        const isWin = results.winner === this.selectedSnail;
        const winAmount = isWin ? this.betAmount * GAME_CONFIG.BETTING.WIN_MULTIPLIER : 0;
        
        // Показываем результаты
        UI.showRaceResults({
            isWin,
            betAmount: this.betAmount,
            winAmount
        }, this.resetGame);
    }
    
    /**
     * Сбрасывает состояние игры для новой гонки
     */
    async resetGame() {
        console.log('Сброс игры...');
        
        this.raceStarted = false;
        this.raceFinished = false;
        this.selectedSnail = null;
        
        // Сбрасываем UI
        UI.updateSelectedSnailInfo(null);
        UI.updateRaceTimer(0);
        
        // Генерируем новый лабиринт
        await this.initializeMaze();
        
        console.log('Игра успешно сброшена');
    }
} 