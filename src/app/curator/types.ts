export interface Upload {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  viewCount?: number | null;
  isTopViewed?: boolean;
}

export interface CuratorData {
  channel?: { name: string; id: string };
  uploads?: Upload[];
  reviewed: number;
  total: number;
  remaining?: number;
  approvedCount?: number;
  unsubCount?: number;
  starredCount?: number;
  isStarred?: boolean;
  done?: boolean;
  hasNewSubscriptions?: boolean;
  newSubCount?: number;
  skippedCount?: number;
  starredChannels?: { name: string; id: string }[];
  approvedChannels?: { name: string; id: string; labels?: string[] }[];
  rejectedCount?: number;
  unsubChannels?: { name: string; id: string }[];
}

export interface ApprovedChannel {
  name: string;
  id: string;
  labels?: string[];
  isStarred?: boolean;
}

export interface BookmarkEntry {
  name: string;
  url: string;
  path: string;
}

export interface CuratorStats {
  imported: number;
  approved: number;
  skipped: number;
  rejected: number;
  unsub: number;
  starred: number;
  pending: number;
  conflicts?: number;
  unreviewed?: number;
  noLabels?: number;
}

export type CuratorTab = "review" | "library" | "rejected";
export type ApprovedFilter = "all" | "has-labels" | "no-labels" | "starred";
export type QueueType = "tag-untagged" | "spot-check-rejected" | "re-audit-starred";

export interface FilteredChannel {
  name: string;
  id: string;
  topics: string[];
  importedAt?: string | null;
}

export type ApprovedView =
  | { mode: "landing" }
  | { mode: "direct-audit"; channel: ApprovedChannel }
  | { mode: "queue"; queueType: QueueType; channels: ApprovedChannel[] };

export const GENRE_LABELS = [
  "House",
  "Deep House",
  "Tech House",
  "Techno",
  "Minimal",
  "Rominimal",
  "Electro",
  "Breaks",
  "DnB",
  "Jungle",
  "Garage / UKG",
  "Ambient",
  "Downtempo",
  "Dub",
  "Disco",
  "Funk",
  "Acid",
  "Trance",
  "Industrial",
  "EBM",
  "Hip Hop",
  "Jazz",
  "Reggae",
  "Pop",
  "World",
  "Experimental",
  "Samples",
  "DJ Sets",
  "Live Sets",
];

export interface CoverageSegment {
  count: number;
  channels: { name: string; id: string; labels?: string[]; isStarred?: boolean }[];
}

export interface CoverageData {
  total: number;
  segments: {
    approved: CoverageSegment;
    rejected: CoverageSegment;
    unsub: CoverageSegment;
    skipped: CoverageSegment;
    unreviewed: CoverageSegment;
    conflict: CoverageSegment;
  };
}

export interface HealthData {
  conflicts: { name: string; id: string; issue: string }[];
  noLabels: number;
  noLabelsList: { name: string; id: string }[];
  scanErrors: number;
  scanErrorsList: { name: string; id: string; issue: string }[];
  neverScanned: number;
  neverScannedList: { name: string; id: string }[];
}
