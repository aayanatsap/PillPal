"use client"

import type React from "react"
import { Auth0Provider } from "@auth0/nextjs-auth0"

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider>
      {children}
    </Auth0Provider>
  )
}
