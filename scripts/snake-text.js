export class SnakeTextAnimation {
    constructor(elementId, options = {}) {
        this.elementId = elementId;
        this.element = null;
        this.snakeLength = options.snakeLength || 7;
        this.speed = options.speed || 100;
        this.headIndex = 0;
        this.chars = [];
        this.specialWords = {
            'Fisken': 'snake-fisken',
            'Westenerz': 'snake-westenerz'
        };
        this.intervalId = null;
        this.snakeSequence = [];
        this.rows = [];
    }

    init() {
        this.element = document.getElementById(this.elementId);
        if (!this.element) {
            console.warn(`SnakeTextAnimation: Element with id "${this.elementId}" not found`);
            return false;
        }

        this.wrapCharacters();
        this.buildCharSequence();

        return true;
    }

    wrapCharacters() {
        const paragraphs = this.element.querySelectorAll('.hero-sub');
        if (paragraphs.length === 0) {
            return;
        }
        
        paragraphs.forEach((p, pIndex) => {
            const text = p.textContent;
            let html = '';
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const escapedChar = char.replace(/</g, '&lt;').replace(/>/g, '&gt;');
                
                if (char === ' ' || char === '\n' || char === '\t') {
                    html += escapedChar;
                } else {
                    html += `<span class="snake-char" data-index="${this.chars.length}">${escapedChar}</span>`;
                    this.chars.push({
                        element: null,
                        char: char,
                        paragraphIndex: pIndex
                    });
                }
            }
            
            p.innerHTML = html;
        });
        
        const spans = this.element.querySelectorAll('.snake-char');
        spans.forEach((span, i) => {
            this.chars[i].element = span;
        });
        
        this.detectSpecialWords();
    }

    detectSpecialWords() {
        const fullText = this.chars.map(c => c.char).join('');
        
        for (const word of Object.keys(this.specialWords)) {
            let startIndex = fullText.indexOf(word);
            while (startIndex !== -1) {
                for (let i = 0; i < word.length; i++) {
                    if (this.chars[startIndex + i]) {
                        this.chars[startIndex + i].wordStart = (i === 0) ? word : null;
                        this.chars[startIndex + i].wordEnd = (i === word.length - 1) ? word : null;
                    }
                }
                startIndex = fullText.indexOf(word, startIndex + 1);
            }
        }
    }

    buildCharSequence() {
        this.calculateRows();
    }

    calculateRows() {
        if (this.chars.length === 0) return;
        
        const positions = [];
        
        this.chars.forEach((charData, i) => {
            const rect = charData.element.getBoundingClientRect();
            positions.push({
                index: i,
                y: Math.round(rect.top)
            });
        });
        
        const rowMap = new Map();
        positions.forEach(pos => {
            if (!rowMap.has(pos.y)) {
                rowMap.set(pos.y, []);
            }
            rowMap.get(pos.y).push(pos.index);
        });
        
        const sortedYs = Array.from(rowMap.keys()).sort((a, b) => a - b);
        this.rows = sortedYs.map(y => rowMap.get(y));
        
        this.snakeSequence = [];
        
        for (let rowNum = 0; rowNum < this.rows.length; rowNum++) {
            const rowIndices = this.rows[rowNum];
            if (rowNum % 2 === 0) {
                this.snakeSequence.push(...rowIndices);
            } else {
                this.snakeSequence.push(...[...rowIndices].reverse());
            }
        }
    }

    getSnakeTailIndices(headSeqIndex) {
        const indices = [];
        for (let i = 0; i < this.snakeLength; i++) {
            const seqIndex = headSeqIndex - i;
            if (seqIndex >= 0 && seqIndex < this.snakeSequence.length) {
                indices.push(this.snakeSequence[seqIndex]);
            }
        }
        return indices;
    }

    applySnakeEffect() {
        this.chars.forEach((charData, i) => {
            charData.element.classList.remove('snake-grey', 'snake-fisken', 'snake-westenerz');
        });
        
        const tailIndices = this.getSnakeTailIndices(this.headIndex);
        
        tailIndices.forEach(charIndex => {
            if (charIndex < 0 || charIndex >= this.chars.length) return;
            
            const charData = this.chars[charIndex];
            
            if (this.isInWord(charIndex, 'Westenerz')) {
                charData.element.classList.add('snake-westenerz');
            } else if (this.isInWord(charIndex, 'Fisken')) {
                charData.element.classList.add('snake-fisken');
            } else {
                charData.element.classList.add('snake-grey');
            }
        });
    }

    isInWord(charIndex, word) {
        const fullText = this.chars.map(c => c.char).join('');
        const start = fullText.indexOf(word);
        
        if (start === -1) return false;
        
        return charIndex >= start && charIndex < start + word.length;
    }

    tick() {
        this.headIndex++;
        
        if (this.headIndex >= this.snakeSequence.length) {
            this.headIndex = 0;
        }
        
        this.applySnakeEffect();
    }

    start() {
        if (this.chars.length === 0) {
            console.warn('SnakeTextAnimation: No characters to animate');
            return;
        }
        
        this.headIndex = this.snakeLength - 1;
        this.applySnakeEffect();
        
        this.intervalId = setInterval(() => this.tick(), this.speed);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    handleResize() {
        this.calculateRows();
    }
}