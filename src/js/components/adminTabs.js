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
 *
 * Ukuran (px-1.5 py-1 container, gap-1, text-xs font-bold pada tiap tombol)
 * disamakan dgn tab bar inventory-apk (2026-08-22, lihat #nav-tabs-primary /
 * .hnt-tab-primary di shell.js sana) -- dulu px-3 py-2/gap-1.5/text-sm
 * font-semibold, lebih besar drpd konvensi inventory-apk. Warna tab TIDAK
 * aktif juga digelapkan sedikit (text-slate-500 -> text-slate-600, sama
 * arah perubahan yg dilakukan di inventory-apk).
 * @param {'spk'|'sj'|'ekspedisi'} active
 */
export function renderAdminTabs($container, active) {
  const $tabs = $(`
    <nav class="flex gap-1 border-b border-slate-200 bg-white px-1.5 py-1">
      ${TABS.map((t) => `
        <button data-tab="${t.key}" class="flex-1 rounded-md py-2 text-xs font-bold transition ${
          t.key === active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
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
