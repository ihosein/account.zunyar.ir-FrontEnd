# زانیار اکانت (account.zunyar) — FrontEnd

Unified account & identity frontend for the Zunyar platform — profile, connected apps,
usernames, wallet/finance, active sessions, identity verification, and colleagues
management, shared across every Zunyar service (e.g. Zunko LMS).

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS 4 (`@tailwindcss/postcss`, `@theme`, CSS variables)
- HeroUI 3.2.1 (`@heroui/react`, `@heroui/styles`) — used where natural (buttons, etc.);
  glass cards and inputs are custom themed CSS.
- `next-themes` for light/dark switching
- RTL Persian UI, `Vazirmatn` font
- `lucide-react` icons, `clsx` for conditional classes

## Visual identity

Classic modern **dark-first** identity portal look — deep charcoal background
(`#0f1115` / `#12151c`), light ink text, muted gray secondary text, and a refined
teal / deep emerald-teal accent (`--zy-primary`). This is intentionally distinct
from the orange/navy branding of the Zunko frontend. All theme tokens live in
`app/globals.css` as `--zy-*` CSS variables, with `.glass-card` / `.glass-card-static`
/ `.glass-inner` providing the frosted-glass rim look in both themes.

The panel sidebar is **fixed flush to the physical right edge** of the viewport in RTL
(sticky, full height, no floating gap), unlike a floating rounded sidebar.

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

The dev server runs on **port 3010** (`next dev -p 3010`).

### Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8090/api` | Base URL of the Zunyar account backend API |

## Project structure

```
app/
  layout.tsx            Root HTML shell, fonts, Providers
  globals.css            Theme tokens (--zy-*), glass-card/glass-inner, utilities
  page.tsx               Redirects to /panel/profile or /login
  login/page.tsx         Phone + OTP / password auth flow
  panel/layout.tsx        Authenticated shell with the fixed sidebar
  panel/profile/          Personal info + password
  panel/apps/              Connected apps, panels & roles
  panel/usernames/         Username bindings per app/panel/role
  panel/finance/           Wallet balance + transactions
  panel/sessions/          Active sessions with revoke
  panel/verification/      Phone/email/national-ID/birth-certificate status
  panel/colleagues/        Manager/employee relationships across panels
components/
  providers.tsx            ThemeProvider + AuthProvider
  layout/AccountSidebar.tsx  Fixed, flush, full-height sidebar (+ mobile drawer)
  layout/ThemeToggle.tsx
  ui/GlassSelect.tsx        Themed dropdown (portal-based)
  ui/InputOTP.tsx            OTP boxes, displays Persian digits
  ui/PasswordFields.tsx     Password + confirm + strength meter
  ui/GlassDialog.tsx, ConfirmDialog.tsx
lib/
  api.ts        fetch wrapper, token storage
  auth.tsx      AuthProvider/useAuth — phone/OTP/password flows
  i18n.ts       t()/faNum() helpers over locales/fa.json
  otp-cooldown.ts   60s resend cooldown persisted in localStorage
  password-strength.ts
  iran-locations.ts  Province/city options
  ui.ts         Shared class names, formatMoney, formatRelativeTime
locales/fa.json  All Persian UI strings
types/account.ts  Shared domain types
```

## Auth flow

Phone number is checked first (`/auth/check-phone`):

- **Exists** → password login, with an OTP-login fallback (60s resend cooldown,
  persisted in `localStorage` so it survives refresh).
- **New** → OTP registration.

After **register** → `/panel/profile` (complete personal info + set a password).
After **login** → `/panel/apps` (see connected apps immediately).

All forms use `noValidate` with Persian-only inline error messages (no native
English browser validation bubbles).

## Notes

راهنمای استقرار پروداکشن: [`../DEPLOY.md`](../DEPLOY.md)

در پروداکشن مقدار `NEXT_PUBLIC_API_URL` باید آدرس عمومی API باشد (مثلاً `https://account.zunyar.ir/api`).
کد آزمایشی OTP در UI نمایش داده نمی‌شود؛ پیامک واقعی از SMS.ir می‌آید.
