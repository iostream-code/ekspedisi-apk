import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderSjSubTabs } from '../components/sjSubTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { renderModal } from '../components/modal.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

const STATUS_LABEL = { DRAFT: 'Draft', SENT: 'Dikirim', PARTIAL_RECEIVED: 'Sebagian Diterima', RECEIVED: 'Diterima', CANCELLED: 'Dibatalkan' };
const STATUS_CLASS = {
  DRAFT: 'bg-yellow-50 text-yellow-700',
  SENT: 'bg-status-online/10 text-status-online',
  PARTIAL_RECEIVED: 'bg-blue-50 text-blue-700',
  RECEIVED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-status-alert/10 text-status-alert',
};

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
          <p class="mt-0.5 text-xs text-slate-400">Supplier: ${sj.supplier_name || '-'}</p>
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
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dikirim</dt>
          <dd class="mt-1 text-slate-700">${formatTanggal(sj.sent_at) || '-'}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dibuat</dt>
          <dd class="mt-1 text-slate-700">${formatTanggal(sj.sj_date) || '-'}</dd>
        </div>
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
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Item</dt>
        <dd class="mt-1">
          <table class="w-full text-sm">
            <tbody>${itemRows || '<tr><td class="py-2 text-slate-400">Tidak ada item.</td></tr>'}</tbody>
          </table>
        </dd>
      </div>
      ${sj.status === 'DRAFT' ? '<div data-confirm-slot></div>' : ''}
    </dl>
  `;
}

/**
 * Submenu "PO" di tab SJ (2026-08-26) -- SJ Tarik utk Purchase Order,
 * pur_t_surat_jalan (skema MILIK modul Purchase backend-production, baca/
 * tulis LANGSUNG dari sini via PoSuratJalanController di backend-migrasi --
 * lihat docblock controller itu utk alasan lengkap kenapa fitur ini ada).
 *
 * Sengaja MVP: tanpa filter tahun (beda dari submenu "Customer", volume SJ
 * PO jauh lebih kecil -- baru mulai dipakai, lihat histori chat), tanpa
 * server-side pagination (LIMIT 200 di backend cukup jauh dari volume
 * realistis saat ini). Bisa ditingkatkan nanti kalau datanya sudah banyak,
 * sama pola dgn "Customer" (server-side pagination ditambah 2026-08-20
 * setelah migrate_legacy_surat_jalan.php bikin datanya jadi ribuan baris).
 *
 * Mode Aktif = status DRAFT/SENT (belum dikonfirmasi Jakarta), Riwayat =
 * RECEIVED/CANCELLED. PARTIAL_RECEIVED (dari confirm-jakarta produksi-apk
 * SEBELUM full-received) tetap masuk Aktif -- masih ada sisa yang jadi
 * urusan Ekspedisi kalau mau dikirim susulan.
 */
export async function renderAdminSuratJalanPo($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'sj');

  const $main = $(`<main class="flex-1 space-y-3 p-4"></main>`);
  $container.append($main);
  renderSjSubTabs($main, 'po');

  const $tableSection = $(`<div></div>`);
  $main.append($tableSection);

  let historyMode = false;
  let query = '';
  let allRows = [];

  async function load() {
    $tableSection.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    const statusFilter = historyMode ? 'RECEIVED,CANCELLED' : 'DRAFT,SENT,PARTIAL_RECEIVED';
    try {
      allRows = await api.get(`/admin/sj-po?${new URLSearchParams({ status: statusFilter })}`);
    } catch (e) {
      $tableSection.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render();
  }

  function filtered() {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((sj) =>
      (sj.sj_number || '').toLowerCase().includes(q) || (sj.supplier_name || '').toLowerCase().includes(q));
  }

  function render() {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $tableSection.empty().append($card);

    const list = filtered();

    renderTableToolbar($card, {
      count: list.length,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => { historyMode = !historyMode; load(); },
      addLabel: '+ Buat SJ Tarik',
      onAdd: () => navigate('/admin/sj/po/new'),
      searchValue: query,
      onSearch: (val) => { query = val; render(); },
    });

    if (!list.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm tbl-bordered">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-center">No SJ</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Supplier</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Supir / Kendaraan</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Status</th>
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
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-600">${sj.supplier_name || '-'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${sj.transporter_name || '-'}${sj.vehicle_number ? ' &middot; ' + sj.vehicle_number : ''}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-center"><span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}">${STATUS_LABEL[sj.status] || sj.status}</span></td>
        </tr>
      `);

      $tr.on('dblclick', () => openDetail(sj.id));
      $tbody.append($tr);
    });

    $tableWrap.append($table);
    $card.append($tableWrap);
  }

  async function openDetail(id) {
    let sj;
    try {
      sj = await api.get(`/admin/sj-po/${id}`);
    } catch (e) {
      alert('Gagal memuat detail SJ.');
      return;
    }

    const { close, $body } = renderModal({ title: 'Detail SJ Tarik', bodyHtml: detailBodyHtml(sj) });

    if (sj.status === 'DRAFT') {
      const $slot = $body.find('[data-confirm-slot]');
      const $btn = $(`<button class="btn-route w-full">Konfirmasi Kirim</button>`);
      $btn.on('click', async () => {
        setButtonLoading($btn, true, 'Memproses...');
        try {
          await api.post(`/admin/sj-po/${id}/confirm`, {});
          close();
          load();
        } catch (xhr) {
          alert(xhr?.responseJSON?.message || 'Gagal konfirmasi kirim.');
          setButtonLoading($btn, false);
        }
      });
      $slot.append($btn);
    }
  }

  await load();
}
