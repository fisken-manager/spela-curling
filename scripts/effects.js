const imageDataCache = new WeakMap();

function getOrCreateImageData(ctx, canvas) {
    const key = canvas;
    let cached = imageDataCache.get(key);
    if (!cached || cached.width !== canvas.width || cached.height !== canvas.height) {
        cached = {
            sourceData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            targetData: ctx.createImageData(canvas.width, canvas.height)
        };
        imageDataCache.set(key, cached);
    }
    return cached;
}

export function applyBarrelDistortion(targetCtx, sourceCanvas, strength) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const k = strength / 800;
    
    if (k < 0.005) {
        targetCtx.drawImage(sourceCanvas, 0, 0);
        return;
    }
    
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const cached = getOrCreateImageData(srcCtx, sourceCanvas);
    const sourceData = srcCtx.getImageData(0, 0, width, height).data;
    const targetImageData = cached.targetData;
    const targetData = targetImageData.data;
    
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const kMaxR2 = k / (maxR * maxR);
    
    for (let y = 0; y < height; y++) {
        const dy = y - cy;
        const dy2 = dy * dy;
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const r2 = dx * dx + dy2;
            const factor = 1 + kMaxR2 * r2;
            
            const srcX = Math.floor(cx + dx / factor);
            const srcY = Math.floor(cy + dy / factor);
            
            if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                const targetIndex = (y * width + x) * 4;
                const sourceIndex = (srcY * width + srcX) * 4;
                
                targetData[targetIndex] = sourceData[sourceIndex];
                targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
                targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
                targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
            }
        }
    }
    
    targetCtx.putImageData(targetImageData, 0, 0);
}

export function applyPerspectiveCurve(targetCtx, sourceCanvas, strength) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const s = strength / 100;
    
    if (s < 0.02) {
        targetCtx.drawImage(sourceCanvas, 0, 0);
        return;
    }
    
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const cached = getOrCreateImageData(srcCtx, sourceCanvas);
    const sourceData = srcCtx.getImageData(0, 0, width, height).data;
    const targetImageData = cached.targetData;
    const targetData = targetImageData.data;
    
    const cx = width / 2;
    const s2 = s * 0.5;
    const halfHeight = height / 2;
    const invHeight2 = 1 / (height / 2);
    
    for (let y = 0; y < height; y++) {
        const srcY = Math.floor((y - halfHeight) / (1 - s2 * ((y - halfHeight) * invHeight2) ** 2) + halfHeight);
        const clampedY = Math.max(0, Math.min(height - 1, srcY));
        
        for (let x = 0; x < width; x++) {
            const targetIndex = (y * width + x) * 4;
            const sourceIndex = (clampedY * width + x) * 4;
            
            targetData[targetIndex] = sourceData[sourceIndex];
            targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
            targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
            targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
        }
    }
    
    targetCtx.putImageData(targetImageData, 0, 0);
}

export function applyStrongFisheye(targetCtx, sourceCanvas, strength) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;
    const k = strength / 400;
    
    if (k < 0.005) {
        targetCtx.drawImage(sourceCanvas, 0, 0);
        return;
    }
    
    const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    const cached = getOrCreateImageData(srcCtx, sourceCanvas);
    const sourceData = srcCtx.getImageData(0, 0, width, height).data;
    const targetImageData = cached.targetData;
    const targetData = targetImageData.data;
    
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const invMaxR = 1 / maxR;
    
    for (let y = 0; y < height; y++) {
        const dy = y - cy;
        for (let x = 0; x < width; x++) {
            const dx = x - cx;
            const r = Math.sqrt(dx * dx + dy * dy) * invMaxR;
            const theta = Math.atan2(dy, dx);
            
            const radialDistort = 1 + k * r * r * (1 + k * r * r * 0.5);
            const srcR = r / radialDistort;
            const srcRMaxR = srcR * maxR;
            
            const srcX = Math.floor(cx + srcRMaxR * Math.cos(theta));
            const srcY = Math.floor(cy + srcRMaxR * Math.sin(theta));
            
            if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                const targetIndex = (y * width + x) * 4;
                const sourceIndex = (srcY * width + srcX) * 4;
                
                targetData[targetIndex] = sourceData[sourceIndex];
                targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
                targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
                targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
            }
        }
    }
    
    targetCtx.putImageData(targetImageData, 0, 0);
}

export function applyEffect(ctx, sourceCanvas, effectType, strength) {
    switch (effectType) {
        case 'barrel':
            applyBarrelDistortion(ctx, sourceCanvas, strength);
            break;
        case 'perspective':
            applyPerspectiveCurve(ctx, sourceCanvas, strength);
            break;
        case 'fisheye':
            applyStrongFisheye(ctx, sourceCanvas, strength);
            break;
        default:
            ctx.drawImage(sourceCanvas, 0, 0);
    }
}