/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        // Ink & paper — base netral
        ink: {
          DEFAULT: '#0B1220',
          soft: '#1E293B',
        },
        paper: '#F5F7FA',
        // Brand — hijau (2026-08-20, sebelumnya teal), dipasangkan dengan orange rambu jalan
        // untuk aksi utama. Brand-600 sengaja sama persis dgn status.online di bawah -- app ini
        // soal ekspedisi/logistik, hijau "jalan/aktif" jadi identitas dan status sekaligus.
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          400: '#4ADE80',
          600: '#16A34A',
          700: '#15803D',
        },
        route: {
          DEFAULT: '#EA580C', // orange rambu jalan — dipakai untuk CTA kritikal (ambil foto, dsb)
          soft: '#FDBA74',
        },
        // Status supir
        status: {
          online: '#16A34A',
          resting: '#D97706',
          offline: '#64748B',
          alert: '#DC2626',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(11,18,32,0.06), 0 1px 3px 0 rgba(11,18,32,0.08)',
      },
    },
  },
  plugins: [],
};
