/** Inbox broadcast messages — seen + history + user archive live in browser localStorage. */

import type { InboxMessage } from "@/types/account";

const SEEN_KEY = "zy_seen_broadcast_ids";
const SEEN_META_KEY = "zy_seen_broadcast_meta_v1";
const ARCHIVE_KEY = "zy_inbox_archive_v1";
const DELETED_KEY = "zy_inbox_deleted_ids_v1";
const QUEUE_KEY = "zy_broadcast_queue";

export type ArchivedInboxMessage = InboxMessage & {
  receivedAt: string;
  seenAt?: string | null;
  /** بایگانی دستی کاربر (جدا از ذخیرهٔ تاریخچه). */
  userArchived?: boolean;
};

/** id → ISO seenAt */
function loadSeenMeta(): Map<number, string> {
  if (typeof window === "undefined") return new Map();
  try {
    const metaRaw = localStorage.getItem(SEEN_META_KEY);
    if (metaRaw) {
      const obj = JSON.parse(metaRaw) as Record<string, string>;
      const map = new Map<number, string>();
      for (const [k, v] of Object.entries(obj || {})) {
        const id = Number(k);
        if (Number.isFinite(id) && v) map.set(id, v);
      }
      return map;
    }
    // مهاجرت از آرایهٔ قدیمی idها
    const legacy = localStorage.getItem(SEEN_KEY);
    if (!legacy) return new Map();
    const arr = JSON.parse(legacy) as number[];
    const map = new Map<number, string>();
    const fallback = new Date().toISOString();
    for (const id of arr || []) {
      if (Number.isFinite(Number(id))) map.set(Number(id), fallback);
    }
    saveSeenMeta(map);
    return map;
  } catch {
    return new Map();
  }
}

function saveSeenMeta(map: Map<number, string>) {
  const obj: Record<string, string> = {};
  map.forEach((at, id) => {
    obj[String(id)] = at;
  });
  localStorage.setItem(SEEN_META_KEY, JSON.stringify(obj));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...map.keys()]));
}

export function loadSeenIds(): Set<number> {
  return new Set(loadSeenMeta().keys());
}

export function getMessageSeenAt(id: number): string | null {
  return loadSeenMeta().get(id) || null;
}

export function markMessageSeen(id: number) {
  if (typeof window === "undefined") return;
  const map = loadSeenMeta();
  if (!map.has(id)) {
    map.set(id, new Date().toISOString());
    saveSeenMeta(map);
  }
  touchArchiveSeen(id, map.get(id)!);
}

export function filterUnseen(messages: InboxMessage[]): InboxMessage[] {
  const seen = loadSeenIds();
  const deleted = loadDeletedIds();
  return (messages || []).filter(
    (m) => m?.id != null && !seen.has(m.id) && !deleted.has(m.id),
  );
}

function loadIdSet(key: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set((arr || []).map(Number).filter((n) => Number.isFinite(n)));
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, set: Set<number>) {
  localStorage.setItem(key, JSON.stringify([...set]));
}

export function loadDeletedIds(): Set<number> {
  return loadIdSet(DELETED_KEY);
}

/** همهٔ شناسه‌های ذخیره‌شده برای همگام‌سازی با سرور (شامل حذف‌شده‌های محلی). */
export function loadAllStoredMessageIds(): number[] {
  const ids = new Set<number>();
  for (const m of loadArchivedMessagesRaw()) {
    if (m?.id != null) ids.add(m.id);
  }
  for (const id of loadDeletedIds()) ids.add(id);
  return [...ids];
}

function saveHistory(list: ArchivedInboxMessage[]) {
  const sorted = [...list].sort((a, b) => {
    const ta = new Date(b.receivedAt || b.createdAt || 0).getTime();
    const tb = new Date(a.receivedAt || a.createdAt || 0).getTime();
    return ta - tb;
  });
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(sorted.slice(0, 200)));
}

/**
 * ذخیرهٔ پیام‌های دریافت‌شده برای تاریخچه.
 * پیام‌هایی که کاربر حذف کرده دوباره اضافه نمی‌شوند؛ وضعیت بایگانی کاربر حفظ می‌شود.
 */
export function archiveInboxMessages(messages: InboxMessage[] | null | undefined) {
  if (typeof window === "undefined") return;
  const list = (messages || []).filter((m) => m?.id != null);
  if (!list.length) return;

  const deleted = loadDeletedIds();
  const existing = loadArchivedMessagesRaw();
  const byId = new Map(existing.map((m) => [m.id, m]));
  const seenMeta = loadSeenMeta();
  const now = new Date().toISOString();

  for (const msg of list) {
    if (deleted.has(msg.id)) continue;
    const prev = byId.get(msg.id);
    byId.set(msg.id, {
      ...msg,
      receivedAt: prev?.receivedAt || msg.createdAt || now,
      seenAt: seenMeta.get(msg.id) || prev?.seenAt || null,
      userArchived: prev?.userArchived === true,
    });
  }

  saveHistory([...byId.values()]);
}

function loadArchivedMessagesRaw(): ArchivedInboxMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ArchivedInboxMessage[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function loadArchivedMessages(): ArchivedInboxMessage[] {
  if (typeof window === "undefined") return [];
  const deleted = loadDeletedIds();
  const seenMeta = loadSeenMeta();
  return loadArchivedMessagesRaw()
    .filter((m) => m?.id != null && !deleted.has(m.id))
    .map((m) => ({
      ...m,
      seenAt: seenMeta.get(m.id) || m.seenAt || null,
      userArchived: m.userArchived === true,
    }));
}

/** پیام‌های صندوق (غیر بایگانی‌شده توسط کاربر). */
export function loadInboxMessages(): ArchivedInboxMessage[] {
  return loadArchivedMessages().filter((m) => !m.userArchived);
}

/** پیام‌های بایگانی‌شده توسط کاربر. */
export function loadUserArchivedMessages(): ArchivedInboxMessage[] {
  return loadArchivedMessages().filter((m) => m.userArchived === true);
}

function touchArchiveSeen(id: number, seenAt: string) {
  try {
    const list = loadArchivedMessagesRaw();
    let changed = false;
    const next = list.map((m) => {
      if (m.id !== id) return m;
      changed = true;
      return { ...m, seenAt };
    });
    if (changed) saveHistory(next);
  } catch {
    // ignore
  }
}

/** بایگانی / خروج از بایگانی توسط کاربر. */
export function setMessagesUserArchived(ids: number[], archived: boolean) {
  if (typeof window === "undefined" || !ids.length) return;
  const idSet = new Set(ids);
  const next = loadArchivedMessagesRaw().map((m) =>
    idSet.has(m.id) ? { ...m, userArchived: archived } : m,
  );
  saveHistory(next);
}

/**
 * حذف از تاریخچهٔ کاربر (محلی).
 * اگر پیام هنوز روی سرور باشد، دوباره از API به لیست برنمی‌گردد.
 */
export function deleteMessagesFromHistory(ids: number[]) {
  if (typeof window === "undefined" || !ids.length) return;
  const deleted = loadDeletedIds();
  for (const id of ids) {
    if (Number.isFinite(id)) deleted.add(id);
  }
  saveIdSet(DELETED_KEY, deleted);

  const idSet = new Set(ids);
  saveHistory(loadArchivedMessagesRaw().filter((m) => !idSet.has(m.id)));

  const seen = loadSeenMeta();
  let seenChanged = false;
  for (const id of ids) {
    if (seen.delete(id)) seenChanged = true;
  }
  if (seenChanged) saveSeenMeta(seen);
}

/**
 * پیام‌هایی که ادمین از سیستم حذف کرده (دیگر در DB نیستند) از تاریخچه پاک می‌شوند.
 */
export function pruneMissingMessages(existingIds: Iterable<number>) {
  if (typeof window === "undefined") return;
  const existing = new Set(
    [...existingIds].map(Number).filter((n) => Number.isFinite(n)),
  );
  const raw = loadArchivedMessagesRaw();
  const kept = raw.filter((m) => existing.has(m.id));
  if (kept.length !== raw.length) {
    saveHistory(kept);
  }

  const deleted = loadDeletedIds();
  let deletedChanged = false;
  for (const id of [...deleted]) {
    if (!existing.has(id)) {
      deleted.delete(id);
      deletedChanged = true;
    }
  }
  if (deletedChanged) saveIdSet(DELETED_KEY, deleted);

  const seen = loadSeenMeta();
  let seenChanged = false;
  for (const id of [...seen.keys()]) {
    if (!existing.has(id)) {
      seen.delete(id);
      seenChanged = true;
    }
  }
  if (seenChanged) saveSeenMeta(seen);
}

/** Queue messages from login AuthResponse for the panel host to show. */
export function queueInboxMessages(messages: InboxMessage[] | null | undefined) {
  if (typeof window === "undefined") return;
  archiveInboxMessages(messages);
  const unseen = filterUnseen(messages || []);
  if (unseen.length === 0) {
    sessionStorage.removeItem(QUEUE_KEY);
    return;
  }
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(unseen));
  window.dispatchEvent(new Event("zy-broadcast-queue"));
}

export function takeQueuedInboxMessages(): InboxMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    sessionStorage.removeItem(QUEUE_KEY);
    if (!raw) return [];
    return filterUnseen(JSON.parse(raw) as InboxMessage[]);
  } catch {
    return [];
  }
}

export function levelTone(level?: string) {
  switch ((level || "").toUpperCase()) {
    case "CRITICAL":
    case "ALERT":
      return "danger" as const;
    case "WARNING":
      return "warning" as const;
    case "NOTICE":
      return "notice" as const;
    default:
      return "info" as const;
  }
}
