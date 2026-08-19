import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';

export async function renderAdminNewDriver($container) {
  renderNavbar($container, 'Tambah Supir', { onBack: () => navigate('/admin/ekspedisi') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  // Daftar ekspedisi dipakai dropdown opsional di form eksternal -- gagal
  // load bukan blocker (ekspedisi memang opsional), diam-diam kosong saja.
  let ekspedisiList = [];
  try {
    ekspedisiList = await api.get('/admin/ekspedisi');
  } catch (e) {
    ekspedisiList = [];
  }
  const ekspedisiOptions = ekspedisiList
    .map((e) => `<option value="${e.id_expedisi}">${e.nama_expedisi}</option>`)
    .join('');

  $main.html(`
    <div class="mb-4 flex rounded-xl bg-slate-100 p-1">
      <button type="button" id="tab-internal" class="tab-tipe flex-1 rounded-lg py-2 text-sm font-semibold">Internal (Pegawai)</button>
      <button type="button" id="tab-eksternal" class="tab-tipe flex-1 rounded-lg py-2 text-sm font-semibold">Eksternal</button>
    </div>

    <form id="new-driver-form" class="card space-y-4 p-4">
      <div id="fields-internal">
        <label class="mb-1 block text-sm font-medium text-slate-600">Username pegawai</label>
        <input id="username" type="text" autocomplete="off" placeholder="Contoh: budi.santoso"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <p class="mt-1.5 text-xs text-slate-400">Harus akun pegawai yang sudah ada (sama seperti dipakai login app lain) --
          bukan bikin akun baru. Kalau pegawai ini belum pernah dipakai sebagai supir, profilnya otomatis dibuat.</p>
      </div>

      <div id="fields-eksternal" class="hidden space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Nama supir</label>
          <input id="nama" type="text" autocomplete="off" placeholder="Contoh: Slamet (Ekspedisi Jaya)"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Nomor telepon</label>
          <input id="telepon" type="tel" autocomplete="off" placeholder="08xxxxxxxxxx"
            class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-600">Perusahaan ekspedisi (opsional)</label>
          <select id="id_expedisi" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
            <option value="">-- Supir lepas / tidak terikat perusahaan --</option>
            ${ekspedisiOptions}
          </select>
        </div>
        <p class="text-xs text-slate-400">Supir eksternal TIDAK bisa login ke app ini -- murni catatan
          supaya bisa diplot ke SPK yang siap kirim, sama seperti supir internal.</p>
      </div>

      <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="btn-submit" class="btn-route w-full">Tambah Supir</button>
    </form>
  `);

  let tipe = 'internal';

  function setTipe(next) {
    tipe = next;
    $('#tab-internal').toggleClass('bg-white shadow text-ink', tipe === 'internal').toggleClass('text-slate-500', tipe !== 'internal');
    $('#tab-eksternal').toggleClass('bg-white shadow text-ink', tipe === 'eksternal').toggleClass('text-slate-500', tipe !== 'eksternal');
    $('#fields-internal').toggleClass('hidden', tipe !== 'internal');
    $('#fields-eksternal').toggleClass('hidden', tipe !== 'eksternal');
  }
  setTipe('internal');

  $main.find('#tab-internal').on('click', () => setTipe('internal'));
  $main.find('#tab-eksternal').on('click', () => setTipe('eksternal'));

  $main.find('#new-driver-form').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btn-submit');
    const $err = $('#form-error');
    $err.addClass('hidden');

    const body = tipe === 'internal'
      ? { tipe: 'internal', username: $('#username').val().trim() }
      : {
          tipe: 'eksternal',
          nama: $('#nama').val().trim(),
          telepon: $('#telepon').val().trim(),
          id_expedisi: $('#id_expedisi').val() || undefined,
        };

    setButtonLoading($btn, true, 'Menambahkan...');
    api.post('/admin/drivers', body)
      .then(() => {
        navigate('/admin/ekspedisi');
      })
      .catch((xhr) => {
        const msg = xhr?.responseJSON?.message || 'Gagal menambahkan supir. Coba lagi.';
        $err.text(msg).removeClass('hidden');
        setButtonLoading($btn, false);
      });
  });
}
