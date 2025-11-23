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
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const currentTheme = localStorage.getItem('theme');
    const modal = document.getElementById('end-game-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalPlayAgainBtn = document.getElementById('modal-play-again-btn');
const gameBoard = document.getElementById('game-board'); // Make sure you have this
    // Apply the saved theme on page load
    // Function to apply the theme
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    };
    let heaps = [];
    let selectedHeap = null;
    let isAnimating = false;

    // Check for a saved theme in local storage or user's system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    // Event listener for the theme toggle button
    themeToggleBtn.addEventListener('click', () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (isDarkMode) {
            applyTheme('light');
            localStorage.setItem('theme', 'light');
        } else {
            applyTheme('dark');
            localStorage.setItem('theme', 'dark');
        }
    });
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
    function showEndGameModal(isPlayerWinner) {
    // Clear any old confetti
    document.querySelector('.confetti-container').innerHTML = '';

    if (isPlayerWinner) {
        modal.classList.add('win');
        modal.classList.remove('lose');
        modalTitle.textContent = 'You Win!';
        modalMessage.textContent = 'Congratulations! You outsmarted the AI.';
        // Trigger confetti
        createConfetti();
    } else {
        modal.classList.add('lose');
        modal.classList.remove('win');
        modalTitle.textContent = 'AI Wins!';
        modalMessage.textContent = 'The AI was one step ahead. Better luck next time!';
    }
    modal.classList.remove('hidden');
}
    function createConfetti() {
    const confettiContainer = document.querySelector('.confetti-container');
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'];
    
    for (let i = 0; i < 100; i++) {
        const confettiPiece = document.createElement('div');
        confettiPiece.classList.add('confetti');
        confettiPiece.style.left = `${Math.random() * 100}vw`;
        confettiPiece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confettiPiece.style.animationDelay = `${Math.random() * 5}s`;
        // Vary size for a more realistic effect
        const size = Math.random() * 10 + 5;
        confettiPiece.style.width = `${size}px`;
        confettiPiece.style.height = `${size}px`;

        confettiContainer.appendChild(confettiPiece);
    }
}
    modalPlayAgainBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    startGame(); // Assuming your restart function is named this
});
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

        // --- NEW: Randomize Starting Turn ---
        const isPlayerTurnFirst = Math.random() < 0.5;

        if (isPlayerTurnFirst) {
            // Player's turn to start
            updateTurnIndicator(true);
            displayMessage("The coin toss decided: You start first!", 'info');
        } else {
            // AI's turn to start
            updateTurnIndicator(false);
            displayMessage("The coin toss decided: The AI starts first!", 'info');
            playerControlsDiv.classList.add('hidden'); // Hide controls
            gameBoard.classList.add('ai-thinking');   // Start thinking animation

            // Give the player a moment to see the AI is starting
            setTimeout(() => {
                // The AI makes the very first move
                fetch('/move', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ heaps: heaps }),
                })
                .then(response => response.json())
                .then(aiMoveData => {
                    animateAIMove(aiMoveData);
                });
            }, 1500); // 1.5-second delay for better UX
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
            gameBoard.classList.add('ai-thinking'); // NEW: Start the "AI thinking" animation
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
            showEndGameModal(true); // MODIFIED: Show the "You Win!" modal
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
            gameBoard.classList.remove('ai-thinking'); // NEW: Stop the "AI thinking" animation
            updateGameBoard();

            if (data.winner === 'ai') {
                // Use the new, more descriptive losing message
                showEndGameModal(false); // MODIFIED: Show the "AI Wins!" modal
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
    gameMessageDiv.className = 'game-message'; // Reset classes first
    if (type === 'win') {
        gameMessageDiv.classList.add('message-win');
    } else if (type === 'lose' || type === 'error') {
        gameMessageDiv.classList.add('message-lose');
    } else if (type === 'info') { // ADDED THIS CONDITION
        gameMessageDiv.classList.add('message-info');
    }
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