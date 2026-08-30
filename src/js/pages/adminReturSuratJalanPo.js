import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderSjSubTabs } from '../components/sjSubTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { renderPagination } from '../components/pagination.js';
import { renderModal } from '../components/modal.js';
import { pageLoaderHtml, emptyStateHtml } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { APP_CONFIG } from '../config.js';

const STATUS_LABEL = { PARTIAL_RECEIVED: 'Sebagian Diterima', RECEIVED: 'Diterima', CANCELLED: 'Dibatalkan' };
const STATUS_CLASS = {
  PARTIAL_RECEIVED: 'bg-yellow-50 text-yellow-700',
  RECEIVED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-status-alert/10 text-status-alert',
};

function fotoUrl(path) {
  return /^https?:\/\//.test(path) ? path : `${APP_CONFIG.API_BASE_URL}/${path}`;
}

function formatTanggal(value) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}

function detailBodyHtml(sj) {
  const items = sj.items || [];
  const itemRows = items.map((it) => `
    <tr class="border-t border-slate-100 text-sm">
      <td class="py-1.5 pr-2 text-slate-700">${it.material_name || '-'}<span class="text-xs text-slate-400"> ${it.unit_code || ''}</span></td>
      <td class="py-1.5 text-right font-medium text-ink">${it.qty}</td>
    </tr>
  `).join('');

  return `
    <dl class="space-y-4 text-sm">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Ringkasan</dt>
        <dd class="mt-1 text-slate-700">
          <p class="font-medium text-ink">${sj.sj_number || '-'}</p>
          <p class="mt-0.5 text-xs text-slate-400">Ref. Retur: ${sj.retur_number || '-'} &middot; Supplier: ${sj.supplier_name || '-'}</p>
        </dd>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Supir</dt>
          <dd class="mt-1 text-slate-700">${sj.transporter_name || '-'}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Kendaraan</dt>
          <dd class="mt-1 text-slate-700">${sj.vehicle_number || '-'}</dd>
        </div>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Diterima</dt>
        <dd class="mt-1 text-slate-700">${formatTanggal(sj.received_at || sj.sj_date) || '-'}</dd>
      </div>
      ${sj.notes ? `
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan</dt>
        <dd class="mt-1 text-slate-700">${sj.notes}</dd>
      </div>` : ''}
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
        <dd class="mt-1"><span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}">${STATUS_LABEL[sj.status] || sj.status}</span></dd>
      </div>
      ${sj.receive_photo_path ? `
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Bukti Terima</dt>
        <dd class="mt-1"><img src="${fotoUrl(sj.receive_photo_path)}" data-lightbox class="h-20 w-20 cursor-zoom-in rounded-lg border border-slate-200 object-cover" alt="Bukti terima" /></dd>
      </div>` : ''}
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Item</dt>
        <dd class="mt-1">
          <table class="w-full text-sm">
            <tbody>${itemRows || '<tr><td class="py-2 text-slate-400">Tidak ada item.</td></tr>'}</tbody>
          </table>
        </dd>
      </div>
    </dl>
  `;
}

/**
 * Submenu "Retur" di tab SJ (2026-08-30, BARU -- rombak alur Retur/PO) --
 * SJ pengganti dari retur PO, pur_t_surat_jalan (skema MILIK modul Purchase
 * backend-production, baca/tulis LANGSUNG dari sini via
 * ReturPoSuratJalanController di backend-migrasi -- lihat docblock
 * App\Ekspedisi\Support\ReturPoSuratJalan utk alasan lengkap).
 *
 * Alur: Admin Inventory ajukan retur (inventory-apk) -> User Pusat approve
 * (produksi-apk) -> muncul di sini (outstanding) -> Admin Ekspedisi
 * menjadwalkan & input SJ SETELAH barang pengganti fisik sampai (pola SAMA
 * PERSIS dgn "PO" -- 1 langkah, SJ langsung final, lihat
 * adminNewReturSuratJalanPo.js).
 *
 * Backend (`GET /admin/sj-retur-po`) SAMA POLA dgn `/admin/sj-po` (array
 * polos, LIMIT 200) -- filter tahun/pencarian/pagination client-side.
 * Mode Aktif = PARTIAL_RECEIVED, Riwayat = RECEIVED/CANCELLED.
 */
export async function renderAdminReturSuratJalanPo($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'sj');
  renderSjSubTabs($container, 'retur');

  const $main = $(`<main class="flex-1 space-y-3 p-4"></main>`);
  $container.append($main);

  const $tableSection = $(`<div></div>`);
  $main.append($tableSection);

  let historyMode = false;
  let query = '';
  const currentYear = new Date().getFullYear();
  let tahun = String(currentYear);
  let page = 1;
  const perPage = 20;
  let allRows = [];

  async function load() {
    $tableSection.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    const statusFilter = historyMode ? 'RECEIVED,CANCELLED' : 'PARTIAL_RECEIVED';
    try {
      allRows = await api.get(`/admin/sj-retur-po?${new URLSearchParams({ status: statusFilter })}`);
    } catch (e) {
      $tableSection.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render();
  }

  function tahunOf(sj) {
    const raw = sj.received_at || sj.sj_date;
    return raw ? String(new Date(raw).getFullYear()) : null;
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    return allRows.filter((sj) => {
      if (tahunOf(sj) !== tahun) return false;
      if (!q) return true;
      return (sj.sj_number || '').toLowerCase().includes(q)
        || (sj.retur_number || '').toLowerCase().includes(q)
        || (sj.supplier_name || '').toLowerCase().includes(q);
    });
  }

  function render() {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $tableSection.empty().append($card);

    const matched = filtered();
    let years = [...new Set(allRows.map(tahunOf).filter(Boolean))].sort((a, b) => b - a);
    if (!years.includes(String(currentYear))) years = [currentYear, ...years].sort((a, b) => b - a);

    renderTableToolbar($card, {
      count: matched.length,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => { historyMode = !historyMode; page = 1; load(); },
      addLabel: '+ Buat SJ Retur',
      onAdd: () => navigate('/admin/sj/retur-po/new'),
      searchValue: query,
      onSearch: (val) => { query = val; page = 1; render(); },
      yearOptions: years,
      yearValue: tahun,
      onYearChange: (val) => { tahun = val; page = 1; render(); },
    });

    if (!matched.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(matched.length / perPage));
    if (page > totalPages) page = totalPages;
    const list = matched.slice((page - 1) * perPage, page * perPage);

    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm tbl-bordered">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-center">No SJ</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Ref. Retur</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Supplier</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Supir / Kendaraan</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    list.forEach((sj) => {
      const $tr = $(`
        <tr class="cursor-pointer hover:bg-slate-50" title="Dobel klik untuk lihat detail">
          <td class="whitespace-nowrap px-3 py-2.5 align-top font-medium text-ink">${sj.sj_number || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-600">${sj.retur_number || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-600">${sj.supplier_name || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${sj.transporter_name || '-'}${sj.vehicle_number ? ' &middot; ' + sj.vehicle_number : ''}</td>
        </tr>
      `);

      $tr.on('dblclick', () => openDetail(sj.id));
      $tbody.append($tr);
    });

    $tableWrap.append($table);
    $card.append($tableWrap);

    renderPagination($card, {
      page,
      perPage,
      total: matched.length,
      onPageChange: (p) => { page = p; render(); },
    });
  }

  async function openDetail(id) {
    let sj;
    try {
      sj = await api.get(`/admin/sj-retur-po/${id}`);
    } catch (e) {
      alert('Gagal memuat detail SJ.');
      return;
    }

    renderModal({ title: 'Detail SJ Retur', bodyHtml: detailBodyHtml(sj) });
  }

  await load();
}
