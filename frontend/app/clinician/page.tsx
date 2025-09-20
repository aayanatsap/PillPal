"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Download, Search, Filter, Users, TrendingUp, AlertTriangle, Activity } from "lucide-react"
import { MotionCard } from "@/components/ui/motion-card"
import { MotionButton } from "@/components/ui/motion-button"
import { Navigation } from "@/components/navigation"
import { PatientTable } from "@/components/patient-table"
import { AnalyticsChart } from "@/components/analytics-chart"
import { SkeletonCard } from "@/components/ui/skeleton"
import { useMotion } from "@/components/motion-provider"
import { useToast } from "@/hooks/use-toast"
import { getClinicianData, exportPatientData, type ClinicianData } from "@/lib/clinician-api"

export default function ClinicianPage() {
  const [data, setData] = useState<ClinicianData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const { prefersReducedMotion, easing, durations, stagger } = useMotion()
  const { toast } = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        const clinicianData = await getClinicianData()
        setData(clinicianData)
      } catch (error) {
        console.error("Failed to load clinician data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportPatientData()
      toast({
        title: "Export started",
        description: "Your patient data export will be ready shortly",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <SkeletonCard />
            <div className="grid gap-4 md:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-neutral-500">Failed to load clinician data</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
          {/* Header */}
          <motion.div variants={itemVariants}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-neutral-700 text-balance">Clinician Dashboard</h1>
                <p className="text-neutral-500 text-pretty">
                  Monitor patient adherence and manage medication protocols
                </p>
              </div>
              <MotionButton onClick={handleExport} disabled={isExporting} className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
              </MotionButton>
            </div>
          </motion.div>

          {/* Overview metrics */}
          <motion.div className="grid gap-4 md:grid-cols-4" variants={itemVariants}>
            <MotionCard className="p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Total Patients</p>
                  <p className="text-2xl font-bold text-neutral-700">{data.overview.totalPatients}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </MotionCard>

            <MotionCard className="p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Avg Adherence</p>
                  <p className="text-2xl font-bold text-green-600">{data.overview.avgAdherence}%</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </MotionCard>

            <MotionCard className="p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">{data.overview.highRiskPatients}</p>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </MotionCard>

            <MotionCard className="p-4 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-500">Active Alerts</p>
                  <p className="text-2xl font-bold text-teal-600">{data.overview.activeAlerts}</p>
                </div>
                <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </MotionCard>
          </motion.div>

          {/* Analytics chart */}
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 bg-white">
              <h3 className="text-lg font-medium text-neutral-700 mb-4">Adherence Trends</h3>
              <AnalyticsChart data={data.adherenceTrends} />
            </MotionCard>
          </motion.div>

          {/* Patient table */}
          <motion.div variants={itemVariants}>
            <MotionCard className="bg-white overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-medium text-neutral-700">Patient Management</h3>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search patients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                      />
                    </div>
                    <MotionButton variant="ghost" size="sm">
                      <Filter className="w-4 h-4" />
                    </MotionButton>
                  </div>
                </div>
              </div>
              <PatientTable patients={data.patients} searchQuery={searchQuery} />
            </MotionCard>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
