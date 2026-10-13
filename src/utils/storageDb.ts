import { ungzip } from 'pako';
import gzDataUrl from '../data/catalogo_unife_52261_registros.json.gz?url';
import { BibliographicRecord } from '../types';
import { mapToOfficialMaterialType, normalizeDescriptorsList } from './excelParser';

const DB_NAME = 'UNIFE_BIBLIOGRAPHIC_DB';
const STORE_NAME = 'records_store';
const DB_VERSION = 5;

export function cleanupLegacyLocalStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('unife_bibliographic_db_v2');
      localStorage.removeItem('unife_bibliographic_db');
    }
  } catch {
    // Ignore cleanup errors
  }
}

function sanitizeLoadedRecords(records: BibliographicRecord[]): BibliographicRecord[] {
  return records.map((r) => {
    let parsedYear = typeof r.year === 'number' ? r.year : parseInt(String(r.year || '0'), 10) || 0;
    const officialType = mapToOfficialMaterialType(r.materialType, r.classification, r.title, r.degree, r.url, r.marc502);
    const isDigital = officialType === 'Tesis digital';

    return {
      ...r,
      id: r.id || String(Math.random()),
      year: parsedYear,
      materialType: officialType,
      barcode: isDigital ? '' : r.barcode,
      copies: isDigital ? undefined : r.copies,
      location: isDigital ? 'Repositorio Digital' : r.location,
      descriptors: normalizeDescriptorsList(r.descriptors || []),
      indice: r.indice || r.content || undefined,
      content: r.content || r.indice || undefined,
    };
  }).sort((a, b) => {
    const yearA = Number(a.year || 0);
    const yearB = Number(b.year || 0);
    if (yearB !== yearA) return yearB - yearA;
    return (a.itemNumber || 0) - (b.itemNumber || 0);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no soportado'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_NAME);
        store.clear();
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRecordsToStorage(records: BibliographicRecord[]): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    store.clear();
    for (let i = 0; i < records.length; i++) {
      store.put(records[i]);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadRecordsFromStorage(): Promise<BibliographicRecord[]> {
  const db = await openDatabase();
  
  const existingRecords = await new Promise<BibliographicRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  if (existingRecords.length > 50000) {
    return existingRecords;
  }

  try {
    const response = await fetch(gzDataUrl);
    if (!response.ok) throw new Error('No se pudo descargar el archivo gz');
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    
    let jsonString = '';
    try {
      jsonString = ungzip(uint8, { to: 'string' } as any) as unknown as string;
    } catch (pakoErr) {
      const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
      const decompressedBuffer = await new Response(stream).arrayBuffer();
      jsonString = new TextDecoder().decode(decompressedBuffer);
    }

    const rawRecords = JSON.parse(jsonString);
    if (Array.isArray(rawRecords) && rawRecords.length > 0) {
      const cleanRecords = sanitizeLoadedRecords(rawRecords);
      // Save background to IndexedDB
      saveRecordsToStorage(cleanRecords).catch((e) => console.warn('Background IDB save error:', e));
      return cleanRecords;
    }
  } catch (err) {
    console.error('Error al procesar el catálogo:', err);
  }

  return existingRecords;
}
