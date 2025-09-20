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
import { cn } from "@/lib/utils"

interface Medication {
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
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterBy, setFilterBy] = useState<"all" | "due" | "taken">("all")
  const { prefersReducedMotion, easing, durations } = useMotion()
  const { isDark } = useTheme()

  useEffect(() => {
    // Mock data loading
    setTimeout(() => {
      setMedications([
        {
          id: "1",
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          times: ["08:00"],
          instructions: "Take with food",
          color: "bg-blue-500",
          nextDose: "08:00",
          adherenceRate: 95,
        },
        {
          id: "2",
          name: "Metformin",
          dosage: "500mg",
          frequency: "Twice daily",
          times: ["08:00", "20:00"],
          instructions: "Take with meals",
          color: "bg-green-500",
          nextDose: "12:00",
          adherenceRate: 88,
        },
        {
          id: "3",
          name: "Atorvastatin",
          dosage: "20mg",
          frequency: "Once daily",
          times: ["20:00"],
          instructions: "Take at bedtime",
          color: "bg-purple-500",
          nextDose: "20:00",
          adherenceRate: 92,
        },
      ])
      setLoading(false)
    }, 800)
  }, [])

  const filteredMedications = medications.filter((med) => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (filterBy === "all") return matchesSearch
    // Add filter logic here based on due/taken status
    return matchesSearch
  })

  const handleAddMedication = (imageUrl: string, parsedData: any) => {
    const newMedication: Medication = {
      id: Date.now().toString(),
      name: parsedData.name,
      dosage: parsedData.dosage,
      frequency: parsedData.frequency,
      times: parsedData.times,
      instructions: parsedData.instructions,
      color: "bg-teal-500",
      adherenceRate: 100,
    }
    setMedications((prev) => [...prev, newMedication])
    setShowAddModal(false)
  }

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
        <NavBar title="Medications" showThemeToggle />
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
      <NavBar title="Medications" showThemeToggle>
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
                          {medication.adherenceRate && (
                            <Badge variant={getAdherenceBadge(medication.adherenceRate)} className="text-xs">
                              {medication.adherenceRate}%
                            </Badge>
                          )}
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
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
                onClick={() => setShowAddModal(false)}
              />
              <motion.div
                className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: durations.md / 1000, ease: easing.enter }}
              >
                <div className="p-6">
                  <div className="mb-4">
                    <h2 className="font-heading text-lg font-semibold text-foreground">Add New Medication</h2>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Upload a photo of your medication for automatic information extraction
                    </p>
                  </div>
                  <PhotoUpload onUpload={handleAddMedication} />
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" onClick={() => setShowAddModal(false)} className="btn-premium">
                      Cancel
                    </Button>
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
