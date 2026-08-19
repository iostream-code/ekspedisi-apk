import $ from 'jquery';
import { login } from '../auth.js';
import { navigate } from '../router.js';
import { setButtonLoading } from '../components/loader.js';

export function renderLogin($container) {
  $container.html(`
    <div class="relative flex min-h-screen flex-col justify-center overflow-hidden bg-ink px-6 py-10">
      <!-- Tekstur latar: garis rute putus-putus diagonal (motif konsisten dgn step wizard checkpoint) -->
      <div class="pointer-events-none absolute inset-0 opacity-[0.07]" style="background-image: repeating-linear-gradient(-45deg, #fff 0 2px, transparent 2px 18px); background-size: 26px 26px;"></div>
      <!-- Glow lembut warna brand di belakang logo -->
      <div class="pointer-events-none absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-400 opacity-20 blur-3xl"></div>

      <div class="relative mx-auto w-full max-w-sm">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-route shadow-lg shadow-route/30">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-6h9l2 6"/><path d="M5 12h14v5H5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>
          </div>
          <h1 class="font-display text-2xl font-semibold text-white">Ekspedisi</h1>
          <p class="mt-1 text-sm text-slate-400">Pantau status supir & kelola pengiriman secara real-time</p>
        </div>

        <form id="login-form" class="card space-y-4 p-6">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-600">Username</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input id="username" type="text" autocomplete="username" required placeholder="Masukkan username"
                class="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-600">Kata sandi</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </span>
              <input id="password" type="password" autocomplete="current-password" required placeholder="Masukkan kata sandi"
                class="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-11 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              <button type="button" id="toggle-password" tabindex="-1" aria-label="Tampilkan kata sandi"
                class="absolute inset-y-0 right-2 flex items-center px-1 text-slate-400 hover:text-slate-600">
                <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <p id="login-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
          <button type="submit" id="btn-submit" class="btn-brand w-full">Masuk</button>
        </form>

        <p class="mt-6 text-center text-xs text-slate-500">Hubungi admin kalau lupa username/kata sandi.</p>
      </div>
    </div>
  `);

  $container.find('#toggle-password').on('click', function () {
    const $input = $('#password');
    const isHidden = $input.attr('type') === 'password';
    $input.attr('type', isHidden ? 'text' : 'password');
    $(this).attr('aria-label', isHidden ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  $container.find('#login-form').on('submit', function (e) {
    e.preventDefault();
    const username = $('#username').val().trim();
    const password = $('#password').val();
    const $btn = $('#btn-submit');
    const $err = $('#login-error');

    $err.addClass('hidden');
    setButtonLoading($btn, true, 'Memproses...');

    login(username, password)
      .then((session) => {
        navigate(session.role === 'admin' ? '/admin' : '/driver');
      })
      .catch((xhr) => {
        const msg = xhr?.responseJSON?.message || 'Username atau kata sandi salah.';
        $err.text(msg).removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
