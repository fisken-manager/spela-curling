export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stoneRadius = 30;
        this.particles = [];
        this.prevStoneX = null;
    }

    addParticle(x, y, vx, vy, color, life = 1) {
        this.particles.push({
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            color: color,
            life: life,
            maxLife: life
        });
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= deltaTime;
            p.vy += 5 * deltaTime;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
            this.ctx.fill();
        }
    }

    addWallBounceParticles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.addParticle(
                x + Math.random() * 10,
                y + Math.random() * 10,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '255, 200, 100',
                0.5
            );
        }
    }

    addSweepParticles(x, y) {
        for (let i = 0; i < 3; i++) {
            this.addParticle(
                x + (Math.random() - 0.5) * 100,
                y + (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                '66, 153, 225',
                0.3
            );
        }
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStone(state) {
        const stoneScreenX = state.screenWidth / 2;
        const stoneScreenY = state.screenHeight * 0.7;
        const radius = this.stoneRadius;
        
        this.ctx.beginPath();
        this.ctx.arc(stoneScreenX, stoneScreenY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        // Draw handle
        this.ctx.beginPath();
        this.ctx.arc(stoneScreenX, stoneScreenY, radius * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#e53e3e';
        this.ctx.fill();
    }

    drawPowerBar(state) {
        if (state.phase !== 'charging') return;
        
        const barWidth = 200;
        const barHeight = 20;
        const x = (state.screenWidth - barWidth) / 2;
        const y = state.screenHeight * 0.85;
        
        // Background
        this.ctx.fillStyle = '#2d3748';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Fill
        const fillWidth = (state.power / 100) * barWidth;
        this.ctx.fillStyle = '#e53e3e';
        this.ctx.fillRect(x, y, fillWidth, barHeight);
        
        // Border
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
    }

    drawAimLine(state) {
        if (state.phase !== 'charging') return;
        
        const stoneScreenX = state.screenWidth / 2;
        const stoneScreenY = state.screenHeight * 0.7;
        const lineLength = 100;
        
        const endX = stoneScreenX + Math.sin(state.aimAngle) * lineLength;
        const endY = stoneScreenY - Math.cos(state.aimAngle) * lineLength;
        
        this.ctx.beginPath();
        this.ctx.moveTo(stoneScreenX, stoneScreenY);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Arrow head
        const arrowSize = 10;
        const angle = state.aimAngle;
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(
            endX - arrowSize * Math.sin(angle - 0.3),
            endY + arrowSize * Math.cos(angle - 0.3)
        );
        this.ctx.lineTo(
            endX - arrowSize * Math.sin(angle + 0.3),
            endY + arrowSize * Math.cos(angle + 0.3)
        );
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.fill();
    }

    drawSweepZone(state) {
        if (state.phase !== 'moving') return;
        
        const zoneHeight = state.screenHeight * 0.3;
        const y = state.screenHeight * 0.4;
        
        const alpha = state.isSweeping ? 0.3 : 0.1;
        this.ctx.fillStyle = `rgba(66, 153, 225, ${alpha})`;
        this.ctx.fillRect(0, y, state.screenWidth, zoneHeight);
    }

    render(state) {
        this.clear();
        
        this.drawSweepZone(state);
        this.drawStone(state);
        this.drawAimLine(state);
        this.drawPowerBar(state);
        
        if (state.phase === 'moving') {
            const stoneScreenX = state.screenWidth / 2;
            const stoneScreenY = state.screenHeight * 0.7;
            
            if (state.isSweeping) {
                this.addSweepParticles(stoneScreenX, stoneScreenY);
            }
            
            if (this.prevStoneX !== null) {
                const leftBound = state.stone.radius;
                const rightBound = state.screenWidth - state.stone.radius;
                const atLeftWall = state.stone.x <= leftBound + 5;
                const atRightWall = state.stone.x >= rightBound - 5;
                const justHitWall = (atLeftWall || atRightWall) && 
                    Math.abs(state.stone.x - this.prevStoneX) > 1;
                
                if (justHitWall) {
                    const wallX = atLeftWall ? leftBound : rightBound;
                    this.addWallBounceParticles(wallX, stoneScreenY);
                }
            }
            this.prevStoneX = state.stone.x;
        } else {
            this.prevStoneX = null;
        }
        
        this.drawParticles();
    }
}