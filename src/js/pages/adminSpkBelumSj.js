import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { pageLoaderHtml, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { setPrefillPenjualanId } from '../prefill.js';

const SJ_STATUS_LABEL = { draft: 'Draft', terkirim: 'Terkirim', tervalidasi: 'Tervalidasi' };

/**
 * Tab "SPK" -- halaman awal admin setelah login. Model tabel (bukan kartu),
 * meniru pola toolbar "Data | jumlah + tombol Refresh/Riwayat" di
 * surat-jalan-apk (lihat components/tableToolbar.js).
 *
 * Dua mode:
 * - Aktif (default): SPK sudah disetujui utk dikirim tapi BELUM ADA SJ SAMA
 *   SEKALI (beda dari "SPK Siap Kirim" di tab Ekspedisi, yang kriterianya
 *   "belum diplot ke supir" -- 2 hal independen, lihat
 *   App\Support\SpkReadyKirim::listBelumSj() di ekspedisi-apk-backend). Aksi
 *   per baris cuma "Buat SJ" -- plotting ke supir ada di tab Ekspedisi.
 * - Riwayat: SPK yang SUDAH ada SJ-nya -- diturunkan dari GET /admin/sj
 *   (filter baris yang penjualan_id-nya terisi), tidak ada endpoint baru
 *   khusus krn datanya sudah tersedia dari situ.
 */
export async function renderAdminSpkBelumSj($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'spk');

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let historyMode = false;

  async function load() {
    $main.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    let rows;
    try {
      rows = historyMode
        ? (await api.get('/admin/sj')).filter((sj) => sj.penjualan_id)
        : await api.get('/admin/spk-belum-sj');
    } catch (e) {
      $main.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render(rows);
  }

  function render(rows) {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $main.empty().append($card);

    renderTableToolbar($card, {
      count: rows.length,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => {
        historyMode = !historyMode;
        load();
      },
    });

    if (!rows.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    const $tableWrap = $(`<div class="overflow-x-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            ${historyMode
              ? '<th class="whitespace-nowrap px-3 py-2 text-left">No SJ</th><th class="whitespace-nowrap px-3 py-2 text-left">SPK</th><th class="whitespace-nowrap px-3 py-2 text-left">Tujuan</th><th class="whitespace-nowrap px-3 py-2 text-left">Status</th><th class="whitespace-nowrap px-3 py-2 text-left">Tanggal</th>'
              : '<th class="whitespace-nowrap px-3 py-2 text-left">Perusahaan</th><th class="whitespace-nowrap px-3 py-2 text-left">Kota Tujuan</th><th class="whitespace-nowrap px-3 py-2 text-left">SPK</th><th class="whitespace-nowrap px-3 py-2 text-left">Kirim</th><th class="whitespace-nowrap px-3 py-2 text-right">Aksi</th>'}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    rows.forEach((row) => {
      if (historyMode) {
        const tgl = row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
        $tbody.append(`
          <tr>
            <td class="whitespace-nowrap px-3 py-2.5 font-medium text-ink">${row.no_surat_jalan || '-'}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${row.penjualan_id}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${row.tujuan || '-'}</td>
            <td class="whitespace-nowrap px-3 py-2.5"><span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">${SJ_STATUS_LABEL[row.status] || row.status}</span></td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${tgl}</td>
          </tr>
        `);
      } else {
        const tglKirim = row.penjualan_tanggal_kirim
          ? new Date(row.penjualan_tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : '-';
        const $tr = $(`
          <tr>
            <td class="whitespace-nowrap px-3 py-2.5 font-medium text-ink">${row.client_nama}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${row.kota_tujuan || '-'}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${row.no_spk || '-'}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${tglKirim}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-right"><button class="btn-buat-sj rounded-lg bg-route px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Buat SJ</button></td>
          </tr>
        `);
        $tr.find('.btn-buat-sj').on('click', () => {
          setPrefillPenjualanId(row.penjualan_id);
          navigate('/admin/sj/new');
        });
        $tbody.append($tr);
      }
    });

    $tableWrap.append($table);
    $card.append($tableWrap);
  }

  await load();
}
