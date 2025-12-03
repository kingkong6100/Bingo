// Main Bingo Game Script
document.addEventListener('DOMContentLoaded', function() {
    // Game state
    let gameState = {
        drawnNumbers: [],
        allNumbers: generateAllNumbers(),
        gameActive: true,
        winners: [],
        lastUpdate: Date.now()
    };
    
    // Load saved state if exists
    const savedState = localStorage.getItem('bingoHostState');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        gameState.drawnNumbers = parsed.drawnNumbers || [];
        gameState.allNumbers = parsed.allNumbers || generateAllNumbers();
        gameState.gameActive = parsed.gameActive !== false;
        gameState.winners = parsed.winners || [];
    }
    
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
    
    // Initialize QR Code
    const qrcodeDiv = document.getElementById('qrcode');
    const playerUrl = window.location.origin + '/Bingo/player.html';
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
    saveGameState();
    
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
    
    // Auto-save state periodically
    setInterval(saveGameState, 2000);
    
    // Functions
    function generateAllNumbers() {
        let numbers = [];
        for (let i = 1; i <= 75; i++) {
            numbers.push(i);
        }
        return numbers;
    }
    
    function drawNumber() {
        if (!gameState.gameActive) {
            alert("Game is not active. Please reset to start a new game.");
            return;
        }
        
        if (gameState.allNumbers.length === 0) {
            alert("All numbers have been drawn!");
            return;
        }
        
        // Get random number from remaining pool
        const randomIndex = Math.floor(Math.random() * gameState.allNumbers.length);
        const drawnNumber = gameState.allNumbers.splice(randomIndex, 1)[0];
        
        // Add to drawn numbers
        gameState.drawnNumbers.unshift(drawnNumber);
        gameState.lastUpdate = Date.now();
        
        // Update display
        updateGameDisplay();
        saveGameState();
        
        // Animate the number draw
        animateNumberDraw(drawnNumber);
        
        // Check if this is the last number
        if (gameState.allNumbers.length === 0) {
            setTimeout(() => {
                alert("All numbers have been drawn! Game over.");
            }, 500);
        }
        
        // Simulate a player winning occasionally (for demo)
        if (gameState.drawnNumbers.length > 20 && Math.random() > 0.8) {
            setTimeout(() => {
                showWinnerModal();
            }, 1000);
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
    
    function saveGameState() {
        // Save to localStorage so player pages can access
        localStorage.setItem('bingoHostState', JSON.stringify(gameState));
        
        // Also save just the current numbers for player pages
        localStorage.setItem('bingoCurrentNumber', 
            gameState.drawnNumbers.length > 0 ? gameState.drawnNumbers[0] : '--');
        localStorage.setItem('bingoDrawnNumbers', JSON.stringify(gameState.drawnNumbers));
        localStorage.setItem('bingoLastUpdate', gameState.lastUpdate.toString());
    }
    
    function resetGame() {
        if (confirm("Are you sure you want to reset the game? All drawn numbers will be cleared.")) {
            gameState = {
                drawnNumbers: [],
                allNumbers: generateAllNumbers(),
                gameActive: true,
                winners: [],
                lastUpdate: Date.now()
            };
            updateGameDisplay();
            saveGameState();
        }
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
            alert('URL copied to clipboard!');
        }
    }
    
    function showWinnerModal() {
        const playerId = `Player-${Math.floor(Math.random() * 1000)}`;
        const winningLines = [
            "Top Row (B-I-N-G-O)",
            "Middle Row (Free Space included)",
            "Bottom Row",
            "First Column (B)",
            "Last Column (O)",
            "Diagonal"
        ];
        const randomLine = winningLines[Math.floor(Math.random() * winningLines.length)];
        
        document.getElementById('winner-message').textContent = 
            `${playerId} has called BINGO with a ${randomLine}!`;
        
        winnerModal.style.display = 'flex';
    }
    
    function closeWinnerModal() {
        winnerModal.style.display = 'none';
    }
    
    function confirmWinner() {
        const message = document.getElementById('winner-message').textContent;
        const player = message.split(' ')[0];
        const line = message.split('with a ')[1].replace('!', '');
        
        // Add to winners list
        gameState.winners.unshift({
            player: player,
            line: line,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });
        
        // Update display and save
        updateWinnersList();
        saveGameState();
        
        // Close modal
        closeWinnerModal();
        
        // Show confirmation
        alert(`Winner confirmed! ${player} has won with ${line}.`);
    }
    
    // Clear old state on page load to prevent conflicts
    window.addEventListener('beforeunload', function() {
        // Don't clear on host page - we want to keep the state
    });
});