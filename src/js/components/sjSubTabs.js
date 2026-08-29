import $ from 'jquery';
import { navigate } from '../router.js';

const SUB_TABS = [
  { key: 'customer', label: 'Customer', path: '/admin/sj' },
  { key: 'po', label: 'PO', path: '/admin/sj/po' },
];

/**
 * Sub-tab "Customer"/"PO" DI DALAM tab "SJ" (di bawah renderAdminTabs(),
 * bukan pengganti) -- 2026-08-26. Dua submenu ini beda TOTAL skema data:
 * "Customer" = ekspedisi_t_surat_jalan (adminSuratJalan.js, MILIK app ini),
 * "PO" = pur_t_surat_jalan (adminSuratJalanPo.js, MILIK modul Purchase di
 * backend-production, dibaca/ditulis langsung dari sini via
 * PoSuratJalanController -- lihat docblock controller itu).
 *
 * Gaya visual SENGAJA dibedakan dari renderAdminTabs() (pill kecil,
 * bg-slate-50 bukan bg-white polos, border rounded-full) supaya jelas ini
 * level navigasi KEDUA, bukan duplikat tab utama.
 * @param {'customer'|'po'} active
 */
export function renderSjSubTabs($container, active) {
  const $tabs = $(`
    <nav class="flex gap-1.5 rounded-full bg-slate-100 p-1 mb-3">
      ${SUB_TABS.map((t) => `
        <button data-subtab="${t.key}" class="flex-1 rounded-full py-1.5 text-xs font-bold transition ${
          t.key === active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
        }">${t.label}</button>
      `).join('')}
    </nav>
  `);

  $tabs.find('button').on('click', function () {
    const key = $(this).data('subtab');
    if (key !== active) navigate(SUB_TABS.find((t) => t.key === key).path);
  });

  $container.append($tabs);
}
