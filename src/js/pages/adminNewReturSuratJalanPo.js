import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { takePhoto } from '../camera.js';

/**
 * Widget "Ambil Foto Bukti Terima" -- disalin dari adminNewSuratJalanPo.js
 * (pola sama dgn renderPhotoField() di adminNewDriver.js), bukan di-share
 * krn masing-masing cuma dipakai 1 file (konvensi app ini).
 */
function renderPhotoField($container, label) {
  const $field = $(`
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-600">${label}</label>
      <div class="flex items-center gap-3">
        <button type="button" class="btn-ambil-foto btn-ghost !py-2.5 px-4 text-sm">Ambil Foto</button>
        <img data-lightbox class="hidden h-14 w-14 cursor-zoom-in rounded-lg border border-slate-200 object-cover" />
      </div>
    </div>
  `);
  $container.append($field);

  const $btn = $field.find('.btn-ambil-foto');
  const $thumb = $field.find('img');
  let blob = null;

  $btn.on('click', async () => {
    try {
      blob = await takePhoto();
    } catch (e) {
      return; // batal ambil foto
    }
    $thumb.attr('src', URL.createObjectURL(blob)).removeClass('hidden');
    $btn.text('Ganti Foto');
  });

  return { getBlob: () => blob };
}

/**
 * Form "Buat SJ Retur" (submenu "Retur", 2026-08-30, BARU -- rombak alur
 * Retur/PO). Sumber datanya retur PO (pur_t_retur_purchase, status
 * APPROVED + retur_action=REPLACEMENT), diambil dari GET
 * /admin/sj-retur-po/outstanding-po (ReturPoSuratJalanController,
 * backend-migrasi -- baca LANGSUNG tabel pur_t_* milik modul Purchase
 * backend-production). Pola SAMA PERSIS dgn adminNewSuratJalanPo.js
 * (submenu "PO") -- 1 SJ = 1 Retur, submit multipart (foto wajib), SJ
 * langsung final ('RECEIVED'/'PARTIAL_RECEIVED') dalam 1 langkah.
 */
export async function renderAdminNewReturSuratJalanPo($container) {
  renderNavbar($container, 'Buat SJ Retur', { onBack: () => navigate('/admin/sj/retur-po') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let outstanding = [];
  let drivers = [];
  try {
    [outstanding, drivers] = await Promise.all([
      api.get('/admin/sj-retur-po/outstanding-po'),
      api.get('/admin/drivers?semua=1'),
    ]);
  } catch (e) {
    outstanding = [];
    drivers = [];
  }

  if (!outstanding.length) {
    $main.html(`
      <div class="card p-6 text-center text-sm text-slate-500">
        Tidak ada retur berstatus <b>APPROVED</b> yang masih punya sisa qty untuk diterima saat ini.
      </div>
    `);
    return;
  }

  const returOptions = outstanding
    .map((r) => `<option value="${r.retur_id}">${r.retur_number} — ${r.supplier_name}${r.po_number ? ' (' + r.po_number + ')' : ''}</option>`)
    .join('');
  const driverOptions = drivers
    .map((d) => `<option value="${d.name}">${d.name}${d.tipe === 'eksternal' ? ' (Eksternal)' : ''}</option>`)
    .join('');

  $main.html(`
    <form id="new-sj-retur-po-form" class="space-y-4">
      <div class="card space-y-4 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Retur Purchase</p>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Pilih Retur</label>
          <select id="retur_id" required
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="" disabled selected>-- Pilih Retur --</option>
            ${returOptions}
          </select>
          <p class="mt-1.5 text-xs text-slate-400">Cuma retur berstatus APPROVED (disposisi Replacement) dengan sisa qty yang ditampilkan.</p>
        </div>
        <div id="retur-items" class="hidden space-y-2"></div>
      </div>

      <div class="card space-y-4 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Detail Pengiriman</p>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Supir</label>
          ${drivers.length
      ? `<select id="driver_name" required
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="" disabled selected>-- Pilih supir --</option>
            ${driverOptions}
          </select>`
      : `<input id="driver_name" type="text" required placeholder="Nama supir"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />`}
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Nomor Kendaraan</label>
          <input id="vehicle_number" type="text" required placeholder="Contoh: P 1234 XY"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Catatan (opsional)</label>
          <textarea id="notes" rows="2"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"></textarea>
        </div>
        <div id="photo-field"></div>
        <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
        <button type="submit" id="btn-submit" class="btn-route w-full">Simpan &amp; Tandai Diterima</button>
      </div>
    </form>
  `);

  const photoField = renderPhotoField($main.find('#photo-field'), 'Foto Bukti Terima (wajib)');

  function renderReturItems(returId) {
    const r = outstanding.find((x) => String(x.retur_id) === String(returId));
    const $wrap = $('#retur-items').empty();
    if (!r) { $wrap.addClass('hidden'); return; }

    r.items.forEach((it) => {
      $wrap.append(`
        <div class="flex items-center gap-2 rounded-xl border border-slate-200 p-3" data-retur-detail-id="${it.retur_detail_id}">
          <div class="flex-1">
            <p class="text-sm text-ink">${it.material_name} <span class="text-xs text-slate-400">${it.unit_code}</span></p>
            <p class="text-xs text-slate-400">Sisa Retur: ${it.qty_outstanding}</p>
          </div>
          <input type="number" min="0" max="${it.qty_outstanding}" step="0.01" value="${it.qty_outstanding}"
            class="item-qty w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
      `);
    });
    $wrap.removeClass('hidden');
  }

  $main.find('#retur_id').on('change', function () { renderReturItems($(this).val()); });

  $main.find('#new-sj-retur-po-form').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btn-submit');
    const $err = $('#form-error').addClass('hidden');

    const returId = $('#retur_id').val();
    if (!returId) { $err.text('Pilih retur terlebih dahulu.').removeClass('hidden'); return; }

    const items = [];
    $main.find('[data-retur-detail-id]').each(function () {
      const detailId = $(this).data('retur-detail-id');
      const qty = Number($(this).find('.item-qty').val() || 0);
      if (qty > 0) items.push({ retur_detail_id: detailId, qty });
    });
    if (!items.length) {
      $err.text('Isi qty minimal untuk 1 item.').removeClass('hidden');
      return;
    }

    const driverName = ($('#driver_name').val() || '').trim();
    if (!driverName) { $err.text('Supir wajib dipilih/diisi.').removeClass('hidden'); return; }
    const vehicleNumber = ($('#vehicle_number').val() || '').trim();
    if (!vehicleNumber) { $err.text('Nomor kendaraan wajib diisi.').removeClass('hidden'); return; }
    const photoBlob = photoField.getBlob();
    if (!photoBlob) { $err.text('Foto bukti terima wajib diambil.').removeClass('hidden'); return; }

    setButtonLoading($btn, true, 'Menyimpan...');

    api.postMultipart('/admin/sj-retur-po', {
      driver_name: driverName,
      vehicle_number: vehicleNumber,
      notes: ($('#notes').val() || '').trim(),
      items: JSON.stringify(items),
      photo: photoBlob,
    })
      .then(() => navigate('/admin/sj/retur-po'))
      .catch((xhr) => {
        $err.text(xhr?.responseJSON?.message || 'Gagal menyimpan SJ. Coba lagi.').removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
