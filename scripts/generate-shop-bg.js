import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = match[2];
  }
});

const token = env.POLLINATIONS_API_KEY || env.POLLINATIONS_TOKEN || env.API_KEY || Object.values(env)[0]; // Best effort if name is unknown

async function generate() {
  const prompt = "a snowy forest, with anime pixel style";
  const body = {
    prompt: prompt,
    model: "flux",
    n: 1,
    size: "1024x1024",
    quality: "medium",
    response_format: "url"
  };

  console.log("Requesting image...");
  const res = await fetch('https://gen.pollinations.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    console.error("Error:", await res.text());
    return;
  }

  const data = await res.json();
  const imageUrl = data.data[0].url;
  
  console.log("Downloading image from:", imageUrl);
  const imgRes = await fetch(imageUrl);
  const buffer = await imgRes.arrayBuffer();
  fs.writeFileSync('assets/shop-bg-snowy.jpg', Buffer.from(buffer));
  console.log("Saved to assets/shop-bg-snowy.jpg");
}

generate();
