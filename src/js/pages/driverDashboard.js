import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, setButtonLoading, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { geo } from '../geo.js';

const STATUS_LABEL = {
  online: 'Online - Siap Jalan',
  resting: 'Istirahat',
  offline: 'Offline',
};

export async function renderDriverDashboard($container) {
  renderNavbar($container, 'Dashboard Supir');

  const $main = $(`<main class="flex-1 space-y-4 p-4">${pageLoaderHtml('Memuat data...')}</main>`);
  $container.append($main);

  let res;
  try {
    res = await api.get('/driver/me');
  } catch (e) {
    $main.html('<p class="p-4 text-status-alert">Gagal memuat data. Coba refresh halaman.</p>');
    return;
  }

  $main.html(`
    <section class="card p-4">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-400">Status saat ini</p>
      <div class="mt-2 flex items-center gap-2">
        <span id="status-dot" class="status-dot offline"></span>
        <span id="status-label" class="font-display text-lg font-semibold">-</span>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-2">
        <button data-status="online" class="status-btn btn-ghost !py-2.5 text-sm">Online</button>
        <button data-status="resting" class="status-btn btn-ghost !py-2.5 text-sm">Istirahat</button>
        <button data-status="offline" class="status-btn btn-ghost !py-2.5 text-sm">Offline</button>
      </div>
    </section>

    <section>
      <div class="mb-2 flex items-center justify-between px-1">
        <p class="font-display font-semibold text-ink">Perjalanan aktif</p>
        <span id="trip-count" class="text-xs font-medium text-slate-400"></span>
      </div>
      <div id="trip-list" class="space-y-2"></div>
    </section>
  `);

  function setStatusUI(status) {
    $('#status-dot').attr('class', `status-dot ${status}`);
    $('#status-label').text(STATUS_LABEL[status] || status);
    $('.status-btn').removeClass('!border-brand-600 !text-brand-600');
    $(`.status-btn[data-status="${status}"]`).addClass('!border-brand-600 !text-brand-600');
  }

  function renderTripList(trips) {
    const $list = $('#trip-list').empty();
    $('#trip-count').text(trips.length ? `${trips.length} perjalanan` : '');

    if (!trips.length) {
      $list.append(`<div class="card">${emptyStateHtml()}</div>`);
      return;
    }

    trips.forEach((trip) => {
      $list.append(`
        <a href="#/driver/trip/${trip.id}" class="card flex items-center justify-between p-4">
          <div class="min-w-0">
            <p class="truncate font-medium text-ink">${trip.destination || 'Perjalanan #' + trip.id}</p>
            <p class="mt-0.5 text-xs text-slate-500">Tahap: ${trip.current_step_label || '-'}</p>
          </div>
          <span class="ml-3 shrink-0 text-sm font-semibold text-brand-600">Lanjutkan &rarr;</span>
        </a>
      `);
    });
  }

  setStatusUI(res.status || 'offline');
  if (res.status === 'online') geo.startTracking();
  renderTripList(res.active_trips || []);

  $main.find('.status-btn').on('click', function () {
    const $btn = $(this);
    const status = $btn.data('status');
    setButtonLoading($btn, true, '...');
    api.post('/driver/status', { status })
      .then(() => {
        setStatusUI(status);
        if (status === 'online') geo.startTracking();
        else geo.stopTracking();
      })
      .always(() => setButtonLoading($btn, false));
  });
}
