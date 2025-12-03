// Main Bingo Game Script with Firebase
document.addEventListener('DOMContentLoaded', async function() {
    // Game state
    let gameState = {
        drawnNumbers: [],
        allNumbers: generateAllNumbers(),
        gameActive: true,
        winners: [],
        gameId: generateGameId(),
        hostId: generatePlayerId()
    };
    
    // DOM Elements
    const currentNumberEl = document.getElementById('current-number');
    const numberLabelEl = document.getElementById('number-label');
    const drawBtn = document.getElementById('draw-btn');
    const resetBtn = document.getElementById('reset-btn');
    const historyContainer = document.getElementById('history-container');
    const totalDrawnEl = document.getElementById('total-drawn');
    const remainingEl = document.getElementById('remaining');
    const playerUrlEl = document.getElementById('player-url');
    const copyUrlBtn = document.getElementById('copy-url');
    const winnersListEl = document.getElementById('winners-list');
    const winnerModal = document.getElementById('winner-modal');
    const confirmWinnerBtn = document.getElementById('confirm-winner');
    const cancelWinnerBtn = document.getElementById('cancel-winner');
    const closeModalBtn = document.querySelector('.close');
    
    // Initialize Firebase
    let database;
    try {
        // Check if Firebase is already initialized
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            database = firebase.database();
        } else {
            // Fallback to localStorage if Firebase fails
            console.warn("Firebase not loaded, falling back to localStorage");
            database = null;
        }
    } catch (error) {
        console.error("Firebase error:", error);
        database = null;
    }
    
    // Initialize QR Code with game ID
    const qrcodeDiv = document.getElementById('qrcode');
    const playerUrl = `${window.location.origin}/player.html?game=${gameState.gameId}`;
    playerUrlEl.value = playerUrl;
    
    // Generate QR code
    new QRCode(qrcodeDiv, {
        text: playerUrl,
        width: 160,
        height: 160,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Initialize game
    updateGameDisplay();
    
    // Save initial game state to Firebase
    if (database) {
        await saveGameStateToFirebase();
        setupFirebaseListeners();
    } else {
        saveGameStateToLocalStorage();
    }
    
    // Event Listeners
    drawBtn.addEventListener('click', drawNumber);
    resetBtn.addEventListener('click', resetGame);
    copyUrlBtn.addEventListener('click', copyPlayerUrl);
    confirmWinnerBtn.addEventListener('click', confirmWinner);
    cancelWinnerBtn.addEventListener('click', closeWinnerModal);
    closeModalBtn.addEventListener('click', closeWinnerModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === winnerModal) {
            closeWinnerModal();
        }
    });
    
    // Setup player count display
    setupPlayerCounter();
    
    // Functions
    function generateGameId() {
        // Generate a unique 6-character game ID
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    function generatePlayerId() {
        return `HOST-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }
    
    function generateAllNumbers() {
        let numbers = [];
        for (let i = 1; i <= 75; i++) {
            numbers.push(i);
        }
        return numbers;
    }
    
    async function drawNumber() {
        if (!gameState.gameActive) {
            showToast("Game is not active. Please reset to start a new game.", "warning");
            return;
        }
        
        if (gameState.allNumbers.length === 0) {
            showToast("All numbers have been drawn! Game over.", "info");
            return;
        }
        
        // Get random number from remaining pool
        const randomIndex = Math.floor(Math.random() * gameState.allNumbers.length);
        const drawnNumber = gameState.allNumbers.splice(randomIndex, 1)[0];
        
        // Add to drawn numbers
        gameState.drawnNumbers.unshift(drawnNumber);
        
        // Update display
        updateGameDisplay();
        
        // Save to database
        if (database) {
            await saveGameStateToFirebase();
        } else {
            saveGameStateToLocalStorage();
        }
        
        // Animate the number draw
        animateNumberDraw(drawnNumber);
        
        // Check if this is the last number
        if (gameState.allNumbers.length === 0) {
            setTimeout(() => {
                showToast("All numbers have been drawn! Game over.", "info");
            }, 500);
        }
    }
    
    function animateNumberDraw(number) {
        // Flash animation
        currentNumberEl.style.transform = 'scale(1.2)';
        currentNumberEl.style.color = '#FF5722';
        
        setTimeout(() => {
            currentNumberEl.style.transform = 'scale(1)';
            currentNumberEl.style.color = '#ffeb3b';
        }, 300);
    }
    
    function updateGameDisplay() {
        // Update current number display
        if (gameState.drawnNumbers.length > 0) {
            const currentNumber = gameState.drawnNumbers[0];
            currentNumberEl.textContent = currentNumber;
            numberLabelEl.textContent = getNumberLabel(currentNumber);
        } else {
            currentNumberEl.textContent = '--';
            numberLabelEl.textContent = 'Waiting for draw';
        }
        
        // Update history
        updateHistoryDisplay();
        
        // Update counters
        totalDrawnEl.textContent = gameState.drawnNumbers.length;
        remainingEl.textContent = gameState.allNumbers.length;
        
        // Update winners list
        updateWinnersList();
    }
    
    function getNumberLabel(number) {
        if (number >= 1 && number <= 15) return `B ${number}`;
        if (number >= 16 && number <= 30) return `I ${number}`;
        if (number >= 31 && number <= 45) return `N ${number}`;
        if (number >= 46 && number <= 60) return `G ${number}`;
        if (number >= 61 && number <= 75) return `O ${number}`;
        return `Number ${number}`;
    }
    
    function updateHistoryDisplay() {
        historyContainer.innerHTML = '';
        
        if (gameState.drawnNumbers.length === 0) {
            historyContainer.innerHTML = '<p class="empty-history">No numbers drawn yet</p>';
            return;
        }
        
        // Show only the last 20 numbers
        const displayNumbers = gameState.drawnNumbers.slice(0, 20);
        
        displayNumbers.forEach((number, index) => {
            const numberEl = document.createElement('div');
            numberEl.className = 'history-number';
            if (index === 0) numberEl.classList.add('recent');
            numberEl.textContent = number;
            numberEl.title = getNumberLabel(number);
            historyContainer.appendChild(numberEl);
        });
    }
    
    function updateWinnersList() {
        winnersListEl.innerHTML = '';
        
        if (gameState.winners.length === 0) {
            winnersListEl.innerHTML = '<li>No winners yet in this session</li>';
            return;
        }
        
        gameState.winners.forEach(winner => {
            const winnerItem = document.createElement('li');
            winnerItem.textContent = `${winner.player} - ${winner.time} (${winner.line})`;
            winnersListEl.appendChild(winnerItem);
        });
    }
    
    async function saveGameStateToFirebase() {
        if (!database) return;
        
        try {
            await database.ref(`games/${gameState.gameId}`).set({
                drawnNumbers: gameState.drawnNumbers,
                allNumbers: gameState.allNumbers,
                gameActive: gameState.gameActive,
                winners: gameState.winners,
                lastUpdate: Date.now(),
                hostId: gameState.hostId
            });
            
            // Also save current number separately for easy access
            await database.ref(`current/${gameState.gameId}`).set({
                currentNumber: gameState.drawnNumbers.length > 0 ? gameState.drawnNumbers[0] : null,
                totalDrawn: gameState.drawnNumbers.length,
                lastDrawn: gameState.drawnNumbers.length > 0 ? gameState.drawnNumbers[0] : null
            });
        } catch (error) {
            console.error("Error saving to Firebase:", error);
            showToast("Error saving game state", "error");
        }
    }
    
    function saveGameStateToLocalStorage() {
        localStorage.setItem(`bingo_${gameState.gameId}`, JSON.stringify(gameState));
        localStorage.setItem(`bingo_current_${gameState.gameId}`, 
            gameState.drawnNumbers.length > 0 ? gameState.drawnNumbers[0] : '--');
    }
    
    async function resetGame() {
        if (!confirm("Are you sure you want to reset the game? All drawn numbers will be cleared.")) {
            return;
        }
        
        gameState = {
            drawnNumbers: [],
            allNumbers: generateAllNumbers(),
            gameActive: true,
            winners: [],
            gameId: gameState.gameId, // Keep same game ID
            hostId: gameState.hostId
        };
        
        updateGameDisplay();
        
        if (database) {
            await saveGameStateToFirebase();
            // Clear player bingo calls
            await database.ref(`bingoCalls/${gameState.gameId}`).remove();
        } else {
            saveGameStateToLocalStorage();
        }
        
        showToast("Game reset successfully!", "success");
    }
    
    function copyPlayerUrl() {
        playerUrlEl.select();
        playerUrlEl.setSelectionRange(0, 99999);
        
        try {
            navigator.clipboard.writeText(playerUrlEl.value).then(() => {
                const originalText = copyUrlBtn.innerHTML;
                copyUrlBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyUrlBtn.style.background = 'linear-gradient(to right, #4CAF50, #2E7D32)';
                
                setTimeout(() => {
                    copyUrlBtn.innerHTML = originalText;
                    copyUrlBtn.style.background = 'linear-gradient(to right, #2196F3, #1565C0)';
                }, 2000);
            });
        } catch (err) {
            console.error('Failed to copy: ', err);
            document.execCommand('copy');
            showToast('URL copied to clipboard!', 'success');
        }
    }
    
    function setupFirebaseListeners() {
        if (!database) return;
        
        // Listen for player bingo calls
        database.ref(`bingoCalls/${gameState.gameId}`).on('child_added', (snapshot) => {
            const bingoCall = snapshot.val();
            if (bingoCall && !bingoCall.processed) {
                showWinnerModalWithPlayer(
                    bingoCall.playerId,
                    bingoCall.playerName,
                    bingoCall.winningLine,
                    snapshot.key
                );
            }
        });
        
        // Listen for player connections
        database.ref(`players/${gameState.gameId}`).on('value', (snapshot) => {
            const players = snapshot.val() || {};
            const playerCount = Object.keys(players).length;
            updatePlayerCount(playerCount);
        });
    }
    
    function setupPlayerCounter() {
        // Create player counter display
        const playerCounter = document.createElement('div');
        playerCounter.id = 'player-counter';
        playerCounter.className = 'player-counter';
        playerCounter.innerHTML = `
            <i class="fas fa-users"></i>
            <span id="player-count">0</span> players connected
        `;
        
        // Add to header
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(playerCounter);
        }
    }
    
    function updatePlayerCount(count) {
        const playerCountEl = document.getElementById('player-count');
        if (playerCountEl) {
            playerCountEl.textContent = count;
        }
    }
    
    function showWinnerModalWithPlayer(playerId, playerName, winningLine, callId) {
        document.getElementById('winner-message').textContent = 
            `${playerName} (${playerId}) has called BINGO with ${winningLine}!`;
        
        // Store call ID for processing
        document.getElementById('winner-modal').dataset.callId = callId;
        document.getElementById('winner-modal').dataset.playerId = playerId;
        
        winnerModal.style.display = 'flex';
    }
    
    function closeWinnerModal() {
        winnerModal.style.display = 'none';
    }
    
    async function confirmWinner() {
        const callId = document.getElementById('winner-modal').dataset.callId;
        const playerId = document.getElementById('winner-modal').dataset.playerId;
        const message = document.getElementById('winner-message').textContent;
        
        // Extract player name and line from message
        const match = message.match(/(.+) has called BINGO with (.+)!/);
        const playerName = match ? match[1] : "Player";
        const line = match ? match[2] : "a winning line";
        
        // Add to winners list
        gameState.winners.unshift({
            player: playerName,
            line: line,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            playerId: playerId
        });
        
        // Update display
        updateWinnersList();
        
        // Mark bingo call as processed
        if (database && callId) {
            await database.ref(`bingoCalls/${gameState.gameId}/${callId}/processed`).set(true);
            
            // Broadcast winner to all players
            await database.ref(`winners/${gameState.gameId}`).push({
                playerName: playerName,
                playerId: playerId,
                line: line,
                time: Date.now()
            });
        }
        
        // Save game state
        if (database) {
            await saveGameStateToFirebase();
        } else {
            saveGameStateToLocalStorage();
        }
        
        // Close modal
        closeWinnerModal();
        
        // Show confirmation
        showToast(`Winner confirmed! ${playerName} has won with ${line}.`, 'success');
    }
    
    // Toast notification system
    function showToast(message, type = 'info', duration = 3000) {
        // Implementation from previous examples
        console.log(`${type}: ${message}`);
        alert(message); // Simple fallback
    }
});