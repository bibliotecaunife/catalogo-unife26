import * as XLSX from 'xlsx';
import { BibliographicRecord, ColumnMapping, ItemCopy, OfficialMaterialType, OFFICIAL_MATERIAL_TYPES } from '../types';

export interface ParsedSheetData {
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface ParseExcelResult {
  fileName: string;
  sheets: ParsedSheetData[];
  defaultSheet: string;
}

/**
 * Normalizes a header or text string for flexible, case-insensitive, accent-insensitive matching
 */
export function normalizeHeaderKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .replace(/[^a-z0-9]/g, '') // remove non-alphanumeric chars
    .trim();
}

/**
 * Maps any raw string, classification or title strictly into one of the 6 official UNIFÉ material types:
 * 1. 'Libro impreso'
 * 2. 'Libro Posgrado'
 * 3. 'Referencia'
 * 4. 'Tesis digital'
 * 5. 'Tesis impresa'
 * 6. 'Test Psicológico'
 */
export function mapToOfficialMaterialType(
  rawType: string,
  rawClassification = '',
  rawTitle = '',
  rawDegree = '',
  rawUrl = '',
  rawMarc502 = ''
): OfficialMaterialType {
  const normType = normalizeHeaderKey(rawType);
  const normClass = normalizeHeaderKey(rawClassification);
  const normTitle = normalizeHeaderKey(rawTitle);
  const normDegree = normalizeHeaderKey(rawDegree);
  const normUrl = normalizeHeaderKey(rawUrl);
  const normMarc502 = normalizeHeaderKey(rawMarc502);

  // 1. If Item column explicitly specifies the type, the Item column takes absolute priority:
  if (normType) {
    if (normType.includes('posgrado') || normType.includes('postgrado')) {
      return 'Libro Posgrado';
    }
    if (normType.includes('referencia') || normType.includes('enciclopedia') || normType.includes('diccionario')) {
      return 'Referencia';
    }
    if (normType.includes('test') || normType.includes('psicometric') || normType.includes('bateria')) {
      return 'Test Psicológico';
    }
    if (normType.includes('tesisdigital') || (normType.includes('tesis') && (normType.includes('digital') || normType.includes('virtual') || normType.includes('enlinea')))) {
      return 'Tesis digital';
    }
    if (normType === 'tesis' || normType.includes('tesisimpresa') || (normType.includes('tesis') && !normType.includes('resumen') && !normType.includes('abstract'))) {
      if (normUrl.includes('handle.net') || normUrl.includes('repositorio') || normClass.startsWith('td')) {
        return 'Tesis digital';
      }
      return 'Tesis impresa';
    }
    if (normType.includes('libro') || normType.includes('folleto') || normType.includes('monografia') || normType.includes('obra')) {
      return 'Libro impreso';
    }
  }

  const hasDegree =
    normDegree.includes('tesis') ||
    normDegree.includes('licenciad') ||
    normDegree.includes('magister') ||
    normDegree.includes('maestria') ||
    normDegree.includes('doctor') ||
    normDegree.includes('bachiller') ||
    normMarc502.includes('tesis') ||
    normMarc502.includes('grado') ||
    normType.includes('tesis') ||
    normType.includes('disertacion');

  const hasDigitalUrlOrMarker =
    normUrl.includes('handle.net') ||
    normUrl.includes('repositorio') ||
    normUrl.includes('cybertesis') ||
    normUrl.startsWith('http') ||
    normType.includes('digital') ||
    normType.includes('virtual') ||
    normType.includes('enlinea') ||
    normClass.startsWith('td') ||
    normClass.includes('/td');

  // 2. Tesis (digital vs impresa)
  if (hasDegree || normClass.startsWith('td') || (normClass.startsWith('t') && /^[0-9]/.test(normClass.slice(1)))) {
    if (hasDigitalUrlOrMarker || normType.includes('digital')) {
      return 'Tesis digital';
    }
    return 'Tesis impresa';
  }

  // 3. Test Psicológico:
  const isTestClassification =
    (normClass.startsWith('p') && (/^[0-9]/.test(normClass.slice(1)) || normClass.startsWith('p/'))) ||
    normClass.startsWith('tp') ||
    normClass.startsWith('test');

  if (isTestClassification && !hasDegree && !hasDigitalUrlOrMarker) {
    return 'Test Psicológico';
  }

  // 4. Libro Posgrado
  if (
    normType.includes('posgrado') ||
    normType.includes('postgrado') ||
    normType.includes('maestria') ||
    normType.includes('doctorado')
  ) {
    return 'Libro Posgrado';
  }

  // 5. Referencia
  if (
    normType.includes('referencia') ||
    normType.includes('enciclopedia') ||
    normType.includes('diccionario') ||
    normType.includes('atlas') ||
    normType.includes('anuario') ||
    normClass.startsWith('ref') ||
    (normClass.startsWith('r') && normClass.length > 2 && /^[0-9]/.test(normClass.slice(1)))
  ) {
    return 'Referencia';
  }

  // 6. Default to Libro impreso
  return 'Libro impreso';
}

// Strict list of Spanish and bibliographic stop-words, articles, conjunctions, and prepositions
// that must NEVER become individual descriptor chips or tags
const STOP_WORDS_SET = new Set<string>([
  'EL', 'LA', 'LOS', 'LAS', 'UN', 'UNA', 'UNOS', 'UNAS',
  'DE', 'DEL', 'A', 'AL', 'EN', 'POR', 'PARA', 'CON', 'SIN', 'SOBRE', 'ENTRE',
  'HACIA', 'DESDE', 'HASTA', 'BAJO', 'ANTE', 'TRAS', 'SEGUN', 'SEGÚN', 'CONTRA',
  'DURANTE', 'MEDIANTE', 'VIA', 'VÍA',
  'Y', 'E', 'NI', 'QUE', 'O', 'U', 'PERO', 'MAS', 'MÁS', 'SINO', 'PORQUE', 'COMO',
  'SU', 'SUS', 'MI', 'MIS', 'TU', 'TUS', 'NUESTRO', 'NUESTRA', 'NUESTROS', 'NUESTRAS',
  'ESTE', 'ESTA', 'ESTOS', 'ESTAS', 'ESE', 'ESA', 'ESOS', 'ESAS', 'AQUEL', 'AQUELLA',
  'LO', 'LE', 'LES', 'ME', 'NOS', 'TE', 'SE',
  'S/A', 'S/E', 'S/D', 'S/N', 'ETC', 'ETC.', 'ETCETERA', 'ETCÉTERA',
]);

/**
 * Normalizes descriptors and ensures:
 * 1. Isolated stop-words, articles, and prepositions ('unos', 'el', 'la', 'los', 'de', etc.) are strictly discarded.
 * 2. Abbreviations like "ETC." or "ETC" stay joined with their preceding term.
 * 3. Only meaningful, clean keywords/phrases (length >= 3 and not in stop-words) become descriptor tags.
 */
export function normalizeDescriptorsList(rawList: string[] | string): string[] {
  let items: string[] = [];
  if (Array.isArray(rawList)) {
    items = rawList.flatMap((s) => String(s).split(/[,;\/|•\n\r]+/));
  } else if (typeof rawList === 'string') {
    items = rawList.split(/[,;\/|•\n\r]+/);
  }

  const cleaned: string[] = [];
  for (const item of items) {
    let trimmed = String(item || '')
      .replace(/^[\s\-_.:;,\/•()]+/g, '')
      .replace(/[\s\-_.:;,\/•()]+$/g, '')
      .trim();

    if (!trimmed) continue;
    const upper = trimmed.toUpperCase();

    // Check if token is standalone ETC or ETC.
    if (upper === 'ETC' || upper === 'ETC.' || upper === 'ETCETERA' || upper === 'ETCÉTERA') {
      if (cleaned.length > 0 && !cleaned[cleaned.length - 1].endsWith('ETC.')) {
        cleaned[cleaned.length - 1] = `${cleaned[cleaned.length - 1]}, ETC.`;
      }
      continue;
    }

    // Strictly forbidden: isolated single words that match stop words (articles, prepositions, pronouns)
    if (STOP_WORDS_SET.has(upper)) {
      continue;
    }

    // Ignore single isolated punctuation or tiny tokens (< 3 chars unless numbers/acronyms)
    if (trimmed.length < 3 && !/^\d+$/.test(trimmed)) {
      continue;
    }

    // Prevent duplicates in the same record
    if (!cleaned.includes(upper)) {
      cleaned.push(upper);
    }
  }

  return cleaned.length > 0 ? cleaned : ['GENERAL', 'BIBLIOGRAFÍA'];
}

/**
 * Known keyword candidates for each bibliographic field
 */
const FIELD_CANDIDATES: Record<keyof ColumnMapping, string[]> = {
  mfn: [
    'mfn',
    'biblionumber',
    'biblio_number',
    'biblionum',
    'mfn_biblio',
    'id_registro',
    'control_number',
    '001',
    'id',
    'nro_mfn',
    'mfn_unife',
    'record_id',
    'numero_sistema',
    'sistema',
    'sys_id',
    'registro_id',
  ],
  title: [
    'titulo',
    'título',
    'title',
    'nombre',
    'denominacion',
    'denominación',
    'obra',
    'documento',
    'tesis_titulo',
    'titulo_libro',
    'nom_obra',
    '245',
    '245a',
    'tituloprincipal',
    'titulo_de_la_tesis',
    'nombre_del_documento',
    'nom_recurso',
    'descripcion_titulo',
  ],
  author: [
    'autor',
    'autores',
    'author',
    'investigador',
    'investigadores',
    'tesista',
    'tesistas',
    'creador',
    'autor_principal',
    'responsable',
    '100',
    '100a',
    '700',
    '700a',
    'autores_principales',
  ],
  materialType: [
    'item',
    'material',
    'tipo_material',
    'tipomaterial',
    'tipo_de_material',
    'material_type',
    'tipo',
    'formato',
    'soporte',
    'coleccion',
    'colección',
    'categoria',
    'categoría',
    'tipo_documento',
    'tipo_recurso',
    'item_type',
  ],
  year: [
    'ano',
    'año',
    'anio',
    'year',
    'fecha',
    'fecha_publicacion',
    'fecha_de_publicacion',
    'ano_publicacion',
    'año_publicacion',
    'date',
    '260c',
    '264c',
    'fec_pub',
    'periodo',
    'publicacion',
  ],
  classification: [
    'clasificacion',
    'clasificación',
    'cota',
    'signatura',
    'signatura_topografica',
    'signatura_topográfica',
    'topografica',
    'topográfica',
    'dewey',
    'lc',
    'codigo_clasificacion',
    'código_clasificación',
    'call_number',
    'callnumber',
    '082',
    '090',
    '050',
    'clasif',
  ],
  descriptors: [
    'descriptores',
    'descriptor',
    'materias',
    'materia',
    'temas',
    'tema',
    'keywords',
    'palabras_clave',
    'palabras_claves',
    'palabrasclave',
    'subject',
    'descriptores_materias',
    '650',
    '650a',
    '653',
    'thesaurus',
    'tesauro',
    'topicos',
    'tópicos',
  ],
  barcode: [
    'codigo_barras',
    'codigobarras',
    'codigo_de_barras',
    'código_de_barras',
    'barcode',
    'codigo',
    'código',
    'cod_barra',
    'cod_barras',
    'inventario',
    'num_inventario',
    'nro_inventario',
    'registro',
    'patrimonio',
    'ejemplar_codigo',
    'item_barcode',
    '852p',
    'barras',
  ],
  location: [
    'ubicacion',
    'ubicación',
    'location',
    'piso',
    'sala',
    'estante',
    'seccion',
    'sección',
    'repositorio',
    'biblioteca',
    'sede',
    '852c',
    '852b',
    'localizacion',
    'localización',
    'area',
    'área',
  ],
  city: [
    'ciudad',
    'city',
    'lugar',
    'pais',
    'país',
    'lugar_publicacion',
    'lugar_de_publicacion',
    'sede',
    '260a',
    '264a',
    'localidad',
  ],
  pages: [
    'paginas',
    'páginas',
    'pages',
    'extension',
    'extensión',
    'volumen',
    'h',
    'pp',
    'nro_paginas',
    'nro_páginas',
    '300a',
    'paginacion',
    'paginación',
    'numero_paginas',
    'número_páginas',
  ],
  publisher: [
    'editorial',
    'editor',
    'publisher',
    'institucion',
    'institución',
    'facultad',
    'fondo_editorial',
    '260b',
    '264b',
    'entidad',
    'publicador',
  ],
  summary: [
    'resumen',
    'summary',
    'abstract',
    'descripcion',
    'descripción',
    'sinopsis',
    '520',
    '520a',
    'sumario',
  ],
  indice: [
    'indice',
    'índice',
    'indices',
    'índices',
    'contenido',
    'content',
    'contents',
    'tabla_contenido',
    'tabla_de_contenido',
    'tabladecontenido',
    'table_of_contents',
    'table_contents',
    'tableofcontents',
    'toc',
    'nota_de_contenido',
    'notas_de_contenido',
    'nota_contenido',
    'notas_contenido',
    'nota_de_contenido_incompleta',
    '505',
    '505a',
    '505_a',
    '505t',
    '505_t',
    '505r',
    '505_r',
    '505g',
    '505_g',
    'capitulos',
    'capítulos',
    'contenido_general',
    'detalles_contenido',
    'tabla_de_materias',
    'temas_tratados',
  ],
  content: [
    'indice',
    'índice',
    'contenido',
    'content',
    'contents',
    'tabla_contenido',
    'tabla_de_contenido',
    'tabladecontenido',
    'table_of_contents',
    'table_contents',
    'tableofcontents',
    'toc',
    'indices',
    'índices',
    'nota_de_contenido',
    'notas_de_contenido',
    'nota_contenido',
    'notas_contenido',
    'nota_de_contenido_incompleta',
    '505',
    '505a',
    '505_a',
    '505t',
    '505_t',
    '505r',
    '505_r',
    '505g',
    '505_g',
    'capitulos',
    'capítulos',
    'contenido_general',
    'detalles_contenido',
    'tabla_de_materias',
    'temas_tratados',
  ],
  url: [
    'url',
    'link',
    'enlace',
    'doi',
    'handle',
    'repositorio_url',
    'uri',
    '856',
    '856u',
    'acceso_digital',
    'link_repositorio',
    'enlace_web',
    'repositorio',
  ],
  isbn: [
    'isbn',
    'issn',
    'identificador',
    '020',
    '022',
  ],
  advisor: [
    'asesor',
    'asesora',
    'tutor',
    'tutora',
    'director',
    'directora',
    'advisor',
    'asesor_tesis',
    'docente_asesor',
    'asesor_a',
  ],
  degree: [
    'grado acad',
    'grado_acad',
    'gradoacad',
    'grado',
    'grado_academico',
    'grado_académico',
    'titulo_obtenido',
    'título_obtenido',
    'degree',
    'carrera',
    'especialidad',
    'facultad_carrera',
    'nivel_academico',
    'programa',
  ],
  marc502: [
    'marc502',
    '502',
    'marc_502',
    'nota_tesis',
    'nota_de_tesis',
    'dissertation_note',
    'tesis_nota',
    'disertacion',
    'disertación',
    'grado_academico_502',
    '502a',
  ],
  publicNote: [
    'nota_publica',
    'nota_pública',
    'public_note',
    'nota',
    'notas',
    'observacion',
    'observaciones',
    'condicion',
    'condición',
    'disponibilidad',
    '500',
    '500a',
    'nota_ejemplar',
    'comentario',
  ],
  volume: ['volumen', 'volume', 'vol', 'vol_ejemplar', 'v'],
  tome: ['tomo', 'tome', 't'],
};

/**
 * Intelligent heuristics to auto-detect and map columns from uploaded Excel
 * Supports uppercase/lowercase, accents, spaces, and diverse alias variations.
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const findBestMatch = (field: keyof ColumnMapping): string => {
    const candidates = FIELD_CANDIDATES[field] || [];

    // 1st pass: exact normalized match
    for (const cand of candidates) {
      const normCand = normalizeHeaderKey(cand);
      const match = headers.find((h) => normalizeHeaderKey(h) === normCand);
      if (match) return match;
    }

    // 2nd pass: header starts with or ends with normalized candidate
    for (const cand of candidates) {
      const normCand = normalizeHeaderKey(cand);
      if (normCand.length < 3) continue;
      const match = headers.find((h) => {
        const normH = normalizeHeaderKey(h);
        return normH.startsWith(normCand) || normH.endsWith(normCand);
      });
      if (match) return match;
    }

    // 3rd pass: substring match with minimum length constraint
    for (const cand of candidates) {
      const normCand = normalizeHeaderKey(cand);
      if (normCand.length < 4) continue;
      const match = headers.find((h) => {
        const normH = normalizeHeaderKey(h);
        return normH.includes(normCand) || normCand.includes(normH);
      });
      if (match) return match;
    }

    return '';
  };

  return {
    mfn: findBestMatch('mfn'),
    title: findBestMatch('title'),
    author: findBestMatch('author'),
    materialType: findBestMatch('materialType'),
    year: findBestMatch('year'),
    classification: findBestMatch('classification'),
    descriptors: findBestMatch('descriptors'),
    barcode: findBestMatch('barcode'),
    location: findBestMatch('location'),
    city: findBestMatch('city'),
    pages: findBestMatch('pages'),
    publisher: findBestMatch('publisher'),
    summary: findBestMatch('summary'),
    indice: findBestMatch('indice') || findBestMatch('content'),
    content: findBestMatch('indice') || findBestMatch('content'),
    url: findBestMatch('url'),
    isbn: findBestMatch('isbn'),
    advisor: findBestMatch('advisor'),
    degree: findBestMatch('degree'),
    marc502: findBestMatch('marc502'),
    publicNote: findBestMatch('publicNote'),
    volume: findBestMatch('volume'),
    tome: findBestMatch('tome'),
  };
}

/**
 * Reads an Excel (.xlsx, .xls, .csv) file with multi-row and dirty header resilience
 */
export async function readExcelFile(file: File): Promise<ParseExcelResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const sheets: ParsedSheetData[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert sheet to 2D array of rows
    const sheetMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (sheetMatrix.length === 0) {
      sheets.push({
        sheetName,
        headers: [],
        rows: [],
        totalRows: 0,
      });
      continue;
    }

    // Heuristic: Find the header row index (scanning first 10 rows)
    let headerRowIdx = 0;
    let bestScore = -1;

    const maxScanRows = Math.min(sheetMatrix.length, 10);
    for (let r = 0; r < maxScanRows; r++) {
      const row = sheetMatrix[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      let score = 0;
      let nonEmptyCells = 0;

      for (const cell of row) {
        const cellStr = String(cell || '').trim();
        if (cellStr.length > 0) {
          nonEmptyCells++;
          const norm = normalizeHeaderKey(cellStr);
          // Check if matches any known bibliographic keywords
          const isKnownKeyword = Object.values(FIELD_CANDIDATES).some((cands) =>
            cands.some((c) => norm === normalizeHeaderKey(c) || (norm.length > 3 && norm.includes(normalizeHeaderKey(c))))
          );
          if (isKnownKeyword) {
            score += 5;
          }
        }
      }

      if (nonEmptyCells >= 2) {
        score += nonEmptyCells;
      }

      if (score > bestScore) {
        bestScore = score;
        headerRowIdx = r;
      }
    }

    // Extract headers from the detected header row
    const rawHeaderRow = sheetMatrix[headerRowIdx] || [];
    const headers: string[] = [];
    const usedHeaders = new Map<string, number>();

    rawHeaderRow.forEach((cell, idx) => {
      let headerName = String(cell || '').trim();
      if (!headerName) {
        headerName = `Columna_${idx + 1}`;
      }
      // Deduplicate header names if identical
      if (usedHeaders.has(headerName)) {
        const count = usedHeaders.get(headerName)! + 1;
        usedHeaders.set(headerName, count);
        headerName = `${headerName}_${count}`;
      } else {
        usedHeaders.set(headerName, 1);
      }
      headers.push(headerName);
    });

    // Build row objects from subsequent data rows
    const rows: Record<string, any>[] = [];
    for (let r = headerRowIdx + 1; r < sheetMatrix.length; r++) {
      const rawDataRow = sheetMatrix[r];
      if (!Array.isArray(rawDataRow)) continue;

      // Skip completely blank rows
      const hasAnyData = rawDataRow.some((val) => String(val || '').trim().length > 0);
      if (!hasAnyData) continue;

      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        const cellValue = rawDataRow[colIdx];
        rowObj[h] = cellValue !== undefined && cellValue !== null ? String(cellValue).trim() : '';
      });

      rows.push(rowObj);
    }

    sheets.push({
      sheetName,
      headers,
      rows,
      totalRows: rows.length,
    });
  }

  return {
    fileName: file.name,
    sheets,
    defaultSheet: workbook.SheetNames[0] || '',
  };
}

/**
 * Converts raw Excel rows into standardized BibliographicRecord objects
 * - Non-blocking: missing optional fields (like marc502, notes, advisor, etc.) are left blank
 * - Resilient: handles any casing, numbers, missing columns gracefully
 * - Maps strictly to the 6 official UNIFÉ material types
 */
export function convertRowsToRecords(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  startingItemNumber = 1
): BibliographicRecord[] {
  const mfnGroups = new Map<string, { baseRow: Record<string, any>; copies: ItemCopy[]; originalIndex: number }>();

  // Helper to safely extract value by exact key or normalized lookup fallback
  const getRowValue = (row: Record<string, any>, mappedCol?: string): string => {
    if (!row || typeof row !== 'object') return '';
    if (mappedCol && row[mappedCol] !== undefined && row[mappedCol] !== null) {
      return String(row[mappedCol]).trim();
    }
    return '';
  };

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') return;

    // Determine MFN
    let rawMfn = getRowValue(row, mapping.mfn);
    if (!rawMfn) {
      const rawTitle = getRowValue(row, mapping.title);
      const rawAuthor = getRowValue(row, mapping.author);
      if (rawTitle || rawAuthor) {
        rawMfn = `MFN-${rawTitle.slice(0, 15)}-${rawAuthor.slice(0, 10)}`.replace(/\s+/g, '_');
      } else {
        rawMfn = `MFN-ROW-${index + 1}`;
      }
    }

    // Extract copy information
    const rawBarcode = getRowValue(row, mapping.barcode);
    const barcode = rawBarcode || `${10000 + startingItemNumber + index}`;

    const rawLocation = getRowValue(row, mapping.location);
    const location = rawLocation || 'Piso 1';

    const rawCallNumber = getRowValue(row, mapping.classification);
    const publicNote = getRowValue(row, mapping.publicNote);
    const volume = getRowValue(row, mapping.volume);
    const tome = getRowValue(row, mapping.tome);

    const newCopy: ItemCopy = {
      barcode,
      location,
      callNumber: rawCallNumber,
      publicNote: publicNote || (volume || tome ? `${volume} ${tome}`.trim() : 'Lectura en sala'),
      volume: volume || undefined,
      tome: tome || undefined,
      status: 'Disponible',
    };

    if (mfnGroups.has(rawMfn)) {
      const existing = mfnGroups.get(rawMfn)!;
      // Add copy if barcode is distinct
      if (!existing.copies.some((c) => c.barcode === barcode)) {
        newCopy.copyNumber = existing.copies.length + 1;
        existing.copies.push(newCopy);
      }
    } else {
      newCopy.copyNumber = 1;
      mfnGroups.set(rawMfn, {
        baseRow: row,
        copies: [newCopy],
        originalIndex: index,
      });
    }
  });

  // Convert grouped MFN blocks into BibliographicRecords
  let currentItemNum = startingItemNumber;
  const result: BibliographicRecord[] = [];

  mfnGroups.forEach((group, mfnKey) => {
    const { baseRow, copies, originalIndex } = group;

    const rawTitle = getRowValue(baseRow, mapping.title);
    const title = rawTitle || `Registro bibliográfico #${currentItemNum}`;

    const rawAuthor = getRowValue(baseRow, mapping.author);
    const author = rawAuthor && rawAuthor.trim() ? rawAuthor.trim() : '[s.n.]';

    const rawMaterialType = getRowValue(baseRow, mapping.materialType);
    const rawClassification = getRowValue(baseRow, mapping.classification);
    const city = getRowValue(baseRow, mapping.city);
    const pages = getRowValue(baseRow, mapping.pages);
    const publisher = getRowValue(baseRow, mapping.publisher);
    const summary = getRowValue(baseRow, mapping.summary);
    let indiceVal = getRowValue(baseRow, mapping.indice) || getRowValue(baseRow, mapping.content);
    if (!indiceVal) {
      // Fallback search across all row keys for any indice, content, MARC 505, or table of contents column
      for (const k of Object.keys(baseRow)) {
        const normK = normalizeHeaderKey(k);
        if (
          ['indice', 'índice', 'contenido', 'content', 'tabla_contenido', '505', '505a', 'nota_de_contenido', 'capitulo'].some((c) =>
            normK.includes(c)
          )
        ) {
          const val = String(baseRow[k] || '').trim();
          if (val) {
            indiceVal = val;
            break;
          }
        }
      }
    }
    const content = indiceVal;
    const url = getRowValue(baseRow, mapping.url);
    const isbn = getRowValue(baseRow, mapping.isbn);
    const advisor = getRowValue(baseRow, mapping.advisor);
    const degree = getRowValue(baseRow, mapping.degree);
    const marc502 = getRowValue(baseRow, mapping.marc502);

    // Strictly map to one of the 6 official UNIFÉ material types
    const materialType: OfficialMaterialType = mapToOfficialMaterialType(
      rawMaterialType,
      rawClassification,
      rawTitle,
      degree,
      url,
      marc502
    );

    let year: number | string = '';
    const rawYear = getRowValue(baseRow, mapping.year);
    if (rawYear) {
      const numYear = parseInt(rawYear.replace(/\D/g, '').substring(0, 4), 10);
      year = !isNaN(numYear) && numYear > 1800 && numYear < 2100 ? numYear : rawYear;
    } else {
      year = 'S/A';
    }

    const classification = rawClassification || 'S/C';

    const rawDesc = getRowValue(baseRow, mapping.descriptors);
    const descriptors = normalizeDescriptorsList(rawDesc);

    const isDigital = materialType === 'Tesis digital';
    const mainBarcode = isDigital ? '' : (copies[0]?.barcode || `${10000 + currentItemNum}`);
    const mainLocation = isDigital ? 'Repositorio Digital' : (copies[0]?.location || 'Piso 1');

    result.push({
      id: `rec-${mfnKey.replace(/[^a-zA-Z0-9]/g, '_')}-${Date.now()}-${originalIndex}`,
      mfn: mfnKey.startsWith('MFN-') ? String(1000 + currentItemNum) : mfnKey,
      itemNumber: currentItemNum,
      materialType,
      title,
      author,
      year,
      city: city || undefined,
      publisher: publisher || undefined,
      pages: pages || undefined,
      classification,
      descriptors,
      barcode: mainBarcode,
      location: mainLocation,
      copies: isDigital ? undefined : copies,
      summary: summary || undefined,
      content: content || undefined,
      indice: content || undefined,
      url: url || undefined,
      isbn: isbn || undefined,
      advisor: advisor || undefined,
      degree: degree || undefined,
      marc502: marc502 || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    currentItemNum += 1;
  });

  return result;
}

/**
 * Downloads a JSON file of the bibliographic database
 */
export function downloadJsonDatabase(records: BibliographicRecord[], filename = 'catalogo_unife_database.json') {
  const jsonString = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports current records back to an Excel (.xlsx) file with grouped copies
 */
export function exportRecordsToExcel(records: BibliographicRecord[], filename = 'catalogo_unife_export.xlsx') {
  const rows: Record<string, any>[] = [];

  records.forEach((r, idx) => {
    const baseObj = {
      'MFN (Biblionumber)': r.mfn || r.itemNumber || idx + 1,
      'N°': r.itemNumber || idx + 1,
      'Tipo de Material': r.materialType,
      'Título': r.title,
      'Autor': r.author,
      'Año': r.year,
      'Ciudad': r.city || '',
      'Editorial': r.publisher || '',
      'Páginas / Extensión': r.pages || '',
      'Clasificación': r.classification,
      'Descriptores': Array.isArray(r.descriptors) ? r.descriptors.join(', ') : '',
      'INDICE': r.indice || r.content || '',
      'Resumen': r.summary || '',
      'MARC 502 (Nota de Tesis)': r.marc502 || '',
      'Código de Barras (Principal)': r.barcode,
      'Ubicación': r.location,
      'Total Ejemplares': r.materialType === 'Tesis digital' ? 'Acceso en línea' : (r.copies?.length || 1),
      'Detalle Ejemplares (Barcodes & Ubicaciones)': r.materialType === 'Tesis digital'
        ? (r.url || 'Acceso digital')
        : (r.copies
          ? r.copies.map((c) => `[Barcode: ${c.barcode} | Loc: ${c.location} | Nota: ${c.publicNote || 'S/N'}]`).join('; ')
          : `[Barcode: ${r.barcode || 'S/N'} | Loc: ${r.location || 'Piso 1'}]`),
      'Grado / Carrera': r.degree || '',
      'Asesor': r.advisor || '',
      'ISBN/ISSN': r.isbn || '',
      'Enlace / URL': r.url || '',
    };
    rows.push(baseObj);
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catálogo MFN Unificado');

  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 18),
  }));
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
}

/**
 * Creates and downloads a sample template Excel (.xlsx) ready to be filled or imported
 */
export function downloadSampleExcelTemplate() {
  const sampleRows = [
    {
      'MFN': '001042',
      'Tipo de Material': 'Tesis impresa',
      'Título': 'Relación individuo-organización: efectos de la congruencia entre necesidades individuales y oportunidades laborales en una empresa industrial de Lima Metropolitana',
      'Autor': 'Gnecco Lombardi, Diannina Amedea María',
      'Año': 1985,
      'Ciudad': 'Lima',
      'Editorial': 'UNIFÉ. Facultad de Psicología y Humanidades',
      'Páginas': '267 h.',
      'Clasificación': 'T106.58/G59',
      'Descriptores': 'EMPRESAS INDUSTRIALES, NECESIDADES, OPORTUNIDADES DE EMPLEO, PSICOLOGÍA ORGANIZACIONAL',
      'Código de Barras': '27200',
      'Ubicación': 'Piso 1',
      'Nota Pública': 'Lectura en sala',
      'Grado': 'Licenciada en Psicología',
      'Asesor': 'Dr. Morales Rivera, Carlos',
      'MARC 502': 'Tesis (Lic.) -- UNIFÉ. Facultad de Psicología y Humanidades, 1985.',
    },
    {
      'MFN': '002154',
      'Tipo de Material': 'Libro impreso',
      'Título': 'Metodología de la investigación científica: enfoques cuantitativo, cualitativo y mixto',
      'Autor': 'Hernández Sampieri, Roberto; Fernández Collado, Carlos; Baptista Lucio, Pilar',
      'Año': 2018,
      'Ciudad': 'México, D.F.',
      'Editorial': 'McGraw-Hill Interamericana',
      'Páginas': '634 p.',
      'Clasificación': 'Q180.55.M4/H47',
      'Descriptores': 'METODOLOGÍA DE LA INVESTIGACIÓN, CIENCIA, ANÁLISIS DE DATOS',
      'Código de Barras': '19402',
      'Ubicación': 'Piso 2',
      'Nota Pública': 'Lectura en sala',
      'Grado': '',
      'Asesor': '',
      'MARC 502': '',
    },
    {
      'MFN': '003290',
      'Tipo de Material': 'Referencia',
      'Título': 'Diccionario de la Real Academia Española de la Lengua',
      'Autor': 'Real Academia Española',
      'Año': 2020,
      'Ciudad': 'Madrid',
      'Editorial': 'Espasa Calpe',
      'Páginas': '2312 p.',
      'Clasificación': 'REF/PC4625/R4',
      'Descriptores': 'DICCIONARIOS, ESPAÑOL, LINGÜÍSTICA',
      'Código de Barras': '50122',
      'Ubicación': 'Piso 1',
      'Nota Pública': 'Solo consulta en sala',
      'Grado': '',
      'Asesor': '',
      'MARC 502': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla UNIFÉ MFN');
  XLSX.writeFile(workbook, 'plantilla_excel_catalogo_unife_mfn.xlsx');
}
