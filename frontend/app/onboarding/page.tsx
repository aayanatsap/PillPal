"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { useToast } from "@/hooks/use-toast"
import { getUserMe, updateUserMe, type ApiUser } from "@/lib/api"

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [name, setName] = useState("")
  const [role, setRole] = useState<'patient' | 'caregiver' | 'clinician'>('patient')
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getUserMe()
      .then((u) => {
        setUser(u)
        setName(u.name && u.name !== 'Unknown User' ? u.name : "")
      })
      .catch(() => {
        router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required" })
      return
    }
    setSaving(true)
    try {
      await updateUserMe({ name: name.trim(), role, phone_enc: phone.trim() || undefined })
      router.replace('/')
    } catch (e: any) {
      toast({ title: "Failed to save", description: e?.message || 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="" />
      <main className="px-4 py-6 pb-20 max-w-xl mx-auto">
        <Card className="p-6 space-y-4">
          <h1 className="font-heading text-2xl font-bold">Create your profile</h1>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={user?.name && user.name !== 'Unknown User' ? user.name : 'Your name'}
              className="w-full border rounded-md px-3 py-2 bg-background"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full border rounded-md px-3 py-2 bg-background"
            >
              <option value="patient">Patient</option>
              <option value="caregiver">Caregiver</option>
              <option value="clinician">Clinician</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Phone (for SMS reminders)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full border rounded-md px-3 py-2 bg-background"
              inputMode="tel"
            />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? 'Saving…' : 'Continue'}
          </Button>
        </Card>
      </main>
      <TabBar />
    </div>
  )
}


