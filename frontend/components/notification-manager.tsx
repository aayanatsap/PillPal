"use client"

import { useEffect, useRef, useState } from "react"
import { getDosesToday, getUserMe, type ApiDose } from "@/lib/api"
import { ensureNotificationPermission, playGentleChime, scheduleAt, parseIsoToLocalDate, showLocalNotification } from "@/lib/notifications"

// Minimal manager: schedules notifications for today's pending doses on mount and when tab regains focus.
export default function NotificationManager(): null {
  const cancelersRef = useRef<Array<() => void>>([])
  const hasInitRef = useRef(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    getUserMe()
      .then(() => setIsAuthenticated(true))
      .catch((error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          setIsAuthenticated(false)
        }
      })
  }, [])

  useEffect(() => {
    if (isAuthenticated !== true) return
    if (hasInitRef.current) return
    hasInitRef.current = true

    const init = async () => {
      const perm = await ensureNotificationPermission()
      if (perm !== "granted") return
      await scheduleForToday()
    }

    const scheduleForToday = async () => {
      try {
        cancelersRef.current.forEach((c) => c())
        cancelersRef.current = []

        const doses = await getDosesToday()
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23, 59, 59, 999)

        const pending = (doses || []).filter((d: ApiDose) => d.status === "pending")
        for (const d of pending) {
          const at = parseIsoToLocalDate(d.scheduled_at)
          if (at >= startOfDay && at <= endOfDay && at.getTime() >= Date.now()) {
            const cancel = scheduleAt(at, async () => {
              await playGentleChime(0.3)
              await showLocalNotification("PillPal Reminder", {
                body: `${d.medication_name || "Medication"} — it's time to take your dose`,
                tag: `dose-${d.id}`,
                url: "/meds",
                requireInteraction: false,
              })
            })
            cancelersRef.current.push(cancel)
          }
        }
      } catch {}
    }

    init()

    const onFocus = async () => {
      const perm = await ensureNotificationPermission()
      if (perm !== "granted") return
      await scheduleForToday()
    }
    const onVisibility = () => { if (!document.hidden) onFocus() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      cancelersRef.current.forEach((c) => c())
      cancelersRef.current = []
    }
  }, [isAuthenticated])

  return null
}
