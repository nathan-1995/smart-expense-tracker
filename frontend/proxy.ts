import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "jose";

/**
 * Decode and validate JWT token expiration
 * Returns true if token is valid and not expired
 */
function isTokenValid(token: string): boolean {
  try {
    const decoded = decodeJwt(token);

    // Check if token has expiration claim
    if (!decoded.exp) {
      return false;
    }

    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp > currentTime;
  } catch (error) {
    // If decoding fails, token is invalid
    return false;
  }
}

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // Determine if this is the app subdomain
  const isAppDomain =
    hostname.startsWith("app.") || hostname.startsWith("localhost");

  // Define app routes (auth + dashboard + admin)
  const appRoutes = [
    "/login",
    "/register",
    "/verify-email",
    "/forgot-password",
    "/dashboard",
    "/admin",
    "/clients",
    "/invoices",
  ];

  // Check if current path is an app route
  const isAppRoute = appRoutes.some((route) => pathname.startsWith(route));

  // Marketing domain trying to access app routes → redirect to app subdomain
  if (isAppRoute && !isAppDomain) {
    const appUrl = new URL(request.url);

    // Determine correct app subdomain based on environment
    if (hostname.includes("dev.fintracker.cc")) {
      // Dev environment: dev.fintracker.cc → app.dev.fintracker.cc
      appUrl.hostname = "app.dev.fintracker.cc";
      return NextResponse.redirect(appUrl);
    } else if (hostname.includes("fintracker.cc")) {
      // Production: fintracker.cc → app.fintracker.cc
      appUrl.hostname = "app.fintracker.cc";
      return NextResponse.redirect(appUrl);
    }
  }

  // App domain trying to access marketing homepage → redirect to marketing domain
  if (
    pathname === "/" &&
    isAppDomain &&
    !hostname.startsWith("localhost")
  ) {
    const marketingUrl = new URL(request.url);

    // Redirect to appropriate marketing domain based on environment
    if (hostname.includes("app.dev.fintracker.cc")) {
      marketingUrl.hostname = "dev.fintracker.cc";
    } else {
      marketingUrl.hostname = "fintracker.cc";
    }

    return NextResponse.redirect(marketingUrl);
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/", "/verify-email"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Check if token exists and is valid
  const hasValidToken = accessToken ? isTokenValid(accessToken) : false;

  // If token exists but is expired, clear cookies and redirect to login
  if (accessToken && !hasValidToken) {
    const response = NextResponse.redirect(new URL("/login", request.url));

    // Clear expired cookies
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");

    return response;
  }

  // If user is not authenticated and trying to access a protected route
  if (!hasValidToken && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access login/register, redirect to dashboard
  if (hasValidToken && (pathname === "/login" || pathname === "/register")) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.pdf).*)",
  ],
};
