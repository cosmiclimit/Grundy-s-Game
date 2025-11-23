document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selections ---
    const startGameBtn = document.getElementById('start-game-btn');
    const restartGameBtn = document.getElementById('restart-game-btn');
    const makeMoveBtn = document.getElementById('make-move-btn');
    const initialNumberInput = document.getElementById('initial-number');
    const gameSetupDiv = document.getElementById('game-setup');
    const gameBoardContainer = document.getElementById('game-board-container');
    const playerControlsDiv = document.getElementById('player-controls');
    const gameBoardDiv = document.getElementById('game-board');
    const gameMessageDiv = document.getElementById('game-message');
    const splitPart1Input = document.getElementById('split-part1');
    const splitPart2Input = document.getElementById('split-part2');
    const turnIndicator = document.getElementById('turn-indicator');
    const turnText = document.getElementById('turn-text');
    const rulesToggle = document.getElementById('rules-toggle');
    const rulesContent = document.getElementById('rules-content');
    const musicToggleBtn = document.getElementById('music-toggle-btn');

    // --- NEW: Modal Elements ---
    const gameOverModal = document.getElementById('game-over-modal');
    const winnerTitle = document.getElementById('winner-title');
    const winnerMessage = document.getElementById('winner-message');
    const modalRestartBtn = document.getElementById('modal-restart-btn');

    let heaps = [];
    let selectedHeap = null;
    let isAnimating = false;

    // --- Sound Manager Integration ---
    // Initialize background music when page loads
    // Note: Modern browsers may require user interaction before playing audio
    // The sound manager will handle this gracefully
    if (typeof soundManager !== 'undefined') {
        // Try to start background music
        soundManager.playBackgroundMusic();
        
        // Update music toggle button icon based on initial state
        updateMusicToggleIcon();
        
        // If autoplay is blocked, start music on first user interaction
        const startMusicOnInteraction = () => {
            soundManager.playBackgroundMusic();
            updateMusicToggleIcon();
            // Remove listeners after first interaction
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
        };
        
        // Add listeners for user interaction (fallback for autoplay restrictions)
        document.addEventListener('click', startMusicOnInteraction, { once: true });
        document.addEventListener('keydown', startMusicOnInteraction, { once: true });
    }

    // --- Music Toggle Functionality ---
    function updateMusicToggleIcon() {
        if (musicToggleBtn && typeof soundManager !== 'undefined') {
            const isMuted = soundManager.isMuted();
            const musicIcon = musicToggleBtn.querySelector('.music-icon');
            
            if (musicIcon) {
                musicIcon.textContent = isMuted ? '🔇' : '🔊';
            }
            
            if (isMuted) {
                musicToggleBtn.classList.add('muted');
            } else {
                musicToggleBtn.classList.remove('muted');
            }
        }
    }

    // Add event listener for music toggle button
    if (musicToggleBtn && typeof soundManager !== 'undefined') {
        musicToggleBtn.addEventListener('click', () => {
            soundManager.toggleMute();
            updateMusicToggleIcon();
        });
    }

    // --- Event Listeners ---
    startGameBtn.addEventListener('click', startGame);
    restartGameBtn.addEventListener('click', () => location.reload());
    makeMoveBtn.addEventListener('click', makePlayerMove);
    modalRestartBtn.addEventListener('click', () => location.reload()); // Reloads page on "Play Again"
    
    // Rules toggle functionality
    if (rulesToggle && rulesContent) {
        rulesToggle.addEventListener('click', () => {
            rulesContent.classList.toggle('collapsed');
            rulesToggle.classList.toggle('collapsed');
        });
    }

    // --- Game Logic Functions ---
    function startGame() {
        const number = parseInt(initialNumberInput.value);
        if (isNaN(number) || number <= 2) {
            displayMessage("Please enter a number greater than 2.", 'error');
            return;
        }
        
        fetch('/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: number }),
        })
        .then(response => response.json())
        .then(data => {
            heaps = data.heaps;
            updateGameBoard(); // Render the board immediately
            
            gameSetupDiv.classList.add('hidden');
            gameBoardContainer.classList.remove('hidden');
            restartGameBtn.classList.remove('hidden');

            // --- Check Coin Toss Result ---
            if (data.ai_started) {
                // AI won the toss and already moved.
                displayMessage("Coin Toss: AI won and moved first!", 'lose');
                updateTurnIndicator(true); // It is now Human's turn
            } else {
                // Human won the toss.
                displayMessage("Coin Toss: You won! You start.", 'win');
                updateTurnIndicator(true);
            }
        });
    }

    function makePlayerMove() {
        if (isAnimating) return;
        if (!selectedHeap) {
            displayMessage("Please select a heap to split.", 'error');
            return;
        }

        const part1 = parseInt(splitPart1Input.value);
        const part2 = parseInt(splitPart2Input.value);

        if (isNaN(part1) || isNaN(part2) || part1 <= 0 || part2 <= 0) {
            displayMessage("Please enter valid positive numbers for the split.", 'error');
            return;
        }
        if (part1 === part2) {
            displayMessage("The two parts must be of unequal size.", 'error');
            return;
        }
        if (part1 + part2 !== selectedHeap.value) {
            displayMessage(`The split must sum to the selected heap (${selectedHeap.value}).`, 'error');
            return;
        }

        // Animation & Logic
        isAnimating = true;
        playerControlsDiv.classList.add('hidden');
        
        const selectedIndex = parseInt(selectedHeap.element.dataset.index);
        const heapToSplit = selectedHeap.element;

        heapToSplit.classList.remove('selected');
        heapToSplit.classList.add('splitting-out');

        heapToSplit.addEventListener('animationend', () => {
            // Update local state
            let heapsAfterHumanMove = heaps.slice();
            heapsAfterHumanMove.splice(selectedIndex, 1, part1, part2);
            heaps = heapsAfterHumanMove;
            
            updateGameBoard(); // Redraw board

            // Send move to AI
            updateTurnIndicator(false);
            fetch('/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ heaps: heapsAfterHumanMove }),
            })
            .then(response => response.json())
            .then(data => {
                handleGameResponse(data);
            });
        }, { once: true });
    }

    function handleGameResponse(data) {
        // 1. Did Human Win?
        if (data.winner === 'human') {
            heaps = data.heaps;
            updateGameBoard();
            showGameOver('human'); // Show Popup
            isAnimating = false;
            return;
        }

        // 2. Animate AI Move
        const { source_heap_index } = data.ai_move;
        const currentHeapsOnBoard = Array.from(gameBoardDiv.children);
        const heapToSplit = currentHeapsOnBoard[source_heap_index];

        setTimeout(() => { if (heapToSplit) heapToSplit.classList.add('ai-selected'); }, 500);
        setTimeout(() => { if (heapToSplit) heapToSplit.classList.add('splitting-out'); }, 1500);

        setTimeout(() => {
            isAnimating = false;
            heaps = data.heaps;
            updateGameBoard();

            // 3. Did AI Win?
            if (data.winner === 'ai') {
                showGameOver('ai'); // Show Popup
            } else {
                updateTurnIndicator(true);
                playerControlsDiv.classList.remove('hidden');
            }
        }, 2200);
    }

    // --- Helper to Show the Pop-up ---
    function showGameOver(winner) {
        gameOverModal.classList.remove('hidden');
        if (winner === 'human') {
            winnerTitle.textContent = "You Won!";
            winnerMessage.textContent = "Your superior intellect has defeated the machine.";
            winnerTitle.style.color = "#2ecc71"; // Green
        } else {
            winnerTitle.textContent = "Game Over";
            winnerMessage.textContent = "The AI has trapped you. No moves left.";
            winnerTitle.style.color = "#e74c3c"; // Red
        }
        // Hide game controls so they can't click anything
        playerControlsDiv.classList.add('hidden');
        turnIndicator.classList.add('hidden');
    }

    // --- UI Update Functions ---
    function updateGameBoard() {
        gameBoardDiv.innerHTML = '';
        heaps.forEach((heapValue, index) => {
            const heapElement = document.createElement('div');
            heapElement.classList.add('heap');
            heapElement.textContent = heapValue;
            heapElement.dataset.index = index;

            if (heapValue > 2 && !isAnimating) {
                heapElement.addEventListener('click', () => selectHeap(heapElement, heapValue));
            } else {
                heapElement.style.cursor = 'not-allowed';
                // Visual cue for "dead" heaps
                if (heapValue <= 2) heapElement.style.opacity = "0.6";
            }
            gameBoardDiv.appendChild(heapElement);
        });
        
        splitPart1Input.value = '';
        splitPart2Input.value = '';
        selectedHeap = null;
    }

    function selectHeap(heapElement, heapValue) {
        if (isAnimating) return;
        if (heapElement.classList.contains('selected')) {
            heapElement.classList.remove('selected');
            selectedHeap = null;
            return;
        }
        if (selectedHeap) {
            selectedHeap.element.classList.remove('selected');
        }
        heapElement.classList.add('selected');
        selectedHeap = { element: heapElement, value: heapValue };
    }

    function displayMessage(message, type = '') {
        gameMessageDiv.textContent = message;
        gameMessageDiv.className = 'game-message';
        if (type === 'win') gameMessageDiv.classList.add('message-win');
        else if (type === 'lose' || type === 'error') gameMessageDiv.classList.add('message-lose');
    }
    
    function updateTurnIndicator(isPlayerTurn) {
        if (isPlayerTurn) {
            turnText.textContent = "Your Turn";
            turnIndicator.style.backgroundColor = '#2ecc71'; // Green
            turnIndicator.style.color = '#fff';
        } else {
            turnText.textContent = "AI is Thinking...";
            turnIndicator.style.backgroundColor = '#e74c3c'; // Red
            turnIndicator.style.color = '#fff';
        }
    }
});
