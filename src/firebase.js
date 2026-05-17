import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

let firebaseApp = null;
let firestoreDb = null;
let auth = null;

// 1. Configuração Fixa (Embutida no código-fonte para acesso imediato dos estudantes)
const fixedConfig = {
  apiKey: "AIzaSyDbfVyatzjMcs7FOZppCQpmCKDCUfeImE8",
  authDomain: "cllc-40be0.firebaseapp.com",
  projectId: "cllc-40be0",
  storageBucket: "cllc-40be0.firebasestorage.app",
  messagingSenderId: "847588898824",
  appId: "1:847588898824:web:1342d445f0fde8ef6a79bd"
};

const hasFixedConfig = fixedConfig.apiKey && fixedConfig.projectId;

// 2. Tenta buscar credenciais salvas dinamicamente no navegador
const getSavedConfig = () => {
  try {
    const saved = localStorage.getItem('cllc_firebase_config');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const activeConfig = hasFixedConfig ? fixedConfig : getSavedConfig();

// 3. Inicializa o Firebase se houver alguma configuração válida
if (activeConfig && activeConfig.apiKey && activeConfig.projectId) {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(activeConfig);
    } else {
      firebaseApp = getApp();
    }
    firestoreDb = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    console.log("🔥 Firebase inicializado com sucesso!");
  } catch (e) {
    console.error("❌ Falha ao inicializar o Firebase:", e);
  }
}

export { firebaseApp, firestoreDb, auth };

// Função auxiliar para verificar se o Firebase está ativo e conectado
export const isFirebaseActive = () => {
  return firestoreDb !== null;
};

// Função para o professor salvar a configuração do Firebase via Painel de Controle
export const saveFirebaseConfig = (config) => {
  try {
    localStorage.setItem('cllc_firebase_config', JSON.stringify(config));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// Função para limpar configuração e voltar ao modo Offline
export const clearFirebaseConfig = () => {
  localStorage.removeItem('cllc_firebase_config');
};
