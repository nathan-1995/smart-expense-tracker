import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Determine if this is the app subdomain
  const isAppDomain = hostname.startsWith('app.') || hostname.startsWith('localhost')

  // Define app routes (auth + dashboard + admin)
  const appRoutes = [
    '/login',
    '/register',
    '/verify-email',
    '/forgot-password',
    '/dashboard',
    '/admin',
    '/clients',
    '/invoices',
  ]

  // Check if current path is an app route
  const isAppRoute = appRoutes.some(route => pathname.startsWith(route))

  // Marketing domain trying to access app routes → redirect to app subdomain
  if (isAppRoute && !isAppDomain) {
    const appUrl = new URL(request.url)

    // In production, redirect to app.fintracker.cc
    if (hostname.includes('fintracker.cc')) {
      appUrl.hostname = 'app.fintracker.cc'
      return NextResponse.redirect(appUrl)
    }
  }

  // App domain trying to access marketing homepage → redirect to marketing domain
  if (pathname === '/' && isAppDomain && !hostname.startsWith('localhost')) {
    const marketingUrl = new URL(request.url)
    marketingUrl.hostname = 'fintracker.cc'
    return NextResponse.redirect(marketingUrl)
  }

  return NextResponse.next()
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg).*)',
  ],
}
