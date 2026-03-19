export class TransitionController {
    constructor() {
        this.duration = 0.4;
        this.elapsed = 0;
        this.isActive = false;
        this.startVisualY = 0;
        this.targetVisualY = 0.85;
        this.startWorldY = 0;
        this.wasInScrollZone = false;
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    start(state) {
        if (state.phase !== 'returning') return;
        
        this.isActive = true;
        this.elapsed = 0;
        this.startVisualY = state.stoneVisualY;
        this.startWorldY = state.stone.worldY;
        this.targetVisualY = state.restY;
        this.wasInScrollZone = state.inScrollZone;
    }

    update(deltaTime, state, scrollController) {
        if (!this.isActive) return;
        
        if (state.phase !== 'returning') {
            this.isActive = false;
            return;
        }
        
        this.elapsed += deltaTime;
        
        const t = Math.min(1, this.elapsed / this.duration);
        const eased = this.easeOutCubic(t);
        
        state.stoneVisualY = this.startVisualY + (this.targetVisualY - this.startVisualY) * eased;
        
        if (this.wasInScrollZone) {
            const visualDelta = (this.targetVisualY - this.startVisualY) * eased;
            state.stone.worldY = this.startWorldY + visualDelta * state.screenHeight;
            state.stone.worldY = Math.max(0, state.stone.worldY);
            
            const maxScroll = state.pageHeight - state.screenHeight;
            if (maxScroll > 0) {
                state.scrollProgress = state.stone.worldY / maxScroll;
            }
        }
        
        if (t >= 1) {
            this.isActive = false;
            state.transitionProgress = 0;
            state.inScrollZone = false;
            state.powerUpCollected = null;
            state.lifePowerUpCollected = null;
            state.resetForNewThrow();
            
            if (state.lives <= 0) {
                state.gameOver = true;
                state.phase = 'returning';
                state.stoneVisualY = state.restY;
            } else {
                state.phase = 'resting';
                state.stoneVisualY = state.restY;
            }
        }
    }

    isTransitioning() {
        return this.isActive;
    }
}