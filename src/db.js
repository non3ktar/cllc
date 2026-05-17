import Dexie from 'dexie';

// Criação do banco de dados IndexedDB via Dexie.js
export const db = new Dexie('CLLCPainelLeitura');

// Definição do esquema das tabelas (v2 com logs de acesso)
db.version(2).stores({
  reviews: '++id, bookId, studentName, rating, reviewText, date',
  progress: 'bookId, currentPage, totalPages, status, lastUpdated',
  booksMeta: 'bookId, driveId, audioUrl',
  accessLogs: '++id, bookId, studentName, studentGrade, bookTitle, accessType, timestamp'
});
