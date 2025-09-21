export type UUID = string

export type UserRole = 'patient' | 'caregiver' | 'clinician'
export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'snoozed'

export interface User {
  id: UUID
  auth0_sub: string
  role: UserRole
  name: string
  phone_enc?: string | null
  created_at: string
}

export interface Medication {
  id: UUID
  user_id: UUID
  name: string
  strength_text?: string | null
  dose_text?: string | null
  instructions?: string | null
  created_at: string
}

export interface PillPalMedTime {
  id: UUID
  medication_id: UUID
  time_of_day: string // HH:MM:SS
}

export interface Dose {
  id: UUID
  user_id: UUID
  medication_id: UUID
  scheduled_at: string
  status: DoseStatus
  taken_at?: string | null
  notes?: string | null
  created_at: string
}

export interface Alert {
  id: UUID
  dose_id: UUID
  sent_at: string
  ack_by_user_id?: UUID | null
  ack_at?: string | null
  meta: Record<string, unknown>
}

export interface IntentRequest {
  query: string
}

export interface IntentResponse {
  intent: string
  data: {
    confidence: number
    entities: Record<string, unknown>
    suggested_response: string
    original_query: string
  }
}


