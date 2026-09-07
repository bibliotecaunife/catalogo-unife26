import { BibliographicRecord, SearchScope } from '../types';

/**
 * Controlled dictionary of semantic lexical families & library catalog thesaurus terms.
 * Strict category boundaries are preserved to ensure zero hallucinations.
 */
const SEMANTIC_LEXICON: Record<string, string[]> = {
  // Infancia / Niñez (strict boundary - does NOT include adolescents/youth)
  nino: ['infantil', 'ninez', 'infancia', 'pediatrico', 'menores', 'primeros anos'],
  nina: ['infantil', 'ninez', 'infancia', 'pediatrico', 'menores'],
  ninos: ['infantil', 'ninez', 'infancia', 'pediatrico', 'menores'],
  infantil: ['nino', 'nina', 'ninos', 'ninez', 'infancia', 'pediatrico'],
  ninez: ['nino', 'nina', 'ninos', 'infantil', 'infancia'],
  infancia: ['nino', 'nina', 'ninos', 'infantil', 'ninez'],

  // Adolescencia / Juventud
  adolescente: ['adolescencia', 'pubertad', 'juventud', 'jovenes'],
  adolescentes: ['adolescencia', 'pubertad', 'juventud', 'jovenes'],
  juventud: ['jovenes', 'adolescentes', 'adolescencia'],
  joven: ['juventud', 'adolescente', 'adolescentes'],

  // Tesis y Posgrado
  tesis: ['disertacion', 'grado', 'licenciatura', 'maestria', 'doctorado', 'posgrado', 'memoria', 'titulacion'],
  posgrado: ['maestria', 'doctorado', 'especializacion', 'diplomado', 'tesis'],
  grado: ['licenciatura', 'bachiller', 'maestria', 'titulo'],

  // Psicología y Comportamiento
  psicologia: ['psicologico', 'psicometria', 'psicosocial', 'conductual', 'comportamiento', 'cognitivo', 'mente', 'salud mental'],
  psicologico: ['psicologia', 'psicometria', 'conductual', 'cognitivo', 'psicosocial'],
  conducta: ['comportamiento', 'conductual', 'actitud', 'habito'],
  personalidad: ['temperamento', 'caracter', 'rasgos', 'evaluacion psicologica'],
  psicometria: ['test', 'escala', 'cuestionario', 'evaluacion', 'reactivos', 'validez', 'confiabilidad'],

  // Metodología de la Investigación
  investigacion: ['metodologia', 'cientifica', 'estudio', 'analisis', 'epistemologia', 'muestreo', 'diseno'],
  metodologia: ['investigacion', 'metodo', 'procedimiento', 'cualitativo', 'cuantitativo', 'mixto', 'tecnicas'],
  cualitativo: ['fenomenologico', 'etnografico', 'estudio de caso', 'entrevistas', 'interpretativo'],
  cuantitativo: ['estadistico', 'numerico', 'correlacional', 'experimental', 'medicion'],

  // Organización y Gestión Humana
  organizacion: ['organizacional', 'empresas', 'institucion', 'gestion', 'corporativo', 'ambiente laboral'],
  organizacional: ['organizacion', 'empresas', 'instituciones', 'clima laboral', 'cultura organizacional'],
  empresa: ['empresarial', 'organizacion', 'corporacion', 'industria', 'gestion'],
  laboral: ['trabajo', 'empleo', 'ocupacional', 'talento humano', 'recursos humanos', 'puesto'],
  empleo: ['laboral', 'trabajo', 'ocupacion', 'oportunidades laborales'],

  // Desarrollo Humano y Sostenibilidad
  desarrollo: ['sostenible', 'humano', 'social', 'crecimiento', 'sustentable', 'bienestar'],
  sostenible: ['sustentabilidad', 'ambiental', 'desarrollo sostenible', 'ecologia', 'medio ambiente'],
  social: ['sociedad', 'comunidad', 'comunitario', 'poblacion', 'vulnerable'],
  comunidad: ['comunitario', 'social', 'localidad', 'pobladores', 'vecinal'],

  // Educación y Pedagogía
  educacion: ['educativo', 'pedagogia', 'ensenanza', 'aprendizaje', 'docente', 'didactica', 'escolar', 'academico'],
  educativo: ['educacion', 'pedagogico', 'escolar', 'ensenanza', 'formativo'],
  aprendizaje: ['ensenanza', 'didactica', 'cognicion', 'adquisicion', 'estudio'],

  // Derecho y Normativa
  derecho: ['juridico', 'legal', 'leyes', 'normativa', 'jurisprudencia', 'constitucional', 'legislacion'],
  juridico: ['derecho', 'legal', 'normativo', 'jurisprudencial'],
};

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'de', 'del', 'al', 'a', 'en', 'y', 'e', 'o', 'u', 'por', 'para', 'con', 'sin',
  'sobre', 'entre', 'hacia', 'desde', 'hasta', 'que', 'se', 'su', 'sus', 'mi', 'mis',
  'este', 'esta', 'estos', 'estas', 'es', 'son', 'fue', 'fueron', 'como', 'sino'
]);

/**
 * Normalize string (lowercase, strip diacritics, remove punctuation)
 */
export function normalizeText(str: string = ''): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean alphanumeric codes (removes spaces, slashes, dots, hyphens)
 * E.g., "189/A31Z9/T.13" -> "189A31Z9T13"
 */
export function cleanCode(str: string = ''): string {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalize numeric codes (MFN, Barcode) without leading zeros
 * E.g. "000483" -> "483"
 */
export function normalizeNumericCode(str: string = ''): string {
  const digits = String(str || '').replace(/\D/g, '');
  if (!digits) return '';
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? digits : String(parsed);
}

/**
 * Extract tokens and semantic expansions for a search term
 */
export function getSearchTokens(queryString: string): {
  exactTokens: string[];
  semanticTokens: string[];
  significantWords: string[];
} {
  const normalized = normalizeText(queryString);
  if (!normalized) {
    return { exactTokens: [], semanticTokens: [], significantWords: [] };
  }

  const allWords = normalized.split(' ').filter(Boolean);
  const significantWords = allWords.filter((w) => !STOP_WORDS.has(w) && (w.length >= 2 || /^\d+$/.test(w)));

  const exactSet = new Set<string>();
  const semanticSet = new Set<string>();

  // Full phrase as exact match token
  if (allWords.length > 1) {
    exactSet.add(normalized);
  }

  // Add individual significant words
  significantWords.forEach((word) => {
    exactSet.add(word);

    // Check direct lexical dictionary match
    if (SEMANTIC_LEXICON[word]) {
      SEMANTIC_LEXICON[word].forEach((syn) => {
        const normSyn = normalizeText(syn);
        if (!exactSet.has(normSyn)) {
          semanticSet.add(normSyn);
        }
      });
    }

    // Check prefix / root matching in dictionary keys
    Object.keys(SEMANTIC_LEXICON).forEach((dictKey) => {
      if (word.startsWith(dictKey) || dictKey.startsWith(word)) {
        SEMANTIC_LEXICON[dictKey].forEach((syn) => {
          const normSyn = normalizeText(syn);
          if (!exactSet.has(normSyn)) {
            semanticSet.add(normSyn);
          }
        });
      }
    });
  });

  return {
    exactTokens: Array.from(exactSet),
    semanticTokens: Array.from(semanticSet),
    significantWords: significantWords.length > 0 ? significantWords : allWords,
  };
}

export interface CompiledSearchQuery {
  rawQuery: string;
  normQuery: string;
  cleanedQueryCode: string;
  isPureNumber: boolean;
  queryNumCode: string;
  exactTokens: string[];
  semanticTokens: string[];
  significantWords: string[];
  scope: SearchScope;
}

export function compileSearchQuery(queryString: string, scope: SearchScope = 'general'): CompiledSearchQuery {
  const rawQuery = queryString.trim();
  const normQuery = normalizeText(rawQuery);
  const cleanedQueryCode = cleanCode(rawQuery);
  const isPureNumber = /^\d+$/.test(rawQuery.replace(/\s+/g, ''));
  const queryNumCode = isPureNumber ? normalizeNumericCode(rawQuery) : '';
  const { exactTokens, semanticTokens, significantWords } = getSearchTokens(rawQuery);

  return {
    rawQuery,
    normQuery,
    cleanedQueryCode,
    isPureNumber,
    queryNumCode,
    exactTokens,
    semanticTokens,
    significantWords,
    scope,
  };
}

export interface SearchMatchResult {
  record: BibliographicRecord;
  isMatch: boolean;
  score: number;
  exactTerms: string[];
  semanticTerms: string[];
  matchedFields: string[];
}

/**
 * High-speed Compiled Evaluation for Bibliographic Search
 */
export function evaluateRecordSearchCompiled(
  record: BibliographicRecord,
  compiled: CompiledSearchQuery
): SearchMatchResult {
  const { rawQuery, normQuery, cleanedQueryCode, isPureNumber, queryNumCode, exactTokens, semanticTokens, significantWords, scope } = compiled;

  if (!rawQuery) {
    return {
      record,
      isMatch: true,
      score: 1,
      exactTerms: [],
      semanticTerms: [],
      matchedFields: [],
    };
  }

  let totalScore = 0;
  const foundExactTerms = new Set<string>();
  const foundSemanticTerms = new Set<string>();
  const matchedFields = new Set<string>();

  // Collect all barcodes for this record
  const recordBarcodes: string[] = [];
  if (record.barcode) recordBarcodes.push(String(record.barcode).trim());
  if (record.copies) {
    record.copies.forEach((c) => {
      if (c.barcode) recordBarcodes.push(String(c.barcode).trim());
    });
  }

  // Collect all classification/call numbers for this record
  const recordClassifications: string[] = [];
  if (record.classification) recordClassifications.push(record.classification.trim());
  if (record.copies) {
    record.copies.forEach((c) => {
      if (c.callNumber) recordClassifications.push(c.callNumber.trim());
    });
  }

  // -------------------------------------------------------------
  // 0. YEAR OF PUBLICATION MATCH (Scope 'year' or Year query)
  // -------------------------------------------------------------
  const recordYearStr = String(record.year || '').trim();
  const queryYearMatch = rawQuery.match(/\b(19\d{2}|20\d{2})\b/);
  const targetYearQuery = queryYearMatch ? queryYearMatch[0] : (isPureNumber ? rawQuery : '');

  if (recordYearStr && (scope === 'general' || scope === 'year')) {
    const rawLower = rawQuery.toLowerCase().trim();
    const isExactYearMatch =
      (targetYearQuery && recordYearStr === targetYearQuery) ||
      (targetYearQuery && recordYearStr.includes(targetYearQuery)) ||
      recordYearStr.toLowerCase() === rawLower ||
      (rawLower.length >= 4 && recordYearStr.includes(rawLower));

    if (isExactYearMatch) {
      totalScore += scope === 'year' ? 25000 : 5000;
      foundExactTerms.add(targetYearQuery || recordYearStr);
      matchedFields.add('year');
    }
  }

  // -------------------------------------------------------------
  // 1. EXACT MFN MATCH (Top Priority)
  // -------------------------------------------------------------
  if (record.mfn && (scope === 'general' || scope === 'mfn')) {
    const recMfnRaw = String(record.mfn).trim();
    const recMfnNum = normalizeNumericCode(recMfnRaw);

    if (queryNumCode && recMfnNum === queryNumCode) {
      totalScore += 10000;
      foundExactTerms.add(rawQuery);
      matchedFields.add('mfn');
    } else if (recMfnRaw.toLowerCase() === rawQuery.toLowerCase()) {
      totalScore += 10000;
      foundExactTerms.add(rawQuery);
      matchedFields.add('mfn');
    }
  }

  // -------------------------------------------------------------
  // 2. EXACT BARCODE MATCH
  // -------------------------------------------------------------
  if (recordBarcodes.length > 0 && (scope === 'general' || scope === 'barcode')) {
    const isExactBarcode = recordBarcodes.some((bc) => {
      if (queryNumCode) {
        return normalizeNumericCode(bc) === queryNumCode;
      }
      return cleanCode(bc) === cleanedQueryCode;
    });

    if (isExactBarcode) {
      totalScore += 10000;
      foundExactTerms.add(rawQuery);
      matchedFields.add('barcode');
    }
  }

  // -------------------------------------------------------------
  // 3. EXACT & ALTERNATIVE CLASSIFICATION MATCH (Matched as a whole unit)
  // -------------------------------------------------------------
  if (recordClassifications.length > 0 && (scope === 'general' || scope === 'classification')) {
    let exactClassMatch = false;
    let altClassMatch = false;

    // Classification prefix for alternative fallback (e.g. "155.5/R" from "155.5/R24D" or "712/" from "712/O68")
    const slashPos = rawQuery.indexOf('/');
    const classPrefixRaw = slashPos !== -1 ? rawQuery.substring(0, slashPos + 2).toLowerCase().trim() : '';
    const classCleanPrefix = cleanedQueryCode.length >= 4 ? cleanedQueryCode.substring(0, 5) : '';

    const zeroOQuery = cleanedQueryCode.replace(/O/g, '0');

    recordClassifications.forEach((cl) => {
      const clClean = cleanCode(cl);
      const queryClean = cleanedQueryCode;
      const clNorm = normalizeText(cl);
      const queryNorm = normQuery;
      const rawLower = rawQuery.toLowerCase().trim();
      const clRawLower = cl.toLowerCase().trim();
      const clZeroO = clClean.replace(/O/g, '0');

      if (!queryClean && !rawLower) return;

      // 1. EXACT CLASSIFICATION MATCH (Matched as a whole unit, e.g. 155.5/R24D, 712/O68)
      if (
        clClean === queryClean ||
        clZeroO === zeroOQuery ||
        clRawLower === rawLower ||
        clNorm === queryNorm
      ) {
        exactClassMatch = true;
        return;
      }

      // 2. ALTERNATIVE / PREFIX CLASSIFICATION MATCH (e.g. 155.5/R or 155.5 or 712/)
      if (
        (queryClean.length >= 2 && clClean.startsWith(queryClean)) ||
        (zeroOQuery.length >= 2 && clZeroO.startsWith(zeroOQuery)) ||
        (classCleanPrefix.length >= 3 && clClean.startsWith(classCleanPrefix)) ||
        (classPrefixRaw.length >= 3 && clRawLower.startsWith(classPrefixRaw)) ||
        (rawLower.length >= 2 && clRawLower.startsWith(rawLower))
      ) {
        altClassMatch = true;
      }
    });

    if (exactClassMatch) {
      totalScore += 50000;
      foundExactTerms.add(rawQuery);
      recordClassifications.forEach((c) => {
        if (c) foundExactTerms.add(c);
      });
      matchedFields.add('classification_exact');
      matchedFields.add('classification');
    } else if (altClassMatch) {
      totalScore += 8000;
      foundExactTerms.add(rawQuery);
      if (classPrefixRaw) foundExactTerms.add(classPrefixRaw);
      matchedFields.add('classification_alternative');
      matchedFields.add('classification');
    }
  }

  const normTitle = normalizeText(record.title || '');
  const normDescriptors = Array.isArray(record.descriptors) ? normalizeText(record.descriptors.join(' ')) : '';
  const normAuthor = normalizeText(`${record.author || ''} ${record.advisor || ''}`);
  const normAll = `${normTitle} ${normDescriptors} ${normAuthor} ${normalizeText(record.summary || '')} ${normalizeText(record.content || '')}`;

  // -------------------------------------------------------------
  // 4. MULTI-TERM UNORDERED TITLE & DESCRIPTOR MATCHING
  // e.g. "paisaje naturaleza" matches "Naturaleza y paisaje en..."
  // -------------------------------------------------------------
  if (significantWords.length >= 2) {
    const allInTitle = significantWords.every((w) => normTitle.includes(w));
    if (allInTitle && (scope === 'general' || scope === 'title')) {
      totalScore += 9000;
      significantWords.forEach((w) => foundExactTerms.add(w));
      matchedFields.add('title');
    }

    const allInDescriptors = significantWords.every((w) => normDescriptors.includes(w));
    if (allInDescriptors && (scope === 'general' || scope === 'descriptors')) {
      totalScore += 7500;
      significantWords.forEach((w) => foundExactTerms.add(w));
      matchedFields.add('descriptors');
    }

    const allInRecord = significantWords.every((w) => normAll.includes(w));
    if (allInRecord && scope === 'general') {
      totalScore += 6000;
      significantWords.forEach((w) => {
        if (normAll.includes(w)) foundExactTerms.add(w);
      });
    }
  }

  // -------------------------------------------------------------
  // 5. EXACT PHRASE MATCHES
  // -------------------------------------------------------------
  if (record.descriptors && record.descriptors.length > 0 && (scope === 'general' || scope === 'descriptors')) {
    record.descriptors.forEach((desc) => {
      const normDesc = normalizeText(desc);
      if (normDesc === normQuery) {
        totalScore += 6500;
        foundExactTerms.add(desc);
        matchedFields.add('descriptors');
      } else if (normDesc.includes(normQuery) && normQuery.length >= 4) {
        totalScore += 4500;
        foundExactTerms.add(normQuery);
        matchedFields.add('descriptors');
      }
    });
  }

  if (record.title && (scope === 'general' || scope === 'title')) {
    if (normTitle === normQuery) {
      totalScore += 9500;
      foundExactTerms.add(record.title);
      matchedFields.add('title');
    } else if (normTitle.includes(normQuery) && normQuery.length >= 4) {
      totalScore += 7000;
      foundExactTerms.add(normQuery);
      matchedFields.add('title');
    }
  }

  // -------------------------------------------------------------
  // 6. MULTI-FIELD TOKEN & SEMANTIC EVALUATION
  // -------------------------------------------------------------
  const searchableBuckets: { name: string; normText: string; weight: number }[] = [];

  if (scope === 'general' || scope === 'title') {
    searchableBuckets.push({ name: 'title', normText: normTitle, weight: 60 });
  }
  if (scope === 'general' || scope === 'descriptors') {
    searchableBuckets.push({ name: 'descriptors', normText: normDescriptors, weight: 55 });
  }
  if (scope === 'general' || scope === 'author') {
    searchableBuckets.push({ name: 'author', normText: normAuthor, weight: 45 });
  }
  if (scope === 'general') {
    searchableBuckets.push({
      name: 'classification',
      normText: normalizeText(recordClassifications.join(' ')),
      weight: 40,
    });
    searchableBuckets.push({ name: 'marc502', normText: normalizeText(record.marc502 || ''), weight: 25 });
    searchableBuckets.push({ name: 'summary', normText: normalizeText(record.summary || ''), weight: 20 });
    searchableBuckets.push({ name: 'publisher', normText: normalizeText(record.publisher || ''), weight: 15 });
  }

  let matchedSigWordCount = 0;
  const matchedSigWordsSet = new Set<string>();

  searchableBuckets.forEach(({ name, normText, weight }) => {
    if (!normText) return;

    exactTokens.forEach((token) => {
      if (normText.includes(token)) {
        foundExactTerms.add(token);
        matchedFields.add(name);
        totalScore += weight * 2;
      }
    });

    semanticTokens.forEach((semToken) => {
      if (normText.includes(semToken)) {
        foundSemanticTerms.add(semToken);
        matchedFields.add(name);
        totalScore += weight * 1.2;
      }
    });

    significantWords.forEach((word) => {
      if (normText.includes(word)) {
        matchedSigWordsSet.add(word);
      }
    });
  });

  matchedSigWordCount = matchedSigWordsSet.size;

  // -------------------------------------------------------------
  // 7. MATCH CRITERIA DECISION
  // -------------------------------------------------------------
  let isMatch = false;

  if (scope === 'classification') {
    isMatch = matchedFields.has('classification');
  } else if (scope === 'barcode') {
    isMatch = matchedFields.has('barcode');
  } else if (scope === 'mfn') {
    isMatch = matchedFields.has('mfn');
  } else if (scope === 'title') {
    isMatch = matchedFields.has('title');
  } else if (scope === 'author') {
    isMatch = matchedFields.has('author');
  } else if (scope === 'descriptors') {
    isMatch = matchedFields.has('descriptors');
  } else if (scope === 'year') {
    isMatch = matchedFields.has('year');
  } else {
    // General search across all fields
    if (
      matchedFields.has('mfn') ||
      matchedFields.has('barcode') ||
      matchedFields.has('classification') ||
      matchedFields.has('year') ||
      totalScore >= 3000
    ) {
      isMatch = true;
    } else if (significantWords.length <= 1) {
      isMatch = foundExactTerms.size > 0 || foundSemanticTerms.size > 0;
    } else {
      const coverage = matchedSigWordCount / significantWords.length;
      isMatch = coverage >= 0.5 || foundExactTerms.has(normQuery) || totalScore >= 200;
    }

    if (isPureNumber && !matchedFields.has('mfn') && !matchedFields.has('barcode') && !matchedFields.has('classification') && !matchedFields.has('year')) {
      if (totalScore < 1000) {
        isMatch = false;
      }
    }
  }

  return {
    record,
    isMatch,
    score: totalScore,
    exactTerms: Array.from(foundExactTerms),
    semanticTerms: Array.from(foundSemanticTerms),
    matchedFields: Array.from(matchedFields),
  };
}

/**
 * Backward compatibility wrapper
 */
export function evaluateRecordSearch(
  record: BibliographicRecord,
  queryString: string,
  scope: SearchScope = 'general'
): SearchMatchResult {
  const compiled = compileSearchQuery(queryString, scope);
  return evaluateRecordSearchCompiled(record, compiled);
}

/**
 * Text segment for precise dual-color highlighting:
 * - [Amarillo claro / Yellow]: Exact match
 * - [Celeste / Sky]: Semantic / Synonym match
 */
export interface HighlightSegment {
  text: string;
  type: 'exact' | 'semantic' | 'normal';
}

const highlightCache = new Map<string, HighlightSegment[]>();
const MAX_CACHE_SIZE = 500;

export function computeHighlightSegments(
  text: string,
  exactTerms: string[],
  semanticTerms: string[]
): HighlightSegment[] {
  if (!text || (exactTerms.length === 0 && semanticTerms.length === 0)) {
    return [{ text, type: 'normal' }];
  }

  const cacheKey = `${text}_e:${exactTerms.join(',')}_s:${semanticTerms.join(',')}`;
  const cached = highlightCache.get(cacheKey);
  if (cached) return cached;

  const rawExactTerms = exactTerms
    .map((t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
    .filter(Boolean);
  const cleanExact = exactTerms.map(normalizeText).filter(Boolean);
  const cleanSemantic = semanticTerms.map(normalizeText).filter(Boolean);

  const termSet = new Set<string>();
  const allTerms: { term: string; type: 'exact' | 'semantic' }[] = [];

  [...rawExactTerms, ...cleanExact].forEach((t) => {
    if (t && !termSet.has(t)) {
      termSet.add(t);
      allTerms.push({ term: t, type: 'exact' });
    }
  });

  cleanSemantic.forEach((t) => {
    if (t && !termSet.has(t)) {
      termSet.add(t);
      allTerms.push({ term: t, type: 'semantic' });
    }
  });

  allTerms.sort((a, b) => b.term.length - a.term.length);

  if (allTerms.length === 0) {
    return [{ text, type: 'normal' }];
  }

  const normOriginal = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const intervals: { start: number; end: number; type: 'exact' | 'semantic' }[] = [];

  allTerms.forEach(({ term, type }) => {
    let pos = 0;
    const lowerNorm = normOriginal.toLowerCase();
    while ((pos = lowerNorm.indexOf(term, pos)) !== -1) {
      const end = pos + term.length;
      const overlaps = intervals.some(
        (inv) => (pos >= inv.start && pos < inv.end) || (end > inv.start && end <= inv.end)
      );
      if (!overlaps) {
        intervals.push({ start: pos, end, type });
      }
      pos += 1;
    }
  });

  if (intervals.length === 0) {
    const result = [{ text, type: 'normal' as const }];
    if (highlightCache.size > MAX_CACHE_SIZE) highlightCache.clear();
    highlightCache.set(cacheKey, result);
    return result;
  }

  intervals.sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let currentIndex = 0;

  intervals.forEach((inv) => {
    if (inv.start > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, inv.start),
        type: 'normal',
      });
    }
    segments.push({
      text: text.slice(inv.start, inv.end),
      type: inv.type,
    });
    currentIndex = inv.end;
  });

  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      type: 'normal',
    });
  }

  if (highlightCache.size > MAX_CACHE_SIZE) highlightCache.clear();
  highlightCache.set(cacheKey, segments);

  return segments;
}

