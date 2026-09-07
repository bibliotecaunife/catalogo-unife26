import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Database,
  Eye,
  FileDown,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  readExcelFile,
  autoDetectColumnMapping,
  convertRowsToRecords,
  ParseExcelResult,
  ParsedSheetData,
  downloadSampleExcelTemplate,
} from '../utils/excelParser';
import { BibliographicRecord, ColumnMapping } from '../types';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRecords: (records: BibliographicRecord[], replaceMode: boolean) => void;
  currentRecordsCount: number;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onImportRecords,
  currentRecordsCount,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    mfn: '',
    title: '',
    author: '',
    materialType: '',
    year: '',
    classification: '',
    descriptors: '',
    barcode: '',
    location: '',
    city: '',
    pages: '',
    publisher: '',
    marc502: '',
    publicNote: '',
  });
  const [replaceMode, setReplaceMode] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'cards' | 'json'>('cards');
  const [dragOver, setDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentSheet: ParsedSheetData | undefined = parseResult?.sheets.find(
    (s) => s.sheetName === selectedSheetName
  );

  const handleProcessFile = async (selectedFile: File) => {
    setError(null);
    setLoading(true);
    try {
      const result = await readExcelFile(selectedFile);
      if (result.sheets.length === 0 || result.sheets.every((s) => s.rows.length === 0)) {
        throw new Error('El archivo Excel no contiene filas o datos legibles.');
      }
      setFile(selectedFile);
      setParseResult(result);
      const defaultSheet = result.sheets.find((s) => s.rows.length > 0) || result.sheets[0];
      setSelectedSheetName(defaultSheet.sheetName);

      const mapping = autoDetectColumnMapping(defaultSheet.headers);
      setColumnMapping(mapping);
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el archivo Excel. Verifica el formato.');
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheetName(sheetName);
    const sheet = parseResult?.sheets.find((s) => s.sheetName === sheetName);
    if (sheet) {
      const mapping = autoDetectColumnMapping(sheet.headers);
      setColumnMapping(mapping);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Generate preview records with MFN unifications
  const previewRecords: BibliographicRecord[] = currentSheet
    ? convertRowsToRecords(currentSheet.rows.slice(0, 10), columnMapping, 1)
    : [];

  const handleConfirmImport = () => {
    if (!currentSheet || currentSheet.rows.length === 0) return;
    const startNum = replaceMode ? 1 : currentRecordsCount + 1;
    const allRecords = convertRowsToRecords(currentSheet.rows, columnMapping, startNum);
    onImportRecords(allRecords, replaceMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#00a651] text-white px-6 py-4 flex items-center justify-between border-b border-[#008c44]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Conversor de Excel a Base de Datos JSON</h3>
              <p className="text-xs text-emerald-100">
                Agrupación inteligente por MFN (Biblionumber) y unificación de ejemplares físicos
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#00a651] bg-emerald-50 scale-[0.99]'
                : file
                ? 'border-emerald-400 bg-emerald-50/50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00a651] flex items-center justify-center">
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                ) : file ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="text-sm">
                {file ? (
                  <p className="font-bold text-gray-800">
                    Archivo seleccionado: <span className="text-[#00a651]">{file.name}</span> (
                    {(file.size / 1024).toFixed(1)} KB)
                  </p>
                ) : (
                  <p className="font-semibold text-gray-700">
                    Arrastra y suelta tu archivo <span className="text-[#00a651]">.xlsx, .xls o .csv</span> aquí, o haz clic para explorar
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  El sistema agrupará múltiples filas del mismo MFN en un solo registro unificado.
                </p>
              </div>
              {!file && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSampleExcelTemplate();
                    }}
                    className="text-xs text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Descargar archivo plantilla MFN (.xlsx)</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error notice */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* 2. Sheet selector & Column Mapping (when file is uploaded) */}
          {parseResult && currentSheet && (
            <div className="space-y-5 bg-gray-50/60 p-5 rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#00a651]" />
                  <span className="font-bold text-gray-800 text-sm sm:text-base">
                    Hoja de trabajo y Mapeo de Columnas
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Filas detectadas:</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    {currentSheet.totalRows} registros
                  </span>
                </div>
              </div>

              {/* Sheet selector tabs if multiple sheets */}
              {parseResult.sheets.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Seleccionar Hoja de Excel:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {parseResult.sheets.map((sheet) => (
                      <button
                        key={sheet.sheetName}
                        onClick={() => handleSheetChange(sheet.sheetName)}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                          selectedSheetName === sheet.sheetName
                            ? 'bg-[#00a651] text-white shadow-2xs'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {sheet.sheetName} ({sheet.totalRows} filas)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Column Mapping Grid */}
              <div>
                <p className="text-xs text-gray-600 mb-3">
                  Revisa las columnas detectadas y vincula el MFN, Título, Autor, Ejemplares y Descriptores:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {/* MFN / Biblionumber */}
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      MFN / Biblionumber (Unificador):
                    </label>
                    <select
                      value={columnMapping.mfn || ''}
                      onChange={(e) => handleMappingChange('mfn', e.target.value)}
                      className="w-full bg-white border border-emerald-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Autogenerar por título --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      * Título del Documento:
                    </label>
                    <select
                      value={columnMapping.title || ''}
                      onChange={(e) => handleMappingChange('title', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Author */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      * Autor / Autores:
                    </label>
                    <select
                      value={columnMapping.author || ''}
                      onChange={(e) => handleMappingChange('author', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Material Type */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Tipo de Material:
                    </label>
                    <select
                      value={columnMapping.materialType || ''}
                      onChange={(e) => handleMappingChange('materialType', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Detectar automáticamente --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Año de Publicación:
                    </label>
                    <select
                      value={columnMapping.year || ''}
                      onChange={(e) => handleMappingChange('year', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Clasificación (Cota / Dewey):
                    </label>
                    <select
                      value={columnMapping.classification || ''}
                      onChange={(e) => handleMappingChange('classification', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Descriptors / Keywords */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Descriptores / Materias:
                    </label>
                    <select
                      value={columnMapping.descriptors || ''}
                      onChange={(e) => handleMappingChange('descriptors', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Seleccionar columna --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Barcode */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Código de Barras / Inventario:
                    </label>
                    <select
                      value={columnMapping.barcode || ''}
                      onChange={(e) => handleMappingChange('barcode', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Autogenerar o seleccionar --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Ubicación (Piso / Sala):
                    </label>
                    <select
                      value={columnMapping.location || ''}
                      onChange={(e) => handleMappingChange('location', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Piso 1 (por defecto) o columna --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MARC 502 / Degree */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Grado Académico / MARC 502:
                    </label>
                    <select
                      value={columnMapping.degree || columnMapping.marc502 || ''}
                      onChange={(e) => {
                        handleMappingChange('degree', e.target.value);
                        handleMappingChange('marc502', e.target.value);
                      }}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Opcional (Grado académico) --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ISBN */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      ISBN / Identificador:
                    </label>
                    <select
                      value={columnMapping.isbn || ''}
                      onChange={(e) => handleMappingChange('isbn', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Opcional (ISBN) --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Resumen / Abstract */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Resumen / Abstract:
                    </label>
                    <select
                      value={columnMapping.summary || ''}
                      onChange={(e) => handleMappingChange('summary', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Opcional (Resumen) --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Índice / Contenido */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Índice / Contenido:
                    </label>
                    <select
                      value={columnMapping.indice || columnMapping.content || ''}
                      onChange={(e) => {
                        handleMappingChange('indice', e.target.value);
                        handleMappingChange('content', e.target.value);
                      }}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Opcional (Índice / Contenido) --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Public Note */}
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Notas / Observaciones (Opcional):
                    </label>
                    <select
                      value={columnMapping.publicNote || ''}
                      onChange={(e) => handleMappingChange('publicNote', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-md p-1.5 text-xs font-medium focus:ring-1 focus:ring-[#00a651]"
                    >
                      <option value="">-- Opcional (dejar en blanco) --</option>
                      {currentSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Live Preview Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-600" />
                    <span className="font-bold text-xs text-gray-700 uppercase">
                      Vista previa de Registros Unificados MFN ({previewRecords.length} registros principales)
                    </span>
                  </div>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-md text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('cards')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                        previewTab === 'cards' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                      }`}
                    >
                      Vista Ficha
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('json')}
                      className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                        previewTab === 'json' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600'
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                {previewTab === 'cards' ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {previewRecords.map((r, i) => (
                      <div key={i} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#006837] truncate max-w-sm">
                            {r.mfn ? `[MFN ${r.mfn}] ` : ''}{r.title}
                          </span>
                          <span className="bg-[#00a651] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                            {r.materialType}
                          </span>
                        </div>
                        <div className="text-gray-600 text-[11px] flex flex-wrap gap-x-3">
                          <span>Autor: {r.author}</span>
                          <span>Año: {r.year}</span>
                          <span>Clasif: {r.classification}</span>
                          <span>Ejemplares: {r.copies?.length || 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-lg max-h-56 overflow-auto">
                    {JSON.stringify(previewRecords, null, 2)}
                  </pre>
                )}
              </div>

              {/* 4. Import mode option */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs">
                    <input
                      type="radio"
                      name="importMode"
                      checked={replaceMode}
                      onChange={() => setReplaceMode(true)}
                      className="text-[#00a651] focus:ring-[#00a651]"
                    />
                    <span className="font-bold text-emerald-900">
                      Reemplazar catálogo completo con este archivo ({currentSheet.rows.length.toLocaleString('es-PE')} registros)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-gray-200">
                    <input
                      type="radio"
                      name="importMode"
                      checked={!replaceMode}
                      onChange={() => setReplaceMode(false)}
                      className="text-[#00a651] focus:ring-[#00a651]"
                    />
                    <span className="text-gray-600">
                      Acumular y actualizar catálogo
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            {currentSheet && currentSheet.rows.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allRecords = convertRowsToRecords(currentSheet.rows, columnMapping, 1);
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allRecords, null, 2));
                  const a = document.createElement('a');
                  a.href = dataStr;
                  a.download = `catalogo_unife_52261_registros.json`;
                  a.click();
                }}
                className="px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Descargar el archivo .json convertido con todos los registros"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar archivo .JSON</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!currentSheet || currentSheet.rows.length === 0}
            className="px-5 py-2.5 rounded-lg bg-[#00a651] hover:bg-[#008c44] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm hover:shadow flex items-center gap-2 cursor-pointer transition-all"
          >
            <Database className="w-4 h-4" />
            <span>
              {replaceMode
                ? 'Convertir y Guardar en Base de Datos JSON'
                : 'Convertir y Agregar al Catálogo'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
