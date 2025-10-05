import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const USE_MW = process.env.NEXT_USE_MIDDLEWARE === 'true';

export function middleware(request: NextRequest) {
  // Simple passthrough middleware - no authentication checks
  return NextResponse.next();
}

export const config = {
  matcher: USE_MW ? [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ] : [],
};