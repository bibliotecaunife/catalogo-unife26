import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      id="scroll-to-top-btn"
      aria-label="Subir al inicio"
      title="Subir al inicio de la página"
      className="fixed bottom-6 right-6 z-40 bg-[#00a651] hover:bg-[#008742] active:bg-[#006837] text-white p-3 sm:p-3.5 rounded-full shadow-lg hover:shadow-xl border-2 border-white transition-all duration-200 transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center group"
    >
      <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
};
