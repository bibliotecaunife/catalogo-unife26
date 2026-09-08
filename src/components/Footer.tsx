import React, { useState, useEffect } from 'react';
import { Eye, BookOpen } from 'lucide-react';

interface FooterProps {
  totalRecords: number;
  onOpenExcelModal?: () => void;
}

const STORAGE_KEY_VISITORS = 'unife_catalog_audience_count_v1';
const STORAGE_KEY_SESSION = 'unife_catalog_session_visited_v1';
const INITIAL_BASE_COUNT = 1;

export const Footer: React.FC<FooterProps> = ({ totalRecords, onOpenExcelModal }) => {
  const [visitorCount, setVisitorCount] = useState<number>(INITIAL_BASE_COUNT);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VISITORS);
      let currentCount = stored ? parseInt(stored, 10) : 0;
      if (isNaN(currentCount) || currentCount < 1) {
        currentCount = 0;
      }

      // If new session or first visit, increment visitor count starting from 1
      const sessionVisited = sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (!sessionVisited) {
        currentCount += 1;
        sessionStorage.setItem(STORAGE_KEY_SESSION, 'true');
        localStorage.setItem(STORAGE_KEY_VISITORS, currentCount.toString());
      }

      setVisitorCount(currentCount || 1);
    } catch {
      setVisitorCount(1);
    }
  }, []);

  return (
    <footer id="catalog-footer" className="bg-[#00a651] text-white border-t-2 border-[#008742] mt-10 py-3.5 px-4 sm:px-6 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
        {/* Elemento 1: Texto Universidad Femenina del Sagrado Corazón — UNIFÉ */}
        <div className="font-bold text-white text-sm sm:text-base tracking-wide font-sans drop-shadow-xs">
          Universidad Femenina del Sagrado Corazón — UNIFÉ
        </div>

        {/* Elementos 2 y 3: Badges de Conteo de visitas y Títulos en catálogo */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
          {/* Badge 1: Conteo de visitas */}
          <div className="inline-flex items-center gap-2 bg-[#008742]/90 hover:bg-[#008742] px-3.5 py-1.5 rounded-lg border border-white/25 shadow-xs transition-colors">
            <Eye className="w-4 h-4 text-[#a7f3d0] shrink-0 stroke-[2.2]" />
            <span className="text-xs sm:text-sm font-medium text-white">
              Conteo de visitas:
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-wider">
              {visitorCount.toLocaleString('es-PE')}
            </span>
          </div>

          {/* Badge 2: Títulos en catálogo */}
          <div className="inline-flex items-center gap-2 bg-[#008742]/90 px-3.5 py-1.5 rounded-lg border border-white/25 shadow-xs">
            <BookOpen className="w-4 h-4 text-[#fde047] shrink-0 stroke-[2.2]" />
            <span className="text-xs sm:text-sm font-medium text-white">
              Títulos en catálogo:
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-wider">
              {totalRecords.toLocaleString('es-PE')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

