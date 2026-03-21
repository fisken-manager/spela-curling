#!/bin/bash

# Read API key from environment or .env file
if [ -f ../.env ]; then
  source ../.env
fi

if [ -z "$POLLINATIONS_API_KEY" ]; then
  echo "Error: POLLINATIONS_API_KEY not set"
  echo "Create .env file with: POLLINATIONS_API_KEY=your_key"
  exit 1
fi

generate_image() {
  local prompt="$1"
  local output="$2"
  
  echo "Generating: $output"
  
  curl -s "https://gen.pollinations.ai/v1/images/generations?key=$POLLINATIONS_API_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"prompt\": \"$prompt\", \"model\": \"flux\", \"n\": 1, \"size\": \"512x512\", \"quality\": \"medium\", \"response_format\": \"b64_json\"}" \
    | node -e "const fs=require('fs');const d=JSON.parse(require('fs').readFileSync(0,'utf8'));if(d.data&&d.data[0]){fs.writeFileSync('$output',Buffer.from(d.data[0].b64_json,'base64'));console.log('  ✓ Saved')}else{console.log('  ✗ Error:',JSON.stringify(d.error||d))}"
  
  sleep 2
}

cd "$(dirname "$0")/../assets"

# Maxhastighet (Speed)
generate_image "anime waifu girl with blue hair wearing white and blue athletic clothes, running fast, motion blur, speed lines, blue sky background, dynamic pose" "maxVelocity-tier1.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue futuristic sportswear, sprinting at incredible speed, wind trailing behind, lightning sparks, dramatic blue sky" "maxVelocity-tier2.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue aerodynamic suit, breaking sound barrier, sonic boom, electricity crackling, deep blue sky with clouds" "maxVelocity-tier3.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue divine athletic robes, flying at hypersonic speed, golden lightning aura, starry blue sky, majestic pose" "maxVelocity-tier4.jpg"
generate_image "anime waifu goddess with blue hair in white and blue celestial robes, transcending speed itself, cosmic blue energy wings, universe background, divine radiance" "maxVelocity-tier5.jpg"

# Friction (Ice)
generate_image "anime waifu girl with blue hair wearing white and blue winter coat, standing on ice, frost crystals forming, soft blue glow, winter scene" "frictionReduction-tier1.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue ice skater outfit, gliding smoothly on ice, silver frost trail, blue ice background" "frictionReduction-tier2.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue crystalline armor, skating on frozen lake, ice diamonds floating, glacial blue background" "frictionReduction-tier3.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue ice princess gown, frozen waterfall behind, ice castle in distance, diamond dust falling" "frictionReduction-tier4.jpg"
generate_image "anime waifu ice queen with blue hair in white and blue royal frost dress, absolute zero aura, frozen universe behind, crystalline throne, diamond crown" "frictionReduction-tier5.jpg"

# Stone Size (Strength)
generate_image "anime waifu girl with blue hair wearing white and blue training outfit, holding small curling stone confidently, gym background, determined expression" "stoneSize-tier1.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue athletic wear, lifting medium curling stone with ease, muscles showing, red energy aura" "stoneSize-tier2.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue power armor, carrying large boulder, orange fiery glow, mountainous background" "stoneSize-tier3.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue titan armor, lifting massive stone, crimson flames, dramatic sky, heroic pose" "stoneSize-tier4.jpg"
generate_image "anime waifu goddess with blue hair in white and blue divine robes, holding mountain-sized stone effortlessly, golden celestial aura, cosmic background" "stoneSize-tier5.jpg"

# Random Curl
generate_image "anime waifu girl with blue hair wearing white and blue mystical outfit, purple spiral aura forming, mysterious blue background" "randomCurl-tier1.jpg"
generate_image "anime waifu girl with blue hair wearing white and blue sorceress dress, pink vortex swirling around, magical blue space" "randomCurl-tier2.jpg"

# Shield
generate_image "anime waifu girl with blue hair wearing white and blue guardian armor, protective white aura, shield radiating light, heavenly blue sky" "noNegativePickups-tier1.jpg"

echo "Done!"