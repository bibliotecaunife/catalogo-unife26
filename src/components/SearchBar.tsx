import React, { useState, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal, ArrowUpDown, Sparkles, Hash } from 'lucide-react';
import { SearchScope } from '../types';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchScope: SearchScope;
  onScopeChange: (scope: SearchScope) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  availableYears: (number | string)[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm = '',
  onSearchChange,
  searchScope = 'general',
  onScopeChange,
  selectedYear = '',
  onYearChange,
  availableYears,
  sortBy = 'default',
  onSortChange,
  onResetFilters,
  isFiltered,
}) => {
  const [localSearch, setLocalSearch] = useState<string>(searchTerm || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize when parent searchTerm changes externally (e.g. tag click or reset)
  useEffect(() => {
    setLocalSearch(searchTerm || '');
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val === '') {
      onSearchChange('');
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 280);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearchChange(localSearch);
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setLocalSearch('');
    onSearchChange('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearchChange(localSearch);
  };

  return (
    <div className="w-full bg-[#f8fafc] border-b border-gray-200/80 py-4 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* Main Search Bar matching UNIFÉ UI */}
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2.5 w-full">
          {/* Scope Selector Dropdown */}
          <div className="relative w-full md:w-auto shrink-0">
            <select
              id="search-scope-select"
              value={searchScope}
              onChange={(e) => onScopeChange(e.target.value as SearchScope)}
              className="w-full md:w-52 appearance-none bg-white border border-[#d4af37] hover:border-[#b8952e] text-gray-800 text-sm font-medium py-2.5 pl-3.5 pr-8 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#d4af37]/60 focus:border-[#d4af37] cursor-pointer transition-all"
            >
              <option value="general">Búsqueda general</option>
              <option value="mfn">MFN</option>
              <option value="title">Título</option>
              <option value="author">Autor</option>
              <option value="descriptors">Descriptores</option>
              <option value="classification">Clasificación</option>
              <option value="barcode">Código de Barras</option>
              <option value="year">Año de Publicación</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-500">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Search Input Box with rounded pills style */}
          <div className="relative flex-1 w-full flex items-center">
            <input
              id="main-search-input"
              type="text"
              value={localSearch}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por título, autor, descriptores, etc"
              className="w-full bg-white border border-[#d4af37] hover:border-[#b8952e] text-gray-800 placeholder-gray-400 text-sm sm:text-base py-2.5 pl-4 pr-24 rounded-full shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#d4af37]/60 focus:border-[#d4af37] transition-all"
            />

            {localSearch && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-14 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Magnifying glass button */}
            <button
              type="submit"
              id="search-submit-btn"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-[#d4af37] hover:border-[#b8952e] hover:bg-amber-50/50 text-[#00a651] shadow-2xs flex items-center justify-center transition-all cursor-pointer"
              title="Buscar en catálogo"
            >
              <Search className="w-5 h-5 text-[#00a651]" />
            </button>
          </div>
        </form>

        {/* Helpful user advice badge directly beneath search bar with orange sparkling star */}
        <div className="pl-1 sm:pl-2 flex items-center gap-1.5 flex-wrap">
          <span className="orange-star-tintineo shrink-0 select-none flex items-center justify-center" title="Recomendación">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 sm:w-4.5 sm:h-4.5"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="orangeStarGrad" x1="10%" y1="10%" x2="90%" y2="90%">
                  <stop offset="0%" stopColor="#ff4500" />
                  <stop offset="30%" stopColor="#ff7a00" />
                  <stop offset="60%" stopColor="#ff9f1c" />
                  <stop offset="85%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <path
                d="M12 2C12.4 7.2 16.8 11.6 22 12C16.8 12.4 12.4 16.8 12 22C11.6 16.8 7.2 12.4 2 12C7.2 11.6 11.6 7.2 12 2Z"
                fill="url(#orangeStarGrad)"
              />
            </svg>
          </span>
          <span className="text-[#005a2b] font-semibold text-[13px] sm:text-[14px]">
            De preferencia realice Búsquedas desde el item <strong className="text-[#004d28] font-bold">TODOS</strong>
          </span>
        </div>

        {/* Secondary Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-0.5 text-gray-600">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#00a651]" />
              Filtros:
            </span>

            {/* Filter by Year */}
            <select
              id="filter-year-select"
              value={selectedYear}
              onChange={(e) => onYearChange(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-xs py-1 px-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00a651] cursor-pointer"
            >
              <option value="">Todos los Años</option>
              {availableYears.map((yr) => (
                <option key={String(yr)} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>

            {isFiltered && (
              <button
                onClick={onResetFilters}
                className="text-red-600 hover:text-red-700 hover:underline text-xs font-medium cursor-pointer ml-1"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Sort By selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-gray-700 flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#00a651]" />
              Ordenar por:
            </span>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-xs py-1 px-2.5 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00a651] cursor-pointer"
            >
              <option value="year-desc">Año más reciente</option>
              <option value="default">Por relevancia</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
