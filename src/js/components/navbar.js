import $ from 'jquery';
import { getSession, logout } from '../auth.js';
import { geo } from '../geo.js';
import { navigate } from '../router.js';
import { initConnectionIndicator } from '../connection.js';

/**
 * @param {object} opts
 * @param {Function} [opts.onBack] - kalau diisi, tampilkan tombol back di kiri title
 *   yang manggil fungsi ini saat diklik (biasanya navigate(...) ke halaman sebelumnya).
 */
export function renderNavbar($container, title, opts = {}) {
  const { onBack } = opts;
  const session = getSession();
  const name = session?.user?.name || 'Pengguna';

  const backButtonHtml = onBack
    ? `
      <button id="btn-back" aria-label="Kembali" title="Kembali"
        class="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white active:scale-95">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
    `
    : '';

  const $nav = $(`
    <header class="sticky top-0 z-20 flex items-center justify-between bg-brand-600 px-3 py-2.5 shadow-card">
      <div class="flex min-w-0 items-center">
        <div id="connection-indicator" class="connection-indicator" title="Status koneksi"></div>
        ${backButtonHtml}
        <div class="min-w-0">
          <p class="truncate font-display text-lg font-semibold leading-none text-white">${title}</p>
          <p class="mt-0.5 truncate text-xs text-white/70">${name}</p>
        </div>
      </div>
      <button id="btn-logout" aria-label="Keluar" title="Keluar"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white active:scale-95">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
      </button>
    </header>
  `);

  if (onBack) $nav.find('#btn-back').on('click', onBack);

  $nav.find('#btn-logout').on('click', () => {
    geo.stopTracking();
    logout();
    navigate('/login');
  });

  $container.append($nav);
  initConnectionIndicator($nav.find('#connection-indicator'));
}
