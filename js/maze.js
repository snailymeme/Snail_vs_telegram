/**
 * Модуль генерации и управления лабиринтом
 */

/**
 * Класс для генерации лабиринта
 */
class MazeGenerator {
    constructor(rows, cols, difficulty = 'medium') {
        this.difficulty = difficulty;
        
        // Получаем настройки из ASSETS в зависимости от сложности
        const mazeConfig = ASSETS.MAZE[difficulty.toUpperCase()] || ASSETS.MAZE.MEDIUM;
        this.rows = mazeConfig.ROWS || rows;
        this.cols = mazeConfig.COLS || cols;
        this.randomPathsCount = mazeConfig.RANDOM_PATHS || 4;
        this.trapsCount = mazeConfig.TRAPS || 4;
        this.boostsCount = mazeConfig.BOOSTS || 3;
        
        this.cellTypes = ASSETS.CELL_TYPES;
    }
    
    /**
     * Генерация лабиринта с использованием алгоритма "Recursive Backtracking"
     */
    generate() {
        // Инициализируем массив лабиринта стенами
        let maze = new Array(this.rows).fill().map(() => new Array(this.cols).fill(this.cellTypes.WALL));
        
        // Функция для проверки, находится ли ячейка внутри лабиринта
        const isInBounds = (row, col) => {
            return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
        };
        
        // Начинаем с случайной точки (нечетные координаты для клеток пути)
        let startRow = Math.floor(Math.random() * (this.rows - 2) / 2) * 2 + 1;
        let startCol = Math.floor(Math.random() * (this.cols - 2) / 2) * 2 + 1;
        
        // Убеждаемся, что координаты в пределах допустимого
        startRow = Math.max(1, Math.min(startRow, this.rows - 2));
        startCol = Math.max(1, Math.min(startCol, this.cols - 2));
        
        maze[startRow][startCol] = this.cellTypes.PATH;
        
        // Определение возможных направлений движения
        const directions = [
            [-2, 0], // Вверх
            [2, 0],  // Вниз
            [0, -2], // Влево
            [0, 2]   // Вправо
        ];
        
        // Рекурсивное построение путей
        const carve = (row, col) => {
            // Перемешиваем направления для случайного построения
            let shuffledDirections = [...directions];
            for (let i = shuffledDirections.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledDirections[i], shuffledDirections[j]] = [shuffledDirections[j], shuffledDirections[i]];
            }
            
            // Проходим по всем направлениям
            for (let [dRow, dCol] of shuffledDirections) {
                let newRow = row + dRow;
                let newCol = col + dCol;
                
                // Проверяем, что новая позиция внутри лабиринта и еще не посещена
                if (isInBounds(newRow, newCol) && maze[newRow][newCol] === this.cellTypes.WALL) {
                    // Прорубаем проход
                    maze[row + dRow / 2][col + dCol / 2] = this.cellTypes.PATH;
                    maze[newRow][newCol] = this.cellTypes.PATH;
                    
                    // Рекурсивно продолжаем с новой позиции
                    carve(newRow, newCol);
                }
            }
        };
        
        // Начинаем построение лабиринта
        carve(startRow, startCol);
        
        // Устанавливаем стартовую точку
        const startPoint = { row: startRow, col: startCol };
        maze[startRow][startCol] = this.cellTypes.START;
        
        // Ищем дальнюю точку для финиша
        let finishPoint = this.findDistantPoint(maze, startRow, startCol);
        maze[finishPoint.row][finishPoint.col] = this.cellTypes.FINISH;
        
        // Добавляем случайные пути для более интересного лабиринта
        this.addRandomPaths(maze, this.randomPathsCount);
        
        // Добавляем ловушки и ускорители
        this.addSpecialCells(maze, this.cellTypes.TRAP, this.trapsCount);
        this.addSpecialCells(maze, this.cellTypes.BOOST, this.boostsCount);
        
        return {
            grid: maze,
            start: startPoint,
            finish: finishPoint
        };
    }
    
    /**
     * Поиск наиболее удаленной точки от старта для размещения финиша
     */
    findDistantPoint(maze, startRow, startCol) {
        // Используем алгоритм поиска в ширину (BFS) для нахождения самой дальней точки
        const queue = [{ row: startRow, col: startCol, distance: 0 }];
        const visited = new Set([`${startRow},${startCol}`]);
        
        let farthestPoint = { row: startRow, col: startCol, distance: 0 };
        
        // Направления для BFS
        const directions = [
            [-1, 0], // Вверх
            [1, 0],  // Вниз
            [0, -1], // Влево
            [0, 1]   // Вправо
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // Если нашли точку дальше предыдущей, обновляем farthestPoint
            if (current.distance > farthestPoint.distance) {
                farthestPoint = current;
            }
            
            // Проверяем все направления
            for (let [dRow, dCol] of directions) {
                const newRow = current.row + dRow;
                const newCol = current.col + dCol;
                const key = `${newRow},${newCol}`;
                
                // Проверяем, что новая позиция внутри лабиринта, проходима и еще не посещена
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols && 
                    maze[newRow][newCol] === this.cellTypes.PATH && 
                    !visited.has(key)) {
                    
                    visited.add(key);
                    queue.push({ row: newRow, col: newCol, distance: current.distance + 1 });
                }
            }
        }
        
        return { row: farthestPoint.row, col: farthestPoint.col };
    }
    
    /**
     * Функция для создания случайных дополнительных путей
     */
    addRandomPaths(maze, count) {
        for (let i = 0; i < count; i++) {
            // Выбираем случайную стену, не граничащую с внешней границей
            let row, col;
            let attempts = 0;
            let validWallFound = false;
            
            while (!validWallFound && attempts < 100) {
                row = Math.floor(Math.random() * (this.rows - 2)) + 1;
                col = Math.floor(Math.random() * (this.cols - 2)) + 1;
                
                // Проверяем, что это стена
                if (maze[row][col] === this.cellTypes.WALL) {
                    // Проверяем, что по сторонам есть проходы
                    const adjacentPaths = [
                        [row - 1, col],
                        [row + 1, col],
                        [row, col - 1],
                        [row, col + 1]
                    ].filter(([r, c]) => 
                        r >= 0 && r < this.rows && 
                        c >= 0 && c < this.cols && 
                        maze[r][c] === this.cellTypes.PATH
                    );
                    
                    if (adjacentPaths.length >= 2) {
                        validWallFound = true;
                        // Превращаем стену в проход
                        maze[row][col] = this.cellTypes.PATH;
                    }
                }
                
                attempts++;
            }
        }
        
        return maze;
    }
    
    /**
     * Добавляет специальные ячейки (ловушки, ускорители и т.д.)
     */
    addSpecialCells(maze, cellType, count) {
        let added = 0;
        let attempts = 0;
        
        while (added < count && attempts < 100) {
            // Выбираем случайную позицию внутри лабиринта
            const row = Math.floor(Math.random() * (this.rows - 2)) + 1;
            const col = Math.floor(Math.random() * (this.cols - 2)) + 1;
            
            // Проверяем, что ячейка является проходом (не стеной, не стартом и не финишем)
            if (maze[row][col] === this.cellTypes.PATH) {
                maze[row][col] = cellType;
                added++;
            }
            
            attempts++;
        }
    }
    
    /**
     * Поиск пути от точки к точке
     */
    findPath(maze, startRow, startCol, finishRow, finishCol) {
        // Используем A* алгоритм для нахождения пути
        const openSet = [{ 
            row: startRow, 
            col: startCol, 
            g: 0, 
            h: this.heuristic(startRow, startCol, finishRow, finishCol), 
            f: this.heuristic(startRow, startCol, finishRow, finishCol), 
            parent: null 
        }];
        
        const closedSet = new Set();
        
        // Функция для получения соседей ячейки
        const getNeighbors = (row, col) => {
            const neighbors = [];
            const directions = [
                [-1, 0, 'up'],    // Вверх
                [1, 0, 'down'],   // Вниз
                [0, -1, 'left'],  // Влево
                [0, 1, 'right']   // Вправо
            ];
            
            for (let [dRow, dCol, direction] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (newRow >= 0 && newRow < this.rows && 
                    newCol >= 0 && newCol < this.cols && 
                    maze[newRow][newCol] !== this.cellTypes.WALL) {
                    
                    neighbors.push({ row: newRow, col: newCol, direction });
                }
            }
            
            return neighbors;
        };
        
        while (openSet.length > 0) {
            // Находим узел с наименьшим f
            let lowestIndex = 0;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].f < openSet[lowestIndex].f) {
                    lowestIndex = i;
                }
            }
            
            const current = openSet[lowestIndex];
            
            // Проверяем, достигли ли мы цели
            if (current.row === finishRow && current.col === finishCol) {
                // Восстанавливаем путь
                const path = [];
                let temp = current;
                while (temp.parent) {
                    path.push({
                        row: temp.row,
                        col: temp.col
                    });
                    temp = temp.parent;
                }
                path.push({
                    row: startRow,
                    col: startCol
                });
                return path.reverse();
            }
            
            // Удаляем текущий узел из openSet и добавляем в closedSet
            openSet.splice(lowestIndex, 1);
            closedSet.add(`${current.row},${current.col}`);
            
            // Получаем соседей
            const neighbors = getNeighbors(current.row, current.col);
            
            for (let neighbor of neighbors) {
                const key = `${neighbor.row},${neighbor.col}`;
                
                // Пропускаем уже проверенные узлы
                if (closedSet.has(key)) continue;
                
                // Вычисляем g-score для соседа
                const tentativeG = current.g + 1;
                
                // Проверяем, есть ли сосед в openSet
                let neighborInOpenSet = false;
                for (let i = 0; i < openSet.length; i++) {
                    if (openSet[i].row === neighbor.row && openSet[i].col === neighbor.col) {
                        neighborInOpenSet = true;
                        // Если найден лучший путь, обновляем
                        if (tentativeG < openSet[i].g) {
                            openSet[i].g = tentativeG;
                            openSet[i].f = tentativeG + openSet[i].h;
                            openSet[i].parent = current;
                        }
                        break;
                    }
                }
                
                // Если соседа нет в openSet, добавляем его
                if (!neighborInOpenSet) {
                    const h = this.heuristic(neighbor.row, neighbor.col, finishRow, finishCol);
                    openSet.push({
                        row: neighbor.row,
                        col: neighbor.col,
                        g: tentativeG,
                        h: h,
                        f: tentativeG + h,
                        parent: current
                    });
                }
            }
        }
        
        // Путь не найден
        return null;
    }
    
    /**
     * Эвристическая функция для A* (манхэттенское расстояние)
     */
    heuristic(row1, col1, row2, col2) {
        return Math.abs(row1 - row2) + Math.abs(col1 - col2);
    }
}

/**
 * Класс для управления лабиринтом в игре
 */
class Maze {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
        
        // Получаем настройки из ASSETS
        const mazeConfig = ASSETS.MAZE[difficulty.toUpperCase()] || ASSETS.MAZE.MEDIUM;
        this.rows = mazeConfig.ROWS;
        this.cols = mazeConfig.COLS;
        this.cellSize = ASSETS.CELL_SIZE;
        
        // Генерируем лабиринт
        this.generate();
    }
    
    /**
     * Генерация лабиринта
     */
    generate() {
        const generator = new MazeGenerator(this.rows, this.cols, this.difficulty);
        const result = generator.generate();
        
        this.grid = result.grid;
        this.start = result.start;
        this.finish = result.finish;
        
        // Проверка, что путь от старта до финиша существует
        this.ensurePathExists();
        
        return this;
    }
    
    /**
     * Проверка и обеспечение существования пути от старта до финиша
     */
    ensurePathExists() {
        const generator = new MazeGenerator(this.rows, this.cols);
        const path = generator.findPath(
            this.grid, 
            this.start.row, 
            this.start.col, 
            this.finish.row, 
            this.finish.col
        );
        
        // Если путь не найден, генерируем новый лабиринт
        if (!path) {
            console.log('Путь от старта до финиша не найден. Генерируем новый лабиринт...');
            this.generate();
            return;
        }
        
        this.shortestPath = path;
    }
    
    /**
     * Получение типа ячейки по координатам
     */
    getCellType(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return ASSETS.CELL_TYPES.WALL;
        }
        return this.grid[row][col];
    }
    
    /**
     * Проверка, является ли ячейка проходимой
     */
    isWalkable(row, col) {
        const cellType = this.getCellType(row, col);
        return cellType !== ASSETS.CELL_TYPES.WALL;
    }
    
    /**
     * Функция для получения соседних проходимых ячеек
     */
    getNeighbors(row, col) {
        const neighbors = [];
        const directions = [
            [-1, 0, 'up'],    // Вверх
            [1, 0, 'down'],   // Вниз
            [0, -1, 'left'],  // Влево
            [0, 1, 'right']   // Вправо
        ];
        
        for (let [dRow, dCol, direction] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.isWalkable(newRow, newCol)) {
                neighbors.push({ row: newRow, col: newCol, direction });
            }
        }
        
        return neighbors;
    }
    
    /**
     * Отрисовка лабиринта на заданном контейнере
     */
    render(container) {
        // Очищаем контейнер
        container.innerHTML = '';
        container.style.position = 'relative';
        
        // Устанавливаем размеры контейнера
        container.style.width = `${this.cols * this.cellSize}px`;
        container.style.height = `${this.rows * this.cellSize}px`;
        
        // Отрисовываем каждую ячейку
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const cellType = this.grid[row][col];
                const cell = document.createElement('div');
                cell.className = `cell cell-${this.getCellClassName(cellType)}`;
                cell.style.width = `${this.cellSize}px`;
                cell.style.height = `${this.cellSize}px`;
                cell.style.left = `${col * this.cellSize}px`;
                cell.style.top = `${row * this.cellSize}px`;
                
                container.appendChild(cell);
            }
        }
    }
    
    /**
     * Получение имени класса CSS для ячейки по ее типу
     */
    getCellClassName(cellType) {
        switch (cellType) {
            case ASSETS.CELL_TYPES.WALL: return 'wall';
            case ASSETS.CELL_TYPES.PATH: return 'path';
            case ASSETS.CELL_TYPES.START: return 'start';
            case ASSETS.CELL_TYPES.FINISH: return 'finish';
            case ASSETS.CELL_TYPES.TRAP: return 'trap';
            case ASSETS.CELL_TYPES.BOOST: return 'boost';
            case ASSETS.CELL_TYPES.PORTAL: return 'portal';
            default: return 'unknown';
        }
    }
    
    /**
     * Поиск пути от точки к точке
     */
    findPath(startRow, startCol, finishRow, finishCol) {
        const generator = new MazeGenerator(this.rows, this.cols);
        return generator.findPath(this.grid, startRow, startCol, finishRow, finishCol);
    }
} 