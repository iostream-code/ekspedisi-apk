import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { takePhoto } from '../camera.js';

/**
 * Widget "Ambil Foto Dokumen" -- tombol yang manggil takePhoto() (kamera
 * native/fallback <input capture>, sama seperti checkpoint foto supir & foto
 * SJ), begitu berhasil simpan Blob-nya di closure (`blobs[key]`) + tampilkan
 * thumbnail preview (data-lightbox, biar bisa di-zoom sebelum submit -- lihat
 * components/lightbox.js). $wrap dibuat sekali di renderPhotoField(), value
 * Blob-nya dibaca form submit lewat `blobs` object yang dikembalikan.
 */
function renderPhotoField($container, key, label) {
  const $field = $(`
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-600">${label}</label>
      <div class="flex items-center gap-3">
        <button type="button" class="btn-ambil-foto btn-ghost !py-2.5 px-4 text-sm">Ambil Foto</button>
        <img data-lightbox class="hidden h-14 w-14 cursor-zoom-in rounded-lg border border-slate-200 object-cover" />
      </div>
    </div>
  `);
  $container.append($field);

  const $btn = $field.find('.btn-ambil-foto');
  const $thumb = $field.find('img');
  let blob = null;

  $btn.on('click', async () => {
    try {
      blob = await takePhoto();
    } catch (e) {
      return; // batal ambil foto
    }
    $thumb.attr('src', URL.createObjectURL(blob)).removeClass('hidden');
    $btn.text('Ganti Foto');
  });

  return { getBlob: () => blob };
}

/**
 * EKSTERNAL-only (2026-08-29) -- halaman ini dulu punya tab Internal/Eksternal,
 * dicopot karena satu-satunya pintu masuk ke sini (tombol "+ Supir" di
 * Monitoring, lihat adminDashboard.js) sekarang sengaja dibatasi eksternal
 * saja: profil supir INTERNAL auto-provision sendiri saat login pertama
 * (SupirProfile::ensure(), backend-migrasi) dan foto SIM-nya bisa dilengkapi
 * belakangan lewat halaman detail supir (adminDriverDetail.js) -- tidak ada
 * alur yang butuh "tambah supir internal" manual dari sini. Backend
 * (`POST /admin/drivers`) sendiri masih menerima `tipe: 'internal'`, cuma
 * form ini yang tidak lagi menawarkannya.
 */
export async function renderAdminNewDriver($container) {
  renderNavbar($container, 'Tambah Supir Eksternal', { onBack: () => navigate('/admin/ekspedisi') });

  const $main = $(`<main class="flex-1 p-4"></main>`);
  $container.append($main);

  // Daftar ekspedisi dipakai dropdown opsional -- gagal load bukan blocker
  // (ekspedisi memang opsional), diam-diam kosong saja.
  let ekspedisiList = [];
  try {
    ekspedisiList = await api.get('/admin/ekspedisi');
  } catch (e) {
    ekspedisiList = [];
  }
  const ekspedisiOptions = ekspedisiList
    .map((e) => `<option value="${e.id}">${e.nama_ekspedisi}</option>`)
    .join('');

  $main.html(`
    <form id="new-driver-form" class="card space-y-4 p-4">
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
      <div id="photo-eksternal" class="space-y-4"></div>
      <p class="text-xs text-slate-400">Supir eksternal TIDAK bisa login ke app ini -- murni catatan
        dispatch, ditugaskan lewat field "Supir" saat admin bikin Surat Jalan.</p>

      <p id="form-error" class="hidden rounded-lg bg-status-alert/10 px-3 py-2 text-sm font-medium text-status-alert"></p>
      <button type="submit" id="btn-submit" class="btn-route w-full">Tambah Supir</button>
    </form>
  `);

  // KTP & STNK & SIM WAJIB semua utk eksternal (bukan pegawai, tidak ada
  // identitas/aset kendaraan perusahaan yang sudah terverifikasi).
  const ktpEksternal = renderPhotoField($('#photo-eksternal'), 'foto_ktp', 'Foto KTP (wajib)');
  const simEksternal = renderPhotoField($('#photo-eksternal'), 'foto_sim', 'Foto SIM (wajib)');
  const stnkEksternal = renderPhotoField($('#photo-eksternal'), 'foto_stnk', 'Foto STNK (wajib)');

  $main.find('#new-driver-form').on('submit', function (e) {
    e.preventDefault();
    const $btn = $('#btn-submit');
    const $err = $('#form-error');
    $err.addClass('hidden');

    const fields = {
      tipe: 'eksternal',
      nama: $('#nama').val().trim(),
      telepon: $('#telepon').val().trim(),
      id_expedisi: $('#id_expedisi').val() || undefined,
      foto_ktp: ktpEksternal.getBlob(),
      foto_sim: simEksternal.getBlob(),
      foto_stnk: stnkEksternal.getBlob(),
    };

    const missingLabel = !fields.foto_ktp ? 'Foto KTP wajib diambil.'
      : !fields.foto_sim ? 'Foto SIM wajib diambil.'
      : !fields.foto_stnk ? 'Foto STNK wajib diambil.'
      : null;
    if (missingLabel) {
      $err.text(missingLabel).removeClass('hidden');
      return;
    }

    setButtonLoading($btn, true, 'Menambahkan...');
    api.postMultipart('/admin/drivers', fields)
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
