import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  if (pathname.endsWith('/login')) {
    const loginUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/authorize?response_type=code&client_id=${process.env.AUTH0_CLIENT_ID}&redirect_uri=${encodeURIComponent((process.env.AUTH0_BASE_URL || '') + '/api/auth/callback')}&scope=openid profile email&audience=${process.env.AUTH0_AUDIENCE}`;
    return Response.redirect(loginUrl);
  }
  
  if (pathname.endsWith('/logout')) {
    const logoutUrl = `${process.env.AUTH0_ISSUER_BASE_URL}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(process.env.AUTH0_BASE_URL || '')}`;
    return Response.redirect(logoutUrl);
  }
  
  return new Response('Auth endpoint', { status: 200 });
}


