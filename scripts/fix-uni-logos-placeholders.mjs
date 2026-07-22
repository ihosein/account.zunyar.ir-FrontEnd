#!/usr/bin/env node
/**
 * Curated second-pass: fill placeholders + fix known bad matches.
 * Stricter Commons search: filename must overlap university tokens.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "images", "university");
const UA = "UniLogoFixPass/1.0 (https://account.zunyar.ir)";
const DELAY = 1000;

const TARGETS = {
  birjand: {
    commons: [],
    queries: ["University of Birjand logo", "Birjand University seal", "دانشگاه بیرجند"],
    require: ["birjand"],
  },
  ferdowsi: {
    commons: ["Seal of Ferdowsi University of Mashhad.svg", "Ferdowsi University of Mashhad logo.png"],
    queries: ["Ferdowsi University Mashhad logo", "FUM seal"],
    require: ["ferdowsi", "fum", "mashhad"],
  },
  bu_ali_sina: {
    commons: ["Bu-Ali Sina University logo.png"],
    queries: ["Bu-Ali Sina University logo", "Bu Ali Sina Hamadan logo"],
    require: ["bu-ali", "bu ali", "sina", "hamedan", "hamadan"],
  },
  urmia: {
    commons: [],
    queries: ["Urmia University logo", "University of Urmia logo"],
    require: ["urmia", "orumiyeh", "urumieh"],
  },
  zanjan: {
    commons: [],
    queries: ["University of Zanjan logo", "Zanjan University logo"],
    require: ["zanjan"],
  },
  shahrood_tech: {
    commons: [],
    queries: ["Shahrood University of Technology logo", "Shahroud University logo"],
    require: ["shahrood", "shahroud", "sut"],
  },
  hormozgan: {
    commons: [],
    queries: ["University of Hormozgan logo", "Hormozgan University logo"],
    require: ["hormozgan", "bandar abbas"],
  },
  yasouj: {
    commons: [],
    queries: ["Yasuj University logo", "Yasouj University logo"],
    require: ["yasuj", "yasouj"],
  },
  valiasr_rafsanjan: {
    commons: [],
    queries: ["Vali-e-Asr University of Rafsanjan logo", "Valiasr Rafsanjan logo"],
    require: ["rafsanjan", "vali", "valiasr"],
  },
  maragheh: {
    commons: [],
    queries: ["University of Maragheh logo", "Maragheh University logo"],
    require: ["maragheh", "maragha"],
  },
  damghan: {
    commons: [],
    queries: ["Damghan University logo"],
    require: ["damghan"],
  },
  shahrekord: {
    commons: [],
    queries: ["Shahrekord University logo", "Shahr-e Kord University logo"],
    require: ["shahrekord", "shahr-e kord", "kord"],
  },
  farhangian: {
    commons: [],
    queries: ["Farhangian University logo", "دانشگاه فرهنگیان"],
    require: ["farhangian", "فرهنگیان"],
  },
};

const REJECT = /\b(campus|map|aerial|building|gate|entrance|photo|panorama|view|former seal of the)\b/i;
const PREFER = /\b(logo|seal|arm|emblem|vector|نشان|لوگو)\b/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPlaceholder(fp) {
  try {
    const t = fs.readFileSync(fp, "utf8");
    return t.includes('fill="#0d9488"') && t.includes("<svg");
  } catch {
    return false;
  }
}

function sniff(buf, ct, name) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf.slice(0, 280).toString("utf8").includes("<svg")) return ".svg";
  const m = (ct || "").toLowerCase();
  if (m.includes("svg")) return ".svg";
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  const mm = String(name || "").toLowerCase().match(/\.(svg|png|jpe?g)$/);
  return mm ? (mm[1].startsWith("jp") ? ".jpg" : "." + mm[1]) : ".bin";
}

function clear(slug, keep) {
  for (const f of fs.readdirSync(OUT)) {
    if (f === "manifest.json") continue;
    if (keep && f === keep) continue;
    if (f.startsWith(slug + ".")) {
      try {
        fs.unlinkSync(path.join(OUT, f));
      } catch {}
    }
  }
}

function nameOk(filename, requireTokens) {
  const n = filename.toLowerCase();
  if (REJECT.test(n) && !PREFER.test(n)) return false;
  if (!requireTokens?.length) return PREFER.test(n);
  return requireTokens.some((t) => n.includes(String(t).toLowerCase()));
}

async function resolve(filename) {
  await sleep(DELAY);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
    encodeURIComponent("File:" + filename) +
    "&prop=imageinfo&iiprop=url|mime&format=json";
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  const text = await res.text();
  if (text.startsWith("You are")) return null;
  try {
    const data = JSON.parse(text);
    for (const p of Object.values(data?.query?.pages || {})) {
      if (p.missing != null) return null;
      const ii = p.imageinfo?.[0];
      if (ii?.url) return { url: ii.url, mime: ii.mime || "" };
    }
  } catch {}
  return null;
}

async function search(q) {
  await sleep(DELAY);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=15&format=json&srsearch=" +
    encodeURIComponent(q);
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  const text = await res.text();
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

async function grab(slug, filename) {
  const info = await resolve(filename);
  let url =
    info?.url ||
    `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  const isSvg = /\.svg$/i.test(filename) || (info?.mime || "").includes("svg");
  if (!isSvg) url += (url.includes("?") ? "&" : "?") + "width=320";
  await sleep(DELAY);
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) return false;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 120) return false;
  const head = buf.slice(0, 200).toString("utf8");
  if (/<!DOCTYPE|<html/i.test(head)) return false;
  if (/Main Entrance|Tehran gate/i.test(buf.slice(0, 4000).toString("utf8"))) return false;
  const ext = sniff(buf, res.headers.get("content-type"), filename);
  if (ext === ".bin") return false;
  const file = slug + ext;
  clear(slug, null);
  fs.writeFileSync(path.join(OUT, file), buf);
  console.log(`  OK ${file} from ${filename} (${buf.length})`);
  return true;
}

async function main() {
  let ok = 0;
  let fail = 0;
  for (const [slug, meta] of Object.entries(TARGETS)) {
    const existing = fs.readdirSync(OUT).find((f) => f.startsWith(slug + "."));
    if (existing && !isPlaceholder(path.join(OUT, existing)) && slug !== "birjand") {
      console.log(slug, "already real, skip");
      continue;
    }
    console.log(slug + "...");
    const tried = new Set();
    let done = false;
    for (const fn of meta.commons || []) {
      if (tried.has(fn)) continue;
      tried.add(fn);
      process.stdout.write(`  curated ${fn} ...`);
      if (await grab(slug, fn)) {
        ok++;
        done = true;
        break;
      }
      console.log(" fail");
    }
    if (done) continue;
    for (const q of meta.queries || []) {
      const hits = await search(q);
      for (const fn of hits) {
        if (tried.has(fn)) continue;
        tried.add(fn);
        if (!nameOk(fn, meta.require)) continue;
        process.stdout.write(`  hit ${fn} ...`);
        if (await grab(slug, fn)) {
          ok++;
          done = true;
          break;
        }
        console.log(" fail");
      }
      if (done) break;
    }
    if (!done) {
      console.log("  still placeholder");
      fail++;
    }
  }
  console.log(`\npass2 done ok=${ok} still_missing=${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
