export class ScrollController {
    constructor(state, audioController, physics) {
        this.state = state;
        this.audio = audioController;
        this.physics = physics;
        this.contentElement = document.getElementById('content');
        this.lastProgress = 0;
        this.initialScrollOffsetPx = 700;
        
        if (this.contentElement) {
            this.calculatePageHeight();
            window.addEventListener('resize', () => {
                this.calculatePageHeight();
            });
        }
    }

    calculatePageHeight() {
        if (this.contentElement) {
            this.state.pageHeight = this.contentElement.scrollHeight;
            console.log('=== PAGE HEIGHT ===', this.state.pageHeight, 'px at viewport:', window.innerWidth, '×', window.innerHeight);
        }
        this.state.updateScreenDimensions();
    }

    update(state) {
        if (!this.contentElement) return;
        
        const viewportHeight = state.screenHeight;
        const scrollableDistance = state.pageHeight - viewportHeight;
        
        if (scrollableDistance <= 0) return;
        
        const progressOffset = state.scrollProgress * scrollableDistance;
        const scrollOffset = Math.min(progressOffset + this.initialScrollOffsetPx, scrollableDistance);
        this.contentElement.style.transform = `translateY(${-scrollableDistance + scrollOffset}px)`;
        
        this.syncAudio(state);
        
        this.lastProgress = state.scrollProgress;
    }

    syncAudio(state) {
        if (!this.audio || !this.audio.audioBuffer) return;
        
        // Calculate velocity for playback rate
        const isMoving = (state.phase === 'moving' || state.phase === 'returning') && !state.showBuyMenu;
        const velocity = isMoving 
            ? Math.sqrt(state.stone.vx ** 2 + state.stone.vy ** 2)
            : 0;
        
        // Calculate playback rate: 0.25x when slow, up to 2x when fast
        const maxVelocity = this.physics.baseMaxVelocity;
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
}
