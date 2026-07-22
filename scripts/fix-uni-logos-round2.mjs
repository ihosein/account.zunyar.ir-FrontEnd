import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/images/university");
const ROOT = path.resolve(__dirname, "..");
const UA = "UniLogoFix/1.4";
const DELAY = 1200;

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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0d9488"/><text x="64" y="72" text-anchor="middle" fill="white" font-size="36" font-family="Tahoma,sans-serif">${xx}</text></svg>`;
}

function isPlaceholder(p) {
  try {
    const t = fs.readFileSync(p, "utf8");
    return t.includes('fill="#0d9488"') && t.includes("<svg");
  } catch {
    return false;
  }
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

function sniff(buf, ct, name) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf.slice(0, 200).toString("utf8").includes("<svg")) return ".svg";
  const m = (ct || "").toLowerCase();
  if (m.includes("svg")) return ".svg";
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  const mm = String(name || "")
    .toLowerCase()
    .match(/\.(svg|png|jpe?g)$/);
  return mm ? (mm[1].startsWith("jp") ? ".jpg" : "." + mm[1]) : ".bin";
}

async function search(q) {
  await sleep(DELAY);
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=10&format=json&srsearch=" +
    encodeURIComponent(q);
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  const text = await r.text();
  if (text.startsWith("You are")) return [];
  try {
    const j = JSON.parse(text);
    return (j.query?.search || [])
      .map((s) => String(s.title || "").replace(/^File:/i, ""))
      .filter((t) => /\.(svg|png|jpe?g)$/i.test(t));
  } catch {
    return [];
  }
}

async function grab(slug, filename, width = 320) {
  await sleep(DELAY);
  const isSvg = /\.svg$/i.test(filename);
  let url =
    "https://commons.wikimedia.org/wiki/Special:FilePath/" +
    encodeURIComponent(filename);
  if (!isSvg && width) url += `?width=${width}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) {
    console.log(slug, filename, "HTTP", r.status);
    return false;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 120) return false;
  const head = buf.slice(0, 160).toString("utf8");
  if (/<!DOCTYPE|<html/i.test(head)) return false;
  // reject obvious non-logos / maps by size heuristics later
  const ext = sniff(buf, r.headers.get("content-type"), filename);
  if (ext === ".bin") return false;
  clear(slug);
  fs.writeFileSync(path.join(OUT, slug + ext), buf);
  console.log(slug, "OK", slug + ext, buf.length);
  return true;
}

async function main() {
  // Reset wrong assignments
  for (const slug of ["birjand", "farhangian"]) {
    clear(slug);
    fs.writeFileSync(path.join(OUT, slug + ".svg"), placeholder(slug));
    console.log("reset", slug);
  }

  const targets = {
    birjand: ["University of Birjand", "Birjand University logo", "دانشگاه بیرجند"],
    farhangian: ["Farhangian University logo", "دانشگاه فرهنگیان لوگو"],
    ferdowsi: ["Ferdowsi University of Mashhad seal", "FUM logo svg"],
    bu_ali_sina: ["Bu-Ali Sina University", "Hamadan University logo"],
    urmia: ["Urmia University logo", "University of Urmia seal"],
    zanjan: ["University of Zanjan logo", "Zanjan University seal"],
    yasouj: ["Yasuj University", "Yasouj University logo"],
    shahrekord: ["Shahrekord University logo"],
    damghan: ["Damghan University logo"],
    maragheh: ["University of Maragheh logo"],
    valiasr_rafsanjan: ["Vali-e-Asr University of Rafsanjan", "Valiasr University"],
    sistan: ["University of Sistan and Baluchestan logo"],
    hormozgan: ["University of Hormozgan logo"],
    shahrood_tech: ["Shahrood University of Technology logo"],
  };

  for (const [slug, queries] of Object.entries(targets)) {
    console.log("\n==", slug);
    const files = [];
    for (const q of queries) {
      const hits = await search(q);
      console.log(" search", q, "->", hits.slice(0, 4).join(" | "));
      for (const h of hits) {
        // skip maps / campus photos / medals
        if (/map|campus|medal|order|gate|entrance|building|photo/i.test(h)) continue;
        if (!files.includes(h)) files.push(h);
      }
    }
    let ok = false;
    for (const f of files.slice(0, 6)) {
      if (await grab(slug, f)) {
        ok = true;
        break;
      }
    }
    if (!ok) console.log(slug, "still missing");
  }

  // regenerate catalog via regen script
  const { spawnSync } = await import("node:child_process");
  spawnSync(process.execPath, [path.join(__dirname, "regen-uni-catalog.mjs")], {
    stdio: "inherit",
    cwd: ROOT,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
