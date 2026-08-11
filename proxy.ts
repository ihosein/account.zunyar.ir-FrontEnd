import { NextRequest, NextResponse } from "next/server";

/**
 * Pretty public resume URLs: /{slug} → /r/{slug}
 * Proxy sees a decoded pathname, so Persian (and other Unicode) slugs work.
 * next.config path-to-regexp rewrites often 404 on percent-encoded non-ASCII.
 */

const RESERVED = new Set([
  "panel",
  "login",
  "api",
  "r",
  "_next",
  "favicon.ico",
  "images",
  "fonts",
]);

const SLUG_RE =
  /^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/i;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname.includes(".")) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) {
    return NextResponse.next();
  }

  let slug = segments[0] || "";
  try {
    if (/%[0-9A-Fa-f]{2}/.test(slug)) {
      slug = decodeURIComponent(slug);
    }
  } catch {
    return NextResponse.next();
  }

  const lower = slug.toLowerCase();
  if (RESERVED.has(lower)) {
    return NextResponse.next();
  }
  if (slug.length < 3 || slug.length > 48 || !SLUG_RE.test(slug)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  // Percent-encode the segment so Node/undici never sees raw non-ASCII in the path
  url.pathname = `/r/${encodeURIComponent(slug)}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Single-segment paths only (public resume slugs).
     * Skip Next internals and known app roots.
     */
    "/((?!panel|login|api|r|_next|favicon\\.ico|images|fonts).*)",
  ],
};
