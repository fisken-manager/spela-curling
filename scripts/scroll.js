export class ScrollController {
    constructor(state) {
        this.state = state;
        this.contentElement = document.getElementById('content');
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
        state.scrollProgress = Math.max(0, Math.min(1, state.scrollProgress));
        
        const scrollOffset = state.scrollProgress * scrollableDistance;
        this.contentElement.style.transform = `translateY(-${scrollOffset}px)`;
    }

    getTotalHeight() {
        return this.state.pageHeight;
    }
}