import Dexie from 'dexie';

// Criação do banco de dados IndexedDB via Dexie.js
export const db = new Dexie('CLLCPainelLeitura');

// Definição do esquema das tabelas (v1 + tabela booksMeta)
db.version(1).stores({
  reviews: '++id, bookId, studentName, rating, reviewText, date',
  progress: 'bookId, currentPage, totalPages, status, lastUpdated',
  booksMeta: 'bookId, driveId, audioUrl'
});
