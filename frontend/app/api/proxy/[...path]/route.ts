import { NextRequest } from 'next/server'
import { getAccessToken } from '@auth0/nextjs-auth0'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const target = `${BACKEND}/${path}`

  const accessToken = await getAccessToken()

  const init: RequestInit = {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('content-type') || 'application/json',
      'Authorization': accessToken ? `Bearer ${accessToken}` : '',
    },
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
  }

  const res = await fetch(target, init)
  const body = await res.text()
  return new Response(body, { status: res.status, headers: res.headers })
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE }


