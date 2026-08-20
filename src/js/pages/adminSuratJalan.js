import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { APP_CONFIG } from '../config.js';
import { takePhoto } from '../camera.js';

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
 * - Riwayat: filter cuma status 'tervalidasi' (SJ yang closing-nya sudah
 *   selesai) -- diturunkan client-side dari data yang sama, tanpa endpoint baru.
 */
export async function renderAdminSuratJalan($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'sj');

  const $main = $(`<main class="flex-1 space-y-3 p-4"></main>`);
  $container.append($main);

  const $tableSection = $(`<div></div>`);
  $main.append($tableSection);

  let historyMode = false;

  async function load() {
    $tableSection.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    let list;
    try {
      list = await api.get('/admin/sj');
    } catch (e) {
      $tableSection.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render(historyMode ? list.filter((sj) => sj.status === 'tervalidasi') : list);
  }

  function render(list) {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $tableSection.empty().append($card);

    renderTableToolbar($card, {
      count: list.length,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => {
        historyMode = !historyMode;
        load();
      },
      addLabel: '+ Buat SJ',
      onAdd: () => navigate('/admin/sj/new'),
    });

    if (!list.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    const $tableWrap = $(`<div class="overflow-x-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-left">No SJ</th>
            <th class="whitespace-nowrap px-3 py-2 text-left">Tujuan / Supir</th>
            <th class="whitespace-nowrap px-3 py-2 text-left">Kirim</th>
            <th class="whitespace-nowrap px-3 py-2 text-left">Tanggal</th>
            <th class="whitespace-nowrap px-3 py-2 text-left">Status</th>
            <th class="whitespace-nowrap px-3 py-2 text-left">Foto</th>
            <th class="whitespace-nowrap px-3 py-2 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    list.forEach((sj) => {
      const tgl = sj.created_at ? new Date(sj.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
      const tglKirim = sj.tgl_kirim ? new Date(sj.tgl_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
      const kirimLines = (sj.items || []).length
        ? sj.items.map((it) => `<p>${it.penjualan_jenis || '(tanpa nama)'}: ${it.jumlah_kirim}</p>`).join('')
        : (sj.jumlah_kirim ? `<p>${sj.jumlah_kirim} unit</p>` : '-');
      // 1 SJ bisa mengangkut lini produk dari lebih dari 1 SPK -- daftar SPK
      // diturunkan dari items (bukan cuma kolom header penjualan_id, yang
      // cuma relevan utk SJ trip-linked lama yang selalu 1 SPK).
      const spkIds = [...new Set((sj.items || []).map((it) => it.penjualan_id).filter(Boolean))];
      const spkLabel = spkIds.length ? spkIds.join(', ') : sj.penjualan_id;

      const $tr = $(`
        <tr>
          <td class="whitespace-nowrap px-3 py-2.5 align-top">
            <p class="font-medium text-ink">${sj.no_surat_jalan || '(belum di-generate)'}</p>
            <p class="text-xs text-slate-400">${sj.trip_id ? 'dari trip #' + sj.trip_id : 'dibuat manual'}${spkLabel ? ' &middot; SPK ' + spkLabel : ''}</p>
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top">
            <p class="text-ink">${sj.tujuan || '-'}</p>
            <p class="text-xs text-slate-400">${sj.nama_supir || 'Belum ada supir'}${sj.kendaraan ? ' &middot; ' + sj.kendaraan : ''}${sj.plat ? ' (' + sj.plat + ')' : ''}</p>
            ${sj.penerima ? `<p class="text-xs text-slate-400">Penerima: ${sj.penerima}</p>` : ''}
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${kirimLines}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${tgl}${tglKirim ? `<br>kirim ${tglKirim}` : ''}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top">
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}" data-status-badge>${STATUS_LABEL[sj.status] || sj.status}</span>
            ${sj.asal === 'migrasi_legacy' ? '<span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500" title="Dimigrasi dari surat_jalan lama (backend-production)">Data Lama</span>' : ''}
            <div class="mt-1" data-validasi-info></div>
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top">
            <div class="flex gap-1.5" data-photos>
              ${sj.foto_surat_jalan ? `<a href="${fotoUrl(sj.foto_surat_jalan)}" target="_blank"><img src="${fotoUrl(sj.foto_surat_jalan)}" class="h-12 w-12 rounded-lg border border-slate-200 object-cover" title="Foto lapangan" /></a>` : ''}
              ${sj.foto_validasi ? `<a href="${fotoUrl(sj.foto_validasi)}" target="_blank"><img src="${fotoUrl(sj.foto_validasi)}" class="h-12 w-12 rounded-lg border-2 border-brand-400 object-cover" title="Foto validasi" /></a>` : ''}
            </div>
          </td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top" data-aksi></td>
        </tr>
      `);

      if (sj.status === 'tervalidasi') {
        $tr.find('[data-validasi-info]').html(
          `<p class="text-[11px] text-brand-700">${sj.nama_validator || ''}${sj.divalidasi_at ? ' &middot; ' + new Date(sj.divalidasi_at).toLocaleDateString('id-ID') : ''}</p>`
        );
      } else {
        // SJ fisik yang sudah ditandatangani penerima & dibawa balik supir --
        // admin foto dokumen final itu di sini, sekalian menutup alur validasi.
        const $btn = $(`<button class="btn-ghost !py-1.5 px-2.5 text-xs">Validasi</button>`);
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
              $tr.find('[data-status-badge]')
                .removeClass('bg-yellow-50 text-yellow-700 bg-status-online/10 text-status-online')
                .addClass('bg-brand-100 text-brand-700')
                .text(STATUS_LABEL.tervalidasi);
              if (updated.foto_validasi) {
                $tr.find('[data-photos]').append(
                  `<a href="${fotoUrl(updated.foto_validasi)}" target="_blank"><img src="${fotoUrl(updated.foto_validasi)}" class="h-12 w-12 rounded-lg border-2 border-brand-400 object-cover" title="Foto validasi" /></a>`
                );
              }
              $tr.find('[data-validasi-info]').html(
                `<p class="text-[11px] text-brand-700">${updated.nama_validator || ''}${updated.divalidasi_at ? ' &middot; ' + new Date(updated.divalidasi_at).toLocaleDateString('id-ID') : ''}</p>`
              );
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
  }

  await load();
}
