export const runtime = 'edge'
import { NextRequest, NextResponse } from 'next/server'

function setCookie(name: string, value: string, maxAgeSec: number): string {
  const attrs = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    // do not set Secure for http localhost; Auth0 requires https in prod
    `Max-Age=${maxAgeSec}`,
  ]
  return attrs.join('; ')
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const { pathname, searchParams } = url

  if (pathname.endsWith('/login')) {
    const base = `${process.env.AUTH0_ISSUER_BASE_URL}/authorize`
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.AUTH0_CLIENT_ID || '',
      redirect_uri: `${process.env.AUTH0_BASE_URL || ''}/api/auth/callback`,
      scope: 'openid profile email',
      audience: process.env.AUTH0_AUDIENCE || '',
    })
    searchParams.forEach((v, k) => params.set(k, v))
    return NextResponse.redirect(`${base}?${params.toString()}`)
  }

  if (pathname.endsWith('/logout')) {
    const base = `${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout`
    const params = new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID || '',
      returnTo: process.env.AUTH0_BASE_URL || '',
    })
    const res = NextResponse.redirect(`${base}?${params.toString()}`)
    res.cookies.set('pp_access_token', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 })
    res.cookies.set('pp_id_token', '', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 0 })
    return res
  }

  if (pathname.endsWith('/callback')) {
    const code = searchParams.get('code')
    if (!code) {
      return Response.redirect(process.env.AUTH0_BASE_URL || '/')
    }
    // Exchange code for tokens
    const tokenRes = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.AUTH0_CLIENT_ID || '',
        client_secret: process.env.AUTH0_CLIENT_SECRET || '',
        code,
        redirect_uri: `${process.env.AUTH0_BASE_URL || ''}/api/auth/callback`,
      }),
    })
    if (!tokenRes.ok) {
      return NextResponse.redirect(process.env.AUTH0_BASE_URL || '/')
    }
    const tokens = await tokenRes.json()
    // After first login send to onboarding; dashboard will redirect if profile already complete
    const res = NextResponse.redirect(`${process.env.AUTH0_BASE_URL || ''}/onboarding`)
    if (tokens.access_token) res.cookies.set('pp_access_token', tokens.access_token as string, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 })
    if (tokens.id_token) res.cookies.set('pp_id_token', tokens.id_token as string, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 })
    return res
  }

  return new Response('Auth endpoint', { status: 200 })
}


