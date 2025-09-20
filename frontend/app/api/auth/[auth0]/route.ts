import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { pathname } = url

  if (pathname.endsWith('/login')) {
    const loginUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/authorize?response_type=code&client_id=${process.env.AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent((process.env.AUTH0_BASE_URL || '') + '/api/auth/callback')}&scope=openid profile email&audience=${process.env.AUTH0_AUDIENCE}`
    return Response.redirect(loginUrl)
  }

  if (pathname.endsWith('/logout')) {
    const logoutUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(process.env.AUTH0_BASE_URL || '')}`
    return Response.redirect(logoutUrl)
  }

  if (pathname.endsWith('/callback')) {
    // For hackathon speed, rely on the SDK session route if configured, or simply redirect home
    // In a full implementation, exchange the code for tokens here and set cookies.
    return Response.redirect(process.env.AUTH0_BASE_URL || '/')
  }

  return new Response('Auth endpoint', { status: 200 })
}


