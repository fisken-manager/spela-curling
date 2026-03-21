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
        this.startYPx = state.stoneYPx;
        this.startWorldY = state.stone.worldY;
        this.targetYPx = state.screenHeight - state.restOffsetPx;
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
        
        state.stoneYPx = this.startYPx + (this.targetYPx - this.startYPx) * eased;
        
        // Update stoneVisualY for legacy compatibility
        state.stoneVisualY = state.stoneYPx / state.screenHeight;
        
        if (this.wasInScrollZone) {
            const pixelDelta = (this.targetYPx - this.startYPx) * eased;
            state.stone.worldY = this.startWorldY + pixelDelta;
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
                state.stoneYPx = state.screenHeight - state.restOffsetPx;
                // Don't show buy menu on game over
            } else {
                state.showBuyMenu = true;
                state.phase = 'resting';
                state.stoneYPx = state.screenHeight - state.restOffsetPx;
                
                // Lower canvas z-index when showing menu so user can scroll
                const canvas = document.getElementById('game-canvas');
                if (canvas) canvas.style.zIndex = '0';
            }
        }
    }

    isTransitioning() {
        return this.isActive;
    }
}