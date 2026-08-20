import $ from 'jquery';

const CHEVRON_LEFT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const CHEVRON_RIGHT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

/**
 * Kontrol paginasi -- 2 tombol panah (Sebelumnya/Selanjutnya) + "halaman
 * sekarang/total" (mis. "1/20"), dipasang di bawah <table> pada halaman list
 * admin (tab SPK & SJ), pasangan dari components/tableToolbar.js. Server yang
 * hitung total/page/per_page (lihat SuratJalan::list()/SpkReadyKirim::
 * listBelumSj() di ekspedisi-apk-backend), komponen ini murni tampilan +
 * tombol nav. Sebelumnya (2026-08-20) teks lengkap "Sebelumnya"/"Selanjutnya"
 * + "X-Y dari Z" -- dirampingkan jadi cuma panah + pecahan halaman biar lebih
 * ringkas, "X-Y dari Z" dianggap tidak perlu (jumlah total tetap kelihatan
 * dari badge "Data | ..." di toolbar atasnya).
 *
 * @param {object} opts
 * @param {number} opts.page - halaman aktif (1-based)
 * @param {number} opts.perPage
 * @param {number} opts.total - total baris (dari server, BUKAN count yang dirender di halaman ini)
 * @param {Function} opts.onPageChange - dipanggil dgn nomor halaman baru
 */
export function renderPagination($container, { page, perPage, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return; // 1 halaman doang -- tidak perlu kontrol apa-apa

  const $bar = $(`
    <div class="flex items-center justify-center gap-3 border-t border-slate-100 px-4 py-2.5">
      <button id="btn-prev-page" aria-label="Halaman sebelumnya" title="Sebelumnya" ${page <= 1 ? 'disabled' : ''}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">${CHEVRON_LEFT}</button>
      <p class="min-w-[3.5rem] text-center text-sm font-medium text-slate-600">${page}/${totalPages}</p>
      <button id="btn-next-page" aria-label="Halaman berikutnya" title="Selanjutnya" ${page >= totalPages ? 'disabled' : ''}
        class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">${CHEVRON_RIGHT}</button>
    </div>
  `);
  $bar.find('#btn-prev-page').on('click', () => onPageChange(page - 1));
  $bar.find('#btn-next-page').on('click', () => onPageChange(page + 1));
  $container.append($bar);
}
