import $ from 'jquery';
import { navigate } from '../router.js';

const TABS = [
  { key: 'sj', label: 'SJ', path: '/admin/sj' },
  // Label "Monitoring" (2026-08-23, dulu "Ekspedisi") -- key & path SENGAJA
  // tidak ikut diganti (cuma teks tampilan yang berubah, bukan identitas
  // internal/route-nya) -- lihat renderAdminDashboard() di adminDashboard.js.
  { key: 'ekspedisi', label: 'Monitoring', path: '/admin/ekspedisi' },
];

/**
 * Tab bar 2 menu tetap (SJ/Monitoring) di bawah topbar -- dipasang cuma di 2
 * halaman ROOT admin (adminSuratJalan/adminDashboard). Halaman drill-down
 * (detail supir, buat SJ, tambah supir) TIDAK pakai ini -- itu tetap navbar
 * biasa + tombol back.
 *
 * **[DISEDERHANAKAN 2026-08-23]** Tab "SPK" (dulu halaman awal admin,
 * `adminSpkBelumSj.js`) DIHAPUS -- app dipangkas jadi 2 halaman admin saja.
 * Admin sekarang bikin SJ langsung dari tombol "+ Buat SJ" di tab SJ (nomor
 * SJ diinput manual, cocok nomor kertas fisik -- lihat adminSuratJalan.js/
 * adminNewSuratJalan.js), tidak lagi lewat drill-down dari daftar SPK.
 * `/admin` (landing page admin setelah login) sekarang mengarah ke tab SJ
 * juga (lihat main.js) -- tab bar di sini otomatis konsisten krn keduanya
 * render fungsi yang sama (renderAdminSuratJalan).
 *
 * Ukuran (px-1.5 py-1 container, gap-1, text-xs font-bold pada tiap tombol)
 * disamakan dgn tab bar inventory-apk (2026-08-22, lihat #nav-tabs-primary /
 * .hnt-tab-primary di shell.js sana) -- dulu px-3 py-2/gap-1.5/text-sm
 * font-semibold, lebih besar drpd konvensi inventory-apk. Warna tab TIDAK
 * aktif juga digelapkan sedikit (text-slate-500 -> text-slate-600, sama
 * arah perubahan yg dilakukan di inventory-apk).
 * @param {'sj'|'ekspedisi'} active
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
