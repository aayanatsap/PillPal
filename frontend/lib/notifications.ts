"use client"

// Minimal client-side notifications helper. No external deps.

export type NotificationPermissionState = "default" | "denied" | "granted"

export async function ensureNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied"
  if (Notification.permission === "granted") return "granted"
  try {
    const perm = await Notification.requestPermission()
    return perm
  } catch {
    return Notification.permission
  }
}

// Gentle brand-aligned chime via WebAudio; fallback to short beep if unavailable
export async function playGentleChime(volume: number = 0.25): Promise<void> {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.value = volume
    gain.connect(ctx.destination)

    const makeTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.value = freq
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, now + start)
      env.gain.linearRampToValueAtTime(1, now + start + 0.02)
      env.gain.exponentialRampToValueAtTime(0.001, now + start + dur)
      osc.connect(env)
      env.connect(gain)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.05)
    }

    // Soft rising triad: A4 -> C#5 -> E5
    makeTone(440, 0.0, 0.28)
    makeTone(554.37, 0.12, 0.28)
    makeTone(659.25, 0.24, 0.36)

    // Gentle shimmer
    const noise = ctx.createBufferSource()
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.05
    noise.buffer = buffer
    const ng = ctx.createGain()
    ng.gain.value = 0.15
    noise.connect(ng)
    ng.connect(gain)
    noise.start(now + 0.1)
    noise.stop(now + 0.35)

    // Auto close after short tail
    setTimeout(() => ctx.close().catch(() => {}), 600)
  } catch {}
}

export interface ShowNotificationOptions {
  body?: string
  tag?: string
  url?: string
  requireInteraction?: boolean
}

export async function showLocalNotification(title: string, opts: ShowNotificationOptions = {}): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    const options: NotificationOptions = {
      body: opts.body,
      icon: "/icon-192.jpg",
      badge: "/icon-192.jpg",
      tag: opts.tag,
      data: { url: opts.url || "/" },
      requireInteraction: opts.requireInteraction ?? false,
      vibrate: [120, 60, 120],
    }
    if (reg) await reg.showNotification(title, options)
    else new Notification(title, options)
  } catch {}
}

export function scheduleAt(date: Date, cb: () => void): () => void {
  const now = Date.now()
  const delay = Math.max(0, date.getTime() - now)
  const id = window.setTimeout(cb, delay)
  return () => window.clearTimeout(id)
}

export function parseIsoToLocalDate(iso: string): Date {
  // FastAPI returns ISO in UTC; display/compute in local time; Date parses to local clock time
  return new Date(iso)
}

