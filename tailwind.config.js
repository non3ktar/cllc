/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      colors: {
        // Paleta Reversa de Alto Contraste (Fundo de Areia Claro & Cards de Chocolate Terracota)
        darkBg: '#edd4be', // Areia Creme Claro (A cor mais clara da paleta como fundo global)
        darkCard: 'rgba(82, 66, 60, 0.95)', // Marrom Terracota Escuro (Contraste forte nos cards)
        accentBlue: '#ad5c70', // Crimson / Dusty Rose (Ações e destaques vibrantes)
        accentPurple: '#d3ad98', // Pêssego / Bege Quente (Highlight secundário)
        
        // Mapeamento do Fuchsia para combinar perfeitamente com os tons de áudio
        fuchsia: {
          20: 'rgba(173, 92, 112, 0.15)',
          300: '#edd4be', // Creme Areia Claro
          400: '#d3ad98', // Pêssego Quente
          500: '#ad5c70', // Dusty Rose
          600: '#52423c', // Terracota Escuro
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
