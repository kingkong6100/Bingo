// Player Bingo Card Script
document.addEventListener('DOMContentLoaded', function() {
    // Player state
    let playerState = {
        card: [],
        markedNumbers: [],
        gameConnected: true,
        playerId: `P-${Math.floor(Math.random() * 1000)}`,
        lastSeenNumber: null,
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
    
    // Initialize player
    playerIdEl.textContent = playerState.playerId;
    generateBingoCard();
    
    // Start polling for host updates
    pollHostUpdates();
    
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
    function generateBingoCard() {
        // Clear current card
        playerState.card = [];
        playerState.markedNumbers = [];
        bingoCardEl.innerHTML = '';
        
        // Bingo columns: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
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
            
            // Get 5 unique numbers for this column (except center which is free)
            while (numbers.length < 5) {
                const num = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
                if (!numbers.includes(num)) {
                    numbers.push(num);
                }
            }
            
            // Sort numbers
            numbers.sort((a, b) => a - b);
            
            // Add to card
            for (let row = 0; row < 5; row++) {
                playerState.card.push({
                    row: row,
                    col: col,
                    letter: range.letter,
                    number: (row === 2 && col === 2) ? 'FREE' : numbers[row], // Center is free
                    marked: (row === 2 && col === 2) // Mark free space automatically
                });
            }
        }
        
        // Mark free space
        if (!playerState.markedNumbers.includes('FREE')) {
            playerState.markedNumbers.push('FREE');
        }
        
        // Render card
        renderBingoCard();
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
            
            // Add click event to mark/unmark (except free space)
            if (cell.number !== 'FREE') {
                cellEl.addEventListener('click', () => toggleMarkNumber(cell.number));
            }
            
            bingoCardEl.appendChild(cellEl);
        });
        
        updatePlayerDisplay();
    }
    
    function toggleMarkNumber(number) {
        const numberStr = number.toString();
        
        if (playerState.markedNumbers.includes(numberStr)) {
            // Unmark
            playerState.markedNumbers = playerState.markedNumbers.filter(n => n !== numberStr);
        } else {
            // Mark
            playerState.markedNumbers.push(numberStr);
        }
        
        // Update card display
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
    
    function pollHostUpdates() {
        // Poll for updates from host every second
        setInterval(() => {
            checkHostState();
        }, 1000);
        
        // Also check immediately
        checkHostState();
    }
    
    function checkHostState() {
        try {
            // Get current number from localStorage (set by host)
            const currentNumber = localStorage.getItem('bingoCurrentNumber');
            const drawnNumbersStr = localStorage.getItem('bingoDrawnNumbers');
            const lastUpdate = localStorage.getItem('bingoLastUpdate');
            
            if (currentNumber && currentNumber !== playerState.lastSeenNumber) {
                // New number drawn!
                playerState.lastSeenNumber = currentNumber;
                
                // Update display
                if (currentNumber !== '--') {
                    playerCurrentNumberEl.textContent = currentNumber;
                    playerCurrentNumberEl.style.transform = 'scale(1.2)';
                    playerCurrentNumberEl.style.color = '#FF5722';
                    
                    setTimeout(() => {
                        playerCurrentNumberEl.style.transform = 'scale(1)';
                        playerCurrentNumberEl.style.color = '#ffeb3b';
                    }, 500);
                    
                    // Check if this number is on the player's card
                    const hasNumber = playerState.card.some(cell => 
                        cell.number.toString() === currentNumber
                    );
                    
                    if (hasNumber) {
                        // Auto-mark the number (optional - can be commented out if players should mark manually)
                        if (!playerState.markedNumbers.includes(currentNumber)) {
                            playerState.markedNumbers.push(currentNumber);
                            updateCardMarkings();
                        }
                    }
                } else {
                    playerCurrentNumberEl.textContent = '--';
                }
                
                // Update connection status
                playerState.gameConnected = true;
                connectionStatusEl.className = 'connected';
                connectionStatusEl.innerHTML = '<i class="fas fa-wifi"></i> Connected';
            }
            
            // Update drawn numbers history
            if (drawnNumbersStr) {
                const drawnNumbers = JSON.parse(drawnNumbersStr);
                playerState.drawnNumbers = drawnNumbers;
                updatePlayerHistory();
                updatePlayerDisplay();
            }
            
            // Check if host is active (updated in last 10 seconds)
            if (lastUpdate) {
                const timeSinceUpdate = Date.now() - parseInt(lastUpdate);
                if (timeSinceUpdate > 10000) { // 10 seconds
                    playerState.gameConnected = false;
                    connectionStatusEl.className = 'disconnected';
                    connectionStatusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Host Not Responding';
                }
            }
            
        } catch (error) {
            console.error('Error checking host state:', error);
            playerState.gameConnected = false;
            connectionStatusEl.className = 'disconnected';
            connectionStatusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Connection Error';
        }
    }
    
    function updatePlayerDisplay() {
        // Update counts
        markedCountEl.textContent = playerState.markedNumbers.length;
        calledCountEl.textContent = playerState.drawnNumbers.length;
    }
    
    function updatePlayerHistory() {
        playerHistoryEl.innerHTML = '';
        
        if (!playerState.drawnNumbers || playerState.drawnNumbers.length === 0) {
            playerHistoryEl.innerHTML = '<p class="empty-history">No numbers drawn yet</p>';
            return;
        }
        
        // Show only the last 10 numbers
        const displayNumbers = playerState.drawnNumbers.slice(0, 10);
        
        displayNumbers.forEach(number => {
            const numberEl = document.createElement('div');
            numberEl.className = 'history-number';
            if (number === playerState.drawnNumbers[0]) {
                numberEl.classList.add('recent');
            }
            numberEl.textContent = number;
            numberEl.title = getNumberLabel(number);
            
            // Check if this number is on player's card
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
    
    function generateNewCard() {
        if (confirm("Generate a new Bingo card? Your current marks will be lost.")) {
            generateBingoCard();
        }
    }
    
    function showBingoCallModal() {
        // Check if player has at least 5 marks (including free space)
        if (playerState.markedNumbers.length < 5) {
            alert("You need to mark at least 5 numbers (including the free space) to call BINGO!");
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
    
    function callBingo() {
        const winningLine = document.getElementById('winning-line').value;
        const lineName = document.getElementById('winning-line').options[document.getElementById('winning-line').selectedIndex].text;
        
        // Save bingo call to localStorage for host to see
        const bingoCall = {
            playerId: playerState.playerId,
            line: lineName,
            timestamp: Date.now(),
            markedNumbers: playerState.markedNumbers
        };
        
        localStorage.setItem('bingoPlayerCall', JSON.stringify(bingoCall));
        
        // Close the call modal
        closeBingoCallModal();
        
        // Show success modal
        successModal.style.display = 'flex';
    }
});