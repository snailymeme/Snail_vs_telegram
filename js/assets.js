/**
 * Модуль управления ресурсами и константами игры
 */
const ASSETS = {
    // Настройки изображений
    IMAGES: {
        SNAILS: {
            RACER: 'images/red_snail.png',
            EXPLORER: 'images/blue_snail.png',
            SNAKE: 'images/green_snail.png',
            STUBBORN: 'images/purple_snail.png',
            DEADENDER: 'images/yellow_snail.png'
        },
        MAZE: {
            WALL: 'images/wall_texture.png',
            PATH: 'images/path_texture.png',
            START: 'images/start.png',
            FINISH: 'images/finish.png',
        }
    },
    
    // Типы ячеек лабиринта
    CELL_TYPES: {
        WALL: 1,
        PATH: 0,
        START: 2,
        FINISH: 3,
        TRAP: 4,
        BOOST: 5,
        PORTAL: 6
    },
    
    // Настройки лабиринта
    MAZE: {
        EASY: {
            ROWS: 15,
            COLS: 15,
            RANDOM_PATHS: 2,
            TRAPS: 2,
            BOOSTS: 2
        },
        MEDIUM: {
            ROWS: 20,
            COLS: 20, 
            RANDOM_PATHS: 4,
            TRAPS: 4,
            BOOSTS: 3
        },
        HARD: {
            ROWS: 25,
            COLS: 25,
            RANDOM_PATHS: 6,
            TRAPS: 6,
            BOOSTS: 4
        },
        EXTREME: {
            ROWS: 30,
            COLS: 30,
            RANDOM_PATHS: 8,
            TRAPS: 8,
            BOOSTS: 5
        }
    },
    
    // Характеристики улиток
    SNAIL_TYPES: {
        RACER: {
            TYPE: 'racer',
            NAME: 'Racer',
            DESCRIPTION: 'Быстрая и может получать случайное ускорение',
            BASE_SPEED: 55,
            SPEED_VARIATION: 10,
            BOOST_PROBABILITY: 0.2,
            BOOST_MULTIPLIER: 1.3,
            COLOR: '#ff0000'
        },
        EXPLORER: {
            TYPE: 'explorer',
            NAME: 'Explorer',
            DESCRIPTION: 'Исследует лабиринт и может найти короткие пути',
            BASE_SPEED: 45,
            SPEED_VARIATION: 5,
            EXPLORATION_RATE: 0.65,
            COLOR: '#0000ff'
        },
        SNAKE: {
            TYPE: 'snake',
            NAME: 'Snake',
            DESCRIPTION: 'Передвигается зигзагом и быстрее выходит из тупиков',
            BASE_SPEED: 50,
            SPEED_VARIATION: 7,
            ZIGZAG_PROBABILITY: 0.7,
            COLOR: '#00ff00'
        },
        STUBBORN: {
            TYPE: 'stubborn',
            NAME: 'Stubborn',
            DESCRIPTION: 'Упрямо движется в выбранном направлении',
            BASE_SPEED: 52,
            SPEED_VARIATION: 8,
            FORWARD_PROBABILITY: 0.85,
            COLOR: '#800080'
        },
        DEADENDER: {
            TYPE: 'deadender',
            NAME: 'Deadender',
            DESCRIPTION: 'Любит заходить в тупики и неожиданно менять направление',
            BASE_SPEED: 48,
            SPEED_VARIATION: 12,
            RANDOM_TURN_PROBABILITY: 0.6,
            COLOR: '#ffff00'
        }
    },
    
    // Настройки ячеек
    CELL_SIZE: 20,
    
    // Настройки игрового процесса
    GAME: {
        STARTING_BALANCE: 100,
        MIN_BET: 1,
        MAX_BET: 100,
        DEFAULT_BET: 10,
        WINNING_MULTIPLIER: 2.5,
        SECOND_PLACE_MULTIPLIER: 1.2,
        RACE_DURATION_MS: 30000,  // Максимальная длительность гонки
        SNAIL_COUNT: 5,           // Количество улиток в гонке
        DIFFICULTY: 'medium'      // Сложность по умолчанию
    },
    
    // Список всех ресурсов
    RESOURCES: [
        'images/red_snail.png',
        'images/blue_snail.png',
        'images/green_snail.png',
        'images/purple_snail.png',
        'images/yellow_snail.png',
        'images/wall_texture.png',
        'images/path_texture.png',
        'images/start.png',
        'images/finish.png'
    ],
    
    // Функция для загрузки ресурсов
    loadResources: function(onProgress, onComplete) {
        let loaded = 0;
        const total = this.RESOURCES.length;
        
        const resourceLoader = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    loaded++;
                    if (onProgress) {
                        onProgress(loaded, total);
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Ошибка загрузки: ${src}`);
                    loaded++;
                    if (onProgress) {
                        onProgress(loaded, total);
                    }
                    // Резолвим с ошибкой, но не прерываем весь процесс
                    resolve();
                };
                img.src = src;
            });
        };
        
        // Запускаем загрузку всех ресурсов параллельно
        const promises = this.RESOURCES.map(src => resourceLoader(src));
        
        // Когда все загружены, вызываем onComplete
        Promise.all(promises).then(() => {
            if (onComplete) {
                onComplete();
            }
        });
    }
}; 