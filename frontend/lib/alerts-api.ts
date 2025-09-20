// Mock API functions for alerts system

export interface Alert {
  id: string
  type: "missed_dose" | "late_dose" | "risk_increase" | "caregiver_notification"
  title: string
  message: string
  priority: "low" | "medium" | "high"
  status: "active" | "acknowledged" | "resolved"
  createdAt: string
  acknowledgedAt?: string
  patientId: string
  patientName: string
}

// Mock data
const mockAlerts: Alert[] = [
  {
    id: "1",
    type: "missed_dose",
    title: "Missed Dose Alert",
    message: "Lisinopril 10mg dose was missed at 8:00 AM. Patient has not taken medication for 2 hours.",
    priority: "high",
    status: "active",
    createdAt: "2024-01-15T10:00:00Z",
    patientId: "1",
    patientName: "",
  },
  {
    id: "2",
    type: "late_dose",
    title: "Late Dose Warning",
    message: "Metformin 500mg is 30 minutes overdue. Patient typically takes medication on time.",
    priority: "medium",
    status: "active",
    createdAt: "2024-01-15T08:30:00Z",
    patientId: "1",
    patientName: "",
  },
  {
    id: "3",
    type: "risk_increase",
    title: "Risk Score Increase",
    message: "Patient risk score has increased from 45 to 62 due to recent missed doses.",
    priority: "high",
    status: "active",
    createdAt: "2024-01-15T09:15:00Z",
    patientId: "1",
    patientName: "",
  },
  {
    id: "4",
    type: "caregiver_notification",
    title: "Caregiver Notified",
    message: "Emergency contact has been notified about missed medication doses.",
    priority: "medium",
    status: "acknowledged",
    createdAt: "2024-01-14T16:20:00Z",
    acknowledgedAt: "2024-01-14T16:25:00Z",
    patientId: "1",
    patientName: "",
  },
  {
    id: "5",
    type: "missed_dose",
    title: "Missed Evening Dose",
    message: "Patient missed evening Metformin dose. This is the second missed dose this week.",
    priority: "medium",
    status: "acknowledged",
    createdAt: "2024-01-14T20:30:00Z",
    acknowledgedAt: "2024-01-14T21:00:00Z",
    patientId: "2",
    patientName: "Michael Chen",
  },
  {
    id: "6",
    type: "late_dose",
    title: "Delayed Morning Medication",
    message: "Morning medication routine is 45 minutes behind schedule.",
    priority: "low",
    status: "active",
    createdAt: "2024-01-15T08:45:00Z",
    patientId: "3",
    patientName: "Emily Rodriguez",
  },
]

// API functions
export async function getAlerts(): Promise<Alert[]> {
  await new Promise((resolve) => setTimeout(resolve, 800))
  return mockAlerts
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500))
  const alert = mockAlerts.find((a) => a.id === alertId)
  if (alert) {
    alert.status = "acknowledged"
    alert.acknowledgedAt = new Date().toISOString()
  }
}

export async function createAlert(alertData: Omit<Alert, "id" | "createdAt">): Promise<Alert> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const newAlert: Alert = {
    ...alertData,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  }
  mockAlerts.unshift(newAlert)
  return newAlert
}

export async function resolveAlert(alertId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const alert = mockAlerts.find((a) => a.id === alertId)
  if (alert) {
    alert.status = "resolved"
  }
}

export async function getAlertsByPatient(patientId: string): Promise<Alert[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return mockAlerts.filter((alert) => alert.patientId === patientId)
}
