import React from 'react';
import { computeHighlightSegments } from '../utils/searchEngine';

interface HighlightedProps {
  text: string | number | undefined;
  exactTerms?: string[];
  semanticTerms?: string[];
  className?: string;
}

export const Highlighted: React.FC<HighlightedProps> = ({
  text,
  exactTerms = [],
  semanticTerms = [],
  className = '',
}) => {
  if (text === undefined || text === null) return null;
  const str = String(text);
  if (!exactTerms.length && !semanticTerms.length) {
    return <span className={className}>{str}</span>;
  }

  const segments = computeHighlightSegments(str, exactTerms, semanticTerms);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'exact') {
          return (
            <mark
              key={i}
              className="bg-[#fef08a] text-gray-900 font-semibold px-0.5 rounded shadow-2xs mx-0.5 border border-amber-300"
              title="Coincidencia Exacta"
            >
              {seg.text}
            </mark>
          );
        }
        if (seg.type === 'semantic') {
          return (
            <mark
              key={i}
              className="bg-[#bae6fd] text-gray-900 font-semibold px-0.5 rounded shadow-2xs mx-0.5 border border-sky-300"
              title="Coincidencia Semántica / Familia Léxica"
            >
              {seg.text}
            </mark>
          );
        }
        return <React.Fragment key={i}>{seg.text}</React.Fragment>;
      })}
    </span>
  );
};
