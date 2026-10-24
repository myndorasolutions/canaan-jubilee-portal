import sharp from "sharp";

const source = "public/canaan-logo.png";
const background = "#000000";
const trimmed = await sharp(source).trim({ threshold: 24 }).png().toBuffer();

async function writeIcon(size, dest) {
  const inner = Math.round(size * 0.8);
  const artwork = await sharp(trimmed)
    .resize(inner, inner, {
      fit: "inside",
      background,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: artwork, gravity: "centre" }])
    .png()
    .toFile(dest);
}

await writeIcon(192, "public/icon-192.png");
await writeIcon(512, "public/icon-512.png");
await writeIcon(180, "public/apple-touch-icon.png");
await writeIcon(32, "src/app/icon.png");
