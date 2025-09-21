export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface ApiErrorShape {
  status: number
  message: string
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `/api/proxy${path.startsWith('/') ? path : `/${path}`}`
  // Attach client time zone so backend can compute schedules server-side in user's local time
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Timezone': tz,
      ...(init.headers || {}),
    },
  })

  if (!res.ok) {
    if (res.status === 401) {
      // Redirect to login on auth errors
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    let message = 'Request failed'
    try {
      const err = await res.json()
      message = err?.detail || err?.message || message
    } catch {
      try {
        const text = await res.text()
        if (text) message = text
      } catch {}
    }
    const error = new Error(`${res.status} ${message}`) as Error & { status?: number }
    error.status = res.status
    throw error
  }

  // Some endpoints return 204
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

// Real API wrappers (FastAPI via Next proxy)
export interface ApiUser {
  id: string
  auth0_sub: string
  role: 'patient' | 'caregiver' | 'clinician'
  name: string
  phone_enc?: string | null
  created_at: string
}

export interface ApiDose {
  id: string
  medication_id: string
  scheduled_at: string
  status: 'pending' | 'taken' | 'skipped' | 'snoozed'
  taken_at?: string | null
  notes?: string | null
  medication_name?: string
}

export async function getUserMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/v1/user/me')
}

export async function updateUserMe(body: Partial<Pick<ApiUser, 'name' | 'role' | 'phone_enc'>>): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/v1/user/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function getNextDose(): Promise<{ dose_id: string; medication_name: string; scheduled_at: string } | { message: string }> {
  return apiFetch('/api/v1/user/next-dose')
}

export async function getDosesToday(): Promise<ApiDose[]> {
  return apiFetch('/api/v1/doses')
}

export async function patchDose(
  doseId: string,
  body: Partial<{ status: 'taken' | 'skipped' | 'snoozed'; taken_at?: string; notes?: string }>,
): Promise<ApiDose> {
  return apiFetch(`/api/v1/doses/${doseId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export interface ApiMedication {
  id: string
  name: string
  strength_text?: string | null
  dose_text?: string | null
  instructions?: string | null
  times: string[]
  frequency_text?: string | null
  created_at: string
}

export const listMedications = async (): Promise<ApiMedication[]> => {
  return apiFetch<ApiMedication[]>('/api/v1/medications')
}

export async function createMedication(payload: {
  name: string
  strength_text?: string
  dose_text?: string
  instructions?: string
  frequency_text?: string
  times: string[]
}): Promise<ApiMedication> {
  return apiFetch('/api/v1/medications', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteMedication(medicationId: string): Promise<{ success: boolean }> {
  return apiFetch(`/api/v1/medications/${medicationId}`, { method: 'DELETE' })
}

export async function extractLabel(formData: FormData): Promise<any> {
  return fetch('/api/proxy/api/v1/label-extract', {
    method: 'POST',
    body: formData as any,
  }).then(async (r) => {
    if (!r.ok) throw new Error('Label extraction failed')
    return r.json()
  })
}

// Voice intent
export interface ApiIntentResponse {
  intent: string
  data: {
    confidence: number
    entities: Record<string, any>
    suggested_response: string
    original_query: string
  }
}

export async function parseIntent(query: string): Promise<ApiIntentResponse> {
  return apiFetch<ApiIntentResponse>('/api/v1/intent', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
}

// --- Risk scoring ---
export type RiskOut = {
  score_0_100: number
  bucket: 'low' | 'medium' | 'high'
  rationale: string
  suggestion: string
  contributing_factors: string[]
}

export async function getRiskToday(): Promise<RiskOut> {
  return apiFetch<RiskOut>('/api/v1/risk/today')
}

export type RiskInsights = {
  title: string
  highlights: string[]
  advice: string
  next_best_action: string
  misses_7d?: number
  snoozes_7d?: number
  top_missed_block?: string | null
}

export async function getRiskInsights(): Promise<RiskInsights> {
  return apiFetch<RiskInsights>('/api/v1/risk/insights')
}

export async function sendInsightsSms(): Promise<{ success: boolean; sid?: string | null }> {
  return apiFetch('/api/v1/notify/insights', { method: 'POST' })
}

export function downloadAdherenceCsv(): void {
  const url = `/api/proxy/api/v1/export/adherence.csv`
  const a = document.createElement('a')
  a.href = url
  a.download = 'adherence.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// Alerts feed (synthetic events from backend)
export type ApiAlertFeedItem = {
  id: string
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high'
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
  medicationName?: string
}

export async function getAlertsFeed(): Promise<ApiAlertFeedItem[]> {
  return apiFetch<ApiAlertFeedItem[]>('/api/v1/alerts/feed')
}
