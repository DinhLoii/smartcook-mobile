const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT_DIR = path.join("public", "splash");
const BG = "#208AEF";
const LOGO = "assets/images/splash-icon.png";

// [cssW, cssH, dpr, model]
const DEVICES = [
  [375, 667, 2, "SE2-8"],
  [390, 844, 3, "iPhone12-14"],
  [393, 852, 3, "iPhone14Pro-15"],
  [402, 874, 3, "iPhone16-17"],
  [414, 896, 2, "XR-11"],
  [414, 896, 3, "11ProXS"],
  [428, 926, 3, "12-13ProMax"],
  [430, 932, 3, "14ProMax-15Plus"],
  [440, 956, 3, "16-17ProMax"],
];

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const tags = [];
  for (const [w, h, dpr, model] of DEVICES) {
    const pxW = w * dpr;
    const pxH = h * dpr;
    const logoSize = Math.round(pxW * 0.32);
    const name = `splash-${w}x${h}@${dpr}x.png`;
    const logo = await sharp(LOGO)
      .resize({ width: logoSize, height: logoSize, fit: "inside" })
      .png()
      .toBuffer();
    await sharp({
      create: { width: pxW, height: pxH, channels: 4, background: BG },
    })
      .composite([{ input: logo, gravity: "center" }])
      .png()
      .toFile(path.join(OUT_DIR, name));

    tags.push(
      `        <link rel="apple-touch-startup-image" href="/splash/${name}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr})" />`
    );
  }
  console.log(tags.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
