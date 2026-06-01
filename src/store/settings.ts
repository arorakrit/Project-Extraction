import { getDB } from './db'

const STORE = 'settings' as const
const API_KEY_KEY = 'anthropic_api_key'

interface SettingsRow {
  key: string
  value: string
}

export async function getApiKey(): Promise<string | null> {
  const db = await getDB()
  const row = (await db.get(STORE, API_KEY_KEY)) as SettingsRow | undefined
  return row?.value ?? null
}

export async function setApiKey(value: string): Promise<void> {
  const db = await getDB()
  await db.put(STORE, { key: API_KEY_KEY, value })
}

export async function clearApiKey(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, API_KEY_KEY)
}
