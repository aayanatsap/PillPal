// Mock API functions for clinician dashboard

export interface PatientRecord {
  id: string
  name: string
  email: string
  adherence: number
  riskLevel: "Low" | "Medium" | "High"
  riskScore: number
  lastActivity: string
  medications: number
  alerts: number
}

export interface ClinicianOverview {
  totalPatients: number
  avgAdherence: number
  highRiskPatients: number
  activeAlerts: number
}

export interface AdherenceTrend {
  date: string
  adherence: number
  patients: number
}

export interface ClinicianData {
  overview: ClinicianOverview
  patients: PatientRecord[]
  adherenceTrends: AdherenceTrend[]
}

// Mock data
const mockPatients: PatientRecord[] = [
  {
    id: "1",
    name: "",
    email: "",
    adherence: 85,
    riskLevel: "Medium",
    riskScore: 62,
    lastActivity: "2024-01-15",
    medications: 3,
    alerts: 2,
  },
  {
    id: "2",
    name: "Michael Chen",
    email: "michael@example.com",
    adherence: 95,
    riskLevel: "Low",
    riskScore: 25,
    lastActivity: "2024-01-14",
    medications: 2,
    alerts: 0,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@example.com",
    adherence: 65,
    riskLevel: "High",
    riskScore: 78,
    lastActivity: "2024-01-13",
    medications: 4,
    alerts: 5,
  },
  {
    id: "4",
    name: "David Thompson",
    email: "david@example.com",
    adherence: 92,
    riskLevel: "Low",
    riskScore: 18,
    lastActivity: "2024-01-15",
    medications: 1,
    alerts: 0,
  },
  {
    id: "5",
    name: "Lisa Wang",
    email: "lisa@example.com",
    adherence: 78,
    riskLevel: "Medium",
    riskScore: 45,
    lastActivity: "2024-01-12",
    medications: 3,
    alerts: 1,
  },
]

const mockAdherenceTrends: AdherenceTrend[] = [
  { date: "2024-01-08", adherence: 82, patients: 45 },
  { date: "2024-01-09", adherence: 85, patients: 47 },
  { date: "2024-01-10", adherence: 83, patients: 46 },
  { date: "2024-01-11", adherence: 87, patients: 48 },
  { date: "2024-01-12", adherence: 84, patients: 49 },
  { date: "2024-01-13", adherence: 86, patients: 50 },
  { date: "2024-01-14", adherence: 88, patients: 52 },
]

const mockOverview: ClinicianOverview = {
  totalPatients: mockPatients.length,
  avgAdherence: Math.round(mockPatients.reduce((sum, p) => sum + p.adherence, 0) / mockPatients.length),
  highRiskPatients: mockPatients.filter((p) => p.riskLevel === "High").length,
  activeAlerts: mockPatients.reduce((sum, p) => sum + p.alerts, 0),
}

const mockClinicianData: ClinicianData = {
  overview: mockOverview,
  patients: mockPatients,
  adherenceTrends: mockAdherenceTrends,
}

// API functions
export async function getClinicianData(): Promise<ClinicianData> {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return mockClinicianData
}

export async function exportPatientData(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  // Simulate CSV export
  console.log("Exporting patient data to CSV...")
}

export async function getPatientDetails(patientId: string): Promise<PatientRecord | null> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockPatients.find((p) => p.id === patientId) || null
}

export async function updatePatientRisk(patientId: string, riskLevel: "Low" | "Medium" | "High"): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const patient = mockPatients.find((p) => p.id === patientId)
  if (patient) {
    patient.riskLevel = riskLevel
  }
}
