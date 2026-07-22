/**
 * Fix / complete university logos from Wikimedia Commons.
 * Overwrites known-wrong files and fills placeholders.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "images", "university");
const UA = "UniLogoFix/1.2 (https://account.zunyar.ir; education UI logos)";
const DELAY = 1100;

/** Curated Commons filenames — prefer official / vector seals. */
const FIXES = {
  tehran: ["Full-logo.svg"],
  tabriz: [
    "University of tabriz vector blue org.svg",
    "University of tabriz vector blue.svg",
  ],
  ferdowsi: [
    "Ferdowsi University of Mashhad logo.png",
    "Seal of Ferdowsi University of Mashhad.svg",
  ],
  bu_ali_sina: ["Bu-Ali Sina University logo.png", "University of Bu-Ali Sina.png"],
  urmia: ["Urmia University logo.png", "University of Urmia.png"],
  zanjan: ["University of Zanjan logo.png"],
  shahrood_tech: ["Shahrood University of Technology logo.png", "SUT logo.png"],
  sistan: ["University of Sistan and Baluchestan logo.png", "USB logo.png"],
  hormozgan: ["University of Hormozgan logo.png"],
  qom: ["University of Qom logo.png", "Qom University.png"],
  arak: ["Arak University logo.png"],
  ilam: ["Ilam University logo.png"],
  yasouj: ["Yasouj University logo.png", "Yasuj University logo.png"],
  birjand: ["University of Birjand logo.png"],
  valiasr_rafsanjan: ["Vali-e-Asr University of Rafsanjan logo.png"],
  maragheh: ["University of Maragheh logo.png"],
  damghan: ["Damghan University logo.png"],
  shahrekord: ["Shahrekord University logo.png"],
  zabol: ["University of Zabol logo.png"],
  bojnord: ["University of Bojnord logo.png"],
  malayer: ["Malayer University logo.png"],
  golestan: ["Golestan University logo.png"],
  farhangian: ["Farhangian University logo.png", "Farhangian University.png"],
  // also refresh a few that may be wrong / oversized
  art_uni: ["Tehran University of Art LOGO.svg"],
  payame_noor: ["Payam-e-noor university.jpg", "Payame Noor University logo.png"],
};

const LABELS = JSON.parse(fs.readFileSync(path.join(OUT, "manifest.json"), "utf8"));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPlaceholder(filePath) {
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
  if (buf.slice(0, 280).toString("utf8").includes("<svg")) return ".svg";
  const m = (contentType || "").toLowerCase();
  if (m.includes("svg")) return ".svg";
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  const mm = String(name || "")
    .toLowerCase()
    .match(/\.(svg|png|jpe?g)$/);
  return mm ? (mm[1].startsWith("jp") ? ".jpg" : "." + mm[1]) : ".bin";
}

function clearSlug(slug, keep) {
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

async function resolveCommons(filename) {
  await sleep(DELAY);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&titles=" +
    encodeURIComponent("File:" + filename) +
    "&prop=imageinfo&iiprop=url|mime&format=json";
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const text = await res.text();
  if (text.startsWith("You are")) return null; // rate limit plain text
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  for (const p of Object.values(data?.query?.pages || {})) {
    if (p.missing != null) return null;
    const ii = p.imageinfo?.[0];
    if (ii?.url) return { url: ii.url, mime: ii.mime || "" };
  }
  return null;
}

async function download(url, width) {
  await sleep(DELAY);
  const u = width ? `${url}${url.includes("?") ? "&" : "?"}width=${width}` : url;
  const res = await fetch(u, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 80) return null;
  const head = buf.slice(0, 200).toString("utf8");
  if (/<!DOCTYPE|<html/i.test(head)) return null;
  return { buf, contentType: res.headers.get("content-type") || "" };
}

async function searchCommons(query) {
  await sleep(DELAY);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch=" +
    encodeURIComponent(query);
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
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

async function grab(slug, filenames) {
  const tried = new Set();
  const queue = [...filenames];
  while (queue.length) {
    const filename = queue.shift();
    if (!filename || tried.has(filename)) continue;
    tried.add(filename);
    process.stdout.write(`  try ${filename} ... `);
    let info = await resolveCommons(filename);
    let url =
      info?.url ||
      `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    // Prefer thumbnail for huge rasters
    const isSvg = /\.svg$/i.test(filename) || (info?.mime || "").includes("svg");
    const result = await download(url, isSvg ? undefined : 320);
    if (!result) {
      console.log("fail");
      continue;
    }
    const ext = sniffExt(result.buf, result.contentType, filename);
    if (ext === ".bin") {
      console.log("bad type");
      continue;
    }
    const file = `${slug}${ext}`;
    clearSlug(slug, null);
    fs.writeFileSync(path.join(OUT, file), result.buf);
    console.log(`OK ${file} (${result.buf.length})`);
    return file;
  }
  return null;
}

function writeTs(manifest) {
  const system = ["azad", "payame_noor", "applied_science"];
  const publicEntries = Object.entries(manifest)
    .filter(([s]) => !system.includes(s))
    .sort((a, b) => a[1].label.localeCompare(b[1].label, "fa"));
  const lines = [];
  lines.push("/** Auto-generated by scripts/fix-uni-logos.mjs — do not edit by hand. */");
  lines.push("");
  lines.push("export type UniOption = { value: string; label: string; logo: string };");
  lines.push("");
  lines.push("export const SYSTEM_UNI_LOGOS = {");
  for (const slug of system) {
    lines.push(`  ${slug}: "/images/university/${manifest[slug].file}",`);
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
  lines.push("/** Resolve logo path for an education row (system unit / public uni / none). */");
  lines.push("export function educationLogoUrl(");
  lines.push("  institutionType?: string | null,");
  lines.push("  schoolName?: string | null,");
  lines.push("): string | undefined {");
  lines.push(
    '  if (institutionType === "azad" || institutionType === "payame_noor" || institutionType === "applied_science") {',
  );
  lines.push("    return SYSTEM_UNI_LOGOS[institutionType];");
  lines.push("  }");
  lines.push('  if (institutionType === "public" && schoolName) {');
  lines.push("    const match = PUBLIC_UNIVERSITIES.find((u) => u.label === schoolName);");
  lines.push("    return match?.logo;");
  lines.push("  }");
  lines.push("  return undefined;");
  lines.push("}");
  lines.push("");
  fs.writeFileSync(path.join(ROOT, "lib", "iran-public-universities.ts"), lines.join("\n"), "utf8");
}

async function main() {
  const manifest = { ...LABELS };
  const slugs = Object.keys(FIXES);

  // Also auto-target all current placeholders
  for (const f of fs.readdirSync(OUT)) {
    if (!f.endsWith(".svg")) continue;
    const slug = f.replace(/\.svg$/, "");
    if (slug === "applied_science" || slug === "alzahra" || slug === "isfahan_tech") continue;
    const p = path.join(OUT, f);
    if (isPlaceholder(p) && !FIXES[slug]) {
      const label = manifest[slug]?.label || slug;
      FIXES[slug] = [];
      slugs.push(slug);
      // queue search later via label
      FIXES[`__search_${slug}`] = label;
    }
  }

  for (const slug of Object.keys(FIXES)) {
    if (slug.startsWith("__search_")) continue;
    const filenames = [...(FIXES[slug] || [])];
    const label = manifest[slug]?.label;
    if (label) {
      const found = await searchCommons(`${label} logo`);
      for (const f of found.slice(0, 4)) {
        if (!filenames.includes(f)) filenames.push(f);
      }
      const foundEn = await searchCommons(`${slug.replace(/_/g, " ")} university logo`);
      for (const f of foundEn.slice(0, 3)) {
        if (!filenames.includes(f)) filenames.push(f);
      }
    }
    console.log(`\n[${slug}]`);
    const file = await grab(slug, filenames);
    if (file) {
      manifest[slug] = { ...(manifest[slug] || { label: slug }), file };
    } else {
      console.log("  NO UPDATE");
    }
  }

  // sync file paths from disk for all manifest entries
  for (const slug of Object.keys(manifest)) {
    const files = fs
      .readdirSync(OUT)
      .filter((f) => f.startsWith(slug + ".") && !f.endsWith(".tmp"));
    if (!files.length) continue;
    let chosen = files[0];
    for (const f of files) {
      if (!isPlaceholder(path.join(OUT, f))) {
        chosen = f;
        break;
      }
    }
    manifest[slug].file = chosen;
  }

  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  writeTs(manifest);

  let real = 0;
  let ph = 0;
  for (const [slug, m] of Object.entries(manifest)) {
    const p = path.join(OUT, m.file);
    if (isPlaceholder(p)) ph++;
    else real++;
  }
  console.log(`\nDone. real=${real} placeholder=${ph}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
