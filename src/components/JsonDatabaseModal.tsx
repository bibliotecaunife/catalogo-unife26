import React, { useState, useEffect } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  Download,
  Upload,
  Save,
  AlertCircle,
  BarChart3,
  Search,
} from 'lucide-react';
import { BibliographicRecord } from '../types';
import { downloadJsonDatabase } from '../utils/excelParser';

interface JsonDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: BibliographicRecord[];
  onSaveJsonDatabase: (updatedRecords: BibliographicRecord[]) => void;
}

export const JsonDatabaseModal: React.FC<JsonDatabaseModalProps> = ({
  isOpen,
  onClose,
  records,
  onSaveJsonDatabase,
}) => {
  const [jsonText, setJsonText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'viewer' | 'editor' | 'stats'>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setJsonText(JSON.stringify(records, null, 2));
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, records]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadJsonDatabase(records);
  };

  const handleSaveEditor = () => {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('El JSON debe ser un arreglo de registros [ { ... }, ... ]');
      }
      onSaveJsonDatabase(parsed);
      setSuccessMsg(`Base de datos actualizada con éxito (${parsed.length} registros).`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err?.message || 'JSON inválido. Revisa la sintaxis antes de guardar.');
    }
  };

  // Stats calculation
  const materialTypeCounts: Record<string, number> = {};
  const descriptorsSet = new Set<string>();
  const authorsSet = new Set<string>();

  records.forEach((r) => {
    materialTypeCounts[r.materialType || 'Sin tipo'] =
      (materialTypeCounts[r.materialType || 'Sin tipo'] || 0) + 1;
    if (r.author) authorsSet.add(r.author);
    if (Array.isArray(r.descriptors)) {
      r.descriptors.forEach((d) => descriptorsSet.add(d));
    }
  });

  const filteredRecords = filterQuery.trim()
    ? records.filter((r) =>
        JSON.stringify(r).toLowerCase().includes(filterQuery.toLowerCase())
      )
    : records;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#008c44] text-white px-6 py-4 flex items-center justify-between border-b border-[#00783a]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Code2 className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Base de Datos JSON del Catálogo</h3>
              <p className="text-xs text-emerald-100">
                {records.length} registros bibliográficos estructurados en formato JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab & Action Toolbar */}
        <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('viewer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'viewer'
                  ? 'bg-[#00a651] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              Visor JSON
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-[#00a651] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              Editor JSON Directo
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'stats'
                  ? 'bg-[#00a651] text-white shadow-2xs'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Estadísticas</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
              title="Copiar JSON completo al portapapeles"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-[#00a651] hover:bg-[#008c44] text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
              title="Descargar archivo catalogo_unife_database.json"
            >
              <Download className="w-4 h-4" />
              <span>Descargar .JSON</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-700 px-6 py-2 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-6 py-2 text-xs flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col">
          {activeTab === 'viewer' && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={filterQuery ?? ''}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Filtrar dentro del JSON..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md"
                  />
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {filteredRecords.length} / {records.length} elementos
                </span>
              </div>
              <div className="flex-1 bg-gray-950 text-emerald-400 rounded-xl p-4 overflow-auto font-mono text-xs shadow-inner">
                <pre>{JSON.stringify(filteredRecords, null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              <p className="text-xs text-gray-600">
                Puedes modificar, agregar o eliminar campos directamente en esta estructura JSON y presionar{' '}
                <strong>"Guardar cambios en la Base de Datos"</strong>:
              </p>
              <textarea
                value={jsonText ?? ''}
                onChange={(e) => setJsonText(e.target.value)}
                className="flex-1 bg-gray-950 text-emerald-300 rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#00a651] resize-none"
                spellCheck={false}
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveEditor}
                  className="flex items-center gap-2 bg-[#00a651] hover:bg-[#008c44] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar cambios en la Base de Datos</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Top metrics summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-xs text-emerald-700 font-semibold block">Total Registros</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-900">{records.length}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <span className="text-xs text-blue-700 font-semibold block">Tipos de Material</span>
                  <span className="text-2xl sm:text-3xl font-black text-blue-900">
                    {Object.keys(materialTypeCounts).length}
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-xs text-amber-700 font-semibold block">Descriptores Únicos</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-900">{descriptorsSet.size}</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <span className="text-xs text-purple-700 font-semibold block">Autores Registrados</span>
                  <span className="text-2xl sm:text-3xl font-black text-purple-900">{authorsSet.size}</span>
                </div>
              </div>

              {/* Material Breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Distribución por Tipo de Material</h4>
                <div className="space-y-2.5">
                  {Object.entries(materialTypeCounts).map(([type, count]) => {
                    const percentage = Math.round((count / (records.length || 1)) * 100);
                    return (
                      <div key={type} className="space-y-1 text-xs">
                        <div className="flex justify-between font-medium text-gray-700">
                          <span>{type}</span>
                          <span>
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#00a651] h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
