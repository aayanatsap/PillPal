export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface ApiErrorShape {
  status: number
  message: string
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `/api/proxy${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const err = await res.json()
      message = err?.detail || err?.message || message
    } catch {}
    const error: ApiErrorShape = { status: res.status, message }
    throw error
  }

  // Some endpoints return 204
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

// Mock API functions for the medication management app

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  times: string[]
  instructions?: string
  imageUrl?: string
}

export interface Dose {
  id: string
  medicationId: string
  scheduledTime: string
  status: "pending" | "taken" | "skipped" | "snoozed"
  takenAt?: string
  notes?: string
}

export interface Patient {
  id: string
  name: string
  email: string
  riskScore: number
  riskLevel: "Low" | "Medium" | "High"
}

export interface Alert {
  id: string
  patientId: string
  type: "missed_dose" | "late_dose" | "risk_increase"
  message: string
  severity: "low" | "medium" | "high"
  createdAt: string
  acknowledgedAt?: string
}

// Mock data
const mockPatient: Patient = {
  id: "1",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  riskScore: 62,
  riskLevel: "Medium",
}

const mockMedications: Medication[] = [
  {
    id: "1",
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    times: ["08:00"],
    instructions: "Take with food",
  },
  {
    id: "2",
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    times: ["08:00", "20:00"],
    instructions: "Take with meals",
  },
]

const mockDoses: Dose[] = [
  {
    id: "1",
    medicationId: "1",
    scheduledTime: "08:00",
    status: "pending",
  },
  {
    id: "2",
    medicationId: "2",
    scheduledTime: "08:00",
    status: "taken",
    takenAt: "08:15",
  },
  {
    id: "3",
    medicationId: "2",
    scheduledTime: "20:00",
    status: "pending",
  },
]

const mockAlerts: Alert[] = [
  {
    id: "1",
    patientId: "1",
    type: "missed_dose",
    message: "Lisinopril dose missed at 8:00 AM",
    severity: "medium",
    createdAt: new Date().toISOString(),
  },
]

// API functions
export async function getPatient(): Promise<Patient> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return mockPatient
}

export async function getMedications(): Promise<Medication[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockMedications
}

export async function getTodaysDoses(): Promise<Dose[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return mockDoses
}

export async function markDoseTaken(doseId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const dose = mockDoses.find((d) => d.id === doseId)
  if (dose) {
    dose.status = "taken"
    dose.takenAt = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
  }
}

export async function snoozeDose(doseId: string, minutes: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const dose = mockDoses.find((d) => d.id === doseId)
  if (dose) {
    dose.status = "snoozed"
  }
}

export async function skipDose(doseId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const dose = mockDoses.find((d) => d.id === doseId)
  if (dose) {
    dose.status = "skipped"
  }
}

export async function getAlerts(): Promise<Alert[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockAlerts
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const alert = mockAlerts.find((a) => a.id === alertId)
  if (alert) {
    alert.acknowledgedAt = new Date().toISOString()
  }
}
