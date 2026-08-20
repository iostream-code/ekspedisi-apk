import $ from 'jquery';
import { APP_CONFIG } from './config.js';
import { CURRENT_APP_VERSION_CODE } from './app-version.js';
import { logout } from './auth.js';
import { navigate } from './router.js';

const CHECK_INTERVAL_MS = 30000; // pola sama dgn checkAppVersion() finance-apk/admin-finance-apk

let timer = null;

/**
 * Cek versi app -- pola yang sama dipakai app lain di workspace ini
 * (absensi-apk, finance-apk, admin-finance-apk): tiap `CHECK_INTERVAL_MS`,
 * kirim `CURRENT_APP_VERSION_CODE` (dari app-version.js, auto-generate
 * `bump-version.cjs`) ke `POST /config/check-version`. Kalau backend bilang
 * `is_valid: false` (versi di device di bawah `config_value_minimal` yang
 * di-set admin di tabel `config`, config_id='VERSION_EKSPEDISI_PUSAT') --
 * tampilkan pesannya (`config.config_keterangan`) lalu paksa logout, SAMA
 * seperti alur `checkAppVersion()`/`checkInternet()` di app lain.
 *
 * Timer berhenti PERMANEN begitu 1x ketahuan tidak valid (tidak perlu terus
 * cek lagi tiap 30 detik setelah user sudah dipaksa keluar & lihat pesannya).
 * Dilewati sepenuhnya saat MOCK_MODE (tidak ada backend nyata utk ditanya).
 */
function checkOnce() {
  $.ajax({
    url: APP_CONFIG.API_BASE_URL + '/config/check-version',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ current_version_code: CURRENT_APP_VERSION_CODE }),
    dataType: 'json',
    timeout: 15000,
  })
    .done((res) => {
      if (res.status === 'success' && res.is_valid === false) {
        clearInterval(timer);
        timer = null;
        alert(res.config?.config_keterangan || 'Aplikasi versi lama, silakan update.');
        logout();
        navigate('/login');
      }
    })
    .fail(() => {
      // Endpoint gagal dihubungi (offline/server down) -- diam-diam, coba
      // lagi siklus berikutnya. Jangan sampai masalah jaringan disalahartikan
      // sbg "versi tidak valid" & memaksa logout org yang justru sedang
      // butuh app-nya jalan (mis. supir di lapangan, sinyal lemah).
    });
}

export function initVersionCheck() {
  if (APP_CONFIG.MOCK_MODE || timer) return;
  checkOnce();
  timer = setInterval(checkOnce, CHECK_INTERVAL_MS);
}
