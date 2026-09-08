/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import catalogoUrl from './data/catalogo_unife_52261_registros.json.gz?url';
const [records, setRecords] = useState<BibliographicRecord[]>([]);
import {
  BibliographicRecord,
  DEFAULT_MATERIAL_TYPES,
  OFFICIAL_MATERIAL_TYPES,
  SearchScope,
} from './types';
import { Header } from './components/Header';
import { MaterialFilterTabs } from './components/MaterialFilterTabs';
import { SearchBar } from './components/SearchBar';
import { CatalogCard } from './components/CatalogCard';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { JsonDatabaseModal } from './components/JsonDatabaseModal';
import { RecordModal } from './components/RecordModal';
import { SingleRecordJsonModal } from './components/SingleRecordJsonModal';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import {
  downloadJsonDatabase,
  exportRecordsToExcel,
  downloadSampleExcelTemplate,
  mapToOfficialMaterialType,
} from './utils/excelParser';
import {
  compileSearchQuery,
  evaluateRecordSearchCompiled,
  evaluateRecordSearch,
  SearchMatchResult,
} from './utils/searchEngine';
import {
  loadRecordsFromStorage,
  saveRecordsToStorage,
  cleanupLegacyLocalStorage,
} from './utils/storageDb';
import {
  Search,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Layers,
  Database,
  Lightbulb,
  AlertCircle,
  CheckSquare,
  Square,
  Check,
  Download,
  Trash2,
  Upload,
} from 'lucide-react';

const ITEMS_PER_PAGE_DEFAULT = 40;

export default function App() {
  const [records, setRecords] = useState<BibliographicRecord[]>(INITIAL_BIBLIOGRAPHIC_DATA);
  const [isStorageLoaded, setIsStorageLoaded] = useState<boolean>(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);

  // Responsive device check: 40 on desktop/PC, 10 on mobile
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 10 : ITEMS_PER_PAGE_DEFAULT;

  // Load records from IndexedDB or GZ on initial mount
  useEffect(() => {
    let isMounted = true;
    cleanupLegacyLocalStorage();
    
    async function initData() {
      try {
        const loaded = await loadRecordsFromStorage();
        if (isMounted && loaded && loaded.length > 100) {
          setRecords(loaded);
          setIsStorageLoaded(true);
          return;
        }

        // Extraer datos del archivo .gz comprimido si no hay base completa guardada
        try {
          const response = await fetch(catalogoUrl);
          if (response.ok) {
            const responseClone = response.clone();
            let datosJson: BibliographicRecord[] | null = null;
            try {
              const stream = response.body!.pipeThrough(new DecompressionStream('gzip'));
              const texto = await new Response(stream).text();
              datosJson = JSON.parse(texto);
            } catch {
              // Si el navegador/servidor ya descomprimió la respuesta o falló la descompresión
              try {
                datosJson = await responseClone.json();
              } catch {
                const textoAlt = await responseClone.text();
                datosJson = JSON.parse(textoAlt);
              }
            }

            if (isMounted && datosJson && Array.isArray(datosJson) && datosJson.length > 0) {
              setRecords(datosJson);
              setIsStorageLoaded(true);
              return;
            }
          }
        } catch (fetchErr: any) {
          if (fetchErr?.name !== 'AbortError') {
            console.warn('No se pudo extraer el archivo .gz de catálogo, usando datos precargados:', fetchErr);
          }
        }

        if (isMounted) {
          if (loaded && loaded.length > 0) {
            setRecords(loaded);
          }
          setIsStorageLoaded(true);
        }
      } catch (err: any) {
        if (isMounted && err?.name !== 'AbortError') {
          console.warn('Aviso al cargar datos iniciales:', err);
        }
        if (isMounted) {
          setIsStorageLoaded(true);
        }
      }
    }
    
    initData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Save to IndexedDB whenever records change after initial load
  useEffect(() => {
    if (isStorageLoaded) {
      saveRecordsToStorage(records).catch((err) => {
        console.error('Error persisting bibliographic records to IndexedDB:', err);
      });
    }
  }, [records, isStorageLoaded]);

  // Filtering and Search States
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchScope, setSearchScope] = useState<SearchScope>('general');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedDescriptor, setSelectedDescriptor] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isSingleJsonModalOpen, setIsSingleJsonModalOpen] = useState<boolean>(false);
  const [recordToEdit, setRecordToEdit] = useState<BibliographicRecord | null>(null);
  const [recordToViewJson, setRecordToViewJson] = useState<BibliographicRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Ensure active records strictly map to the 6 official types
  const activeRecords = useMemo(() => {
    return records.map((r) => {
      const strictType = mapToOfficialMaterialType(r.materialType, r.classification, r.title, r.degree, r.url, r.marc502);
      if (r.materialType !== strictType) {
        return { ...r, materialType: strictType };
      }
      return r;
    });
  }, [records]);

  // The 6 official item types strictly defined as tabs and active filters
  const availableCategories = useMemo(() => {
    return Array.from(DEFAULT_MATERIAL_TYPES);
  }, []);

  // Count items per official category strictly
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: activeRecords.length, Todos: activeRecords.length };
    OFFICIAL_MATERIAL_TYPES.forEach((type) => {
      counts[type] = 0;
    });
    activeRecords.forEach((r) => {
      const type = r.materialType;
      if (counts[type] !== undefined) {
        counts[type] += 1;
      }
    });
    return counts;
  }, [activeRecords]);

  // Available unique years for filter dropdowns strictly 2026 to 2016
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = 2026; y >= 2016; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // Total physical copies count across all records
  const totalCopiesCount = useMemo(() => {
    return activeRecords.reduce((acc, r) => acc + (r.copies?.length || 1), 0);
  }, [activeRecords]);

  // Deferred search term to guarantee 100% lag-free typing in input
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // High-performance search & compiled query evaluation
  const compiledQuery = useMemo(() => {
    return compileSearchQuery(deferredSearchTerm, searchScope);
  }, [deferredSearchTerm, searchScope]);

  // Evaluated and filtered records
  const searchEvaluatedRecords = useMemo(() => {
    const isCategoryTodos = selectedCategory.toUpperCase() === 'TODOS';

    return activeRecords
      .map((rec): SearchMatchResult | null => {
        // 1. Material Type filter
        if (!isCategoryTodos && rec.materialType !== selectedCategory) {
          return null;
        }

        // 2. Year filter
        if (selectedYear && String(rec.year) !== String(selectedYear)) {
          return null;
        }

        // 3. Descriptor tag filter
        if (selectedDescriptor) {
          const normDesc = selectedDescriptor.toLowerCase().trim();
          const hasDesc = rec.descriptors?.some(
            (d) => d.toLowerCase().trim() === normDesc
          );
          if (!hasDesc) return null;
        }

        // 4. Intelligent Semantic Search Evaluation (ultra-fast compiled)
        const evalResult = evaluateRecordSearchCompiled(rec, compiledQuery);
        if (!evalResult.isMatch) {
          return null;
        }

        return evalResult;
      })
      .filter((res): res is SearchMatchResult => res !== null);
  }, [
    activeRecords,
    selectedCategory,
    compiledQuery,
    selectedYear,
    selectedDescriptor,
  ]);

  // Automatic cross-category detection when user searches on a specific tab with 0 results
  // but matches exist in other categories (e.g. searching "NATURALEZA Y PAISAJE" in 'Libro Posgrado')
  const crossCategoryMatches = useMemo(() => {
    const query = deferredSearchTerm.trim();
    const isCategoryTodos = selectedCategory.toUpperCase() === 'TODOS';
    if (!query || isCategoryTodos || searchEvaluatedRecords.length > 0) {
      return [];
    }

    return activeRecords
      .filter((rec) => {
        if (selectedYear && String(rec.year) !== String(selectedYear)) return false;
        if (selectedDescriptor) {
          const normDesc = selectedDescriptor.toLowerCase().trim();
          if (!rec.descriptors?.some((d) => d.toLowerCase().trim() === normDesc)) return false;
        }
        const evalRes = evaluateRecordSearchCompiled(rec, compiledQuery);
        return evalRes.isMatch;
      })
      .map((rec) => ({
        record: rec,
        evalRes: evaluateRecordSearchCompiled(rec, compiledQuery),
      }))
      .sort((a, b) => b.evalRes.score - a.evalRes.score);
  }, [
    activeRecords,
    deferredSearchTerm,
    selectedCategory,
    searchEvaluatedRecords.length,
    selectedYear,
    selectedDescriptor,
    compiledQuery,
  ]);

  const bestCrossCategoryMatch = crossCategoryMatches.length > 0 ? crossCategoryMatches[0].record : null;

  // Sort search results:
  // TODA BÚSQUEDA Y LISTADO SE ORDENA POR EL AÑO MÁS RECIENTE (2026, 2025, 2024...)
  const sortedSearchResults = useMemo(() => {
    const list = [...searchEvaluatedRecords];

    if (sortBy === 'year-asc') {
      return list.sort((a, b) => {
        const yearA = Number(a.record.year || 0);
        const yearB = Number(b.record.year || 0);
        if (yearA !== yearB) return yearA - yearB;
        return (a.record.itemNumber || 0) - (b.record.itemNumber || 0);
      });
    }

    // Default & 'year-desc': Siempre ordenar desde el año más reciente de forma descendente (priorizando coincidencias exactas)
    return list.sort((a, b) => {
      const isExactA = a.score >= 10000;
      const isExactB = b.score >= 10000;
      if (isExactA && !isExactB) return -1;
      if (!isExactA && isExactB) return 1;

      const yearA = Number(a.record.year || 0);
      const yearB = Number(b.record.year || 0);
      if (yearB !== yearA) return yearB - yearA;
      if (b.score !== a.score) return b.score - a.score;
      return (a.record.itemNumber || 0) - (b.record.itemNumber || 0);
    });
  }, [searchEvaluatedRecords, sortBy]);

  // Check if classification search yielded only alternative (prefix/fallback) results
  const isClassificationQuery =
    searchScope === 'classification' ||
    (deferredSearchTerm.includes('/') && /\d/.test(deferredSearchTerm));

  const hasExactClassificationMatch = sortedSearchResults.some((r) =>
    r.matchedFields.includes('classification_exact')
  );

  const hasOnlyAlternativeClassificationMatches =
    isClassificationQuery &&
    deferredSearchTerm.trim().length > 0 &&
    sortedSearchResults.length > 0 &&
    !hasExactClassificationMatch &&
    sortedSearchResults.some((r) =>
      r.matchedFields.includes('classification_alternative')
    );

  const classificationPrefixUsed = useMemo(() => {
    const query = deferredSearchTerm.trim();
    const slashIdx = query.indexOf('/');
    if (slashIdx !== -1) {
      return query.substring(0, slashIdx + 2);
    }
    return query;
  }, [deferredSearchTerm]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedCategory,
    selectedYear,
    selectedDescriptor,
    sortBy,
    itemsPerPage,
  ]);

  // Pagination calculations: 40 on PC, 10 on mobile
  const totalPages = Math.ceil(sortedSearchResults.length / itemsPerPage) || 1;
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedSearchResults.slice(start, start + itemsPerPage);
  }, [sortedSearchResults, currentPage, itemsPerPage]);

  // Handlers for Database Operations
  const handleImportExcelRecords = (newRecords: BibliographicRecord[], replaceMode: boolean) => {
    // Normalize all incoming records strictly into the 6 official types
    const cleanRecords = newRecords.map((r) => ({
      ...r,
      materialType: mapToOfficialMaterialType(r.materialType, r.classification, r.title),
    }));

    if (replaceMode) {
      setRecords(cleanRecords);
    } else {
      // Accumulate & merge: keep all existing records, update matches by MFN or append new ones
      setRecords((prev) => {
        const existingMap = new Map<string, BibliographicRecord>();
        prev.forEach((r) => {
          const key = String(r.mfn || r.id).trim();
          existingMap.set(key, r);
        });

        cleanRecords.forEach((nr) => {
          const key = String(nr.mfn || nr.id).trim();
          if (existingMap.has(key)) {
            const existing = existingMap.get(key)!;
            // Merge copies without duplicate barcodes
            const mergedCopies = [...(existing.copies || [])];
            (nr.copies || []).forEach((c) => {
              if (!mergedCopies.some((mc) => mc.barcode === c.barcode)) {
                mergedCopies.push(c);
              }
            });
            existingMap.set(key, {
              ...existing,
              ...nr,
              copies: mergedCopies.length > 0 ? mergedCopies : nr.copies,
              updatedAt: new Date().toISOString(),
            });
          } else {
            existingMap.set(key, nr);
          }
        });

        return Array.from(existingMap.values());
      });
    }

    setNotification(`¡Importación exitosa! Se procesaron ${cleanRecords.length} registros bibliográficos.`);
    setTimeout(() => setNotification(null), 6000);
  };

  const handleSaveJsonDatabase = (updatedRecords: BibliographicRecord[]) => {
    const cleanRecords = updatedRecords.map((r) => ({
      ...r,
      materialType: mapToOfficialMaterialType(r.materialType, r.classification, r.title),
    }));
    setRecords(cleanRecords);
  };

  const handleSaveSingleRecord = (record: BibliographicRecord) => {
    setRecords((prev) => {
      const existsIndex = prev.findIndex((r) => r.id === record.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = record;
        return next;
      } else {
        return [...prev, record];
      }
    });
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este registro bibliográfico MFN?')) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleOpenEdit = (rec: BibliographicRecord) => {
    setRecordToEdit(rec);
    setIsRecordModalOpen(true);
  };

  const handleOpenNew = () => {
    setRecordToEdit(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenViewSingleJson = (rec: BibliographicRecord) => {
    setRecordToViewJson(rec);
    setIsSingleJsonModalOpen(true);
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectCurrentPage = () => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      const allInPageSelected = paginatedResults.length > 0 && paginatedResults.every((r) => next.has(r.record.id));
      if (allInPageSelected) {
        paginatedResults.forEach((r) => next.delete(r.record.id));
      } else {
        paginatedResults.forEach((r) => next.add(r.record.id));
      }
      return next;
    });
  };

  const handleSelectAllResults = () => {
    setSelectedRecordIds(new Set(sortedSearchResults.map((r) => r.record.id)));
  };

  const handleClearSelection = () => {
    setSelectedRecordIds(new Set());
  };

  const handleExportToExcel = () => {
    const isExportingSelected = selectedRecordIds.size > 0;
    const recordsToExport = isExportingSelected
      ? activeRecords.filter((r) => selectedRecordIds.has(r.id))
      : sortedSearchResults.map((r) => r.record);

    if (recordsToExport.length === 0) {
      alert('No hay títulos para exportar a Excel.');
      return;
    }

    const filename = isExportingSelected
      ? `catalogo_unife_seleccion_${selectedRecordIds.size}_titulos.xlsx`
      : `catalogo_unife_export_${sortedSearchResults.length}_titulos.xlsx`;

    exportRecordsToExcel(recordsToExport, filename);
  };

  const handleDownloadFullBackup = () => {
    downloadJsonDatabase(activeRecords, 'catalogo_bibliografico_unife_2_backup.json');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('TODOS');
    setSelectedYear('');
    setSelectedDescriptor('');
    setSortBy('default');
  };

  const isFiltered = Boolean(
    searchTerm ||
    selectedCategory.toUpperCase() !== 'TODOS' ||
    selectedYear ||
    selectedDescriptor ||
    sortBy !== 'default'
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900 relative">
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-[#00a651] text-white px-5 py-3 rounded-xl shadow-2xl font-semibold flex items-center gap-3 animate-bounce border border-emerald-300">
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-white/80 hover:text-white font-bold text-lg leading-none ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* 1. Header with UNIFÉ seal and title */}
      <Header
        totalRecords={activeRecords.length}
      />

      {/* 2. Material Categories Filter Carousel (Excluding Libro Digital & Revista Impresa) */}
      <MaterialFilterTabs
        categories={availableCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
      />

      {/* 3. Search Bar with Elasticsearch scope and legend */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchScope={searchScope}
        onScopeChange={setSearchScope}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        availableYears={availableYears}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* 4. Active descriptor filter alert (if clicked) */}
      {selectedDescriptor && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>
              Filtrando por descriptor: <strong className="uppercase font-bold">{selectedDescriptor}</strong>
            </span>
            <button
              onClick={() => setSelectedDescriptor('')}
              className="text-amber-800 hover:text-red-700 font-semibold underline cursor-pointer"
            >
              Quitar filtro de descriptor
            </button>
          </div>
        </div>
      )}

      {/* 5. Main Content Area (Centrado en web y con ancho óptimo) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Results Counter Banner & Selection Toolbar matching UNIFÉ UI */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] sm:text-sm text-gray-700 pb-1">
          <div className="flex items-center gap-2">
            <span className="font-normal text-gray-700">
              Se {sortedSearchResults.length === 1 ? 'encontró' : 'encontraron'}{' '}
              <strong className="text-gray-900 font-bold">
                {sortedSearchResults.length} {sortedSearchResults.length === 1 ? 'resultado' : 'resultados'}
              </strong>
              <span className="text-[10px] sm:text-xs text-gray-500 font-normal ml-1">
                ({totalCopiesCount} ejemplares físicos en total)
              </span>
            </span>
            {selectedCategory.toUpperCase() !== 'TODOS' && (
              <span className="bg-[#00a651] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {selectedCategory}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              Mostrando página {currentPage} de {totalPages} ({paginatedResults.length} en pantalla • {itemsPerPage}/pág)
            </span>
          </div>
        </div>

        {/* Selection & Export to Excel Toolbar */}
        <div className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-[11px] sm:text-[13px]">
            <button
              onClick={handleSelectCurrentPage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 hover:border-[#00a651] hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors cursor-pointer select-none text-[11px] sm:text-[13px]"
              title="Seleccionar o deseleccionar los títulos de esta página para exportar a Excel"
            >
              {paginatedResults.length > 0 && paginatedResults.every((r) => selectedRecordIds.has(r.record.id)) ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#00a651]" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span>Seleccionar página ({paginatedResults.length})</span>
            </button>

            {sortedSearchResults.length > paginatedResults.length && (
              <button
                onClick={handleSelectAllResults}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 hover:border-[#00a651] hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 font-medium transition-colors cursor-pointer select-none text-[11px] sm:text-[13px]"
                title="Seleccionar todos los resultados para exportar a Excel"
              >
                <CheckSquare className="w-3.5 h-3.5 text-[#00a651]" />
                <span>Seleccionar todos ({sortedSearchResults.length})</span>
              </button>
            )}

            {selectedRecordIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="text-[11px] sm:text-xs text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer pl-1"
              >
                Limpiar selección ({selectedRecordIds.size})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportToExcel}
              className="bg-[#00a651] hover:bg-[#008c44] text-white text-[11px] sm:text-[13px] font-bold px-3 py-1.5 rounded-lg shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title={
                selectedRecordIds.size > 0
                  ? `Descargar archivo Excel (.xlsx) con los ${selectedRecordIds.size} títulos seleccionados`
                  : `Descargar archivo Excel (.xlsx) con los ${sortedSearchResults.length} resultados`
              }
            >
              <FileSpreadsheet className="w-4 h-4 text-white shrink-0" />
              <span>
                {selectedRecordIds.size > 0
                  ? `Exportar ${selectedRecordIds.size} seleccionados a Excel`
                  : `Exportar resultados (${sortedSearchResults.length}) a Excel`}
              </span>
            </button>
          </div>
        </div>

        {/* Alternative Classification Notice Banner */}
        {hasOnlyAlternativeClassificationMatches && (
          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 sm:p-4 text-amber-950 space-y-1 text-xs sm:text-sm shadow-2xs">
            <div className="font-bold text-amber-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>No se encontraron resultados exactos para la clasificación "{deferredSearchTerm}".</span>
            </div>
            <p className="text-amber-800 font-medium pl-6">
              Otros resultados alternativos pueden ser (búsqueda por prefijo <strong>{classificationPrefixUsed}</strong>):
            </p>
          </div>
        )}

        {/* 6. List of Bibliographic MFN Cards */}
        {paginatedResults.length > 0 ? (
          <div className="space-y-4">
            {paginatedResults.map((matchItem, idx) => (
              <CatalogCard
                key={matchItem.record.id}
                record={matchItem.record}
                index={(currentPage - 1) * itemsPerPage + idx}
                exactTerms={matchItem.exactTerms}
                semanticTerms={matchItem.semanticTerms}
                isSelected={selectedRecordIds.has(matchItem.record.id)}
                isAdminMode={isAdminMode}
                onToggleSelect={toggleSelectRecord}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteRecord}
                onViewJson={handleOpenViewSingleJson}
                onSelectDescriptor={(desc) => setSelectedDescriptor(desc)}
              />
            ))}
          </div>
        ) : (
          /* Empty Search State with cross-category suggestion */
          <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center space-y-5 shadow-xs">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                crossCategoryMatches.length > 0 ? 'bg-amber-100 text-amber-600 ring-4 ring-amber-50' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {crossCategoryMatches.length > 0 ? (
                <Lightbulb className="w-8 h-8" />
              ) : (
                <Search className="w-8 h-8" />
              )}
            </div>

            {crossCategoryMatches.length > 0 ? (
              <div className="max-w-xl mx-auto bg-amber-50/95 border border-amber-200/90 rounded-xl p-5 sm:p-6 space-y-4 text-left shadow-sm">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h4 className="text-[17px] font-bold text-amber-950 tracking-tight leading-snug">
                      {crossCategoryMatches.length === 1
                        ? `Se encontró 1 título en ${bestCrossCategoryMatch?.materialType || 'otro ítem'}`
                        : `Se encontraron ${crossCategoryMatches.length} títulos en ${
                            Array.from(new Set(crossCategoryMatches.map((m) => m.record.materialType))).length === 1
                              ? bestCrossCategoryMatch?.materialType
                              : 'otros ítems'
                          }`}
                    </h4>
                    <div className="space-y-1.5">
                      {crossCategoryMatches.slice(0, 3).map((matchItem) => (
                        <p
                          key={matchItem.record.id}
                          className="text-[15px] font-medium text-[#4a2e12] italic leading-relaxed flex items-start gap-2"
                        >
                          {crossCategoryMatches.length > 1 && (
                            <span className="font-bold text-amber-800 not-italic shrink-0">•</span>
                          )}
                          <span>"{matchItem.record.title}"</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-2.5">
                  {Array.from(new Set(crossCategoryMatches.map((m) => m.record.materialType))).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="flex-1 bg-[#00a651] hover:bg-[#008c44] text-white px-5 py-3.5 rounded-lg text-[16px] sm:text-[17px] font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 min-w-[200px]"
                    >
                      <span>Ir a {cat}</span>
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  ))}

                  <button
                    onClick={() => setSelectedCategory('TODOS')}
                    className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3.5 rounded-lg text-[14px] sm:text-[15px] font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Ver en TODOS
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  No se encontraron registros en la base de datos para este término
                </h3>
                {searchTerm && (
                  <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mt-1">
                    No hay coincidencias exactas ni semánticas para "{searchTerm}". Prueba con otros términos o limpia los filtros.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center gap-3 pt-1">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Limpiar todos los filtros
              </button>
            </div>
          </div>
        )}

        {/* 7. Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 pb-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= currentPage - 2 && p <= currentPage + 2)
              )
              .map((pageNum, index, arr) => {
                const prevNum = arr[index - 1];
                const showEllipsis = prevNum && pageNum - prevNum > 1;

                return (
                  <React.Fragment key={pageNum}>
                    {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[36px] h-9 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#00a651] text-white shadow-2xs'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Institutional Footer with Audience Counter */}
      <Footer
        totalRecords={activeRecords.length}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
      />

      {/* Floating Scroll to Top button */}
      <ScrollToTop />
    </div>
  );
}
