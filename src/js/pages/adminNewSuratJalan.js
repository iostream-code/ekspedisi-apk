import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { takePhoto } from '../camera.js';
import { consumePrefillPenjualanId } from '../prefill.js';
import { formatSpkNo } from '../format.js';

/**
 * Bikin surat jalan MANUAL dari layar admin -- tidak terikat trip manapun
 * (beda dari jalur otomatis lewat checkpoint foto "sj" supir). Supir WAJIB
 * dipilih (2026-08-20 -- dulu opsional, tapi itu bikin ambigu siapa yang
 * bawa dokumen fisiknya; kalau supirnya memang belum ada, buat SJ-nya
 * belakangan juga setelah ada supir).
 *
 * 1 SJ boleh mengangkut lini produk dari LEBIH DARI 1 SPK sekaligus
 * (2026-08-20) -- admin bisa "Tambah" beberapa nomor SPK berturut-turut,
 * tiap SPK jadi 1 grup dengan breakdown produknya sendiri.
 *
 * Form dibagi 2 card terpisah (2026-08-20): card "SPK" (cek/tambah SPK +
 * breakdown per lini produk) lebih dulu, baru card "Detail Surat Jalan"
 * (tujuan/supir/kendaraan/dst + tombol submit) -- 1 elemen <form> yang sama
 * membungkus keduanya, cuma dipisah visual jadi 2 card.
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
    <form id="new-sj-form" class="space-y-4">
      <div class="card space-y-4 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">SPK</p>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Nomor SPK</label>
          <div class="flex gap-2">
            <input id="penjualan_id" type="text" placeholder="Contoh: INV_01701-5"
              class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            <button type="button" id="btn-tambah-spk" class="btn-ghost shrink-0 !py-2.5 px-4 text-sm">+ Tambah</button>
          </div>
          <p class="mt-1.5 text-xs text-slate-400">1 SJ boleh mengangkut lebih dari 1 SPK sekaligus -- isi nomor,
            klik Tambah, ulangi kalau ada SPK lain. Breakdown per produk & sisa qty tercatat otomatis. Jangan
            tambah SPK apa pun kalau ini pengiriman lepas (bukan dari SPK, mis. sampel/transfer internal).</p>
          <div id="spk-groups" class="mt-3 hidden space-y-3"></div>
          <p id="spk-error" class="mt-2 hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
        </div>
      </div>

      <div class="card space-y-4 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Detail Surat Jalan</p>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Tujuan</label>
          <input id="tujuan" type="text" placeholder="Contoh: Toko Makmur Jaya, Sidoarjo"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Supir</label>
          <select id="driver_id" required
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="" disabled selected>-- Pilih supir --</option>
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
          <label class="mb-1 block text-sm font-medium text-slate-600">Penerima (opsional)</label>
          <input id="penerima" type="text" placeholder="Nama PIC di tujuan"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          <p class="mt-1.5 text-xs text-slate-400">Bantu supir tahu siapa yang harus dihubungi/diserahi barang di tujuan.</p>
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
      </div>
    </form>
  `);

  let spkGroups = []; // [{ penjualanId, lines: [{penjualan_detail_performa_id, penjualan_jenis, penjualan_qty, sisa}] }, ...]

  function renderSpkGroups() {
    const $wrap = $('#spk-groups').empty();

    if (!spkGroups.length) {
      $wrap.addClass('hidden');
      $('#jumlah-kirim-wrap').removeClass('hidden');
      return;
    }
    $('#jumlah-kirim-wrap').addClass('hidden');

    spkGroups.forEach((group) => {
      const $group = $(`
        <div class="rounded-xl border border-slate-200 p-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-ink">${formatSpkNo(group.penjualanId)}</p>
            <button type="button" class="btn-hapus-spk text-xs font-medium text-status-alert hover:underline">Hapus</button>
          </div>
          <div class="mt-2 space-y-2" data-lines></div>
        </div>
      `);
      const $lines = $group.find('[data-lines]');
      group.lines.forEach((line) => {
        $lines.append(`
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <p class="text-sm text-ink">${line.penjualan_jenis || '(tanpa nama)'}</p>
              <p class="text-xs text-slate-400">Dipesan ${line.penjualan_qty} &middot; sisa ${line.sisa}</p>
            </div>
            <input type="number" min="0" max="${line.sisa}" placeholder="0" data-line-id="${line.penjualan_detail_performa_id}"
              class="item-jumlah-kirim w-20 rounded-lg border border-slate-200 px-2 py-2 text-right text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
          </div>
        `);
      });
      $group.find('.btn-hapus-spk').on('click', () => {
        spkGroups = spkGroups.filter((g) => g.penjualanId !== group.penjualanId);
        renderSpkGroups();
      });
      $wrap.append($group);
    });

    $wrap.removeClass('hidden');
  }

  async function addSpkGroup(penjualanId) {
    const $err = $('#spk-error').addClass('hidden');

    if (!penjualanId) return;
    if (spkGroups.some((g) => g.penjualanId === penjualanId)) {
      $err.text('SPK ini sudah ditambahkan.').removeClass('hidden');
      return;
    }

    const $btn = $('#btn-tambah-spk');
    setButtonLoading($btn, true, '...');
    let lines;
    try {
      lines = await api.get(`/admin/sj/spk/${encodeURIComponent(penjualanId)}/items`);
    } catch (xhr) {
      setButtonLoading($btn, false);
      $err.text(xhr?.responseJSON?.message || 'SPK tidak ditemukan.').removeClass('hidden');
      return;
    }
    setButtonLoading($btn, false);

    if (!lines.length) {
      $err.text('SPK ini tidak punya lini produk apa pun.').removeClass('hidden');
      return;
    }

    spkGroups.push({ penjualanId, lines });
    $('#penjualan_id').val('');
    renderSpkGroups();
  }

  $main.find('#btn-tambah-spk').on('click', () => addSpkGroup($('#penjualan_id').val().trim()));

  // Dititipkan dari tab "SPK" (adminSpkBelumSj.js, tombol "Surat Jalan") --
  // langsung ditambahkan sebagai grup pertama, admin tidak perlu ngetik ulang.
  const prefillId = consumePrefillPenjualanId();
  if (prefillId) {
    addSpkGroup(prefillId);
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
    $main.find('.item-jumlah-kirim').each(function () {
      const val = Number($(this).val() || 0);
      if (val > 0) items.push({ penjualan_detail_performa_id: Number($(this).data('line-id')), jumlah_kirim: val });
    });

    if (spkGroups.length && !items.length) {
      $err.text('Sudah ada SPK ditambahkan -- isi jumlah kirim minimal untuk 1 produk, atau hapus semua SPK untuk SJ tanpa breakdown.').removeClass('hidden');
      return;
    }

    setButtonLoading($btn, true, 'Menyimpan...');

    api.post('/admin/sj', {
      items: items.length ? items : undefined,
      tujuan: $('#tujuan').val().trim(),
      driver_id: $('#driver_id').val(),
      kendaraan: $('#kendaraan').val().trim(),
      plat: $('#plat').val().trim(),
      penerima: $('#penerima').val().trim(),
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
