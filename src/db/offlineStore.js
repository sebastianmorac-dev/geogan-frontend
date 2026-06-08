import { openDB } from 'idb';

const DB_NAME = 'geogan_offline_db';
const DB_VERSION = 1;

export async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('pesajes')) {
                db.createObjectStore('pesajes', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('sanidad')) {
                db.createObjectStore('sanidad', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('movimientos')) {
                db.createObjectStore('movimientos', { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

// ==========================================
// PESAJE
// ==========================================
export async function saveOfflinePesaje(payload) {
    const db = await initDB();
    await db.add('pesajes', { ...payload, timestamp: Date.now() });
}

export async function getOfflinePesajes() {
    const db = await initDB();
    return db.getAll('pesajes');
}

export async function clearOfflinePesajes() {
    const db = await initDB();
    await db.clear('pesajes');
}

export async function deleteOfflinePesaje(id) {
    const db = await initDB();
    await db.delete('pesajes', id);
}

// ==========================================
// MOVIMIENTOS
// ==========================================
export async function saveOfflineMovimiento(payload) {
    const db = await initDB();
    await db.add('movimientos', { ...payload, timestamp: Date.now() });
}

export async function getOfflineMovimientos() {
    const db = await initDB();
    return db.getAll('movimientos');
}

export async function clearOfflineMovimientos() {
    const db = await initDB();
    await db.clear('movimientos');
}

// Función general para saber si hay cosas pendientes
export async function getPendingSyncCount() {
    const db = await initDB();
    const p = await db.count('pesajes');
    const s = await db.count('sanidad');
    const m = await db.count('movimientos');
    return p + s + m;
}
