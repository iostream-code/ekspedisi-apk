import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { renderPagination } from '../components/pagination.js';
import { renderModal } from '../components/modal.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { APP_CONFIG } from '../config.js';
import { takePhoto } from '../camera.js';
import { formatSpkNo, toTitleCase } from '../format.js';

const STATUS_LABEL = { draft: 'Draft', terkirim: 'Terkirim', tervalidasi: 'Tervalidasi' };
const STATUS_CLASS = {
  draft: 'bg-yellow-50 text-yellow-700',
  terkirim: 'bg-status-online/10 text-status-online',
  tervalidasi: 'bg-brand-100 text-brand-700',
};

// Baris hasil migrate_legacy_surat_jalan.php (ekspedisi-apk-backend) simpan
// foto sbg URL ABSOLUT ke host lama (https://indokoper.com/foto_surat_jalan/...)
// -- beda dari baris native yang path-nya RELATIF ke API_BASE_URL app ini
// sendiri. Jangan digabung dgn API_BASE_URL kalau sudah absolut.
function fotoUrl(path) {
  return /^https?:\/\//.test(path) ? path : `${APP_CONFIG.API_BASE_URL}/${path}`;
}

function formatTanggal(value) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}

// 1 SJ bisa mengangkut lini produk dari lebih dari 1 SPK -- daftar SPK
// diturunkan dari items (bukan cuma kolom header penjualan_id, yang cuma
// relevan utk SJ trip-linked lama yang selalu 1 SPK).
function buildSpkLabel(sj) {
  const spkIds = [...new Set((sj.items || []).map((it) => it.penjualan_id).filter(Boolean))];
  const ids = spkIds.length ? spkIds : (sj.penjualan_id ? [sj.penjualan_id] : []);
  return ids.map(formatSpkNo).join(', ');
}

function buildKirimLinesHtml(sj) {
  if ((sj.items || []).length) {
    return sj.items.map((it) => `<p>${it.penjualan_jenis || '(tanpa nama)'}: ${it.jumlah_kirim}</p>`).join('');
  }
  return sj.jumlah_kirim ? `<p>${sj.jumlah_kirim} unit</p>` : '<p class="text-slate-400">-</p>';
}

function clientLabel(sj) {
  return (sj.client_names || []).length ? sj.client_names.map(toTitleCase).join(' | ') : '-';
}

/**
 * Isi modal "Detail Surat Jalan" -- info yang DULUNYA tersebar di beberapa
 * kolom tabel (Supir, Kirim, Dibuat, Foto, badge "Data Lama"/info validasi)
 * dipindah ke sini semua (2026-08-20) supaya tabel tetap ringkas: cuma No SJ,
 * Tujuan, Klien, Dikirim, Status. Dibangun ulang tiap kali tombol "Detail"
 * diklik (bukan live-bound) -- `sj` di closure pemanggil sudah di-mutate
 * (Object.assign) begitu aksi Validasi sukses, jadi kalau Detail dibuka
 * SESUDAH validasi, datanya otomatis terbaru.
 */
function detailBodyHtml(sj) {
  const spkLabel = buildSpkLabel(sj);
  const tglDibuat = formatTanggal(sj.created_at);
  const tglKirim = formatTanggal(sj.tgl_kirim);
  const hasFoto = sj.foto_surat_jalan || sj.foto_validasi;

  return `
    <dl class="space-y-4 text-sm">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Ringkasan</dt>
        <dd class="mt-1 text-slate-700">
          <p class="font-medium text-ink">${sj.no_surat_jalan || '(belum di-generate)'}
            ${sj.asal === 'migrasi_legacy' ? '<span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500" title="Dimigrasi dari surat_jalan lama (backend-production)">Data Lama</span>' : ''}
          </p>
          <p class="mt-0.5 text-xs text-slate-400">${sj.trip_id ? 'Dari trip #' + sj.trip_id : 'Dibuat manual'}${spkLabel ? ' &middot; SPK ' + spkLabel : ''}</p>
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Tujuan</dt>
        <dd class="mt-1 text-slate-700">${sj.tujuan || '-'}</dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Supir &amp; Kendaraan</dt>
        <dd class="mt-1 text-slate-700">
          <p>${sj.nama_supir || 'Belum ada supir'}</p>
          <p class="text-xs text-slate-400">${sj.kendaraan || '-'}${sj.plat ? ' (' + sj.plat + ')' : ''}</p>
          ${sj.penerima ? `<p class="mt-1 text-xs text-slate-400">Penerima: ${sj.penerima}</p>` : ''}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Rincian Kirim</dt>
        <dd class="mt-1 text-slate-700">${buildKirimLinesHtml(sj)}</dd>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dikirim</dt>
          <dd class="mt-1 text-slate-700">${tglKirim || '-'}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dibuat</dt>
          <dd class="mt-1 text-slate-700">${tglDibuat || '-'}</dd>
        </div>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
        <dd class="mt-1">
          <span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}">${STATUS_LABEL[sj.status] || sj.status}</span>
          ${sj.status === 'tervalidasi' ? `<p class="mt-1 text-xs text-brand-700">${sj.nama_validator || ''}${sj.divalidasi_at ? ' &middot; ' + formatTanggal(sj.divalidasi_at) : ''}</p>` : ''}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Foto</dt>
        <dd class="mt-1 flex gap-2">
          ${sj.foto_surat_jalan ? `<img src="${fotoUrl(sj.foto_surat_jalan)}" data-lightbox class="h-16 w-16 cursor-zoom-in rounded-lg border border-slate-200 object-cover" title="Foto lapangan" />` : ''}
          ${sj.foto_validasi ? `<img src="${fotoUrl(sj.foto_validasi)}" data-lightbox class="h-16 w-16 cursor-zoom-in rounded-lg border-2 border-brand-400 object-cover" title="Foto validasi" />` : ''}
          ${hasFoto ? '' : '<p class="text-xs text-slate-400">Belum ada foto.</p>'}
        </dd>
      </div>
    </dl>
  `;
}

/**
 * Tab "SJ". Model tabel (bukan kartu), meniru pola toolbar "Data | jumlah +
 * tombol Refresh/Riwayat" di surat-jalan-apk (lihat components/tableToolbar.js).
 * Dua sumber baris tercampur: otomatis dari checkpoint foto "sj" supir
 * (trip_id terisi), dan manual dibuat admin lewat "+ Buat SJ" (trip_id boleh
 * kosong). SAMA SEKALI TIDAK berhubungan dengan tabel surat_jalan lama milik
 * backend-production (itu cuma dipakai fitur "Cek" no_surat_jalan di form
 * Perjalanan Baru, lihat adminNewTrip.js).
 *
 * Dua mode:
 * - Aktif (default): SEMUA status (draft/terkirim/tervalidasi) tercampur --
 *   ini memang tujuan utama tab ini, supaya admin lihat progres apa adanya.
 * - Riwayat: filter status='tervalidasi' (SJ yang closing-nya sudah selesai).
 * Server-side pagination+search (2026-08-20, tabel ini bisa py ribuan baris
 * stlh migrate_legacy_surat_jalan.php) -- historyMode JUGA jadi filter
 * server (?status=tervalidasi), BUKAN filter client-side lagi, krn cuma 1
 * halaman data yang ada di browser kapan pun (filter client-side thd 1
 * halaman = hasil salah/tidak lengkap).
 *
 * Kolom tabel (2026-08-20, dirampingkan; kolom Tujuan ikut dicopot susulan
 * hari yang sama) -- No SJ, Klien, Dikirim, Status, Aksi. Info sekunder
 * (Tujuan, Supir/kendaraan, Penerima, breakdown Kirim, tanggal Dibuat,
 * badge "Data Lama"/info validasi, Foto) dipindah ke modal "Detail Surat
 * Jalan" (lihat detailBodyHtml() & components/modal.js) -- dipicu tombol
 * "Detail" di kolom Aksi, supaya tabel tidak melebar/menurun cuma gara-gara
 * info yang tidak selalu perlu dilihat sekilas.
 */
export async function renderAdminSuratJalan($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'sj');

  const $main = $(`<main class="flex-1 space-y-3 p-4"></main>`);
  $container.append($main);

  const $tableSection = $(`<div></div>`);
  $main.append($tableSection);

  let historyMode = false;
  let query = '';
  let page = 1;
  const perPage = 20;

  async function load() {
    $tableSection.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    let result;
    try {
      result = await api.get(`/admin/sj?${new URLSearchParams({
        ...(historyMode ? { status: 'tervalidasi' } : {}),
        ...(query ? { q: query } : {}),
        page: String(page),
        per_page: String(perPage),
      })}`);
    } catch (e) {
      $tableSection.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render(result);
  }

  function render({ data: list, total }) {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $tableSection.empty().append($card);

    renderTableToolbar($card, {
      count: total,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => {
        historyMode = !historyMode;
        page = 1;
        load();
      },
      addLabel: '+ Buat SJ',
      onAdd: () => navigate('/admin/sj/new'),
      searchValue: query,
      onSearch: (val) => {
        query = val;
        page = 1;
        load();
      },
    });

    if (!list.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    // max-h + overflow-y-auto di sini (bukan di <table>/<tbody> langsung --
    // scroll vertikal HTML tabel cuma bisa dikontrol lewat wrapper-nya) +
    // thead `sticky top-0` di bawah supaya header ikut "nempel" pas scroll --
    // secara visual cuma badan tabel yang bergerak, bukan seluruh halaman
    // (toolbar & paginasi tetap kelihatan tanpa perlu scroll dokumen).
    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-center">No SJ</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Klien</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Dikirim</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Status</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    list.forEach((sj) => {
      const tglKirim = formatTanggal(sj.tgl_kirim);

      const $tr = $(`
        <tr>
          <td class="whitespace-nowrap px-3 py-2.5 align-top font-medium text-ink">${sj.no_surat_jalan || '(belum di-generate)'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-600">${clientLabel(sj)}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${tglKirim || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top">
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}" data-status-badge>${STATUS_LABEL[sj.status] || sj.status}</span>
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top">
            <div class="flex gap-1.5" data-aksi></div>
          </td>
        </tr>
      `);

      const $detailBtn = $(`<button class="btn-table-action bg-slate-100 text-slate-600 hover:bg-slate-200">Detail</button>`);
      $detailBtn.on('click', () => renderModal({ title: 'Detail Surat Jalan', bodyHtml: detailBodyHtml(sj) }));
      $tr.find('[data-aksi]').append($detailBtn);

      if (sj.status !== 'tervalidasi') {
        // SJ fisik yang sudah ditandatangani penerima & dibawa balik supir --
        // admin foto dokumen final itu di sini, sekalian menutup alur validasi.
        const $btn = $(`<button class="btn-table-action border border-slate-200 text-ink hover:bg-slate-50">Validasi</button>`);
        $btn.on('click', async () => {
          let blob;
          try {
            blob = await takePhoto();
          } catch (e) {
            return; // batal ambil foto
          }
          setButtonLoading($btn, true, '...');
          api.uploadFile(`/admin/sj/${sj.id}/validasi`, blob, 'photo')
            .then((updated) => {
              // Sinkronkan `sj` di closure ini dgn response terbaru (status,
              // foto_validasi, nama_validator, divalidasi_at) -- dipakai
              // kalau admin buka "Detail" SESUDAH validasi ini.
              Object.assign(sj, updated);
              $tr.find('[data-status-badge]')
                .removeClass('bg-yellow-50 text-yellow-700 bg-status-online/10 text-status-online')
                .addClass('bg-brand-100 text-brand-700')
                .text(STATUS_LABEL.tervalidasi);
              $btn.remove();
            })
            .catch((xhr) => {
              alert(xhr?.responseJSON?.message || 'Gagal memvalidasi surat jalan. Coba lagi.');
              setButtonLoading($btn, false);
            });
        });
        $tr.find('[data-aksi]').append($btn);
      }

      $tbody.append($tr);
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
}
