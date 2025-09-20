"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Camera, Loader2, Check, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useMotion } from "@/components/motion-provider"
import { cn } from "@/lib/utils"
import { extractLabel } from "@/lib/api"

interface ParsedMedicationData {
  name?: string
  strength_text?: string
  instructions?: string
  times?: string[]
  frequency_text?: string
}

interface PhotoUploadProps {
  onUpload: (imageUrl: string, parsedData: any) => void
  className?: string
}

export function PhotoUpload({ onUpload, className }: PhotoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedMedicationData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { prefersReducedMotion, easing, durations } = useMotion()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return
    }

    setIsUploading(true)

    // Create image URL
    const imageUrl = URL.createObjectURL(file)
    setUploadedImage(imageUrl)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await extractLabel(fd)
      // For preview card, show the first med's fields
      const meds = Array.isArray(result?.medications) ? result.medications : []
      const first = meds[0] || {}
      setParsedData({
        name: first.name,
        strength_text: first.strength_text,
        instructions: first.instructions,
        times: first.times,
        frequency_text: first.frequency_text,
      })
      onUpload(imageUrl, result)
    } catch (e) {
      // Fallback: let user fill manually
      setParsedData(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Medication Photo</label>
        <p className="text-xs text-muted-foreground">
          Upload a photo of your medication bottle or package for AI analysis
        </p>
      </div>

      <Card
        className={cn(
          "relative border-2 border-dashed p-8 text-center cursor-pointer",
          "motion-safe:transition-all motion-safe:duration-200",
          isDragOver
            ? "border-yellow-400 bg-yellow-400/5 shadow-lg"
            : "border-border hover:border-yellow-400/50 hover:bg-yellow-400/5",
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              className="space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: durations.sm / 1000, ease: easing.enter }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              >
                <Loader2 className="w-8 h-8 text-yellow-400 mx-auto" />
              </motion.div>
              <div>
                <p className="text-foreground font-medium">Processing image...</p>
                <p className="text-muted-foreground text-sm">AI is analyzing medication details</p>
              </div>
            </motion.div>
          ) : uploadedImage ? (
            <motion.div
              key="uploaded"
              className="space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: durations.sm / 1000, ease: easing.enter }}
            >
              <div className="relative w-32 h-32 mx-auto">
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Uploaded medication"
                  className="w-full h-full object-cover rounded-xl shadow-md"
                />
                <motion.div
                  className="absolute -top-2 -right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              </div>
              <div>
                <p className="text-foreground font-medium">Analysis complete!</p>
                <p className="text-muted-foreground text-sm">Medication information extracted successfully</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              className="space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: durations.sm / 1000, ease: easing.enter }}
            >
              <motion.div
                animate={
                  isDragOver && !prefersReducedMotion
                    ? {
                        rotate: [-2, 0, 2, 0],
                        scale: [1, 1.05, 1],
                        transition: { duration: 0.3 },
                      }
                    : {}
                }
              >
                <Camera className="w-12 h-12 text-muted-foreground mx-auto" />
              </motion.div>
              <div>
                <p className="text-foreground font-medium">Upload medication photo</p>
                <p className="text-muted-foreground text-sm">
                  Drag and drop or click to select. AI will extract details automatically.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Parsed data preview with premium styling */}
      <AnimatePresence>
        {parsedData && (
          <motion.div
            className="glass-card p-4 border border-teal-500/20 bg-teal-500/5"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: durations.md / 1000, ease: easing.enter }}
          >
            <div className="flex items-center space-x-2 mb-3">
              <Check className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-medium text-teal-400">Extracted Information</span>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground font-medium">{parsedData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dosage:</span>
                <span className="text-foreground font-medium">{parsedData.strength_text}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency:</span>
                <span className="text-foreground font-medium">{parsedData.frequency_text}</span>
              </div>
              {parsedData.times && parsedData.times.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Times:</span>
                  <span className="text-foreground font-medium">{parsedData.times.join(", ")}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instructions:</span>
                <span className="text-foreground font-medium text-right max-w-48">{parsedData.instructions}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
