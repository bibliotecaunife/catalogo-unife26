import React from 'react';
import { BookOpen, Link2, FileSpreadsheet, Newspaper } from 'lucide-react';

interface HeaderProps {
  totalRecords: number;
  onOpenExcelModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ totalRecords, onOpenExcelModal }) => {
  return (
    <header className="bg-[#00a651] text-white shadow-md">
      {/* Top bar: Universidad Femenina del Sagrado Corazón */}
      <div className="bg-[#008c44] px-4 py-1 text-[10px] sm:text-xs border-b border-[#00783a]">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between font-medium text-emerald-50">
          <div>
            Universidad Femenina del Sagrado Corazón:{' '}
            <strong className="text-white font-bold">{totalRecords.toLocaleString('es-PE')}</strong> registros
          </div>
          {onOpenExcelModal && (
            <button
              onClick={onOpenExcelModal}
              className="text-[10px] sm:text-[11px] text-emerald-100 hover:text-white underline hover:font-bold cursor-pointer transition-colors"
              title="Cargar archivo Excel para actualizar la base de datos"
            >
              Cargar base de datos Excel
            </button>
          )}
        </div>
      </div>

      {/* Main Brand & Title Header matching UNIFÉ banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* UNIFÉ Brand Logo & Title with direct clickable redirect */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <a
            href="https://catalogobiblioteca.unife.edu.pe/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
            title="Ir a Catálogo de Biblioteca UNIFÉ"
          >
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSY8hNkcCGZygPhb44jWKO1mNjkhPyukmjSgThKl4tu4J2ffVgbqEC9xMJ-&s=10"
              alt="Logo UNIFÉ"
              referrerPolicy="no-referrer"
              className="w-13 h-13 sm:w-15 sm:h-15 md:w-16 md:h-16 object-contain drop-shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </a>

          <div>
            <div className="flex items-center gap-2">
              <a
                href="https://catalogobiblioteca.unife.edu.pe/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl sm:text-2xl md:text-[25px] font-black uppercase tracking-tight text-white leading-tight hover:underline flex items-center gap-2"
                title="Ir a https://catalogobiblioteca.unife.edu.pe/"
              >
                <span>CATÁLOGO BIBLIOGRÁFICO UNIFÉ</span>
                <span className="bg-white/20 text-white p-1 rounded border border-white/40 inline-flex items-center justify-center shadow-2xs hover:bg-white hover:text-[#00a651] transition-colors">
                  <Link2 className="w-4 h-4" />
                </span>
              </a>
            </div>

            {/* 3. Subtítulo exacto */}
            <p className="text-xs sm:text-[13.5px] text-white font-semibold tracking-normal mt-0.5">
              Biblioteca Central * Consulta Bibliográfica
            </p>
          </div>
        </div>

        {/* Stacked official white link buttons */}
        <div className="flex flex-col gap-1 shrink-0 w-full sm:w-auto self-end md:self-center">
          {/* Link 0: Biblioteca Virtual (Ebooks) */}
          <a
            href="https://unifedupe.sharepoint.com/sites/Biblio"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-emerald-50 text-gray-900 px-3 py-0.5 sm:py-1 rounded shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 font-bold text-xs sm:text-[13.5px] border border-gray-100"
            title="Ir a Biblioteca Virtual (Ebooks) UNIFÉ"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#00a651] stroke-[2.2]" />
            <span className="font-serif tracking-tight font-bold">Biblioteca Virtual (Ebooks)</span>
          </a>

          {/* Link 1: Repositorio de tesis */}
          <a
            href="https://repositorio.unife.edu.pe/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-emerald-50 text-gray-900 px-3 py-0.5 sm:py-1 rounded shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 font-bold text-xs sm:text-[13.5px] border border-gray-100"
            title="Ir al Repositorio de tesis UNIFÉ"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00a651] stroke-[2.2]" />
            <span className="font-serif tracking-tight font-bold">Repositorio de tesis</span>
          </a>

          {/* Link 2: Portal de revistas */}
          <a
            href="https://revistas.unife.edu.pe/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-emerald-50 text-gray-900 px-3 py-0.5 sm:py-1 rounded shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 font-bold text-xs sm:text-[13.5px] border border-gray-100"
            title="Ir al Portal de revistas UNIFÉ"
          >
            <Newspaper className="w-3.5 h-3.5 text-[#00a651] stroke-[2.2]" />
            <span className="font-serif tracking-tight font-bold">Portal de revistas</span>
          </a>
        </div>
      </div>
    </header>
  );
};

