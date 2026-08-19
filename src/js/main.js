import { registerRoute, startRouter, navigate } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderDriverDashboard } from './pages/driverDashboard.js';
import { renderDriverWorkflow } from './pages/driverWorkflow.js';
import { renderAdminDashboard } from './pages/adminDashboard.js';
import { renderAdminDriverDetail } from './pages/adminDriverDetail.js';
import { renderAdminNewTrip } from './pages/adminNewTrip.js';
import { renderAdminNewDriver } from './pages/adminNewDriver.js';
import { renderAdminSpkKirim } from './pages/adminSpkKirim.js';
import { renderAdminSpkBelumSj } from './pages/adminSpkBelumSj.js';
import { renderAdminSuratJalan } from './pages/adminSuratJalan.js';
import { renderAdminNewSuratJalan } from './pages/adminNewSuratJalan.js';
import { APP_CONFIG } from './config.js';
import { login, isAuthenticated } from './auth.js';

registerRoute('/login', renderLogin, { public: true });
registerRoute('/driver', renderDriverDashboard, { roles: ['driver'] });
registerRoute('/driver/trip/:tripId', renderDriverWorkflow, { roles: ['driver'] });
// Tab "SPK" -- halaman awal admin setelah login (lihat komponen adminTabs.js
// utk tab bar SPK/SJ/Ekspedisi yang dipasang di 3 halaman root ini).
registerRoute('/admin', renderAdminSpkBelumSj, { roles: ['admin'] });
registerRoute('/admin/ekspedisi', renderAdminDashboard, { roles: ['admin'] });
// WAJIB didaftarkan SEBELUM '/admin/driver/:driverId' -- router.js first-match-wins,
// dan pattern :driverId juga akan "menangkap" literal 'new' sebagai id kalau urutannya kebalik.
registerRoute('/admin/driver/new', renderAdminNewDriver, { roles: ['admin'] });
registerRoute('/admin/spk-kirim', renderAdminSpkKirim, { roles: ['admin'] });
// WAJIB didaftarkan SEBELUM '/admin/sj' kalau nanti ada '/admin/sj/:id' -- saat
// ini belum ada, tapi urutan ini disiapkan biar konsisten dgn pola driver/new di atas.
registerRoute('/admin/sj/new', renderAdminNewSuratJalan, { roles: ['admin'] });
registerRoute('/admin/sj', renderAdminSuratJalan, { roles: ['admin'] });
registerRoute('/admin/driver/:driverId', renderAdminDriverDetail, { roles: ['admin'] });
registerRoute('/admin/driver/:driverId/trip/new', renderAdminNewTrip, { roles: ['admin'] });

async function bootstrap() {
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
