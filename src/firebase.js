import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let firebaseApp = null;
let firestoreDb = null;

// 1. Tenta buscar credenciais das variáveis de ambiente (.env do Vite)
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const hasEnvConfig = envConfig.apiKey && envConfig.projectId;

// 2. Tenta buscar credenciais salvas dinamicamente no navegador (inseridas pelo Professor no Painel)
const getSavedConfig = () => {
  try {
    const saved = localStorage.getItem('cllc_firebase_config');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const activeConfig = hasEnvConfig ? envConfig : getSavedConfig();

// 3. Inicializa o Firebase se houver alguma configuração válida
if (activeConfig && activeConfig.apiKey && activeConfig.projectId) {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(activeConfig);
    } else {
      firebaseApp = getApp();
    }
    firestoreDb = getFirestore(firebaseApp);
    console.log("🔥 Firebase inicializado com sucesso!");
  } catch (e) {
    console.error("❌ Falha ao inicializar o Firebase:", e);
  }
}

export { firebaseApp, firestoreDb };

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
