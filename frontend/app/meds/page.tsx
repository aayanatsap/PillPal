"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Search, Pill, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/nav-bar"
import { TabBar } from "@/components/tab-bar"
import { VoiceMic } from "@/components/voice-mic"
import { PhotoUpload } from "@/components/photo-upload"
import { useMotion } from "@/components/motion-provider"
import { useTheme } from "@/hooks/use-theme"
import { listMedications, createMedication, deleteMedication, type ApiMedication } from "@/lib/api"
import { cn } from "@/lib/utils"

interface MedicationUI {
  id: string
  name: string
  dosage: string
  frequency: string
  times: string[]
  instructions?: string
  color: string
  nextDose?: string
  adherenceRate?: number
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<MedicationUI[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState<{
    name: string
    strength_text: string
    frequency_text: string
    times: string[]
    instructions: string
  }>({ name: '', strength_text: '', frequency_text: '', times: [], instructions: '' })
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState<"all" | "due" | "taken">("all")
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listMedications()
        const ui: MedicationUI[] = data.map((m) => ({
          id: m.id,
          name: m.name,
          dosage: m.strength_text || "",
          frequency: m.frequency_text || (m.times.length === 1 ? "Once daily" : `${m.times.length}x daily`),
          times: m.times || [],
          instructions: m.instructions || undefined,
          color: "bg-teal-500",
        }))
        setMedications(ui)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredMedications = medications.filter((med) => {
    const matchesSearch = (med.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
    if (filterBy === "all") return matchesSearch
    // Add filter logic here based on due/taken status
    return matchesSearch
  })

  const handleExtracted = (_imageUrl: string, parsedData: any) => {
    // Mirror /meds/new behavior: take first medication and prefill, with simple fallbacks
    const first = Array.isArray(parsedData?.medications) ? parsedData.medications[0] : parsedData?.medications?.[0]
    if (!first) return
    const times: string[] = Array.isArray(first.times) && first.times.length ? first.times : ["", ""]
    setDraft((d) => ({
      ...d,
      name: first.name || d.name,
      strength_text: first.strength_text || d.strength_text,
      frequency_text: first.frequency_text || d.frequency_text,
      times,
      instructions: first.instructions || d.instructions,
    }))
  }

  const saveMedication = async () => {
    try {
      setIsSaving(true)
      const created = await createMedication({
        name: draft.name,
        strength_text: draft.strength_text || undefined,
        frequency_text: draft.frequency_text || undefined,
        times: draft.times.filter(Boolean),
        instructions: draft.instructions || undefined,
      })
      const newMedication: MedicationUI = {
        id: created.id,
        name: created.name,
        dosage: created.strength_text || '',
        frequency: created.frequency_text || (created.times.length === 1 ? 'Once daily' : (created.times.length ? `${created.times.length}x daily` : '')),
        times: created.times || [],
        instructions: created.instructions || undefined,
        color: 'bg-teal-500',
        adherenceRate: 100,
      }
      setMedications((prev) => [...prev, newMedication])
      setShowAddModal(false)
      setDraft({ name: '', strength_text: '', frequency_text: '', times: [], instructions: '' })
    } finally {
      setIsSaving(false)
    }
  }

  const addDraftTime = () => setDraft((d) => ({ ...d, times: [...d.times, ''] }))
  const removeDraftTime = (i: number) => setDraft((d) => ({ ...d, times: d.times.filter((_, idx) => idx !== i) }))
  const updateDraftTime = (i: number, value: string) => setDraft((d) => ({ ...d, times: d.times.map((t, idx) => (idx === i ? value : t)) }))

  const getAdherenceColor = (rate: number) => {
    if (rate >= 90) return isDark ? "text-teal-400" : "text-teal-600"
    if (rate >= 70) return isDark ? "text-yellow-400" : "text-yellow-600"
    return isDark ? "text-red-400" : "text-red-600"
  }

  const getAdherenceBadge = (rate: number) => {
    if (rate >= 90) return "success"
    if (rate >= 70) return "default"
    return "destructive"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar title="" showThemeToggle />
        <main className="px-4 py-6 pb-20 space-y-6">
          {/* Loading skeletons */}
          <div className="space-y-4">
            <div className="h-8 bg-muted/20 rounded-lg animate-pulse" />
            <div className="h-4 bg-muted/20 rounded-lg animate-pulse w-2/3" />
          </div>
          <div className="h-16 bg-muted/20 rounded-2xl animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted/20 rounded-2xl animate-pulse" />
          </div>
        </main>
        <TabBar />
        <VoiceMic />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar title="" showThemeToggle>
        <Button variant="default" size="sm" onClick={() => setShowAddModal(true)} className="btn-premium">
          <Plus className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Add</span>
        </Button>
      </NavBar>

      <main className="px-4 py-6 pb-20">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: durations.md / 1000, ease: easing.enter }}
        >
          {/* Header with stats */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter }}
          >
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-bold text-foreground text-balance">My Medications</h1>
              <p className="text-muted-foreground text-pretty">
                {medications.length} medication{medications.length !== 1 ? "s" : ""} in your schedule
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 transition-all duration-300 ease-out">
                <div className="text-center">
                  <p className="text-lg font-bold font-heading text-foreground">{medications.length}</p>
                  <p className="text-xs text-muted-foreground">Total Meds</p>
                </div>
              </Card>
              <Card className="p-3 transition-all duration-300 ease-out">
                <div className="text-center">
                  <p className="text-lg font-bold font-heading text-teal-400">
                    {Math.round(
                      medications.reduce((acc, med) => acc + (med.adherenceRate || 0), 0) / medications.length,
                    )}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">Adherence</p>
                </div>
              </Card>
              <Card className="p-3 transition-all duration-300 ease-out">
                <div className="text-center">
                  <p className="text-lg font-bold font-heading text-foreground">
                    {medications.reduce((acc, med) => acc + med.times.length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Daily Doses</p>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Search and filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.sm / 1000, ease: easing.enter, delay: 0.1 }}
          >
            <Card className="p-4 transition-all duration-300 ease-out">
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search medications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-transparent border-0 focus:outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={filterBy === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterBy("all")}
                    className="text-xs"
                  >
                    All
                  </Button>
                  <Button
                    variant={filterBy === "due" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterBy("due")}
                    className="text-xs"
                  >
                    Due
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Medications grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: durations.md / 1000, ease: easing.enter, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {filteredMedications.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: durations.sm / 1000, ease: easing.enter }}
                >
                  <Card className="p-8 text-center transition-all duration-300 ease-out">
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center mx-auto">
                        <Pill className="w-8 h-8 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                          {searchQuery ? "No medications found" : "No medications yet"}
                        </h3>
                        <p className="text-muted-foreground mb-4 text-pretty">
                          {searchQuery
                            ? "Try adjusting your search terms"
                            : "Add your first medication to start tracking doses"}
                        </p>
                        {!searchQuery && (
                          <Button onClick={() => setShowAddModal(true)} className="btn-premium">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Medication
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  className="grid gap-4 md:grid-cols-2"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: prefersReducedMotion ? 0 : 0.1,
                      },
                    },
                  }}
                >
                  {filteredMedications.map((medication, index) => (
                    <motion.div
                      key={medication.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: {
                            duration: durations.sm / 1000,
                            ease: easing.enter,
                          },
                        },
                      }}
                    >
                      <Card className="p-4 glass-card transition-all duration-300 ease-out">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <div
                              className={cn("w-12 h-12 rounded-xl flex items-center justify-center", medication.color)}
                            >
                              <Pill className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-heading font-semibold text-foreground truncate">{medication.name}</h3>
                              <p className="text-sm text-muted-foreground">{medication.dosage}</p>
                              <p className="text-sm text-muted-foreground">{medication.frequency}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {medication.adherenceRate && (
                              <Badge variant={getAdherenceBadge(medication.adherenceRate)} className="text-xs">
                                {medication.adherenceRate}%
                              </Badge>
                            )}
                            <button
                              className="text-xs text-destructive underline"
                              onClick={async () => {
                                try {
                                  await deleteMedication(medication.id)
                                  setMedications((prev) => prev.filter((m) => m.id !== medication.id))
                                } catch {}
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {medication.instructions && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{medication.instructions}</p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Schedule:</span>
                            <div className="flex flex-wrap gap-1">
                              {medication.times.map((time) => (
                                <span
                                  key={time}
                                  className="px-2 py-1 bg-muted/50 text-xs rounded-md text-muted-foreground chip-premium"
                                >
                                  {time}
                                </span>
                              ))}
                            </div>
                          </div>
                          {medication.nextDose && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Next dose:</span>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs font-medium text-yellow-400">{medication.nextDose}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Add medication modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-start justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: durations.sm / 1000 }}
            >
              <motion.div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: durations.md / 1000, ease: easing.enter }}
              >
                <div className="p-6 pb-24">
                  <div className="mb-4">
                    <h2 className="font-heading text-lg font-semibold text-foreground">Add New Medication</h2>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Upload a photo of your medication for automatic information extraction
                    </p>
                  </div>
                  <PhotoUpload onUpload={handleExtracted} />

                  {/* Draft editor – always visible like /meds/new */}
                  <div className="mt-6 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Medication Name</label>
                        <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="w-full px-3 py-2 rounded-md bg-background border" placeholder="e.g., Lipitor" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Dosage</label>
                        <input value={draft.strength_text} onChange={(e) => setDraft((d) => ({ ...d, strength_text: e.target.value }))} className="w-full px-3 py-2 rounded-md bg-background border" placeholder="e.g., 10 mg" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Frequency</label>
                      <select value={draft.frequency_text} onChange={(e) => setDraft((d) => ({ ...d, frequency_text: e.target.value }))} className="w-full px-3 py-2 rounded-md bg-background border">
                        <option value="">Select frequency</option>
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs text-muted-foreground">Times</label>
                        <Button variant="ghost" size="sm" onClick={addDraftTime}>Add time</Button>
                      </div>
                      <div className="space-y-2">
                        {draft.times.map((t, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="time" value={t} onChange={(e) => updateDraftTime(i, e.target.value)} className="flex-1 px-3 py-2 rounded-md bg-background border" />
                            <Button variant="ghost" size="sm" onClick={() => removeDraftTime(i)}>Remove</Button>
                          </div>
                        ))}
                        {draft.times.length === 0 && <div className="text-xs text-muted-foreground">No times detected. Add at least one.</div>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Instructions (optional)</label>
                      <textarea value={draft.instructions} onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-md bg-background border" placeholder="e.g., Take with food" />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 sticky bottom-0 bg-card py-3">
                      <Button variant="ghost" onClick={() => setShowAddModal(false)} className="btn-premium">Cancel</Button>
                      <Button onClick={saveMedication} disabled={isSaving || !draft.name || draft.times.filter(Boolean).length === 0} className="btn-premium">{isSaving ? 'Adding...' : 'Add Medication'}</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <TabBar />
      <VoiceMic />
    </div>
  )
}
