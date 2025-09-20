"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Clock, Edit, Trash2, Camera } from "lucide-react"
import { MotionCard } from "@/components/ui/motion-card"
import { MotionButton } from "@/components/ui/motion-button"
import { useMotion } from "@/components/motion-provider"
import type { Medication } from "@/lib/api"

interface MedicationCardProps {
  medication: Medication
  delay?: number
}

export function MedicationCard({ medication, delay = 0 }: MedicationCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { prefersReducedMotion, easing, durations } = useMotion()

  return (
    <MotionCard
      delay={delay}
      className="p-4 bg-white hover:shadow-md transition-shadow duration-240 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="space-y-4">
        {/* Medication image placeholder */}
        <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg flex items-center justify-center">
          {medication.imageUrl ? (
            <img
              src={medication.imageUrl || "/placeholder.svg"}
              alt={medication.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Camera className="w-8 h-8 text-neutral-300" />
          )}
        </div>

        {/* Medication info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-neutral-700 text-lg">{medication.name}</h3>
          <p className="text-neutral-500">{medication.dosage}</p>
          <div className="flex items-center space-x-2 text-sm text-neutral-400">
            <Clock className="w-4 h-4" />
            <span>{medication.frequency}</span>
          </div>
        </div>

        {/* Times */}
        <div className="flex flex-wrap gap-2">
          {medication.times.map((time, index) => (
            <motion.span
              key={time}
              className="chip bg-blue-50 text-blue-600"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : durations.xs / 1000,
                delay: prefersReducedMotion ? 0 : (delay + index * 30) / 1000,
              }}
            >
              {time}
            </motion.span>
          ))}
        </div>

        {/* Instructions */}
        {medication.instructions && <p className="text-sm text-neutral-400 italic">{medication.instructions}</p>}

        {/* Action buttons */}
        <motion.div
          className="flex items-center justify-end space-x-2 pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
        >
          <MotionButton variant="ghost" size="sm">
            <Edit className="w-4 h-4" />
          </MotionButton>
          <MotionButton variant="ghost" size="sm">
            <Trash2 className="w-4 h-4" />
          </MotionButton>
        </motion.div>
      </div>
    </MotionCard>
  )
}
