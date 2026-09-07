import React from 'react';
import { Edit, Trash2, Copy, Check, ChevronDown, ChevronUp, Book } from 'lucide-react';
import { BibliographicRecord } from '../types';
import { Highlighted } from './Highlighted';

interface CatalogCardProps {
  record: BibliographicRecord;
  index: number;
  exactTerms?: string[];
  semanticTerms?: string[];
  isSelected?: boolean;
  isAdminMode?: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit: (record: BibliographicRecord) => void;
  onDelete: (id: string) => void;
  onViewJson: (record: BibliographicRecord) => void;
  onSelectDescriptor: (descriptor: string) => void;
}

/**
 * Icono de enlace externo para Tesis Digital (caja con flecha diagonal hacia arriba a la derecha según imagen de referencia)
 */
const DigitalThesisLinkIcon: React.FC<{ url?: string; title?: string }> = ({ url, title }) => {
  const targetUrl = url || 'https://repositorio.unife.edu.pe';
  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center ml-2 p-1 text-slate-900 hover:text-[#0055ff] hover:bg-blue-50/90 rounded transition-all duration-150 transform hover:scale-110 align-middle cursor-pointer"
      title={`Acceso a texto completo en Repositorio Digital UNIFÉ: ${title || ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-slate-900 hover:text-[#0055ff] transition-colors"
        aria-hidden="true"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
};

const CatalogCardComponent: React.FC<CatalogCardProps> = ({
  record,
  index,
  exactTerms = [],
  semanticTerms = [],
  isSelected = false,
  isAdminMode = false,
  onToggleSelect,
  onEdit,
  onDelete,
  onViewJson,
  onSelectDescriptor,
}) => {
  const [copiedCitation, setCopiedCitation] = React.useState(false);

  const rawAuthor = (record.author || '').trim();
  const isMissingAuthor =
    !rawAuthor ||
    rawAuthor === 'Sin autor especificado' ||
    rawAuthor === 'Autor no especificado' ||
    rawAuthor === '[s.n.]' ||
    rawAuthor === 's.n.' ||
    rawAuthor.toLowerCase() === 'sin autor';
  const displayAuthor = isMissingAuthor ? '[s.n.]' : record.author;

  const copyApaCitation = () => {
    const citation = `${displayAuthor} (${record.year || 's.f.'}). ${record.title}. ${record.city ? `${record.city}: ` : ''}${record.publisher || 'UNIFÉ'}.`;
    navigator.clipboard.writeText(citation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  // Generate clean unified physical copies list
  const copiesList = record.copies && record.copies.length > 0
    ? record.copies
    : [
        {
          barcode: record.barcode || 'S/N',
          location: record.location || 'Piso 1',
          callNumber: record.classification || '',
          publicNote: 'Lectura en sala',
          status: 'Disponible',
          copyNumber: 1,
        },
      ];

  const isDigitalThesis = record.materialType === 'Tesis digital' || record.materialType?.toLowerCase().includes('digital');
  const academicDegree = record.degree || record.marc502;
  const cleanCity = record.city ? record.city.replace(/:\s*$/, '').trim() : '';
  const cleanPublisher = record.publisher ? record.publisher.replace(/,\s*$/, '').trim() : '';
  const rawContent = (record.indice || record.content || '').trim();
  const cleanContent = rawContent
    ? (rawContent.replace(/^(contenido|contiene|índice|indice)\s*[:.\-–—\s]\s*/i, '').trim() || rawContent)
    : '';
  const cleanSummary = record.summary
    ? (record.summary.replace(/^(resumen|abstract)\s*[:.\-–—\s]\s*/i, '').trim() || record.summary.trim())
    : '';

  return (
    <article
      id={`catalog-record-${record.id}`}
      className={`card-tintineo rounded-xl border transition-all duration-200 p-4 sm:p-5 relative group ${
        isSelected
          ? 'bg-[#f0fdf4] border-[#00a651] shadow-md ring-2 ring-[#00a651]/30'
          : 'bg-white border-gray-200 shadow-2xs hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      {/* Quick Action bar (Solo en Modo Administrador) */}
      {isAdminMode && (
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-amber-300 shadow-2xs z-10">
          <button
            onClick={() => onEdit(record)}
            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-md transition-colors cursor-pointer"
            title="Editar registro (Modo Administrador)"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(record.id)}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors cursor-pointer"
            title="Eliminar registro (Modo Administrador)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header Badges: [TIPO MATERIAL]   AÑO: 2026   MFN: 075892 */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 mb-2.5 pr-4 sm:pr-12">
        {/* Badge Tipo Material */}
        <span className="inline-block bg-[#00a651] text-white text-[11px] sm:text-[14px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-2xs">
          {record.materialType || 'MATERIAL BIBLIOGRÁFICO'}
        </span>

        {/* Badge Año */}
        {record.year && (
          <span className="inline-flex items-center gap-1.5 text-[13px] sm:text-[17px] font-bold text-[#4a1c14] tracking-tight">
            <span className="uppercase text-[#4a1c14] font-bold">AÑO:</span>
            <span className="font-bold text-[#4a1c14]">
              <Highlighted text={record.year} exactTerms={exactTerms} semanticTerms={semanticTerms} />
            </span>
          </span>
        )}

        {/* Badge MFN */}
        {record.mfn && (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-300 text-slate-700 text-[11px] sm:text-[14px] font-mono font-bold px-3 py-1 rounded-full shadow-2xs">
            <span className="text-slate-400 font-sans font-semibold">MFN:</span>
            <Highlighted text={record.mfn} exactTerms={exactTerms} semanticTerms={semanticTerms} />
          </span>
        )}
      </div>

      {/* 2. Professional Clean Title: [ ] 📖 1. Titulo (Matching Image 3) */}
      <div className="flex items-start gap-2.5 mb-2">
        {/* Cuadrado Check para selección individual (Imagen 3) */}
        {onToggleSelect && (
          <label
            htmlFor={`select-record-${record.id}`}
            className="inline-flex items-center mt-1 cursor-pointer select-none shrink-0"
            title={isSelected ? 'Deseleccionar este título' : 'Seleccionar este título para exportar a Excel'}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              id={`select-record-${record.id}`}
              checked={isSelected}
              onChange={() => onToggleSelect(record.id)}
              className="w-4 h-4 text-[#006837] accent-[#00a651] border-gray-400 rounded cursor-pointer transition-transform hover:scale-110"
            />
          </label>
        )}

        {/* Icono de libro azul/verde + Número + Título */}
        <h2 className="text-[17px] sm:text-[19px] md:text-[20px] font-bold leading-snug select-text flex-1">
          <span className="inline-flex items-center gap-1.5 mr-1.5 align-baseline">
            {isDigitalThesis ? (
              <Book className="w-4.5 h-4.5 text-[#0055ff] inline-block shrink-0 fill-blue-50" />
            ) : (
              <Book className="w-4.5 h-4.5 text-[#006837] inline-block shrink-0 fill-emerald-50" />
            )}
            {typeof index === 'number' && (
              <span className={isDigitalThesis ? 'text-[#0055ff] font-bold' : 'text-[#006837] font-bold'}>
                {index + 1}.
              </span>
            )}
          </span>
          {isDigitalThesis ? (
            <span className="inline-flex flex-wrap items-center">
              {record.url ? (
                <a
                  href={record.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0055ff] hover:text-[#003cb3] hover:underline transition-colors"
                  title="Abrir tesis digital en repositorio UNIFÉ"
                >
                  <Highlighted text={record.title} exactTerms={exactTerms} semanticTerms={semanticTerms} />
                </a>
              ) : (
                <span className="text-[#0055ff]">
                  <Highlighted text={record.title} exactTerms={exactTerms} semanticTerms={semanticTerms} />
                </span>
              )}
              <DigitalThesisLinkIcon url={record.url} title={record.title} />
            </span>
          ) : (
            <span className="text-[#006837]">
              <Highlighted text={record.title} exactTerms={exactTerms} semanticTerms={semanticTerms} />
            </span>
          )}
        </h2>
      </div>

      {/* 3. Bibliographic Metadata */}
      <div className="text-[15px] sm:text-[16.5px] text-gray-800 mb-2.5 select-text space-y-1.5">
        {/* Renglón 1: AUTOR */}
        <p className="leading-relaxed">
          <strong className="text-gray-900 font-bold uppercase tracking-tight mr-1.5">AUTOR:</strong>
          <span className="font-normal text-gray-800">
            <Highlighted text={displayAuthor} exactTerms={exactTerms} semanticTerms={semanticTerms} />
          </span>
        </p>

        {/* Renglón 2: LUGAR / EDITORIAL / PÁGINAS / ISBN (Horizontal lineal) */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 leading-relaxed">
          {cleanCity && (
            <span className="inline-flex items-center gap-1">
              <strong className="text-gray-900 font-bold uppercase tracking-tight">LUGAR:</strong>
              <span className="font-normal text-gray-800">{cleanCity}</span>
              {(cleanPublisher || record.pages || record.isbn) ? <span className="text-gray-400 font-medium ml-1">/</span> : null}
            </span>
          )}

          {cleanPublisher && (
            <span className="inline-flex items-center gap-1">
              <strong className="text-gray-900 font-bold uppercase tracking-tight">EDITORIAL:</strong>
              <span className="font-normal text-gray-800">
                <Highlighted text={cleanPublisher} exactTerms={exactTerms} semanticTerms={semanticTerms} />
              </span>
              {(record.pages || record.isbn) ? <span className="text-gray-400 font-medium ml-1">/</span> : null}
            </span>
          )}

          {record.pages && (
            <span className="inline-flex items-center gap-1">
              <strong className="text-gray-900 font-bold uppercase tracking-tight">PÁGINAS:</strong>
              <span className="font-normal text-gray-800">{record.pages}</span>
              {record.isbn ? <span className="text-gray-400 font-medium ml-1">/</span> : null}
            </span>
          )}

          {record.isbn && (
            <span className="inline-flex items-center gap-1">
              <strong className="text-gray-900 font-bold uppercase tracking-tight">ISBN:</strong>
              <span className="font-mono text-gray-800">
                <Highlighted text={record.isbn} exactTerms={exactTerms} semanticTerms={semanticTerms} />
              </span>
            </span>
          )}
        </div>

        {/* Renglón 3: GRADO ACADÉMICO (Solo para Tesis digital) */}
        {isDigitalThesis && academicDegree && (
          <p className="leading-relaxed pt-0.5">
            <strong className="text-gray-900 font-bold uppercase tracking-tight mr-1.5">GRADO ACADÉMICO:</strong>
            <span className="font-normal text-gray-800">
              <Highlighted text={academicDegree} exactTerms={exactTerms} semanticTerms={semanticTerms} />
            </span>
          </p>
        )}
      </div>

      {/* 4. DESCRIPTORES with label "DESCRIPTORES:" and soft yellow border pills */}
      {record.descriptors && record.descriptors.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 my-2.5 pt-0.5">
          <span className="text-[15px] sm:text-[16.5px] font-bold text-gray-900 tracking-tight mr-0.5">
            DESCRIPTORES:
          </span>
          {record.descriptors.map((descriptor, i) => (
            <button
              key={i}
              onClick={() => onSelectDescriptor(descriptor)}
              className="bg-white hover:bg-amber-50/80 text-slate-800 hover:text-slate-950 border border-[#facc15] hover:border-amber-400 px-3.5 py-0.5 rounded-full text-[13px] sm:text-[14.5px] font-medium tracking-normal shadow-2xs transition-colors cursor-pointer inline-flex items-center"
              title={`Filtrar por descriptor: ${descriptor}`}
            >
              <Highlighted text={descriptor} exactTerms={exactTerms} semanticTerms={semanticTerms} />
            </button>
          ))}
        </div>
      )}

      {/* 5. ÍNDICE */}
      {cleanContent && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-2.5 text-[14.5px] sm:text-[15.5px] text-gray-800 select-text">
          <strong className="text-gray-900 font-bold uppercase tracking-tight block mb-1">
            ÍNDICE:
          </strong>
          <p className="font-normal text-gray-700 leading-relaxed whitespace-pre-line text-[14px] sm:text-[15px]">
            <Highlighted text={cleanContent} exactTerms={exactTerms} semanticTerms={semanticTerms} />
          </p>
        </div>
      )}

      {/* 6. RESUMEN */}
      {cleanSummary && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-2.5 text-[14.5px] sm:text-[15.5px] text-gray-800 select-text">
          <strong className="text-gray-900 font-bold uppercase tracking-tight block mb-1">
            RESUMEN:
          </strong>
          <p className="font-normal text-gray-700 leading-relaxed whitespace-pre-line text-[14px] sm:text-[15px]">
            <Highlighted text={cleanSummary} exactTerms={exactTerms} semanticTerms={semanticTerms} />
          </p>
        </div>
      )}

      {/* 7. TABLA DE EJEMPLARES FÍSICOS (Solo para materiales impresos o físicos, las tesis digitales cuentan solo con su enlace digital) */}
      {!isDigitalThesis && copiesList.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <div className="text-[12px] sm:text-base font-bold text-[#004b99] mb-2">
            Existencias físicas en sala ({copiesList.length} {copiesList.length === 1 ? 'ejemplar' : 'ejemplares'})
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-2xs">
            <table className="w-full text-left text-[12px] sm:text-base divide-y divide-gray-200">
              <thead className="bg-[#e2e8f0] text-gray-900 font-bold text-[12px] sm:text-[15px] border-b border-gray-300">
                <tr>
                  <th className="py-2 px-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                      Ubicación
                      <span className="text-gray-400 text-xs select-none">▲▼</span>
                    </span>
                  </th>
                  <th className="py-2 px-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                      Código de barras
                      <span className="text-gray-400 text-xs select-none">▲▼</span>
                    </span>
                  </th>
                  <th className="py-2 px-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                      Clasificación
                      <span className="text-gray-400 text-xs select-none">▲▼</span>
                    </span>
                  </th>
                  <th className="py-2 px-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                      Notas
                      <span className="text-emerald-700/80 text-xs select-none">▲▼</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {copiesList.map((copy, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-2.5 font-medium text-gray-900 whitespace-nowrap">
                      {copy.location || record.location || 'Piso 1'}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-gray-700 whitespace-nowrap">
                      <Highlighted text={copy.barcode} exactTerms={exactTerms} semanticTerms={semanticTerms} />
                    </td>
                    <td className="py-2 px-2.5 font-mono text-gray-800 whitespace-nowrap">
                      <Highlighted text={copy.callNumber || record.classification} exactTerms={exactTerms} semanticTerms={semanticTerms} />
                    </td>
                    <td className="py-2 px-2.5 text-gray-700 text-[12px] sm:text-base">
                      {copy.publicNote || 'Lectura en sala'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
};

export const CatalogCard = React.memo(CatalogCardComponent);
