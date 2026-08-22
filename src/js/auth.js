import $ from 'jquery';
import { APP_CONFIG } from './config.js';
import { mockLogin } from './mock.js';

const STORAGE_KEY = 'dta_session'; // dta = Driver Tracking App

/**
 * Login memakai backend-migrasi (project Slim 4 terpisah, JWT token auth):
 * POST /ekspedisi/login sekali jalan, balikin { token, role, user } langsung --
 * tidak ada request whoami terpisah, tidak ada cookie sesi sama sekali.
 *
 * Saat APP_CONFIG.MOCK_MODE aktif: username apa saja bisa dipakai.
 * Ketik username yang mengandung kata "admin" (mis. "admin") untuk masuk sebagai admin,
 * selain itu masuk sebagai supir.
 */
export function login(username, password) {
  const request = APP_CONFIG.MOCK_MODE
    ? mockLogin(username)
    : $.ajax({
        // '/ekspedisi' ditambah di sini (bukan dibakukan ke LOGIN_ENDPOINT)
        // supaya nilai itu tetap murni "nama endpoint", sama pola dgn
        // api.js (lihat authHeaders() di sana utk alasan lengkap prefix ini).
        url: APP_CONFIG.API_BASE_URL + '/ekspedisi' + APP_CONFIG.LOGIN_ENDPOINT,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ username, password }),
        dataType: 'json',
        timeout: 20000,
      });

  return request.then((res) => {
    const session = { token: res.token, role: res.role, user: res.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  });
}

export function logout() {
  const token = getToken();
  // Hapus sesi lokal dulu supaya UI langsung responsif...
  localStorage.removeItem(STORAGE_KEY);

  // ...lalu cabut token di server juga (fire-and-forget, tidak perlu ditunggu UI).
  if (!APP_CONFIG.MOCK_MODE && token) {
    $.ajax({
      url: APP_CONFIG.API_BASE_URL + '/ekspedisi/logout',
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
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

export function getToken() {
  const s = getSession();
  return s ? s.token : null;
}

export function getRole() {
  const s = getSession();
  return s ? s.role : null;
}

/**
 * Token bisa saja sudah di-revoke/expired di server (mis. dicabut manual, atau
 * SANCTUM_EXPIRATION lewat) -- status login di sisi frontend cuma "kepercayaan
 * lokal": true kalau kita PERNAH berhasil login & belum logout. Request pertama
 * yang gagal (401) di api.js akan otomatis memaksa logout + balik ke /login.
 */
export function isAuthenticated() {
  return !!getToken();
}
