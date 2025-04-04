/**
 * Основной модуль игры
 */
class Game {
    constructor() {
        // Инициализация параметров игры
        this.balance = ASSETS.GAME.STARTING_BALANCE;
        this.bet = ASSETS.GAME.DEFAULT_BET;
        this.selectedSnailType = '';
        this.difficulty = ASSETS.GAME.DIFFICULTY;
        
        // Объекты игры
        this.maze = null;
        this.snailManager = null;
        
        // Состояние игры
        this.isLoading = true;
        this.isRaceActive = false;
        this.raceStartTime = 0;
        this.raceTimeout = null;
        
        // Инициализация элементов DOM
        this.initDomElements();
        
        // Инициализация обработчиков событий
        this.initEventListeners();
        
        // Запуск загрузки ресурсов
        this.loadResources();
    }
    
    /**
     * Инициализация элементов DOM
     */
    initDomElements() {
        // Контейнеры экранов
        this.loader = document.getElementById('loader');
        this.mainGame = document.getElementById('main-game');
        this.selectionScreen = document.getElementById('selection-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.resultsScreen = document.getElementById('results-screen');
        
        // Элементы экрана загрузки
        this.loadingProgress = document.getElementById('loading-progress');
        this.loadingText = document.getElementById('loading-text');
        
        // Элементы экрана выбора
        this.snailOptions = document.querySelectorAll('.snail-option');
        this.betAmount = document.getElementById('bet-amount');
        this.balanceAmount = document.getElementById('balance-amount');
        this.startRaceButton = document.getElementById('start-race');
        
        // Элементы игрового экрана
        this.mazeContainer = document.getElementById('maze-container');
        this.currentBetDisplay = document.getElementById('current-bet-display');
        this.raceStatusDisplay = document.getElementById('race-status-display');
        this.backToSelectionButton = document.getElementById('back-to-selection');
        
        // Элементы экрана результатов
        this.resultsMessage = document.getElementById('results-message');
        this.racePositions = document.getElementById('race-positions');
        this.newBalance = document.getElementById('new-balance');
        this.playAgainButton = document.getElementById('play-again');
        
        // Обновляем отображение баланса
        this.updateBalanceDisplay();
    }
    
    /**
     * Инициализация обработчиков событий
     */
    initEventListeners() {
        // Выбор улитки
        this.snailOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectSnail(option.dataset.snailType);
            });
        });
        
        // Изменение ставки
        this.betAmount.addEventListener('change', () => {
            this.setBet(parseInt(this.betAmount.value, 10));
        });
        
        // Кнопки управления
        this.startRaceButton.addEventListener('click', () => {
            this.startRace();
        });
        
        this.backToSelectionButton.addEventListener('click', () => {
            this.showSelectionScreen();
        });
        
        this.playAgainButton.addEventListener('click', () => {
            this.showSelectionScreen();
        });
        
        // События гонки
        document.addEventListener('raceFinished', (event) => {
            this.handleRaceFinished(event.detail);
        });
        
        // Обработчик для анимационного цикла
        window.requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Загрузка ресурсов игры
     */
    loadResources() {
        this.isLoading = true;
        
        // Показываем экран загрузки
        this.showLoader();
        
        // Запускаем загрузку ресурсов
        ASSETS.loadResources(
            // Обработчик прогресса
            (loaded, total) => {
                const percent = Math.floor((loaded / total) * 100);
                this.loadingProgress.style.width = `${percent}%`;
                this.loadingText.textContent = `Загрузка ресурсов: ${percent}% (${loaded}/${total})`;
            },
            // Обработчик завершения
            () => {
                console.log('Ресурсы загружены!');
                this.isLoading = false;
                this.loadingText.textContent = 'Загрузка ресурсов: 100% (16/16)';
                
                // Небольшая задержка перед показом экрана выбора
                setTimeout(() => {
                    this.showSelectionScreen();
                }, 500);
            }
        );
    }
    
    /**
     * Выбор улитки
     */
    selectSnail(type) {
        // Снимаем выделение со всех улиток
        this.snailOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Выделяем выбранную улитку
        const selectedOption = document.querySelector(`.snail-option[data-snail-type="${type}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            this.selectedSnailType = type;
        }
    }
    
    /**
     * Установка ставки
     */
    setBet(amount) {
        // Проверяем, что ставка в пределах допустимого
        const minBet = ASSETS.GAME.MIN_BET;
        const maxBet = Math.min(ASSETS.GAME.MAX_BET, this.balance);
        
        this.bet = Math.max(minBet, Math.min(maxBet, amount));
        this.betAmount.value = this.bet;
    }
    
    /**
     * Обновление отображения баланса
     */
    updateBalanceDisplay() {
        this.balanceAmount.textContent = this.balance;
        this.newBalance.textContent = this.balance;
    }
    
    /**
     * Показать экран загрузки
     */
    showLoader() {
        this.loader.classList.remove('hidden');
        this.mainGame.classList.add('hidden');
    }
    
    /**
     * Показать экран выбора улитки
     */
    showSelectionScreen() {
        this.loader.classList.add('hidden');
        this.mainGame.classList.remove('hidden');
        this.selectionScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.resultsScreen.classList.add('hidden');
        
        // Сбрасываем гонку, если она была активна
        if (this.isRaceActive) {
            this.endRace();
        }
        
        // Обновляем максимально возможную ставку
        this.betAmount.max = Math.min(ASSETS.GAME.MAX_BET, this.balance);
        
        // Если ставка больше баланса, уменьшаем её
        if (this.bet > this.balance) {
            this.setBet(this.balance);
        }
        
        // Обновляем отображение баланса
        this.updateBalanceDisplay();
    }
    
    /**
     * Показать игровой экран
     */
    showGameScreen() {
        this.loader.classList.add('hidden');
        this.mainGame.classList.remove('hidden');
        this.selectionScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.resultsScreen.classList.add('hidden');
        
        // Обновляем отображение текущей ставки
        this.currentBetDisplay.textContent = this.bet;
        
        // Создаем лабиринт, если его нет
        if (!this.maze) {
            this.maze = new Maze(this.difficulty);
        }
    }
    
    /**
     * Показать экран результатов
     */
    showResultsScreen() {
        this.loader.classList.add('hidden');
        this.mainGame.classList.remove('hidden');
        this.selectionScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
        this.resultsScreen.classList.remove('hidden');
    }
    
    /**
     * Запуск гонки
     */
    startRace() {
        // Проверяем, выбрана ли улитка
        if (!this.selectedSnailType) {
            alert('Пожалуйста, выберите улитку для гонки!');
            return;
        }
        
        // Проверяем, достаточно ли средств
        if (this.balance < this.bet) {
            alert('Недостаточно средств для ставки!');
            return;
        }
        
        // Списываем ставку
        this.balance -= this.bet;
        this.updateBalanceDisplay();
        
        // Показываем игровой экран
        this.showGameScreen();
        
        // Создаем лабиринт
        this.maze = new Maze(this.difficulty);
        this.maze.render(this.mazeContainer);
        
        // Создаем менеджер улиток
        this.snailManager = new SnailManager(this.maze);
        this.snailManager.createSnails(this.mazeContainer, this.selectedSnailType);
        
        // Обновляем статус гонки
        this.raceStatusDisplay.textContent = 'Ready';
        
        // Небольшая задержка перед стартом
        setTimeout(() => {
            // Запускаем гонку
            this.isRaceActive = true;
            this.raceStartTime = Date.now();
            this.snailManager.startRace();
            
            // Обновляем статус
            this.raceStatusDisplay.textContent = 'Race in progress...';
            
            // Устанавливаем таймаут на максимальную длительность гонки
            this.raceTimeout = setTimeout(() => {
                this.forceEndRace();
            }, ASSETS.GAME.RACE_DURATION_MS);
        }, 1000);
    }
    
    /**
     * Принудительное завершение гонки по таймауту
     */
    forceEndRace() {
        if (this.isRaceActive && this.snailManager) {
            console.log('Принудительное завершение гонки по таймауту');
            this.snailManager.forceEndRace();
        }
    }
    
    /**
     * Завершение гонки
     */
    endRace() {
        this.isRaceActive = false;
        
        // Отменяем таймаут, если он был установлен
        if (this.raceTimeout) {
            clearTimeout(this.raceTimeout);
            this.raceTimeout = null;
        }
    }
    
    /**
     * Обработчик завершения гонки
     */
    handleRaceFinished(raceResult) {
        this.endRace();
        
        // Обновляем статус
        this.raceStatusDisplay.textContent = 'Race finished!';
        
        // Получаем результаты
        const finishedSnails = raceResult.finishedSnails;
        const playerSnail = raceResult.playerSnail;
        
        // Определяем выигрыш
        let winAmount = 0;
        
        if (playerSnail.position === 1) {
            // Первое место - возврат ставки + выигрыш
            winAmount = Math.floor(this.bet * ASSETS.GAME.WINNING_MULTIPLIER);
            this.resultsMessage.textContent = `Your snail won the race! You won ${winAmount} coins!`;
            this.resultsMessage.style.color = '#4CAF50'; // Зеленый цвет для победы
        } else if (playerSnail.position === 2) {
            // Второе место - возврат ставки с небольшим бонусом
            winAmount = Math.floor(this.bet * ASSETS.GAME.SECOND_PLACE_MULTIPLIER);
            this.resultsMessage.textContent = `Your snail came in second place! You won ${winAmount} coins!`;
            this.resultsMessage.style.color = '#2196F3'; // Синий цвет для второго места
        } else if (playerSnail.position > 0) {
            // Другие места - проигрыш
            this.resultsMessage.textContent = `Your snail finished in position ${playerSnail.position}. Better luck next time!`;
            this.resultsMessage.style.color = '#F44336'; // Красный цвет для проигрыша
        } else {
            // Не финишировал
            this.resultsMessage.textContent = 'Your snail did not finish the race!';
            this.resultsMessage.style.color = '#F44336'; // Красный цвет для проигрыша
        }
        
        // Обновляем баланс
        this.balance += winAmount;
        this.updateBalanceDisplay();
        
        // Отображаем все позиции
        this.displayRacePositions(finishedSnails);
        
        // Показываем экран результатов
        setTimeout(() => {
            this.showResultsScreen();
        }, 2000);
    }
    
    /**
     * Отображение позиций улиток в гонке
     */
    displayRacePositions(finishedSnails) {
        this.racePositions.innerHTML = '';
        
        // Сортируем улиток по позициям
        const sortedSnails = [...finishedSnails].sort((a, b) => a.position - b.position);
        
        // Создаем список с позициями
        const list = document.createElement('ol');
        
        for (const snail of sortedSnails) {
            const item = document.createElement('li');
            
            // Выделяем улитку игрока
            if (snail === this.snailManager.playerSnail) {
                item.style.fontWeight = 'bold';
                item.style.color = snail.color;
            }
            
            item.textContent = `${snail.name} (${snail.type}) - ${(snail.finishTime / 1000).toFixed(2)}s`;
            list.appendChild(item);
        }
        
        this.racePositions.appendChild(list);
    }
    
    /**
     * Игровой цикл
     */
    gameLoop(timestamp) {
        // Вычисляем время, прошедшее с последнего кадра
        if (!this.lastTimestamp) {
            this.lastTimestamp = timestamp;
        }
        const deltaTime = timestamp - this.lastTimestamp;
        this.lastTimestamp = timestamp;
        
        // Обновляем состояние игры, если она активна
        if (this.isRaceActive) {
            // Обновляем состояние улиток
            if (this.snailManager) {
                this.snailManager.update(deltaTime);
            }
            
            // Проверяем время гонки
            if (this.raceStartTime > 0) {
                const elapsed = Date.now() - this.raceStartTime;
                if (elapsed >= ASSETS.GAME.RACE_DURATION_MS) {
                    this.endRace();
                }
            }
            
            // Обновляем статус гонки
            this.updateRaceStatus();
        }
        
        // Запрашиваем следующий кадр
        window.requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Обновление состояния игры
     */
    update(deltaTime) {
        // Не обновляем, если игра загружается
        if (this.isLoading) return;
        
        // Обновляем состояние гонки
        if (this.isRaceActive && this.snailManager) {
            this.snailManager.update(deltaTime);
            
            // Обновляем время гонки
            const raceTime = Date.now() - this.raceStartTime;
            const raceSeconds = (raceTime / 1000).toFixed(1);
            this.raceStatusDisplay.textContent = `Race time: ${raceSeconds}s`;
        }
    }
    
    /**
     * Обновление статуса гонки
     */
    updateRaceStatus() {
        // Реализация обновления статуса гонки
    }
} 