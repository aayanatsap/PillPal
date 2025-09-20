import { NextRequest } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

function readCookie(req: NextRequest, name: string): string | undefined {
  const raw = req.headers.get('cookie') || ''
  const match = raw.match(new RegExp(`${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : undefined
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const joinedPath = Array.isArray(path) ? path.join('/') : String(path)
  const target = `${BACKEND}/${joinedPath}`
  const accessToken = readCookie(request, 'pp_access_token')
  const idToken = readCookie(request, 'pp_id_token')

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: new Headers(request.headers),
    body: undefined,
  }
  const contentType = request.headers.get('content-type') || ''
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (contentType.includes('multipart/form-data')) {
      ;(init as any).duplex = 'half'
      init.body = request.body as any
    } else {
      init.body = await request.text()
      if (init.body && !(init.headers as Headers).has('content-type')) {
        ;(init.headers as Headers).set('content-type', 'application/json')
      }
    }
  }
  if (accessToken) (init.headers as Headers).set('Authorization', `Bearer ${accessToken}`)
  if (idToken) (init.headers as Headers).set('x-id-token', idToken)

  const res = await fetch(target, init)
  const body = await res.text()
  const headers = new Headers(res.headers)
  return new Response(body, { status: res.status, headers })
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE }


