"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Trash2 } from "lucide-react"
import { MotionButton } from "@/components/ui/motion-button"
import { PhotoUpload } from "@/components/photo-upload"
import { useMotion } from "@/components/motion-provider"
import type { Medication } from "@/lib/api"

interface AddMedicationModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (medication: Medication) => void
}

export function AddMedicationModal({ isOpen, onClose, onAdd }: AddMedicationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    times: [""],
    instructions: "",
    imageUrl: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { prefersReducedMotion, easing, durations } = useMotion()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const newMedication: Medication = {
      id: Date.now().toString(),
      ...formData,
      times: formData.times.filter((time) => time.trim() !== ""),
    }

    onAdd(newMedication)
    setFormData({
      name: "",
      dosage: "",
      frequency: "",
      times: [""],
      instructions: "",
      imageUrl: "",
    })
    setIsSubmitting(false)
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

  const handlePhotoUpload = (imageUrl: string, parsedData: any) => {
    setFormData((prev) => ({
      ...prev,
      imageUrl,
      name: parsedData.name || prev.name,
      dosage: parsedData.dosage || prev.dosage,
      frequency: parsedData.frequency || prev.frequency,
      times: parsedData.times || prev.times,
      instructions: parsedData.instructions || prev.instructions,
    }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : durations.sm / 1000 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
            transition={{
              duration: durations.sm / 1000,
              ease: easing.easeOutCalm,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-neutral-700">Add New Medication</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Photo upload */}
              <PhotoUpload onUpload={handlePhotoUpload} />

              {/* Basic info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Medication Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Dosage</label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g., 10mg"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData((prev) => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
                  <label className="block text-sm font-medium text-neutral-700">Times</label>
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
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
                <label className="block text-sm font-medium text-neutral-700 mb-2">Instructions (optional)</label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="e.g., Take with food"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <MotionButton type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </MotionButton>
                <MotionButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Medication"}
                </MotionButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
