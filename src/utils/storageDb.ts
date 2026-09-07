import { BibliographicRecord } from '../types';
import { INITIAL_BIBLIOGRAPHIC_DATA } from '../data/sampleDatabase';
import { mapToOfficialMaterialType, normalizeDescriptorsList } from './excelParser';

const DB_NAME = 'UNIFE_BIBLIOGRAPHIC_DB';
const STORE_NAME = 'records_store';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'unife_bibliographic_db_v2';
const LEGACY_STORAGE_KEY = 'unife_bibliographic_db';

function sanitizeLoadedRecords(records: BibliographicRecord[]): BibliographicRecord[] {
  // Benchmark records to ensure are always present and up-to-date with complete content & metadata
  const canonicalMap: Array<{
    match: (title: string, mfn?: string | number) => boolean;
    canonical: BibliographicRecord;
  }> = INITIAL_BIBLIOGRAPHIC_DATA.map((initRec) => ({
    match: (title: string, mfn?: string | number) => {
      const norm = (title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const initNorm = initRec.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (initNorm.includes('naturaleza y paisaje') && (norm.includes('naturaleza y paisaje') || norm.includes('paisaje en la universidad'))) return true;
      if (initNorm.includes('plazo razonable') && (norm.includes('plazo razonable') || norm.includes('procesos de divorcio'))) return true;
      if (initNorm.includes('temas de mujer') && (norm.includes('temas de mujer') || norm.includes('investigacion de tesis con temas'))) return true;
      if (initNorm.includes('centro de capacitacion') && (norm.includes('centro de capacitacion') || norm.includes('discapacidad visual'))) return true;
      if (initNorm.includes('resumenes de tesis') && (norm.includes('resumenes de tesis') || norm.includes('thesis abstracts'))) return true;
      if (initNorm.includes('memoria autobiografica') && norm.includes('memoria autobiografica')) return true;
      if (initNorm.includes('sentido del estilo') && norm.includes('sentido del estilo')) return true;
      if (initNorm.includes('metodologia de la investigacion') && norm.includes('metodologia de la investigacion')) return true;
      if (initNorm.includes('psicologia organizacional') && norm.includes('psicologia organizacional')) return true;
      if (initNorm.includes('psicologia de la adolescencia') && (norm.includes('psicologia de la adolescencia') || norm.includes('desarrollo humano'))) return true;
      if (initNorm.includes('test integrado') && norm.includes('test integrado')) return true;
      if (initNorm.includes('diccionario enciclopedico') && norm.includes('diccionario enciclopedico')) return true;
      if (initNorm.includes('relacion individuo') && norm.includes('relacion individuo')) return true;
      if (initNorm.includes('evaluacion psicologica') && norm.includes('evaluacion psicologica')) return true;
      if (initNorm.includes('diseno y calculo elastico') && norm.includes('diseno y calculo elastico')) return true;
      return norm === initNorm || (mfn !== undefined && initRec.mfn !== undefined && String(mfn) === String(initRec.mfn));
    },
    canonical: initRec,
  }));

  const handledCanonicalIds = new Set<string>();
  const processedRecords: BibliographicRecord[] = [];

  // 1. Process existing records from storage, updating canonical ones and removing duplicate canonicals
  records.forEach((r) => {
    const title = r.title || '';
    const foundCanonical = canonicalMap.find((c) => c.match(title, r.mfn));

    if (foundCanonical) {
      const canonicalId = foundCanonical.canonical.id;
      if (!handledCanonicalIds.has(canonicalId)) {
        handledCanonicalIds.add(canonicalId);
        // Take canonical data directly to guarantee 100% faithful representation
        processedRecords.push({
          ...foundCanonical.canonical,
        });
      }
      // If already handled, skip duplicate
    } else {
      // Non-canonical custom record from user import: normalize it
      let parsedYear = typeof r.year === 'number' ? r.year : parseInt(String(r.year || '0'), 10) || 0;
      const officialType = mapToOfficialMaterialType(r.materialType, r.classification, r.title, r.degree, r.url, r.marc502);
      const isDigital = officialType === 'Tesis digital';

      processedRecords.push({
        ...r,
        year: parsedYear,
        materialType: officialType,
        barcode: isDigital ? '' : r.barcode,
        copies: isDigital ? undefined : r.copies,
        location: isDigital ? 'Repositorio Digital' : r.location,
        descriptors: normalizeDescriptorsList(r.descriptors || []),
        indice: r.indice || r.content || undefined,
        content: r.content || r.indice || undefined,
      });
    }
  });

  // 2. Ensure all canonical initial records are included if they weren't in storage
  INITIAL_BIBLIOGRAPHIC_DATA.forEach((initRec) => {
    if (!handledCanonicalIds.has(initRec.id)) {
      processedRecords.push(initRec);
      handledCanonicalIds.add(initRec.id);
    }
  });

  // Sort strictly by year descending (most recent first)
  processedRecords.sort((a, b) => {
    const yearA = Number(a.year || 0);
    const yearB = Number(b.year || 0);
    if (yearB !== yearA) return yearB - yearA;
    return (a.itemNumber || 0) - (b.itemNumber || 0);
  });

  return processedRecords;
}

/**
 * Open IndexedDB connection safely
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Clean up legacy localStorage items that exceed 5MB quota
 */
export function cleanupLegacyLocalStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Load all bibliographic records from IndexedDB.
 * Falls back to localStorage migration or initial sample data.
 */
export async function loadRecordsFromStorage(): Promise<BibliographicRecord[]> {
  try {
    const db = await openDatabase();
    const records = await new Promise<BibliographicRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(result);
        } else {
          resolve([]);
        }
      };

      request.onerror = () => {
        reject(request.error || new Error('Error reading from IndexedDB'));
      };
    });

    if (records.length > 0) {
      // Return stored records and persist sanitized version
      const cleanRecords = sanitizeLoadedRecords(records);
      await saveRecordsToStorage(cleanRecords);
      return cleanRecords;
    }

    // If IndexedDB is empty, check if we have data in localStorage to migrate
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = sanitizeLoadedRecords(
              parsed.filter(
                (r) =>
                  r.materialType !== 'Libro Digital' &&
                  r.materialType !== 'Libro digital' &&
                  r.materialType !== 'Revista impresa'
              )
            );
            // Save to IndexedDB and clear localStorage to prevent quota errors
            await saveRecordsToStorage(clean);
            cleanupLegacyLocalStorage();
            return clean;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Default to INITIAL_BIBLIOGRAPHIC_DATA
    const initialClean = sanitizeLoadedRecords(INITIAL_BIBLIOGRAPHIC_DATA);
    await saveRecordsToStorage(initialClean);
    return initialClean;
  } catch (err) {
    console.warn('Falling back from IndexedDB to initial dataset:', err);
    return sanitizeLoadedRecords(INITIAL_BIBLIOGRAPHIC_DATA);
  }
}

/**
 * Save records array into IndexedDB with full transactional replace
 */
export async function saveRecordsToStorage(records: BibliographicRecord[]): Promise<void> {
  // Always clean up localStorage to ensure no quota exceeded exception occurs
  cleanupLegacyLocalStorage();

  try {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear(); // clear previous records

      records.forEach((record) => {
        store.put(record);
      });

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        console.error('Error saving to IndexedDB transaction:', tx.error);
        reject(tx.error);
      };

      tx.onabort = () => {
        console.error('IndexedDB transaction aborted:', tx.error);
        reject(tx.error);
      };
    });
  } catch (err) {
    console.error('Failed to save records in IndexedDB:', err);
  }
}
