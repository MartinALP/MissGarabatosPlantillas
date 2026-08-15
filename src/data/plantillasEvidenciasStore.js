const DB_NAME = 'missgarabatos.plantillasEvidencias'
const STORE = 'files'
const VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' })
        os.createIndex('campoId', 'campoId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listPlantillasEvidencias() {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const rows = (req.result || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function savePlantillaEvidencia({ campoId, campoNombre, name, blob }) {
  const db = await openDb()
  const rec = {
    id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    campoId,
    campoNombre: campoNombre || campoId,
    name,
    blob,
    createdAt: Date.now(),
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(rec)
    tx.oncomplete = () => resolve(rec)
    tx.onerror = () => reject(tx.error)
  })
}
