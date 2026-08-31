import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware handles only cheap, request-shaped concerns.
 *
 * It deliberately does NOT make authorization decisions: it cannot reach the
 * database to confirm a session is still valid, so treating a cookie's presence
 * as proof of access would be exactly the "frontend route hiding" the security
 * PRD forbids. Every protected page and API route re-checks the session and
 * permissions server-side.
 */
export function middleware(request: NextRequest) {
  // Give server components the current path so layouts can build canonical
  // URLs, "next" redirect targets and page-level access checks without prop
  // drilling. It has to go onto the *request* headers — a header set on the
  // response is sent to the browser but is not visible to headers() in a
  // server component, which is where it is actually needed.
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set('x-pathname', request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: [
    /*
     * Skip Next internals and static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};
