import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { booksData } from './booksData';
import { 
  isFirebaseActive, firestoreDb, saveFirebaseConfig, clearFirebaseConfig, auth 
} from './firebase';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, addDoc, onSnapshot, doc, setDoc, deleteDoc 
} from 'firebase/firestore';
import { 
  Search, Book, BookOpen, Star, Plus, User, Award, 
  Download, Trash2, BookMarked, Filter, Clock, 
  CheckCircle2, ChevronRight, FileText, Settings, 
  Heart, Sparkles, Clipboard, Volume2, VolumeX,
  Play, Pause, SkipForward, FastForward, RotateCcw, X, Cloud, CloudOff, Globe,
  Eye, Activity
} from 'lucide-react';

export default function App() {
  // --- Estados do Aplicativo ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeTab, setActiveTab] = useState('estudante'); // 'estudante' | 'professor'
  
  // Estados da Ficha de Leitura (Modal)
  const [modalTab, setModalTab] = useState('progresso'); // 'progresso' | 'resenha' | 'feed'
  const [studentName, setStudentName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  
  const [currentPage, setCurrentPage] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [readingStatus, setReadingStatus] = useState('Quero Ler');

  // Estados do Leitor de PDF (Google Drive) e Audiobook
  const [readingBookDrive, setReadingBookDrive] = useState(null); // Livro aberto no leitor PDF do Drive
  
  // Estado do Player de Áudio Flutuante (Audiolivro)
  const [audioBook, setAudioBook] = useState(null); // Livro em reprodução
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const audioRef = useRef(null);

  // Estados do TTS (Speech Synthesis)
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsBookId, setTtsBookId] = useState(null);

  // Estados da Configuração do Firebase no Painel
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [firebaseConnected, setFirebaseConnected] = useState(isFirebaseActive());

  // Estados de edição de Meta do Livro (Professor)
  const [editingBookMetaId, setEditingBookMetaId] = useState(null);
  const [tempDriveId, setTempDriveId] = useState('');
  const [tempAudioUrl, setTempAudioUrl] = useState('');
  
  // --- Estados de Autenticação do Professor (Gatekeeper) ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [localPasscode, setLocalPasscode] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Estados de Perfil do Estudante e Logs ---
  const [studentProfileName, setStudentProfileName] = useState(localStorage.getItem('cllc_student_name') || '');
  const [studentProfileGrade, setStudentProfileGrade] = useState(localStorage.getItem('cllc_student_grade') || '');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [tempProfileName, setTempProfileName] = useState('');
  const [tempProfileGrade, setTempProfileGrade] = useState('6º');
  const [accessFilterSearch, setAccessFilterSearch] = useState('');
  const [accessFilterGrade, setAccessFilterGrade] = useState('');
  const [accessFilterType, setAccessFilterType] = useState('');

  // Alertas temporários
  const [toast, setToast] = useState(null);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- CONSULTAS DEXIE LIVE ---
  const reviews = useLiveQuery(() => db.reviews.toArray()) || [];
  const progressList = useLiveQuery(() => db.progress.toArray()) || [];
  const booksMetaList = useLiveQuery(() => db.booksMeta.toArray()) || [];
  const accessLogsList = useLiveQuery(() => db.accessLogs.toArray()) || [];

  // Mapeamentos práticos de dados locais
  const progressMap = useMemo(() => {
    const map = {};
    progressList.forEach(p => {
      map[p.bookId] = p;
    });
    return map;
  }, [progressList]);

  const booksMetaMap = useMemo(() => {
    const map = {};
    booksMetaList.forEach(m => {
      map[m.bookId] = m;
    });
    return map;
  }, [booksMetaList]);

  const filteredAccessLogs = useMemo(() => {
    return accessLogsList
      .filter(log => {
        const matchesSearch = !accessFilterSearch.trim() || 
          log.studentName.toLowerCase().includes(accessFilterSearch.toLowerCase()) || 
          log.bookTitle.toLowerCase().includes(accessFilterSearch.toLowerCase());
        const matchesGrade = !accessFilterGrade || log.studentGrade === accessFilterGrade;
        const matchesType = !accessFilterType || log.accessType === accessFilterType;
        return matchesSearch && matchesGrade && matchesType;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [accessLogsList, accessFilterSearch, accessFilterGrade, accessFilterType]);

  // --- ESTATÍSTICAS DE ACESSO AOS LIVROS ---
  const mostActiveGrade = useMemo(() => {
    if (accessLogsList.length === 0) return 'Nenhum';
    const counts = {};
    accessLogsList.forEach(log => {
      counts[log.studentGrade] = (counts[log.studentGrade] || 0) + 1;
    });
    return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0] + ' Ano';
  }, [accessLogsList]);

  const mostAccessedBook = useMemo(() => {
    if (accessLogsList.length === 0) return 'Nenhum';
    const counts = {};
    accessLogsList.forEach(log => {
      counts[log.bookTitle] = (counts[log.bookTitle] || 0) + 1;
    });
    return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }, [accessLogsList]);

  // --- SINCRONIZAÇÃO EM TEMPO REAL COM FIREBASE (FIRESTORE) ---
  useEffect(() => {
    if (!isFirebaseActive()) {
      console.log("ℹ️ Executando em modo 100% Offline (Dexie Local).");
      return;
    }

    console.log("🔥 Conectando ao Firebase Firestore para sincronização...");

    // 1. Sincronizar Resenhas do Firestore para o Dexie
    const unsubscribeReviews = onSnapshot(collection(firestoreDb, 'reviews'), (snapshot) => {
      const remoteReviews = [];
      snapshot.forEach((doc) => {
        remoteReviews.push({ id: doc.id, ...doc.data() });
      });
      
      db.reviews.clear().then(() => {
        db.reviews.bulkPut(remoteReviews);
      });
    }, (error) => {
      console.error("Erro no sync do Firebase:", error);
    });

    // 2. Sincronizar Metadados de Livros (Drive/Áudio) do Firestore para o Dexie
    const unsubscribeMeta = onSnapshot(collection(firestoreDb, 'booksMeta'), (snapshot) => {
      const remoteMeta = [];
      snapshot.forEach((doc) => {
        remoteMeta.push({ bookId: parseInt(doc.id), ...doc.data() });
      });
      
      db.booksMeta.clear().then(() => {
        db.booksMeta.bulkPut(remoteMeta);
      });
    });

    // 3. Sincronizar Logs de Acesso do Firestore para o Dexie
    const unsubscribeAccessLogs = onSnapshot(collection(firestoreDb, 'accessLogs'), (snapshot) => {
      const remoteLogs = [];
      snapshot.forEach((doc) => {
        remoteLogs.push({ id: doc.id, ...doc.data() });
      });
      
      db.accessLogs.clear().then(() => {
        db.accessLogs.bulkPut(remoteLogs);
      });
    }, (error) => {
      console.error("Erro no sync de logs de acesso:", error);
    });

    return () => {
      unsubscribeReviews();
      unsubscribeMeta();
      unsubscribeAccessLogs();
    };
  }, [firebaseConnected]);

  // --- GERENCIAMENTO DE ÁUDIO (AUDIOBOOK) ---
  useEffect(() => {
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.play().catch(e => {
          console.error("Erro de reprodução de áudio:", e);
          setAudioPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [audioPlaying, audioBook]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = audioSpeed;
    }
  }, [audioSpeed]);

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleAudioSeek = (e) => {
    const val = parseFloat(e.target.value);
    setAudioCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleStartAudioBook = (book, url) => {
    // Parar qualquer TTS ativo
    handleStopSpeak();
    
    logBookAccess(book, 'Audiobook').then((logged) => {
      if (logged !== false) {
        setAudioBook(book);
        setAudioPlaying(true);
        setAudioCurrentTime(0);
        setAudioSpeed(1);
        triggerToast(`Iniciando audiolivro: ${book.title} 🎧`);
      }
    });
  };

  const handleTogglePlayAudio = () => {
    setAudioPlaying(!audioPlaying);
  };

  const handleCloseAudioPlayer = () => {
    setAudioPlaying(false);
    setAudioBook(null);
    setAudioCurrentTime(0);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- GERENCIAMENTO DE NARRADOR DE TEXTO (TTS) ---
  const handleSpeak = (book) => {
    // Parar áudio se estiver tocando
    handleCloseAudioPlayer();

    if (ttsSpeaking && ttsBookId === book.id) {
      handleStopSpeak();
      return;
    }

    window.speechSynthesis.cancel();
    
    const textToSpeak = `Livro: ${book.title}. Escrito por ${book.author}. Gênero: ${book.genre}. Foco Pedagógico do Clube de Letramento: ${book.focus}.`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    
    utterance.onend = () => {
      setTtsSpeaking(false);
      setTtsBookId(null);
    };

    utterance.onerror = () => {
      setTtsSpeaking(false);
      setTtsBookId(null);
    };

    setTtsSpeaking(true);
    setTtsBookId(book.id);
    window.speechSynthesis.speak(utterance);
    triggerToast(`Iniciando narração assistiva para ${book.title} 🔊`);
  };

  const handleStopSpeak = () => {
    window.speechSynthesis.cancel();
    setTtsSpeaking(false);
    setTtsBookId(null);
  };

  // --- FILTROS E BUSCA ---
  const filteredBooks = useMemo(() => {
    return booksData.filter(book => {
      const matchesGrade = selectedGrade === 'Todos' || book.grade === selectedGrade;
      
      const normSearch = searchTerm.toLowerCase();
      const matchesSearch = 
        book.title.toLowerCase().includes(normSearch) || 
        book.author.toLowerCase().includes(normSearch) ||
        book.genre.toLowerCase().includes(normSearch);

      const prog = progressMap[book.id];
      const currentStatus = prog ? prog.status : 'Não Iniciado';
      const matchesStatus = selectedStatus === 'Todos' || currentStatus === selectedStatus;

      return matchesGrade && matchesSearch && matchesStatus;
    });
  }, [searchTerm, selectedGrade, selectedStatus, progressMap]);

  // --- ESTATÍSTICAS GERAIS ---
  const stats = useMemo(() => {
    const totalBooks = booksData.length;
    const lidos = progressList.filter(p => p.status === 'Lido').length;
    const lendo = progressList.filter(p => p.status === 'Lendo').length;
    const queroLer = progressList.filter(p => p.status === 'Quero Ler').length;
    const totalReviews = reviews.length;

    return { totalBooks, lidos, lendo, queroLer, totalReviews };
  }, [progressList, reviews]);

  // --- SALVAR/EXCLUIR PROGRESSO E RESENHAS ---
  
  const handleOpenBookModal = (book) => {
    setSelectedBook(book);
    setModalTab('progresso');
    
    const existingProgress = progressMap[book.id];
    if (existingProgress) {
      setCurrentPage(existingProgress.currentPage || '');
      setTotalPages(existingProgress.totalPages || '');
      setReadingStatus(existingProgress.status || 'Quero Ler');
    } else {
      setCurrentPage('');
      setTotalPages('');
      setReadingStatus('Quero Ler');
    }

    setStudentName('');
    setRating(5);
    setReviewText('');
  };

  const handleSaveProgress = async (e) => {
    e.preventDefault();
    if (!selectedBook) return;

    const progressData = {
      bookId: selectedBook.id,
      currentPage: parseInt(currentPage) || 0,
      totalPages: parseInt(totalPages) || 0,
      status: readingStatus,
      lastUpdated: Date.now()
    };

    try {
      if (isFirebaseActive()) {
        await setDoc(doc(firestoreDb, 'progress', selectedBook.id.toString()), progressData);
      }
      await db.progress.put(progressData);
      triggerToast('Progresso de leitura atualizado! 📈');
      setSelectedBook(null);
    } catch (err) {
      console.error(err);
      triggerToast('Erro ao salvar progresso.');
    }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedBook || !studentName.trim() || !reviewText.trim()) {
      triggerToast('Por favor, preencha o seu nome e o texto da resenha.');
      return;
    }

    const reviewData = {
      bookId: selectedBook.id,
      studentName: studentName.trim(),
      rating,
      reviewText: reviewText.trim(),
      date: Date.now()
    };

    try {
      if (isFirebaseActive()) {
        await addDoc(collection(firestoreDb, 'reviews'), reviewData);
      } else {
        await db.reviews.add(reviewData);
      }

      // Se escreveu resenha, atualiza o status de progresso para Lido automaticamente
      const currentProg = progressMap[selectedBook.id];
      const finalProgress = {
        bookId: selectedBook.id,
        currentPage: currentProg?.totalPages || 100,
        totalPages: currentProg?.totalPages || 100,
        status: 'Lido',
        lastUpdated: Date.now()
      };

      if (isFirebaseActive()) {
        await setDoc(doc(firestoreDb, 'progress', selectedBook.id.toString()), finalProgress);
      }
      await db.progress.put(finalProgress);

      triggerToast('Resenha salva com sucesso! Parabéns! 🌟');
      setStudentName('');
      setReviewText('');
      setRating(5);
      setModalTab('feed');
    } catch (err) {
      console.error(err);
      triggerToast('Erro ao salvar resenha.');
    }
  };

  const handleDeleteReview = async (id) => {
    if (confirm('Deseja realmente excluir esta resenha?')) {
      try {
        if (isFirebaseActive() && typeof id === 'string') {
          await deleteDoc(doc(firestoreDb, 'reviews', id));
        } else {
          await db.reviews.delete(id);
        }
        triggerToast('Resenha excluída.');
      } catch (e) {
        console.error(e);
        triggerToast('Erro ao excluir resenha.');
      }
    }
  };

  // --- CONFIGURAÇÃO MANUAL E SALVAMENTO DE DRIVE/AUDIO POR LIVRO (PROFESSOR) ---
  
  const handleStartEditMeta = (book) => {
    setEditingBookMetaId(book.id);
    const currentMeta = booksMetaMap[book.id];
    setTempDriveId(currentMeta?.driveId || '');
    setTempAudioUrl(currentMeta?.audioUrl || '');
  };

  const handleSaveBookMeta = async (bookId) => {
    const metaData = {
      driveId: tempDriveId.trim(),
      audioUrl: tempAudioUrl.trim()
    };

    try {
      if (isFirebaseActive()) {
        await setDoc(doc(firestoreDb, 'booksMeta', bookId.toString()), metaData);
      }
      await db.booksMeta.put({ bookId, ...metaData });
      triggerToast('Configurações de nuvem do livro salvas! 💾');
      setEditingBookMetaId(null);
    } catch (e) {
      console.error(e);
      triggerToast('Erro ao salvar metadados do livro.');
    }
  };

  // --- SALVAR CONFIGURAÇÃO DO FIREBASE (PROFESSOR) ---
  const handleSaveFirebase = (e) => {
    e.preventDefault();
    if (!fbApiKey.trim() || !fbProjectId.trim()) {
      triggerToast('Por favor, preencha a API Key e o Project ID.');
      return;
    }

    const config = {
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      authDomain: fbAuthDomain.trim() || `${fbProjectId.trim()}.firebaseapp.com`,
      appId: fbAppId.trim()
    };

    const success = saveFirebaseConfig(config);
    if (success) {
      setFirebaseConnected(true);
      triggerToast('Conectando ao Firebase... O aplicativo irá recarregar! 🔥');
      setTimeout(() => window.location.reload(), 2000);
    } else {
      triggerToast('Erro ao salvar configurações.');
    }
  };

  const handleDisconnectFirebase = () => {
    if (confirm('Deseja desconectar da nuvem e voltar ao modo 100% offline local?')) {
      clearFirebaseConfig();
      setFirebaseConnected(false);
      triggerToast('Desconectado! O aplicativo irá recarregar...');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  // --- LOGIN E LOGOUT DO PROFESSOR (AUTH GATEKEEPER) ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminLoggedIn(true);
      } else {
        setIsAdminLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleFirebaseLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    if (!auth) {
      setLoginError('Serviço de autenticação não inicializado.');
      return;
    }

    signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword)
      .then((userCredential) => {
        setIsAdminLoggedIn(true);
        setAdminEmail('');
        setAdminPassword('');
        setLoginError('');
        triggerToast('Painel do Professor desbloqueado com sucesso! 🔓');
      })
      .catch((error) => {
        console.error("Erro no login:", error);
        let errorMsg = 'Falha ao autenticar. Verifique o email e senha.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          errorMsg = 'E-mail ou senha incorretos.';
        } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'Formato de e-mail inválido.';
        }
        setLoginError(errorMsg);
      });
  };

  const handleLocalPasscodeLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    // Senha local padrão para modo offline
    if (localPasscode === 'cllc2026') {
      setIsAdminLoggedIn(true);
      setLocalPasscode('');
      setLoginError('');
      triggerToast('Acesso local liberado com sucesso! 🔓');
    } else {
      setLoginError('Código de acesso local incorreto. Use a senha padrão cllc2026.');
    }
  };

  const handleLogout = () => {
    if (auth && isFirebaseActive()) {
      signOut(auth)
        .then(() => {
          setIsAdminLoggedIn(false);
          setActiveTab('estudante');
          triggerToast('Sessão encerrada e painel bloqueado.');
        })
        .catch((err) => {
          console.error("Erro ao deslogar:", err);
          setIsAdminLoggedIn(false);
          setActiveTab('estudante');
        });
    } else {
      setIsAdminLoggedIn(false);
      setActiveTab('estudante');
      triggerToast('Painel bloqueado com segurança.');
    }
  };

  // --- GERENCIAMENTO DE PERFIL DO ESTUDANTE E LOGS DE ACESSO ---
  const handleOpenEditProfile = () => {
    setTempProfileName(studentProfileName);
    setTempProfileGrade(studentProfileGrade || '6º');
    setPendingAction(null);
    setShowProfileModal(true);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!tempProfileName.trim()) {
      triggerToast('Por favor, digite seu nome completo.');
      return;
    }

    const name = tempProfileName.trim();
    const grade = tempProfileGrade;

    localStorage.setItem('cllc_student_name', name);
    localStorage.setItem('cllc_student_grade', grade);

    setStudentProfileName(name);
    setStudentProfileGrade(grade);
    setShowProfileModal(false);

    triggerToast(`Olá, ${name}! Seu perfil de leitura foi salvo! 👤`);

    // Se houver uma ação pendente (leitura, download, audiobook), executa-a agora!
    if (pendingAction) {
      const { book, accessType } = pendingAction;
      setPendingAction(null);
      
      logBookAccessDirect(book, accessType, name, grade).then((logged) => {
        if (logged) {
          if (accessType === 'Leitura (Drive)') {
            const drivePdfId = book.driveId || booksMetaMap[book.id]?.driveId;
            setReadingBookDrive({ ...book, driveId: drivePdfId });
          } else if (accessType === 'Download (EPUB)') {
            const localEpub = book.files?.find(f => f.toLowerCase().endsWith('.epub'));
            const driveEpubId = book.driveEpubId;
            const url = localEpub ? `/livros/${encodeURIComponent(localEpub)}` : `https://drive.google.com/file/d/${driveEpubId}/view?usp=drivesdk`;
            window.open(url, '_blank', 'noopener,noreferrer');
          } else if (accessType === 'Audiobook') {
            const audioId = book.audioId || booksMetaMap[book.id]?.audioUrl;
            setAudioBook({
              ...book,
              audioUrl: book.audioUrl || `https://drive.google.com/file/d/${audioId}/view?usp=drivesdk`
            });
            setAudioPlaying(true);
          }
        }
      });
    }
  };

  const logBookAccessDirect = async (book, accessType, name, grade) => {
    const logEntry = {
      bookId: book.id,
      bookTitle: book.title,
      studentName: name,
      studentGrade: grade,
      accessType: accessType,
      timestamp: Date.now()
    };

    try {
      await db.accessLogs.add(logEntry);
      if (isFirebaseActive() && firestoreDb) {
        await addDoc(collection(firestoreDb, 'accessLogs'), logEntry);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const logBookAccess = async (book, accessType) => {
    if (!studentProfileName || !studentProfileGrade) {
      setTempProfileName('');
      setTempProfileGrade('6º');
      setPendingAction({ book, accessType });
      setShowProfileModal(true);
      return false;
    }

    const logEntry = {
      bookId: book.id,
      bookTitle: book.title,
      studentName: studentProfileName,
      studentGrade: studentProfileGrade,
      accessType: accessType,
      timestamp: Date.now()
    };

    try {
      await db.accessLogs.add(logEntry);
      if (isFirebaseActive() && firestoreDb) {
        await addDoc(collection(firestoreDb, 'accessLogs'), logEntry);
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Exportar dados locais
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({ reviews, progress: progressList, booksMeta: booksMetaList }, null, 2)
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `CLLC_Relatorio_${new Date().toLocaleDateString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerToast('Relatório exportado! 📥');
  };

  const copyToClipboard = (filename) => {
    navigator.clipboard.writeText(filename);
    triggerToast(`Nome copiado: ${filename} 📋`);
  };

  // Estilos de série
  const getGradeStyle = (grade) => {
    switch (grade) {
      case '6º': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case '7º': return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case '8º': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30';
      case '9º': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  // Badge de Status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Lido':
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lido
          </span>
        );
      case 'Lendo':
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Lendo
          </span>
        );
      case 'Quero Ler':
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <BookMarked className="w-3.5 h-3.5" /> Quero Ler
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-gray-500/15 text-gray-400 border border-gray-500/20">
            <Book className="w-3.5 h-3.5" /> Não Iniciado
          </span>
        );
    }
  };

  const bookReviews = useMemo(() => {
    if (!selectedBook) return [];
    return reviews.filter(r => r.bookId === selectedBook.id).sort((a,b) => b.date - a.date);
  }, [reviews, selectedBook]);

  return (
    <div className="min-h-screen bg-darkBg text-gray-100 flex flex-col relative overflow-hidden select-none pb-28">
      
      {/* --- Efeitos de Fundo Galáctico --- */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-accentBlue/10 blur-[80px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accentPurple/10 blur-[100px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-pink-500/5 blur-[90px] animate-pulse-slow pointer-events-none"></div>

      {/* --- AUDIO TAG OCULTA PARA O PLAYER --- */}
      {audioBook && (
        <audio 
          ref={audioRef}
          src={audioBook.audioUrl}
          onTimeUpdate={handleAudioTimeUpdate}
          onLoadedMetadata={handleAudioLoadedMetadata}
          onEnded={() => setAudioPlaying(false)}
        />
      )}

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 glass-panel border border-accentBlue/30 shadow-lg shadow-accentBlue/15 px-6 py-4 rounded-xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-accentBlue" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* --- HEADER PRINCIPAL --- */}
      <header className="w-full max-w-7xl mx-auto px-4 pt-8 pb-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">📚</span>
              <span className="text-xs uppercase tracking-widest text-accentBlue font-bold bg-accentBlue/10 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                CLLC
              </span>
              
              {/* Badge indicando se está Conectado na Nuvem ou Local */}
              {firebaseConnected ? (
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Cloud className="w-3 h-3" /> Nuvem Ativa
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-widest bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CloudOff className="w-3 h-3" /> Offline Local
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white m-0">
              Painel Literário <span className="bg-gradient-to-r from-accentBlue to-accentPurple bg-clip-text text-transparent">CLLC</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Explore o acervo clássico, registre leituras, ouça audiobooks e escreva resenhas de forma compartilhada.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start md:self-center">
            {/* Badge de Identificação do Perfil do Aluno */}
            {activeTab === 'estudante' && (
              <button 
                onClick={handleOpenEditProfile}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800/80 border border-gray-800 hover:border-accentBlue/30 transition-all text-xs font-semibold text-white shadow-inner"
                title="Editar seus dados de leitor"
              >
                <div className="w-5 h-5 rounded-full bg-accentBlue/20 flex items-center justify-center text-accentBlue">
                  <User className="w-3 h-3" />
                </div>
                <span>
                  {studentProfileName ? (
                    <>Olá, <strong className="text-accentBlue">{studentProfileName}</strong> <span className="text-[10px] text-accentPurple bg-accentPurple/10 px-1.5 py-0.5 rounded border border-accentPurple/25 font-bold ml-1">{studentProfileGrade} Ano</span></>
                  ) : (
                    <span className="text-gray-400 italic">👤 Identificar-se (Gravar Leitura)</span>
                  )}
                </span>
                <span className="text-gray-500 hover:text-white ml-0.5">✎</span>
              </button>
            )}

            <div className="flex bg-gray-900/60 p-1.5 rounded-xl border border-gray-800">
              <button 
                onClick={() => setActiveTab('estudante')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'estudante' ? 'bg-gradient-to-r from-accentBlue to-accentPurple text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                <User className="w-4 h-4" /> Painel do Estudante
              </button>
              <button 
                onClick={() => setActiveTab('professor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'professor' ? 'bg-gradient-to-r from-accentBlue to-accentPurple text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                <Settings className="w-4 h-4" /> Área do Professor
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- DASHBOARD PRINCIPAL --- */}
      <main className="w-full max-w-7xl mx-auto px-4 pt-6 relative z-10 flex-1">
        
        {/* --- CARDS DE ESTATÍSTICA (Apenas na aba Estudante) --- */}
        {activeTab === 'estudante' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="glass-panel p-4 rounded-2xl flex flex-col justify-center border-l-4 border-l-sky-500">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Acervo Total</span>
              <span className="text-2xl font-bold text-white mt-1">{stats.totalBooks} obras</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col justify-center border-l-4 border-l-emerald-500">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Lidos</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1">{stats.lidos} livros</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col justify-center border-l-4 border-l-amber-500">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Lendo Atualmente</span>
              <span className="text-2xl font-bold text-amber-300 mt-1">{stats.lendo}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl flex flex-col justify-center border-l-4 border-l-fuchsia-500">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Quero Ler</span>
              <span className="text-2xl font-bold text-fuchsia-400 mt-1">{stats.queroLer}</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl col-span-2 md:col-span-1 flex flex-col justify-center border-l-4 border-l-accentBlue bg-gradient-to-br from-accentBlue/5 to-transparent">
              <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Resenhas Criadas</span>
              <span className="text-2xl font-bold text-accentBlue mt-1">{stats.totalReviews} 🌟</span>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* === ABA ESTUDANTE: NAVEGAÇÃO E LISTA === */}
        {/* ======================================= */}
        {activeTab === 'estudante' && (
          <>
            {/* --- CONTROLES DE FILTRO E BUSCA --- */}
            <div className="glass-panel p-5 rounded-2xl mb-8 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Campo de Busca */}
                <div className="relative w-full md:w-96">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Buscar título, autor ou gênero..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-3.5 top-3 text-xs text-gray-400 hover:text-white"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Filtro por Status */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mr-1">Status:</span>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl glass-input font-semibold"
                  >
                    <option value="Todos">Todos os Status</option>
                    <option value="Lido">Lido</option>
                    <option value="Lendo">Lendo</option>
                    <option value="Quero Ler">Quero Ler</option>
                    <option value="Não Iniciado">Não Iniciado</option>
                  </select>
                </div>

              </div>

              {/* Tabs por Faixa Etária/Série */}
              <div className="border-t border-gray-800 pt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold self-center mr-2">Filtrar por Série:</span>
                {['Todos', '6º', '7º', '8º', '9º'].map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setSelectedGrade(grade)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${selectedGrade === grade ? 'bg-gradient-to-r from-accentBlue/20 to-accentPurple/20 text-accentBlue border-accentBlue/50 shadow-md' : 'bg-transparent text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'}`}
                  >
                    {grade === 'Todos' ? 'Mostrar Todas' : `${grade} Ano`}
                  </button>
                ))}
              </div>
            </div>

            {/* --- LISTA DE LIVROS --- */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Book className="w-5 h-5 text-accentBlue" />
                Obras Disponíveis
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-800 text-gray-400">{filteredBooks.length}</span>
              </h2>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-2xl">
                <span className="text-4xl">📚</span>
                <h3 className="text-lg font-bold text-white mt-4">Nenhuma obra encontrada</h3>
                <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
                  Tente alterar os termos de busca ou filtros de série para encontrar as leituras desejadas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const prog = progressMap[book.id];
                  const meta = booksMetaMap[book.id];
                  const hasReview = reviews.some(r => r.bookId === book.id);
                  const localPdf = book.files?.find(f => f.toLowerCase().endsWith('.pdf'));
                  const localEpub = book.files?.find(f => f.toLowerCase().endsWith('.epub'));
                  
                  return (
                    <div 
                      key={book.id}
                      onClick={() => handleOpenBookModal(book)}
                      className="glass-panel p-6 rounded-2xl glass-panel-hover flex flex-col justify-between cursor-pointer group relative overflow-hidden"
                    >
                      <div>
                        {/* Grade Badge e Status */}
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getGradeStyle(book.grade)}`}>
                            {book.grade} Ano
                          </span>
                          {getStatusBadge(prog?.status)}
                        </div>

                        {/* Title & Author */}
                        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-accentBlue transition-colors mb-1">
                          {book.title}
                        </h3>
                        <span className="text-xs text-gray-400 block mb-3">por {book.author}</span>

                        {/* Badges de Mídia Ativa (Drive/Audio) */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-900/60 text-gray-300 border border-gray-800">
                            {book.genre}
                          </span>
                          {(meta?.driveId || (localPdf && book.driveIds?.[localPdf]) || (localEpub && book.driveIds?.[localEpub])) && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-accentBlue/10 text-accentBlue border border-accentBlue/20 flex items-center gap-1" title="Disponível para leitura em nuvem via Google Drive">
                              📖 Livro em Nuvem
                            </span>
                          )}
                          {meta?.audioUrl && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20 flex items-center gap-1">
                              🎧 Audiobook
                            </span>
                          )}
                          {hasReview && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" /> Resenhado
                            </span>
                          )}
                        </div>

                        {/* Focus / Pedagogical */}
                        <p className="text-xs text-gray-400 line-clamp-2 italic mb-4">
                          "{book.focus}"
                        </p>
                      </div>

                      {/* File association details */}
                      <div className="border-t border-gray-800/80 pt-4 mt-2">
                        
                        {/* Controles de Leitura Digital e Escuta Rápida */}
                        {(() => {
                          const drivePdfId = meta?.driveId || (localPdf && book.driveIds?.[localPdf]);
                          const driveEpubId = localEpub && book.driveIds?.[localEpub];
                          
                          return (
                            <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
                              {/* Ler no Google Drive */}
                              {drivePdfId && (
                                <button 
                                  onClick={() => logBookAccess(book, 'Leitura (Drive)').then(logged => {
                                    if (logged !== false) {
                                      setReadingBookDrive({ ...book, driveId: drivePdfId });
                                    }
                                  })}
                                  className="flex-1 min-w-[90px] py-1.5 rounded-lg bg-accentBlue text-white hover:bg-fuchsia-300 hover:text-gray-950 text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-accentBlue/20"
                                  title="Ler livro online via Google Drive"
                                >
                                  <BookOpen className="w-3.5 h-3.5" /> Ler no Drive
                                </button>
                              )}

                              {/* Baixar EPUB (Drive ou Local) */}
                              {(localEpub || driveEpubId) && (
                                <button 
                                  onClick={() => logBookAccess(book, 'Download (EPUB)').then(logged => {
                                    if (logged !== false) {
                                      const url = localEpub ? `/livros/${encodeURIComponent(localEpub)}` : `https://drive.google.com/file/d/${driveEpubId}/view?usp=drivesdk`;
                                      window.open(url, '_blank', 'noopener,noreferrer');
                                    }
                                  })}
                                  className="flex-1 min-w-[90px] py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-amber-500/20 text-center"
                                  title={localEpub ? "Baixar livro local em formato EPUB" : "Acessar livro em formato EPUB no Google Drive"}
                                >
                                  📥 Baixar EPUB
                                </button>
                              )}
                              
                              {/* Ouvir Audiobook MP3 ou TTS Fallback */}
                              {meta?.audioUrl ? (
                                <button 
                                  onClick={() => handleStartAudioBook({ ...book, audioUrl: meta.audioUrl }, meta.audioUrl)}
                                  className="flex-1 min-w-[90px] py-1.5 rounded-lg bg-fuchsia-500 text-white hover:bg-fuchsia-400 text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-fuchsia-500/30"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" /> Ouvir
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleSpeak(book)}
                                  className={`flex-1 min-w-[90px] py-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${ttsBookId === book.id && ttsSpeaking ? 'bg-amber-500 text-white border-amber-500 animate-pulse' : 'bg-gray-900/60 text-gray-300 border-gray-800 hover:bg-gray-850'}`}
                                >
                                  {ttsBookId === book.id && ttsSpeaking ? (
                                    <>
                                      <VolumeX className="w-3.5 h-3.5" /> Parar
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5" /> Ouvir Resumo
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Arquivos locais:</span>
                        {book.files && book.files.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {book.files.map((file, idx) => (
                              <div 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(file); }}
                                className="flex items-center justify-between text-[11px] font-mono text-gray-300 bg-gray-950/40 px-2 py-1 rounded hover:bg-gray-950 hover:text-white transition-colors"
                              >
                                <span className="truncate pr-2">{file}</span>
                                <Clipboard className="w-3 h-3 text-gray-500 shrink-0 group-hover:text-accentBlue" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-500 italic">Pesquisar obra pelo título</span>
                        )}
                        
                        <div className="flex items-center gap-1 text-xs text-accentBlue font-bold mt-4 justify-end">
                          Ficha de Leitura <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ======================================= */}
        {/* === ABA PROFESSOR: PAINEL DE CONTROLE === */}
        {/* ======================================= */}
        {activeTab === 'professor' && (
          !isAdminLoggedIn ? (
            /* SLEEK GLASSMORPHIC LOGIN SCREEN */
            <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto my-12 relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-accentBlue/10 blur-[80px]" />
              <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-accentPurple/10 blur-[80px]" />
              
              <div className="text-center mb-6 relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accentBlue/20">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white leading-tight">Painel de Acesso Seguro</h3>
                <p className="text-gray-400 text-xs mt-1">Área Restrita do Professor</p>
              </div>

              {isFirebaseActive() ? (
                /* FIREBASE CLOUD LOGIN */
                <form onSubmit={handleFirebaseLogin} className="space-y-4 relative">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Email do Professor</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input 
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="exemplo@cllc.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accentBlue/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Senha de Acesso</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                        <Settings className="w-4 h-4" />
                      </span>
                      <input 
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accentBlue/50 transition-colors"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="text-rose-400 text-xs font-semibold p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      ⚠️ {loginError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-accentBlue/20"
                  >
                    🔓 Entrar no Painel Seguro
                  </button>
                </form>
              ) : (
                /* OFFLINE ACCESS WITH LOCAL PIN */
                <form onSubmit={handleLocalPasscodeLogin} className="space-y-4 relative">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-relaxed">
                    ℹ️ <strong>Modo Offline Ativo (Dexie Local).</strong> Conecte-se à internet e configure seu Firebase para segurança na nuvem. Insira a senha local temporária para configurar ou gerenciar off-line (padrão: cllc2026).
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Código de Acesso Local</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                        <Settings className="w-4 h-4" />
                      </span>
                      <input 
                        type="password"
                        required
                        value={localPasscode}
                        onChange={(e) => setLocalPasscode(e.target.value)}
                        placeholder="Senha offline"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accentBlue/50 transition-colors"
                      />
                    </div>
                  </div>

                  {loginError && (
                    <div className="text-rose-400 text-xs font-semibold p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      ⚠️ {loginError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    🔓 Acessar Painel Local
                  </button>
                </form>
              )}

              <button 
                onClick={() => setActiveTab('estudante')}
                className="w-full mt-4 py-2 text-center text-gray-400 hover:text-white transition-colors text-xs"
              >
                ← Voltar para Área do Estudante
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* TOP HEADER CONTROLS IN PANEL */}
              <div className="flex justify-between items-center bg-gray-950/40 p-4 rounded-xl border border-gray-800/60" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-gray-400 font-medium">Painel Autenticado ({isFirebaseActive() ? auth?.currentUser?.email : 'Modo Offline'})</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1"
                >
                  🔒 Bloquear Painel / Sair
                </button>
              </div>
            
            {/* --- CONFIGURAÇÕES DO FIREBASE (NUVEM DO PROFESSOR) --- */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-accentBlue" /> Sincronização em Nuvem (Firebase)
              </h3>
              <p className="text-gray-400 text-xs mb-4">
                Conecte seu painel literário a um projeto do Firebase para compartilhar resenhas e metadados de livros em tempo real em todas as salas e tablets!
              </p>

              {firebaseConnected ? (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block">Status: Conectado</span>
                    <span className="text-[11px] text-gray-300">Todas as resenhas e links digitais do acervo estão sendo salvos e atualizados em tempo real!</span>
                  </div>
                  <button
                    onClick={handleDisconnectFirebase}
                    className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors"
                  >
                    Desconectar Firebase
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveFirebase} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Firebase API Key:</label>
                    <input 
                      type="password"
                      placeholder="AIzaSy..."
                      value={fbApiKey}
                      onChange={(e) => setFbApiKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Firebase Project ID:</label>
                    <input 
                      type="text"
                      placeholder="cllc-leitura"
                      value={fbProjectId}
                      onChange={(e) => setFbProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1">Firebase App ID (Opcional):</label>
                    <input 
                      type="text"
                      placeholder="1:1234..."
                      value={fbAppId}
                      onChange={(e) => setFbAppId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-accentBlue text-white font-bold hover:bg-fuchsia-300 hover:text-gray-950 transition-all text-xs border border-accentBlue/20"
                  >
                    Conectar Firebase 🔥
                  </button>
                </form>
              )}
            </div>

            {/* --- CONTROLE DO ACERVO DIGITAL (DRIVE / AUDIOBOOKS) --- */}
            <div className="glass-panel p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-accentBlue" /> Biblioteca de Nuvem CLLC
              </h3>
              <p className="text-gray-400 text-xs mb-4">
                Associe um ID de arquivo do Google Drive (para ler PDFs diretamente no app) ou links de audiobooks em MP3 (gerados pelo seu Audio Factory) aos clássicos!
              </p>

              <div className="max-h-[50vh] overflow-y-auto border border-gray-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950/60 text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-4">Obra</th>
                      <th className="py-3 px-4">Série</th>
                      <th className="py-3 px-4">ID do Google Drive (PDF)</th>
                      <th className="py-3 px-4">Link do Audiobook (MP3)</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booksData.map((book) => {
                      const meta = booksMetaMap[book.id];
                      const isEditing = editingBookMetaId === book.id;
                      
                      return (
                        <tr key={book.id} className="border-b border-gray-800/50 hover:bg-gray-900/20 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">{book.title}</span>
                            <span className="text-[10px] text-gray-400">por {book.author}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${getGradeStyle(book.grade)}`}>
                              {book.grade} Ano
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="Pele o ID do Drive do PDF"
                                value={tempDriveId}
                                onChange={(e) => setTempDriveId(e.target.value)}
                                className="px-2 py-1 rounded glass-input text-xs w-full max-w-xs"
                              />
                            ) : (
                              meta?.driveId ? <span className="text-emerald-400">✅ {meta.driveId.slice(0,10)}...</span> : <span className="text-gray-600">Não configurado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px]">
                            {isEditing ? (
                              <input 
                                type="text"
                                placeholder="Cole o link do áudio MP3"
                                value={tempAudioUrl}
                                onChange={(e) => setTempAudioUrl(e.target.value)}
                                className="px-2 py-1 rounded glass-input text-xs w-full max-w-xs"
                              />
                            ) : (
                              meta?.audioUrl ? <span className="text-fuchsia-400 truncate block max-w-xs">✅ {meta.audioUrl.slice(0, 30)}...</span> : <span className="text-gray-600">Não configurado</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isEditing ? (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleSaveBookMeta(book.id)}
                                  className="px-2.5 py-1 rounded bg-emerald-500 text-gray-950 font-bold text-[10px] hover:bg-white transition-colors"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditingBookMetaId(null)}
                                  className="px-2.5 py-1 rounded bg-gray-800 text-white text-[10px] hover:bg-gray-700 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleStartEditMeta(book)}
                                className="px-2.5 py-1 rounded bg-accentPurple text-white text-[10px] hover:bg-accentPurple/80 transition-colors"
                              >
                                Configurar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- RELATÓRIO DE PARTICIPAÇÃO E ACESSOS --- */}
            <div className="glass-panel p-6 rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-800 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 m-0">
                    <Activity className="w-5 h-5 text-accentBlue" /> Registro de Participação e Acessos
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Acompanhe em tempo real quais estudantes estão abrindo os livros no Drive, baixando os EPUBs ou escutando os áudios.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearAccessLogs}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" /> Limpar Histórico
                  </button>
                </div>
              </div>

              {/* Estatísticas de Acesso */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800/60 shadow-inner">
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider font-bold block">Total de Cliques / Leituras</span>
                  <h4 className="text-2xl font-extrabold text-white mt-1">
                    {accessLogsList.length} acessos
                  </h4>
                </div>
                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800/60 shadow-inner">
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider font-bold block">Turma Mais Ativa</span>
                  <h4 className="text-2xl font-extrabold text-accentPurple mt-1">
                    {mostActiveGrade}
                  </h4>
                </div>
                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800/60 shadow-inner">
                  <span className="text-[10px] uppercase text-gray-400 tracking-wider font-bold block">Obra Mais Acessada</span>
                  <h4 className="text-lg font-extrabold text-accentBlue mt-1 truncate" title={mostAccessedBook}>
                    {mostAccessedBook}
                  </h4>
                </div>
              </div>

              {/* Controles de Filtro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-gray-950/20 p-4 rounded-xl border border-gray-800/40">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Buscar Aluno ou Obra</label>
                  <input 
                    type="text"
                    value={accessFilterSearch}
                    onChange={(e) => setAccessFilterSearch(e.target.value)}
                    placeholder="Digitar nome ou livro..."
                    className="w-full px-3 py-1.5 rounded-lg bg-gray-950/80 border border-gray-800 text-xs text-white focus:outline-none focus:border-accentBlue/50 transition-all placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Filtrar por Turma</label>
                  <select
                    value={accessFilterGrade}
                    onChange={(e) => setAccessFilterGrade(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-gray-950/80 border border-gray-800 text-xs text-white focus:outline-none focus:border-accentBlue/50 transition-all cursor-pointer"
                  >
                    <option value="">Todas as Turmas</option>
                    <option value="6º">6º Ano</option>
                    <option value="7º">7º Ano</option>
                    <option value="8º">8º Ano</option>
                    <option value="9º">9º Ano</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Filtrar por Ação</label>
                  <select
                    value={accessFilterType}
                    onChange={(e) => setAccessFilterType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-gray-950/80 border border-gray-800 text-xs text-white focus:outline-none focus:border-accentBlue/50 transition-all cursor-pointer"
                  >
                    <option value="">Todas as Ações</option>
                    <option value="Leitura (Drive)">Leitura (Drive)</option>
                    <option value="Download (EPUB)">Download (EPUB)</option>
                    <option value="Audiobook">Audiobook</option>
                  </select>
                </div>
              </div>

              {filteredAccessLogs.length === 0 ? (
                <div className="bg-gray-950/20 border border-gray-800/40 p-12 text-center rounded-xl text-gray-400 text-xs italic">
                  Nenhum registro de acesso corresponde aos filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-800/40 bg-gray-950/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold bg-gray-950/40">
                        <th className="py-3 px-4">Estudante</th>
                        <th className="py-3 px-4">Série / Ano</th>
                        <th className="py-3 px-4">Obra / Livro</th>
                        <th className="py-3 px-4">Ação Realizada</th>
                        <th className="py-3 px-4 text-right">Data & Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccessLogs.map((log, index) => {
                        let badgeStyle = '';
                        if (log.accessType === 'Leitura (Drive)') {
                          badgeStyle = 'bg-accentBlue/20 text-accentBlue border-accentBlue/30';
                        } else if (log.accessType === 'Download (EPUB)') {
                          badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                        } else {
                          badgeStyle = 'bg-accentPurple/20 text-accentPurple border-accentPurple/30';
                        }

                        return (
                          <tr key={log.id || index} className="border-b border-gray-800/30 hover:bg-gray-900/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">{log.studentName}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] text-accentPurple font-bold bg-accentPurple/10 px-2 py-0.5 rounded border border-accentPurple/25">
                                {log.studentGrade} Ano
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-200">{log.bookTitle}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeStyle}`}>
                                {log.accessType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-gray-400">
                              {new Date(log.timestamp).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* --- LISTAGEM GERAL DE RESENHAS DO PROFESSOR --- */}
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-800 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 m-0">
                    <Award className="w-5 h-5 text-accentBlue" /> Resenhas Recebidas
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Visualize, filtre e gerencie as produções textuais literárias dos seus alunos.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accentBlue text-white font-bold hover:bg-fuchsia-300 hover:text-gray-950 hover:shadow-lg hover:shadow-accentBlue/20 transition-all text-xs border border-accentBlue/20"
                >
                  <Download className="w-4 h-4" /> Exportar Dados Gerais (JSON)
                </button>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800">
                  <span className="text-xs uppercase text-gray-400 tracking-wider">Estudantes Participantes</span>
                  <h4 className="text-2xl font-extrabold text-white mt-1">
                    {new Set(reviews.map(r => r.studentName)).size} alunos
                  </h4>
                </div>
                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800">
                  <span className="text-xs uppercase text-gray-400 tracking-wider">Média Estética Geral</span>
                  <h4 className="text-2xl font-extrabold text-amber-400 mt-1 flex items-center gap-2">
                    {reviews.length > 0 
                      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                      : '0.0'} 
                    <Star className="w-5 h-5 fill-current" />
                  </h4>
                </div>
                <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800">
                  <span className="text-xs uppercase text-gray-400 tracking-wider">Clássicos Resenhados</span>
                  <h4 className="text-2xl font-extrabold text-white mt-1">
                    {new Set(reviews.map(r => r.bookId)).size} obras
                  </h4>
                </div>
              </div>

              {reviews.length === 0 ? (
                <div className="bg-gray-950/20 border border-gray-800 p-12 text-center rounded-xl text-gray-400">
                  Nenhuma resenha gravada no momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Estudante</th>
                        <th className="py-3 px-4">Livro</th>
                        <th className="py-3 px-4">Série</th>
                        <th className="py-3 px-4">Nota</th>
                        <th className="py-3 px-4">Resenha</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((rev) => {
                        const book = booksData.find(b => b.id === rev.bookId);
                        return (
                          <tr key={rev.id} className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-white">{rev.studentName}</td>
                            <td className="py-3 px-4 font-semibold text-gray-200">{book?.title || 'Obra desconhecida'}</td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] text-accentBlue font-bold">{book?.grade} Ano</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex text-amber-400">
                                {Array.from({ length: rev.rating }).map((_, i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-300 max-w-xs truncate" title={rev.reviewText}>{rev.reviewText}</td>
                            <td className="py-3 px-4 text-gray-400">{new Date(rev.date).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteReview(rev.id)}
                                className="text-rose-500 hover:text-rose-400 p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            </div>
          )
        )}

      </main>

      {/* ======================================= */}
      {/* === MODAL: FICHA DE LEITURA (ESTUDANTE) === */}
      {/* ======================================= */}
      {/* ======================================= */}
      {/* === MODAL: IDENTIFICAÇÃO DO LEITOR (ESTUDANTE) === */}
      {/* ======================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowProfileModal(false)}>
          <div 
            className="w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl border border-gray-800/80 p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-accentBlue/10 blur-[80px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-accentPurple/10 blur-[80px]" />

            <div className="text-center mb-6 relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple flex items-center justify-center mx-auto mb-3 shadow-lg shadow-accentBlue/20">
                <User className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">Identificação do Estudante</h3>
              <p className="text-gray-400 text-xs mt-1">Registre seus dados para salvar sua leitura no relatório do professor</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5 relative">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Seu Nome Completo</label>
                <input 
                  type="text"
                  required
                  value={tempProfileName}
                  onChange={(e) => setTempProfileName(e.target.value)}
                  placeholder="Ex: João Silva Santos"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accentBlue/50 transition-colors animate-pulse-slow"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1.5">Sua Série / Ano</label>
                <select
                  value={tempProfileGrade}
                  onChange={(e) => setTempProfileGrade(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white focus:outline-none focus:border-accentBlue/50 transition-colors cursor-pointer"
                >
                  <option value="6º">6º Ano</option>
                  <option value="7º">7º Ano</option>
                  <option value="8º">8º Ano</option>
                  <option value="9º">9º Ano</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-accentBlue/20"
                >
                  💾 Salvar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-gray-800/80 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-800 bg-gray-950/40 flex justify-between items-start gap-4">
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border ${getGradeStyle(selectedBook.grade)}`}>
                  {selectedBook.grade} Ano • {selectedBook.genre}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-2 leading-tight m-0">{selectedBook.title}</h2>
                <span className="text-xs text-gray-400">por {selectedBook.author}</span>
              </div>
              <button 
                onClick={() => setSelectedBook(null)}
                className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 px-3 py-1.5 rounded-xl transition-colors font-bold text-xs shrink-0"
              >
                ✕ Fechar
              </button>
            </div>

            <div className="flex border-b border-gray-800/80 bg-gray-950/20 px-6 py-1">
              {[
                { id: 'progresso', label: '📈 Progresso', icon: Clock },
                { id: 'resenha', label: '🌟 Escrever Resenha', icon: Sparkles },
                { id: 'feed', label: `💬 Resenhas dos Colegas (${bookReviews.length})`, icon: Eye }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition-all relative border-b-2 ${modalTab === tab.id ? 'border-accentBlue text-accentBlue' : 'border-transparent text-gray-400 hover:text-white'}`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              
              {/* Progresso */}
              {modalTab === 'progresso' && (
                <form onSubmit={handleSaveProgress} className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Qual seu status de leitura?</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'Quero Ler', label: 'Quero Ler', color: 'border-sky-500/30 hover:border-sky-500', active: 'bg-sky-500/20 text-sky-300 border-sky-500' },
                        { id: 'Lendo', label: 'Lendo', color: 'border-amber-500/30 hover:border-amber-500', active: 'bg-amber-500/20 text-amber-300 border-amber-500' },
                        { id: 'Lido', label: 'Já li!', color: 'border-emerald-500/30 hover:border-emerald-500', active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setReadingStatus(item.id)}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${readingStatus === item.id ? item.active : `bg-gray-900/40 text-gray-400 ${item.color}`}`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {readingStatus !== 'Quero Ler' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs uppercase text-gray-400 tracking-wider font-semibold block mb-1.5">Página Atual:</label>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="Ex: 45"
                          value={currentPage}
                          onChange={(e) => setCurrentPage(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs uppercase text-gray-400 tracking-wider font-semibold block mb-1.5">Total de Páginas:</label>
                        <input 
                          type="number" 
                          min="1"
                          placeholder="Ex: 210"
                          value={totalPages}
                          onChange={(e) => setTotalPages(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl glass-input text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-950/40 border border-gray-800 p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-accentBlue uppercase tracking-wider block mb-1">Dica de Estudo / Foco Literário:</span>
                    <p className="text-xs text-gray-300 leading-relaxed italic m-0">
                      "{selectedBook.focus}"
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-accentBlue text-white font-bold hover:bg-fuchsia-300 hover:text-gray-950 hover:shadow-lg hover:shadow-accentBlue/20 transition-all text-xs border border-accentBlue/20"
                  >
                    Salvar Progresso de Leitura 📈
                  </button>
                </form>
              )}

              {/* Escrever Resenha */}
              {modalTab === 'resenha' && (
                <form onSubmit={handleSaveReview} className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs uppercase text-gray-400 tracking-wider font-semibold block mb-1.5">Seu Nome Completo:</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Sérgio Silva de Oliveira"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase text-gray-400 tracking-wider font-semibold block mb-1.5">Que nota você dá para este clássico?</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-all"
                        >
                          <Star 
                            className={`w-6 h-6 ${star <= (hoverRating || rating) ? 'text-amber-400 fill-current scale-110' : 'text-gray-600'}`} 
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase text-gray-400 tracking-wider font-semibold block mb-1.5">Sua Resenha (O que achou do livro, etc.):</label>
                    <textarea 
                      required
                      rows="4"
                      placeholder="Escreva pelo menos um parágrafo sobre a obra. O que você aprendeu com ela? Quais sentimentos ela despertou?"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple text-white font-bold hover:shadow-lg hover:shadow-accentBlue/20 transition-all text-xs"
                  >
                    Publicar Minha Resenha no Mural! 🌟
                  </button>
                </form>
              )}

              {/* Feed dos Colegas */}
              {modalTab === 'feed' && (
                <div className="flex flex-col gap-4">
                  {bookReviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Ninguém resenhou este clássico ainda. Seja o primeiro a escrever! 🚀
                    </div>
                  ) : (
                    bookReviews.map((rev) => (
                      <div key={rev.id} className="bg-gray-950/40 border border-gray-800/80 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accentBlue/20 text-accentBlue flex items-center justify-center font-bold text-[10px] uppercase">
                              {rev.studentName.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-white">{rev.studentName}</span>
                          </div>
                          <span className="text-[10px] text-gray-500">{new Date(rev.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex text-amber-400 mb-2">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed italic m-0">
                          "{rev.reviewText}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* === MODAL: LEITOR DE LIVRO (GOOGLE DRIVE) === */}
      {/* ======================================= */}
      {readingBookDrive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-5xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col h-[90vh]">
            
            <div className="p-4 border-b border-gray-800 bg-gray-950/60 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📖</span>
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight m-0">{readingBookDrive.title}</h2>
                  <span className="text-[10px] text-gray-400">por {readingBookDrive.author} — Leitura Online</span>
                </div>
              </div>
              
              <button 
                onClick={() => setReadingBookDrive(null)}
                className="text-gray-400 hover:text-white bg-gray-800/80 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shrink-0"
              >
                ✕ Fechar Leitor
              </button>
            </div>

            <div className="flex-1 bg-white relative">
              <iframe 
                src={readingBookDrive.localUrl || `https://drive.google.com/file/d/${readingBookDrive.driveId}/preview`} 
                className="w-full h-full border-none bg-white"
                allow="autoplay"
                title={`Leitor do Livro: ${readingBookDrive.title}`}
              ></iframe>
            </div>

          </div>
        </div>
      )}

      {/* ======================================= */}
      {/* === PLAYER DE AUDIOBOOK FLUTUANTE (UI PRO MAX) === */}
      {/* ======================================= */}
      {audioBook && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-40 glass-panel rounded-2xl shadow-2xl shadow-fuchsia-500/10 border border-fuchsia-500/20 p-4 animate-slide-up">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-accentPurple/30 text-fuchsia-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-lg shadow-fuchsia-500/10 border border-fuchsia-500/20">
                🎧
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate leading-tight">{audioBook.title}</h4>
                <span className="text-[10px] text-gray-400 truncate block">Audiolivro ({audioBook.author})</span>
              </div>
            </div>
            
            <button 
              onClick={handleCloseAudioPlayer}
              className="text-gray-400 hover:text-white p-1 hover:bg-gray-850 rounded-lg transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Slider de Progresso */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-mono text-gray-500 shrink-0 w-8 text-right">
              {formatTime(audioCurrentTime)}
            </span>
            <input 
              type="range"
              min="0"
              max={audioDuration || 100}
              value={audioCurrentTime}
              onChange={handleAudioSeek}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
            />
            <span className="text-[9px] font-mono text-gray-500 shrink-0 w-8">
              {formatTime(audioDuration)}
            </span>
          </div>

          {/* Controles de Reprodução */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Seletor de Velocidade */}
            <button 
              onClick={() => {
                const nextSpeed = audioSpeed === 1 ? 1.25 : audioSpeed === 1.25 ? 1.5 : audioSpeed === 1.5 ? 2 : 1;
                setAudioSpeed(nextSpeed);
              }}
              className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-gray-900 text-fuchsia-400 border border-fuchsia-500/10 hover:bg-gray-950 transition-colors"
            >
              {audioSpeed}x Velocidade
            </button>

            {/* Play / Pause */}
            <button 
              onClick={handleTogglePlayAudio}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-fuchsia-500 to-accentPurple text-white flex items-center justify-center shadow-lg shadow-fuchsia-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              {audioPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {/* Marcador de Volume ou ícone decorativo */}
            <div className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
              <FastForward className="w-3.5 h-3.5 text-fuchsia-500" />
              CLLC Player
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
