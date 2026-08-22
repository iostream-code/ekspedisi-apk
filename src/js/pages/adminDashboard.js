import $ from 'jquery';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { pageLoaderHtml, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';

const STATUS_COLOR = { online: '#16A34A', resting: '#D97706', offline: '#64748B' };
let refreshTimer = null;

const LIST_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
const PLUS_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

/**
 * Tab "Ekspedisi" -- MURNI monitoring (2026-08-20, keputusan eksplisit:
 * assignment supir->SPK/pengiriman melekat ke SJ, bukan lagi langkah
 * "plotting" terpisah di sini -- lihat komentar SuratJalanController::store()
 * & AdminController::drivers() di backend-migrasi). Tombol "Plot SPK ke
 * Supir" & halamannya (adminSpkKirim.js) DIHAPUS. `GET /admin/drivers`
 * sekarang cuma balikin supir yang SEDANG mengirim (py trip aktif ATAU SJ
 * belum tervalidasi) -- peta & list di sini otomatis ikut sempit tanpa perlu
 * filter tambahan di sisi frontend.
 */
export async function renderAdminDashboard($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'ekspedisi');

  const $main = $(`<main class="flex flex-1 items-center justify-center">${pageLoaderHtml('Memuat data supir...')}</main>`);
  $container.append($main);

  $main.removeClass('items-center justify-center').addClass('flex-col md:flex-row').html(`
    <div id="admin-map" class="h-64 w-full md:h-auto md:flex-1"></div>
    <aside class="w-full space-y-2 overflow-y-auto border-t border-slate-200 bg-white p-3 md:w-80 md:border-l md:border-t-0">
      <div class="flex items-center justify-between px-1">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Berjalan</p>
        <div class="flex items-center gap-2">
          <a href="#/admin/ekspedisi/kelola" class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">${LIST_ICON} Ekspedisi</a>
          <a href="#/admin/driver/new" class="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">${PLUS_ICON} Supir</a>
        </div>
      </div>
      <div id="driver-list" class="space-y-2"></div>
    </aside>
  `);

  const map = L.map('admin-map').setView([-7.4478, 112.7183], 12); // default: Sidoarjo, sesuaikan
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  const markers = {}; // driver_id -> L.marker

  function markerIcon(status) {
    return L.divIcon({
      className: '',
      html: `<div style="background:${STATUS_COLOR[status] || '#64748B'}" class="h-4 w-4 rounded-full border-2 border-white shadow"></div>`,
      iconSize: [16, 16],
    });
  }

  async function refresh({ showListSkeleton = false } = {}) {
    if (showListSkeleton) $('#driver-list').html(pageLoaderHtml('Memuat...'));

    let drivers;
    try {
      drivers = await api.get('/admin/drivers');
    } catch (e) {
      return;
    }

    // Marker driver yang SUDAH SELESAI mengirim (tervalidasi/checkpoint
    // rampung) otomatis hilang dari response `GET /admin/drivers` (2026-08-20,
    // sekarang di-filter server-side cuma yang sedang mengirim) -- buang
    // marker basi yang tidak lagi ada di respons terbaru, supaya peta tidak
    // numpuk marker driver yang sebenarnya sudah tidak relevan lagi.
    const presentIds = new Set(drivers.map((d) => d.id));
    Object.keys(markers).forEach((id) => {
      if (!presentIds.has(Number(id))) {
        map.removeLayer(markers[id]);
        delete markers[id];
      }
    });

    const $list = $('#driver-list').empty();

    if (!drivers.length) {
      $list.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    drivers.forEach((d) => {
      // Update / buat marker di peta
      if (d.lat && d.lng) {
        if (markers[d.id]) {
          markers[d.id].setLatLng([d.lat, d.lng]).setIcon(markerIcon(d.status));
        } else {
          markers[d.id] = L.marker([d.lat, d.lng], { icon: markerIcon(d.status) })
            .addTo(map)
            .bindPopup(d.name);
        }
      }

      // List di sidebar
      $list.append(`
        <a href="#/admin/driver/${d.id}" class="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50">
          <div class="flex items-center gap-2">
            <span class="status-dot ${d.status}"></span>
            <div>
              <p class="text-sm font-medium text-ink">${d.name}${d.tipe === 'eksternal' ? ' <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">EKSTERNAL</span>' : ''}</p>
              <p class="text-xs text-slate-500">${d.current_step_label || 'Sedang mengirim'}</p>
            </div>
          </div>
          <span class="text-slate-300">&rsaquo;</span>
        </a>
      `);
    });
  }

  await refresh();
  refreshTimer = setInterval(refresh, 15000); // auto-refresh tiap 15 detik

  // Bersihkan timer saat pindah halaman (dipanggil oleh router lewat hashchange listener global)
  window.addEventListener('hashchange', function cleanup() {
    clearInterval(refreshTimer);
    window.removeEventListener('hashchange', cleanup);
  }, { once: true });
}
