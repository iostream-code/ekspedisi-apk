import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { pageLoaderHtml, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { APP_CONFIG } from '../config.js';

const STATUS_LABEL = { draft: 'Draft (belum ada foto)', terkirim: 'Terkirim' };
const STATUS_CLASS = { draft: 'bg-yellow-50 text-yellow-700', terkirim: 'bg-status-online/10 text-status-online' };

/**
 * Daftar surat jalan MILIK app ini sendiri (ekspedisi_t_surat_jalan) -- dua
 * sumber baris tercampur di sini: otomatis dari checkpoint foto "sj" supir
 * (trip_id terisi), dan manual dibuat admin lewat "+ Buat SJ" (trip_id boleh
 * kosong). SAMA SEKALI TIDAK berhubungan dengan tabel surat_jalan lama milik
 * backend-production (itu cuma dipakai fitur "Cek" no_surat_jalan di form
 * Perjalanan Baru, lihat adminNewTrip.js).
 */
export async function renderAdminSuratJalan($container) {
  renderNavbar($container, 'Surat Jalan', { onBack: () => navigate('/admin') });

  const $main = $(`<main class="flex-1 space-y-3 p-4">${pageLoaderHtml('Memuat data...')}</main>`);
  $container.append($main);

  let list;
  try {
    list = await api.get('/admin/sj');
  } catch (e) {
    $main.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
    return;
  }

  $main.empty();
  $main.append(`
    <a href="#/admin/sj/new" class="btn-route flex items-center justify-center">+ Buat Surat Jalan</a>
  `);

  if (!list.length) {
    $main.append(emptyStateHtml());
    return;
  }

  list.forEach((sj) => {
    const tgl = sj.created_at ? new Date(sj.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    $main.append(`
      <div class="card p-4">
        <div class="flex items-center justify-between">
          <p class="font-display font-semibold text-ink">${sj.no_surat_jalan || '(nomor belum di-generate)'}</p>
          <span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}">${STATUS_LABEL[sj.status] || sj.status}</span>
        </div>
        <p class="mt-1 text-sm text-slate-500">${sj.tujuan || '-'}</p>
        <p class="mt-1 text-xs text-slate-400">
          ${sj.nama_supir || 'Belum ada supir'}${sj.kendaraan ? ' &middot; ' + sj.kendaraan : ''}${sj.plat ? ' (' + sj.plat + ')' : ''}
          ${sj.jumlah_kirim ? ' &middot; ' + sj.jumlah_kirim + ' unit' : ''}
        </p>
        <p class="mt-1 text-xs text-slate-400">${tgl}${sj.trip_id ? ' &middot; dari trip #' + sj.trip_id : ' &middot; dibuat manual'}${sj.penjualan_id ? ' &middot; SPK ' + sj.penjualan_id : ''}</p>
        ${sj.foto_surat_jalan ? `<img src="${APP_CONFIG.API_BASE_URL}/${sj.foto_surat_jalan}" class="mt-2 h-20 w-20 rounded-lg border border-slate-200 object-cover" />` : ''}
      </div>
    `);
  });
}
