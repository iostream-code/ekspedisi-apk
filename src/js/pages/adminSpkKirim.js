import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, setButtonLoading, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

/**
 * Daftar SPK yang sudah disetujui utk dikirim (shipment_status='approved' di
 * t_penjualan_header, backend-production) tapi belum diplot ke supir manapun.
 * Plotting langsung di sini: pilih supir dari dropdown per baris, klik "Pilih"
 * -> bikin driver_t_trip yang tertaut ke SPK itu (lihat AdminController::
 * createTrip() di driver-apk-backend).
 */
export async function renderAdminSpkKirim($container) {
  renderNavbar($container, 'SPK Siap Kirim', { onBack: () => navigate('/admin') });

  const $main = $(`<main class="flex-1 space-y-3 p-4">${pageLoaderHtml('Memuat data...')}</main>`);
  $container.append($main);

  let spkList;
  let drivers;
  try {
    [spkList, drivers] = await Promise.all([api.get('/admin/spk-ready-kirim'), api.get('/admin/drivers')]);
  } catch (e) {
    $main.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
    return;
  }

  if (!spkList.length) {
    $main.html(emptyStateHtml());
    return;
  }

  const driverOptions = drivers
    .map((d) => `<option value="${d.id}">${d.name}${d.tipe === 'eksternal' ? ' (Eksternal)' : ''}</option>`)
    .join('');

  $main.empty();
  spkList.forEach((spk) => {
    const tglKirim = spk.penjualan_tanggal_kirim
      ? new Date(spk.penjualan_tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
      : '-';

    $main.append(`
      <div class="card p-4" data-penjualan-id="${spk.penjualan_id}">
        <p class="font-display font-semibold text-ink">${spk.client_nama}</p>
        <p class="mt-0.5 text-sm text-slate-500">${spk.kota_asal || '-'} &rarr; ${spk.kota_tujuan || '-'}</p>
        <p class="mt-1 text-xs text-slate-400">SPK ${spk.no_spk || '-'} &middot; Diminta kirim ${tglKirim}</p>
        <div class="mt-3 flex gap-2">
          <select class="select-driver w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="">Pilih supir...</option>
            ${driverOptions}
          </select>
          <button class="btn-plot btn-route shrink-0 !py-2 px-4 text-sm">Pilih</button>
        </div>
      </div>
    `);
  });

  $main.on('click', '.btn-plot', function () {
    const $card = $(this).closest('[data-penjualan-id]');
    const penjualanId = $card.data('penjualan-id');
    const driverId = $card.find('.select-driver').val();

    if (!driverId) {
      alert('Pilih supir dulu.');
      return;
    }

    const spk = spkList.find((s) => String(s.penjualan_id) === String(penjualanId));
    const destination = `${spk.client_nama} (${spk.kota_tujuan || '-'})`;
    const $btn = $(this);
    setButtonLoading($btn, true, '...');

    api.post(`/admin/drivers/${driverId}/trip`, { destination, penjualan_id: penjualanId })
      .then(() => {
        $card.fadeOut(200, () => {
          $card.remove();
          if (!$main.children().length) $main.html(emptyStateHtml());
        });
      })
      .catch((xhr) => {
        alert(xhr?.responseJSON?.message || 'Gagal plotting ke supir. Coba lagi.');
        setButtonLoading($btn, false);
      });
  });
}
