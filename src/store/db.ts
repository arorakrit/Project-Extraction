import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { BrewLogEntry } from './brews'
import type { DrinkLog } from './drinks'

const DB_NAME = 'project-extraction'
const DB_VERSION = 3

export interface ProjectExtractionDB extends DBSchema {
  coffees: {
    key: string
    value: unknown // narrowed to SavedCoffee in src/store/coffees.ts (Story 2)
  }
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
  brews: {
    key: string
    value: BrewLogEntry
    indexes: { by_coffee: string } // on coffee_id
  }
  drinks: {
    key: string
    value: DrinkLog // standalone tasting log (feature 003); no index
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
        if (oldVersion < 2) {
          const brews = db.createObjectStore('brews', { keyPath: 'id' })
          brews.createIndex('by_coffee', 'coffee_id')
        }
        if (oldVersion < 3) {
          // Standalone drink-log store (feature 003). No index — history sort
          // and venue suggestions are derived in memory (see research D2).
          db.createObjectStore('drinks', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export function __resetDBForTests(): void {
  dbPromise = null
}
