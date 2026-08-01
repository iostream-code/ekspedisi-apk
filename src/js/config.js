// Ganti sesuai environment. Untuk device fisik jangan pakai 'localhost', pakai IP LAN atau domain staging.
export const APP_CONFIG = {
  // MOCK_MODE = true -> semua request pakai data dummy (lihat mock.js), tidak perlu backend nyala.
  // Set ke false kalau backend Laravel sudah siap & API_BASE_URL sudah diisi yang benar.
  MOCK_MODE: true,

  // Isi 'driver' atau 'admin' untuk BYPASS halaman login sepenuhnya saat app dibuka
  // (langsung nyemplung ke dashboard, cocok buat demo/diskusi cepat).
  // Isi null untuk balik ke alur normal (lewat halaman login dulu).
  // Hanya berlaku kalau MOCK_MODE: true.
  AUTO_LOGIN_ROLE: 'driver', // 'driver' | 'admin' | null

  API_BASE_URL: 'https://your-laravel-backend.example.com/api',
  LOGIN_ENDPOINT: '/login-new', // endpoint login existing di BE Laravel 5 (session-based, set cookie)
  LOCATION_PING_INTERVAL_MS: 30000, // kirim update lokasi tiap 30 detik saat status online
  GEO_TIMEOUT_MS: 20000,
};

// PENTING (auth session/cookie, bukan token): kalau app ini diakses dari origin berbeda
// dengan BE (hampir pasti, karena app-nya jalan di WebView Cordova / file://), BE HARUS
// merespons CORS dengan header eksplisit (bukan wildcard '*'):
//   Access-Control-Allow-Origin: <origin app kamu, atau echo origin request>
//   Access-Control-Allow-Credentials: true
// Kalau salah satu itu tidak ada, cookie sesi tidak akan pernah ke-attach ke request
// berikutnya walaupun login-new "sukses" -- semua request sesudahnya kelihatan seperti belum login.
