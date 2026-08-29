import { registerRoute, startRouter, navigate } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderDriverDashboard } from './pages/driverDashboard.js';
import { renderDriverWorkflow } from './pages/driverWorkflow.js';
import { renderAdminDashboard } from './pages/adminDashboard.js';
import { renderAdminDriverDetail } from './pages/adminDriverDetail.js';
import { renderAdminNewDriver } from './pages/adminNewDriver.js';
import { renderAdminEkspedisiList } from './pages/adminEkspedisiList.js';
import { renderAdminSuratJalan } from './pages/adminSuratJalan.js';
import { renderAdminNewSuratJalan } from './pages/adminNewSuratJalan.js';
import { renderAdminSuratJalanPo } from './pages/adminSuratJalanPo.js';
import { renderAdminNewSuratJalanPo } from './pages/adminNewSuratJalanPo.js';
import { APP_CONFIG } from './config.js';
import { login, isAuthenticated } from './auth.js';
import { initLightboxDelegation } from './components/lightbox.js';
import { initVersionCheck } from './versionCheck.js';

registerRoute('/login', renderLogin, { public: true });
registerRoute('/driver', renderDriverDashboard, { roles: ['driver'] });
registerRoute('/driver/trip/:tripId', renderDriverWorkflow, { roles: ['driver'] });
// Tab "SJ" -- halaman awal admin setelah login (2026-08-23, dulu tab "SPK"
// -- lihat komponen adminTabs.js utk tab bar SJ/Ekspedisi yang dipasang di 2
// halaman root ini, app disederhanakan dari 3 tab jadi 2).
registerRoute('/admin', renderAdminSuratJalan, { roles: ['admin'] });
registerRoute('/admin/ekspedisi', renderAdminDashboard, { roles: ['admin'] });
// WAJIB didaftarkan SEBELUM '/admin/driver/:driverId' -- router.js first-match-wins,
// dan pattern :driverId juga akan "menangkap" literal 'new' sebagai id kalau urutannya kebalik.
registerRoute('/admin/driver/new', renderAdminNewDriver, { roles: ['admin'] });
registerRoute('/admin/ekspedisi/kelola', renderAdminEkspedisiList, { roles: ['admin'] });
// WAJIB didaftarkan SEBELUM '/admin/sj' kalau nanti ada '/admin/sj/:id' -- saat
// ini belum ada, tapi urutan ini disiapkan biar konsisten dgn pola driver/new di atas.
registerRoute('/admin/sj/new', renderAdminNewSuratJalan, { roles: ['admin'] });
// Submenu "PO" (2026-08-26, lihat components/sjSubTabs.js) -- SJ Tarik utk
// Purchase Order, TABEL/BACKEND BEDA TOTAL dari '/admin/sj' di atas (lihat
// docblock adminSuratJalanPo.js). '/admin/sj/po/new' didaftarkan sebelum
// '/admin/sj/po' sekadar konsisten gaya dgn pola '/admin/sj/new' di atas --
// tidak ada segmen dinamis di sini jadi urutannya sendiri tidak signifikan.
registerRoute('/admin/sj/po/new', renderAdminNewSuratJalanPo, { roles: ['admin'] });
registerRoute('/admin/sj/po', renderAdminSuratJalanPo, { roles: ['admin'] });
registerRoute('/admin/sj', renderAdminSuratJalan, { roles: ['admin'] });
registerRoute('/admin/driver/:driverId', renderAdminDriverDetail, { roles: ['admin'] });

async function bootstrap() {
  // Popup gambar (lightbox) utk SEMUA <img data-lightbox> di app ini (2026-08-20)
  // -- 1 delegated listener di document, jalan utk elemen manapun/kapan pun
  // dirender (termasuk isi modal), lihat components/lightbox.js.
  initLightboxDelegation();

  // Cek versi app (2026-08-20) -- pola sama dgn absensi-apk/finance-apk/
  // admin-finance-apk, config_id='VERSION_EKSPEDISI_PUSAT'. Jalan GLOBAL
  // (bukan per-halaman kayak timer lain di app ini) -- sekali mulai di
  // bootstrap, terus polling tiap 30 detik APA PUN halaman yang lagi
  // dibuka, sampai ketahuan tidak valid (baru berhenti permanen) atau app
  // ditutup. Lihat versionCheck.js.
  initVersionCheck();

  // Bypass login untuk demo: isi APP_CONFIG.AUTO_LOGIN_ROLE ('driver'/'admin') di config.js.
  const wantsBypass = APP_CONFIG.MOCK_MODE && APP_CONFIG.AUTO_LOGIN_ROLE && !isAuthenticated();
  if (wantsBypass) {
    // mockLogin (dipanggil lewat login()) mendeteksi role dari username yang mengandung "admin"
    const dummyUsername = APP_CONFIG.AUTO_LOGIN_ROLE === 'admin' ? 'admin' : 'supir-demo';
    await login(dummyUsername, 'bypass');
    navigate(APP_CONFIG.AUTO_LOGIN_ROLE === 'admin' ? '/admin' : '/driver');
  }
  startRouter();
}

// Di dalam WebView Cordova, tunggu event 'deviceready' supaya semua plugin native
// (camera, geolocation) sudah siap dipakai. Di browser biasa (npm run dev) event ini
// tidak akan pernah muncul, jadi kita fallback ke DOMContentLoaded.
const isCordova = /file:\/\/|cdvfile:\/\/|content:\/\//.test(window.location.href) || !!window.cordova;

if (isCordova) {
  document.addEventListener('deviceready', bootstrap, false);
} else {
  document.addEventListener('DOMContentLoaded', bootstrap);
}
