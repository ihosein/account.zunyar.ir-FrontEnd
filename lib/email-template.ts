/** قالب پیش‌نمایش ایمیل — هم‌تراز با EmailHtmlTemplate سمت سرور. */

export type EmailBrandKey = "account" | "zunyar" | "zunko" | "custom";

export const EMAIL_DEFAULTS = {
  brandKey: "account" as EmailBrandKey,
  brandName: "زانیار اکانت",
  brandSubtitle: "account.zunyar.ir",
  footer:
    "این پیام از سامانه زانیار اکانت ارسال شده است.\nاگر این ایمیل برای شما نیست، نادیده بگیرید.",
  bodyHtml:
    '<p style="margin:0;text-align:right;">سلام {نام}،</p><p style="margin:12px 0 0;text-align:right;">متن پیام خود را اینجا بنویسید.</p>',
} as const;

/** مسیرهای نسبی برای سلکتور پنل و لود از public */
export const EMAIL_LOGO_LOCAL = {
  zunyar: "/images/ZunyarLoaderBlack.png",
  zunko: "/images/zunko-email.png",
} as const;

const PUBLIC_ASSET_HOST = "https://account.zunyar.ir";
const ZUNYAR_SITE = "https://zunyar.ir";
const ZUNKO_SITE = "https://zunko.ir";
const ACCOUNT_SITE = "https://account.zunyar.ir";

/** پایهٔ تصاویر — در مرورگر همان origin فعلی تا پیش‌نمایش کار کند. */
export function resolveEmailImagesBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/images`;
  }
  return `${PUBLIC_ASSET_HOST}/images`;
}

export function emailLogoUrl(kind: "zunyar" | "zunko", imagesBase?: string): string {
  const base = (imagesBase || resolveEmailImagesBase()).replace(/\/$/, "");
  return kind === "zunko" ? `${base}/zunko-email.png` : `${base}/ZunyarLoaderBlack.png`;
}

export type EmailComposeMode = "template" | "raw";

export type EmailTemplateFields = {
  brandKey: EmailBrandKey;
  subject: string;
  headline: string;
  body: string;
  footer: string;
  brandName: string;
  brandSubtitle: string;
  /** لوگوی سفارشی برند سایر (data URI) */
  brandLogo?: string;
};

export type EmailBrandPreset = {
  key: EmailBrandKey;
  brandName: string;
  brandSubtitle: string;
  headerUrl: string;
  logoKind: "zunyar" | "zunko";
  selectImage: string;
};

export const EMAIL_BRAND_PRESETS: Record<Exclude<EmailBrandKey, "custom">, EmailBrandPreset> = {
  account: {
    key: "account",
    brandName: "زانیار اکانت",
    brandSubtitle: "account.zunyar.ir",
    headerUrl: ACCOUNT_SITE,
    logoKind: "zunyar",
    selectImage: EMAIL_LOGO_LOCAL.zunyar,
  },
  zunyar: {
    key: "zunyar",
    brandName: "زانیار",
    brandSubtitle: "zunyar.ir",
    headerUrl: ZUNYAR_SITE,
    logoKind: "zunyar",
    selectImage: EMAIL_LOGO_LOCAL.zunyar,
  },
  zunko: {
    key: "zunko",
    brandName: "زانکو",
    brandSubtitle: "zunko.ir",
    headerUrl: ZUNKO_SITE,
    logoKind: "zunko",
    selectImage: EMAIL_LOGO_LOCAL.zunko,
  },
};

export function resolveBrandAssets(
  fields: Pick<EmailTemplateFields, "brandKey" | "brandName" | "brandSubtitle" | "brandLogo">,
  imagesBase?: string,
): {
  brandName: string;
  brandSubtitle: string;
  headerLogo: string;
  headerUrl: string;
} {
  const customLogo = (fields.brandLogo || "").trim();
  const isCustom = fields.brandKey === "custom";

  if (isCustom) {
    const name = (fields.brandName ?? "").trim();
    const sub = (fields.brandSubtitle ?? "").trim();
    const headerLogo =
      customLogo &&
      (customLogo.startsWith("data:image/") ||
        customLogo.startsWith("https://") ||
        customLogo.startsWith("http://"))
        ? customLogo
        : emailLogoUrl("zunyar", imagesBase);
    return {
      brandName: name,
      brandSubtitle: sub,
      headerLogo,
      headerUrl: sub.startsWith("http")
        ? sub
        : sub.includes(".")
          ? `https://${sub}`
          : ZUNYAR_SITE,
    };
  }
  if (EMAIL_BRAND_PRESETS[fields.brandKey as Exclude<EmailBrandKey, "custom">]) {
    const p = EMAIL_BRAND_PRESETS[fields.brandKey as Exclude<EmailBrandKey, "custom">];
    return {
      brandName: p.brandName,
      brandSubtitle: p.brandSubtitle,
      headerLogo: emailLogoUrl(p.logoKind, imagesBase),
      headerUrl: p.headerUrl,
    };
  }
  const name = (fields.brandName || EMAIL_DEFAULTS.brandName).trim();
  const sub = (fields.brandSubtitle || EMAIL_DEFAULTS.brandSubtitle).trim();
  const blob = `${name} ${sub}`.toLowerCase();
  const isZunko = blob.includes("زانکو") || blob.includes("zunko");
  return {
    brandName: name,
    brandSubtitle: sub,
    headerLogo: emailLogoUrl(isZunko ? "zunko" : "zunyar", imagesBase),
    headerUrl: isZunko
      ? ZUNKO_SITE
      : sub.includes("account.")
        ? ACCOUNT_SITE
        : sub.startsWith("http")
          ? sub
          : sub.includes(".")
            ? `https://${sub}`
            : ZUNYAR_SITE,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function looksLikeHtml(s: string): boolean {
  const lower = s.toLowerCase();
  return (
    lower.includes("<p") ||
    lower.includes("<div") ||
    lower.includes("<br") ||
    lower.includes("<ul") ||
    lower.includes("<ol") ||
    lower.includes("<span") ||
    lower.includes("<strong") ||
    lower.includes("<b") ||
    lower.includes("<em") ||
    lower.includes("<i")
  );
}

function toBodyHtml(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return trimmed;
  return escapeHtml(trimmed).replace(/\r\n/g, "\n").replace(/\n/g, "<br/>");
}

function footerToHtml(footer: string): string {
  return escapeHtml(footer || EMAIL_DEFAULTS.footer)
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "<br/>");
}

function brandLinksHtml(imagesBase?: string): string {
  const zunyar = emailLogoUrl("zunyar", imagesBase);
  const zunko = emailLogoUrl("zunko", imagesBase);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 auto;">
  <tr>
    <td align="center" style="padding:0 10px;">
      <a href="${ZUNYAR_SITE}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
        <img src="${zunyar}" alt="زانیار" width="40" height="40" style="display:block;border:0;outline:none;height:40px;width:40px;border-radius:10px;" />
      </a>
    </td>
    <td align="center" style="padding:0 10px;">
      <a href="${ZUNKO_SITE}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
        <img src="${zunko}" alt="زانکو" width="40" height="40" style="display:block;border:0;outline:none;height:40px;width:40px;border-radius:10px;" />
      </a>
    </td>
  </tr>
</table>`;
}

export type BuildEmailHtmlOptions = {
  /** مثلاً https://localhost:3000/images برای پیش‌نمایش */
  imagesBase?: string;
  /** برای srcdoc تا مسیرهای نسبی resolve شوند */
  documentBaseHref?: string;
};

/** HTML کامل برای پیش‌نمایش / ارسال قالب‌دار. */
export function buildTemplateEmailHtml(
  fields: EmailTemplateFields,
  options?: BuildEmailHtmlOptions,
): string {
  const imagesBase = options?.imagesBase || resolveEmailImagesBase();
  const assets = resolveBrandAssets(fields, imagesBase);
  const pageTitle = (fields.subject || assets.brandName || EMAIL_DEFAULTS.brandName).trim();
  const headline = (fields.headline || fields.subject || "").trim();
  const bodyHtml = toBodyHtml(fields.body);
  const footerHtml = footerToHtml(fields.footer || EMAIL_DEFAULTS.footer);
  const brandLinks = brandLinksHtml(imagesBase);
  const baseHref =
    options?.documentBaseHref ||
    (typeof window !== "undefined" ? `${window.location.origin}/` : `${PUBLIC_ASSET_HOST}/`);
  const subtitleHtml = assets.brandSubtitle
    ? `<div style="margin-top:4px;font-size:12px;opacity:0.92;color:#ffffff;line-height:1.4;">${escapeHtml(assets.brandSubtitle)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${escapeHtml(baseHref)}" />
  <title>${escapeHtml(pageTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#eef3f6;font-family:Tahoma,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 28px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e,#0d9488 55%,#14b8a6);padding:22px 28px;color:#ffffff;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle;padding-left:14px;">
                    <a href="${assets.headerUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                      <img src="${assets.headerLogo}" alt="${escapeHtml(assets.brandName)}" width="44" height="44" style="display:block;border:0;outline:none;height:44px;width:44px;border-radius:12px;object-fit:cover;" />
                    </a>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;line-height:1.35;">${escapeHtml(assets.brandName)}</div>
                    ${subtitleHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 8px;">
              <h1 style="margin:0 0 18px;font-size:20px;line-height:1.55;color:#0f172a;font-weight:700;">${escapeHtml(headline)}</h1>
              <div style="font-size:14px;line-height:1.95;color:#334155;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 26px;border-top:1px solid #eef2f7;font-size:11px;color:#94a3b8;line-height:1.8;">
              ${brandLinks}
              <div style="margin-top:16px;">${footerHtml}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailPreviewHtml(
  mode: EmailComposeMode,
  fields: EmailTemplateFields,
  options?: BuildEmailHtmlOptions,
): string {
  if (mode === "raw") {
    const raw = (fields.body || "").trim();
    if (!raw) {
      return `<!DOCTYPE html><html lang="fa" dir="rtl"><body style="font-family:Tahoma,sans-serif;padding:24px;color:#64748b;">HTML خالی است.</body></html>`;
    }
    if (/<html[\s>]/i.test(raw)) return raw;
    const base =
      options?.documentBaseHref ||
      (typeof window !== "undefined" ? `${window.location.origin}/` : `${PUBLIC_ASSET_HOST}/`);
    return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"/><base href="${escapeHtml(base)}"/></head><body style="font-family:Tahoma,Arial,sans-serif;padding:16px;">${raw}</body></html>`;
  }
  return buildTemplateEmailHtml(fields, options);
}
