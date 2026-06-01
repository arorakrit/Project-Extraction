import { type DBSchema, type IDBPDatabase, openDB } from 'idb'

const DB_NAME = 'project-extraction'
const DB_VERSION = 1

export interface ProjectExtractionDB extends DBSchema {
  coffees: {
    key: string
    value: unknown // narrowed to SavedCoffee in src/store/coffees.ts (Story 2)
  }
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<ProjectExtractionDB>> | null = null

export function getDB(): Promise<IDBPDatabase<ProjectExtractionDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ProjectExtractionDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Forward-only migrations per constitution Principle IV.
        if (oldVersion < 1) {
          db.createObjectStore('coffees', { keyPath: 'id' })
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

export function __resetDBForTests(): void {
  dbPromise = null
}
