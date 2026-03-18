export class ScrollController {
    constructor(state, audioController) {
        this.state = state;
        this.audio = audioController;
        this.contentElement = document.getElementById('content');
        this.lastProgress = 0;
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
        
        const stoneWorldY = state.stone.y;
        state.scrollProgress = stoneWorldY / scrollableDistance;
        state.scrollProgress = Math.max(0, state.scrollProgress);
        
        if (state.scrollProgress >= 1) {
            state.scrollProgress = 0;
            state.stone.y = 0;
        }
        
        // Start at bottom: progress 0 = translateY(-scrollableDistance) shows bottom
// Scroll up: progress 1 = translateY(0) shows top
const scrollOffset = state.scrollProgress * scrollableDistance;
this.contentElement.style.transform = `translateY(${-scrollableDistance + scrollOffset}px)`;
        
        this.syncAudio(state);
        
        this.lastProgress = state.scrollProgress;
    }

    syncAudio(state) {
        if (!this.audio || !this.audio.audioBuffer) return;
        
        const progress = state.scrollProgress;
        const velocity = state.phase === 'moving' 
            ? Math.sqrt(state.stone.vx ** 2 + state.stone.vy ** 2)
            : 0;
        
        this.audio.setPosition(progress);
        
        const baseRate = velocity / this.audio.maxVelocity || 1;
        const rate = Math.max(0.1, Math.min(2, baseRate));
        
        const direction = state.stone.vy > 0 ? 1 : -1;
        
        if (state.phase === 'moving') {
            this.audio.setPlaybackRate(rate * direction);
            if (!this.audio.isPlaying) {
                this.audio.play();
            }
        } else {
            this.audio.stop();
        }
    }

    getTotalHeight() {
        return this.state.pageHeight;
    }
}