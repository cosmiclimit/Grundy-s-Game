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
            updateGameBoard();
            gameSetupDiv.classList.add('hidden');
            gameBoardContainer.classList.remove('hidden');
            restartGameBtn.classList.remove('hidden');
            updateTurnIndicator(true);
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

        // --- Player Move Animation Logic ---
        isAnimating = true;
        playerControlsDiv.classList.add('hidden');
        
        const selectedIndex = parseInt(selectedHeap.element.dataset.index);
        const heapToSplit = selectedHeap.element;

        // Animate the player's split
        heapToSplit.classList.remove('selected');
        heapToSplit.classList.add('splitting-out');

        heapToSplit.addEventListener('animationend', () => {
            // Update the underlying data array *after* the animation is done
            let heapsAfterHumanMove = heaps.slice();
            heapsAfterHumanMove.splice(selectedIndex, 1, part1, part2);
            heaps = heapsAfterHumanMove; // Update global state
            
            // Redraw the board to reflect the player's move cleanly
            updateGameBoard();

            // NOW, ask the AI for its move
            updateTurnIndicator(false);
            fetch('/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ heaps: heapsAfterHumanMove }),
            })
            .then(response => response.json())
            .then(data => {
                animateAIMove(data);
            });
        }, { once: true });
    }

    function animateAIMove(data) {
        if (data.winner === 'human') {
            heaps = data.heaps;
            updateGameBoard();
            displayMessage("Congratulations! You made the final move. You Win!", 'win');
            endGame();
            isAnimating = false;
            return;
        }

        const { source_heap_index } = data.ai_move;
        const currentHeapsOnBoard = Array.from(gameBoardDiv.children);
        const heapToSplit = currentHeapsOnBoard[source_heap_index];

        setTimeout(() => {
            if (heapToSplit) heapToSplit.classList.add('ai-selected');
        }, 500);

        setTimeout(() => {
            if (heapToSplit) heapToSplit.classList.add('splitting-out');
        }, 1500);

        setTimeout(() => {
            isAnimating = false;
            heaps = data.heaps;
            updateGameBoard();

            if (data.winner === 'ai') {
                // Use the new, more descriptive losing message
                displayMessage("No more moves are possible for you. The AI wins!", 'lose');
                endGame();
            } else {
                updateTurnIndicator(true);
                playerControlsDiv.classList.remove('hidden');
            }
        }, 2200);
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
            turnText.textContent = "Your Turn: Select a heap and enter a split";
            turnIndicator.style.backgroundColor = 'var(--success-color)';
            displayMessage("");
        } else {
            turnText.textContent = "AI is Thinking...";
            turnIndicator.style.backgroundColor = 'var(--message-ai-turn)';
        }
    }

    function endGame() {
        playerControlsDiv.classList.add('hidden');
        turnIndicator.classList.add('hidden');
        isAnimating = true;
    }
});