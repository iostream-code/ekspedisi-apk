import $ from 'jquery';

/**
 * Kontrol paginasi (Sebelumnya/Selanjutnya + "X-Y dari Z") -- dipasang di
 * bawah <table> pada halaman list admin (tab SPK & SJ), pasangan dari
 * components/tableToolbar.js. Server yang hitung total/page/per_page (lihat
 * SuratJalan::list()/SpkReadyKirim::listBelumSj() di ekspedisi-apk-backend),
 * komponen ini murni tampilan + tombol nav.
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

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  const $bar = $(`
    <div class="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
      <p class="text-slate-400">${from}-${to} dari ${total}</p>
      <div class="flex items-center gap-2">
        <button id="btn-prev-page" ${page <= 1 ? 'disabled' : ''}
          class="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">Sebelumnya</button>
        <p class="text-slate-500">Hal ${page}/${totalPages}</p>
        <button id="btn-next-page" ${page >= totalPages ? 'disabled' : ''}
          class="rounded-lg border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">Selanjutnya</button>
      </div>
    </div>
  `);
  $bar.find('#btn-prev-page').on('click', () => onPageChange(page - 1));
  $bar.find('#btn-next-page').on('click', () => onPageChange(page + 1));
  $container.append($bar);
}
