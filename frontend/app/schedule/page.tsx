"use client"

import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { VoiceMic } from "@/components/voice-mic"
import { ScheduleView } from "@/components/schedule-view"

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar title="Schedule" showThemeToggle />

      <main className="px-4 py-6 pb-20">
        <ScheduleView />
      </main>

      <TabBar />
      <VoiceMic />
    </div>
  )
}
