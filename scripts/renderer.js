export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stoneRadius = 30;
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
    }
}