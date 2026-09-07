import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Tag, BookOpen, Layers, Barcode, MapPin } from 'lucide-react';
import { BibliographicRecord, DEFAULT_MATERIAL_TYPES, OFFICIAL_MATERIAL_TYPES, ItemCopy } from '../types';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: BibliographicRecord | null;
  onSave: (record: BibliographicRecord) => void;
  nextItemNumber: number;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  onSave,
  nextItemNumber,
}) => {
  const [formData, setFormData] = useState<Partial<BibliographicRecord>>({
    mfn: '',
    materialType: 'Tesis impresa',
    title: '',
    author: '',
    year: new Date().getFullYear(),
    city: 'Lima',
    publisher: 'UNIFÉ',
    pages: '',
    classification: '',
    descriptors: [],
    barcode: '',
    location: 'Piso1',
    copies: [],
    summary: '',
    content: '',
    url: '',
    degree: '',
    advisor: '',
    isbn: '',
    marc502: '',
  });

  const [descriptorInput, setDescriptorInput] = useState<string>('');

  useEffect(() => {
    if (recordToEdit) {
      setFormData({
        id: recordToEdit.id || `rec-mfn-${Date.now()}`,
        mfn: recordToEdit.mfn ?? '',
        itemNumber: recordToEdit.itemNumber ?? nextItemNumber,
        materialType: recordToEdit.materialType || 'Tesis impresa',
        title: recordToEdit.title ?? '',
        author: recordToEdit.author ?? '',
        year: recordToEdit.year ?? new Date().getFullYear(),
        city: recordToEdit.city ?? 'Lima',
        publisher: recordToEdit.publisher ?? 'UNIFÉ',
        pages: recordToEdit.pages ?? '',
        classification: recordToEdit.classification ?? '',
        descriptors: Array.isArray(recordToEdit.descriptors) ? [...recordToEdit.descriptors] : [],
        barcode: recordToEdit.barcode ?? '',
        location: recordToEdit.location ?? 'Piso1',
        copies: recordToEdit.copies && recordToEdit.copies.length > 0
          ? recordToEdit.copies.map((c, i) => ({
              barcode: c.barcode ?? '',
              location: c.location ?? 'Piso1',
              publicNote: c.publicNote ?? 'Disponible en sala/préstamo',
              status: c.status ?? 'Disponible',
              copyNumber: c.copyNumber ?? i + 1,
            }))
          : [
              {
                barcode: recordToEdit.barcode ?? '',
                location: recordToEdit.location ?? 'Piso1',
                publicNote: 'Disponible en sala/préstamo',
                status: 'Disponible',
                copyNumber: 1,
              },
            ],
        summary: recordToEdit.summary ?? '',
        content: recordToEdit.content ?? '',
        url: recordToEdit.url ?? '',
        degree: recordToEdit.degree ?? '',
        advisor: recordToEdit.advisor ?? '',
        isbn: recordToEdit.isbn ?? '',
        marc502: recordToEdit.marc502 ?? '',
        createdAt: recordToEdit.createdAt ?? new Date().toISOString(),
        updatedAt: recordToEdit.updatedAt ?? new Date().toISOString(),
      });
    } else {
      const initBarcode = `${30000 + nextItemNumber}`;
      setFormData({
        id: `rec-mfn-${Date.now()}`,
        mfn: `${1000 + nextItemNumber}`,
        itemNumber: nextItemNumber,
        materialType: 'Tesis impresa',
        title: '',
        author: '',
        year: new Date().getFullYear(),
        city: 'Lima',
        publisher: 'UNIFÉ',
        pages: '',
        classification: '',
        descriptors: ['INVESTIGACIÓN'],
        barcode: initBarcode,
        location: 'Piso1',
        copies: [
          {
            barcode: initBarcode,
            location: 'Piso1',
            publicNote: 'Lectura en sala',
            status: 'Disponible',
            copyNumber: 1,
          },
        ],
        summary: '',
        content: '',
        indice: '',
        url: '',
        degree: '',
        advisor: '',
        isbn: '',
        marc502: '',
      });
    }
  }, [recordToEdit, isOpen, nextItemNumber]);

  if (!isOpen) return null;

  const handleAddDescriptor = () => {
    if (descriptorInput.trim()) {
      const formatted = descriptorInput.trim().toUpperCase();
      if (!formData.descriptors?.includes(formatted)) {
        setFormData((prev) => ({
          ...prev,
          descriptors: [...(prev.descriptors || []), formatted],
        }));
      }
      setDescriptorInput('');
    }
  };

  const handleRemoveDescriptor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      descriptors: prev.descriptors?.filter((_, i) => i !== index),
    }));
  };

  const handleAddCopy = () => {
    const currentCopies = formData.copies || [];
    const newCopyNum = currentCopies.length + 1;
    const newBarcode = `${Number(formData.barcode || 30000) + newCopyNum}`;
    const newCopy: ItemCopy = {
      barcode: newBarcode,
      location: formData.location || 'Piso 1',
      publicNote: `Ejemplar ${newCopyNum}`,
      status: 'Disponible',
      copyNumber: newCopyNum,
    };
    setFormData((prev) => ({
      ...prev,
      copies: [...(prev.copies || []), newCopy],
    }));
  };

  const handleUpdateCopy = (index: number, field: keyof ItemCopy, value: string) => {
    setFormData((prev) => {
      const updated = [...(prev.copies || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, copies: updated };
    });
  };

  const handleRemoveCopy = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      copies: prev.copies?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      alert('Por favor, ingresa al menos el título del documento.');
      return;
    }

    const currentCopies = formData.copies && formData.copies.length > 0
      ? formData.copies
      : [
          {
            barcode: formData.barcode?.trim() || `${30000 + nextItemNumber}`,
            location: formData.location?.trim() || 'Piso1',
            publicNote: 'Disponible en sala',
            status: 'Disponible',
            copyNumber: 1,
          },
        ];

    const savedRecord: BibliographicRecord = {
      id: formData.id || `rec-mfn-${Date.now()}`,
      mfn: formData.mfn?.toString().trim() || `${1000 + nextItemNumber}`,
      itemNumber: formData.itemNumber || nextItemNumber,
      materialType: formData.materialType || 'Libro impreso',
      title: formData.title.trim(),
      author: formData.author?.trim() || '[s.n.]',
      year: formData.year || new Date().getFullYear(),
      city: formData.city?.trim() || 'Lima',
      publisher: formData.publisher?.trim() || 'UNIFÉ',
      pages: formData.pages?.trim() || '',
      classification: formData.classification?.trim() || 'S/C',
      descriptors: formData.descriptors || [],
      barcode: currentCopies[0]?.barcode || formData.barcode?.trim() || `${30000 + nextItemNumber}`,
      location: currentCopies[0]?.location || formData.location?.trim() || 'Piso1',
      copies: currentCopies,
      summary: formData.summary?.trim() || '',
      content: formData.content?.trim() || '',
      url: formData.url?.trim() || '',
      degree: formData.degree?.trim() || '',
      advisor: formData.advisor?.trim() || '',
      isbn: formData.isbn?.trim() || '',
      marc502: formData.marc502?.trim() || '',
      updatedAt: new Date().toISOString(),
      createdAt: formData.createdAt || new Date().toISOString(),
    };

    onSave(savedRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#00a651] text-white px-6 py-4 flex items-center justify-between border-b border-[#008c44]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-white" />
            <div>
              <h3 className="text-lg font-bold">
                {recordToEdit ? `Editar Registro MFN: ${recordToEdit.mfn || recordToEdit.id}` : 'Crear Nuevo Registro Bibliográfico'}
              </h3>
              <p className="text-xs text-emerald-100">
                {recordToEdit ? `Modificando registro #${recordToEdit.itemNumber}` : 'Añadir un nuevo bloque bibliográfico con ejemplares'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* MFN / Biblionumber */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                * MFN (Biblionumber)
              </label>
              <input
                type="text"
                value={formData.mfn ?? ''}
                onChange={(e) => setFormData({ ...formData, mfn: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-[#00a651]"
                placeholder="ej. 001042"
                required
              />
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                * Tipo de Material
              </label>
              <select
                value={formData.materialType ?? 'Tesis impresa'}
                onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#00a651]"
                required
              >
                {OFFICIAL_MATERIAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                * Año de Publicación
              </label>
              <input
                type="text"
                value={formData.year ?? ''}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#00a651]"
                placeholder="ej. 1985, 2024"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              * Título del Documento / Tesis / Libro
            </label>
            <textarea
              value={formData.title ?? ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#00a651]"
              placeholder="Ingrese el título completo..."
              required
            />
          </div>

          {/* Author and Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                * Autor(es)
              </label>
              <input
                type="text"
                value={formData.author ?? ''}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#00a651]"
                placeholder="Apellido, Nombre"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                * Clasificación (Signatura Topográfica)
              </label>
              <input
                type="text"
                value={formData.classification ?? ''}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm font-mono focus:ring-2 focus:ring-[#00a651]"
                placeholder="ej. T106.58/G59"
                required
              />
            </div>
          </div>

          {/* Publisher, City, Pages */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Editorial
              </label>
              <input
                type="text"
                value={formData.publisher ?? ''}
                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. Fondo Editorial UNIFÉ"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Ciudad / País
              </label>
              <input
                type="text"
                value={formData.city ?? ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. Lima"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Páginas / Extensión
              </label>
              <input
                type="text"
                value={formData.pages ?? ''}
                onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. 267 h., 450 p."
              />
            </div>
          </div>

          {/* ISBN and Degree */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                ISBN / Identificador
              </label>
              <input
                type="text"
                value={formData.isbn ?? ''}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. 978-612-4034-12-3"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Grado Académico / Título Obtenido
              </label>
              <input
                type="text"
                value={formData.degree ?? ''}
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. Licenciada en Psicología (Tesis Lic. UNIFÉ)"
              />
            </div>
          </div>

          {/* MARC 502 Dissertation Note & Advisor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Campo MARC 502 (Nota de Tesis / Grado)
              </label>
              <input
                type="text"
                value={formData.marc502 ?? ''}
                onChange={(e) => setFormData({ ...formData, marc502: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. Tesis (Lic.) -- UNIFÉ. Facultad de Psicología, 1985."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Asesor(a) de Tesis
              </label>
              <input
                type="text"
                value={formData.advisor ?? ''}
                onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
                placeholder="ej. Dr. Morales Rivera, Carlos"
              />
            </div>
          </div>

          {/* Descriptors */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Descriptores / Materias (Keywords)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={descriptorInput ?? ''}
                onChange={(e) => setDescriptorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDescriptor();
                  }
                }}
                className="flex-1 bg-white border border-gray-300 rounded-lg p-2 text-sm uppercase"
                placeholder="Añadir descriptor (ej. PSICOLOGÍA ORGANIZACIONAL)..."
              />
              <button
                type="button"
                onClick={handleAddDescriptor}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-gray-50 border border-gray-200 rounded-lg">
              {formData.descriptors && formData.descriptors.length > 0 ? (
                formData.descriptors.map((desc, idx) => (
                  <span
                    key={idx}
                    className="bg-white text-slate-800 border border-[#facc15] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{desc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDescriptor(idx)}
                      className="text-gray-400 hover:text-red-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">No hay descriptores asignados</span>
              )}
            </div>
          </div>

          {/* Índice / Contenido */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Índice (Capítulos / Contenido)
            </label>
            <textarea
              rows={2}
              value={formData.indice ?? formData.content ?? ''}
              onChange={(e) => setFormData({ ...formData, indice: e.target.value, content: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="ej. Cap. 1: Fundamentos. Cap. 2: Metodología. Cap. 3: Resultados..."
            />
          </div>

          {/* Resumen (Summary / Abstract) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Resumen (Abstract / Sinopsis)
            </label>
            <textarea
              rows={2}
              value={formData.summary ?? ''}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm"
              placeholder="ej. Estudio enfocado en la relación existente entre necesidades individuales y oportunidades laborales..."
            />
          </div>

          {/* UNIFIED PHYSICAL COPIES / ITEMS SECTION */}
          {formData.materialType === 'Tesis digital' ? (
            <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 text-xs text-blue-900 flex items-center gap-2">
              <span className="font-bold">ℹ️ Material Digital:</span>
              <span>Las tesis digitales no cuentan con existencias físicas en estantería; su acceso se realiza directamente a través de su enlace/URL web configurado.</span>
            </div>
          ) : (
            <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00a651]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Ejemplares Físicos Unificados ({formData.copies?.length || 0})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddCopy}
                  className="bg-[#00a651] hover:bg-[#008c44] text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Ejemplar</span>
                </button>
              </div>

              <div className="space-y-2">
                {formData.copies && formData.copies.map((copy, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row items-center gap-2.5 text-xs">
                    <div className="w-full sm:w-28 shrink-0">
                      <label className="text-[10px] text-gray-500 font-bold block mb-0.5">Código Barras</label>
                      <input
                        type="text"
                        value={copy.barcode ?? ''}
                        onChange={(e) => handleUpdateCopy(idx, 'barcode', e.target.value)}
                        className="w-full border border-gray-300 rounded p-1 font-mono text-xs"
                        placeholder="Barcode"
                        required
                      />
                    </div>

                    <div className="w-full sm:w-36 shrink-0">
                      <label className="text-[10px] text-gray-500 font-bold block mb-0.5">Ubicación / Piso</label>
                      <input
                        type="text"
                        value={copy.location ?? ''}
                        onChange={(e) => handleUpdateCopy(idx, 'location', e.target.value)}
                        className="w-full border border-gray-300 rounded p-1 text-xs"
                        placeholder="ej. Piso1, Sala Posgrado"
                        required
                      />
                    </div>

                    <div className="flex-1 w-full">
                      <label className="text-[10px] text-gray-500 font-bold block mb-0.5">Nota Pública / Condición</label>
                      <input
                        type="text"
                        value={copy.publicNote ?? ''}
                        onChange={(e) => handleUpdateCopy(idx, 'publicNote', e.target.value)}
                        className="w-full border border-gray-300 rounded p-1 text-xs"
                        placeholder="ej. Lectura en sala, Préstamo domicilio"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCopy(idx)}
                      disabled={formData.copies!.length <= 1}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer self-end sm:self-center"
                      title="Eliminar este ejemplar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-lg bg-[#00a651] hover:bg-[#008c44] text-white text-xs font-bold shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Registro MFN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
