// iPod Music Player Module

export class iPodMusicPlayer {
    constructor() {
        this.isPlaying = false;
        this.currentTrackIndex = 0;
        this.playlist = [];
        this.audio = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.volume = 0.7;
        this.currentTime = 0;
        this.duration = 0;
        this.operationInProgress = false; // Mutex for operations
        this.pendingOperations = []; // Queue for pending operations
        this.isShuffled = false;
        this.isRepeatOn = false;
        this.originalPlaylistOrder = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadDefaultPlaylist();
        this.initializeAudio();
    }

    initializeElements() {
        this.window = document.getElementById('ipod-window');
        this.header = document.getElementById('ipod-header');
        this.audio = document.getElementById('audio');
        
        // Control buttons
        this.playPauseBtn = document.getElementById('play-pause');
        this.prevBtn = document.getElementById('prev-track');
        this.nextBtn = document.getElementById('next-track');
        this.minimizeBtn = document.getElementById('minimize-ipod');
        this.closeBtn = document.getElementById('close-ipod');
        
        // iPod navigation
        this.navLeft = document.getElementById('nav-left');
        this.navRight = document.getElementById('nav-right');
        this.navUp = document.getElementById('nav-up');
        this.navDown = document.getElementById('nav-down');
        this.selectBtn = document.getElementById('select-btn');
        this.menuBtn = document.getElementById('menu-btn');
        
        // Display elements
        this.trackTitle = document.getElementById('current-track-title');
        this.artistName = document.getElementById('current-artist');
        this.currentTimeDisplay = document.getElementById('current-time');
        this.durationDisplay = document.getElementById('duration');
        this.progressBar = document.getElementById('progress-bar-container');
        this.progressFill = document.getElementById('progress-fill');
        this.albumArt = document.getElementById('album-art-img');
        
        // Volume control
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeDisplay = document.getElementById('volume-display');
        
        // Screen playlist (will be created dynamically)
        this.screenPlaylist = null;
        this.showingPlaylist = false;
        
        // Taskbar button
        this.taskbarBtn = document.getElementById('music-btn');
    }

    setupEventListeners() {
        // Window controls are now handled by taskbar.js
        // Prevent event propagation to avoid conflicts with taskbar.js
        this.minimizeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        this.closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        this.header.addEventListener('mousedown', (e) => e.stopPropagation());
        this.window.addEventListener('mousedown', (e) => e.stopPropagation());
        
        // Music controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // iPod navigation
        this.navUp.addEventListener('click', () => this.navigateUp());
        this.navDown.addEventListener('click', () => this.navigateDown());
        this.navLeft.addEventListener('click', () => this.toggleShuffle());
        this.navRight.addEventListener('click', () => this.toggleRepeat());
        // Bind the Spotify button click handler with proper 'this' context
        this.spotifyBtn = document.getElementById('select-btn');
        this.spotifyBtn.addEventListener('click', (e) => this.handleSpotifyButton(e));
        this.menuBtn.addEventListener('click', () => this.showMenu());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => this.updateVolume(e));
        
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.nextTrack());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        
        // Window focus is now handled by taskbar.js
    }

    updateTrackInfo(index) {
        if (!this.playlist || index >= this.playlist.length) return;
        
        const track = this.playlist[index];
        if (!track) return;
        
        this.trackTitle.textContent = track.title || 'Unknown Title';
        this.artistName.textContent = track.artist || 'Unknown Artist';
        
        // Update the audio source
        if (this.audio.src !== track.src) {
            this.audio.src = track.src;
        }
        
        // Reset progress bar
        this.progressFill.style.width = '0%';
        this.currentTimeDisplay.textContent = '0:00';
        
        // Update duration when metadata is loaded
        this.audio.onloadedmetadata = () => {
            this.durationDisplay.textContent = this.formatTime(this.audio.duration);
        };
    }
    
    loadDefaultPlaylist() {
        // Get audio elements from the DOM
        const audioElements = document.querySelectorAll('#playlist-audios audio');
        
        if (audioElements.length === 0) {
            console.error('No audio elements found in #playlist-audios');
            return;
        }

        // Create playlist from audio elements in the DOM
        this.playlist = Array.from(audioElements).map(audio => ({
            title: audio.dataset.title || 'Unknown Track',
            artist: audio.dataset.artist || 'Unknown Artist',
            src: audio.src,
            duration: "--:--",
            albumArt: audio.dataset.albumart || 'images/albumart/default.jpg',
            spotifyUrl: audio.dataset.spotifyurl || ''
        }));
        
        console.log('Loaded playlist from HTML:', this.playlist);
        this.playlistData = [...this.playlist]; // Keep both playlists in sync
        this.selectedIndex = 0;
        this.currentTrackIndex = 0;
        
        // Initialize the first track
        if (this.playlist.length > 0) {
            this.updateTrackInfo(0);
        }
    }

    renderScreenPlaylist() {
        if (!this.screenPlaylist || this.playlistData.length === 0) {
            if (this.screenPlaylist) {
                this.screenPlaylist.innerHTML = '<div style="text-align: center; color: #666; padding: 10px;">No tracks available</div>';
            }
            return;
        }

        const playlistHTML = this.playlistData.map((track, index) => {
            const isSelected = index === this.selectedIndex;
            const isPlaying = index === this.currentTrackIndex && this.isPlaying;
            const classes = ['screen-playlist-item'];
            
            if (isSelected) classes.push('selected');
            if (isPlaying) classes.push('playing');
            
            return `
                <div class="${classes.join(' ')}" data-index="${index}">
                    <div class="screen-track-name">${track.title}</div>
                    <div class="screen-track-duration">${track.duration || '0:00'}</div>
                </div>
            `;
        }).join('');

        this.screenPlaylist.innerHTML = playlistHTML;

        // Add click listeners to playlist items
        this.screenPlaylist.querySelectorAll('.screen-playlist-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.selectedIndex = index;
                this.loadTrack(index);
                if (!this.isPlaying) {
                    this.togglePlayPause();
                }
                this.renderScreenPlaylist();
            });
        });
    }

    initializeAudio() {
        // Ensure audio element exists
        if (!this.audio) {
            this.audio = document.createElement('audio');
            document.body.appendChild(this.audio);
            
            // Set up audio event listeners
            this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            this.audio.addEventListener('ended', () => this.nextTrack());
            this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        }
        
        this.audio.volume = this.volume;
        
        // Initialize the first track if we have a playlist
        if (this.playlist && this.playlist.length > 0) {
            this.loadTrack(0);
        }
    }

    async executeWithMutex(operation) {
        if (this.operationInProgress) {
            // Queue the operation if another is in progress
            return new Promise(resolve => {
                this.pendingOperations.push(() => {
                    return operation().finally(resolve);
                });
            });
        }

        this.operationInProgress = true;
        try {
            const result = await operation();
            return result;
        } finally {
            this.operationInProgress = false;
            // Process next operation in queue if any
            const nextOp = this.pendingOperations.shift();
            if (nextOp) {
                nextOp();
            }
        }
    }

    async loadTrack(index) {
        if (!this.playlist || index < 0 || index >= this.playlist.length) {
            return;
        }
        
        const track = this.playlist[index];
        const wasPlaying = this.isPlaying;
        
        // Ensure audio element exists
        if (!this.audio) {
            this.audio = document.createElement('audio');
            document.body.appendChild(this.audio);
            
            // Set up event listeners if they don't exist
            this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            this.audio.addEventListener('ended', () => this.nextTrack());
            this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        }
        
        // Get album art elements
        const albumArtImg = document.getElementById('album-art-img');
        const albumArtPlaceholder = document.querySelector('.album-art-placeholder');
        
        // Update track info
        if (this.trackTitle) this.trackTitle.textContent = track.title || 'Unknown Title';
        if (this.artistName) this.artistName.textContent = track.artist || 'Unknown Artist';
        
        // Handle album art with improved loading and error handling
        if (track.albumArt && albumArtImg && albumArtPlaceholder) {
            console.log('Loading album art:', track.albumArt);
            
            // Reset classes and state
            albumArtImg.classList.remove('loaded');
            
            // Set up load and error handlers
            const onLoad = () => {
                console.log('Album art loaded successfully');
                albumArtImg.classList.add('loaded');
                albumArtPlaceholder.style.display = 'none';
            };
            
            const onError = () => {
                console.error('Failed to load album art:', track.albumArt);
                albumArtImg.classList.remove('loaded');
                albumArtPlaceholder.style.display = 'flex';
            };
            
            // Set up one-time event listeners
            albumArtImg.onload = onLoad;
            albumArtImg.onerror = onError;
            
            // Set the source (this will trigger loading)
            albumArtImg.src = track.albumArt;
            
            // Check if image is already in cache
            if (albumArtImg.complete) {
                onLoad();
            }
        } else if (!track.albumArt && albumArtPlaceholder) {
            console.log('No album art specified for track');
            albumArtPlaceholder.style.display = 'flex';
            if (albumArtImg) {
                albumArtImg.classList.remove('loaded');
            }
        }
        
        // Validate MP3 format
        if (!track.src.endsWith('.mp3')) {
            this.handleAudioError({ target: { error: { code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED } } });
            return;
        }
        
        // Check if file exists and is accessible
        try {
            const response = await fetch(track.src, { method: 'HEAD' });
            if (!response.ok) {
                this.handleAudioError({ target: { error: { code: MediaError.MEDIA_ERR_NETWORK } } });
                return;
            }
            
            // Get file size
            const fileSize = response.headers.get('content-length');
            if (fileSize && parseInt(fileSize) <= 0) {
                this.handleAudioError({ target: { error: { code: MediaError.MEDIA_ERR_DECODE } } });
                return;
            }
            
            // Update track index
            this.currentTrackIndex = index;
            
            // Update screen playlist if it's currently showing
            if (this.showingPlaylist && this.screenPlaylist) {
                this.renderScreenPlaylist();
            }
            
            // Pause current audio and reset state
            if (this.audio) {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.audio.removeAttribute('src');
                this.audio.load();
            }
            
            // Set the new source and wait for it to be ready
            this.audio.src = track.src;
            
            try {
                // Wait for the audio to be ready to play
                await new Promise((resolve, reject) => {
                    const onCanPlay = () => {
                        this.audio.removeEventListener('canplay', onCanPlay);
                        this.audio.removeEventListener('error', onError);
                        resolve();
                    };
                    
                    const onError = (e) => {
                        this.audio.removeEventListener('canplay', onCanPlay);
                        this.audio.removeEventListener('error', onError);
                        reject(e);
                    };
                    
                    this.audio.addEventListener('canplay', onCanPlay, { once: true });
                    this.audio.addEventListener('error', onError, { once: true });
                    
                    // Load the new source
                    this.audio.load();
                });
                
                // If we were playing, start the new track
                if (wasPlaying) {
                    try {
                        const playPromise = this.audio.play();
                        if (playPromise !== undefined) {
                            await playPromise;
                            this.isPlaying = true;
                            this.updatePlayPauseButton(false);
                        }
                    } catch (e) {
                        console.error('Error playing audio:', e);
                        this.isPlaying = false;
                        this.updatePlayPauseButton(true);
                        throw e; // Re-throw to be caught by outer try-catch
                    }
                } else {
                    this.updatePlayPauseButton(true);
                }
                
            } catch (e) {
                console.error('Error loading audio source:', e);
                this.isPlaying = false;
                this.updatePlayPauseButton(true);
                this.handleAudioError(e);
            }
            
        } catch (error) {
            console.error('Error loading track:', error);
            this.handleAudioError({ target: { error: { code: MediaError.MEDIA_ERR_NETWORK } } });
        }
    }

    updatePlayPauseButton(showPlay) {
        console.log('DEBUG: updatePlayPauseButton called with showPlay:', showPlay, 'current isPlaying:', this.isPlaying);
        // Make sure we have the latest references to the buttons
        this.playPauseBtn = document.getElementById('play-pause');
        if (!this.playPauseBtn) {
            console.error('Play/Pause button not found in DOM');
            return;
        }
        
        // Try to find the images by class first
        let playIcon = this.playPauseBtn.querySelector('.play-icon');
        let pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
        
        // If not found by class, try by alt attribute
        if (!playIcon || !pauseIcon) {
            playIcon = this.playPauseBtn.querySelector('img[alt="Play"]');
            pauseIcon = this.playPauseBtn.querySelector('img[alt="Pause"]');
        }
        
        // If we found the icons, use them
        if (playIcon && pauseIcon) {
            playIcon.style.display = showPlay ? 'block' : 'none';
            pauseIcon.style.display = showPlay ? 'none' : 'block';
            this.playPauseBtn.dataset.state = showPlay ? 'play' : 'pause';
        } else {
            // Fallback: preserve existing content and just set data attributes
            console.warn('Play/Pause button icons not found - using data attributes for CSS styling');
            this.playPauseBtn.dataset.state = showPlay ? 'play' : 'pause';
            this.playPauseBtn.setAttribute('data-fallback', showPlay ? 'play' : 'pause');
        }
    }
    
    async togglePlayPause() {
        if (!this.playlist || this.playlist.length === 0) {
            console.warn('No tracks in playlist');
            return;
        }
        
        return this.executeWithMutex(async () => {
            try {
                if (this.isPlaying) {
                    this.audio.pause();
                    this.isPlaying = false;
                    this.updatePlayPauseButton(true);
                } else {
                    // If we don't have a track loaded, load the first one
                    if (this.currentTrackIndex === -1 && this.playlist.length > 0) {
                        await this.loadTrack(0);
                    }
                    await this.audio.play();
                    this.isPlaying = true;
                    this.updatePlayPauseButton(false);
                }
                
                // Update screen playlist if it's currently showing
                if (this.showingPlaylist && this.screenPlaylist) {
                    this.renderScreenPlaylist();
                }
            } catch (e) {
                console.error('Error toggling play/pause:', e);
                this.handleAudioError(e);
                this.isPlaying = false;
                this.updatePlayPauseButton(true);
                throw e;
            }
        });
    }

    async previousTrack() {
        if (!this.playlist || this.playlist.length === 0) {
            console.warn('No tracks in playlist');
            return;
        }
        
        const prevIndex = this.currentTrackIndex > 0 ? this.currentTrackIndex - 1 : this.playlist.length - 1;
        await this.loadTrack(prevIndex);
        
        // If we were playing, continue playing the previous track
        if (this.isPlaying) {
            try {
                await this.audio.play();
            } catch (e) {
                console.error('Error playing previous track:', e);
                this.handleAudioError(e);
            }
        }
    }

    async nextTrack() {
        if (!this.playlist || this.playlist.length === 0) {
            console.warn('No tracks in playlist');
            return;
        }
        
        let nextIndex;
        if (this.isShuffled) {
            // Get a random index different from the current one
            do {
                nextIndex = Math.floor(Math.random() * this.playlist.length);
            } while (nextIndex === this.currentTrackIndex && this.playlist.length > 1);
        } else {
            nextIndex = this.currentTrackIndex < this.playlist.length - 1 ? this.currentTrackIndex + 1 : 0;
        }
        
        await this.loadTrack(nextIndex);
        
        // If we were playing, continue playing the next track
        if (this.isPlaying) {
            try {
                await this.audio.play();
            } catch (e) {
                console.error('Error playing next track:', e);
                this.handleAudioError(e);
            }
        }
    }

    navigateUp() {
        if (this.selectedIndex > 0) {
            this.selectedIndex--;
            this.renderPlaylist();
            this.scrollToSelected();
        }
    }

    navigateDown() {
        if (this.selectedIndex < this.playlistData.length - 1) {
            this.selectedIndex++;
            this.renderPlaylist();
            this.scrollToSelected();
        }
    }

    navigateLeft() {
        this.previousTrack();
    }

    navigateRight() {
        this.nextTrack();
    }

    selectItem() {
        if (this.playlistData.length === 0) return;
        
        this.loadTrack(this.selectedIndex);
        if (!this.isPlaying) {
            this.togglePlayPause();
        }
    }

    showMenu() {
        // Toggle playlist display in the iPod screen
        this.showingPlaylist = !this.showingPlaylist;
        
        if (this.showingPlaylist) {
            this.createScreenPlaylist();
            this.renderScreenPlaylist();
        } else {
            this.removeScreenPlaylist();
        }
    }
    
    createScreenPlaylist() {
        // Create playlist overlay in the iPod screen if it doesn't exist
        if (!this.screenPlaylist) {
            const ipodScreen = document.querySelector('.ipod-screen');
            this.screenPlaylist = document.createElement('div');
            this.screenPlaylist.className = 'screen-playlist';
            
            // Add header with close button
            const header = document.createElement('div');
            header.className = 'playlist-overlay-header';
            header.innerHTML = `
                <div class="playlist-title">Playlist</div>
                <button class="close-playlist" onclick="window.iPodPlayer.showMenu()">×</button>
            `;
            this.screenPlaylist.appendChild(header);
            
            ipodScreen.appendChild(this.screenPlaylist);
        }
        this.screenPlaylist.classList.add('active');
    }
    
    removeScreenPlaylist() {
        if (this.screenPlaylist) {
            this.screenPlaylist.classList.remove('active');
        }
    }
    
    updateVolume(e) {
        const volume = e.target.value / 100;
        this.volume = volume;
        this.audio.volume = volume;
        this.volumeDisplay.textContent = e.target.value + '%';
    }

    scrollToSelected() {
        const selectedItem = this.playlist.querySelector('.playlist-item.selected');
        if (selectedItem) {
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    seekTo(e) {
        if (!this.audio.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * this.audio.duration;
        
        this.audio.currentTime = newTime;
    }

    updateDuration() {
        this.duration = this.audio.duration;
        this.durationDisplay.textContent = this.formatTime(this.duration);
    }

    updateProgress() {
        this.currentTime = this.audio.currentTime;
        this.currentTimeDisplay.textContent = this.formatTime(this.currentTime);
        
        if (this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            this.progressFill.style.width = percentage + '%';
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    handleSpotifyButton(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!this.playlist || this.playlist.length === 0) {
            console.warn('No track is currently selected');
            return;
        }
        
        const currentTrack = this.playlist[this.currentTrackIndex];
        if (!currentTrack.spotifyUrl) {
            console.warn('No Spotify URL available for this track');
            return;
        }
        
        // Open the Spotify URL in a new tab
        window.open(currentTrack.spotifyUrl, '_blank', 'noopener,noreferrer');
    }

    handleAudioError(e) {
        // Get detailed error information
        const error = e.target.error;
        const errorDetails = {
            code: error?.code,
            message: error?.message,
            currentSrc: this.audio.src,
            trackIndex: this.currentTrackIndex,
            trackTitle: this.playlist[this.currentTrackIndex]?.title
        };

        console.error('Audio error details:', errorDetails);
        
        // More descriptive error messages based on error type
        let errorMessage = 'Error loading track';
        let errorDetailsText = '';

        switch (error?.code) {
            case MediaError.MEDIA_ERR_ABORTED:
                errorMessage = 'Track loading was aborted';
                break;
            case MediaError.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error loading track';
                errorDetailsText = 'Please check your internet connection';
                break;
            case MediaError.MEDIA_ERR_DECODE:
                errorMessage = 'Error decoding track';
                errorDetailsText = 'The audio format may not be supported';
                break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Audio format not supported';
                errorDetailsText = 'Please check the audio file format';
                break;
            default:
                errorMessage = 'Unknown error loading track';
                errorDetailsText = 'Please check the audio file and try again';
        }

        this.trackTitle.textContent = errorMessage;
        this.artistName.textContent = errorDetailsText;
        this.isPlaying = false;
        this.updatePlayPauseButton(true);

        // Try to load the next track if available
        if (this.playlist.length > this.currentTrackIndex + 1) {
            setTimeout(() => {
                this.nextTrack();
            }, 1000); // Small delay to avoid rapid errors
        }
    }

    // Window management is now handled by taskbar.js
}

// The class is already defined at the top of the file
// Make the iPodMusicPlayer class available globally for taskbar.js
window.iPodMusicPlayer = iPodMusicPlayer;

// Initialize the music player when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already done by taskbar.js
    if (!window.iPodPlayer) {
        window.iPodPlayer = new iPodMusicPlayer();
    }
    
    // Initially hide the window - taskbar will handle showing it
    const ipodWindow = document.getElementById('ipod-window');
    if (ipodWindow) {
        ipodWindow.style.display = 'none';
    }
});
