import $ from 'jquery';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { pageLoaderHtml } from '../components/loader.js';
import { api } from '../api.js';

const STATUS_COLOR = { online: '#16A34A', resting: '#D97706', offline: '#64748B' };
let refreshTimer = null;

export async function renderAdminDashboard($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'ekspedisi');

  const $main = $(`<main class="flex flex-1 items-center justify-center">${pageLoaderHtml('Memuat data supir...')}</main>`);
  $container.append($main);

  $main.removeClass('items-center justify-center').addClass('flex-col md:flex-row').html(`
    <div id="admin-map" class="h-64 w-full md:h-auto md:flex-1"></div>
    <aside class="w-full space-y-2 overflow-y-auto border-t border-slate-200 bg-white p-3 md:w-80 md:border-l md:border-t-0">
      <a href="#/admin/spk-kirim" class="flex items-center justify-center rounded-xl bg-route/10 px-3 py-2.5 text-route hover:bg-route/15">
        <span class="text-sm font-semibold">Plot SPK ke Supir</span>
      </a>
      <div class="flex items-center justify-between px-1 pt-1">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar Supir</p>
        <a href="#/admin/driver/new" class="text-xs font-semibold text-brand-600 hover:text-brand-700">+ Tambah Supir</a>
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

    const $list = $('#driver-list').empty();

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
              <p class="text-xs text-slate-500">${d.current_step_label || 'Tidak ada perjalanan aktif'}</p>
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
