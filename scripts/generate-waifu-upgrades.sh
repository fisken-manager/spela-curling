#!/bin/bash
# Generate waifu upgrade images using Pollinations

curl -s "https://image.pollinations.ai/prompt/anime%20waifu%20with%20blue%20and%20white%20uniform,%20cheerleading%20pose%20with%20pom-poms,%20high%20energy,%20cel%20shaded%20style,%20action%20shot,%20clean%20background,%20blue%20and%20white%20outfit,%20anime%20style?width=512&height=512&nologo=true&seed=1" -o "assets/waifu-speed.png"

curl -s "https://image.pollinations.ai/prompt/anime%20waifu%20with%20ice%20powers,%20surrounded%20by%20snowflakes,%20skating%20on%20ice,%20blue%20and%20white%20outfit,%20frosty%20aura,%20cel%20shaded%20style,%20clean%20background,%20anime%20style?width=512&height=512&nologo=true&seed=2" -o "assets/waifu-friction.png"

curl -s "https://image.pollinations.ai/prompt/anime%20waifu%20growing%20large,%20magical%20size-up%20effect,%20glowing%20circle%20aura%20expanding,%20blue%20and%20white%20uniform,%20cel%20shaded%20style,%20clean%20background,%20anime%20style?width=512&height=512&nologo=true&seed=3" -o "assets/waifu-size.png"

curl -s "https://image.pollinations.ai/prompt/anime%20waifu%20with%20spinning%20motion,%20spiral%20energy%20around%20her,%20chaotic%20but%20cute%20pose,%20blue%20and%20white%20outfit,%20action%20shot,%20dynamic%20pose,%20cel%20shaded%20style,%20clean%20background,%20anime%20style?width=512&height=512&nologo=true&seed=4" -o "assets/waifu-curl.png"

curl -s "https://image.pollinations.ai/prompt/anime%20waifu%20creating%20protective%20barrier%20shield,%20blocking%20bad%20pickups,%20glowing%20blue%20energy%20shield,%20defensive%20stance,%20cel%20shaded%20style,%20clean%20background,%20anime%20style?width=512&height=512&nologo=true&seed=5" -o "assets/waifu-shield.png"

echo "Waifu images generated!"
