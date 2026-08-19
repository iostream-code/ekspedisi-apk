import $ from 'jquery';

// Indikator koneksi di topbar (bulat kedip hijau/merah) -- pola yang sama
// dipakai di app lain workspace ini (lihat .connection-indicator/#box_internet
// di surat-jalan-apk & produksi-apk, style.css). Beda dari app Framework7
// lama itu (yang ping endpoint /check-internet-sj tiap saat, sekalian cek
// versi & password), di sini cukup navigator.onLine + event online/offline
// browser -- app ini tidak punya endpoint semacam itu, dan online/offline
// browser sudah cukup akurat utk WebView Cordova.
//
// Listener dipasang SEKALI di sini (module-level), bukan tiap kali navbar
// re-render -- setiap event fire, cari elemen #connection-indicator yang
// SEDANG ada di DOM (bisa beda instance tiap halaman), jadi tidak perlu
// pasang/lepas listener per halaman.
function applyState($el) {
  const online = navigator.onLine;
  $el.toggleClass('connected', online).toggleClass('disconnected', !online);
}

window.addEventListener('online', () => applyState($('#connection-indicator')));
window.addEventListener('offline', () => applyState($('#connection-indicator')));

/** Dipanggil navbar.js tiap render supaya indikator yang baru dibuat langsung dapat state awal. */
export function initConnectionIndicator($el) {
  applyState($el);
}
