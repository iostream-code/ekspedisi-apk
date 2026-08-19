import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

export async function renderAdminDriverDetail($container, params) {
  const driverId = params.driverId;
  renderNavbar($container, 'Detail Supir', { onBack: () => navigate('/admin') });

  const $main = $(`<main class="flex-1 p-4">${pageLoaderHtml('Memuat detail supir...')}</main>`);
  $container.append($main);

  let detail;
  try {
    detail = await api.get(`/admin/drivers/${driverId}`);
  } catch (e) {
    $main.html('<p class="text-status-alert">Gagal memuat detail supir.</p>');
    return;
  }

  $main.empty();
  $main.append(`
    <section class="card mb-4 p-4">
      <div class="flex items-center gap-3">
        <span class="status-dot ${detail.status}"></span>
        <div>
          <p class="font-display text-lg font-semibold text-ink">${detail.name}</p>
          <p class="text-sm text-slate-500">${detail.phone || '-'}</p>
        </div>
      </div>
    </section>

    <button id="btn-new-trip" class="btn-route mb-4 w-full">+ Perjalanan Baru</button>

    <p class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Riwayat Perjalanan</p>
    <div id="trip-list" class="space-y-3"></div>
  `);

  $main.find('#btn-new-trip').on('click', () => navigate(`/admin/driver/${driverId}/trip/new`));

  const $tripList = $main.find('#trip-list');
  (detail.trips || []).forEach((trip) => {
    const isActive = trip.status_label === 'Sedang Berjalan';
    const $card = $(`
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <p class="font-medium text-ink">${trip.destination || 'Perjalanan #' + trip.id}</p>
          <span class="rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-status-online/10 text-status-online' : 'bg-slate-100 text-slate-600'}">${trip.status_label}</span>
        </div>
        <p class="mt-1 text-xs text-slate-400">${trip.created_at}${trip.penjualan_id ? ' &middot; SPK ' + trip.penjualan_id : ''}${trip.no_surat_jalan ? ' &middot; SJ ' + trip.no_surat_jalan : ''}</p>
        <div class="mt-3 flex gap-2" data-photos></div>
      </div>
    `);
    const $photos = $card.find('[data-photos]');
    (trip.photos || []).forEach((p) => {
      $photos.append(`
        <a href="${p.url}" target="_blank" class="block">
          <img src="${p.url}" class="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
        </a>
      `);
    });
    if (!(trip.photos || []).length) {
      $photos.append('<p class="text-xs text-slate-400">Belum ada foto checkpoint.</p>');
    }
    $tripList.append($card);
  });

  if (!(detail.trips || []).length) {
    $tripList.append(emptyStateHtml());
  }
}
