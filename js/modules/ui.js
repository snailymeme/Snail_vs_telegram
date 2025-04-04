/**
 * UI модуль для Snail to Riches
 * Отвечает за создание и управление элементами пользовательского интерфейса
 */

/**
 * Отображает ошибку в UI
 * @param {string} message - Сообщение об ошибке
 * @param {any} details - Детали ошибки для отладки
 */
export function showError(message, details) {
    console.error(`Error: ${message}`, details);
    
    // Создаем элемент для отображения ошибки
    const errorContainer = document.createElement('div');
    errorContainer.className = 'error-container';
    errorContainer.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); color: white; padding: 20px; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;';
    
    const errorTitle = document.createElement('h2');
    errorTitle.textContent = 'An error occurred';
    errorTitle.style.cssText = 'color: #ff5555; margin-bottom: 20px;';
    
    const errorMessage = document.createElement('p');
    errorMessage.textContent = message;
    errorMessage.style.cssText = 'margin-bottom: 15px; max-width: 80%;';
    
    const errorDetails = document.createElement('pre');
    errorDetails.textContent = details ? JSON.stringify(details, null, 2) : 'No additional information';
    errorDetails.style.cssText = 'background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; max-width: 80%; overflow: auto; text-align: left; margin-bottom: 20px;';
    
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Reload page';
    reloadButton.style.cssText = 'background: #4285f4; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;';
    reloadButton.onclick = () => window.location.reload();
    
    errorContainer.appendChild(errorTitle);
    errorContainer.appendChild(errorMessage);
    errorContainer.appendChild(errorDetails);
    errorContainer.appendChild(reloadButton);
    
    document.body.appendChild(errorContainer);
}

/**
 * Настраивает элементы для отображения гонки
 * @returns {Object} Объект с созданными элементами
 */
export function setupRaceElements() {
    // Создаем контейнер для гонки, если его не существует
    let raceContainer = document.getElementById('race-container');
    if (!raceContainer) {
        raceContainer = document.createElement('div');
        raceContainer.id = 'race-container';
        raceContainer.classList.add('hidden');
        raceContainer.style.cssText = 'width: 100%; height: 80vh; position: relative; margin: 0 auto; overflow: hidden; background-color: #000;';
        document.body.appendChild(raceContainer);
    }
    
    // Создаем canvas для отрисовки гонки, если его не существует
    let raceCanvas = document.getElementById('race-canvas');
    if (!raceCanvas) {
        raceCanvas = document.createElement('canvas');
        raceCanvas.id = 'race-canvas';
        raceCanvas.style.cssText = 'display: block; margin: 0 auto; background-color: #111;';
        raceContainer.appendChild(raceCanvas);
    }
    
    // Создаем панель информации о гонке
    let raceInfo = document.getElementById('race-info');
    if (!raceInfo) {
        raceInfo = document.createElement('div');
        raceInfo.id = 'race-info';
        raceInfo.classList.add('race-info');
        raceInfo.style.cssText = 'position: absolute; top: 10px; left: 10px; padding: 5px 10px; background-color: rgba(0,0,0,0.7); color: white; border-radius: 5px; font-size: 14px; z-index: 10;';
        
        // Добавляем таймер гонки
        const raceTimer = document.createElement('div');
        raceTimer.id = 'race-timer';
        raceTimer.textContent = 'Время: 0.0 сек';
        raceInfo.appendChild(raceTimer);
        
        // Добавляем информацию о выбранной улитке
        const selectedSnailInfo = document.createElement('div');
        selectedSnailInfo.id = 'selected-snail-info';
        selectedSnailInfo.textContent = 'Ваша улитка: Не выбрана';
        raceInfo.appendChild(selectedSnailInfo);
        
        raceContainer.appendChild(raceInfo);
    }
    
    // Создаем экран загрузки, если его не существует
    let loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.classList.add('overlay', 'hidden');
        loadingScreen.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000;';
        
        const loadingContent = document.createElement('div');
        loadingContent.className = 'overlay-content';
        loadingContent.style.cssText = 'text-align: center; color: white;';
        
        const loadingText = document.createElement('p');
        loadingText.textContent = 'Загрузка гонки...';
        loadingText.style.cssText = 'font-size: 24px; margin-bottom: 20px;';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.style.cssText = 'width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite;';
        
        // Добавляем стиль для анимации спиннера
        const style = document.createElement('style');
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
        
        loadingContent.appendChild(loadingText);
        loadingContent.appendChild(spinner);
        loadingScreen.appendChild(loadingContent);
        
        document.body.appendChild(loadingScreen);
    }
    
    return {
        raceContainer,
        raceCanvas,
        raceInfo,
        loadingScreen
    };
}

/**
 * Показывает экран загрузки
 */
export function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

/**
 * Скрывает экран загрузки
 */
export function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

/**
 * Обновляет информацию о таймере гонки
 * @param {number} time - Время гонки в секундах
 */
export function updateRaceTimer(time) {
    const timerElement = document.getElementById('race-timer');
    if (timerElement) {
        timerElement.textContent = `Время: ${time.toFixed(1)} сек`;
    }
}

/**
 * Обновляет информацию о выбранной улитке
 * @param {string} snailName - Название выбранной улитки
 */
export function updateSelectedSnailInfo(snailName) {
    const infoElement = document.getElementById('selected-snail-info');
    if (infoElement) {
        infoElement.textContent = `Ваша улитка: ${snailName || 'Не выбрана'}`;
    }
}

/**
 * Создает и отображает экран результатов гонки
 * @param {Object} results - Результаты гонки
 * @param {boolean} results.isWin - Выиграл ли пользователь
 * @param {number} results.betAmount - Сумма ставки
 * @param {number} results.winAmount - Сумма выигрыша (если выиграл)
 * @param {function} onPlayAgain - Функция-колбэк для кнопки "Играть снова"
 */
export function showRaceResults(results, onPlayAgain) {
    // Создаем контейнер для результатов
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-container';
    resultsContainer.id = 'race-results';
    resultsContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1001;';
    
    const resultsContent = document.createElement('div');
    resultsContent.className = 'results-content';
    resultsContent.style.cssText = 'background-color: #212121; padding: 30px; border-radius: 10px; text-align: center; max-width: 90%; width: 400px;';
    
    const resultsTitle = document.createElement('h2');
    resultsTitle.textContent = results.isWin ? 'Победа!' : 'Поражение';
    resultsTitle.style.cssText = `color: ${results.isWin ? '#4CAF50' : '#F44336'}; font-size: 28px; margin-bottom: 20px;`;
    
    const resultsMessage = document.createElement('p');
    if (results.isWin) {
        resultsMessage.textContent = `Ваша улитка пришла первой! Вы выиграли ${results.winAmount.toFixed(2)} SOL`;
    } else {
        resultsMessage.textContent = `К сожалению, ваша улитка не победила. Вы потеряли ставку ${results.betAmount.toFixed(2)} SOL`;
    }
    resultsMessage.style.cssText = 'font-size: 18px; margin-bottom: 30px; color: #fff;';
    
    const playAgainButton = document.createElement('button');
    playAgainButton.textContent = 'Играть снова';
    playAgainButton.style.cssText = 'background-color: #4285f4; color: white; border: none; padding: 15px 30px; border-radius: 5px; font-size: 18px; cursor: pointer; transition: background-color 0.3s;';
    playAgainButton.onmouseover = () => { playAgainButton.style.backgroundColor = '#3367d6'; };
    playAgainButton.onmouseout = () => { playAgainButton.style.backgroundColor = '#4285f4'; };
    playAgainButton.onclick = () => {
        document.body.removeChild(resultsContainer);
        if (typeof onPlayAgain === 'function') {
            onPlayAgain();
        }
    };
    
    resultsContent.appendChild(resultsTitle);
    resultsContent.appendChild(resultsMessage);
    resultsContent.appendChild(playAgainButton);
    resultsContainer.appendChild(resultsContent);
    
    document.body.appendChild(resultsContainer);
}

/**
 * Показывает информационное сообщение пользователю
 * @param {string} title - Заголовок сообщения
 * @param {string} message - Текст сообщения
 * @param {number} [duration=2000] - Длительность показа в миллисекундах
 */
export function showMessage(title, message, duration = 2000) {
    console.log(`Показ сообщения: ${title} - ${message}`);
    
    // Проверяем, нет ли уже активного сообщения
    let messageContainer = document.getElementById('info-message-container');
    if (messageContainer) {
        // Если сообщение уже показывается, удаляем его
        document.body.removeChild(messageContainer);
    }
    
    // Создаем элемент для отображения сообщения
    messageContainer = document.createElement('div');
    messageContainer.id = 'info-message-container';
    messageContainer.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 9999;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 90%;
        min-width: 250px;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    const messageTitle = document.createElement('h3');
    messageTitle.textContent = title;
    messageTitle.style.cssText = `
        margin: 0 0 5px 0;
        color: #FFD700;
        font-size: 18px;
    `;
    
    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageText.style.cssText = `
        margin: 0;
        font-size: 14px;
    `;
    
    // Добавляем стиль для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, -20px); }
        }
    `;
    document.head.appendChild(style);
    
    messageContainer.appendChild(messageTitle);
    messageContainer.appendChild(messageText);
    
    document.body.appendChild(messageContainer);
    
    // Автоматически скрываем сообщение через указанное время
    setTimeout(() => {
        if (messageContainer) {
            messageContainer.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                if (messageContainer && messageContainer.parentNode) {
                    document.body.removeChild(messageContainer);
                }
            }, 300);
        }
    }, duration);
    
    // Возвращаем элемент сообщения, чтобы можно было управлять им вручную при необходимости
    return messageContainer;
} 