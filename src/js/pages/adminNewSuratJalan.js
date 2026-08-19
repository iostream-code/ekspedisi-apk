import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { takePhoto } from '../camera.js';
import { consumePrefillPenjualanId } from '../prefill.js';

/**
 * Bikin surat jalan MANUAL dari layar admin -- tidak terikat trip manapun
 * (beda dari jalur otomatis lewat checkpoint foto "sj" supir). Supir opsional
 * -- SJ boleh dibuat dulu, diisi supirnya belakangan lewat PUT /admin/sj/{id}
 * (belum ada UI edit-nya, backend sudah siap).
 */
export async function renderAdminNewSuratJalan($container) {
  renderNavbar($container, 'Buat Surat Jalan', { onBack: () => navigate('/admin/sj') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let drivers = [];
  try {
    drivers = await api.get('/admin/drivers');
  } catch (e) {
    drivers = [];
  }
  const driverOptions = drivers
    .map((d) => `<option value="${d.id}">${d.name}${d.tipe === 'eksternal' ? ' (Eksternal)' : ''}</option>`)
    .join('');

  $main.html(`
    <form id="new-sj-form" class="card space-y-4 p-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Nomor SPK (opsional)</label>
        <div class="flex gap-2">
          <input id="penjualan_id" type="text" placeholder="Contoh: INV_01701-5"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <button type="button" id="btn-cek-spk" class="btn-ghost shrink-0 !py-2.5 px-4 text-sm">Cek</button>
        </div>
        <p class="mt-1.5 text-xs text-slate-400">SJ pada dasarnya selalu mengirim isi 1 SPK -- isi nomornya
          supaya jumlah kirim per produk tercatat & tervalidasi ke sisa qty yang belum terkirim. Kosongkan
          cuma kalau ini pengiriman lepas (bukan dari SPK, mis. sampel/transfer internal).</p>
        <div id="spk-items" class="mt-3 hidden space-y-2"></div>
        <p id="spk-error" class="mt-2 hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Tujuan</label>
        <input id="tujuan" type="text" placeholder="Contoh: Toko Makmur Jaya, Sidoarjo"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Supir (opsional)</label>
        <select id="driver_id" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
          <option value="">-- Belum ditentukan --</option>
          ${driverOptions}
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Kendaraan</label>
          <input id="kendaraan" type="text" placeholder="Grandmax"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Plat</label>
          <input id="plat" type="text" placeholder="P 1234 XY"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Pengirim</label>
        <input id="pengirim" type="text" placeholder="Nama yang serah terima barang"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <p class="mt-1.5 text-xs text-slate-400">Boleh beda dari supir -- ini nama orang yang serah-terima barang.</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div id="jumlah-kirim-wrap">
          <label class="mb-1 block text-sm font-medium text-slate-600">Jumlah kirim</label>
          <input id="jumlah_kirim" type="number" min="0" placeholder="0"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Tanggal kirim</label>
          <input id="tgl_kirim" type="date"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Foto Surat Jalan (opsional)</label>
        <button type="button" id="btn-foto" class="btn-ghost w-full !py-2.5 text-sm">Ambil Foto</button>
        <p id="foto-status" class="mt-1.5 text-xs text-slate-400">Belum ada foto.</p>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-600">Catatan (opsional)</label>
        <textarea id="catatan" rows="2"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"></textarea>
      </div>
      <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="btn-submit" class="btn-route w-full">Buat Surat Jalan</button>
    </form>
  `);

  let spkLines = []; // [{ penjualan_detail_performa_id, penjualan_jenis, penjualan_qty, sisa }, ...] -- kosong = SJ freeform (bukan dari SPK)

  async function cekSpk() {
    const penjualanId = $('#penjualan_id').val().trim();
    const $err = $('#spk-error').addClass('hidden');
    const $itemsWrap = $('#spk-items').addClass('hidden').empty();
    spkLines = [];
    $('#jumlah-kirim-wrap').removeClass('hidden');

    if (!penjualanId) return;

    const $btn = $('#btn-cek-spk');
    setButtonLoading($btn, true, '...');
    try {
      spkLines = await api.get(`/admin/sj/spk/${encodeURIComponent(penjualanId)}/items`);
    } catch (xhr) {
      spkLines = [];
      $err.text(xhr?.responseJSON?.message || 'SPK tidak ditemukan.').removeClass('hidden');
      setButtonLoading($btn, false);
      return;
    }
    setButtonLoading($btn, false);

    if (!spkLines.length) {
      $err.text('SPK ini tidak punya lini produk apa pun.').removeClass('hidden');
      return;
    }

    $('#jumlah-kirim-wrap').addClass('hidden');
    spkLines.forEach((line, i) => {
      $itemsWrap.append(`
        <div class="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
          <div class="flex-1">
            <p class="text-sm font-medium text-ink">${line.penjualan_jenis || '(tanpa nama)'}</p>
            <p class="text-xs text-slate-400">Dipesan ${line.penjualan_qty} &middot; sisa ${line.sisa}</p>
          </div>
          <input type="number" min="0" max="${line.sisa}" placeholder="0" data-item-idx="${i}"
            class="item-jumlah-kirim w-20 rounded-lg border border-slate-200 px-2 py-2 text-right text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
      `);
    });
    $itemsWrap.removeClass('hidden');
  }

  $main.find('#btn-cek-spk').on('click', cekSpk);

  // Dititipkan dari tab "SPK" (adminSpkBelumSj.js, tombol "Buat SJ") --
  // langsung isi & cek nomornya, admin tidak perlu ngetik ulang.
  const prefillId = consumePrefillPenjualanId();
  if (prefillId) {
    $('#penjualan_id').val(prefillId);
    cekSpk();
  }

  let fotoBlob = null;
  $main.find('#btn-foto').on('click', async function () {
    const $btn = $(this);
    setButtonLoading($btn, true, 'Membuka kamera...');
    try {
      fotoBlob = await takePhoto();
      $main.find('#foto-status').text('Foto siap diunggah.').removeClass('text-slate-400').addClass('text-brand-700');
    } catch (e) {
      // batal ambil foto -- bukan error fatal, foto tetap opsional
    } finally {
      setButtonLoading($btn, false);
    }
  });

  $main.find('#new-sj-form').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btn-submit');
    const $err = $('#form-error');
    $err.addClass('hidden');

    const items = [];
    if (spkLines.length) {
      let invalid = false;
      $main.find('.item-jumlah-kirim').each(function () {
        const val = Number($(this).val() || 0);
        if (val <= 0) return;
        const line = spkLines[Number($(this).data('item-idx'))];
        if (val > line.sisa) invalid = true;
        items.push({ penjualan_detail_performa_id: line.penjualan_detail_performa_id, jumlah_kirim: val });
      });
      if (invalid) {
        $err.text('Ada jumlah kirim yang melebihi sisa qty produk itu.').removeClass('hidden');
        return;
      }
      if (!items.length) {
        $err.text('SPK sudah dicek -- isi jumlah kirim minimal untuk 1 produk, atau kosongkan Nomor SPK untuk SJ tanpa breakdown.').removeClass('hidden');
        return;
      }
    }

    setButtonLoading($btn, true, 'Menyimpan...');

    api.post('/admin/sj', {
      penjualan_id: $('#penjualan_id').val().trim() || undefined,
      items: items.length ? items : undefined,
      tujuan: $('#tujuan').val().trim(),
      driver_id: $('#driver_id').val() || undefined,
      kendaraan: $('#kendaraan').val().trim(),
      plat: $('#plat').val().trim(),
      pengirim: $('#pengirim').val().trim(),
      jumlah_kirim: items.length ? undefined : ($('#jumlah_kirim').val() || undefined),
      tgl_kirim: $('#tgl_kirim').val() || undefined,
      catatan: $('#catatan').val().trim(),
    })
      .then((sj) => (fotoBlob ? api.uploadFile(`/admin/sj/${sj.id}/photo`, fotoBlob, 'photo') : null))
      .then(() => {
        navigate('/admin/sj');
      })
      .catch((xhr) => {
        const msg = xhr?.responseJSON?.message || 'Gagal membuat surat jalan. Coba lagi.';
        $err.text(msg).removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
