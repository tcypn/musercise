import { normaliseProgress } from '../store/normalise'
import { readJson, writeJson } from '../store/storage'
import type { Progress, SessionPayload } from './types'

const SETTINGS_KEY = 'musercise.settings'

export interface Settings {
  apiUrl: string
  token: string
}

export function getSettings(): Settings {
  const stored = readJson<Partial<Settings>>(SETTINGS_KEY, {})
  return {
    apiUrl: stored.apiUrl ?? import.meta.env.VITE_API_URL ?? '',
    token: stored.token ?? '',
  }
}

export function saveSettings(settings: Settings): void {
  writeJson(SETTINGS_KEY, { apiUrl: settings.apiUrl.trim().replace(/\/+$/, ''), token: settings.token.trim() })
}

export function isConfigured(): boolean {
  const { apiUrl } = getSettings()
  return apiUrl.length > 0
}

/** `network` = could not reach the server; `http` = the server answered with an error. */
export class ApiError extends Error {
  kind: 'network' | 'http'
  status: number
  constructor(message: string, kind: 'network' | 'http', status = 0) {
    super(message)
    this.kind = kind
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiUrl, token } = getSettings()
  let response: Response
  try {
    response = await fetch(`${apiUrl}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    })
  } catch {
    throw new ApiError('Cannot reach the server.', 'network')
  }
  if (!response.ok) {
    const hint = response.status === 403 ? 'The access token was rejected.' : `Server error (${response.status}).`
    throw new ApiError(hint, 'http', response.status)
  }
  return (await response.json()) as T
}

export const fetchProgress = async (): Promise<Progress> => normaliseProgress(await request<unknown>('/progress/'))

export const postSession = (payload: SessionPayload) =>
  request<unknown>('/sessions/', { method: 'POST', body: JSON.stringify(payload) })
