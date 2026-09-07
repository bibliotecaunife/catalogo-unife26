import React, { useState } from 'react';
import { X, Code2, Copy, Check, Download } from 'lucide-react';
import { BibliographicRecord } from '../types';

interface SingleRecordJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: BibliographicRecord | null;
}

export const SingleRecordJsonModal: React.FC<SingleRecordJsonModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !record) return null;

  const jsonStr = JSON.stringify(record, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registro_${record.barcode || record.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Registro JSON: {record.barcode || record.id}
              </h3>
              <p className="text-xs text-gray-400 truncate max-w-md">{record.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 sm:p-6 bg-gray-950 text-emerald-400 font-mono text-xs overflow-auto max-h-[60vh] select-text">
          <pre>{jsonStr}</pre>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleDownloadSingle}
            className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 font-medium cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar este .json</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-[#00a651] hover:bg-[#008c44] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado al Portapapeles!' : 'Copiar JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
