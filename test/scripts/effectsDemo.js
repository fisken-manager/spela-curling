import { CardMenu } from './cardMenu.js';

console.log('effectsDemo.js loaded');

const canvas = document.getElementById('demo-canvas');
const ctx = canvas.getContext('2d');
const effectSelect = document.getElementById('effect-type');
const strengthSlider = document.getElementById('strength');
const strengthValue = document.getElementById('strength-value');
const effectDescription = document.getElementById('effect-description');

const mockState = {
    money: 150,
    upgrades: {
        'maxVelocity': { level: 2 },
        'frictionReduction': { level: 1 },
        'stoneSize': { level: 0 },
        'randomCurl': { level: 0 },
        'noNegativePickups': { level: 0 },
        'coinSpeedBoost': { level: 0 }
    },
    curlChaosPickups: [],
    sizeShrinkPickups: [],
    powerUps: [],
    scoringOrbs: [],
    pageHeight: 10000,
    screenHeight: 800,
    loopCount: 3
};

console.log('Creating CardMenu with mockState:', mockState);

const cardMenu = new CardMenu(mockState);

console.log('CardMenu created, cards:', cardMenu.cards);
console.log('Available upgrades:', cardMenu.getAvailableUpgrades());

const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = canvas.width;
offscreenCanvas.height = canvas.height;
const offscreenCtx = offscreenCanvas.getContext('2d');

const descriptions = {
    'none': 'Original shop without distortion',
    'barrel': 'Authentic fisheye - center normal, edges bulge outward',
    'perspective': '3D billboard feel - edges squeeze slightly',
    'fisheye': 'Heavy barrel distortion for dramatic warped look'
};

strengthSlider.addEventListener('input', () => {
    strengthValue.textContent = strengthSlider.value;
});

effectSelect.addEventListener('change', () => {
    effectDescription.textContent = descriptions[effectSelect.value];
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    console.log('Canvas click at:', x, y);
    const result = cardMenu.handleClick(x, y);
    console.log('Click result:', result);
});

function applyBarrelDistortion(targetCtx, sourceCanvas, strength) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const k = strength / 800;
    
    if (k < 0.001) {
        targetCtx.drawImage(sourceCanvas, 0, 0);
        return;
    }
    
    const srcCtx = sourceCanvas.getContext('2d');
    const imageData = srcCtx.getImageData(0, 0, width, height);
    const sourceData = imageData.data;
    const targetImageData = targetCtx.createImageData(width, height);
    const targetData = targetImageData.data;
    
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const r = Math.sqrt(dx * dx + dy * dy) / maxR;
            
            const factor = 1 + k * r * r;
            
            let srcX = cx + dx / factor;
            let srcY = cy + dy / factor;
            
            srcX = Math.max(0, Math.min(width - 1, srcX));
            srcY = Math.max(0, Math.min(height - 1, srcY));
            
            const srcXInt = Math.floor(srcX);
            const srcYInt = Math.floor(srcY);
            
            const targetIndex = (y * width + x) * 4;
            const sourceIndex = (srcYInt * width + srcXInt) * 4;
            
            targetData[targetIndex] = sourceData[sourceIndex];
            targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
            targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
            targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
        }
    }
    
    targetCtx.putImageData(targetImageData, 0, 0);
}

function applyPerspectiveCurve(targetCtx, sourceCanvas, strength) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const s = strength / 100;
    
    if (s < 0.01) {
        targetCtx.drawImage(sourceCanvas, 0, 0);
        return;
    }
    
    const srcCtx = sourceCanvas.getContext('2d');
    const imageData = srcCtx.getImageData(0, 0, width, height);
    const sourceData = imageData.data;
    const targetImageData = targetCtx.createImageData(width, height);
    const targetData = targetImageData.data;
    
    const cx = width / 2;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const normalizedX = (x - cx) / cx;
            const curveFactor = 1 - s * normalizedX * normalizedX * 0.5;
            
            let srcY = (y - height / 2) / curveFactor + height / 2;
            let srcX = x;
            
            srcY = Math.max(0, Math.min(height - 1, srcY));
            
            const srcYInt = Math.floor(srcY);
            const srcXInt = Math.floor(srcX);
            
            const targetIndex = (y * width + x) * 4;
            const sourceIndex = (srcYInt * width + srcXInt) * 4;
            
            targetData[targetIndex] = sourceData[sourceIndex];
            targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
            targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
            targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
        }
    }
    
    targetCtx.putImageData(targetImageData, 0, 0);
}

function applyStrongFisheye(targetCtx, sourceCanvas, strength) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const k = strength / 400;
    
    if (k < 0.001) {
        targetCtx.drawImage(sourceCanvas, 0, 0);
        return;
    }
    
    const srcCtx = sourceCanvas.getContext('2d');
    const imageData = srcCtx.getImageData(0, 0, width, height);
    const sourceData = imageData.data;
    const targetImageData = targetCtx.createImageData(width, height);
    const targetData = targetImageData.data;
    
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const r = Math.sqrt(dx * dx + dy * dy) / maxR;
            const theta = Math.atan2(dy, dx);
            
            const radialDistort = 1 + k * r * r * (1 + k * r * r * 0.5);
            let srcR = r / radialDistort;
            
            let srcX = cx + srcR * maxR * Math.cos(theta);
            let srcY = cy + srcR * maxR * Math.sin(theta);
            
            srcX = Math.max(0, Math.min(width - 1, srcX));
            srcY = Math.max(0, Math.min(height - 1, srcY));
            
            const srcXInt = Math.floor(srcX);
            const srcYInt = Math.floor(srcY);
            
            const targetIndex = (y * width + x) * 4;
            const sourceIndex = (srcYInt * width + srcXInt) * 4;
            
            targetData[targetIndex] = sourceData[sourceIndex];
            targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
            targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
            targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
        }
    }
    
    targetCtx.putImageData(targetImageData, 0, 0);
}

cardMenu.preloadImages().then(() => {
    console.log('Images preloaded');
}).catch(err => {
    console.warn('Some images failed to load:', err);
});

let lastTime = performance.now();
let frameCount = 0;

function render(currentTime) {
    try {
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        
        cardMenu.update(deltaTime);
        
        offscreenCtx.fillStyle = '#0f0f18';
        offscreenCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        cardMenu.render(offscreenCtx, offscreenCanvas.width, offscreenCanvas.height);
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const effect = effectSelect.value;
        const strength = parseInt(strengthSlider.value);
        
        switch(effect) {
            case 'barrel':
                applyBarrelDistortion(ctx, offscreenCanvas, strength);
                break;
            case 'perspective':
                applyPerspectiveCurve(ctx, offscreenCanvas, strength);
                break;
            case 'fisheye':
                applyStrongFisheye(ctx, offscreenCanvas, strength);
                break;
            default:
                ctx.drawImage(offscreenCanvas, 0, 0);
        }
        
        frameCount++;
        if (frameCount <= 5) {
            console.log(`Frame ${frameCount} rendered, effect: ${effect}`);
        }
    } catch (err) {
        console.error('Render error:', err);
        ctx.fillStyle = 'red';
        ctx.font = '16px monospace';
        ctx.fillText('Error: ' + err.message, 10, 30);
    }
    
    requestAnimationFrame(render);
}

try {
    console.log('Starting render loop...');
    requestAnimationFrame(render);
} catch (err) {
    console.error('Init error:', err);
}