export class Physics {
    constructor() {
        this.baseFriction = 0.995;
        this.sweepFriction = 0.998;
        this.maxVelocity = 25;
        this.wallBounceEnergy = 0.8;
        this.sweepBoost = 1.5;
    }

    update(state, deltaTime) {
        if (state.phase !== 'moving') return;

        const { stone } = state;
        
        const friction = state.isSweeping ? this.sweepFriction : this.baseFriction;
        stone.vx *= friction;
        stone.vy *= friction;
        
        stone.x += stone.vx;
        stone.y += stone.vy;
        
        const leftBound = stone.radius;
        const rightBound = state.screenWidth - stone.radius;
        
        if (stone.x < leftBound) {
            stone.x = leftBound;
            stone.vx = -stone.vx * this.wallBounceEnergy;
        } else if (stone.x > rightBound) {
            stone.x = rightBound;
            stone.vx = -stone.vx * this.wallBounceEnergy;
        }
        
        const maxScroll = state.pageHeight - state.screenHeight;
        state.scrollProgress = stone.y / maxScroll;
        
        if (state.scrollProgress >= 1) {
            state.scrollProgress = 0;
            stone.y = 0;
        }
        
        const speed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        if (speed < 0.1) {
            stone.vx = 0;
            stone.vy = 0;
            state.phase = 'resting';
        }
    }

    launch(state) {
        const { stone } = state;
        const speed = (state.power / 100) * this.maxVelocity;
        
        stone.vx = Math.sin(state.aimAngle) * speed;
        stone.vy = Math.cos(state.aimAngle) * speed;
        
        state.phase = 'moving';
        state.power = 0;
    }

    applySweepBoost(state, intensity) {
        if (state.phase !== 'moving') return;
        
        const { stone } = state;
        const currentSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
        
        if (currentSpeed > 0.1) {
            const boost = this.sweepBoost * intensity;
            stone.vx *= (1 + boost * 0.01);
            stone.vy *= (1 + boost * 0.01);
            
            const newSpeed = Math.sqrt(stone.vx * stone.vx + stone.vy * stone.vy);
            if (newSpeed > this.maxVelocity) {
                stone.vx = (stone.vx / newSpeed) * this.maxVelocity;
                stone.vy = (stone.vy / newSpeed) * this.maxVelocity;
            }
        }
    }

    getMaxVelocity() {
        return this.maxVelocity;
    }
}