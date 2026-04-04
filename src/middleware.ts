import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth(async (req) => {
  const isApi = req.nextUrl.pathname.startsWith("/api/curator");

  if (!req.auth) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Let the page handle its own auth gate (shows login UI)
    return;
  }

  // Read curator status from JWT (set once at login in auth.ts)
  const isCurator = (req.auth as unknown as { isCurator?: boolean }).isCurator;

  if (!isCurator) {
    if (isApi) return NextResponse.json({ error: "Not a curator" }, { status: 403 });
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/curator/:path*", "/api/curator/:path*"],
};
