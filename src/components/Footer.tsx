import React, { useState, useEffect } from 'react';
import { Eye, BookOpen } from 'lucide-react';

interface FooterProps {
  totalRecords: number;
  onOpenExcelModal?: () => void;
}

const STORAGE_KEY_VISITORS = 'unife_catalog_audience_count_v1';
const STORAGE_KEY_SESSION = 'unife_catalog_session_visited_v1';
const INITIAL_BASE_COUNT = 1000; // <--- Base inicial real (puedes cambiarlo a 1005 si prefieres)

export const Footer: React.FC<FooterProps> = ({ totalRecords, onOpenExcelModal }) => {
  const [visitorCount, setVisitorCount] = useState<number>(INITIAL_BASE_COUNT);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VISITORS);
      let currentCount = stored ? parseInt(stored, 10) : 0;

      // Si no hay registro previo o es menor a la base, inicializa con la base de 1000
      if (isNaN(currentCount) || currentCount < INITIAL_BASE_COUNT) {
        currentCount = INITIAL_BASE_COUNT;
      }

      // Si es una nueva sesión de navegador, incrementa +1 de verdad
      const sessionVisited = sessionStorage.getItem(STORAGE_KEY_SESSION);
      if (!sessionVisited) {
        currentCount += 1;
        sessionStorage.setItem(STORAGE_KEY_SESSION, 'true');
        localStorage.setItem(STORAGE_KEY_VISITORS, currentCount.toString());
      }

      setVisitorCount(currentCount);
    } catch {
      setVisitorCount(INITIAL_BASE_COUNT);
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
          {/* Badge 1: Conteo de visitas real */}
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
