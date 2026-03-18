export const GamePhase = {
    RESTING: 'resting',
    CHARGING: 'charging',
    MOVING: 'moving'
};

export class GameState {
    constructor() {
        this.phase = GamePhase.RESTING;
        
        // Stone state
        this.stone = {
            x: 0,              // world position
            y: 0,
            vx: 0,            // velocity
            vy: 0,
            radius: 30
        };
        
        // Input state
        this.power = 0;           // 0-100
        this.aimAngle = 0;        // radians
        
        // Progress
        this.scrollProgress = 0;  // 0-1
        
        // Screen dimensions
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        
        // Page dimensions
        this.pageHeight = 0;      // total scrollable height
    }

    updateScreenDimensions() {
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
    }
}