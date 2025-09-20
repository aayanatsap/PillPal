"use client"

import { motion } from "framer-motion"
import { useMotion } from "@/components/motion-provider"

interface ChartDataPoint {
  date: string
  adherence: number
  patients: number
}

interface AnalyticsChartProps {
  data: ChartDataPoint[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const { prefersReducedMotion, durations } = useMotion()

  const maxAdherence = Math.max(...data.map((d) => d.adherence))
  const maxPatients = Math.max(...data.map((d) => d.patients))

  return (
    <div className="space-y-4">
      {/* Chart legend */}
      <div className="flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full" />
          <span className="text-neutral-500">Adherence Rate</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-teal-600 rounded-full" />
          <span className="text-neutral-500">Active Patients</span>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative h-64 bg-gray-50 rounded-lg p-4">
        <div className="flex items-end justify-between h-full space-x-2">
          {data.map((point, index) => {
            const adherenceHeight = (point.adherence / maxAdherence) * 100
            const patientsHeight = (point.patients / maxPatients) * 100

            return (
              <div key={point.date} className="flex-1 flex items-end justify-center space-x-1">
                {/* Adherence bar */}
                <motion.div
                  className="bg-blue-600 rounded-t-sm"
                  style={{ width: "40%" }}
                  initial={{ height: 0 }}
                  animate={{ height: `${adherenceHeight}%` }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.8,
                    delay: (index * 100) / 1000,
                    ease: "easeOut",
                  }}
                />
                {/* Patients bar */}
                <motion.div
                  className="bg-teal-600 rounded-t-sm"
                  style={{ width: "40%" }}
                  initial={{ height: 0 }}
                  animate={{ height: `${patientsHeight}%` }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.8,
                    delay: (index * 100 + 50) / 1000,
                    ease: "easeOut",
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-neutral-400">
          {data.map((point) => (
            <span key={point.date} className="flex-1 text-center">
              {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(data.reduce((sum, d) => sum + d.adherence, 0) / data.length)}%
          </p>
          <p className="text-sm text-neutral-500">Avg Adherence</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-teal-600">
            {Math.round(data.reduce((sum, d) => sum + d.patients, 0) / data.length)}
          </p>
          <p className="text-sm text-neutral-500">Avg Active Patients</p>
        </div>
      </div>
    </div>
  )
}
