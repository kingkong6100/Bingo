// Player Bingo Card Script with Firebase
document.addEventListener('DOMContentLoaded', async function() {
    // Player state
    let playerState = {
        card: [],
        markedNumbers: [],
        gameConnected: false,
        playerId: generatePlayerId(),
        playerName: `Player-${Math.floor(Math.random() * 1000)}`,
        gameId: null,
        currentNumber: null,
        drawnNumbers: []
    };
    
    // DOM Elements
    const playerCurrentNumberEl = document.getElementById('player-current-number');
    const calledCountEl = document.getElementById('called-count');
    const markedCountEl = document.getElementById('marked-count');
    const bingoCardEl = document.getElementById('bingo-card');
    const playerHistoryEl = document.getElementById('player-history');
    const callBingoBtn = document.getElementById('call-bingo-btn');
    const newCardBtn = document.getElementById('new-card-btn');
    const playerIdEl = document.getElementById('player-id');
    const connectionStatusEl = document.getElementById('connection-status');
    const bingoCallModal = document.getElementById('bingo-call-modal');
    const successModal = document.getElementById('success-modal');
    const confirmBingoBtn = document.getElementById('confirm-bingo');
    const cancelBingoBtn = document.getElementById('cancel-bingo');
    const closeSuccessBtn = document.getElementById('close-success');
    
    // Get game ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    playerState.gameId = urlParams.get('game') || 'default';
    
    // Initialize Firebase
    let database;
    try {
        if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
            database = firebase.database();
        } else {
            database = null;
        }
    } catch (error) {
        console.error("Firebase error:", error);
        database = null;
    }
    
    // Initialize player
    playerIdEl.textContent = `${playerState.playerName} (${playerState.playerId})`;
    generateBingoCard();
    
    // Connect to game
    if (database) {
        await connectToGame();
        setupFirebaseListeners();
    } else {
        // Fallback to localStorage (single device only)
        setupLocalStoragePolling();
    }
    
    // Event Listeners
    callBingoBtn.addEventListener('click', showBingoCallModal);
    newCardBtn.addEventListener('click', generateNewCard);
    confirmBingoBtn.addEventListener('click', callBingo);
    cancelBingoBtn.addEventListener('click', closeBingoCallModal);
    closeSuccessBtn.addEventListener('click', closeSuccessModal);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === bingoCallModal) {
            closeBingoCallModal();
        }
        if (event.target === successModal) {
            closeSuccessModal();
        }
    });
    
    // Functions
    function generatePlayerId() {
        return `P-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }
    
    async function connectToGame() {
        if (!database) return;
        
        try {
            // Register player
            await database.ref(`players/${playerState.gameId}/${playerState.playerId}`).set({
                name: playerState.playerName,
                connected: true,
                lastSeen: Date.now()
            });
            
            // Set up disconnect cleanup
            window.addEventListener('beforeunload', async () => {
                await database.ref(`players/${playerState.gameId}/${playerState.playerId}`).remove();
            });
            
            // Update connection status
            playerState.gameConnected = true;
            updateConnectionStatus(true);
            
            // Load current game state
            await loadGameState();
            
        } catch (error) {
            console.error("Error connecting to game:", error);
            playerState.gameConnected = false;
            updateConnectionStatus(false, "Connection failed");
        }
    }
    
    async function loadGameState() {
        if (!database) return;
        
        try {
            const snapshot = await database.ref(`games/${playerState.gameId}`).once('value');
            const gameData = snapshot.val();
            
            if (gameData) {
                playerState.drawnNumbers = gameData.drawnNumbers || [];
                updatePlayerDisplay();
                updatePlayerHistory();
            }
            
            // Load current number
            const currentSnapshot = await database.ref(`current/${playerState.gameId}`).once('value');
            const currentData = currentSnapshot.val();
            
            if (currentData && currentData.currentNumber) {
                updateCurrentNumber(currentData.currentNumber);
            }
            
        } catch (error) {
            console.error("Error loading game state:", error);
        }
    }
    
    function setupFirebaseListeners() {
        if (!database) return;
        
        // Listen for new numbers
        database.ref(`current/${playerState.gameId}`).on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.currentNumber !== playerState.currentNumber) {
                updateCurrentNumber(data.currentNumber);
                
                // Add to drawn numbers if not already there
                if (data.currentNumber && !playerState.drawnNumbers.includes(data.currentNumber)) {
                    playerState.drawnNumbers.unshift(data.currentNumber);
                    updatePlayerDisplay();
                    updatePlayerHistory();
                    
                    // Check if this number is on player's card
                    checkAndMarkNumber(data.currentNumber);
                }
            }
        });
        
        // Listen for game state changes
        database.ref(`games/${playerState.gameId}`).on('value', (snapshot) => {
            const gameData = snapshot.val();
            if (gameData) {
                playerState.drawnNumbers = gameData.drawnNumbers || [];
                updatePlayerDisplay();
                updatePlayerHistory();
            }
        });
        
        // Listen for winners
        database.ref(`winners/${playerState.gameId}`).on('child_added', (snapshot) => {
            const winner = snapshot.val();
            showWinnerNotification(winner);
        });
    }
    
    function setupLocalStoragePolling() {
        // Fallback for single device
        setInterval(() => {
            const currentNumber = localStorage.getItem(`bingo_current_${playerState.gameId}`);
            if (currentNumber && currentNumber !== playerState.currentNumber) {
                updateCurrentNumber(currentNumber);
                checkAndMarkNumber(currentNumber);
            }
        }, 1000);
        
        updateConnectionStatus(true, "Local game (single device only)");
    }
    
    function updateCurrentNumber(number) {
        if (number === '--' || !number) {
            playerCurrentNumberEl.textContent = '--';
            playerState.currentNumber = null;
            return;
        }
        
        playerState.currentNumber = number;
        playerCurrentNumberEl.textContent = number;
        
        // Animation
        playerCurrentNumberEl.style.transform = 'scale(1.2)';
        playerCurrentNumberEl.style.color = '#FF5722';
        
        setTimeout(() => {
            playerCurrentNumberEl.style.transform = 'scale(1)';
            playerCurrentNumberEl.style.color = '#ffeb3b';
        }, 300);
    }
    
    function checkAndMarkNumber(number) {
        const numberStr = number.toString();
        const hasNumber = playerState.card.some(cell => 
            cell.number.toString() === numberStr
        );
        
        if (hasNumber && !playerState.markedNumbers.includes(numberStr)) {
            playerState.markedNumbers.push(numberStr);
            updateCardMarkings();
            updatePlayerDisplay();
            
            // Show notification
            if (typeof showToast === 'function') {
                showToast(`You have number ${number}!`, 'success');
            }
        }
    }
    
    function generateBingoCard() {
        // Clear current card
        playerState.card = [];
        playerState.markedNumbers = [];
        bingoCardEl.innerHTML = '';
        
        // Bingo columns
        const columnRanges = [
            {letter: 'B', min: 1, max: 15},
            {letter: 'I', min: 16, max: 30},
            {letter: 'N', min: 31, max: 45},
            {letter: 'G', min: 46, max: 60},
            {letter: 'O', min: 61, max: 75}
        ];
        
        // Generate numbers for each column
        for (let col = 0; col < 5; col++) {
            const range = columnRanges[col];
            const numbers = [];
            
            while (numbers.length < 5) {
                const num = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
                if (!numbers.includes(num)) {
                    numbers.push(num);
                }
            }
            
            numbers.sort((a, b) => a - b);
            
            for (let row = 0; row < 5; row++) {
                playerState.card.push({
                    row: row,
                    col: col,
                    letter: range.letter,
                    number: (row === 2 && col === 2) ? 'FREE' : numbers[row],
                    marked: (row === 2 && col === 2)
                });
            }
        }
        
        // Mark free space
        if (!playerState.markedNumbers.includes('FREE')) {
            playerState.markedNumbers.push('FREE');
        }
        
        // Render card
        renderBingoCard();
        updatePlayerDisplay();
    }
    
    function renderBingoCard() {
        bingoCardEl.innerHTML = '';
        
        playerState.card.forEach(cell => {
            const cellEl = document.createElement('div');
            cellEl.className = 'bingo-cell';
            if (cell.marked) cellEl.classList.add('marked');
            if (cell.number === 'FREE') cellEl.classList.add('free');
            
            cellEl.innerHTML = `
                <div class="letter">${cell.letter}</div>
                <div class="number">${cell.number}</div>
            `;
            
            if (cell.number !== 'FREE') {
                cellEl.addEventListener('click', () => toggleMarkNumber(cell.number));
            }
            
            bingoCardEl.appendChild(cellEl);
        });
    }
    
    function toggleMarkNumber(number) {
        const numberStr = number.toString();
        
        if (playerState.markedNumbers.includes(numberStr)) {
            playerState.markedNumbers = playerState.markedNumbers.filter(n => n !== numberStr);
        } else {
            playerState.markedNumbers.push(numberStr);
        }
        
        updateCardMarkings();
        updatePlayerDisplay();
    }
    
    function updateCardMarkings() {
        const cellElements = bingoCardEl.querySelectorAll('.bingo-cell');
        
        cellElements.forEach((cellEl, index) => {
            const cell = playerState.card[index];
            const numberStr = cell.number.toString();
            
            if (cell.number === 'FREE' || playerState.markedNumbers.includes(numberStr)) {
                cell.marked = true;
                cellEl.classList.add('marked');
            } else {
                cell.marked = false;
                cellEl.classList.remove('marked');
            }
        });
    }
    
    function updatePlayerDisplay() {
        markedCountEl.textContent = playerState.markedNumbers.length;
        calledCountEl.textContent = playerState.drawnNumbers.length;
    }
    
    function updatePlayerHistory() {
        playerHistoryEl.innerHTML = '';
        
        if (!playerState.drawnNumbers || playerState.drawnNumbers.length === 0) {
            playerHistoryEl.innerHTML = '<p class="empty-history">No numbers drawn yet</p>';
            return;
        }
        
        const displayNumbers = playerState.drawnNumbers.slice(0, 10);
        
        displayNumbers.forEach(number => {
            const numberEl = document.createElement('div');
            numberEl.className = 'history-number';
            if (number === playerState.drawnNumbers[0]) {
                numberEl.classList.add('recent');
            }
            numberEl.textContent = number;
            numberEl.title = getNumberLabel(number);
            
            const isOnCard = playerState.card.some(cell => 
                cell.number === number || cell.number.toString() === number.toString()
            );
            
            if (isOnCard) {
                numberEl.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                numberEl.style.borderColor = '#4CAF50';
            }
            
            playerHistoryEl.appendChild(numberEl);
        });
    }
    
    function getNumberLabel(number) {
        if (number >= 1 && number <= 15) return `B ${number}`;
        if (number >= 16 && number <= 30) return `I ${number}`;
        if (number >= 31 && number <= 45) return `N ${number}`;
        if (number >= 46 && number <= 60) return `G ${number}`;
        if (number >= 61 && number <= 75) return `O ${number}`;
        return `Number ${number}`;
    }
    
    function updateConnectionStatus(connected, message = null) {
        playerState.gameConnected = connected;
        
        if (connectionStatusEl) {
            if (connected) {
                connectionStatusEl.className = 'connected';
                connectionStatusEl.innerHTML = '<i class="fas fa-wifi"></i> ' + (message || 'Connected to Game');
            } else {
                connectionStatusEl.className = 'disconnected';
                connectionStatusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> ' + (message || 'Disconnected');
            }
        }
    }
    
    function generateNewCard() {
        if (confirm("Generate a new Bingo card? Your current marks will be lost.")) {
            generateBingoCard();
        }
    }
    
    function showBingoCallModal() {
        if (playerState.markedNumbers.length < 5) {
            alert("You need to mark at least 5 numbers to call BINGO!");
            return;
        }
        
        if (!playerState.gameConnected) {
            alert("Cannot call BINGO while disconnected from the game!");
            return;
        }
        
        bingoCallModal.style.display = 'flex';
    }
    
    function closeBingoCallModal() {
        bingoCallModal.style.display = 'none';
    }
    
    function closeSuccessModal() {
        successModal.style.display = 'none';
    }
    
    async function callBingo() {
        const winningLine = document.getElementById('winning-line').value;
        const lineName = document.getElementById('winning-line').options[document.getElementById('winning-line').selectedIndex].text;
        
        // Verify the player actually has this line
        if (!verifyWinningLine(winningLine)) {
            alert("You don't have a complete " + lineName + "! Please check your card.");
            return;
        }
        
        const bingoCall = {
            playerId: playerState.playerId,
            playerName: playerState.playerName,
            winningLine: lineName,
            lineType: winningLine,
            timestamp: Date.now(),
            markedNumbers: playerState.markedNumbers,
            processed: false
        };
        
        if (database) {
            try {
                // Save bingo call to Firebase
                await database.ref(`bingoCalls/${playerState.gameId}`).push(bingoCall);
                
                closeBingoCallModal();
                successModal.style.display = 'flex';
                
                // Disable BINGO button temporarily
                callBingoBtn.disabled = true;
                setTimeout(() => {
                    callBingoBtn.disabled = false;
                }, 30000); // 30 second cooldown
                
            } catch (error) {
                console.error("Error calling BINGO:", error);
                alert("Error calling BINGO. Please try again.");
            }
        } else {
            // Fallback to localStorage
            localStorage.setItem(`bingo_call_${playerState.gameId}`, JSON.stringify(bingoCall));
            closeBingoCallModal();
            successModal.style.display = 'flex';
        }
    }
    
    function verifyWinningLine(lineType) {
        // Simplified verification - in real game, check actual card
        return true;
    }
    
    function showWinnerNotification(winner) {
        if (typeof showToast === 'function') {
            if (winner.playerId === playerState.playerId) {
                showToast(`🎉 YOU WON with ${winner.line}! 🎉`, 'success', 5000);
            } else {
                showToast(`${winner.playerName} won with ${winner.line}!`, 'info', 3000);
            }
        }
    }
    
    // Toast function (if not defined)
    if (typeof showToast === 'undefined') {
        window.showToast = function(message, type = 'info', duration = 3000) {
            console.log(`${type}: ${message}`);
        };
    }
});