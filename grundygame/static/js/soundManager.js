/**
 * Sound Manager Module
 * 
 * A flexible and structured audio management system for the Grundy's Game.
 * Handles background music, sound effects, and audio state management.
 * 
 * Features:
 * - Centralized audio control
 * - Easy to add new sounds
 * - Volume control
 * - Mute/unmute functionality
 * - Prevents audio conflicts
 */

class SoundManager {
    constructor() {
        // Audio configuration
        this.config = {
            backgroundVolume: 0.5,  // 0.0 to 1.0
            effectsVolume: 0.7,      // 0.0 to 1.0
            enabled: true            // Master enable/disable
        };

        // Audio file paths (relative to static directory)
        this.audioFiles = {
            background: 'audio/game_background_effect.mp3',
            gameStart: 'audio/game_start_effect.mp3',
            playerMove: 'audio/player_move_effect.mp3',
            aiThinking: null,  // Can be added later
            win: 'audio/game_win_effect.mp3',
            lose: 'audio/game_loose_sound_effect.mp3'
        };

        // Audio instances storage
        this.audioInstances = {};
        
        // Current playing background music
        this.currentBackgroundMusic = null;
        
        // Initialize audio instances
        this._initializeAudio();
    }

    /**
     * Initialize all audio instances
     * @private
     */
    _initializeAudio() {
        // Create background music instance
        if (this.audioFiles.background) {
            this.audioInstances.background = this._createAudioInstance(
                this.audioFiles.background,
                { loop: true, volume: this.config.backgroundVolume }
            );
        }

        // Create sound effect instances (one-time play)
        Object.keys(this.audioFiles).forEach(key => {
            if (key !== 'background' && this.audioFiles[key]) {
                this.audioInstances[key] = this._createAudioInstance(
                    this.audioFiles[key],
                    { loop: false, volume: this.config.effectsVolume }
                );
            }
        });
    }

    /**
     * Create an audio instance with configuration
     * @param {string} src - Path to audio file
     * @param {Object} options - Audio options (loop, volume)
     * @returns {HTMLAudioElement} Audio element
     * @private
     */
    _createAudioInstance(src, options = {}) {
        const audio = new Audio();
        audio.src = this._getAudioUrl(src);
        audio.loop = options.loop || false;
        audio.volume = options.volume !== undefined ? options.volume : 1.0;
        audio.preload = 'auto';
        
        // Error handling
        audio.addEventListener('error', (e) => {
            console.warn(`Audio file failed to load: ${src}`, e);
        });

        return audio;
    }

    /**
     * Get the full URL for an audio file
     * @param {string} relativePath - Relative path from static directory
     * @returns {string} Full URL
     * @private
     */
    _getAudioUrl(relativePath) {
        // Get base URL from current page
        const baseUrl = window.location.origin;
        // Construct path (assuming Flask static files are served from /static/)
        return `${baseUrl}/static/${relativePath}`;
    }

    /**
     * Play background music
     * Stops any currently playing background music first
     */
    playBackgroundMusic() {
        if (!this.config.enabled) return;
        
        // Ensure we have the audio instance reference
        if (!this.audioInstances.background) {
            return;
        }
        
        // If we already have a reference, just resume if paused
        if (this.currentBackgroundMusic === this.audioInstances.background) {
            if (this.currentBackgroundMusic.paused) {
                this.currentBackgroundMusic.volume = this.config.backgroundVolume;
                this.currentBackgroundMusic.play().catch(error => {
                    console.log('Background music autoplay prevented. User interaction required.');
                });
            }
            return;
        }
        
        // Stop any existing background music (pauses but keeps reference)
        if (this.currentBackgroundMusic && this.currentBackgroundMusic !== this.audioInstances.background) {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
        }
        
        // Set up and play the background music
        this.currentBackgroundMusic = this.audioInstances.background;
        this.currentBackgroundMusic.volume = this.config.backgroundVolume;
        
        // Play with error handling (browser autoplay policies)
        this.currentBackgroundMusic.play().catch(error => {
            console.log('Background music autoplay prevented. User interaction required.');
            // Music will play when user interacts with the page
        });
    }

    /**
     * Stop background music
     */
    stopBackgroundMusic() {
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.pause();
            this.currentBackgroundMusic.currentTime = 0;
            // Keep the reference so we can resume later
            // Don't set to null - this allows toggle to work properly
        }
    }

    /**
     * Play a sound effect
     * @param {string} soundName - Name of the sound (e.g., 'gameStart', 'playerMove')
     */
    playSound(soundName) {
        if (!this.config.enabled) return;
        
        const audio = this.audioInstances[soundName];
        if (audio) {
            // Reset to beginning if already playing
            audio.currentTime = 0;
            audio.volume = this.config.effectsVolume;
            
            audio.play().catch(error => {
                console.log(`Sound effect "${soundName}" could not play:`, error);
            });
        } else {
            console.warn(`Sound effect "${soundName}" not found or not initialized.`);
        }
    }

    /**
     * Set master volume for background music
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setBackgroundVolume(volume) {
        this.config.backgroundVolume = Math.max(0, Math.min(1, volume));
        if (this.currentBackgroundMusic) {
            this.currentBackgroundMusic.volume = this.config.backgroundVolume;
        }
    }

    /**
     * Set master volume for sound effects
     * @param {number} volume - Volume level (0.0 to 1.0)
     */
    setEffectsVolume(volume) {
        this.config.effectsVolume = Math.max(0, Math.min(1, volume));
        // Update all effect instances
        Object.keys(this.audioInstances).forEach(key => {
            if (key !== 'background' && this.audioInstances[key]) {
                this.audioInstances[key].volume = this.config.effectsVolume;
            }
        });
    }

    /**
     * Enable/disable all sounds
     * @param {boolean} enabled - True to enable, false to disable
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        if (!enabled) {
            this.stopBackgroundMusic();
        }
    }

    /**
     * Toggle mute state of background music
     * @returns {boolean} Current mute state (true if muted, false if playing)
     */
    toggleMute() {
        // Ensure we have a reference to the background music
        if (!this.currentBackgroundMusic && this.audioInstances.background) {
            this.currentBackgroundMusic = this.audioInstances.background;
        }
        
        if (this.currentBackgroundMusic) {
            if (this.currentBackgroundMusic.paused) {
                // Resume playing
                this.currentBackgroundMusic.volume = this.config.backgroundVolume;
                this.currentBackgroundMusic.play().catch(error => {
                    console.log('Background music could not play:', error);
                });
                return false; // Not muted
            } else {
                // Pause playing
                this.currentBackgroundMusic.pause();
                return true; // Muted
            }
        } else {
            // If no background music instance exists, try to start it
            if (this.audioInstances.background) {
                this.playBackgroundMusic();
                return false; // Not muted
            }
            return true; // Muted (no music available)
        }
    }

    /**
     * Check if background music is currently muted/paused
     * @returns {boolean} True if muted/paused, false if playing
     */
    isMuted() {
        if (this.currentBackgroundMusic) {
            return this.currentBackgroundMusic.paused;
        }
        return true; // Consider muted if no music instance
    }

    /**
     * Add a new sound effect dynamically
     * Useful for future expansion
     * @param {string} name - Name identifier for the sound
     * @param {string} filePath - Path to audio file (relative to static/)
     * @param {Object} options - Audio options
     */
    addSound(name, filePath, options = {}) {
        this.audioFiles[name] = filePath;
        this.audioInstances[name] = this._createAudioInstance(
            filePath,
            {
                loop: options.loop || false,
                volume: options.volume !== undefined ? options.volume : this.config.effectsVolume
            }
        );
    }

    /**
     * Get current configuration
     * @returns {Object} Current sound configuration
     */
    getConfig() {
        return { ...this.config };
    }
}

// Create a singleton instance
const soundManager = new SoundManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = soundManager;
}

