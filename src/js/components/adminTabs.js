import $ from 'jquery';
import { navigate } from '../router.js';

const TABS = [
  { key: 'spk', label: 'SPK', path: '/admin' },
  { key: 'sj', label: 'SJ', path: '/admin/sj' },
  { key: 'ekspedisi', label: 'Ekspedisi', path: '/admin/ekspedisi' },
];

/**
 * Tab bar 3 menu tetap (SPK/SJ/Ekspedisi) di bawah topbar -- dipasang cuma
 * di 3 halaman ROOT admin (adminSpkBelumSj/adminSuratJalan/adminDashboard).
 * Halaman drill-down (detail supir, buat SJ, tambah supir, plot SPK) TIDAK
 * pakai ini -- itu tetap navbar biasa + tombol back.
 * @param {'spk'|'sj'|'ekspedisi'} active
 */
export function renderAdminTabs($container, active) {
  const $tabs = $(`
    <nav class="flex gap-1.5 border-b border-slate-200 bg-white px-3 py-2">
      ${TABS.map((t) => `
        <button data-tab="${t.key}" class="flex-1 rounded-lg py-2 text-sm font-semibold transition ${
          t.key === active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
        }">${t.label}</button>
      `).join('')}
    </nav>
  `);

  $tabs.find('button').on('click', function () {
    const key = $(this).data('tab');
    if (key !== active) navigate(TABS.find((t) => t.key === key).path);
  });

  $container.append($tabs);
}
