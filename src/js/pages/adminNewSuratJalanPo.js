import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

/**
 * Form "Buat SJ Tarik" (submenu "PO") -- 2026-08-26. Beda dari
 * adminNewSuratJalan.js (submenu "Customer", SPK/t_penjualan_header): di
 * sini sumber datanya PO (pur_t_purchase_order, status READY), diambil dari
 * GET /admin/sj-po/outstanding-po (PoSuratJalanController, backend-migrasi
 * -- baca LANGSUNG tabel pur_t_* milik modul Purchase backend-production).
 *
 * 1 SJ = 1 PO (MVP, 2026-08-26) -- beda dari "Customer" yang boleh lintas
 * SPK sekaligus. Backend (PoSuratJalanController::store()) sebenarnya
 * SANGGUP terima banyak PO asal supplier-nya sama, tapi FE ini sengaja
 * dibatasi 1 PO per submit dulu (form lebih sederhana, volume SJ PO masih
 * kecil) -- gampang diperluas nanti kalau ternyata perlu multi-PO per SJ
 * (pola "SPK groups" yg sudah ada di adminNewSuratJalan.js bisa dicontek).
 *
 * TIDAK ADA field foto di sini (beda dari "Customer") -- SJ fisik yang
 * terbit dari Pusat belum perlu difoto saat ini, Jakarta yang foto pas
 * konfirmasi terima (lihat produksi-apk SuratJalanController::confirmJakarta()).
 */
export async function renderAdminNewSuratJalanPo($container) {
  renderNavbar($container, 'Buat SJ Tarik', { onBack: () => navigate('/admin/sj/po') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let outstanding = [];
  let drivers = [];
  try {
    [outstanding, drivers] = await Promise.all([
      api.get('/admin/sj-po/outstanding-po'),
      api.get('/admin/drivers?semua=1'),
    ]);
  } catch (e) {
    outstanding = [];
    drivers = [];
  }

  if (!outstanding.length) {
    $main.html(`
      <div class="card p-6 text-center text-sm text-slate-500">
        Tidak ada PO berstatus <b>READY</b> yang masih punya sisa qty untuk dikirim saat ini.
      </div>
    `);
    return;
  }

  const poOptions = outstanding
    .map((po) => `<option value="${po.po_id}">${po.po_number} — ${po.supplier_name}</option>`)
    .join('');
  const driverOptions = drivers
    .map((d) => `<option value="${d.name}">${d.name}${d.tipe === 'eksternal' ? ' (Eksternal)' : ''}</option>`)
    .join('');

  $main.html(`
    <form id="new-sj-po-form" class="space-y-4">
      <div class="card space-y-4 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchase Order</p>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Pilih PO</label>
          <select id="po_id" required
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="" disabled selected>-- Pilih PO --</option>
            ${poOptions}
          </select>
          <p class="mt-1.5 text-xs text-slate-400">Cuma PO berstatus READY dengan sisa qty yang ditampilkan.</p>
        </div>
        <div id="po-items" class="hidden space-y-2"></div>
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
        <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
        <button type="submit" id="btn-submit" class="btn-route w-full">Buat SJ Tarik</button>
      </div>
    </form>
  `);

  function renderPoItems(poId) {
    const po = outstanding.find((p) => String(p.po_id) === String(poId));
    const $wrap = $('#po-items').empty();
    if (!po) { $wrap.addClass('hidden'); return; }

    po.items.forEach((it) => {
      $wrap.append(`
        <div class="flex items-center gap-2 rounded-xl border border-slate-200 p-3" data-po-detail-id="${it.po_detail_id}">
          <div class="flex-1">
            <p class="text-sm text-ink">${it.material_name} <span class="text-xs text-slate-400">${it.unit_code}</span></p>
            <p class="text-xs text-slate-400">Sisa dikirim: ${it.qty_shippable}</p>
          </div>
          <input type="number" min="0" max="${it.qty_shippable}" step="0.01" value="${it.qty_shippable}"
            class="item-qty w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
      `);
    });
    $wrap.removeClass('hidden');
  }

  $main.find('#po_id').on('change', function () { renderPoItems($(this).val()); });

  $main.find('#new-sj-po-form').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btn-submit');
    const $err = $('#form-error').addClass('hidden');

    const poId = $('#po_id').val();
    if (!poId) { $err.text('Pilih PO terlebih dahulu.').removeClass('hidden'); return; }

    const items = [];
    $main.find('[data-po-detail-id]').each(function () {
      const podId = $(this).data('po-detail-id');
      const qty = Number($(this).find('.item-qty').val() || 0);
      if (qty > 0) items.push({ po_detail_id: podId, qty });
    });
    if (!items.length) {
      $err.text('Isi qty minimal untuk 1 item.').removeClass('hidden');
      return;
    }

    const driverName = ($('#driver_name').val() || '').trim();
    if (!driverName) { $err.text('Supir wajib dipilih/diisi.').removeClass('hidden'); return; }
    const vehicleNumber = ($('#vehicle_number').val() || '').trim();
    if (!vehicleNumber) { $err.text('Nomor kendaraan wajib diisi.').removeClass('hidden'); return; }

    setButtonLoading($btn, true, 'Menyimpan...');

    api.post('/admin/sj-po', {
      driver_name: driverName,
      vehicle_number: vehicleNumber,
      notes: ($('#notes').val() || '').trim(),
      items,
    })
      .then(() => navigate('/admin/sj/po'))
      .catch((xhr) => {
        $err.text(xhr?.responseJSON?.message || 'Gagal membuat SJ Tarik. Coba lagi.').removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
