import gzDataUrl from '../data/catalogo_unife_52261_registros.json.gz?url';
import { BibliographicRecord } from '../types';
import { INITIAL_BIBLIOGRAPHIC_DATA } from '../data/sampleDatabase';
import { mapToOfficialMaterialType, normalizeDescriptorsList } from './excelParser';

const DB_NAME = 'UNIFE_BIBLIOGRAPHIC_DB';
const STORE_NAME = 'records_store';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'unife_bibliographic_db_v2';
const LEGACY_STORAGE_KEY = 'unife_bibliographic_db';

/**
 * Descomprime un ArrayBuffer gzip usando DecompressionStream nativo del navegador
 */
async function decompressGzip(arrayBuffer: ArrayBuffer): Promise<string> {
  const stream = new Blob([arrayBuffer])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  const decompressedArrayBuffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(decompressedArrayBuffer);
}

function sanitizeLoadedRecords(records: BibliographicRecord[]): BibliographicRecord[] {
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

  records.forEach((r) => {
    const title = r.title || '';
    const foundCanonical = canonicalMap.find((c) => c.match(title, r.mfn));

    if (foundCanonical) {
      const canonicalId = foundCanonical.canonical.id;
      if (!handledCanonicalIds.has(canonicalId)) {
        handledCanonicalIds.add(canonicalId);
        processedRecords.push({
          ...foundCanonical.canonical,
        });
      }
    } else {
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

  INITIAL_BIBLIOGRAPHIC_DATA.forEach((initRec) => {
    if (!handledCanonicalIds.has(initRec.id)) {
      processedRecords.push(initRec);
      handledCanonicalIds.add(initRec.id);
    }
  });

  processedRecords.sort((a, b) => {
    const yearA = Number(a.year || 0);
    const yearB = Number(b.year || 0);
    if (yearB !== yearA) return yearB - yearA;
    return (a.itemNumber || 0) - (b.itemNumber || 0);
  });

  return processedRecords;
}

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
      const cleanRecords = sanitizeLoadedRecords(records);
      await saveRecordsToStorage(cleanRecords);
      return cleanRecords;
    }

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
            await saveRecordsToStorage(clean);
            cleanupLegacyLocalStorage();
            return clean;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // CARGA AUTOMÁTICA DEL ARCHIVO .GZ USANDO API NATIVA
    try {
      const response = await fetch(gzDataUrl);
      const arrayBuffer = await response.arrayBuffer();
      const decompressedString = await decompressGzip(arrayBuffer);
      const gzRecords: BibliographicRecord[] = JSON.parse(decompressedString);

      if (Array.isArray(gzRecords) && gzRecords.length > 0) {
        const cleanGzRecords = sanitizeLoadedRecords(gzRecords);
        await saveRecordsToStorage(cleanGzRecords);
        return cleanGzRecords;
      }
    } catch (gzError) {
      console.error('Error al descomprimir con API nativa:', gzError);
    }

    return INITIAL_BIBLIOGRAPHIC_DATA;
  } catch (err) {
    console.warn('Falling back to initial dataset:', err);
    return INITIAL_BIBLIOGRAPHIC_DATA;
  }
}

export async function saveRecordsToStorage(records: BibliographicRecord[]): Promise<void> {
  cleanupLegacyLocalStorage();

  try {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.clear();

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