import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "images", "university");
const CURL_TIMEOUT = "15";
const UA = "UniLogoFetcher/1.0 (https://account.zunyar.ir; education UI logos)";
const DELAY_MS = 1500;

/** Prefer verified commons filenames / direct upload URLs. */
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
  amirkabir: { label: "دانشگاه صنعتی امیرکبیر", commons: [] },
  iust: { label: "دانشگاه علم و صنعت ایران", commons: [] },
  tarbiat_modares: { label: "دانشگاه تربیت مدرس", commons: [] },
  shahid_beheshti: { label: "دانشگاه شهید بهشتی", commons: ["Sbu-logo.jpg"] },
  allameh: { label: "دانشگاه علامه طباطبائی", commons: ["ATU Logo - new 01.png"] },
  khaje_nasir: { label: "دانشگاه خواجه نصیرالدین طوسی", commons: [] },
  isfahan: { label: "دانشگاه اصفهان", commons: ["University of Isfahan Logo.png"] },
  shiraz: { label: "دانشگاه شیراز", commons: [] },
  ferdowsi: { label: "دانشگاه فردوسی مشهد", commons: [] },
  tabriz: { label: "دانشگاه تبریز", commons: ["Azarabadegan logo.jpg"] },
  guilan: { label: "دانشگاه گیلان", commons: ["University of Guilan.png"] },
  razi: { label: "دانشگاه رازی", commons: ["Raziuniversitykermanshah.png"] },
  bu_ali_sina: { label: "دانشگاه بوعلی سینا", commons: [] },
  urmia: { label: "دانشگاه ارومیه", commons: [] },
  yazd: { label: "دانشگاه یزد", commons: ["University of Yazd.jpg"] },
  kashan: { label: "دانشگاه کاشان", commons: ["Kashanlogo.jpg"] },
  zanjan: { label: "دانشگاه زنجان", commons: [] },
  semnan: { label: "دانشگاه سمنان", commons: ["Semnan university logo.png"] },
  alzahra: { label: "دانشگاه الزهرا", commons: ["AlzahraUniversityLogo.svg"] },
  kharazmi: { label: "دانشگاه خوارزمی", commons: [] },
  industry_petroleum: { label: "دانشگاه صنعت نفت", commons: ["PUT logo.jpg"] },
  sahand: { label: "دانشگاه صنعتی سهند", commons: ["Sahand University of Technology.png"] },
  babol_noshirvani: {
    label: "دانشگاه صنعتی نوشیروانی بابل",
    commons: ["Nooshirvani of Babol University of Technology Logo.png"],
  },
  shahrood_tech: { label: "دانشگاه صنعتی شاهرود", commons: [] },
  isfahan_tech: {
    label: "دانشگاه صنعتی اصفهان",
    commons: ["Isfahan University of Technology (seal).svg"],
  },
  malek_ashtar: { label: "دانشگاه صنعتی مالک اشتر", commons: ["Eng-mau-arm.png"] },
  shahid_bahonar: { label: "دانشگاه شهید باهنر کرمان", commons: ["Bahonar university.png"] },
  kurdistan: { label: "دانشگاه کردستان", commons: ["University of kurdistan iran.png"] },
  lorestan: { label: "دانشگاه لرستان", commons: ["Lorestan University Logo.png"] },
  mazandaran: { label: "دانشگاه مازندران", commons: ["MAZUST logo.jpg"] },
  sistan: { label: "دانشگاه سیستان و بلوچستان", commons: [] },
  hormozgan: { label: "دانشگاه هرمزگان", commons: [] },
  bushehr: { label: "دانشگاه خلیج فارس بوشهر", commons: ["Persian Gulf university logo.png"] },
  qom: { label: "دانشگاه قم", commons: [] },
  qazvin: { label: "دانشگاه بین‌المللی امام خمینی", commons: ["Qiet-logo.png"] },
  arak: { label: "دانشگاه اراک", commons: [] },
  ilam: { label: "دانشگاه ایلام", commons: [] },
  yasouj: { label: "دانشگاه یاسوج", commons: [] },
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
  birjand: { label: "دانشگاه بیرجند", commons: [] },
  valiasr_rafsanjan: { label: "دانشگاه ولی‌عصر رفسنجان", commons: [] },
  persian_gulf: { label: "دانشگاه خلیج فارس", commons: ["Persian Gulf university logo.png"] },
  maragheh: { label: "دانشگاه مراغه", commons: [] },
  damghan: { label: "دانشگاه دامغان", commons: [] },
  iasbs: { label: "پژوهشگاه تحصیلات تکمیلی علوم پایه زنجان", commons: ["IASBS logo.jpg"] },
  shahid_chamran: { label: "دانشگاه شهید چمران اهواز", commons: ["EUT-Logo.png"] },
  shahrekord: { label: "دانشگاه شهرکرد", commons: [] },
  zabol: { label: "دانشگاه زابل", commons: [] },
  bojnord: { label: "دانشگاه بجنورد", commons: [] },
  malayer: { label: "دانشگاه ملایر", commons: [] },
  golestan: { label: "دانشگاه گلستان", commons: [] },
  farhangian: { label: "دانشگاه فرهنگیان", commons: [] },
  art_uni: { label: "دانشگاه هنر", commons: ["Logo of Iranian Academy of the Arts.jpg"] },
  iribu: { label: "دانشگاه صدا و سیما", commons: ["IRIU.jpg"] },
};

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
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

function curlText(args) {
  const r = spawnSync("curl.exe", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  return { status: r.status, stdout: r.stdout || "" };
}

function curlBin(args) {
  return spawnSync("curl.exe", args, { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 });
}

function resolveCommonsUrl(filename) {
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
    encodeURIComponent("File:" + filename) +
    "&prop=imageinfo&iiprop=url|mime&format=json";
  sleep(DELAY_MS);
  const { status, stdout } = curlText(["-sL", "--max-time", CURL_TIMEOUT, "-A", UA, api]);
  if (status !== 0 || !stdout) return null;
  try {
    const data = JSON.parse(stdout);
    for (const p of Object.values(data?.query?.pages || {})) {
      if (p.missing != null) return null;
      const ii = p.imageinfo?.[0];
      if (ii?.url) return { url: ii.url, mime: ii.mime || "" };
    }
  } catch {
    return null;
  }
  return null;
}

function downloadUrl(url, dest) {
  sleep(DELAY_MS);
  const headersPath = dest + ".hdr";
  const r = curlBin([
    "-sL",
    "--fail",
    "--max-time",
    CURL_TIMEOUT,
    "-A",
    UA,
    "-D",
    headersPath,
    "-o",
    dest,
    url,
  ]);
  let contentType = "";
  let httpStatus = 0;
  try {
    const hdr = fs.readFileSync(headersPath, "utf8");
    for (const line of hdr.split(/\r?\n/)) {
      const m = line.match(/^HTTP\/[\d.]+ (\d+)/i);
      if (m) httpStatus = Number(m[1]);
      const ct = line.match(/^content-type:\s*(.+)/i);
      if (ct) contentType = ct[1].trim();
    }
  } catch {}
  try {
    fs.unlinkSync(headersPath);
  } catch {}

  if (httpStatus === 429) {
    try {
      fs.unlinkSync(dest);
    } catch {}
    return { ok: false, retry: true, contentType };
  }
  if (r.status !== 0) {
    try {
      fs.unlinkSync(dest);
    } catch {}
    return { ok: false, retry: false, contentType };
  }
  try {
    const buf = fs.readFileSync(dest);
    if (buf.length < 80) {
      fs.unlinkSync(dest);
      return { ok: false, retry: false, contentType };
    }
    const head = buf.slice(0, 256).toString("utf8");
    if (/<!DOCTYPE|<html/i.test(head)) {
      fs.unlinkSync(dest);
      return { ok: false, retry: /429|rate limit/i.test(head), contentType };
    }
  } catch {
    return { ok: false, retry: false, contentType };
  }
  return { ok: true, retry: false, contentType };
}

function extFromMimeOrName(mime, name) {
  const m = (mime || "").toLowerCase();
  if (m.includes("svg")) return ".svg";
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("gif")) return ".gif";
  if (m.includes("webp")) return ".webp";
  const n = String(name || "").toLowerCase();
  const mm = n.match(/\.(svg|png|jpe?g|gif|webp)$/);
  if (!mm) return ".bin";
  return mm[1].startsWith("jp") ? ".jpg" : "." + mm[1];
}

function sniffExt(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0x89 && buf[1] === 0x50) return ".png";
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf[0] === 0x47 && buf[1] === 0x49) return ".gif";
  if (buf.slice(0, 200).toString("utf8").includes("<svg")) return ".svg";
  return ".bin";
}

function writePlaceholder(slug) {
  const file = `${slug}.svg`;
  fs.writeFileSync(path.join(OUT_DIR, file), placeholderSvg(slug), "utf8");
  return file;
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
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (!f.startsWith(slug + ".")) continue;
    if (f.endsWith(".hdr") || f.endsWith(".tmp")) continue;
    const p = path.join(OUT_DIR, f);
    if (isPlaceholderFile(p)) continue;
    return f;
  }
  return null;
}

function downloadOne(slug, meta) {
  const existing = existingRealFile(slug);
  if (existing) return { file: existing, source: "download" };

  for (const filename of meta.commons || []) {
    let url;
    let mime = "";
    const info = resolveCommonsUrl(filename);
    if (info) {
      url = info.url;
      mime = info.mime;
    } else {
      url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const tmp = path.join(OUT_DIR, `${slug}.download.tmp`);
      const { ok, retry } = downloadUrl(url, tmp);
      if (ok) {
        let ext = extFromMimeOrName(mime, filename);
        if (ext === ".bin") ext = sniffExt(tmp);
        const file = `${slug}${ext}`;
        const finalPath = path.join(OUT_DIR, file);
        fs.copyFileSync(tmp, finalPath);
        try { fs.unlinkSync(tmp); } catch {}
        clearSlugFiles(slug, file);
        return { file, source: "download" };
      }
      if (retry) {
        process.stdout.write("(429) ");
        sleep(12000 * (attempt + 1));
        continue;
      }
      break;
    }
  }

  clearSlugFiles(slug);
  return { file: writePlaceholder(slug), source: "placeholder" };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = {};
  let downloaded = 0;
  let placeholders = 0;
  const slugs = Object.keys(UNIVERSITIES);
  console.log(`Fetching ${slugs.length} university logos -> ${OUT_DIR}`);

  for (const slug of slugs) {
    process.stdout.write(`  ${slug} ... `);
    const { file, source } = downloadOne(slug, UNIVERSITIES[slug]);
    manifest[slug] = { file, label: UNIVERSITIES[slug].label, source };
    if (source === "download") {
      downloaded++;
      console.log(`OK (${file})`);
    } else {
      placeholders++;
      console.log(`placeholder (${file})`);
    }
  }

  const publicManifest = {};
  for (const [slug, m] of Object.entries(manifest)) {
    publicManifest[slug] = { file: m.file, label: m.label };
  }
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(publicManifest, null, 2) + "\n", "utf8");

  const systems = ["azad", "payame_noor", "applied_science"];
  const publicOptions = slugs
    .filter((s) => !systems.includes(s))
    .map((slug) => ({
      value: slug,
      label: manifest[slug].label,
      logo: `/images/university/${manifest[slug].file}`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fa"));

  const ts = `/** Auto-generated by scripts/fetch-uni-logos.mjs — do not edit by hand. */

export type UniOption = { value: string; label: string; logo: string };

export const SYSTEM_UNI_LOGOS = {
  azad: "/images/university/${manifest.azad.file}",
  payame_noor: "/images/university/${manifest.payame_noor.file}",
  applied_science: "/images/university/${manifest.applied_science.file}",
} as const;

export const PUBLIC_UNIVERSITIES: UniOption[] = ${JSON.stringify(publicOptions, null, 2)};

export const PUBLIC_UNIVERSITY_OTHER = "other";
`;
  fs.writeFileSync(path.join(ROOT, "lib", "iran-public-universities.ts"), ts, "utf8");

  console.log("\n--- Summary ---");
  console.log(`Total: ${slugs.length}`);
  console.log(`Real downloads: ${downloaded}`);
  console.log(`Generated SVGs: ${placeholders}`);
}

main();