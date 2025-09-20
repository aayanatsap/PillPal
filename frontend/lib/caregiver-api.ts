// Mock API functions for caregiver dashboard

export interface CaregiverActivity {
  id: string
  type: "dose_taken" | "dose_missed" | "dose_snoozed" | "alert_created" | "vitals_recorded"
  description: string
  time: string
  isNew: boolean
}

export interface TimelineGroup {
  id: string
  title: string
  timeRange: string
  activities: CaregiverActivity[]
  hasNewActivities: boolean
  newActivityCount: number
}

export interface CaregiverData {
  patient: {
    id: string
    name: string
    riskLevel: "Low" | "Medium" | "High"
  }
  adherenceRate: number
  todaysDoses: {
    taken: number
    total: number
  }
  newActivities: number
  timelineGroups: TimelineGroup[]
}

// Mock data
const mockActivities: CaregiverActivity[] = [
  {
    id: "1",
    type: "dose_taken",
    description: "Lisinopril 10mg taken on time",
    time: "8:15 AM",
    isNew: false,
  },
  {
    id: "2",
    type: "dose_taken",
    description: "Metformin 500mg taken",
    time: "8:20 AM",
    isNew: false,
  },
  {
    id: "3",
    type: "dose_missed",
    description: "Lisinopril 10mg dose missed",
    time: "8:30 PM",
    isNew: true,
  },
  {
    id: "4",
    type: "alert_created",
    description: "Missed dose alert sent to caregiver",
    time: "8:45 PM",
    isNew: true,
  },
  {
    id: "5",
    type: "dose_snoozed",
    description: "Metformin 500mg snoozed for 15 minutes",
    time: "7:45 PM",
    isNew: false,
  },
  {
    id: "6",
    type: "dose_taken",
    description: "Metformin 500mg taken (after snooze)",
    time: "8:00 PM",
    isNew: false,
  },
]

const mockTimelineGroups: TimelineGroup[] = [
  {
    id: "morning",
    title: "Morning Routine",
    timeRange: "6:00 AM - 12:00 PM",
    activities: mockActivities.slice(0, 2),
    hasNewActivities: false,
    newActivityCount: 0,
  },
  {
    id: "evening",
    title: "Evening Routine",
    timeRange: "6:00 PM - 10:00 PM",
    activities: mockActivities.slice(2),
    hasNewActivities: true,
    newActivityCount: 2,
  },
]

const mockCaregiverData: CaregiverData = {
  patient: {
    id: "1",
    name: "",
    riskLevel: "Medium",
  },
  adherenceRate: 85,
  todaysDoses: {
    taken: 3,
    total: 4,
  },
  newActivities: 2,
  timelineGroups: mockTimelineGroups,
}

// API functions
export async function getCaregiverData(): Promise<CaregiverData> {
  await new Promise((resolve) => setTimeout(resolve, 800))
  return mockCaregiverData
}

export async function markActivityAsRead(activityId: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  // Update activity to mark as read
  const activity = mockActivities.find((a) => a.id === activityId)
  if (activity) {
    activity.isNew = false
  }
}

export async function getPatientContacts(): Promise<any[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [
    {
      id: "1",
      name: "",
      phone: "+1 (555) 123-4567",
      email: "",
      relationship: "Patient",
    },
    {
      id: "2",
      name: "Dr. Smith",
      phone: "+1 (555) 987-6543",
      email: "dr.smith@clinic.com",
      relationship: "Primary Care Physician",
    },
  ]
}
