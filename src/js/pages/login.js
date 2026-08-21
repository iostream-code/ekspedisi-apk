import $ from 'jquery';
import { login } from '../auth.js';
import { navigate } from '../router.js';
import { setButtonLoading } from '../components/loader.js';

// Layout/style login page disamakan dgn inventory-apk (2026-08-21, lihat
// .lsc-* di style.css) -- inventory-apk sendiri sebelumnya disamakan warnanya
// ke palet brand/ink/slate ekspedisi-apk, jadi sekarang KEDUA app secara
// visual jadi satu keluarga: layout dari inventory-apk (kartu kaca + grid +
// orb + card-strip shimmer), warna & font tetap punya ekspedisi-apk sendiri
// (brand hijau, font-display/font-body, ikon svg yg sudah ada). Fungsional
// (form asli, toggle password, error inline) TETAP dipertahankan, bukan
// diganti dgn dialog/alert seperti punya inventory-apk.
export function renderLogin($container) {
  $container.html(`
    <div class="login-screen-content">
      <div class="lsc-grid"></div>
      <div class="lsc-orb lsc-orb-1"></div>
      <div class="lsc-orb lsc-orb-2"></div>
      <div class="lsc-orb lsc-orb-3"></div>

      <div class="lsc-body">
        <div class="lsc-hero">
          <div class="lsc-icon-wrap">
            <img src="logo_koperindo_hitam.png" alt="Koper Indonesia" />
          </div>
          <h1 class="lsc-title font-display">Ekspedisi</h1>
          <p class="lsc-subtitle">"Sebuah tim bukan sekelompok orang yang bekerja bersama. Tim adalah sekelompok orang yang saling percaya."</p>
        </div>

        <form id="login-form">
          <div class="lsc-card">
            <div class="lsc-card-strip"></div>
            <div class="lsc-card-inner">

              <div class="lsc-field">
                <div class="lsc-field-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span class="font-display">Username</span>
                </div>
                <input id="username" type="text" autocomplete="username" required placeholder="Masukkan username" />
              </div>

              <div class="lsc-divider"></div>

              <div class="lsc-field">
                <div class="lsc-field-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  <span class="font-display">Kata Sandi</span>
                </div>
                <div class="lsc-input-wrap">
                  <input id="password" type="password" autocomplete="current-password" required placeholder="Masukkan kata sandi" />
                  <button type="button" id="toggle-password" tabindex="-1" aria-label="Tampilkan kata sandi" class="lsc-eye-btn">
                    <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

            </div>
          </div>

          <p id="login-error" class="hidden mt-4 rounded-lg bg-status-alert/10 px-3 py-2 text-center text-sm font-medium text-status-alert"></p>

          <div class="lsc-btn-wrap">
            <button type="submit" id="btn-submit" class="lsc-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Masuk
            </button>
          </div>
        </form>

        <div class="lsc-footer">
          <p>ITAI Koperindo &copy; 2026</p>
        </div>
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
