"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronUp, ChevronDown, Eye, MessageCircle, Calendar } from "lucide-react"
import { MotionButton } from "@/components/ui/motion-button"
import { useMotion } from "@/components/motion-provider"
import type { PatientRecord } from "@/lib/clinician-api"

interface PatientTableProps {
  patients: PatientRecord[]
  searchQuery: string
}

type SortField = "name" | "adherence" | "riskScore" | "lastActivity"
type SortDirection = "asc" | "desc"

export function PatientTable({ patients, searchQuery }: PatientTableProps) {
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const { prefersReducedMotion, durations } = useMotion()

  const filteredPatients = patients.filter((patient) => patient.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === "lastActivity") {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "Low":
        return "rgb(34 197 94)" // green-500
      case "Medium":
        return "rgb(20 184 166)" // teal-500
      case "High":
        return "rgb(239 68 68)" // red-500
      default:
        return "rgb(115 115 115)" // neutral-500
    }
  }

  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 90) return "rgb(34 197 94)" // green-500
    if (adherence >= 70) return "rgb(20 184 166)" // teal-500
    return "rgb(239 68 68)" // red-500
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <button
                onClick={() => handleSort("name")}
                className="flex items-center space-x-1 text-xs font-medium text-neutral-700 uppercase tracking-wider hover:text-blue-600 transition-colors"
              >
                <span>Patient</span>
                <motion.div
                  animate={{ rotate: sortField === "name" && sortDirection === "desc" ? 180 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
                >
                  {getSortIcon("name")}
                </motion.div>
              </button>
            </th>
            <th className="px-6 py-3 text-left">
              <button
                onClick={() => handleSort("adherence")}
                className="flex items-center space-x-1 text-xs font-medium text-neutral-700 uppercase tracking-wider hover:text-blue-600 transition-colors"
              >
                <span>Adherence</span>
                <motion.div
                  animate={{ rotate: sortField === "adherence" && sortDirection === "desc" ? 180 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
                >
                  {getSortIcon("adherence")}
                </motion.div>
              </button>
            </th>
            <th className="px-6 py-3 text-left">
              <button
                onClick={() => handleSort("riskScore")}
                className="flex items-center space-x-1 text-xs font-medium text-neutral-700 uppercase tracking-wider hover:text-blue-600 transition-colors"
              >
                <span>Risk</span>
                <motion.div
                  animate={{ rotate: sortField === "riskScore" && sortDirection === "desc" ? 180 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
                >
                  {getSortIcon("riskScore")}
                </motion.div>
              </button>
            </th>
            <th className="px-6 py-3 text-left">
              <button
                onClick={() => handleSort("lastActivity")}
                className="flex items-center space-x-1 text-xs font-medium text-neutral-700 uppercase tracking-wider hover:text-blue-600 transition-colors"
              >
                <span>Last Activity</span>
                <motion.div
                  animate={{ rotate: sortField === "lastActivity" && sortDirection === "desc" ? 180 : 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : durations.xs / 1000 }}
                >
                  {getSortIcon("lastActivity")}
                </motion.div>
              </button>
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-neutral-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPatients.map((patient, index) => (
            <motion.tr
              key={patient.id}
              className="hover:bg-gray-50 transition-colors duration-120"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{
                duration: durations.xs / 1000,
                delay: (index * 30) / 1000,
              }}
              whileHover={
                prefersReducedMotion
                  ? {}
                  : {
                      backgroundColor: "rgba(249, 250, 251, 1)",
                      transition: { duration: 0.12 },
                    }
              }
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {patient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-neutral-700">{patient.name}</div>
                    <div className="text-sm text-neutral-500">{patient.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-3">
                    <motion.div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: getAdherenceColor(patient.adherence) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${patient.adherence}%` }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: (index * 50) / 1000 }}
                    />
                  </div>
                  <span className="text-sm font-medium" style={{ color: getAdherenceColor(patient.adherence) }}>
                    {patient.adherence}%
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${getRiskColor(patient.riskLevel)}15`,
                    color: getRiskColor(patient.riskLevel),
                  }}
                >
                  {patient.riskLevel}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                {new Date(patient.lastActivity).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-2">
                  <MotionButton variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </MotionButton>
                  <MotionButton variant="ghost" size="sm">
                    <MessageCircle className="w-4 h-4" />
                  </MotionButton>
                  <MotionButton variant="ghost" size="sm">
                    <Calendar className="w-4 h-4" />
                  </MotionButton>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>

      {sortedPatients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-neutral-500">No patients found matching your search</p>
        </div>
      )}
    </div>
  )
}
