export class InputHandler {
    constructor(canvas, state, physics, audio) {
        this.canvas = canvas;
        this.state = state;
        this.physics = physics;
        this.audio = audio;
        
        this.isPointerDown = false;
        this.pointerX = 0;
        this.pointerY = 0;
        this.powerFillRate = 100;
        
        this.sweepPositions = [];
        this.sweepThreshold = 5;
        
        this.bindEvents();
    }

    bindEvents() {
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    }

    onPointerDown(e) {
        e.preventDefault();
        this.isPointerDown = true;
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        
        if (this.audio && this.audio.audioContext) {
            this.audio.resumeContext();
        }
        
        if (this.state.phase === 'resting') {
            this.state.phase = 'charging';
            this.state.power = 0;
        }
    }

    onPointerMove(e) {
        this.pointerX = e.clientX;
        this.pointerY = e.clientY;
        
        this.sweepPositions.push({ x: e.clientX, y: e.clientY, time: Date.now() });
        if (this.sweepPositions.length > 10) {
            this.sweepPositions.shift();
        }
        
        if (this.state.phase === 'charging' && this.isPointerDown) {
            this.updateAimAngle();
        }
        
        if (this.state.phase === 'moving') {
            this.detectSweep();
        }
    }

    onPointerUp(e) {
        if (this.state.phase === 'charging' && this.isPointerDown) {
            this.physics.launch(this.state);
        }
        
        this.isPointerDown = false;
        this.state.isSweeping = false;
    }

    updateAimAngle() {
        const stoneScreenX = this.state.screenWidth / 2;
        const stoneScreenY = this.state.screenHeight * 0.7;
        
        const dx = this.pointerX - stoneScreenX;
        const dy = this.pointerY - stoneScreenY;
        
        this.state.aimAngle = Math.atan2(dx, -dy);
    }

    detectSweep() {
        if (this.sweepPositions.length < 3) return;
        
        const recent = this.sweepPositions.slice(-5);
        let totalMovement = 0;
        
        for (let i = 1; i < recent.length; i++) {
            const dx = recent[i].x - recent[i-1].x;
            const dy = recent[i].y - recent[i-1].y;
            totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
        
        const stoneScreenY = this.state.screenHeight * 0.7;
        const inSweepZone = this.pointerY < stoneScreenY && this.pointerY > 0;
        
        if (inSweepZone && totalMovement > this.sweepThreshold) {
            this.state.isSweeping = true;
            const intensity = totalMovement / 50;
            this.physics.applySweepBoost(this.state, intensity);
        } else {
            this.state.isSweeping = false;
        }
    }

    updatePower(deltaTime) {
        if (this.state.phase === 'charging' && this.isPointerDown) {
            this.state.power = Math.min(100, this.state.power + this.powerFillRate * deltaTime);
        }
    }
}