import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const expectedPassword = process.env.CAREGIVER_PASSWORD || process.env.NEXT_PUBLIC_CAREGIVER_PASSWORD

  if (!expectedPassword) {
    return Response.json({ error: 'Caregiver password is not configured' }, { status: 500 })
  }

  let password = ''
  try {
    const body = await request.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (password !== expectedPassword) {
    return Response.json({ error: 'Incorrect password' }, { status: 401 })
  }

  return Response.json({ authorized: true })
}
