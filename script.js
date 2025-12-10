
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Game loading...");
    
    // Configuration
    const config = {
        firebaseLoaded: false,
        database: null,
        useFallback: false
    };
    
    // DOM Elements
    const elements = {
        currentNumber: document.getElementById('current-number'),
        numberLabel: document.getElementById('number-label'),
        drawBtn: document.getElementById('draw-btn'),
        resetBtn: document.getElementById('reset-btn'),
        historyContainer: document.getElementById('history-container'),
        totalDrawn: document.getElementById('total-drawn'),
        remaining: document.getElementById('remaining'),
        playerUrl: document.getElementById('player-url'),
        copyUrlBtn: document.getElementById('copy-url'),
        winnersList: document.getElementById('winners-list'),
        winnerModal: document.getElementById('winner-modal')
    };
    
    // Game State
    let gameState = {
        drawnNumbers: [],
        allNumbers: generateAllNumbers(),
        gameActive: true,
        winners: [],
        gameId: generateGameId(),
        hostId: generatePlayerId('HOST')
    };
    
    // Initialize Firebase
    await initializeFirebase();
    
    // Initialize Game
    initGame();
    
    // Event Listeners
    setupEventListeners();
    
    // ===== FUNCTIONS =====
    
    async function initializeFirebase() {
        console.log("Initializing Firebase...");
        
        try {
            // Check if Firebase scripts loaded
            if (typeof firebase === 'undefined') {
                console.warn("Firebase SDK not loaded");
                showToast("⚠️ Using offline mode (single device only)", "warning", 5000);
                config.useFallback = true;
                return;
            }
            
            // Check if Firebase app is already initialized
            if (!firebase.apps.length) {
                console.warn("Firebase app not initialized. Did you create firebase-config.js?");
                showToast("⚠️ Firebase not configured. Using offline mode.", "warning", 5000);
                config.useFallback = true;
                return;
            }
            
            // Initialize database
            config.database = firebase.database();
            config.firebaseLoaded = true;
            
            console.log("Firebase initialized successfully");
            
            // Test connection
            await testFirebaseConnection();
            
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            config.useFallback = true;
            showToast("⚠️ Offline mode: Single device only", "warning", 5000);
        }
    }
    
    async function testFirebaseConnection() {
        try {
            const testRef = config.database.ref('connectionTest');
            await testRef.set({
                test: true,
                timestamp: Date.now(),
                host: gameState.hostId
            });
            
            console.log("Firebase connection test successful");
            showToast("✅ Connected to online game server!", "success", 3000);
            
        } catch (error) {
            console.error("Firebase connection test failed:", error);
            config.useFallback = true;
            showToast("⚠️ Can't reach server. Using offline mode.", "warning", 5000);
        }
    }
    
    function generateGameId() {
        // Simple 4-character game ID
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing characters
        let gameId = '';
        for (let i = 0; i < 4; i++) {
            gameId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return gameId;
    }
    
    function generatePlayerId(prefix = 'PLAYER') {
        return `${prefix}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    }
    
    function generateAllNumbers() {
        let numbers = [];
        for (let i = 1; i <= 75; i++) {
            numbers.push(i);
        }
        return numbers;
    }
    
    function initGame() {
        // Generate player URL with game ID
        const playerUrl = `${window.location.origin}/player.html?game=${gameState.gameId}`;
        elements.playerUrl.value = playerUrl;
        
        // Generate QR Code
        const qrcodeDiv = document.getElementById('qrcode');
        if (qrcodeDiv) {
            qrcodeDiv.innerHTML = '';
            new QRCode(qrcodeDiv, {
                text: playerUrl,
                width: 160,
                height: 160,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
        
        // Update display
        updateGameDisplay();
        
        // Save initial state
        saveGameState();
    }
    
    function updateGameDisplay() {
        // Current number
        if (gameState.drawnNumbers.length > 0) {
            const currentNumber = gameState.drawnNumbers[0];
            elements.currentNumber.textContent = currentNumber;
            elements.numberLabel.textContent = getNumberLabel(currentNumber);
        } else {
            elements.currentNumber.textContent = '--';
            elements.numberLabel.textContent = 'Click Draw to start';
        }
        
        // Counters
        elements.totalDrawn.textContent = gameState.drawnNumbers.length;
        elements.remaining.textContent = gameState.allNumbers.length;
        
        // History
        updateHistoryDisplay();
        
        // Winners
        updateWinnersList();
    }
    
    function getNumberLabel(number) {
        if (number <= 15) return `B ${number}`;
        if (number <= 30) return `I ${number}`;
        if (number <= 45) return `N ${number}`;
        if (number <= 60) return `G ${number}`;
        return `O ${number}`;
    }
    
    function updateHistoryDisplay() {
        elements.historyContainer.innerHTML = '';
        
        if (gameState.drawnNumbers.length === 0) {
            elements.historyContainer.innerHTML = '<p class="empty-history">No numbers drawn yet</p>';
            return;
        }
        
        // Show recent numbers (max 15)
        const displayNumbers = gameState.drawnNumbers.slice(0, 15);
        
        displayNumbers.forEach((number, index) => {
            const numberEl = document.createElement('div');
            numberEl.className = 'history-number';
            if (index === 0) numberEl.classList.add('recent');
            numberEl.textContent = number;
            numberEl.title = getNumberLabel(number);
            elements.historyContainer.appendChild(numberEl);
        });
    }
    
    function updateWinnersList() {
        elements.winnersList.innerHTML = '';
        
        if (gameState.winners.length === 0) {
            elements.winnersList.innerHTML = '<li>No winners yet</li>';
            return;
        }
        
        gameState.winners.forEach(winner => {
            const li = document.createElement('li');
            li.textContent = `${winner.player} - ${winner.time} (${winner.line})`;
            elements.winnersList.appendChild(li);
        });
    }
    
    async function drawNumber() {
        if (!gameState.gameActive) {
            showToast("Game is paused. Reset to start new game.", "warning");
            return;
        }
        
        if (gameState.allNumbers.length === 0) {
            showToast("All numbers drawn! Game over.", "info");
            return;
        }
        
        // Draw random number
        const randomIndex = Math.floor(Math.random() * gameState.allNumbers.length);
        const drawnNumber = gameState.allNumbers.splice(randomIndex, 1)[0];
        
        // Add to history
        gameState.drawnNumbers.unshift(drawnNumber);
        
        // Update display
        updateGameDisplay();
        
        // Animate
        animateNumberDraw(drawnNumber);
        
        // Save state
        await saveGameState();
        
        // Check for end of game
        if (gameState.allNumbers.length === 0) {
            setTimeout(() => {
                showToast("🎉 Game Over! All numbers drawn.", "info", 5000);
            }, 1000);
        }
    }
    
    function animateNumberDraw(number) {
        elements.currentNumber.style.transform = 'scale(1.2)';
        elements.currentNumber.style.color = '#FF5722';
        
        setTimeout(() => {
            elements.currentNumber.style.transform = 'scale(1)';
            elements.currentNumber.style.color = '#ffeb3b';
        }, 300);
    }
    
    async function saveGameState() {
        if (config.firebaseLoaded && config.database) {
            // Save to Firebase
            try {
                await config.database.ref(`games/${gameState.gameId}`).set({
                    drawnNumbers: gameState.drawnNumbers,
                    currentNumber: gameState.drawnNumbers[0] || null,
                    totalDrawn: gameState.drawnNumbers.length,
                    gameActive: gameState.gameActive,
                    lastUpdate: Date.now(),
                    hostId: gameState.hostId
                });
                
                console.log("Game state saved to Firebase");
                
            } catch (error) {
                console.error("Failed to save to Firebase:", error);
                // Fallback to localStorage
                localStorage.setItem(`bingo_${gameState.gameId}`, JSON.stringify(gameState));
            }
        } else {
            // Save to localStorage
            localStorage.setItem(`bingo_${gameState.gameId}`, JSON.stringify(gameState));
            localStorage.setItem(`bingo_current_${gameState.gameId}`, 
                gameState.drawnNumbers[0] || '--');
        }
    }
    
    async function resetGame() {
        if (!confirm("Reset game? All drawn numbers will be cleared.")) return;
        
        gameState = {
            drawnNumbers: [],
            allNumbers: generateAllNumbers(),
            gameActive: true,
            winners: [],
            gameId: generateGameId(), // New game ID
            hostId: gameState.hostId
        };
        
        updateGameDisplay();
        await saveGameState();
        
        // Update player URL with new game ID
        const newPlayerUrl = `${window.location.origin}/Bingo/player.html?game=${gameState.gameId}`;
        elements.playerUrl.value = newPlayerUrl;
        
        // Update QR Code
        const qrcodeDiv = document.getElementById('qrcode');
        if (qrcodeDiv) {
            qrcodeDiv.innerHTML = '';
            new QRCode(qrcodeDiv, {
                text: newPlayerUrl,
                width: 160,
                height: 160
            });
        }
        
        showToast("Game reset successfully! New game ID: " + gameState.gameId, "success");
    }
    
    function setupEventListeners() {
        // Draw button
        elements.drawBtn.addEventListener('click', drawNumber);
        
        // Reset button
        elements.resetBtn.addEventListener('click', resetGame);
        
        // Copy URL button
        elements.copyUrlBtn.addEventListener('click', () => {
            elements.playerUrl.select();
            navigator.clipboard.writeText(elements.playerUrl.value)
                .then(() => showToast("Link copied to clipboard!", "success"))
                .catch(() => alert("Copy this link: " + elements.playerUrl.value));
        });
        
        // Winner modal buttons
        document.getElementById('confirm-winner')?.addEventListener('click', confirmWinner);
        document.getElementById('cancel-winner')?.addEventListener('click', closeWinnerModal);
        document.querySelector('.close')?.addEventListener('click', closeWinnerModal);
    }
    
    function showWinnerModal() {
        if (elements.winnerModal) {
            elements.winnerModal.style.display = 'flex';
        }
    }
    
    function closeWinnerModal() {
        if (elements.winnerModal) {
            elements.winnerModal.style.display = 'none';
        }
    }
    
    function confirmWinner() {
        const message = document.getElementById('winner-message')?.textContent || "A player won!";
        showToast(message, "success");
        closeWinnerModal();
    }
    
    // Simple toast function
    function showToast(message, type = 'info', duration = 3000) {
        console.log(`${type}: ${message}`);
        
        // Create toast if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            `;
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            margin: 5px;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease;
        `;
        
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        // Auto-remove
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        // Add CSS animations
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
});