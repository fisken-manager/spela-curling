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
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
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
        const stoneRadius = this.state.stone.radius * this.state.scaleFactor;
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
            if (this.cardMenu.isInOwnedContainer(pointerX, pointerY)) {
                this.cardMenu.startDrag(pointerX, pointerY);
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

    onWheel(e) {
        if (!this.state.showBuyMenu || !this.cardMenu) return;
        e.preventDefault();

        const scrollAmount = e.deltaY * 0.5;
        this.cardMenu.ownedScrollX = Math.max(0, this.cardMenu.ownedScrollX + scrollAmount);
    }

    onPointerMove(e) {
        const controlsPanel = document.getElementById('physics-controls');
        if (controlsPanel && controlsPanel.contains(e.target)) {
            return;
        }
        
        const pointerX = e.clientX;
        const pointerY = e.clientY;

        // Drag scroll for owned cards container
        if (this.state.showBuyMenu && this.cardMenu && this.cardMenu.ownedDragState) {
            this.cardMenu.updateDrag(pointerX, pointerY);
            return;
        }
        
        this.sweepPositions.push({ x: pointerX, y: pointerY, time: Date.now() });
        if (this.sweepPositions.length > 10) {
            this.sweepPositions.shift();
        }
        
        if (this.state.phase === 'charging' && this.state.input.isDragging) {
            const dx = pointerX - this.state.input.dragStartX;
            const dy = pointerY - this.state.input.dragStartYPx;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const scale = this.state.scaleFactor;
            const softRadius = 80 * scale;
            const maxRadius = 150 * scale;
            let clampedDx = dx;
            let clampedDy = dy;
            
            if (dist > softRadius) {
                const excess = dist - softRadius;
                const mappedExcess = (excess * maxRadius) / (excess + maxRadius);
                const newDist = softRadius + mappedExcess;
                
                clampedDx = (dx / dist) * newDist;
                clampedDy = (dy / dist) * newDist;
            }
            
            this.state.stone.x = this.state.input.stoneStartX + clampedDx;
            this.state.stoneYPx = this.state.input.stoneStartYPx + clampedDy;
            
            this.state.input.flickHistory.push({ x: pointerX, y: pointerY, time: Date.now() });
            
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

        if (this.state.showBuyMenu && this.cardMenu) {
            const dragState = this.cardMenu.ownedDragState;
            if (dragState) {
                if (!dragState.moved) {
                    // It was a tap, process as click
                    this.cardMenu.endDrag();
                    const result = this.cardMenu.handleClick(e.clientX, e.clientY);
                    if (result && result.action === 'continue') {
                        this.state.showBuyMenu = false;
                        this.state.isPaused = false;
                        this.state.phase = 'resting';
                        this.state.stone.x = 0;
                        this.state.stone.vx = 0;
                        this.state.stone.vy = 0;
                        this.state.stone.angularVelocity = 0;
                        this.state.stone.rotation = 0;
                        this.state.stoneYPx = this.state.screenHeight - this.state.restOffsetPx * this.state.scaleFactor;
                        this.state.transitionProgress = 0;
                        this.state.inScrollZone = false;
                        this.state.input.isDragging = false;
                        this.state.input.isSnapping = false;
                        this.state.input.snapBackProgress = 0;
                        this.state.input.flickHistory = [];
                        this.state.resetForNewThrow();
                    }
                } else {
                    this.cardMenu.endDrag();
                }
                return;
            }
            // Not in owned container drag - process as click
            const result = this.cardMenu.handleClick(e.clientX, e.clientY);
            if (result && result.action === 'continue') {
                this.state.showBuyMenu = false;
                this.state.isPaused = false;
                this.state.phase = 'resting';
                this.state.stone.x = 0;
                this.state.stone.vx = 0;
                this.state.stone.vy = 0;
                this.state.stone.angularVelocity = 0;
                this.state.stone.rotation = 0;
                this.state.stoneYPx = this.state.screenHeight - this.state.restOffsetPx * this.state.scaleFactor;
                this.state.transitionProgress = 0;
                this.state.inScrollZone = false;
                this.state.input.isDragging = false;
                this.state.input.isSnapping = false;
                this.state.input.snapBackProgress = 0;
                this.state.input.flickHistory = [];
                this.state.resetForNewThrow();
            }
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
                    
                    const vx = dx / dt;
                    const vy = dy / dt;
                    
                    const speedPxPerMs = Math.sqrt(vx * vx + vy * vy);
                    
                    const scale = this.state.scaleFactor;
                    if (speedPxPerMs > 0.5 * scale && vy < 0 && distance > 10 * scale) {
                        this.state.aimAngle = Math.atan2(vx, -vy);
                        const powerValue = Math.min(100, (speedPxPerMs / scale / 3) * 100);
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
        
        const scale = this.state.scaleFactor;
        if (totalMovement > this.sweepThreshold * scale) {
            this.state.isSweeping = true;
            const intensity = totalMovement / (50 * scale);
            this.physics.applySweepBoost(this.state, intensity);
        } else {
            this.state.isSweeping = false;
        }
    }
}