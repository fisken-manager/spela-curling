export class ScrollController {
    constructor(state, audioController) {
        this.state = state;
        this.audio = audioController;
        this.contentElement = document.getElementById('content');
        this.lastProgress = 0;
        this.initialScrollOffset = 0.02; // Start scrolled up so stone is near top hog line
        this.calculatePageHeight();
        
        window.addEventListener('resize', () => {
            this.calculatePageHeight();
        });
    }

    calculatePageHeight() {
        this.state.pageHeight = this.contentElement.scrollHeight;
        this.state.updateScreenDimensions();
    }

    update(state) {
        const viewportHeight = state.screenHeight;
        const scrollableDistance = state.pageHeight - viewportHeight;
        
        if (scrollableDistance <= 0) return;
        
        // Apply scroll transform based on progress
        // Start at bottom: progress 0 = translateY(-scrollableDistance) shows bottom
        // Scroll up: progress 1 = translateY(0) shows top
        // Add initial offset so stone starts near top hog line
        const effectiveProgress = Math.min(1, state.scrollProgress + this.initialScrollOffset);
        const scrollOffset = effectiveProgress * scrollableDistance;
        this.contentElement.style.transform = `translateY(${-scrollableDistance + scrollOffset}px)`;
        
        this.syncAudio(state);
        
        this.lastProgress = state.scrollProgress;
    }

    syncAudio(state) {
        if (!this.audio || !this.audio.audioBuffer) return;
        
        // Calculate velocity for playback rate
        const isMoving = state.phase === 'moving' || state.phase === 'returning';
        const velocity = isMoving 
            ? Math.sqrt(state.stone.vx ** 2 + state.stone.vy ** 2)
            : 0;
        
        // Calculate playback rate: 0.25x when slow, up to 2x when fast
        const maxVelocity = 25;
        const rate = Math.max(0.25, Math.min(2, velocity / maxVelocity+ 0.25));
        
        if (isMoving) {
            // Resume audio context on user interaction
            this.audio.resumeContext();
            
            // Set playback rate
            this.audio.setPlaybackRate(rate);
            
            // Start playing if not already
            if (!this.audio.isPlaying) {
                // Sync position to scroll progress when starting
                this.audio.setPosition(state.scrollProgress);
                this.audio.play();
            }
        } else {
            // Stone stopped - stop audio and sync position
            if (this.audio.isPlaying) {
                this.audio.stop();
                // Update position to where stone is now
                this.audio.setPosition(state.scrollProgress);
            }
        }
    }

    getTotalHeight() {
        return this.state.pageHeight;
    }
}