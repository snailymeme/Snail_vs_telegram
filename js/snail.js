/**
 * Модуль управления улитками в игре
 */

/**
 * Класс улитки
 */
class Snail {
    constructor(type, row, col, maze) {
        this.type = type;
        this.row = row;
        this.col = col;
        this.maze = maze;
        
        // Загружаем настройки из ASSETS
        const snailConfig = ASSETS.SNAIL_TYPES[type.toUpperCase()];
        this.name = snailConfig.NAME;
        this.baseSpeed = snailConfig.BASE_SPEED;
        this.speedVariation = snailConfig.SPEED_VARIATION;
        this.color = snailConfig.COLOR;
        
        // Общие настройки для всех улиток
        this.cellSize = ASSETS.CELL_SIZE;
        this.isMoving = false;
        this.hasFinished = false;
        this.position = 0; // Позиция в гонке (0 - не финишировала)
        
        // Вариация скорости для данной улитки
        this.speed = this.baseSpeed + (Math.random() * this.speedVariation * 2 - this.speedVariation);
        this.currentDirection = 'right'; // направление по умолчанию
        
        // Текущий путь улитки
        this.path = [];
        this.currentPathIndex = 0;
        
        // Параметры для отслеживания времени
        this.lastMoveTime = 0;
        this.finishTime = 0;
        
        // Применяем специальные параметры для типа улитки
        this.initTypeSpecificParameters();
        
        // Создаем элемент улитки
        this.element = null;
    }
    
    /**
     * Инициализация параметров в зависимости от типа улитки
     */
    initTypeSpecificParameters() {
        // Базовые параметры для всех типов
        this.wrongPathProbability = 0.3;
        this.disoriented = false;
        this.disorientedTime = 0;
        this.stuck = false;
        this.turboBoost = false;
        this.turboBoostTimer = 0;
        
        // Специфичные параметры по типу
        switch (this.type) {
            case 'racer':
                this.boostProbability = ASSETS.SNAIL_TYPES.RACER.BOOST_PROBABILITY || 0.2;
                this.boostMultiplier = ASSETS.SNAIL_TYPES.RACER.BOOST_MULTIPLIER || 1.3;
                this.wrongPathProbability = 0.2; // Меньше шансов сбиться с пути
                break;
                
            case 'explorer':
                this.explorationRate = ASSETS.SNAIL_TYPES.EXPLORER.EXPLORATION_RATE || 0.65;
                this.wrongPathProbability = 0.4; // Больше исследует
                break;
                
            case 'snake':
                this.zigzagProbability = ASSETS.SNAIL_TYPES.SNAKE.ZIGZAG_PROBABILITY || 0.7;
                this.escapeDeadEndSpeed = 1.3; // Быстрее выходит из тупиков
                break;
                
            case 'stubborn':
                this.forwardProbability = ASSETS.SNAIL_TYPES.STUBBORN.FORWARD_PROBABILITY || 0.85;
                this.accelerationBoost = 1.1; // Небольшое ускорение при движении вперед
                break;
                
            case 'deadender':
                this.randomTurnProbability = ASSETS.SNAIL_TYPES.DEADENDER.RANDOM_TURN_PROBABILITY || 0.6;
                this.pauseInDeadEndTime = 1000; // Время размышления в тупике (мс)
                break;
        }
    }
    
    /**
     * Создание визуального представления улитки
     */
    render(container) {
        if (this.element) {
            this.element.remove();
        }
        
        // Создаем элемент улитки
        this.element = document.createElement('div');
        this.element.className = `snail snail-${this.type}`;
        
        // Устанавливаем размер элемента
        const elementSize = this.cellSize * 0.8;
        this.element.style.width = `${elementSize}px`;
        this.element.style.height = `${elementSize}px`;
        
        // Создаем изображение улитки
        const snailImage = document.createElement('img');
        snailImage.src = ASSETS.IMAGES.SNAILS[this.type.toUpperCase()];
        snailImage.alt = this.name;
        snailImage.style.width = '100%';
        snailImage.style.height = '100%';
        
        // Добавляем изображение в элемент
        this.element.appendChild(snailImage);
        
        // Устанавливаем позицию
        this.updateElementPosition();
        
        // Добавляем элемент в контейнер
        container.appendChild(this.element);
    }
    
    /**
     * Обновление позиции элемента улитки
     */
    updateElementPosition() {
        if (!this.element) return;
        
        const x = this.col * this.cellSize;
        const y = this.row * this.cellSize;
        
        // Центрирование улитки в ячейке
        const offset = (this.cellSize - parseFloat(this.element.style.width)) / 2;
        
        this.element.style.left = `${x + offset}px`;
        this.element.style.top = `${y + offset}px`;
        
        // Обновляем поворот в зависимости от направления
        let rotation = 0;
        switch (this.currentDirection) {
            case 'up': rotation = -90; break;
            case 'right': rotation = 0; break;
            case 'down': rotation = 90; break;
            case 'left': rotation = 180; break;
        }
        
        this.element.style.transform = `rotate(${rotation}deg)`;
    }
    
    /**
     * Генерация пути для улитки
     */
    generatePath() {
        // Если улитка финишировала, не меняем путь
        if (this.hasFinished) return;
        
        // Генерируем путь с учетом типа улитки
        switch (this.type) {
            case 'racer':
                this.generateRacerPath();
                break;
            case 'explorer':
                this.generateExplorerPath();
                break;
            case 'snake':
                this.generateSnakePath();
                break;
            case 'stubborn':
                this.generateStubbornPath();
                break;
            case 'deadender':
                this.generateDeadenderPath();
                break;
            default:
                // Базовый алгоритм для всех улиток - поиск пути к финишу
                this.generateBasePath();
        }
        
        // Сбрасываем индекс пути
        this.currentPathIndex = 0;
    }
    
    /**
     * Базовый алгоритм генерации пути (к финишу)
     */
    generateBasePath() {
        // Пытаемся найти путь к финишу
        const path = this.maze.findPath(
            this.row, 
            this.col, 
            this.maze.finish.row, 
            this.maze.finish.col
        );
        
        // Если путь найден, используем его
        if (path && path.length > 0) {
            this.path = path;
            return;
        }
        
        // Если путь не найден, используем случайные шаги
        this.generateRandomPath(3);
    }
    
    /**
     * Генерация случайного пути
     */
    generateRandomPath(steps) {
        const path = [{ row: this.row, col: this.col }];
        let currentRow = this.row;
        let currentCol = this.col;
        
        for (let i = 0; i < steps; i++) {
            const neighbors = this.getValidNeighbors(currentRow, currentCol);
            if (neighbors.length === 0) break;
            
            // Выбираем случайного соседа
            const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            path.push(randomNeighbor);
            
            currentRow = randomNeighbor.row;
            currentCol = randomNeighbor.col;
            
            // Если достигли финиша, останавливаемся
            if (currentRow === this.maze.finish.row && currentCol === this.maze.finish.col) {
                break;
            }
        }
        
        this.path = path;
    }
    
    /**
     * Получение списка проходимых соседних ячеек
     */
    getValidNeighbors(row, col) {
        const neighbors = [];
        const directions = [
            [-1, 0], // Вверх
            [1, 0],  // Вниз
            [0, -1], // Влево
            [0, 1]   // Вправо
        ];
        
        for (let [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.maze.isWalkable(newRow, newCol)) {
                neighbors.push({ row: newRow, col: newCol });
            }
        }
        
        return neighbors;
    }
    
    /**
     * Специфическая генерация пути для улитки типа 'racer'
     */
    generateRacerPath() {
        // Racer старается идти к финишу, но может получить ускорение
        if (Math.random() < this.boostProbability && !this.turboBoost) {
            this.activateTurboBoost();
        }
        
        this.generateBasePath();
    }
    
    /**
     * Специфическая генерация пути для улитки типа 'explorer'
     */
    generateExplorerPath() {
        // Explorer с определенной вероятностью исследует лабиринт
        if (Math.random() < this.explorationRate) {
            this.generateRandomPath(5);
        } else {
            this.generateBasePath();
        }
    }
    
    /**
     * Специфическая генерация пути для улитки типа 'snake'
     */
    generateSnakePath() {
        // Snake движется зигзагами
        if (Math.random() < this.zigzagProbability) {
            const basePath = this.maze.findPath(
                this.row, 
                this.col, 
                this.maze.finish.row, 
                this.maze.finish.col
            );
            
            if (basePath && basePath.length > 2) {
                // Модифицируем путь для создания зигзагов
                const zigzagPath = [basePath[0]];
                
                for (let i = 1; i < basePath.length - 1; i++) {
                    const neighbors = this.getValidNeighbors(basePath[i].row, basePath[i].col);
                    
                    // Добавляем случайного соседа, если возможно
                    if (neighbors.length > 1 && Math.random() < 0.5) {
                        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
                        zigzagPath.push(randomNeighbor);
                    }
                    
                    zigzagPath.push(basePath[i]);
                }
                
                zigzagPath.push(basePath[basePath.length - 1]);
                this.path = zigzagPath;
                return;
            }
        }
        
        // Если не удалось создать зигзаг, используем базовый путь
        this.generateBasePath();
    }
    
    /**
     * Специфическая генерация пути для улитки типа 'stubborn'
     */
    generateStubbornPath() {
        // Stubborn предпочитает двигаться в текущем направлении
        if (this.path.length > 1 && Math.random() < this.forwardProbability) {
            const lastDirection = this.getDirection(
                this.path[this.path.length - 2],
                this.path[this.path.length - 1]
            );
            
            // Пытаемся продолжить движение в том же направлении
            const neighbors = this.getValidNeighbors(this.row, this.col);
            const forwardNeighbors = neighbors.filter(n => this.getDirection({ row: this.row, col: this.col }, n) === lastDirection);
            
            if (forwardNeighbors.length > 0) {
                const path = [{ row: this.row, col: this.col }, forwardNeighbors[0]];
                
                // Проверяем, не тупик ли это
                const nextNeighbors = this.getValidNeighbors(forwardNeighbors[0].row, forwardNeighbors[0].col);
                if (nextNeighbors.length > 1) {
                    this.path = path;
                    return;
                }
            }
        }
        
        // Если не удалось продолжить в том же направлении, используем базовый путь
        this.generateBasePath();
    }
    
    /**
     * Специфическая генерация пути для улитки типа 'deadender'
     */
    generateDeadenderPath() {
        // Deadender любит заходить в тупики
        if (Math.random() < this.randomTurnProbability) {
            // Ищем ближайший тупик
            const neighbors = this.getValidNeighbors(this.row, this.col);
            
            // Сначала проверяем, есть ли соседи, которые ведут в тупик
            for (const neighbor of neighbors) {
                const nextNeighbors = this.getValidNeighbors(neighbor.row, neighbor.col);
                // Если у соседа только один выход (назад к нам), это тупик
                if (nextNeighbors.length === 1) {
                    this.path = [{ row: this.row, col: this.col }, neighbor];
                    
                    // С небольшой вероятностью застреваем в тупике
                    if (Math.random() < 0.3) {
                        this.stuck = true;
                        setTimeout(() => {
                            this.stuck = false;
                        }, this.pauseInDeadEndTime);
                    }
                    
                    return;
                }
            }
        }
        
        // Если не нашли тупик или не выбрали его, используем базовый путь
        this.generateBasePath();
    }
    
    /**
     * Получение направления от одной точки к другой
     */
    getDirection(from, to) {
        if (from.row > to.row) return 'up';
        if (from.row < to.row) return 'down';
        if (from.col > to.col) return 'left';
        if (from.col < to.col) return 'right';
        return 'unknown';
    }
    
    /**
     * Активация режима ускорения
     */
    activateTurboBoost() {
        this.turboBoost = true;
        this.turboBoostTimer = 3000; // Длительность ускорения в мс
        console.log(`${this.name} активировал ускорение!`);
    }
    
    /**
     * Запуск движения улитки
     */
    start() {
        this.isMoving = true;
        this.hasFinished = false;
        this.generatePath();
        this.lastMoveTime = Date.now();
    }
    
    /**
     * Остановка движения улитки
     */
    stop() {
        this.isMoving = false;
    }
    
    /**
     * Завершение гонки для улитки
     */
    finish(position) {
        this.hasFinished = true;
        this.isMoving = false;
        this.position = position;
        this.finishTime = Date.now() - this.lastMoveTime;
        console.log(`${this.name} финишировал на позиции ${position}! Время: ${this.finishTime}мс`);
    }
    
    /**
     * Сброс улитки в начальное положение
     */
    reset() {
        this.row = this.maze.start.row;
        this.col = this.maze.start.col;
        this.path = [];
        this.currentPathIndex = 0;
        this.isMoving = false;
        this.hasFinished = false;
        this.position = 0;
        this.lastMoveTime = 0;
        this.finishTime = 0;
        this.turboBoost = false;
        this.turboBoostTimer = 0;
        this.disoriented = false;
        this.disorientedTime = 0;
        this.stuck = false;
        
        // Обновляем позицию элемента
        this.updateElementPosition();
    }
    
    /**
     * Обновление состояния улитки
     */
    update(deltaTime) {
        // Если улитка не движется или финишировала, ничего не делаем
        if (!this.isMoving || this.hasFinished) return;
        
        // Если улитка застряла, ничего не делаем
        if (this.stuck) return;
        
        // Обновляем таймеры
        if (this.turboBoost) {
            this.turboBoostTimer -= deltaTime;
            if (this.turboBoostTimer <= 0) {
                this.turboBoost = false;
                console.log(`${this.name} теряет ускорение`);
            }
        }
        
        if (this.disoriented) {
            this.disorientedTime -= deltaTime;
            if (this.disorientedTime <= 0) {
                this.disoriented = false;
                console.log(`${this.name} больше не дезориентирован`);
            }
        }
        
        // Вычисляем скорость с учетом бонусов и дебаффов
        let currentSpeed = this.speed;
        
        if (this.turboBoost) {
            currentSpeed *= this.boostMultiplier || 1.3;
        }
        
        if (this.disoriented) {
            currentSpeed *= 0.5; // Замедление при дезориентации
        }
        
        // Проверяем, достаточно ли времени прошло для следующего шага
        const moveInterval = 1000 / currentSpeed; // миллисекунды на шаг
        const now = Date.now();
        
        if (now - this.lastMoveTime >= moveInterval) {
            this.move();
            this.lastMoveTime = now;
        }
    }
    
    /**
     * Выполнение одного шага движения
     */
    move() {
        // Если путь закончился или не установлен, генерируем новый
        if (!this.path || this.currentPathIndex >= this.path.length - 1) {
            this.generatePath();
            return;
        }
        
        // Получаем следующую точку пути
        const nextPoint = this.path[this.currentPathIndex + 1];
        
        // Определяем направление движения
        this.currentDirection = this.getDirection(
            { row: this.row, col: this.col },
            nextPoint
        );
        
        // Обновляем позицию
        this.row = nextPoint.row;
        this.col = nextPoint.col;
        
        // Обновляем визуальное представление
        this.updateElementPosition();
        
        // Увеличиваем индекс пути
        this.currentPathIndex++;
        
        // Проверяем, достигли ли финиша
        this.checkFinish();
        
        // Проверяем специальные ячейки
        this.checkSpecialCells();
    }
    
    /**
     * Проверка, достиг ли улитка финиша
     */
    checkFinish() {
        if (this.row === this.maze.finish.row && this.col === this.maze.finish.col) {
            // Улитка достигла финиша, сообщаем об этом
            const event = new CustomEvent('snailFinished', { detail: this });
            document.dispatchEvent(event);
        }
    }
    
    /**
     * Проверка специальных ячеек (ловушки, ускорители)
     */
    checkSpecialCells() {
        const cellType = this.maze.getCellType(this.row, this.col);
        
        switch (cellType) {
            case ASSETS.CELL_TYPES.TRAP:
                // Улитка попала в ловушку
                this.disoriented = true;
                this.disorientedTime = 3000; // 3 секунды дезориентации
                console.log(`${this.name} попал в ловушку!`);
                break;
                
            case ASSETS.CELL_TYPES.BOOST:
                // Улитка получила ускорение
                this.activateTurboBoost();
                break;
        }
    }
}

/**
 * Класс для управления всеми улитками
 */
class SnailManager {
    constructor(maze) {
        this.maze = maze;
        this.snails = [];
        this.finishedSnails = [];
        this.playerSnail = null;
        this.isRaceActive = false;
    }
    
    /**
     * Создание улиток для гонки
     */
    createSnails(container, playerSnailType) {
        this.snails = [];
        this.finishedSnails = [];
        
        // Получаем все типы улиток
        const snailTypes = Object.keys(ASSETS.SNAIL_TYPES).map(key => 
            ASSETS.SNAIL_TYPES[key].TYPE.toLowerCase()
        );
        
        // Создаем улитку игрока
        this.playerSnail = new Snail(
            playerSnailType,
            this.maze.start.row,
            this.maze.start.col,
            this.maze
        );
        this.playerSnail.render(container);
        this.snails.push(this.playerSnail);
        
        // Создаем компьютерных соперников
        const remainingTypes = snailTypes.filter(type => type !== playerSnailType);
        const computerSnailsCount = Math.min(remainingTypes.length, ASSETS.GAME.SNAIL_COUNT - 1);
        
        for (let i = 0; i < computerSnailsCount; i++) {
            const snail = new Snail(
                remainingTypes[i],
                this.maze.start.row,
                this.maze.start.col,
                this.maze
            );
            snail.render(container);
            this.snails.push(snail);
        }
        
        return this;
    }
    
    /**
     * Старт гонки
     */
    startRace() {
        this.isRaceActive = true;
        this.finishedSnails = [];
        
        // Запускаем все улитки
        for (const snail of this.snails) {
            snail.reset(); // Сбрасываем улитку в начальное положение
            snail.start(); // Запускаем движение
        }
        
        // Устанавливаем обработчик для финиша улиток
        document.addEventListener('snailFinished', this.handleSnailFinish.bind(this));
        
        console.log('Гонка началась!');
    }
    
    /**
     * Обработчик события финиша улитки
     */
    handleSnailFinish(event) {
        const snail = event.detail;
        
        // Если улитка уже финишировала, игнорируем
        if (snail.hasFinished) return;
        
        // Определяем позицию финиша
        const position = this.finishedSnails.length + 1;
        
        // Финишируем улитку
        snail.finish(position);
        
        // Добавляем в список финишировавших
        this.finishedSnails.push(snail);
        
        // Проверяем, закончена ли гонка
        this.checkRaceFinished();
    }
    
    /**
     * Проверка завершения гонки
     */
    checkRaceFinished() {
        // Гонка считается завершенной, когда все улитки финишировали
        // или когда финишировала хотя бы одна улитка и прошло определенное время
        if (this.finishedSnails.length === this.snails.length) {
            this.endRace();
        }
    }
    
    /**
     * Завершение гонки
     */
    endRace() {
        this.isRaceActive = false;
        
        // Останавливаем все улитки
        for (const snail of this.snails) {
            snail.stop();
        }
        
        // Удаляем обработчик финиша
        document.removeEventListener('snailFinished', this.handleSnailFinish);
        
        // Объявляем о завершении гонки
        const event = new CustomEvent('raceFinished', { 
            detail: { 
                finishedSnails: this.finishedSnails,
                allSnails: this.snails,
                playerSnail: this.playerSnail
            } 
        });
        document.dispatchEvent(event);
        
        console.log('Гонка завершена!');
    }
    
    /**
     * Принудительное завершение гонки (по таймауту)
     */
    forceEndRace() {
        // Определяем улиток, которые еще не финишировали
        const unfinishedSnails = this.snails.filter(snail => !snail.hasFinished);
        
        // Принудительно финишируем их
        for (const snail of unfinishedSnails) {
            const position = this.finishedSnails.length + 1;
            snail.finish(position);
            this.finishedSnails.push(snail);
        }
        
        this.endRace();
    }
    
    /**
     * Обновление всех улиток
     */
    update(deltaTime) {
        if (!this.isRaceActive) return;
        
        for (const snail of this.snails) {
            snail.update(deltaTime);
        }
    }
} 