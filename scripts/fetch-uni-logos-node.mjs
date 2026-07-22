/**
 * Cross-platform university logo fetcher (uses global fetch).
 * Writes to public/images/university and regenerates lib/iran-public-universities.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "images", "university");
const UA = "UniLogoFetcher/1.1 (https://account.zunyar.ir; education UI logos)";
const DELAY_MS = 800;

/** Force re-download for known-wrong cached logos. */
const FORCE = new Set(["tehran", "tabriz"]);

const UNIVERSITIES = {
  azad: { label: "دانشگاه آزاد اسلامی", commons: ["Azad-logo-uni-parsabad.jpg"], system: true },
  payame_noor: { label: "دانشگاه پیام نور", commons: ["Payam-e-noor university.jpg"], system: true },
  applied_science: {
    label: "دانشگاه جامع علمی کاربردی",
    commons: ["University of Applied Science and Technology UAST Logo.svg"],
    system: true,
  },
  tehran: { label: "دانشگاه تهران", commons: ["Full-logo.svg"] },
  sharif: { label: "دانشگاه صنعتی شریف", commons: ["Sharif Foundation Logo.png"] },
  amirkabir: {
    label: "دانشگاه صنعتی امیرکبیر",
    commons: ["Amirkabir University of Technology logo.png", "AUT Logo.png"],
  },
  iust: {
    label: "دانشگاه علم و صنعت ایران",
    commons: ["IUST logo.png", "Iran University of Science and Technology logo.svg"],
  },
  tarbiat_modares: {
    label: "دانشگاه تربیت مدرس",
    commons: ["Tarbiat Modares University logo.png", "TMU logo.png"],
  },
  shahid_beheshti: { label: "دانشگاه شهید بهشتی", commons: ["Sbu-logo.jpg"] },
  allameh: { label: "دانشگاه علامه طباطبائی", commons: ["ATU Logo - new 01.png"] },
  khaje_nasir: {
    label: "دانشگاه خواجه نصیرالدین طوسی",
    commons: ["K. N. Toosi University of Technology logo.png"],
  },
  isfahan: { label: "دانشگاه اصفهان", commons: ["University of Isfahan Logo.png"] },
  shiraz: {
    label: "دانشگاه شیراز",
    commons: ["Shiraz University logo.png", "Logo of Shiraz University.svg"],
  },
  ferdowsi: {
    label: "دانشگاه فردوسی مشهد",
    commons: ["Ferdowsi University of Mashhad logo.png", "FUM Logo.png"],
  },
  tabriz: {
    label: "دانشگاه تبریز",
    commons: ["University of tabriz vector blue org.svg", "University of tabriz vector blue.svg"],
  },
  guilan: { label: "دانشگاه گیلان", commons: ["University of Guilan.png"] },
  razi: { label: "دانشگاه رازی", commons: ["Raziuniversitykermanshah.png"] },
  bu_ali_sina: { label: "دانشگاه بوعلی سینا", commons: ["Bu-Ali Sina University logo.png", "University of Bu-Ali Sina.png"] },
  urmia: { label: "دانشگاه ارومیه", commons: ["Urmia University logo.png", "University of Urmia.png"] },
  yazd: { label: "دانشگاه یزد", commons: ["University of Yazd.jpg"] },
  kashan: { label: "دانشگاه کاشان", commons: ["Kashanlogo.jpg"] },
  zanjan: { label: "دانشگاه زنجان", commons: ["University of Zanjan logo.png"] },
  semnan: { label: "دانشگاه سمنان", commons: ["Semnan university logo.png"] },
  alzahra: { label: "دانشگاه الزهرا", commons: ["AlzahraUniversityLogo.svg"] },
  kharazmi: { label: "دانشگاه خوارزمی", commons: ["Kharazmi University logo.png"] },
  industry_petroleum: { label: "دانشگاه صنعت نفت", commons: ["PUT logo.jpg"] },
  sahand: { label: "دانشگاه صنعتی سهند", commons: ["Sahand University of Technology.png"] },
  babol_noshirvani: {
    label: "دانشگاه صنعتی نوشیروانی بابل",
    commons: ["Nooshirvani of Babol University of Technology Logo.png"],
  },
  shahrood_tech: { label: "دانشگاه صنعتی شاهرود", commons: ["Shahrood University of Technology logo.png", "SUT logo.png"] },
  isfahan_tech: {
    label: "دانشگاه صنعتی اصفهان",
    commons: ["Isfahan University of Technology (seal).svg"],
  },
  malek_ashtar: { label: "دانشگاه صنعتی مالک اشتر", commons: ["Eng-mau-arm.png"] },
  shahid_bahonar: { label: "دانشگاه شهید باهنر کرمان", commons: ["Bahonar university.png"] },
  kurdistan: { label: "دانشگاه کردستان", commons: ["University of kurdistan iran.png"] },
  lorestan: { label: "دانشگاه لرستان", commons: ["Lorestan University Logo.png"] },
  mazandaran: { label: "دانشگاه مازندران", commons: ["MAZUST logo.jpg"] },
  sistan: { label: "دانشگاه سیستان و بلوچستان", commons: ["University of Sistan and Baluchestan logo.png", "USB logo.png"] },
  hormozgan: { label: "دانشگاه هرمزگان", commons: ["University of Hormozgan logo.png"] },
  bushehr: { label: "دانشگاه خلیج فارس بوشهر", commons: ["Persian Gulf university logo.png"] },
  qom: { label: "دانشگاه قم", commons: ["University of Qom logo.png", "Qom University.png"] },
  qazvin: { label: "دانشگاه بین‌المللی امام خمینی", commons: ["Qiet-logo.png"] },
  arak: { label: "دانشگاه اراک", commons: ["Arak University logo.png"] },
  ilam: { label: "دانشگاه ایلام", commons: ["Ilam University logo.png"] },
  yasouj: { label: "دانشگاه یاسوج", commons: ["Yasouj University logo.png", "Yasuj University logo.png"] },
  jahrom: { label: "دانشگاه جهرم", commons: ["Jahrom University.jpg"] },
  gonbad: { label: "دانشگاه گنبد کاووس", commons: ["GonbadUniv.png"] },
  kazerun_salman: {
    label: "دانشگاه سلمان فارسی کازرون",
    commons: ["Salman Farsi University of Kazerun logo.jpg"],
  },
  madani_azar: {
    label: "دانشگاه شهید مدنی آذربایجان",
    commons: ["Azarbaijan Shahid Madani University.png"],
  },
  hakim_sabzevari: { label: "دانشگاه حکیم سبزواری", commons: ["HakimUNI.png"] },
  birjand: { label: "دانشگاه بیرجند", commons: ["University of Birjand logo.png"] },
  valiasr_rafsanjan: { label: "دانشگاه ولی‌عصر رفسنجان", commons: ["Vali-e-Asr University of Rafsanjan logo.png"] },
  persian_gulf: { label: "دانشگاه خلیج فارس", commons: ["Persian Gulf university logo.png"] },
  maragheh: { label: "دانشگاه مراغه", commons: ["University of Maragheh logo.png"] },
  damghan: { label: "دانشگاه دامغان", commons: ["Damghan University logo.png"] },
  iasbs: { label: "پژوهشگاه تحصیلات تکمیلی علوم پایه زنجان", commons: ["IASBS logo.jpg"] },
  shahid_chamran: { label: "دانشگاه شهید چمران اهواز", commons: ["EUT-Logo.png"] },
  shahrekord: { label: "دانشگاه شهرکرد", commons: ["Shahrekord University logo.png"] },
  zabol: { label: "دانشگاه زابل", commons: ["University of Zabol logo.png"] },
  bojnord: { label: "دانشگاه بجنورد", commons: ["University of Bojnord logo.png"] },
  malayer: { label: "دانشگاه ملایر", commons: ["Malayer University logo.png"] },
  golestan: { label: "دانشگاه گلستان", commons: ["Golestan University logo.png"] },
  farhangian: { label: "دانشگاه فرهنگیان", commons: ["Farhangian University logo.png", "Farhangian University.png"] },
  art_uni: { label: "دانشگاه هنر", commons: ["Tehran University of Art LOGO.svg", "Logo of Iranian Academy of the Arts.jpg"] },
  iribu: { label: "دانشگاه صدا و سیما", commons: ["IRIU.jpg"] },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function initials(slug) {
  const parts = slug.split("_").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (slug.replace(/_/g, "").slice(0, 2) || "UN").toUpperCase();
}

function placeholderSvg(slug) {
  const xx = initials(slug);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0d9488"/>
  <text x="64" y="72" text-anchor="middle" fill="white" font-size="36" font-family="Tahoma,sans-serif">${xx}</text>
</svg>
`;
}

function isPlaceholderFile(filePath) {
  try {
    const t = fs.readFileSync(filePath, "utf8");
    return t.includes('fill="#0d9488"') && t.includes("<svg");
  } catch {
    return false;
  }
}

function sniffExt(buf, contentType, name) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf[0] === 0x47 && buf[1] === 0x49) return ".gif";
  const head = buf.slice(0, 200).toString("utf8");
  if (head.includes("<svg")) return ".svg";
  const m = (contentType || "").toLowerCase();
  if (m.includes("svg")) return ".svg";
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  const n = String(name || "").toLowerCase();
  const mm = n.match(/\.(svg|png|jpe?g|gif|webp)$/);
  if (!mm) return ".bin";
  return mm[1].startsWith("jp") ? ".jpg" : "." + mm[1];
}

function clearSlugFiles(slug, keepFile = null) {
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f === "manifest.json") continue;
    if (keepFile && f === keepFile) continue;
    if (f.endsWith(".tmp") || f.endsWith(".hdr")) continue;
    if (f === slug || f.startsWith(slug + ".")) {
      try {
        fs.unlinkSync(path.join(OUT_DIR, f));
      } catch {}
    }
  }
}

function existingRealFile(slug) {
  if (typeof FORCE !== "undefined" && FORCE.has(slug)) return null;
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.startsWith(slug + ".")) continue;
    if (f.endsWith(".hdr") || f.endsWith(".tmp")) continue;
    const p = path.join(OUT_DIR, f);
    if (isPlaceholderFile(p)) continue;
    return f;
  }
  return null;
}

async function resolveCommonsUrl(filename) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
    encodeURIComponent("File:" + filename) +
    "&prop=imageinfo&iiprop=url|mime&format=json";
  await sleep(DELAY_MS);
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const data = await res.json();
  for (const p of Object.values(data?.query?.pages || {})) {
    if (p.missing != null) return null;
    const ii = p.imageinfo?.[0];
    if (ii?.url) return { url: ii.url, mime: ii.mime || "" };
  }
  return null;
}

async function downloadUrl(url) {
  await sleep(DELAY_MS);
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  if (res.status === 429) return { ok: false, retry: true };
  if (!res.ok) return { ok: false, retry: false };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 80) return { ok: false, retry: false };
  const head = buf.slice(0, 256).toString("utf8");
  if (/<!DOCTYPE|<html/i.test(head)) {
    return { ok: false, retry: /429|rate limit/i.test(head) };
  }
  return { ok: true, buf, contentType: res.headers.get("content-type") || "" };
}


const REJECT_NAME = /\b(campus|map|aerial|building|buildings|gate|entrance|portal|facade|photo|photograph|night|panorama|view|stadium|dormitory|satellite)\b/i;
const PREFER_NAME = /\b(logo|seal|arm|emblem|coat|badge|نشان|آرم|لوگو|vector)\b/i;

const EN_NAMES = {
  tehran: "University of Tehran",
  tabriz: "University of Tabriz",
  bu_ali_sina: "Bu-Ali Sina University",
  urmia: "Urmia University",
  zanjan: "University of Zanjan",
  shahrood_tech: "Shahrood University of Technology",
  sistan: "University of Sistan and Baluchestan",
  hormozgan: "University of Hormozgan",
  qom: "University of Qom",
  arak: "Arak University",
  ilam: "Ilam University",
  yasouj: "Yasouj University",
  birjand: "University of Birjand",
  valiasr_rafsanjan: "Vali-e-Asr University of Rafsanjan",
  maragheh: "University of Maragheh",
  damghan: "Damghan University",
  shahrekord: "Shahrekord University",
  zabol: "University of Zabol",
  bojnord: "University of Bojnord",
  malayer: "Malayer University",
  golestan: "Golestan University",
  farhangian: "Farhangian University",
  ferdowsi: "Ferdowsi University of Mashhad",
  art_uni: "Tehran University of Art",
};

function scoreFilename(name) {
  const n = String(name || "");
  let score = 0;
  if (PREFER_NAME.test(n)) score += 10;
  if (/\.svg$/i.test(n)) score += 3;
  if (REJECT_NAME.test(n)) score -= 50;
  return score;
}

async function searchCommons(query) {
  await sleep(DELAY_MS);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=12&format=json&srsearch=" +
    encodeURIComponent(query);
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const raw = await res.text();
  if (raw.startsWith("You are")) return [];
  try {
    const j = JSON.parse(raw);
    return (j.query?.search || [])
      .map((s) => String(s.title || "").replace(/^File:/i, ""))
      .filter((t) => /\.(svg|png|jpe?g)$/i.test(t))
      .filter((t) => scoreFilename(t) > 0)
      .sort((a, b) => scoreFilename(b) - scoreFilename(a));
  } catch {
    return [];
  }
}

async function downloadOne(slug, meta) {
  const existing = existingRealFile(slug);
  if (existing) return { file: existing, source: "cached" };

  const tried = new Set();
  const queue = [...(meta.commons || [])];

  async function tryFile(filename) {
    if (!filename || tried.has(filename)) return null;
    tried.add(filename);
    if (REJECT_NAME.test(filename) && !PREFER_NAME.test(filename)) return null;
    let url;
    let mime = "";
    const info = await resolveCommonsUrl(filename);
    if (info) {
      url = info.url;
      mime = info.mime;
    } else {
      url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await downloadUrl(url);
      if (result.ok) {
        // reject Tehran gate SVG content
        const sniff = result.buf.slice(0, 5000).toString("utf8");
        if (/Main Entrance|Tehran gate/i.test(sniff)) return null;
        const ext = sniffExt(result.buf, result.contentType || mime, filename);
        if (ext === ".bin") return null;
        const file = `${slug}${ext}`;
        fs.writeFileSync(path.join(OUT_DIR, file), result.buf);
        clearSlugFiles(slug, file);
        return { file, source: "download" };
      }
      if (result.retry) {
        process.stdout.write("(429) ");
        await sleep(10000 * (attempt + 1));
        continue;
      }
      break;
    }
    return null;
  }

  while (queue.length) {
    const filename = queue.shift();
    process.stdout.write(`try:${String(filename).slice(0, 36)} `);
    const got = await tryFile(filename);
    if (got) return got;
  }

  const en = EN_NAMES[slug];
  const queries = [];
  if (en) {
    queries.push(`${en} logo`);
    queries.push(`${en} seal`);
  }
  queries.push(`${meta.label} لوگو`);
  for (const q of queries) {
    process.stdout.write(`search:${q.slice(0, 24)} `);
    const hits = await searchCommons(q);
    for (const filename of hits.slice(0, 6)) {
      process.stdout.write(`try:${filename.slice(0, 32)} `);
      const got = await tryFile(filename);
      if (got) return got;
    }
  }

  const file = `${slug}.svg`;
  fs.writeFileSync(path.join(OUT_DIR, file), placeholderSvg(slug), "utf8");
  clearSlugFiles(slug, file);
  return { file, source: "placeholder" };
}

function writeTs(manifest) {
  const system = ["azad", "payame_noor", "applied_science"];
  const publicEntries = Object.entries(manifest)
    .filter(([slug]) => !system.includes(slug))
    .sort((a, b) => a[1].label.localeCompare(b[1].label, "fa"));

  const lines = [];
  lines.push("/** Auto-generated by scripts/fetch-uni-logos-node.mjs — do not edit by hand. */");
  lines.push("");
  lines.push("export type UniOption = { value: string; label: string; logo: string };");
  lines.push("");
  lines.push("export const SYSTEM_UNI_LOGOS = {");
  for (const slug of system) {
    const m = manifest[slug];
    lines.push(`  ${slug}: "/images/university/${m.file}",`);
  }
  lines.push("} as const;");
  lines.push("");
  lines.push("export const PUBLIC_UNIVERSITIES: UniOption[] = [");
  for (const [slug, m] of publicEntries) {
    lines.push("  {");
    lines.push(`    value: "${slug}",`);
    lines.push(`    label: ${JSON.stringify(m.label)},`);
    lines.push(`    logo: "/images/university/${m.file}"`);
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");
  lines.push('export const PUBLIC_UNIVERSITY_OTHER = "other";');
  lines.push("");

  fs.writeFileSync(path.join(ROOT, "lib", "iran-public-universities.ts"), lines.join("\n"), "utf8");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  let downloaded = 0;
  let cached = 0;
  let placeholders = 0;

  for (const [slug, meta] of Object.entries(UNIVERSITIES)) {
    process.stdout.write(`${slug}... `);
    const { file, source } = await downloadOne(slug, meta);
    manifest[slug] = { file, label: meta.label };
    if (source === "download") downloaded++;
    else if (source === "cached") cached++;
    else placeholders++;
    console.log(`${source} -> ${file}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  writeTs(manifest);
  console.log(`\nDone. downloaded=${downloaded} cached=${cached} placeholders=${placeholders}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
