import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';

interface MaterialFilterTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts: Record<string, number>;
}

export const MaterialFilterTabs: React.FC<MaterialFilterTabsProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSelectMobile = (cat: string) => {
    onSelectCategory(cat);
    setIsMobileOpen(false);
  };

  // List of standard categories excluding TODOS for the tree list
  const materialList = categories.filter((c) => c.toUpperCase() !== 'TODOS');

  return (
    <div className="w-full bg-[#f8fafc] border-b border-gray-200/80 py-2.5 px-3 sm:px-6">
      {/* 1. Mobile Dropdown View (Solo pantallas pequeñas / celulares) */}
      <div className="sm:hidden w-full max-w-md mx-auto space-y-2">
        {/* Dropdown Toggle Button matching image */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className={`w-full rounded-lg px-4 py-2.5 flex items-center justify-between shadow-2xs cursor-pointer transition-all ${
            selectedCategory.toUpperCase() === 'TODOS'
              ? 'bg-[#00a651] text-white font-bold'
              : 'bg-white text-[#006837] border-2 border-[#00a651] font-bold'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold opacity-90">
              TIPO DE MATERIAL:
            </span>
            <span className="text-sm font-bold tracking-wide">
              {selectedCategory.toUpperCase() === 'TODOS' ? 'TODOS' : selectedCategory}
            </span>
          </div>
          <div className="flex items-center gap-1 font-bold text-xs">
            {isMobileOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Mobile Tree / Checklist dropdown matching user image */}
        {isMobileOpen && (
          <div className="bg-white border border-gray-300 rounded-xl p-3 shadow-md space-y-2 font-sans text-sm animate-in fade-in duration-150">
            {/* TODOS option at top with light green background */}
            <button
              onClick={() => handleSelectMobile('TODOS')}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                selectedCategory.toUpperCase() === 'TODOS'
                  ? 'bg-[#e8f8f0] text-[#006837] font-bold border border-emerald-200'
                  : 'hover:bg-gray-50 text-gray-800'
              }`}
            >
              {selectedCategory.toUpperCase() === 'TODOS' ? (
                <CheckSquare className="w-4 h-4 text-[#00a651] shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span className="font-bold text-sm">TODOS</span>
            </button>

            {/* Tree list with dotted lines matching user image */}
            <div className="border-t border-gray-100 pt-2 pl-2 space-y-2 font-normal text-[13.5px]">
              {materialList.map((category, idx) => {
                const isSelected =
                  selectedCategory.toUpperCase() === 'TODOS' ||
                  selectedCategory.toLowerCase() === category.toLowerCase();
                const isDirectlySelected =
                  selectedCategory.toLowerCase() === category.toLowerCase();

                return (
                  <div
                    key={category}
                    onClick={() => handleSelectMobile(category)}
                    className="flex items-center gap-2.5 py-1 px-1.5 rounded-md hover:bg-emerald-50/70 cursor-pointer transition-colors"
                  >
                    {/* Tree branch glyph */}
                    <span className="text-gray-400 select-none font-mono text-sm leading-none w-3.5">
                      {idx === materialList.length - 1 ? '└─' : '├─'}
                    </span>

                    {/* Checkbox icon */}
                    {isSelected ? (
                      <CheckSquare
                        className={`w-4 h-4 shrink-0 ${
                          isDirectlySelected ? 'text-[#00a651]' : 'text-gray-700'
                        }`}
                      />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 shrink-0" />
                    )}

                    {/* Category Label */}
                    <span
                      className={`text-gray-900 ${
                        isDirectlySelected ? 'font-bold text-[#006837]' : 'font-medium'
                      }`}
                    >
                      {category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Desktop Horizontal Pills Row (Exacto como en la imagen de PC) */}
      <div className="hidden sm:flex max-w-7xl mx-auto items-center justify-center gap-2.5 flex-wrap py-1">
        {categories.map((category) => {
          const isTodos = category.toUpperCase() === 'TODOS';
          const isSelected = selectedCategory.toLowerCase() === category.toLowerCase();
          const displayName = isTodos ? 'TODOS' : category;

          if (isTodos) {
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category)}
                className={`relative whitespace-nowrap px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-[14px] font-bold transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 todos-gold-tintineo ${
                  isSelected
                    ? 'bg-[#00a651] text-white shadow-xs'
                    : 'bg-white text-[#00a651] border border-[#00a651] hover:bg-emerald-50'
                }`}
                title="Ver todo el catálogo bibliográfico"
              >
                <span>{displayName}</span>
              </button>
            );
          }

          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`whitespace-nowrap px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-[14px] font-medium transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0 ${
                isSelected
                  ? 'bg-[#00a651] text-white shadow-xs border border-[#00a651] font-bold'
                  : 'bg-white text-[#00a651] border border-[#00a651] hover:bg-emerald-50'
              }`}
            >
              <span>{displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
