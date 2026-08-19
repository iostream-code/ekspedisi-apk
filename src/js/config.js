// Ganti sesuai environment. Untuk device fisik jangan pakai 'localhost', pakai IP LAN atau domain staging.
export const APP_CONFIG = {
  // MOCK_MODE = true -> semua request pakai data dummy (lihat mock.js), tidak perlu backend nyala.
  // Set ke false kalau ../driver-apk-backend sudah siap & API_BASE_URL sudah diisi yang benar.
  MOCK_MODE: false, // true | false

  // Isi 'driver' atau 'admin' untuk BYPASS halaman login sepenuhnya saat app dibuka
  // (langsung nyemplung ke dashboard, cocok buat demo/diskusi cepat).
  // Isi null untuk balik ke alur normal (lewat halaman login dulu).
  // Hanya berlaku kalau MOCK_MODE: true.
  AUTO_LOGIN_ROLE: 'driver', // 'driver' | 'admin' | null

  // driver-apk-backend (project Slim 4 terpisah, lihat ../driver-apk-backend) -- routenya
  // TIDAK ada prefix /api (beda dari backend-production), jangan tambahkan sendiri di sini.
  API_BASE_URL: 'http://127.0.0.1:8000',
  LOGIN_ENDPOINT: '/login', // POST { username, password } -> { token, role, user } langsung, 1 request saja
  LOCATION_PING_INTERVAL_MS: 30000, // kirim update lokasi tiap 30 detik saat status online
  GEO_TIMEOUT_MS: 20000,
};

// Auth pakai token Bearer (JWT), BUKAN cookie/session -- tidak butuh withCredentials
// ataupun konfigurasi CORS-credentials khusus di sisi BE (beda dari backend-production
// yang dipakai app lain di workspace ini). Token disimpan di localStorage (lihat auth.js)
// dan dikirim manual lewat header Authorization di tiap request (lihat api.js).
