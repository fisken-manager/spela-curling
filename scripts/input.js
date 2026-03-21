export class InputHandler {
    constructor(canvas, state, physics, audio) {
        this.canvas = canvas;
        this.state = state;
        this.physics = physics;
        this.audio = audio;
        this.cardMenu = null;
        
        this.sweepPositions = [];
        this.sweepThreshold = 5;
        
        this.bindEvents();
    }

    setCardMenu(cardMenu) {
        this.cardMenu = cardMenu;
    }

bindEvents() {
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    getStoneScreenPosition() {
        const playArea = this.state.getPlayArea();
        return {
            x: playArea.left + playArea.width / 2 + this.state.stone.x,
            y: this.state.stoneYPx
        };
    }

    isPointerOnStone(pointerX, pointerY) {
        if (this.state.phase !== 'resting') return false;
        
        const stonePos = this.getStoneScreenPosition();
        const stoneRadius = this.state.stone.radius;
        const dx = pointerX - stonePos.x;
        const dy = pointerY - stonePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= stoneRadius * 1.5;
    }

    onPointerDown(e) {
        const controlsPanel = document.getElementById('physics-controls');
        if (controlsPanel && controlsPanel.contains(e.target)) {
            return;
        }
        
        e.preventDefault();
        
        if (this.audio && this.audio.audioContext) {
            this.audio.resumeContext();
        }
        
        const pointerX = e.clientX;
        const pointerY = e.clientY;

        if (this.state.showBuyMenu && this.cardMenu) {
            const result = this.cardMenu.handleClick(pointerX, pointerY);
            if (result && result.action === 'purchase' && result.upgradeId) {
                this.cardMenu.purchase(result.upgradeId);
            }
            return;
        }
        
        if (this.state.phase === 'resting' && this.isPointerOnStone(pointerX, pointerY)) {
            this.state.phase = 'charging';
            this.state.input.isDragging = true;
            this.state.input.dragStartX = pointerX;
            this.state.input.dragStartYPx = pointerY;
            this.state.input.stoneStartX = this.state.stone.x;
            this.state.input.stoneStartYPx = this.state.stoneYPx;
            this.state.input.flickHistory = [{ x: pointerX, y: pointerY, time: Date.now() }];
            this.state.input.isSnapping = false;
            
            this.state.aimAngle = 0;
        }
    }

    onPointerMove(e) {
        const controlsPanel = document.getElementById('physics-controls');
        if (controlsPanel && controlsPanel.contains(e.target)) {
            return;
        }
        
        const pointerX = e.clientX;
        const pointerY = e.clientY;
        
        this.sweepPositions.push({ x: pointerX, y: pointerY, time: Date.now() });
        if (this.sweepPositions.length > 10) {
            this.sweepPositions.shift();
        }
        
        if (this.state.phase === 'charging' && this.state.input.isDragging) {
            const dx = pointerX - this.state.input.dragStartX;
            const dy = pointerY - this.state.input.dragStartYPx;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Constrain drag with a soft limit for springiness
            const softRadius = 80;
            const maxRadius = 150;
            let clampedDx = dx;
            let clampedDy = dy;
            
            if (dist > softRadius) {
                // Apply rubber-band effect
                const excess = dist - softRadius;
                // Asymptotically approach maxRadius
                const mappedExcess = (excess * maxRadius) / (excess + maxRadius);
                const newDist = softRadius + mappedExcess;
                
                clampedDx = (dx / dist) * newDist;
                clampedDy = (dy / dist) * newDist;
            }
            
            this.state.stone.x = this.state.input.stoneStartX + clampedDx;
            this.state.stoneYPx = this.state.input.stoneStartYPx + clampedDy;
            
            this.state.input.flickHistory.push({ x: pointerX, y: pointerY, time: Date.now() });
            
            // Keep only the last ~150ms of history for calculating flick velocity
            const cutoffTime = Date.now() - 150;
            this.state.input.flickHistory = this.state.input.flickHistory.filter(p => p.time > cutoffTime);
        }
        
        if (this.state.phase === 'moving') {
            this.detectSweep(pointerX, pointerY);
        }
    }

    onPointerUp(e) {
        const controlsPanel = document.getElementById('physics-controls');
        if (controlsPanel && controlsPanel.contains(e.target)) {
            return;
        }
        
        if (this.state.phase === 'charging' && this.state.input.isDragging) {
            const history = this.state.input.flickHistory;
            const now = Date.now();
            let flickValid = false;
            
            if (history.length > 1) {
                const oldest = history[0];
                const dt = now - oldest.time;
                
                if (dt > 0) {
                    const pointerX = e.clientX;
                    const pointerY = e.clientY;
                    
                    const dx = pointerX - oldest.x;
                    const dy = pointerY - oldest.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Velocity in pixels per millisecond
                    const vx = dx / dt;
                    const vy = dy / dt;
                    
                    const speedPxPerMs = Math.sqrt(vx * vx + vy * vy);
                    
                    // vy < 0 means moving forward (up the screen)
                    // Require a minimum flick distance of 10 pixels to prevent accidental taps throwing the stone
                    if (speedPxPerMs > 0.5 && vy < 0 && distance > 10) {
                        this.state.aimAngle = Math.atan2(vx, -vy);
                        // Convert pixel speed to a 0-100 power equivalent (approximate scaling)
                        // A fast flick might be 3-5 px/ms. Let's map 3 px/ms to full power.
                        const powerValue = Math.min(100, (speedPxPerMs / 3) * 100);
                        this.physics.launch(this.state, powerValue);
                        flickValid = true;
                    }
                }
            }
            
            if (!flickValid) {
                this.physics.resetStone(this.state);
            }
        }
        
        this.state.input.isDragging = false;
        this.state.isSweeping = false;
    }

    detectSweep(pointerX, pointerY) {
        if (this.sweepPositions.length < 3) return;
        if (!this.state.sweepBoost || this.state.sweepBoost.timer <= 0) return;
        
        const recent = this.sweepPositions.slice(-5);
        let totalMovement = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const dx = recent[i].x - recent[i-1].x;
            const dy = recent[i].y - recent[i-1].y;
            totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
        
        const stoneY = this.state.stoneVisualY;
        const sweepZoneTop = stoneY - 0.15;
        const pointerYRatio = pointerY / this.state.screenHeight;
        const inSweepZone = pointerYRatio < sweepZoneTop && pointerYRatio > 0;
        
        if (inSweepZone && totalMovement > this.sweepThreshold) {
            this.state.isSweeping = true;
            const intensity = totalMovement / 50;
            this.physics.applySweepBoost(this.state, intensity);
        } else {
            this.state.isSweeping = false;
        }
    }
}