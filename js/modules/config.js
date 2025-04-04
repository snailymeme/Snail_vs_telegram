/**
 * Модуль конфигурации для Snail to Riches
 * Содержит централизованные настройки и константы игры
 */

/**
 * Настройки игры
 */
export const GAME_CONFIG = {
    // Общие настройки игры
    DEBUG_MODE: false,
    
    // Настройки лабиринта
    MAZE: {
        DEFAULT_WIDTH: 20,
        DEFAULT_HEIGHT: 20,
        DEFAULT_COMPLEXITY: 0.5,
        DEFAULT_BRANCH_FACTOR: 0.5,
        CELL_SIZE: 32
    },
    
    // Настройки улиток
    SLUG: {
        DEFAULT_SIZE: 0.8,
        TYPES: {
            racer: {
                name: 'Racer',
                color: '#e53935',
                description: 'Fast, but unpredictable',
                baseSpeed: 0.15
            },
            explorer: {
                name: 'Explorer',
                color: '#43a047',
                description: 'Smartly avoids obstacles',
                baseSpeed: 0.08
            },
            snake: {
                name: 'Snake',
                color: '#1e88e5',
                description: 'Winding, flexible path',
                baseSpeed: 0.12
            },
            stubborn: {
                name: 'Stubborn',
                color: '#8e24aa',
                description: 'Unpredictable stops and bursts',
                baseSpeed: 0.1
            },
            default: {
                name: 'Default',
                color: '#fdd835',
                description: 'Balanced behavior',
                baseSpeed: 0.05
            }
        }
    },
    
    // Настройки ставок
    BETTING: {
        DEFAULT_BET: 0.5,
        MIN_BET: 0.1,
        MAX_BET: 10,
        WIN_MULTIPLIER: 2
    }
};

/**
 * Конфигурация Telegram
 */
export const TELEGRAM_CONFIG = {
    // Функции, связанные с Telegram Web App
    isRunningInTelegram: () => {
        return window.Telegram && window.Telegram.WebApp;
    },
    
    // Получение данных пользователя из Telegram
    getUserData: () => {
        if (!TELEGRAM_CONFIG.isRunningInTelegram()) {
            return null;
        }
        
        try {
            const webApp = window.Telegram.WebApp;
            return {
                id: webApp.initDataUnsafe?.user?.id,
                username: webApp.initDataUnsafe?.user?.username,
                firstName: webApp.initDataUnsafe?.user?.first_name,
                lastName: webApp.initDataUnsafe?.user?.last_name
            };
        } catch (e) {
            console.error('Ошибка при получении данных пользователя Telegram:', e);
            return null;
        }
    }
};

/**
 * Настройки оппонентов (улиток для гонки)
 */
export const OPPONENTS_CONFIG = [
    { type: 'racer', image: 'images/snail_red.png', name: 'Racer' },
    { type: 'explorer', image: 'images/snail_green.png', name: 'Explorer' },
    { type: 'snake', image: 'images/snail_blue.png', name: 'Snake' },
    { type: 'stubborn', image: 'images/snail_lilac.png', name: 'Stubborn' }
];

/**
 * Функция для определения мобильного устройства и его производительности
 * @returns {Object} Информация об устройстве
 */
export function getDeviceInfo() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowPower = isMobile && (/iPhone|iPad|iPod/i.test(navigator.userAgent) && 
                        /OS ([4-9])_/i.test(navigator.userAgent));
    
    return {
        isMobile,
        isLowPower,
        // Адаптируем настройки под устройство
        getAdaptedMazeSize: () => {
            if (isLowPower) {
                return {
                    width: 15,
                    height: 15,
                    complexity: 0.3
                };
            } else if (isMobile) {
                return {
                    width: 18,
                    height: 18,
                    complexity: 0.4
                };
            } else {
                return {
                    width: GAME_CONFIG.MAZE.DEFAULT_WIDTH,
                    height: GAME_CONFIG.MAZE.DEFAULT_HEIGHT,
                    complexity: GAME_CONFIG.MAZE.DEFAULT_COMPLEXITY
                };
            }
        }
    };
} 