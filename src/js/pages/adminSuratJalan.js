import $ from 'jquery';
import { renderNavbar } from '../components/navbar.js';
import { renderAdminTabs } from '../components/adminTabs.js';
import { renderSjSubTabs } from '../components/sjSubTabs.js';
import { renderTableToolbar } from '../components/tableToolbar.js';
import { renderPagination } from '../components/pagination.js';
import { renderModal } from '../components/modal.js';
import { pageLoaderHtml, emptyStateHtml, setButtonLoading } from '../components/loader.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { APP_CONFIG } from '../config.js';
import { takePhoto } from '../camera.js';
import { formatSpkNo, toTitleCase } from '../format.js';

const STATUS_LABEL = { draft: 'Draft', terkirim: 'Terkirim', tervalidasi: 'Tervalidasi' };
// Kuning = draft (belum jalan), hijau = terkirim (sedang jalan), biru = tervalidasi
// (selesai, sudah final) -- 3 warna beda supaya gampang dipindai sekilas di tabel.
const STATUS_CLASS = {
  draft: 'bg-yellow-50 text-yellow-700',
  terkirim: 'bg-status-online/10 text-status-online',
  tervalidasi: 'bg-blue-50 text-blue-700',
};

// Baris hasil migrate_legacy_surat_jalan.php (backend-migrasi) simpan
// foto sbg URL ABSOLUT ke host lama (https://indokoper.com/foto_surat_jalan/...)
// -- beda dari baris native yang path-nya RELATIF ke API_BASE_URL app ini
// sendiri. Jangan digabung dgn API_BASE_URL kalau sudah absolut.
function fotoUrl(path) {
  return /^https?:\/\//.test(path) ? path : `${APP_CONFIG.API_BASE_URL}/${path}`;
}

function formatTanggal(value) {
  return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
}

// 1 SJ bisa mengangkut lini produk dari lebih dari 1 SPK -- daftar SPK
// diturunkan dari items (bukan cuma kolom header penjualan_id, yang cuma
// relevan utk SJ trip-linked lama yang selalu 1 SPK).
function buildSpkLabel(sj) {
  const spkIds = [...new Set((sj.items || []).map((it) => it.penjualan_id).filter(Boolean))];
  const ids = spkIds.length ? spkIds : (sj.penjualan_id ? [sj.penjualan_id] : []);
  return ids.map(formatSpkNo).join(', ');
}

function buildKirimLinesHtml(sj) {
  if ((sj.items || []).length) {
    return sj.items.map((it) => `<p>${it.penjualan_jenis || '(tanpa nama)'}: ${it.jumlah_kirim}</p>`).join('');
  }
  return sj.jumlah_kirim ? `<p>${sj.jumlah_kirim} unit</p>` : '<p class="text-slate-400">-</p>';
}

function clientLabel(sj) {
  return (sj.client_names || []).length ? sj.client_names.map(toTitleCase).join(' | ') : '-';
}

// trip_photos (ekspedisi_t_trip_photo, dari checkpoint foto supir: berangkat/
// serah_terima/sj) cuma keisi kalau SJ ini trip-linked -- lihat backend
// App\Support\SuratJalan::batchTripPhotosByTripId(). SJ manual (trip_id NULL)
// selalu dapat map kosong di sini, bukan error.
function tripPhotoMap(sj) {
  const map = {};
  (sj.trip_photos || []).forEach((p) => { map[p.type] = p.path; });
  return map;
}

/**
 * Daftar foto yang ditampilkan di modal Detail -- gabungan foto checkpoint
 * SUPIR (berangkat/serah terima, murni dari trip_photos) dan foto milik SJ
 * sendiri (foto_surat_jalan/foto_serah_terima/foto_validasi). "Foto SJ" SENGAJA
 * prioritaskan trip_photos.sj (checkpoint asli supir) drpd foto_surat_jalan
 * kalau dua-duanya ada -- utk SJ trip-linked isinya identik
 * (upsertFromTripPhoto() nulis ke keduanya sekaligus), tapi kalau admin PERNAH
 * menimpa foto_surat_jalan lewat "Lampirkan Foto" manual SESUDAH checkpoint
 * supir, trip_photos.sj tetap versi ASLI dari lapangan -- itu yang lebih
 * relevan disebut "Foto SJ" (checkpoint), foto_surat_jalan cuma dipakai
 * fallback utk SJ manual yang tidak py trip sama sekali.
 *
 * "Foto Serah Terima" sama polanya (2026-08-29) -- prioritaskan
 * trip_photos.serah_terima (checkpoint asli supir INTERNAL lewat app), fallback
 * ke sj.foto_serah_terima (diupload MANUAL admin lewat tombol "Serah Terima"
 * di tabel, khusus SJ supir EKSTERNAL yang tidak pernah punya trip_photos sama
 * sekali -- lihat tombolnya di render() & App\Ekspedisi\Support\
 * SuratJalan::attachSerahTerima() backend).
 */
function fotoEntries(sj) {
  const trip = tripPhotoMap(sj);
  return [
    { label: 'Foto Berangkat', path: trip.berangkat, border: 'border border-slate-200' },
    { label: 'Foto Serah Terima', path: trip.serah_terima || sj.foto_serah_terima, border: 'border border-slate-200' },
    { label: 'Foto SJ', path: trip.sj || sj.foto_surat_jalan, border: 'border border-slate-200' },
    { label: 'Foto Validasi', path: sj.foto_validasi, border: 'border-2 border-blue-400' },
  ].filter((f) => f.path);
}

/**
 * Isi modal "Detail Surat Jalan" -- info yang DULUNYA tersebar di beberapa
 * kolom tabel (Supir, Kirim, Dibuat, Foto, badge "Data Lama"/info validasi)
 * dipindah ke sini semua (2026-08-20) supaya tabel tetap ringkas: cuma No SJ,
 * Tujuan, Klien, Dikirim, Status. Dibangun ulang tiap kali tombol "Detail"
 * diklik (bukan live-bound) -- `sj` di closure pemanggil sudah di-mutate
 * (Object.assign) begitu aksi Validasi sukses, jadi kalau Detail dibuka
 * SESUDAH validasi, datanya otomatis terbaru.
 */
function detailBodyHtml(sj) {
  const spkLabel = buildSpkLabel(sj);
  const tglDibuat = formatTanggal(sj.created_at);
  const tglKirim = formatTanggal(sj.tgl_kirim);
  const fotos = fotoEntries(sj);

  return `
    <dl class="space-y-4 text-sm">
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Ringkasan</dt>
        <dd class="mt-1 text-slate-700">
          <p class="font-medium text-ink">${sj.no_surat_jalan || '(belum di-generate)'}
            ${sj.asal === 'migrasi_legacy' ? '<span class="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500" title="-">Data Lama</span>' : ''}
          </p>
          <p class="mt-0.5 text-xs text-slate-400">${sj.trip_id ? 'Dari trip #' + sj.trip_id : 'Dibuat manual'}${spkLabel ? ' &middot; SPK ' + spkLabel : ''}</p>
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Tujuan</dt>
        <dd class="mt-1 text-slate-700">${sj.tujuan || '-'}</dd>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Supir &amp; Kendaraan</dt>
          <dd class="mt-1 text-slate-700">
            <p>${sj.nama_supir || 'Belum ada supir'}</p>
            <p class="text-xs text-slate-400">${sj.kendaraan || '-'}${sj.plat ? ' (' + sj.plat + ')' : ''}</p>
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Penerima</dt>
          <dd class="mt-1 text-slate-700">${sj.penerima || '-'}</dd>
        </div>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Rincian Kirim</dt>
        <dd class="mt-1 text-slate-700">${buildKirimLinesHtml(sj)}</dd>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dikirim</dt>
          <dd class="mt-1 text-slate-700">${tglKirim || '-'}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Dibuat</dt>
          <dd class="mt-1 text-slate-700">${tglDibuat || '-'}</dd>
        </div>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
        <dd class="mt-1">
          <span class="rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[sj.status] || 'bg-slate-100 text-slate-600'}">${STATUS_LABEL[sj.status] || sj.status}</span>
          ${sj.status === 'tervalidasi' ? `<p class="mt-1 text-xs text-brand-700">${sj.nama_validator || ''}${sj.divalidasi_at ? ' &middot; ' + formatTanggal(sj.divalidasi_at) : ''}</p>` : ''}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold uppercase tracking-wide text-slate-400">Foto</dt>
        <dd class="mt-1 flex flex-wrap gap-3">
          ${fotos.map((f) => `
            <div class="flex flex-col items-center gap-1">
              <img src="${fotoUrl(f.path)}" data-lightbox class="h-16 w-16 cursor-zoom-in rounded-lg ${f.border} object-cover" title="${f.label}" alt="${f.label}" />
              <span class="text-[10px] text-slate-400">${f.label}</span>
            </div>
          `).join('')}
          ${fotos.length ? '' : '<p class="text-xs text-slate-400">Belum ada foto.</p>'}
        </dd>
      </div>
    </dl>
  `;
}

/**
 * Tab "SJ" -- halaman awal admin setelah login (2026-08-23, dulu tab "SPK",
 * dihapus -- lihat adminTabs.js). Model tabel (bukan kartu), meniru pola
 * toolbar "Data | jumlah + tombol Refresh/Riwayat" di surat-jalan-apk (lihat
 * components/tableToolbar.js). Dua sumber baris tercampur: otomatis dari
 * checkpoint foto "sj" supir (trip_id terisi), dan manual dibuat admin lewat
 * "+ Buat SJ" (trip_id boleh kosong). SAMA SEKALI TIDAK berhubungan dengan
 * tabel surat_jalan lama milik backend-production (dulu cuma dipakai fitur
 * "Cek" no_surat_jalan di form "Perjalanan Baru" -- form itu sendiri sudah
 * dihapus 2026-08-25 bareng adminNewTrip.js, lihat catatan di
 * adminDriverDetail.js).
 *
 * **Dua mode, didefinisikan ulang 2026-08-23 (dulu "aktif" = semua status
 * tercampur, "riwayat" = tervalidasi):**
 * - Aktif (default): `belum_tervalidasi=1` -- SJ yang BELUM tervalidasi.
 * - Riwayat: `status=tervalidasi` (tidak berubah dari sebelumnya).
 * Karena "aktif" sekarang selalu 1 status yang berlawanan dari "riwayat",
 * kolom Status DICOPOT dari tabel (tidak menambah informasi lagi -- lihat
 * detailBodyHtml() kalau masih perlu dicek per baris). Server-side
 * pagination+search (2026-08-20, tabel ini bisa py ribuan baris stlh
 * migrate_legacy_surat_jalan.php) -- historyMode JUGA jadi filter server,
 * BUKAN filter client-side lagi, krn cuma 1 halaman data yang ada di browser
 * kapan pun (filter client-side thd 1 halaman = hasil salah/tidak lengkap).
 *
 * **Nomor SJ terlewat ditandai merah** (2026-08-23) -- nomor SJ (`no_surat_jalan`/
 * `nomor_urut`) sekarang diinput manual admin (cocok nomor kertas fisik, lihat
 * adminNewSuratJalan.js), jadi bisa ada nomor yang KELEWAT tidak pernah
 * diinput. Backend (`App\Ekspedisi\Support\SuratJalan::listWithGaps()`)
 * menyisipkan baris VIRTUAL (`sj.missing === true`, tidak ada di DB) untuk
 * tiap nomor yang hilang dalam rentang tahun yang difilter -- baris ini
 * dirender merah, TANPA aksi apa pun (tidak ada dblclick/Validasi, tidak ada
 * data lain buat ditampilkan).
 *
 * Kolom tabel (2026-08-20, dirampingkan; kolom Tujuan ikut dicopot susulan
 * hari yang sama; kolom Keterangan ditambah lagi 2026-08-21; kolom Status
 * DICOPOT 2026-08-23, lihat di atas) -- No SJ, Klien, Dikirim, Keterangan,
 * Aksi. Info sekunder lain (Tujuan, Supir/kendaraan, Penerima, breakdown
 * Kirim, tanggal Dibuat, Status, badge "Data Lama"/info validasi, Foto) tetap
 * di modal "Detail Surat Jalan" (lihat detailBodyHtml() & components/modal.js)
 * -- **dipicu DOBEL KLIK pada baris** (2026-08-23, dulu tombol "Detail" di
 * kolom Aksi -- dihapus, kolom Aksi sekarang cuma tombol Validasi kalau ada).
 * **Kolom Aksi DICOPOT SELURUHNYA di mode Riwayat** (2026-08-23, susulan --
 * satu-satunya isinya, tombol Validasi, tidak pernah muncul di sana karena
 * semua barisnya sudah tervalidasi, jadi kolomnya sendiri ikut dihapus,
 * bukan cuma dikosongkan -- lihat `showAksi` di render()).
 *
 * **Tombol "Serah Terima" (2026-08-29)** -- kolom Aksi TIDAK LAGI cuma
 * Validasi, ditambah tombol kedua khusus baris `driver_tipe === 'eksternal'`
 * (supir eksternal tidak pernah punya trip/checkpoint app sama sekali, lihat
 * fotoEntries()). Beda dari Validasi: OPSIONAL & tidak menghilang setelah
 * upload sukses (admin boleh ganti fotonya berkali-kali sampai SJ-nya
 * tervalidasi, tidak mengunci status apa pun) -- lihat App\Ekspedisi\Support\
 * SuratJalan::attachSerahTerima() backend.
 */
export async function renderAdminSuratJalan($container) {
  renderNavbar($container, 'Ekspedisi');
  renderAdminTabs($container, 'sj');
  renderSjSubTabs($container, 'customer');

  const $main = $(`<main class="flex-1 space-y-3 p-4"></main>`);
  $container.append($main);

  const $tableSection = $(`<div></div>`);
  $main.append($tableSection);

  let historyMode = false;
  let query = '';
  const currentYear = new Date().getFullYear();
  let tahun = String(currentYear);
  let page = 1;
  const perPage = 20;

  // Dimuat sekali di awal (bukan tiap load(), tahunnya sendiri jarang berubah) --
  // dipakai isi dropdown filter tahun di toolbar (sejajar kotak cari, 2026-08-20).
  // Default = tahun berjalan, TIDAK ADA pilihan "semua tahun" (sengaja, permintaan
  // user) -- tahun berjalan WAJIB selalu ada di daftar opsi walau belum ada SJ
  // sama sekali tahun ini (backend cuma balikin tahun yang BENERAN ada baris-nya,
  // lihat SuratJalan::availableYears()), makanya ditambahkan manual di sini kalau
  // belum ada, supaya defaultnya tidak pernah "hilang" dari dropdown.
  // Gagal diam-diam (dropdown cuma jadi tahun berjalan doang) -- BUKAN alasan
  // gagalin seluruh halaman, data SJ tetap harus kelihatan walau ini gagal.
  let years = [];
  try {
    years = await api.get('/admin/sj/years');
  } catch (e) {
    years = [];
  }
  if (!years.map(String).includes(String(currentYear))) {
    years = [currentYear, ...years].sort((a, b) => b - a);
  }

  async function load() {
    $tableSection.html(`<div class="card overflow-hidden">${pageLoaderHtml('Memuat data...')}</div>`);

    let result;
    try {
      result = await api.get(`/admin/sj?${new URLSearchParams({
        ...(historyMode ? { status: 'tervalidasi' } : { belum_tervalidasi: '1' }),
        ...(query ? { q: query } : {}),
        ...(tahun ? { tahun } : {}),
        page: String(page),
        per_page: String(perPage),
      })}`);
    } catch (e) {
      $tableSection.html('<p class="p-4 text-status-alert">Gagal memuat data.</p>');
      return;
    }
    render(result);
  }

  function render({ data: list, total }) {
    const $card = $(`<div class="card overflow-hidden"></div>`);
    $tableSection.empty().append($card);

    renderTableToolbar($card, {
      count: total,
      historyActive: historyMode,
      onRefresh: load,
      onToggleHistory: () => {
        historyMode = !historyMode;
        page = 1;
        load();
      },
      addLabel: '+ Buat SJ',
      onAdd: () => navigate('/admin/sj/new'),
      searchValue: query,
      onSearch: (val) => {
        query = val;
        page = 1;
        load();
      },
      yearOptions: years,
      yearValue: tahun,
      onYearChange: (val) => {
        tahun = val;
        page = 1;
        load();
      },
    });

    if (!list.length) {
      $card.append(`<div class="p-2">${emptyStateHtml()}</div>`);
      return;
    }

    // max-h + overflow-y-auto di sini (bukan di <table>/<tbody> langsung --
    // scroll vertikal HTML tabel cuma bisa dikontrol lewat wrapper-nya) +
    // thead `sticky top-0` di bawah supaya header ikut "nempel" pas scroll --
    // secara visual cuma badan tabel yang bergerak, bukan seluruh halaman
    // (toolbar & paginasi tetap kelihatan tanpa perlu scroll dokumen).
    // Kolom "Aksi" cuma relevan di mode aktif (satu-satunya isinya, tombol
    // Validasi, tidak pernah muncul di Riwayat krn semua barisnya sudah
    // tervalidasi) -- 2026-08-23, dicopot SELURUHNYA (bukan cuma dikosongkan)
    // di mode Riwayat biar tabel tidak nyisain kolom kosong percuma.
    const showAksi = !historyMode;
    const $tableWrap = $(`<div class="scroll-area max-h-[65vh] overflow-auto"></div>`);
    const $table = $(`
      <table class="w-full text-sm tbl-bordered">
        <thead class="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <tr>
            <th class="whitespace-nowrap px-3 py-2 text-center">No SJ</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Klien</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Dikirim</th>
            <th class="whitespace-nowrap px-3 py-2 text-center">Keterangan</th>
            ${showAksi ? '<th class="whitespace-nowrap px-3 py-2 text-center">Aksi</th>' : ''}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100"></tbody>
      </table>
    `);
    const $tbody = $table.find('tbody');

    list.forEach((sj) => {
      // Baris VIRTUAL "nomor terlewat" (2026-08-23, lihat App\Ekspedisi\Support\
      // SuratJalan::listWithGaps() di backend) -- tidak ada di DB sama sekali,
      // TIDAK PUNYA aksi apa pun (dblclick/Validasi), cuma penanda visual merah.
      // colspan pesannya ikut menyesuaikan ada/tidaknya kolom Aksi (3 kalau
      // ada, 4 kalau tidak -- lihat showAksi di atas).
      if (sj.missing) {
        $tbody.append(`
          <tr class="bg-status-alert/10">
            <td class="whitespace-nowrap px-3 py-2.5 font-medium text-status-alert">${sj.no_surat_jalan}</td>
            <td class="whitespace-nowrap px-3 py-2.5 text-status-alert" colspan="${showAksi ? 3 : 4}">Nomor ini belum pernah diinput -- kemungkinan kertas SJ terlewat/hilang.</td>
            ${showAksi ? '<td class="whitespace-nowrap px-3 py-2.5"></td>' : ''}
          </tr>
        `);
        return;
      }

      const tglKirim = formatTanggal(sj.tgl_kirim);

      const $tr = $(`
        <tr class="cursor-pointer hover:bg-slate-50" title="Dobel klik untuk lihat detail">
          <td class="whitespace-nowrap px-3 py-2.5 align-top font-medium text-ink">${sj.no_surat_jalan || '(belum ada nomor)'}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-600">${clientLabel(sj)}</td>
          <td class="whitespace-nowrap px-3 py-2.5 align-top text-slate-500">${tglKirim || '-'}</td>
          <td class="max-w-[180px] truncate px-3 py-2.5 align-top text-slate-500">${sj.catatan || '-'}</td>
          ${showAksi ? '<td class="whitespace-nowrap px-3 py-2.5 align-top"><div class="flex gap-1.5" data-aksi></div></td>' : ''}
        </tr>
      `);

      $tr.on('dblclick', () => renderModal({ title: 'Detail Surat Jalan', bodyHtml: detailBodyHtml(sj) }));

      if (showAksi && sj.status !== 'tervalidasi' && sj.driver_tipe === 'eksternal') {
        // Supir eksternal tidak checkpoint apa pun lewat app -- admin bisa
        // sekalian lampirkan bukti serah terima di sini, OPSIONAL & tidak
        // mempengaruhi status (beda dari Validasi) -- tombolnya tetap tampil
        // sesudah upload supaya bisa diganti lagi kalau salah foto.
        const $btnSt = $(`<button class="btn-table-action !bg-slate-100 !text-slate-600">Serah Terima</button>`);
        $btnSt.on('click', async (e) => {
          e.stopPropagation();
          let blob;
          try {
            blob = await takePhoto();
          } catch (e) {
            return; // batal ambil foto
          }
          setButtonLoading($btnSt, true, '');
          api.uploadFile(`/admin/sj/${sj.id}/serah-terima`, blob, 'photo')
            .then((updated) => {
              Object.assign(sj, updated);
              setButtonLoading($btnSt, false);
            })
            .catch((xhr) => {
              alert(xhr?.responseJSON?.message || 'Gagal mengunggah foto serah terima. Coba lagi.');
              setButtonLoading($btnSt, false);
            });
        });
        $tr.find('[data-aksi]').append($btnSt);
      }

      if (showAksi && sj.status !== 'tervalidasi') {
        // SJ fisik yang sudah ditandatangani penerima & dibawa balik supir --
        // admin foto dokumen final itu di sini, sekalian menutup alur validasi.
        // stopPropagation supaya klik tombol ini tidak ikut kehitung dobel klik
        // baris (yang buka modal Detail).
        const $btn = $(`<button class="btn-table-action">Validasi</button>`);
        $btn.on('click', async (e) => {
          e.stopPropagation();
          let blob;
          try {
            blob = await takePhoto();
          } catch (e) {
            return; // batal ambil foto
          }
          setButtonLoading($btn, true, '');
          api.uploadFile(`/admin/sj/${sj.id}/validasi`, blob, 'photo')
            .then((updated) => {
              // Sinkronkan `sj` di closure ini dgn response terbaru (status,
              // foto_validasi, nama_validator, divalidasi_at) -- dipakai
              // kalau admin buka "Detail" (dobel klik) SESUDAH validasi ini.
              Object.assign(sj, updated);
              $btn.remove();
            })
            .catch((xhr) => {
              alert(xhr?.responseJSON?.message || 'Gagal memvalidasi surat jalan. Coba lagi.');
              setButtonLoading($btn, false);
            });
        });
        $tr.find('[data-aksi]').append($btn);
      }

      $tbody.append($tr);
    });

    $tableWrap.append($table);
    $card.append($tableWrap);

    renderPagination($card, {
      page,
      perPage,
      total,
      onPageChange: (p) => {
        page = p;
        load();
      },
    });
  }

  await load();
}
