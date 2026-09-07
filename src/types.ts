export interface ItemCopy {
  barcode: string;
  location: string;
  callNumber?: string;
  volume?: string;
  tome?: string;
  copyNumber?: number | string;
  publicNote?: string;
  status?: string;
}

export interface BibliographicRecord {
  id: string;
  mfn: string | number;
  itemNumber?: number;
  materialType: string;
  title: string;
  author: string;
  year: number | string;
  city?: string;
  publisher?: string;
  pages?: string;
  classification: string;
  descriptors: string[];
  barcode: string;
  location: string;
  copies?: ItemCopy[];
  summary?: string;
  content?: string;
  indice?: string;
  url?: string;
  isbn?: string;
  advisor?: string;
  degree?: string;
  marc502?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export type SearchScope =
  | 'general'
  | 'title'
  | 'author'
  | 'descriptors'
  | 'classification'
  | 'barcode'
  | 'mfn'
  | 'year';

export interface ColumnMapping {
  mfn?: string;
  title: string;
  author: string;
  materialType: string;
  year: string;
  classification: string;
  descriptors: string;
  barcode: string;
  location: string;
  city?: string;
  pages?: string;
  publisher?: string;
  summary?: string;
  content?: string;
  indice?: string;
  url?: string;
  isbn?: string;
  advisor?: string;
  degree?: string;
  marc502?: string;
  publicNote?: string;
  volume?: string;
  tome?: string;
}

export const OFFICIAL_MATERIAL_TYPES = [
  'Libro impreso',
  'Libro Posgrado',
  'Referencia',
  'Tesis digital',
  'Tesis impresa',
  'Test Psicológico',
] as const;

export type OfficialMaterialType = (typeof OFFICIAL_MATERIAL_TYPES)[number];

export const DEFAULT_MATERIAL_TYPES = [
  'TODOS',
  'Libro impreso',
  'Libro Posgrado',
  'Referencia',
  'Tesis digital',
  'Tesis impresa',
  'Test Psicológico',
] as const;
