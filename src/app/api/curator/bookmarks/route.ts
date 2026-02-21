import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

interface BookmarkNode {
  type?: string;
  name?: string;
  url?: string;
  children?: BookmarkNode[];
  [key: string]: unknown;
}

interface BookmarkResult {
  name: string;
  url: string;
  path: string;
}

function findYouTubeBookmarks(
  node: BookmarkNode,
  currentPath = ""
): BookmarkResult[] {
  const results: BookmarkResult[] = [];
  const nodePath = currentPath
    ? `${currentPath}/${node.name || ""}`
    : node.name || "";

  if (node.type === "url" && node.url) {
    const url = node.url;
    const isChannel =
      (url.includes("youtube.com") || url.includes("youtu.be")) &&
      (url.includes("/channel/") ||
        url.includes("/@") ||
        url.includes("/c/") ||
        url.includes("/user/")) &&
      !url.includes("/watch?") &&
      !url.includes("/playlist?") &&
      !url.includes("/feed/");

    if (isChannel) {
      results.push({ name: node.name || "", url, path: nodePath });
    }
  }

  if (node.children) {
    for (const child of node.children) {
      results.push(...findYouTubeBookmarks(child, nodePath));
    }
  }

  return results;
}

/**
 * Remove bookmarks matching the given URLs from the tree.
 * Returns the number of removed entries.
 */
function removeBookmarksByUrl(node: BookmarkNode, urlsToRemove: Set<string>): number {
  let removed = 0;

  if (node.children) {
    const before = node.children.length;
    node.children = node.children.filter((child) => {
      if (child.type === "url" && child.url && urlsToRemove.has(child.url)) {
        removed++;
        return false;
      }
      return true;
    });
    // Recurse into remaining folders
    for (const child of node.children) {
      if (child.children) {
        removed += removeBookmarksByUrl(child, urlsToRemove);
      }
    }
  }

  return removed;
}

function getChromeBookmarksPath(): string | null {
  const home = os.homedir();
  const platform = process.platform;

  const paths =
    platform === "win32"
      ? [
          path.join(
            home,
            "AppData",
            "Local",
            "Google",
            "Chrome",
            "User Data",
            "Default",
            "Bookmarks"
          ),
          path.join(
            home,
            "AppData",
            "Local",
            "Google",
            "Chrome",
            "User Data",
            "Profile 1",
            "Bookmarks"
          ),
        ]
      : platform === "darwin"
        ? [
            path.join(
              home,
              "Library",
              "Application Support",
              "Google",
              "Chrome",
              "Default",
              "Bookmarks"
            ),
          ]
        : [path.join(home, ".config", "google-chrome", "Default", "Bookmarks")];

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function GET() {
  const bookmarksPath = getChromeBookmarksPath();

  if (!bookmarksPath) {
    return NextResponse.json(
      { error: "Chrome bookmarks file not found", bookmarks: [] },
      { status: 404 }
    );
  }

  try {
    const raw = fs.readFileSync(bookmarksPath, "utf-8");
    const data = JSON.parse(raw);
    const roots = data.roots || {};

    const allBookmarks: BookmarkResult[] = [];
    for (const root of Object.values(roots)) {
      if (root && typeof root === "object") {
        allBookmarks.push(...findYouTubeBookmarks(root as BookmarkNode));
      }
    }

    return NextResponse.json({ bookmarks: allBookmarks });
  } catch (e) {
    console.error("Failed to read Chrome bookmarks:", e);
    return NextResponse.json(
      { error: "Failed to read bookmarks", bookmarks: [] },
      { status: 500 }
    );
  }
}

/** DELETE — remove specific bookmark URLs from Chrome's bookmarks file */
export async function DELETE(req: NextRequest) {
  const { urls } = await req.json();

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: "Provide urls as an array" },
      { status: 400 }
    );
  }

  const bookmarksPath = getChromeBookmarksPath();
  if (!bookmarksPath) {
    return NextResponse.json(
      { error: "Chrome bookmarks file not found" },
      { status: 404 }
    );
  }

  try {
    const raw = fs.readFileSync(bookmarksPath, "utf-8");
    const data = JSON.parse(raw);
    const urlsToRemove = new Set<string>(urls);

    let totalRemoved = 0;
    for (const root of Object.values(data.roots || {})) {
      if (root && typeof root === "object") {
        totalRemoved += removeBookmarksByUrl(root as BookmarkNode, urlsToRemove);
      }
    }

    if (totalRemoved > 0) {
      // Update checksum (Chrome recalculates it, but we clear it to be safe)
      delete data.checksum;
      fs.writeFileSync(bookmarksPath, JSON.stringify(data, null, 3));
    }

    return NextResponse.json({ removed: totalRemoved });
  } catch (e) {
    console.error("Failed to modify Chrome bookmarks:", e);
    return NextResponse.json(
      { error: "Failed to modify bookmarks" },
      { status: 500 }
    );
  }
}
