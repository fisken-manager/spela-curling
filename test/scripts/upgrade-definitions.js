export const UPGRADES = [
    // === BASIC UPGRADES ===
    {
        id: 'speed',
        name: 'Hastig Leda',
        proverb: 'Ät int gul snö om du inte har bråttom.',
        detail: 'sprinting through snowy forest, speed lines, dynamic pose',
        category: 'basic',
        tiers: [
            { level: 1, cost: 1, effect: '+15% Maxfart, -10% Storlek', image: 'waifu-speed.jpg' },
            { level: 2, cost: 5, effect: '+30% Maxfart, -20% Storlek', image: 'maxVelocity-tier2.jpg' },
            { level: 3, cost: 10, effect: '+45% Maxfart, -30% Storlek', image: 'maxVelocity-tier3.jpg' },
            { level: 4, cost: 15, effect: '+60% Maxfart, -40% Storlek', image: 'maxVelocity-tier4.jpg' },
            { level: 5, cost: 25, effect: '+75% Maxfart, -50% Storlek', image: 'maxVelocity-tier5.jpg' },
        ]
    },
    {
        id: 'friction',
        name: 'Glatt Misär',
        proverb: 'Även en blind matta kan flyga.',
        detail: 'sliding gracefully on ice, smooth motion blur, elegant',
        category: 'basic',
        tiers: [
            { level: 1, cost: 1, effect: '-15% Friktion, -10% studs-effekt', image: 'waifu-friction.jpg' },
            { level: 2, cost: 5, effect: '-30% Friktion, -20% studs-effekt', image: 'frictionReduction-tier2.jpg' },
            { level: 3, cost: 10, effect: '-45% Friktion, -30% studs-effekt', image: 'frictionReduction-tier3.jpg' },
            { level: 4, cost: 15, effect: '-60% Friktion, -40% studs-effekt', image: 'frictionReduction-tier4.jpg' },
            { level: 5, cost: 25, effect: '-75% Friktion, -50% studs-effekt', image: 'frictionReduction-tier5.jpg' },
        ]
    },
    {
        id: 'size',
        name: 'Tung Börda',
        proverb: 'Bygg int en struts av sand.',
        detail: 'holding massive curling stone, powerful stance, giant shadow',
        category: 'basic',
        tiers: [
            { level: 1, cost: 1, effect: '+25% Storlek, -10% Maxfart', image: 'waifu-size.jpg' },
            { level: 2, cost: 5, effect: '+50% Storlek, -20% Maxfart', image: 'stoneSize-tier2.jpg' },
            { level: 3, cost: 10, effect: '+75% Storlek, -30% Maxfart', image: 'stoneSize-tier3.jpg' },
            { level: 4, cost: 15, effect: '+100% Storlek, -40% Maxfart', image: 'stoneSize-tier4.jpg' },
            { level: 5, cost: 25, effect: '+125% Storlek, -50% Maxfart', image: 'stoneSize-tier5.jpg' },
        ]
    },
    {
        id: 'magnetism',
        name: 'Magnetiskt Begär',
        proverb: 'Det som glimmar dras till den som har tyngd.',
        detail: 'magnetic aura, glowing orbs orbiting around, attracting light particles',
        category: 'basic',
        tiers: [
            { level: 1, cost: 3, effect: '+10% Magnetism-radie', image: 'waifu-curl.jpg' },
            { level: 2, cost: 10, effect: '+20% Magnetism-radie', image: 'magnetism-tier2.jpg' },
            { level: 3, cost: 15, effect: '+30% Magnetism-radie', image: 'magnetism-tier3.jpg' },
            { level: 4, cost: 25, effect: '+40% Magnetism-radie', image: 'magnetism-tier4.jpg' },
            { level: 5, cost: 35, effect: '+50% Magnetism-radie', image: 'magnetism-tier5.jpg' },
        ]
    },
    {
        id: 'coinSpeedBoost',
        name: 'Blodspengar',
        proverb: 'Alla hattar, ingen boskap, men mycke sås.',
        detail: 'coins raining down, golden glow, greedy expression, money bags',
        category: 'basic',
        tiers: [
            { level: 1, cost: 5, effect: 'Mynt ger hastighetsboost', image: 'coinSpeedBoost-tier1.jpg' },
            { level: 2, cost: 15, effect: '2x mynt, inga hastighetspickup', image: 'coinSpeedBoost-tier2.jpg' },
        ]
    },

    // === CORRUPTED / TRADE-OFF UPGRADES ===
    {
        id: 'spin_win',
        name: 'Själs-Snurran',
        proverb: 'Ju mer man tjålar, desto tyngre blir lasset.',
        detail: 'spinning rapidly, spiral energy trails, dizzy but triumphant',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 3, effect: 'Magnetism skalar med rotation, snurr dör 40% snabbare', image: 'spin_win-tier1.jpg' },
            { level: 2, cost: 10, effect: 'Större rotation-bonus, snurr dör 80% snabbare', image: 'spin_win-tier2.jpg' },
            { level: 3, cost: 15, effect: 'Max rotation-bonus, snurr dör 120% snabbare', image: 'spin_win-tier3.jpg' },
        ]
    },
    {
        id: 'gold_grift',
        name: 'Snålvargens Arv',
        proverb: 'Alla hattar, ingen boskap, men mycket sås.',
        detail: 'coins raining down, golden glow, greedy expression, money bags',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 10, effect: '80% av poängorbs blir till mynt, -5% fart per loop', image: 'gold_grift-tier1.jpg' },
            { level: 2, cost: 20, effect: '90% av poängorbs blir till mynt, -10% fart per loop', image: 'gold_grift-tier2.jpg' },
            { level: 3, cost: 30, effect: '100% av poängorbs blir till mynt, -15% fart per loop', image: 'gold_grift-tier3.jpg' },
        ]
    },
    {
        id: 'glass_cannon',
        name: 'Skört Stål',
        proverb: 'Måla int kycklingen blå om du int har färg.',
        detail: 'shattering glass effect, explosive power, fragile beauty, cracks emanating power',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 1, effect: '+50% Launch Power, 25% färre speed-pickups', image: 'glass_cannon-tier1.jpg' },
            { level: 2, cost: 3, effect: '+100% Launch Power, 33% färre speed-pickups', image: 'glass_cannon-tier2.jpg' },
            { level: 3, cost: 10, effect: '+150% Launch Power, 50% färre speed-pickups', image: 'glass_cannon-tier3.jpg' },
        ]
    },
    {
        id: 'wall_speed',
        name: 'Väggarnas Vrede',
        proverb: 'Väggen är din vän, ända tills den int är det.',
        detail: 'bouncing off walls, trajectory trails, chaotic energy, multiple motion ghosts',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 3, effect: '+15% extra fart vid väggstuds, slumpmässig riktning efter', image: 'wall_speed-tier1.jpg' },
            { level: 2, cost: 10, effect: '+25% extra fart vid väggstuds, slumpmässig riktning efter', image: 'wall_speed-tier2.jpg' },
            { level: 3, cost: 15, effect: '+40% extra fart vid väggstuds, slumpmässig riktning efter', image: 'wall_speed-tier3.jpg' },
        ]
    },
    {
        id: 'friction_forge',
        name: 'Slitvargens Flit',
        proverb: 'Slipa yxan medan isen bär.',
        detail: 'sparks flying, forge background, industrial aesthetic, hammer and anvil',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 3, effect: '+3% maxfart vid väggstuds but -20% aktuell fart', image: 'friction_forge-tier1.jpg' },
            { level: 2, cost: 10, effect: '+5% maxfart vid väggstuds but -25% aktuell fart', image: 'friction_forge-tier2.jpg' },
            { level: 3, cost: 20, effect: '+8% maxfart vid väggstuds but -30% aktuell fart', image: 'friction_forge-tier3.jpg' },
        ]
    },
    {
        id: 'spin_to_speed',
        name: 'Nav-Gnisslet',
        proverb: 'Man kan int smörja vagnen med bara vilja.',
        detail: 'rotational energy converting to forward motion, gear mechanics, steampunk elements',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 3, effect: 'Snurr förvandlas till Hastighet vid väggstuds, inga speed-pickups', image: 'spin_to_speed-tier1.jpg' },
            { level: 2, cost: 10, effect: 'Mer Snurr förvandlas till Hastighet vid väggstuds', image: 'spin_to_speed-tier2.jpg' },
            { level: 3, cost: 15, effect: 'Mer Snurr förvandlas till Hastighet vid väggstuds', image: 'spin_to_speed-tier3.jpg' },
        ]
    },

    // === TECHNICAL UPGRADES ===
    {
        id: 'rail_rider',
        name: 'Timmermannens Grepp',
        proverb: 'Håll i relingen när sjön går grov.',
        detail: 'gripping wall edge, stable stance, carpenter tools, wooden textures',
        category: 'technical',
        tiers: [
            { level: 1, cost: 5, effect: 'Glid längs väggen utan friktion i 2s (10s cooldown)', image: 'rail_rider-tier1.jpg' },
            { level: 2, cost: 15, effect: 'Glid längs väggen utan friktion i 3s (10s cooldown)', image: 'rail_rider-tier2.jpg' },
            { level: 3, cost: 25, effect: 'Glid längs väggen utan friktion i 4s (10s cooldown)', image: 'rail_rider-tier3.jpg' },
        ]
    },
    {
        id: 'echo_woods',
        name: 'Eko från Skogen',
        proverb: 'Ropa i skogen så får du svar i knät.',
        detail: 'sound waves rippling, forest echo, multiple translucent figures, ethereal',
        category: 'technical',
        tiers: [
            { level: 1, cost: 3, effect: 'Väggstuds spawnar speed-pickup', image: 'echo_woods-tier1.jpg' },
            { level: 2, cost: 10, effect: 'Väggstuds spawnar fler speed-pickups', image: 'echo_woods-tier2.jpg' },
            { level: 3, cost: 20, effect: 'Väggstuds spawnar super-pickup', image: 'echo_woods-tier3.jpg' },
        ]
    },
    {
        id: 'event_horizon',
        name: 'Händelsehorisonten',
        proverb: 'Allt som int är fastsurrat hamnar i min säck.',
        detail: 'black hole gravitational pull, swirling vortex, cosmic dread, all-consuming',
        category: 'technical',
        tiers: [
            { level: 1, cost: 15, effect: 'Passiv dragning av alla pickups (liten radie)', image: 'event_horizon-tier1.jpg' },
            { level: 2, cost: 30, effect: 'Passiv dragning (medel radie)', image: 'event_horizon-tier2.jpg' },
            { level: 3, cost: 60, effect: 'Passiv dragning (stor radie)', image: 'event_horizon-tier3.jpg' },
        ]
    },
    {
        id: 'snap_curl',
        name: 'Krokiga Ryggskottet',
        proverb: 'Byt int spår mitt i diket om du int har bra fäste.',
        detail: 'sudden turn, sharp angle change, surprised expression, motion blur',
        category: 'technical',
        tiers: [
            { level: 1, cost: 3, effect: 'Dubbel snurr vid riktnings-förändring', image: 'snap_curl-tier1.jpg' },
            { level: 2, cost: 10, effect: 'Trippel snurr vid riktnings-förändring', image: 'snap_curl-tier2.jpg' },
            { level: 3, cost: 20, effect: 'Fyrdubbel snurr vid riktnings-förändring', image: 'snap_curl-tier3.jpg' },
        ]
    },
    {
        id: 'wall_ping_coin',
        name: 'Vägg-Tionden',
        proverb: 'Man måste banka på dörren två gånger för att få kaffe.',
        detail: 'coin appearing at wall impact, rhythmic pattern, payment tribute',
        category: 'technical',
        tiers: [
            { level: 1, cost: 3, effect: 'Du får $1 var 6:e väggstuds', image: 'wall_ping_coin-tier1.jpg' },
            { level: 2, cost: 10, effect: 'Du får $1 var 5:e väggstuds', image: 'wall_ping_coin-tier2.jpg' },
            { level: 3, cost: 20, effect: 'Du får $1 var 4:e väggstuds', image: 'wall_ping_coin-tier3.jpg' },
        ]
    },
    {
        id: 'double_shops',
        name: 'Marknadsaftonen',
        proverb: 'Marknaden är öppen, men plånboken är tom.',
        detail: 'market stall, multiple vendors, bustling atmosphere, night market',
        category: 'technical',
        tiers: [
            { level: 1, cost: 10, effect: '2x shop-pickups spawnar', image: 'double_shops-tier1.jpg' },
        ]
    },

    // === HIGH RISK / HIGH REWARD ===
    {
        id: 'tar_launch',
        name: 'Tjärens Offer',
        proverb: 'Elden brinner starkast innan den slocknar.',
        detail: 'dark flames consuming, sacrificial offering, intense heat distortion, tar textures',
        category: 'highrisk',
        tiers: [
            { level: 1, cost: 5, effect: '+200% Kasthastighet, 2x Maxfart & Pickup-värde i 10s after kast', image: 'tar_launch-tier1.jpg' },
            { level: 2, cost: 20, effect: '+300% Kasthastighet, 2x Maxfart & Pickup-värde i 10s after kast', image: 'tar_launch-tier2.jpg' },
        ]
    },
    {
        id: 'sweep_life',
        name: 'Soparens Sista Hopp',
        proverb: 'Man kan int både sopa rent och springa fort.',
        detail: 'broom becoming ethereal, life essence, desperate sweeping motion, ghostly aura',
        category: 'highrisk',
        tiers: [
            { level: 1, cost: 10, effect: 'Förvandlar Sweep-pickups till Extra liv, -25% maxhastighet', image: 'sweep_life-tier1.jpg' },
        ]
    },

    // === TECHNICAL - NEW ===
    {
        id: 'needle_eye',
        name: 'Nålögat',
        proverb: 'En liten mus slipper genom nätet.',
        detail: 'tiny stone passing through needle eye, shrinking effect, mystical portal',
        category: 'technical',
        tiers: [
            { level: 1, cost: 15, effect: 'Ju mindre sten ju mindre friktion', image: 'needle_eye-tier1.jpg' },
        ]
    },
    {
        id: 'frozen_broom',
        name: 'Kvastens Vila',
        proverb: 'Kvasten sopar bäst när den står i hörnet.',
        detail: 'frozen broom in ice, crystalline texture, dormant power, waiting',
        category: 'highrisk',
        tiers: [
            { level: 1, cost: 3, effect: '+$5 om du int sopar under boost', image: 'frozen_broom-tier1.jpg' },
            { level: 2, cost: 15, effect: '+$10 om du int sopar under boost', image: 'frozen_broom-tier2.jpg' },
            { level: 3, cost: 30, effect: '+$15 om du int sopar under boost', image: 'frozen_broom-tier3.jpg' },
        ]
    },
    {
        id: 'dimension_door',
        name: 'Grytans Glip',
        proverb: 'Väggarna är bara dörrar för den som vet var handtaget sitter.',
        detail: 'portal opening in wall, stone passing through, Pac-Man style, glowing edges',
        category: 'technical',
        tiers: [
            { level: 1, cost: 5, effect: 'Åk genom väggarna och kom ut på andra sidan', image: 'grytans_glip-tier1.jpg' },
        ]
    },
    {
        id: 'cursed_harvest',
        name: 'Oväder i Antåg',
        proverb: 'Man ska int klaga på regnet om man vill ha skörd.',
        detail: 'dark storm clouds, lightning, ominous harvest, supernatural weather',
        category: 'corrupted',
        tiers: [
            { level: 1, cost: 10, effect: 'Negativa pickups är 2x starkare', image: 'cursed_harvest-tier1.jpg' },
        ]
    },
    {
        id: 'herrings_last_dance',
        name: 'Sillens Sista Dans',
        proverb: 'Den döende sillen simmar snabbast i strömmen.',
        detail: 'herring fish dancing, last breath, final burst of energy, ethereal glow, desperation',
        category: 'highrisk',
        tiers: [
            { level: 1, cost: 5, effect: '0 liv: +50% fart, 1+ liv: -50% fart', image: 'herrings_last_dance-tier1.jpg' },
        ]
    },
];
