"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MotionCard } from "@/components/ui/motion-card"
import { MotionButton } from "@/components/ui/motion-button"
import { Navigation } from "@/components/navigation"
import { PhotoUpload } from "@/components/photo-upload"
import { createMedication, extractLabel } from "@/lib/api"
import { useMotion } from "@/components/motion-provider"
import { useToast } from "@/hooks/use-toast"

export default function NewMedicationPage() {
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    times: [""],
    instructions: "",
    imageUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { prefersReducedMotion, easing, durations, stagger } = useMotion()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const times = formData.times.filter(Boolean)
      await createMedication({
        name: formData.name,
        strength_text: formData.dosage,
        dose_text: '',
        instructions: formData.instructions || undefined,
        frequency_text: formData.frequency || undefined,
        times,
      })

      toast({
        title: "Medication added",
        description: "Your medication has been added successfully",
      })

      router.push("/meds")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add medication. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTimeSlot = () => {
    setFormData((prev) => ({
      ...prev,
      times: [...prev.times, ""],
    }))
  }

  const removeTimeSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index),
    }))
  }

  const updateTimeSlot = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      times: prev.times.map((time, i) => (i === index ? value : time)),
    }))
  }

  const handlePhotoUpload = async (imageUrl: string, _parsedData: any) => {
    setFormData((prev) => ({ ...prev, imageUrl }))
    try {
      // The PhotoUpload component already sends the file through extractLabel(fd) internally.
      // Here we only consume the returned structure if provided via _parsedData.
      const parsedList = Array.isArray(_parsedData?.medications) ? _parsedData.medications : [_parsedData]
      const first = parsedList && parsedList[0] ? parsedList[0] : {}
      // Normalize frequency label for the select
      const inferFrequency = (times: string[] | undefined, freqText: string | undefined): string => {
        if (Array.isArray(times) && times.length) {
          if (times.length === 1) return "Once daily"
          if (times.length === 2) return "Twice daily"
          if (times.length === 3) return "Three times daily"
          if (times.length >= 4) return "Four times daily"
        }
        const t = (freqText || "").toLowerCase()
        if (/once|od|q\.?d\.?|qd|daily|every\s*day|everyday|per\s*day|once\s*a\s*day/.test(t)) return "Once daily"
        if (/twice|bid|2x|2\s*times|two\s*times|morning.*evening|evening.*morning/.test(t)) return "Twice daily"
        if (/three|tid|tds|3x|3\s*times/.test(t)) return "Three times daily"
        if (/four|qid|qds|4x|4\s*times/.test(t)) return "Four times daily"
        return ""
      }
      const timesFromFrequency = (freq: string): string[] => {
        const f = (freq || '').toLowerCase()
        if (/once|od|q\.?d\.?|qd|daily|every\s*day|everyday|per\s*day|once\s*a\s*day/.test(f)) return ["09:00"]
        if (/twice|bid|2x|2\s*times|two\s*times/.test(f)) return ["09:00", "21:00"]
        if (/three|tid|tds|3x|3\s*times/.test(f)) return ["08:00", "14:00", "20:00"]
        if (/four|qid|qds|4x|4\s*times/.test(f)) return ["06:00", "12:00", "18:00", "22:00"]
        return []
      }
      const times: string[] = Array.isArray(first.times) && first.times.length ? first.times : timesFromFrequency(first.frequency_text || "")
      const frequency = inferFrequency(times, first.frequency_text)
      setFormData((prev) => ({
        ...prev,
        name: first.name || prev.name,
        dosage: first.strength_text || prev.dosage,
        frequency: frequency || prev.frequency,
        times: times.length ? times : prev.times,
        instructions: first.instructions || prev.instructions,
      }))
    } catch {}
  }

  const containerVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: stagger / 1000,
            delayChildren: 0.1,
          },
        },
      }

  const itemVariants = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: durations.sm / 1000,
            ease: easing.easeOutCalm,
          },
        },
      }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <motion.div
          className="max-w-2xl mx-auto space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div className="flex items-center space-x-4" variants={itemVariants}>
            <Link href="/meds">
              <MotionButton variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </MotionButton>
            </Link>
            <div>
              <h1 className="text-3xl font-semibold text-[var(--color-text)] text-balance">Add New Medication</h1>
              <p className="text-[var(--color-text)]/70 text-pretty">Enter your medication details or upload a photo</p>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Photo upload */}
                <PhotoUpload onUpload={handlePhotoUpload} />
                <p className="text-xs text-muted-foreground mt-2">If extraction fails, fill the form manually below.</p>

                {/* Basic info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Medication Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Dosage *</label>
                    <input
                      type="text"
                      value={formData.dosage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dosage: e.target.value }))}
                      placeholder="e.g., 10mg"
                      className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Frequency *</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    required
                  >
                    <option value="">Select frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Four times daily">Four times daily</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>

                {/* Times */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[var(--color-text)]">Times *</label>
                    <MotionButton type="button" variant="ghost" size="sm" onClick={addTimeSlot}>
                      <Plus className="w-4 h-4" />
                    </MotionButton>
                  </div>
                  <div className="space-y-2">
                    {formData.times.map((time, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center space-x-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
                      >
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => updateTimeSlot(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                          required
                        />
                        {formData.times.length > 1 && (
                          <MotionButton type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(index)}>
                            <Trash2 className="w-4 h-4" />
                          </MotionButton>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Instructions (optional)
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                    placeholder="e.g., Take with food"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <Link href="/meds">
                    <MotionButton type="button" variant="ghost" disabled={isSubmitting}>
                      Cancel
                    </MotionButton>
                  </Link>
                  <MotionButton type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Medication"}
                  </MotionButton>
                </div>
              </form>
            </MotionCard>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
