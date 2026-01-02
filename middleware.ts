import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // Domain-based routing
  if (hostname.includes('ticketing.acehcs.in')) {
    // Redirect to /ticketing path if not already there
    if (!url.pathname.startsWith('/ticketing')) {
      url.pathname = `/ticketing${url.pathname}`
      return NextResponse.rewrite(url)
    }
  } else if (hostname.includes('ems.acehcs.in')) {
    // Redirect to /time-tracker path if not already there
    if (!url.pathname.startsWith('/time-tracker')) {
      url.pathname = `/time-tracker${url.pathname}`
      return NextResponse.rewrite(url)
    }
  }

  // Handle CORS
  const response = NextResponse.next()

  // Set CORS headers - allow all origins or specific domains
  const origin = request.headers.get('origin') || '*'
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}