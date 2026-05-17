# 📚 CLLC - Painel Literário do Estudante (PWA)

Este é um aplicativo da Web moderno, responsivo, **totalmente offline-first** e com **sincronização híbrida em nuvem (Firebase)**, desenvolvido sob medida para o **Clube de Letramento Literário e Corporeidade (CLLC)**.

---

## 🎯 Objetivo do Projeto

Transformar a experiência de leitura clássica e letramento na escola pública. O aplicativo lê um acervo estruturado de **86 clássicos** e disponibiliza recursos interativos premium para leitura, audição e escrita.

### 🌟 Funcionalidades Principais:
1. **Filtros e Busca por Série:** Navegação intuitiva separada por ano escolar (6º, 7º, 8º e 9º ano), com cores galácticas personalizadas.
2. **Leitura Integrada no App (Google Drive):** Permite ler PDFs hospedados no Google Drive diretamente em uma moldura (iframe preview) dentro do aplicativo, sem precisar abrir outras abas.
3. **Player de Audiobook Flutuante (Piper MP3):** Uma barra de reprodução flutuante estilo Spotify/Podcasts para ouvir audiobooks em MP3/WAV (gerados na sua fábrica Piper). Inclui controles de Play/Pause, barra de progresso interativa e alteração da taxa de velocidade (0.75x a 2x).
4. **Assistente Narrador de Acessibilidade (TTS):** Caso não haja um audiobook gravado, os alunos podem clicar em "Ouvir Resumo" para escutar a sinopse e foco pedagógico lidos pela API de voz nativa do navegador (`pt-BR`).
5. **Sincronização em Tempo Real com Firebase:** Sincroniza todas as resenhas e links do acervo entre todos os dispositivos em tempo real. Se a internet cair, o app continua salvando localmente (IndexedDB via Dexie.js) e atualiza a nuvem assim que reconectar!
6. **Painel de Controle do Professor (Área do Professor):**
   * Configuração instantânea do Firebase em tempo real (basta colar a API Key no painel!).
   * Configuração de Links de Nuvem: Adicione ou edite IDs do Google Drive e URLs de Audiobooks para cada um dos 86 livros diretamente na tela.
   * Moderação e exclusão de resenhas.
   * Exportação do relatório consolidado (JSON) para atribuição de notas.

---

## 🛠️ Tecnologias Utilizadas (Tech Stack)

1. **Framework:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) (Rápido, leve e modular).
2. **Estilização (CSS):** [Tailwind CSS (v3)](https://tailwindcss.com/) com design "UI Pro Max" (Glassmorphism, glows de fundo, neon accents e transições suaves).
3. **Persistência Local (Offline-First):** [Dexie.js](https://dexie.org/) para gerenciamento reativo do IndexedDB.
4. **Sincronização Cloud:** [Firebase SDK (v10)](https://firebase.google.com/) para Firestore (Banco de dados em tempo real).
5. **Acessibilidade:** Web Speech API nativa (Text-To-Speech) para narração assistiva.
6. **Ícones:** [Lucide React](https://lucide.dev/).
7. **Tipografia:** Outfit & Plus Jakarta Sans (Google Fonts).

---

## 🚀 Como Rodar o Projeto Localmente

Certifique-se de ter o **Node.js** instalado na sua máquina (Zorin OS).

1. Entre no diretório do projeto:
   ```bash
   cd /home/sergio/Downloads/LIVROS/painel-leitura
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Acesse o painel pelo navegador em `http://localhost:5173`.

---

## 📦 Como Compilar para Produção (Build)

Para gerar uma pasta estática super otimizada para publicação:

```bash
npm run build
```

---

## 📋 Histórico de Modificações (Changelog)

* **v1.5.0 (17/05/2026) — Mapeamento e Acessibilidade Local:**
  * **Acessibilidade Universal**: Botão de assistente de voz (`🔊 Ouvir Resumo` por TTS) ativo em 100% dos cards do acervo, garantindo interatividade mesmo para clássicos sem arquivos digitais locais.
  * **Mapeamento de 14 Clássicos**: Associação cirúrgica de arquivos físicos locais (como `fc3a1bulasdeesopo2ed.pdf`, `alicep.pdf` e `3574Sherlock-Holmes-0bra-Completa.pdf`) para conectar botões de Leitura e Download offline.
  * **Paleta Quente Contrastada (Sand & Chocolate)**: Estilização do fundo claro e cards com cores escuras para contraste ideal e beleza estética refinada no Zorin OS.
  * **Guia de Hospedagem**: Elaboração de guia detalhado para publicação no GitHub Pages, nuvem Firebase e mídias via Google Drive.
* **v1.1.0 (17/05/2026):**
  * Implementação da integração nativa com o **Google Drive** para leitura de PDFs in-app.
  * Desenvolvimento do **Player Flutuante de Audiobooks** com controle de velocidade da mídia e progresso.
  * Criação do sistema de voz por síntese de fala (TTS) para narração de acessibilidade.
  * Integração híbrida com o **Firebase Firestore** para sincronização global instantânea de dados.
  * Painel administrativo do professor expandido para cadastrar links de nuvem individuais para todos os 86 clássicos.
* **v1.0.0 (17/05/2026):**
  * Inicialização do ecossistema React + Vite + TailwindCSS.
  * Criação do banco IndexedDB com Dexie.js e script de mapeamento em Python.

---

## 🔒 Persistência Híbrida Inteligente

Este aplicativo usa um modelo moderno de banco de dados híbrido:
* **Sem Internet (Modo Local):** Todas as informações ficam restritas à memória do próprio navegador (IndexedDB). Excelente para escolas sem rede.
* **Com Internet (Modo Conectado):** O professor cola as chaves do Firebase na Área do Professor e o aplicativo faz o sync inteligente na nuvem em tempo real!
