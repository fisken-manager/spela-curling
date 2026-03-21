# Upgrade Menu - Card-Based Design

## Overview

Rebuild the upgrade menu as a collectible card game (TCG) style interface with horizontal card stacks, tier progression, and smooth animations.

## Visual Style

- **Theme**: Dark + Gold
- **Background**: Deep charcoal (#1a1a2e) with subtle noise texture
- **Accents**: Gold (#ffd700) for interactive elements
- **Owned indicators**: Green (#48bb78)
- **Card frames**: Dark with gold borders

## Layout Structure

Three horizontal zones:

### 1. Top Zone (60%) - Purchasable Cards
- Horizontal fan/stack of available upgrade cards
- Cards overlap by 30-40%
- Selected card lifts up and scales
- Horizontal scrolling through available upgrades

### 2. Middle Zone (15%) - Action Area
- "PURCHASE" button appears when card selected
- Shows cost and player's money balance
- Animates in/out based on selection state

### 3. Bottom Zone (25%) - Owned Collection
- Compact horizontal row of purchased cards
- Shows owned upgrades and current tier levels

## Card Design (TCG Style)

**Dimensions:**
- Aspect ratio: ~2.5:3 (poker card proportions)
- Rounded corners (12-16px radius)
- ~180px wide on mobile, ~220px on desktop

**Card Anatomy (Front):**
1. **Top bar** - Name in gold, tier numeral (I, II, III, IV)
2. **Image area** (60% of card) - Pollinations-generated art
3. **Effect text box** - Dark panel showing effect (+15% speed, etc.)
4. **Bottom stats** - Cost in corner, element icon

**Card Back:**
- Dark purple to blue gradient
- Gold decorative border/filigree

## Card States

- **Default**: Dark frame, gold border
- **Hover/Selected**: Lifts 20-30px, scales 1.1-1.15x, gold glow on border
- **Affordable**: Gold border pulses gently
- **Owned**: Green border tint, "OWNED" badge
- **Unaffordable/Locked**: Dimmed, grayscale filter

## Tier System

- Upgrades have multiple tiers (I, II, III, IV)
- Only next available tier is visible
- Purchasing a tier reveals the next tier card
- New tier cards **pop in from nothing** (scale from 0with spring easing)
- No slide-in animations

## Animations

**Card Selection:**
- Selected card: translateY -30px, scale 1.15x, 200ms ease-out
- Neighbors: dim to 0.6 opacity, shift outward to frame selection
- Gold border pulses with shadow bloom

**Purchase:**
1. Card flips forward (300ms Y-axis rotation)
2. White flash (100ms)
3. Card shrinks and flies to bottom collection
4. Slots into collection with bounce
5. New tier card pops in (scale 0→1, spring easing)

**New Card Reveal:**
- Pop in from nothing (scale 0with opacity 0)
- Scale up with spring/ease-out over 300ms
- Subtle gold sparkle particles optional

**Scrolling:**
- Horizontal drag/touch scroll
- Momentum-based with snap to nearest card

**Buy Button:**
- Slides up when card selected (250ms)
- Number counters animate on purchase
- Disables when player can't afford

## Sound Design (Optional)

- Soft whoosh on card selection
- Metallic ring on purchase
- Sparkle sound on tier unlock

## Data Structure

```javascript
upgrades = [
  {
    id: 'maxVelocity',
    name: 'Maxhastighet',
    tiers: [
      { 
        level: 1, 
        cost: 1, 
        effect: '+15%', 
        image: 'speed-tier1.jpg',
        pollinationsPrompt: 'anime character with lightning speed...'
      },
      { level: 2, cost: 5, effect: '+30%', image: 'speed-tier2.jpg' },
      // etc.
    ]
  }
]
```

## State Management

- `selectedCard` - currently selected purchasable card
- `ownedUpgrades` - array of owned tier cards
- `availableUpgrades` - computed from owned + next available tier

## Pollinations Integration

Generate card art dynamically:
```
https://image.pollinations.ai/prompt/{encoded_prompt}?width=400&height=600
```

## Mobile Considerations

- Touch gestures for horizontal scroll
- Adequate tap targets
- Card sizes scale responsively to viewport