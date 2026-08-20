import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { renderPagination } from '../components/pagination.js';
import { pageLoaderHtml, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { setPrefillPenjualanId } from '../prefill.js';
import { formatSpkNo, toTitleCase } from '../format.js';

const SJ_STATUS_LABEL = { draft: 'Draft', terkirim: 'Terkirim', tervalidasi: 'Tervalidasi' };

/**
 * 1 baris SJ -> 1 baris tabel PER SPK yang disentuh (biasanya 1, tapi bisa
 * lebih -- lihat App\Support\SuratJalan::items() di ekspedisi-apk-backend).
 * SJ tanpa SPK sama sekali (freeform) tidak ikut, krn tabel ini SPK-sentris.
 */
function flattenSjBySpk(sjList) {
  const rows = [];
  sjList.forEach((sj) => {
    const spkIds = [...new Set((sj.items || []).map((it) => it.penjualan_id).filter(Boolean))];
    (spkIds.length ? spkIds : sj.penjualan_id ? [sj.penjualan_id] : []).forEach((penjualanId) => {
      rows.push({ ...sj, penjualan_id: penjualanId });
    });
  });
  return rows;
}

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
 *   per baris cuma "Surat Jalan" -- plotting ke supir ada di tab Ekspedisi.
 * - Riwayat: SPK yang SUDAH ada SJ-nya -- diturunkan dari GET /admin/sj,
 *   tidak ada endpoint baru khusus krn datanya sudah tersedia dari situ. 1
 *   baris SJ di-"flatten" jadi beberapa baris tabel kalau items-nya
 *   menyentuh lebih dari 1 SPK sekaligus (2026-08-20), supaya kolom SPK di
 *   sini selalu 1 nilai per baris.
 * Server-side pagination+search di kedua mode (2026-08-20, tab ini bisa py
 * banyak baris jg setelah migrate_legacy_surat_jalan.php nambahin ribuan SJ
 * historis) -- total/page/per_page pada paginasi selalu mengacu ke jumlah
 * baris SUMBER (SPK atau SJ) dari server, BUKAN jumlah baris hasil flatten
 * yang ditampilkan (mode Riwayat bisa nampilin lebih banyak baris dari
 * per_page kalau ada SJ yang nyentuh >1 SPK -- itu memang konsekuensi
 * flatten-nya, bukan bug).
 *
 * Notifikasi "SPK baru" (2026-08-20) — polling ringan tiap
 * `NEW_DATA_POLL_MS` ke `GET /admin/spk-belum-sj` (independen dari
 * page/query/historyMode yang lagi ditampilkan user, per_page besar biar
 * sekali ambil cukup) buat DETEKSI baris baru (bandingkan `penjualan_id`
 * yang belum pernah kelihatan). Begitu ketemu, tampil banner di
 * `$bannerSlot` (sengaja di LUAR `$main` — `render()` bikin ulang isi
 * `$main` tiap search/toggle/refresh, taruh di luar itu supaya banner tidak
 * ikut lenyap). Baseline pertama (poll pertama kali) TIDAK dianggap "baru"
 * semua -- cuma penambahan SETELAH baseline yang memicu notifikasi.
 */
export async function renderAdminSpkBelumSj($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'spk');

  const $bannerSlot = $(`<div></div>`);
  $container.append($bannerSlot);

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  let historyMode = false;
  let query = '';
  let page = 1;
  const perPage = 20;

  const NEW_DATA_POLL_MS = 20000;
  let knownSpkIds = null; // null = belum ada baseline
  let newCount = 0;

  function renderBanner() {
    if (newCount <= 0) {
      $bannerSlot.empty();
      return;
    }
    $bannerSlot.html(`
      <div class="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <div class="flex items-center gap-2 text-amber-800">
          <span class="relative flex h-2.5 w-2.5 shrink-0">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          </span>
          <p class="font-medium">${newCount} SPK baru siap dikirim, belum ada SJ.</p>
        </div>
        <button id="btn-banner-reload" class="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Muat Ulang</button>
      </div>
    `);
    $bannerSlot.find('#btn-banner-reload').on('click', () => {
      newCount = 0;
      $bannerSlot.empty();
      historyMode = false;
      page = 1;
      load();
    });
  }

  async function pollForNewSpk() {
    let result;
    try {
      result = await api.get(`/admin/spk-belum-sj?${new URLSearchParams({ page: '1', per_page: '100' })}`);
    } catch (e) {
      return; // gagal poll -- diam-diam, coba lagi di siklus berikutnya
    }
    const ids = result.data.map((row) => row.penjualan_id);
    if (knownSpkIds === null) {
      knownSpkIds = new Set(ids); // baseline pertama, belum ada yg dianggap "baru"
      return;
    }
    const freshIds = ids.filter((id) => !knownSpkIds.has(id));
    if (freshIds.length) {
      freshIds.forEach((id) => knownSpkIds.add(id));
      newCount += freshIds.length;
      renderBanner();
    }
  }

  const pollTimer = setInterval(pollForNewSpk, NEW_DATA_POLL_MS);
  // Bersihkan timer saat pindah halaman (pola sama dgn auto-refresh 15 detik
  // di adminDashboard.js) -- tanpa ini polling tetap jalan di background
  // walau admin sudah pindah ke halaman lain.
  window.addEventListener('hashchange', function cleanup() {
    clearInterval(pollTimer);
    window.removeEventListener('hashchange', cleanup);
  });

  async function load() {
    $main.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    const params = new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page), per_page: String(perPage) });
    let result;
    try {
      result = await api.get(`${historyMode ? '/admin/sj' : '/admin/spk-belum-sj'}?${params}`);
    } catch (e) {
      $main.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render(result);
  }

  function render({ data, total }) {
    const rows = historyMode ? flattenSjBySpk(data) : data;
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $main.empty().append($card);

    renderTableToolbar($card, {
      count: total,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => {
        historyMode = !historyMode;
        page = 1;
        load();
      },
      searchValue: query,
      onSearch: (val) => {
        query = val;
        page = 1;
        load();
      },
    });

    if (!rows.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    // max-h + overflow-auto di wrapper (bukan di <table>/<tbody> langsung) +
    // thead `sticky top-0` -- secara visual cuma badan tabel yang scroll,
    // header & (di luar wrapper ini) toolbar/paginasi tetap kelihatan tanpa
    // perlu scroll dokumen (2026-08-20, konsisten dgn adminSuratJalan.js).
    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            ${historyMode
              ? '<th class="whitespace-nowrap px-3 py-2 text-center">SPK</th><th class="whitespace-nowrap px-3 py-2 text-center">No SJ</th><th class="whitespace-nowrap px-3 py-2 text-center">Tujuan</th><th class="whitespace-nowrap px-3 py-2 text-center">Status</th><th class="whitespace-nowrap px-3 py-2 text-center">Tanggal</th>'
              : '<th class="whitespace-nowrap px-3 py-2 text-center">SPK</th><th class="whitespace-nowrap px-3 py-2 text-center">Perusahaan</th><th class="whitespace-nowrap px-3 py-2 text-center">Kota Tujuan</th><th class="whitespace-nowrap px-3 py-2 text-center">Kirim</th><th class="whitespace-nowrap px-3 py-2 text-center">Aksi</th>'}
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
            <td class="whitespace-nowrap px-3 py-2.5 font-medium text-ink">${formatSpkNo(row.penjualan_id)}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${row.no_surat_jalan || '-'}</td>
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
            <td class="whitespace-nowrap px-3 py-2.5 font-medium text-ink">${formatSpkNo(row.penjualan_id) || '-'}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${toTitleCase(row.client_nama)}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${row.kota_tujuan || '-'}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-slate-500">${tglKirim}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-right"><button class="btn-buat-sj btn-table-action">Kirim</button></td>
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

    renderPagination($card, {
      page,
      perPage,
      total,
      onPageChange: (p) => {
        page = p;
        load();
      },
    });
  }

  await load();
  await pollForNewSpk(); // set baseline langsung -- tidak perlu nunggu siklus poll pertama (20 detik) buat baseline-nya siap
}
