"use client"

import dynamic from "next/dynamic"

const ToasterNoSSR = dynamic(() => import("@/components/ui/toaster").then((m) => m.Toaster), {
  ssr: false,
})

export default function ClientToaster() {
  return <ToasterNoSSR />
}


