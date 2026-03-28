import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UPGRADES } from './upgrade-definitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getPrompt(upgrade, tierLevel) {
    const basePrompt = `blue haired anime waifu, blue and white clothes, ${upgrade.detail}`;
    
    if (tierLevel <= 2) {
        return `${basePrompt}, chibi style, cute, simple details`;
    } else {
        return `${basePrompt}, highly detailed, stoic expression, magical aura, epic composition`;
    }
}

async function generateImage(prompt, apiKey) {
    const response = await fetch('https://gen.pollinations.ai/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            prompt: prompt,
            model: 'flux',
            n: 1,
            size: '1024x1024',
            quality: 'medium',
            response_format: 'b64_json'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.data[0].b64_json;
}

async function main() {
    const envPath = path.join(rootDir, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const apiKeyMatch = envContent.match(/POLLINATIONS_API_KEY=(.+)/);
    
    if (!apiKeyMatch) {
        console.error('No API key found in .env');
        process.exit(1);
    }
    
    const apiKey = apiKeyMatch[1].trim();
    const assetsDir = path.join(rootDir, 'assets', 'new_previews');
    
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    console.log(`Generating NEW preview images for ${UPGRADES.length} upgrades...`);
    
    let generated = 0;
    
    for (const upgrade of UPGRADES) {
        for (const tier of upgrade.tiers) {
            const filename = `${upgrade.id}-tier${tier.level}.jpg`;
            const filepath = path.join(assetsDir, filename);
            
            if (fs.existsSync(filepath)) {
                console.log(`✓ ${filename} already exists in previews`);
                continue;
            }
            
            const prompt = getPrompt(upgrade, tier.level);
            console.log(`Generating ${filename}...`);
            
            try {
                const b64Data = await generateImage(prompt, apiKey);
                const buffer = Buffer.from(b64Data, 'base64');
                fs.writeFileSync(filepath, buffer);
                console.log(`  ✓ Saved ${filename}`);
                generated++;
                
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`  ✗ Failed to generate ${filename}: ${error.message}`);
            }
        }
    }
    
    console.log(`\nDone! Generated: ${generated}`);
}

main().catch(console.error);
