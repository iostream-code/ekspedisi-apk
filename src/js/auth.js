import $ from 'jquery';
import { APP_CONFIG } from './config.js';
import { mockLogin } from './mock.js';

const STORAGE_KEY = 'dta_session'; // dta = Driver Tracking App

/**
 * Login memakai endpoint existing di BE Laravel 5: login-new
 * PENTING: BE ini pakai SESSION-BASED auth (cookie), bukan Bearer token —
 * login-new sendiri juga tidak mengembalikan role. Alurnya jadi 2 langkah:
 *   1. POST /login-new   -> set cookie sesi di browser
 *   2. GET  /driver/whoami -> baca cookie sesi, balikin { role, user }
 *
 * Saat APP_CONFIG.MOCK_MODE aktif: username apa saja bisa dipakai.
 * Ketik username yang mengandung kata "admin" (mis. "admin") untuk masuk sebagai admin,
 * selain itu masuk sebagai supir.
 */
export function login(username, password) {
  if (APP_CONFIG.MOCK_MODE) {
    return mockLogin(username).then((res) => {
      const session = { user: res.user, role: res.user.role };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session;
    });
  }

  return $.ajax({
    url: APP_CONFIG.API_BASE_URL + APP_CONFIG.LOGIN_ENDPOINT,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ username, password }),
    dataType: 'json',
    timeout: 20000,
    xhrFields: { withCredentials: true }, // wajib supaya cookie sesi ikut disimpan browser
  })
    .then(() => {
      // login-new sukses (cookie sesi sudah ke-set) -> tanya role ke whoami
      return $.ajax({
        url: APP_CONFIG.API_BASE_URL + '/driver/whoami',
        method: 'GET',
        dataType: 'json',
        timeout: 20000,
        xhrFields: { withCredentials: true },
      });
    })
    .then((res) => {
      const session = { user: res.user, role: res.role };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session;
    });
}

export function logout() {
  // Hapus sesi lokal dulu supaya UI langsung responsif...
  localStorage.removeItem(STORAGE_KEY);

  // ...lalu invalidate sesi di server juga (fire-and-forget, tidak perlu ditunggu UI).
  if (!APP_CONFIG.MOCK_MODE) {
    $.ajax({
      url: APP_CONFIG.API_BASE_URL + '/logout-new',
      method: 'POST',
      xhrFields: { withCredentials: true },
    });
  }
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return null;
  }
}

export function getRole() {
  const s = getSession();
  return s ? s.role : null;
}

/**
 * Karena auth-nya session/cookie (bukan token yang bisa dicek keberadaannya di JS),
 * status login di sisi frontend cuma "kepercayaan lokal": true kalau kita PERNAH
 * berhasil login & belum logout. Kalau cookie sesi sebenarnya sudah expired di server,
 * request pertama yang gagal (401) di api.js akan otomatis memaksa logout + balik ke /login.
 */
export function isAuthenticated() {
  return !!getSession();
}
