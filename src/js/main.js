import { registerRoute, startRouter, navigate } from './router.js';
import { renderLogin } from './pages/login.js';
import { renderDriverDashboard } from './pages/driverDashboard.js';
import { renderDriverWorkflow } from './pages/driverWorkflow.js';
import { renderAdminDashboard } from './pages/adminDashboard.js';
import { renderAdminDriverDetail } from './pages/adminDriverDetail.js';
import { renderAdminNewTrip } from './pages/adminNewTrip.js';
import { APP_CONFIG } from './config.js';
import { login, isAuthenticated } from './auth.js';

registerRoute('/login', renderLogin, { public: true });
registerRoute('/driver', renderDriverDashboard, { roles: ['driver'] });
registerRoute('/driver/trip/:tripId', renderDriverWorkflow, { roles: ['driver'] });
registerRoute('/admin', renderAdminDashboard, { roles: ['admin'] });
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
