import Dexie from 'dexie';

// Criação do banco de dados IndexedDB via Dexie.js
export const db = new Dexie('CLLCPainelLeitura');

// Definição do esquema das tabelas (v3 com livros personalizados)
db.version(3).stores({
  reviews: '++id, bookId, studentName, rating, reviewText, date',
  progress: 'bookId, currentPage, totalPages, status, lastUpdated',
  booksMeta: 'bookId, driveId, audioUrl',
  accessLogs: '++id, bookId, studentName, studentGrade, bookTitle, accessType, timestamp',
  customBooks: 'id, title, author, grade, genre'
});
