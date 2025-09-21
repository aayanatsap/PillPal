"use client"

import type React from "react"
import { Auth0Provider } from "@auth0/nextjs-auth0"
import dynamic from "next/dynamic"

const NotificationManager = dynamic(() => import("@/components/notification-manager"), { ssr: false })

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      {children}
      <NotificationManager />
    </Auth0Provider>
  )
}
