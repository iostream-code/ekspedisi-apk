import $ from 'jquery';
import { navigate } from '../router.js';

const SUB_TABS = [
  { key: 'customer', label: 'Customer', path: '/admin/sj' },
  { key: 'po', label: 'PO', path: '/admin/sj/po' },
];

/**
 * Sub-tab "Customer"/"PO" DI BAWAH tab "SJ" (renderAdminTabs(), bukan
 * pengganti) -- 2026-08-26. Dua submenu ini beda TOTAL skema data:
 * "Customer" = ekspedisi_t_surat_jalan (adminSuratJalan.js, MILIK app ini),
 * "PO" = pur_t_surat_jalan (adminSuratJalanPo.js, MILIK modul Purchase di
 * backend-production, dibaca/ditulis langsung dari sini via
 * PoSuratJalanController -- lihat docblock controller itu).
 *
 * **Menempel langsung ke renderAdminTabs() (2026-08-29, dulu pill
 * rounded-full melayang di dalam `$main` yang sudah berpadding `p-4`,
 * kelihatan seperti widget terpisah -- keluhan user)** -- dipanggil dgn
 * `$container` (halaman root), BUKAN `$main`, tepat sesudah
 * `renderAdminTabs()` & SEBELUM `$main` dibuat, jadi baris ini nempel pas di
 * bawah tab utama tanpa jarak/padding apa pun di antaranya, selebar penuh
 * layar sama seperti tab utama (bukan lagi dikurung margin `$main`).
 *
 * **Bentuk tombol disamakan ke referensi inventory-apk (2026-08-29, susulan
 * -- permintaan user "coba lihat referensi seperti di inventory-apk")** --
 * lihat `inventory-apk/src/lib/shell.js` (`#nav-tabs-secondary`/
 * `.hnt-tab-secondary`, baris sub-tab STOCK di bawah tab primary "STOCK").
 * Polanya: tombol `flex-1` MENGISI PENUH lebar (sama seperti tab utama,
 * BUKAN pill lebar-mengikuti-teks kayak versi sebelumnya), aktif = fill
 * solid `bg-brand-600 text-white` (SAMA PERSIS resep aktif tab utama, cuma
 * beda skala), tidak aktif = POLOS tanpa background (`text-slate-600` doang,
 * beda dari tab utama yang inaktifnya tetap dapat pill abu-abu
 * `bg-slate-100`) -- baris kedua ini SENGAJA lebih "ringan" drpd baris
 * pertama biar levelnya kebaca beda, persis kayak `.hnt-tab-secondary` di
 * referensi (toggle `bg-primary`/`text-white` doang pas aktif, TIDAK toggle
 * background apa pun pas tidak aktif). `bg-slate-50` (≈ `surface-raised`
 * `#f8fafc` inventory-apk, DIBULATKAN ke token yang sudah ada di sini) +
 * `border-b border-slate-200` (border tab utama app ini sendiri) tetap
 * dipertahankan sbg latar barisnya.
 * @param {'customer'|'po'} active
 */
export function renderSjSubTabs($container, active) {
  const $tabs = $(`
    <nav class="flex gap-1 border-b border-slate-200 bg-slate-50 px-1.5 py-1">
      ${SUB_TABS.map((t) => `
        <button data-subtab="${t.key}" class="flex-1 rounded py-1.5 text-center text-[11px] font-bold transition ${
          t.key === active ? 'bg-brand-600 text-white' : 'text-slate-600'
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
