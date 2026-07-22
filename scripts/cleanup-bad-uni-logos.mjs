import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "images", "university");
const UA = "UniLogoFix/1.5";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function placeholder(slug) {
  const xx = slug
    .split("_")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">',
    '<rect width="128" height="128" rx="24" fill="#0d9488"/>',
    `<text x="64" y="72" text-anchor="middle" fill="white" font-size="36" font-family="Tahoma,sans-serif">${xx}</text>`,
    "</svg>",
  ].join("");
}

function clear(slug) {
  for (const f of fs.readdirSync(OUT)) {
    if (f.startsWith(slug + ".")) {
      try {
        fs.unlinkSync(path.join(OUT, f));
      } catch {}
    }
  }
}

function sniff(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf.slice(0, 200).toString("utf8").includes("<svg")) return ".svg";
  return ".bin";
}

async function grab(slug, filename, width = 320) {
  await sleep(1400);
  const isSvg = /\.svg$/i.test(filename);
  let url =
    "https://commons.wikimedia.org/wiki/Special:FilePath/" +
    encodeURIComponent(filename);
  if (!isSvg && width) url += `?width=${width}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  process.stdout.write(`${slug} ${filename} -> ${r.status} `);
  if (!r.ok) {
    console.log("");
    return false;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 200) {
    console.log("tiny");
    return false;
  }
  const head = buf.slice(0, 160).toString("utf8");
  if (/<!DOCTYPE|<html/i.test(head)) {
    console.log("html");
    return false;
  }
  const ext = sniff(buf);
  if (ext === ".bin") {
    console.log("bad");
    return false;
  }
  clear(slug);
  fs.writeFileSync(path.join(OUT, slug + ext), buf);
  console.log("OK", slug + ext, buf.length);
  return true;
}

async function main() {
  const bad = ["ferdowsi", "birjand", "bu_ali_sina", "yasouj", "valiasr_rafsanjan"];
  for (const slug of bad) {
    clear(slug);
    fs.writeFileSync(path.join(OUT, slug + ".svg"), placeholder(slug));
    console.log("reset", slug);
  }

  // Only carefully curated logo files (not campus photos)
  const tries = [
    ["ferdowsi", "Ferdowsi University of Mashhad logo.svg"],
    ["ferdowsi", "Seal of the Ferdowsi University of Mashhad.svg"],
    ["bu_ali_sina", "Bu-Ali Sina University logo.svg"],
    ["urmia", "Urmia University logo.svg"],
    ["zanjan", "University of Zanjan logo.svg"],
    ["shahrekord", "Shahrekord University logo.svg"],
    ["sistan", "University of Sistan and Baluchestan logo.svg"],
    ["hormozgan", "University of Hormozgan logo.svg"],
    ["farhangian", "Farhangian University logo.svg"],
  ];

  for (const [slug, file] of tries) {
    await grab(slug, file);
  }

  spawnSync(process.execPath, [path.join(__dirname, "regen-uni-catalog.mjs")], {
    stdio: "inherit",
    cwd: ROOT,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
