import {
  readStorageJson,
  writeStorageJsonCapped,
} from "@/lib/os/storage";

export type FeedKind =
  | "research"
  | "memory"
  | "complete"
  | "dispatch"
  | "spawn"
  | "fault";

export type FeedFilter = "all" | "spawn" | "memory" | "command";

export interface StoredFeedEntry {
  id: string;
  kind: FeedKind;
  icon: string;
  prefix: string;
  text: string;
  ts: number;
}

export const WORKSPACE_FEED_STORAGE_KEY = "devfactory-workspace-feed";
export const MAX_PERSISTED_FEED = 50;

const VALID_KINDS = new Set<FeedKind>([
  "research",
  "memory",
  "complete",
  "dispatch",
  "spawn",
  "fault",
]);

function isStoredFeedEntry(value: unknown): value is StoredFeedEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as StoredFeedEntry;
  return (
    typeof e.id === "string" &&
    typeof e.kind === "string" &&
    VALID_KINDS.has(e.kind as FeedKind) &&
    typeof e.icon === "string" &&
    typeof e.prefix === "string" &&
    typeof e.text === "string" &&
    typeof e.ts === "number"
  );
}

export function readPersistedFeed(): StoredFeedEntry[] {
  const raw = readStorageJson<unknown[]>(WORKSPACE_FEED_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isStoredFeedEntry).slice(0, MAX_PERSISTED_FEED);
}

export function persistFeed(entries: StoredFeedEntry[]): void {
  writeStorageJsonCapped(WORKSPACE_FEED_STORAGE_KEY, entries, MAX_PERSISTED_FEED);
}

export function matchesFeedFilter(kind: FeedKind, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  if (filter === "spawn") return kind === "spawn";
  if (filter === "memory") return kind === "memory";
  return kind === "dispatch" || kind === "research" || kind === "complete";
}
