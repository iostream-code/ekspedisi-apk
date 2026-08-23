# Ekspedisi (ekspedisi-apk)

_(dulu bernama "Tracking Supir" / `driver-apk` — sedang berkembang jadi aplikasi ekspedisi yang
lebih luas: supir internal & eksternal, plotting SPK, rencana modul surat jalan menyusul. Lihat
README [`backend-migrasi`](../backend-migrasi) bagian "Riwayat nama" untuk detail.)_

Aplikasi mobile (Cordova) untuk tracking supir pengiriman: satu app dengan dua role —
**supir** (toggle status online/istirahat/offline, kirim lokasi berkala, isi 3 checkpoint
foto per perjalanan) dan **admin/dispatcher** (peta live semua supir + riwayat perjalanan
per supir).

**[DISEDERHANAKAN 2026-08-23]** Sisi admin sekarang cuma **2 tab**: **SJ** (halaman awal
setelah login) & **Ekspedisi** (monitoring) — tab "SPK" dihapus. Nomor SJ (`no_surat_jalan`)
**diinput manual admin**, bukan lagi auto-generate, supaya cocok nomor kertas SJ fisik yang
sudah dicetak; nomor yang terlewat ditandai baris merah di tabel. Detail lengkap ada di
bagian "**Penyederhanaan 2026-08-23: 2 tab, nomor SJ manual**" di bawah — bagian-bagian lain
di README ini yang masih menyebut tab "SPK"/`adminSpkBelumSj.js` adalah **riwayat/histori**
desain sebelum perubahan ini, dipertahankan apa adanya sebagai catatan, BUKAN dokumentasi
perilaku yang masih berlaku.

**Status: prototype/demo.** `platforms/` belum pernah di-generate (`cordova platform add`
belum dijalankan), dan secara default app jalan dalam **mode mock** (`MOCK_MODE: true` di
`src/js/config.js`) — semua data dummy, disimpan di memori, hilang tiap refresh. Backend
nyata untuk app ini ada di [`../backend-migrasi`](../backend-migrasi) (project Slim 4
terpisah, tanpa ORM/migration, auth token Bearer via JWT — lihat bagian "Menyambungkan ke
backend nyata").

## Stack

Cordova (Android/iOS) + Vite + Tailwind CSS v3 + jQuery + Leaflet (peta admin). Multi-page-app
style tapi routing client-side via hash router custom (`src/js/router.js`) — bukan library.

## Struktur

```
ekspedisi-apk/
├── config.xml            # konfigurasi Cordova (id app, permission, plugin native)
├── vite.config.js         # build src/ -> www/ (base:'' wajib utk file:// di WebView)
├── tailwind.config.js      # palet warna: brand (hijau), route (orange CTA), status (dot supir)
├── public/                # disalin apa adanya ke www/ oleh Vite (publicDir) -- isinya cuma logo_koperindo.jpeg
│                            # (dipakai login.js) saat ini, belum ada ikon/splash app
└── src/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── main.js          # entry point: registrasi route + bootstrap (deviceready vs DOMContentLoaded)
        ├── router.js         # hash router custom: dynamic segment `:param`, guard `roles`/`public`
        ├── config.js          # APP_CONFIG — MOCK_MODE, AUTO_LOGIN_ROLE, API_BASE_URL, dst
        ├── auth.js            # login (1 request -> token), session { token, role, user } di localStorage
        ├── api.js             # wrapper $.ajax (JSON) + uploadFile/postMultipart (multipart), auto-logout on 401
        ├── mock.js            # backend palsu in-memory, dipakai saat MOCK_MODE: true
        ├── geo.js             # watchPosition + ping lokasi berkala ke server
        ├── camera.js          # ambil foto: cordova-plugin-camera, fallback <input capture> di browser
        ├── prefill.js         # state kecil di memori: titip penjualan_id dari tab SPK ke form Buat SJ
        ├── connection.js       # indikator online/offline di topbar (navigator.onLine + event online/offline)
        ├── versionCheck.js      # cek versi app tiap 30 detik ke POST /config/check-version (lihat bagian "Cek versi app")
        ├── app-version.js       # [AUTO-GENERATE bump-version.cjs] CURRENT_APP_VERSION_CODE/STRING -- JANGAN edit manual
        ├── format.js          # formatSpkNo()/toTitleCase() -- format tampilan nomor SPK & nama klien, lihat bagian "Format nomor SPK" di bawah
        ├── components/
        │   ├── navbar.js       # header hijau + connection-indicator + tombol back/logout, dipakai tiap halaman
        │   ├── adminTabs.js     # tab bar SPK/SJ/Ekspedisi -- cuma di 3 halaman ROOT admin
        │   ├── tableToolbar.js   # toolbar "Data | jumlah" + kotak cari + Riwayat/Refresh di atas <table> (tab SPK & SJ)
        │   ├── pagination.js     # kontrol panah kiri/kanan + "halaman/total" (mis. "1/20") di bawah <table>
        │   ├── modal.js         # overlay+panel generik (KOMPONEN MODAL PERTAMA app ini), dipakai "Detail Surat Jalan"
        │   ├── lightbox.js      # popup gambar full-screen, delegated ke SEMUA <img data-lightbox>
        │   └── loader.js       # spinner, page loader, setButtonLoading()
        └── pages/
            ├── login.js
            ├── driverDashboard.js     # status toggle + daftar perjalanan aktif
            ├── driverWorkflow.js      # step wizard 3 checkpoint foto per perjalanan
            ├── adminSpkBelumSj.js     # tab "SPK" -- HALAMAN AWAL admin, SPK ready-kirim tanpa SJ + tombol "Buat SJ"
            ├── adminSuratJalan.js      # tab "SJ" -- daftar surat jalan (modul ekspedisi_t_surat_jalan, skema sendiri)
            ├── adminNewSuratJalan.js   # bikin surat jalan manual, tidak terikat trip (drill-down dari tab SJ/SPK)
            ├── adminDashboard.js      # tab "Ekspedisi" -- MURNI monitoring (peta live Leaflet + list supir yg sedang mengirim), auto-refresh 15 detik
            ├── adminDriverDetail.js   # riwayat perjalanan, dokumen (SIM/KTP/STNK), & thumbnail foto per supir (drill-down dari tab Ekspedisi)
            ├── adminNewTrip.js         # admin bikin perjalanan MANUAL (independen SPK/SJ) untuk supir tertentu
            ├── adminNewDriver.js       # admin tambah supir baru -- toggle internal (username+SIM) / eksternal (nama+telepon+opsional ekspedisi+KTP/SIM/STNK)
            └── adminEkspedisiList.js   # kelola master perusahaan ekspedisi eksternal (drill-down dari tab Ekspedisi)
```

## Tema, topbar, & connection indicator (2026-08-20)

- **Warna brand jadi hijau** (`tailwind.config.js`, sebelumnya teal) — `brand-600` (`#16A34A`)
  sengaja SAMA PERSIS dgn `status.online` (dot supir online) — app ini soal ekspedisi/logistik,
  hijau "jalan/aktif" jadi identitas & status sekaligus. `route` (orange, CTA kritikal kayak
  ambil foto) tidak berubah, tetap dipasangkan dgn brand hijau.
- **Topbar** (`navbar.js`) — dari putih/`bg-white` jadi solid `bg-brand-600`, teks & ikon
  (back/logout) jadi putih. Dipakai di SEMUA halaman (bukan cuma tab admin) krn `renderNavbar()`
  cuma 1 komponen shared.
- **Connection indicator** (`connection.js` + CSS di `style.css`) — bulat kecil kedip di topbar
  **paling kiri**, sebelum tombol back/judul. Meniru PERSIS pola visual & animasi
  `.connection-indicator`/`#box_internet` yang sudah ada di app lain workspace ini
  (`surat-jalan-apk`, `produksi-apk` — dashed border putih saat idle, glow hijau `#00ff00`
  berdenyut pelan saat `connected`, glow merah `#ff0000` berdenyut cepat saat `disconnected`).
  **Beda cara deteksinya**: app Framework7 lama itu ping endpoint `/check-internet-sj` tiap saat
  (sekalian cek versi app & password) — `backend-migrasi` tidak punya endpoint semacam
  itu, jadi di sini cukup `navigator.onLine` + event `online`/`offline` browser (WebView Cordova
  sudah cukup akurat lewat itu). Listener dipasang SEKALI di level module (bukan tiap render
  navbar) — tiap event fire, cari elemen `#connection-indicator` yang SEDANG ada di DOM.
- **Logo login** (`login.js`) — ikon placeholder (truk generik) diganti foto asli
  `public/logo_koperindo.jpeg` (ditambahkan manual, disalin Vite apa adanya ke `www/` krn
  ada di `publicDir`, direferensikan relatif `logo_koperindo.jpeg` dari halaman). Folder
  `public/` di root ini (Vite `publicDir`) beda dari `res/` konvensi Cordova (ikon/splash
  native, belum dipakai saat ini) — sengaja dipisah supaya tidak campur aduk dua konvensi
  berbeda (2026-08-20, sebelumnya sempat digabung jadi `res/public/`).

## Sinkronisasi tampilan dengan `inventory-apk` (2026-08-21 & 2026-08-22)

[`inventory-apk`](../inventory-apk) (Cordova baru, dibuat 2026-08-21 dgn setup mengikuti app
ini — lihat README di sana) & app ini dimaksudkan terasa satu keluarga visual. Sebagian
penyesuaian jalan **dua arah** — beberapa elemen dari `inventory-apk` disalin balik ke sini:

- **`login.js` dirombak strukturnya** — layout kartu-kaca+grid+orb, judul app, quotes, toggle
  show/hide password, dan footer satu baris disamakan dgn struktur `inventory-apk`. Logo diganti
  ke `logo_koperindo_hitam.png` (flat, dipakai `inventory-apk` juga) — sebelumnya app ini pakai
  `logo_koperindo.jpeg` dgn backdrop lingkaran baked-in di file gambarnya.
- **Ukuran topbar & tab bar disamakan ke `inventory-apk`** (2026-08-22) — `navbar.js`: padding
  topbar `py-2.5` → `py-2`. `adminTabs.js`: padding/gap tab bar `px-3 py-2 gap-1.5` →
  `px-1.5 py-1 gap-1`, tombol tab `rounded-lg text-sm font-semibold` → `rounded-md text-xs
  font-bold`. **Arah sebaliknya dari kebanyakan perubahan lain di bagian ini** — di sini
  `inventory-apk` jadi acuan ukurannya, app ini yang menyesuaikan.
- **Warna tab tidak aktif digelapkan** (2026-08-22) — `adminTabs.js`: `text-slate-500` →
  `text-slate-600`, konsisten dgn perubahan serupa di `inventory-apk/src/lib/shell.js`
  (`hnt-tab-primary` dikasih latar `bg-slate-100` di sana).
- **Gaya tombol disamakan ke tab Partner `inventory-apk`** (2026-08-22) — `style.css`:
  `.btn-brand`/`.btn-route`/`.btn-ghost` — `rounded-xl` → `rounded-md`, `py-3.5` → `py-3`,
  `shadow-card` dihapus, `font-semibold` → `font-bold`, tambah `hover:brightness-95`
  (`.btn-ghost` pakai `hover:bg-slate-50` sebagai gantinya krn `brightness` tidak kelihatan
  efeknya di atas putih polos). `.btn-table-action`: `rounded-lg` → `rounded-md` — cuma bentuk
  sudut yang diseragamkan, skema warna (tetap abu-abu gelap seragam apa pun jenis aksinya, lihat
  bagian "Tombol kolom Aksi disamakan ukurannya" di atas) sengaja TIDAK ikut disentuh.
  - **Catatan (dead code, bukan bug):** `.btn-brand` ternyata sudah tidak dipakai di JS manapun
    sejak `login.js` dirombak pakai class `.lsc-btn` sendiri (poin pertama di atas) — Tailwind
    JIT otomatis mem-purge-nya dari `www/` hasil build krn tidak pernah ke-reference. Class-nya
    dibiarkan tetap ada di `style.css` (bukan bug, sengaja tidak dihapus krn di luar cakupan
    perubahan sinkronisasi ini).

## Setup & development

```bash
npm install
npm run dev        # Vite dev server, default http://localhost:5173, host:true (bisa diakses dari HP di jaringan sama)
```

Di browser biasa `deviceready` tidak pernah fire, jadi `main.js` fallback ke
`DOMContentLoaded` — kamera fallback ke `<input type="file" capture>`, geolocation pakai
browser API langsung (perlu izin lokasi + HTTPS/localhost).

## Mode mock (default aktif)

`src/js/config.js`:

```js
MOCK_MODE: true,           // semua request lewat mock.js, tidak perlu backend nyala
AUTO_LOGIN_ROLE: 'driver', // 'driver' | 'admin' | null — bypass halaman login otomatis saat app dibuka
```

- Saat `MOCK_MODE: true`, login menerima username apa saja; ketik username yang mengandung
  kata **"admin"** untuk masuk sebagai admin, selain itu masuk sebagai supir (lihat
  `mockLogin()` di `mock.js`).
- `AUTO_LOGIN_ROLE` (hanya berlaku kalau `MOCK_MODE: true`) melewati halaman login sama
  sekali — cocok untuk demo cepat, **matikan (`null`) sebelum tes alur login sungguhan**.
- Data mock: 4 supir dummy di sekitar Sidoarjo, 2 perjalanan aktif sudah di-seed untuk
  driver id `1` ("Budi Santoso" — inilah user yang otomatis "login" lewat `AUTO_LOGIN_ROLE: 'driver'`).

## Menyambungkan ke backend nyata

Set `MOCK_MODE: false` di `src/js/config.js`. `API_BASE_URL` defaultnya sudah
`http://127.0.0.1:8000` (dev server `php -S 127.0.0.1:8000 -t public` di
[`backend-migrasi`](../backend-migrasi)) — ganti kalau backend jalan di host/port
lain. **Tanpa suffix `/api`** — beda dari `backend-production`, route Slim di
`backend-migrasi` tidak pakai prefix itu (`/login`, `/driver/me`, dst langsung dari root).

Auth-nya **token Bearer (JWT), bukan cookie/session** — beda dari kebanyakan app lain di
workspace ini yang pakai `backend-production` (session-based, butuh
`withCredentials`+CORS-credentials khusus). Login cuma **1 request**: `POST /login` balikin
`{ token, role, user }` langsung (lihat `auth.js`), token disimpan di localStorage lalu
dikirim manual lewat header `Authorization: Bearer <token>` di tiap request selanjutnya
(`api.js`). Tidak perlu konfigurasi CORS khusus di sisi backend — `backend-migrasi`
sudah mengizinkan semua origin tanpa kredensial (lihat CORS middleware-nya) karena tidak
ada cookie yang dikirim lintas-origin.

`backend-migrasi` login pakai akun pegawai yang sudah ada (`shared_m_users`, database
produksi yang sama dipakai `backend-production`) — supir/admin tidak perlu akun baru khusus
app ini, tapi role admin baru aktif kalau `user_id`-nya sudah di-seed ke
`ekspedisi_m_admin_access` (lihat README backend-nya).

## Kontrak API

Sumber kebenaran endpoint & bentuk data adalah `src/js/mock.js` (dibuat mengikuti apa yang
benar-benar dipanggil `api.js`/pages), dan cocok persis dengan
[`backend-migrasi`](../backend-migrasi) yang sekarang jadi backend resminya.

| Method | Endpoint | Dipanggil dari | Request | Response |
|---|---|---|---|---|
| POST | `/login` | `auth.js login()` | `{ username, password }` (JSON) | `{ token, role, user: { id, name } }` |
| POST | `/config/check-version` | `versionCheck.js` (polling tiap 30 detik, mulai dari `bootstrap()` `main.js`) | `{ current_version_code }` (integer dari `app-version.js`) | `{ status: 'success', is_valid: bool, config: { config_keterangan, ... }\|null }` — `is_valid: false` → alert pesan `config.config_keterangan` + paksa logout |
| POST | `/logout` | `auth.js logout()` | header `Authorization: Bearer <token>` | fire-and-forget, tidak ditunggu |
| GET | `/driver/me` | `driverDashboard.js` | — | `{ id, name, status, active_trips: [{ id, destination, current_step_label, ... }] }` |
| POST | `/driver/status` | `driverDashboard.js` | `{ status: 'online'\|'resting'\|'offline' }` | `{ status }` |
| POST | `/driver/location` | `geo.js` (tiap 30 detik saat status online) | `{ lat, lng, speed, heading, accuracy, recorded_at }` | — |
| GET | `/driver/trip/:id` | `driverWorkflow.js` | — | `{ id, destination, completed_steps: ['berangkat', ...] }` |
| POST | `/driver/trip/:id/photo` | `driverWorkflow.js` (via `api.uploadFile`) | multipart: `photo` (file), `type` (`berangkat`\|`serah_terima`\|`sj`), `lat`, `lng` | `{ ok, completed_steps }` |
| POST | `/driver/trip/:id/complete` | `driverWorkflow.js` (otomatis setelah 3 foto) | — | `{ ...trip }` |
| GET | `/admin/drivers` | `adminDashboard.js` (auto-refresh 15 detik) | — | Supir yang **SEDANG mengirim saja** (2026-08-20, dulu SEMUA supir) → `[{ id, name, status, lat, lng, current_step_label }]` |
| POST | `/admin/drivers` | `adminNewDriver.js` | **multipart** (2026-08-20). Internal: `{ tipe: 'internal', username }` + file `foto_sim` (WAJIB). Eksternal: `{ tipe: 'eksternal', nama, telepon?, id_expedisi? }` + file `foto_ktp`, `foto_sim`, `foto_stnk` (KETIGANYA WAJIB) | `{ id, name, status, tipe, foto_*: path }` |
| POST | `/admin/drivers/:id/documents` | `adminDriverDetail.js` (tombol "Upload Foto" per slot dokumen) | multipart, opsional (isi salah satu/lebih): `foto_sim?`, `foto_ktp?`, `foto_stnk?` | `{ foto_sim, foto_ktp, foto_stnk }` (URL) |
| GET | `/admin/ekspedisi` | `adminNewDriver.js` (dropdown perusahaan), `adminEkspedisiList.js` (`?all=1`, layar kelola) | query opsional `all=1` | `[{ id, kode_ekspedisi, nama_ekspedisi, pic, alamat, no_telp, is_active }]` — 2026-08-20, master lokal (`ekspedisi_m_ekspedisi`), dulu field beda nama & baca `m_expedisi` |
| POST | `/admin/ekspedisi` | `adminEkspedisiList.js` (tombol "+") | `{ kode_ekspedisi?, nama_ekspedisi (WAJIB), pic?, alamat?, no_telp? }` | 201, `{ ...perusahaan baru }` |
| PUT | `/admin/ekspedisi/:id` | `adminEkspedisiList.js` (tombol "Edit", termasuk toggle Aktif) | field opsional: `kode_ekspedisi, nama_ekspedisi, pic, alamat, no_telp, is_active` | `{ ...perusahaan terupdate }` |
| GET | `/admin/drivers/:id` | `adminDriverDetail.js`, `adminNewTrip.js` | — | `{ id, name, phone, status, foto_sim, foto_ktp, foto_stnk, trips: [{ id, destination, status_label, created_at, photos: [{ type, url }] }] }` — `foto_*` (2026-08-20, baru) URL lengkap atau `null` kalau belum diunggah |
| POST | `/admin/drivers/:id/trip` | `adminNewTrip.js` ("Perjalanan Baru", jalur MANUAL independen SPK/SJ) | `{ destination, no_surat_jalan?, penjualan_id? }` | `{ ...trip baru }` |
| POST | `/admin/trips/:id/complete` | `adminDriverDetail.js` (tombol "Tandai Selesai", cuma tampil utk trip aktif supir eksternal) | — | `{ ...trip, status: 'completed' }`, 422 kalau supirnya internal |
| GET | `/admin/surat-jalan/:no` | `adminNewTrip.js` (tombol "Cek") | — | `{ no_surat_jalan, tanggal, kendaraan, plat, pengirim, valid_cs, client_nama, client_alamat }`, 404 kalau tidak ketemu |
| GET | `/admin/spk-belum-sj` | ~~`adminSpkBelumSj.js`~~ | — | **[DIHAPUS 2026-08-23]** bareng tab "SPK" — lihat bagian "Penyederhanaan 2026-08-23" di bawah. Baris ini dipertahankan sbg riwayat, endpoint & filenya sudah tidak ada. |
| GET | `/admin/sj/spk/:penjualan_id/items` | `adminNewSuratJalan.js` (tombol "+ Tambah" di field Nomor SPK, bisa dipanggil berkali-kali utk beberapa SPK) | — | **[2026-08-23, dulu array polos]** `{ client_id, client_nama, lines: [{ penjualan_detail_performa_id, penjualan_jenis, penjualan_qty, client_id, client_nama, terkirim, sisa }] }`, 404 kalau SPK tidak ketemu. `client_id`/`client_nama` dipakai FE cek aturan "1 SJ cuma boleh lintas SPK dari klien yang sama" |
| GET | `/admin/sj` | `adminSuratJalan.js` | query opsional: `status`, `belum_tervalidasi` (2026-08-23, `status != 'tervalidasi'` — dipakai mode aktif; diabaikan kalau `status` juga diisi), `penjualan_id`, `q`, `tahun`, `page`, `per_page` | `{ data: [{ id, no_surat_jalan, nomor_urut, trip_id, penjualan_id, driver_id, nama_supir, tujuan, kendaraan, plat, penerima, jumlah_kirim, tgl_kirim, asal, items: [{ penjualan_detail_performa_id, penjualan_id, penjualan_jenis, jumlah_kirim }], client_names: [...], foto_surat_jalan, foto_validasi, divalidasi_oleh, divalidasi_at, nama_validator, catatan, status, missing, created_at }], total, page, per_page }` — `asal` = `native`/`migrasi_legacy` (badge "Data Lama", cuma di modal Detail sejak tabel dirampingkan, lihat di bawah). `client_names` (2026-08-20) = nama klien per SPK yang disentuh, dipakai kolom "Klien". **`nomor_urut`/`missing`** (2026-08-23) — nomor SJ sekarang diinput manual (lihat POST di bawah); kalau `q` kosong, baris VIRTUAL disisipkan utk tiap nomor yang hilang dalam rentang tahun difilter (`missing: true`, tidak ada di DB, field lain null) — lihat bagian "Penyederhanaan 2026-08-23" |
| POST | `/admin/sj` | `adminNewSuratJalan.js` | `{ nomor_urut (WAJIB), tujuan, driver_id (WAJIB), kendaraan?, plat?, penerima?, jumlah_kirim?, tgl_kirim?, catatan?, items?: [{ penjualan_detail_performa_id, jumlah_kirim }] }` | 201, `{ ...surat jalan baru }`, 422 kalau `driver_id`/`nomor_urut` kosong, `nomor_urut` sudah dipakai, ada item melebihi sisa qty, atau item yang disentuh dari **lebih dari 1 klien/perusahaan berbeda** (2026-08-23, aturan baru). `items` boleh lintas beberapa SPK sekaligus (TAPI cuma kalau semua dari klien yang sama), tidak ada param `penjualan_id` lagi. **`nomor_urut`** (2026-08-23, WAJIB, dulu `no_surat_jalan` auto-generate dari id/tanggal) — angka polos sesuai nomor kertas SJ fisik yang sudah dicetak (mis. `1234`), backend menurunkan `no_surat_jalan` ('SJ_1234') darinya. (2026-08-20) Kalau `driver_id`-nya supir **internal**, backend OTOMATIS bikin `ekspedisi_t_trip` & menautkannya (gantiin langkah "Plot SPK ke Supir" yang dihapus) — supir tetap bisa checkpoint foto sendiri lewat app-nya; supir eksternal sengaja tidak dibikinkan trip |
| GET | `/admin/sj/:id` | (belum dipanggil dari UI) | — | `{ ...detail surat jalan }`, 404 kalau tidak ketemu |
| PUT | `/admin/sj/:id` | (belum ada UI edit) | field opsional: `tujuan, kendaraan, plat, penerima, jumlah_kirim, tgl_kirim, catatan` | `{ ...surat jalan terupdate }` |
| POST | `/admin/sj/:id/photo` | `adminNewSuratJalan.js` (kalau admin ambil foto sebelum submit) | multipart: `photo` | `{ ...surat jalan, status: 'terkirim' }` |
| POST | `/admin/sj/:id/validasi` | `adminSuratJalan.js` (tombol "Validasi", foto SJ final bertandatangan) | multipart: `photo` | `{ ...surat jalan, status: 'tervalidasi' }`, 422 kalau sudah tervalidasi |

Catatan: `api.js` memaksa logout + redirect ke `#/login` otomatis pada **response 401** di
request apa pun (GET/POST/upload) — backend harus benar-benar balikin 401 untuk sesi
kadaluarsa, bukan 200 dengan pesan error di body.

`no_surat_jalan` di form "Perjalanan Baru" **opsional** — tautan ke SJ resmi (tabel
`surat_jalan` milik `backend-production`, dibuat lewat `surat-jalan-apk`/app lain). Cuma
tautan by-nomor, belum ada auto-fill/validasi CS otomatis — detail lengkap & batasannya ada
di README `backend-migrasi`.

**Halaman "SPK Siap Kirim" / "Plot SPK ke Supir" (`#/admin/spk-kirim`) DIHAPUS (2026-08-20).**
Dulu daftar order yang sudah disetujui utk dikirim tapi belum diplot ke supir manapun, admin
pilih supir dari dropdown (internal & eksternal sekaligus) lalu "Plot" bikin trip baru tertaut
ke SPK itu — **keputusan produk:** dianggap redundan begitu tab SPK & SJ ada (supir melekat ke
pengiriman/SJ, pengiriman melekat ke SPK, jadi tidak perlu langkah plotting terpisah lagi).
Assignment sekarang murni lewat field "Supir" (WAJIB) di form "Buat Surat Jalan" — lihat bagian
"Tab Ekspedisi jadi murni monitoring" di bawah utk apa yang menggantikannya.

**Modul Surat Jalan** (`#/admin/sj`, `#/admin/sj/new`) — skema **sendiri** milik app ini
(`ekspedisi_t_surat_jalan`), independen dari tabel `surat_jalan` lama `backend-production`
(punya lampiran `no_surat_jalan` di atas). Dua jalur pembuatan: (1) **otomatis**, terbentuk/
terlengkapi tiap kali supir upload foto checkpoint bertipe `sj` di `driverWorkflow.js` (baris
berstatus `terkirim` begitu foto masuk); (2) **manual**, lewat `adminNewSuratJalan.js` — admin
bikin baris tanpa trip sama sekali (`trip_id: null`), **Supir WAJIB dipilih** (2026-08-20, dulu
opsional — lihat catatan di bawah), isi `tujuan`/`kendaraan`/`plat`/`penerima`/`jumlah_kirim`/
`tgl_kirim`, foto opsional (tombol "Ambil Foto", `camera.js` — diupload lewat
`POST /admin/sj/:id/photo` sesaat setelah SJ-nya tersimpan). Field non-foto bisa diedit
belakangan lewat `PUT /admin/sj/:id` (backend siap, UI edit belum ada). Nomor `no_surat_jalan`
(format `SJ-YYYYMMDD-xxxx`) di-generate otomatis oleh backend setelah insert — sengaja tetap
begitu, tidak diketik manual seperti di `surat-jalan-apk`. Detail penuh (struktur kolom, FK,
alasan skema terpisah) ada di README `backend-migrasi`.

**Terikat ke SPK, dengan breakdown per produk — BOLEH LINTAS BEBERAPA SPK** (2026-08-20,
direvisi hari yang sama) — ditelusuri ulang alur input SJ asli, ternyata SJ **selalu** melekat
ke SPK (`t_penjualan_header`, lewat lini produk `t_penjualan_detail_performa`), dan realitasnya
1 dokumen SJ fisik (1 truk, sekali jalan) **bisa mengangkut pesanan gabungan dari lebih dari 1
SPK sekaligus** — bukan cuma 1 SPK per SJ seperti asumsi rancangan awal. Di form "Buat Surat
Jalan": isi "Nomor SPK", klik "+ Tambah" — SPK itu jadi 1 **grup section** berisi breakdown
lini produknya sendiri (nama produk, qty dipesan, sisa yang belum terkirim dari SEMUA sumber —
SJ lama `surat-jalan-apk` maupun SJ baru app ini) dengan input jumlah kirim per lini (dibatasi
`max` ke sisa qty, dobel-dicek lagi di server saat submit per-item). Ulangi isi+Tambah kalau ada
SPK lain yang mau diangkut SJ yang sama — tiap grup punya tombol "Hapus" sendiri, dan SPK yang
sama tidak bisa ditambah dobel (ditolak dgn pesan "SPK ini sudah ditambahkan"). Field "Jumlah
kirim" flat disembunyikan begitu ada minimal 1 grup SPK — nilainya dihitung otomatis dari total
SEMUA item lintas grup. Jangan tambah SPK apa pun untuk tetap bisa bikin SJ lepas (mis.
sampel/transfer internal) dengan jumlah kirim manual seperti sebelumnya. Breakdown per SJ
ditampilkan juga di kolom "Kirim" pada tabel `adminSuratJalan.js`, dan daftar SPK yang disentuh
(bisa lebih dari satu, dipisah koma) di kolom "No SJ". Detail lengkap (kenapa tabel item
terpisah, kenapa validasi per-item bukan per-SPK, kenapa sisa qty dihitung lintas 2 sumber) ada
di README `backend-migrasi`.

**Entry point dari tab "SPK"** (2026-08-20) — tombol "Surat Jalan" di `adminSpkBelumSj.js`
(lihat bagian Routing di bawah) nitip `penjualan_id` yang dipilih lewat `prefill.js` (state
kecil di memori, bukan query string — `router.js` hash-based belum dukung itu) sebelum
`navigate('/admin/sj/new')` — begitu form "Buat Surat Jalan" render, `consumePrefillPenjualanId()`
langsung nambahin SPK itu sebagai grup pertama, admin tidak perlu ketik ulang (tapi tetap bisa
tambah SPK lain lagi sesudahnya kalau perlu).

**Pengirim → Penerima, Supir jadi wajib** (2026-08-20) — dua koreksi setelah dipakai: field
"Pengirim" (nama org serah-terima) dihapus, dianggap tumpang tindih sama konsep supir yang
sudah ada (SJ selalu punya supir). Diganti **"Penerima"** (opsional) — nama PIC di TUJUAN,
supaya supir tahu siapa yang harus dihubungi/diserahi barang. Field "Supir" yang sebelumnya
opsional ("-- Belum ditentukan --") sekarang **wajib dipilih** (`required` di `<select>`,
opsi kosong dijadikan `disabled` — submit diblokir validasi native browser kalau belum pilih,
dobel-dicek lagi di server).

**Alur validasi** (2026-08-19) — memodelkan proses fisik: SJ dibawa supir → ditandatangani
penerima saat barang diterima → dibawa balik ke admin → admin foto dokumen final itu. Tombol
"Validasi" (kolom "Aksi") muncul di `adminSuratJalan.js` untuk tiap SJ yang belum `tervalidasi`
(status manapun — `draft` atau `terkirim`) — klik, ambil foto (`camera.js`), langsung
`uploadFile` ke `POST /admin/sj/:id/validasi`. Begitu sukses, badge status berubah jadi
"Tervalidasi", foto final ditampilkan (border teal, beda dari foto checkpoint biasa), dan
tombolnya hilang — SJ yang sudah tervalidasi tidak bisa divalidasi ulang (backend menolak 422).
Detail penuh (kenapa 3 status, kenapa foto checkpoint & foto validasi disimpan terpisah) ada di
README `backend-migrasi`.

**Data historis (`asal='migrasi_legacy'`)** (2026-08-20) — hasil `migrate_legacy_surat_jalan.php`
di `backend-migrasi` (data `surat_jalan` lama sejak 2024, lihat README di sana). Baris
begini tampil badge abu-abu **"Data Lama"** di sebelah status pada tabel `adminSuratJalan.js`,
biasanya tanpa supir (`driver_id` NULL — data lama tidak match andal ke supir manapun) dan
fotonya di-host di domain lama (`indokoper.com`), BUKAN di `API_BASE_URL` app ini sendiri.
Karena itu URL foto dibangun lewat helper `fotoUrl()` (bukan `${API_BASE_URL}/${path}` langsung
seperti sebelumnya) — deteksi otomatis: kalau `path`-nya sudah URL absolut (`http.../...`),
dipakai apa adanya; kalau relatif, baru digabung dgn `API_BASE_URL` seperti biasa.

**Model tabel + toolbar Refresh/Riwayat** (2026-08-20) — tab "SPK" (`adminSpkBelumSj.js`) & "SJ"
(`adminSuratJalan.js`) dirombak dari kartu ke `<table>`, meniru pola card-header di
`surat-jalan-apk` (judul + jumlah baris + ikon refresh/riwayat di toolbar gelap di atas tabel —
lihat `pages/surat_jalan.html` di sana), disesuaikan ke sistem desain Tailwind app ini lewat
`components/tableToolbar.js`. Tombol **Riwayat** toggle (bukan popup terpisah — waktu ini
ditulis app belum punya komponen modal, lihat `components/modal.js` yang ditambah belakangan
utk "Detail Surat Jalan" di bawah) antara daftar aktif & mode riwayat, di-refetch dari server tiap toggle
(**server-side**, bukan filter client-side lagi sejak pagination ditambahkan — lihat di bawah):
- Tab SPK: aktif = `GET /admin/spk-belum-sj`; riwayat = `GET /admin/sj`. Baik aktif maupun
  riwayat, hasilnya di-"flatten" client-side jadi 1 baris tabel PER SPK yang disentuh tiap SJ
  (dari `items[].penjualan_id`, fallback ke header `penjualan_id` utk SJ trip-linked lama) — 1
  SJ yang lintas beberapa SPK jadi beberapa baris di tabel riwayat ini, supaya kolom SPK-nya
  tetap 1 nilai per baris (lihat `flattenSjBySpk()` di `adminSpkBelumSj.js`).
- Tab SJ: aktif = `GET /admin/sj` tanpa filter status (semua tercampur, memang tujuan utama tab
  ini); riwayat = `GET /admin/sj?status=tervalidasi`.

Tombol **Refresh** cuma re-fetch & re-render mode yang sedang aktif (tidak reset ke mode
default, TIDAK reset ke halaman 1). Toggle Riwayat & submit pencarian SAMA-SAMA reset ke halaman
1 (state lama jadi tidak relevan). Kedua halaman full re-render tiap toggle/refresh/ganti
halaman (bukan patch DOM parsial) — konsisten dengan pola `adminDashboard.js` yang sudah ada.

**Pagination & search (2026-08-20)** — ditambahkan setelah migrasi data historis
(`backend-migrasi`, lihat di atas) bikin tab SJ berpotensi punya 1.500+ baris; fetch semua
tanpa batas jadi berat. `components/tableToolbar.js` sekarang terima `searchValue`/`onSearch`
opsional (kotak cari muncul di bawah bar gelap kalau `onSearch` diisi, debounced ~400ms sambil
ngetik + langsung saat Enter); `components/pagination.js` (baru, tampilannya sendiri direvisi
2026-08-20 -- lihat bagian "Pagination dirampingkan" di bawah) render kontrol nav di bawah
`<table>` (otomatis sembunyi kalau cuma 1 halaman). Kedua halaman (`adminSpkBelumSj.js`/`adminSuratJalan.js`) simpan state `page`/`query`
di closure, kirim ke `GET /admin/sj`/`GET /admin/spk-belum-sj` via query string
(`?q=&page=&per_page=`) — **breaking change** kontrak respons kedua endpoint itu, dari array
polos jadi `{ data, total, page, per_page }` (lihat README `backend-migrasi`). `per_page`
tetap 20 (konstanta lokal tiap halaman, belum ada UI utk ganti ukuran halaman).

**Penyesuaian toolbar (2026-08-20):** judul toolbar (`components/tableToolbar.js`) tetap literal
**"Data | \<jumlah\>"** di semua halaman tabel (persis pola `<h3>Data | ...</h3>` di
`surat-jalan-apk`, tidak dibedakan per mode/halaman lagi). Tombol tambah (`+ Buat SJ`, cuma ada
di tab SJ — tab SPK tidak punya, SPK datang dari `backend-production` bukan dibuat di sini)
dipindah dari tombol lebar penuh di atas tabel ke dalam toolbar (`addLabel`/`onAdd`,
opsional — komponennya cuma render tombol itu kalau `addLabel` diisi). Semua sel `<th>`/`<td>`
di kedua tabel dikasih `whitespace-nowrap` (konten tidak pernah wrap, tabel scroll horizontal
lewat `overflow-x-auto` di wrapper-nya kalau kepanjangan) — sama seperti kolom-kolom sempit
fixed-width di tabel `surat-jalan-apk`.

**Scroll cuma di badan tabel, bukan seluruh halaman (2026-08-20)** — wrapper `<table>` di kedua
halaman (`adminSpkBelumSj.js`/`adminSuratJalan.js`) diganti dari `overflow-x-auto` polos jadi
`max-h-[65vh] overflow-auto` + `<thead>` `sticky top-0 z-10`. Karena wrapper ini sekarang punya
tinggi terbatas, begitu baris tabel melebihi itu, YANG SCROLL cuma area badan tabel di dalam
wrapper (header ikut "nempel" di atas krn sticky) — toolbar (judul/cari/Refresh/Riwayat) di atas
& kontrol paginasi di bawah wrapper selalu kelihatan tanpa perlu scroll dokumen. Ini cuma ganti
class CSS di wrapper, bukan restrukturisasi DOM `<table>` (`sticky` posisinya relatif ke wrapper
yang overflow, bukan ke viewport). Total data TIDAK berubah/berkurang krn ini (badge "Data | ..."
di toolbar & paginasi di bawah tetap dari `total` server apa adanya) -- konsekuensinya cuma lebih
SEDIKIT baris yang kelihatan sekaligus tanpa scroll dibanding sebelumnya (dulu bisa scroll
sepanjang HALAMAN buat lihat semua 20 baris/halaman, sekarang cuma sepanjang box `65vh`).

**Scrollbar wrapper dibuat selalu kelihatan (2026-08-20, susulan)** — kelas `.scroll-area`
(`style.css`) nambahin `scrollbar-width: thin`/`::-webkit-scrollbar` ke wrapper di atas, supaya
scrollbar-nya TIDAK disembunyikan seperti default banyak WebView (termasuk Cordova Android) yang
baru nongol pas jari benar-benar menyentuh area itu. Tanpa ini, box `max-h-[65vh]` yang cuma
menampilkan segelintir baris bisa gampang disalahartikan sebagai "datanya cuma sedikit" padahal
sisanya ada, tinggal di-scroll di dalam box itu -- total sungguhan tetap utuh (lihat toolbar/paginasi).

**Pagination dirampingkan (2026-08-20)** — `components/pagination.js` sebelumnya tombol teks
penuh "Sebelumnya"/"Selanjutnya" + baris "X-Y dari Z", sekarang cuma **2 tombol panah** (ikon,
persegi, kiri/kanan) + pecahan **"halaman sekarang/total halaman"** di tengah (mis. "1/20") —
"X-Y dari Z" dianggap tidak perlu, jumlah total tetap kelihatan dari badge "Data | ..." di
toolbar atasnya. Props komponen (`page`/`perPage`/`total`/`onPageChange`) tidak berubah, jadi
kedua pemanggil (`adminSpkBelumSj.js`/`adminSuratJalan.js`) tidak perlu ikut disentuh.

**Nama klien di-Judul Case-kan (2026-08-20)** — `client_nama` (`m_client`, backend-production)
ternyata tidak konsisten casing-nya di data produksi (mis. "BAHA INDONESIA" ALL CAPS vs "armain
travel" huruf kecil semua, dicek langsung ke database). `formatSpkNo()`'s sibling baru
`toTitleCase()` (`src/js/format.js`) menyeragamkan jadi "Baha Indonesia"/"Armain Travel" tiap kali
ditampilkan — kolom "Perusahaan" tab SPK, kolom "Klien" tab SJ (`adminSuratJalan.js`, tiap nama
di `client_names` sebelum digabung `" | "`). MURNI transformasi tampilan, TIDAK mengubah data
aslinya.

**Tabel SJ dirampingkan + modal "Detail Surat Jalan" (2026-08-20)** — kolom `adminSuratJalan.js`
sebelumnya (No SJ + info trip/SPK, Tujuan/Supir/Penerima gabung, Kirim breakdown, Tanggal
dibuat+kirim, Status+badge "Data Lama"+info validasi, Foto) dipangkas jadi **No SJ, Tujuan,
Klien, Dikirim, Status, Aksi** saja — info sekunder (Supir/kendaraan/plat, Penerima, breakdown
Kirim per produk, tanggal Dibuat, badge "Data Lama", info validasi, kedua foto) dipindah ke modal
baru **"Detail Surat Jalan"**, dipicu tombol **Detail** (kolom Aksi, di samping tombol Validasi
yang sudah ada) — lihat `detailBodyHtml()` & `components/modal.js` (komponen modal PERTAMA app
ini, generik: overlay + panel, sheet dari bawah di mobile/dialog center di `sm:` ke atas, tutup
lewat klik overlay/tombol X/Esc). Modal dibangun ulang dari `sj` di closure tiap kali tombol
diklik (bukan live-bound ke elemen tabel) — begitu aksi Validasi sukses, `sj` di-`Object.assign`
dgn response terbaru duluan supaya kalau Detail dibuka SESUDAHNYA datanya sudah sinkron
(status/foto_validasi/nama_validator/divalidasi_at), tanpa perlu re-fetch tabelnya.

**Kolom Klien (2026-08-20, baru)** — nama klien dari SPK yang disentuh SJ itu, digabung
**"Klien 1 | Klien 2"** (bukan baris baru per klien) kalau >1 SPK/klien tersentuh, supaya lebar
baris tetap 1 baris (tidak menurun) — konsisten dgn kolom lain yang `whitespace-nowrap`. Datanya
dari field baru `client_names` (array) di response `GET /admin/sj` — lihat
`App\Support\SuratJalan::resolveClientNames()` di README `backend-migrasi` (JOIN
`t_penjualan_header`/`m_client`, sumber SPK-nya dari `items[].penjualan_id` kalau ada, fallback
ke `penjualan_id` header utk SJ trip-linked lama yang tidak py breakdown item).

## Tab Ekspedisi jadi murni monitoring (2026-08-20)

**Keputusan produk:** dengan tab SPK & SJ sudah ada, halaman **"Plot SPK ke Supir"**
(`adminSpkKirim.js`, `#/admin/spk-kirim`, dulu drill-down dari tab Ekspedisi) dianggap **redundan**
— supir melekat ke pengiriman (SJ), pengiriman melekat ke SPK, jadi tidak perlu langkah plotting
TERPISAH SEBELUM SJ ada lagi. File & route-nya **DIHAPUS** sepenuhnya (lihat detail penuh &
alasan lengkap di README `backend-migrasi`, bagian "Tab Ekspedisi jadi murni monitoring").

`adminDashboard.js` (tab "Ekspedisi") sekarang **murni monitoring** — peta live + list cuma
nampilin supir yang **SEDANG mengirim** (`GET /admin/drivers` di-filter server-side sejak
perubahan ini, dulu balikin SEMUA supir tanpa syarat). Perubahan konkret di halaman ini:
- Tombol "Plot SPK ke Supir" di atas "Daftar Supir" **dihapus**; judul sidebar diganti **"Sedang
  Mengirim"** (lebih jujur soal isinya sekarang — bukan daftar SEMUA supir lagi).
- Fallback teks per baris (`current_step_label` kosong) diganti dari "Tidak ada perjalanan aktif"
  jadi **"Sedang mengirim"** — teks lama sudah tidak masuk akal krn baris yang tampil di sini
  sekarang PASTI lagi mengirim (kalau tidak, ya tidak akan ada di respons sama sekali).
- **Fix bug marker peta menumpuk** — sejak `GET /admin/drivers` cuma balikin supir aktif, seorang
  supir bisa "hilang" dari respons berikutnya begitu pengirimannya selesai (dulu tidak pernah
  terjadi, respons selalu berisi SEMUA supir). `refresh()` sekarang bandingkan id supir yang ada
  di respons TERBARU vs marker Leaflet yang sedang nempel di peta (`markers` object) — id yang
  sudah tidak ada di respons dihapus markernya (`map.removeLayer`) sebelum render ulang, supaya
  peta tidak numpuk marker supir yang sebenarnya sudah tidak relevan.
- Tambah state kosong (`emptyStateHtml()`) di sidebar kalau memang tidak ada supir yang sedang
  mengirim sama sekali (skenario yang jadi lumrah sekarang, dulu jarang terjadi krn selalu
  nampilin semua supir).

**Assignment sekarang murni lewat field "Supir" (WAJIB) di form "Buat Surat Jalan"**
(`adminNewSuratJalan.js`) — tidak ada perubahan di form itu sendiri (field & alurnya SAMA seperti
sebelumnya), yang berubah di baliknya: begitu SJ tersimpan dgn supir **internal**, backend
OTOMATIS bikin trip & menautkannya (lihat `POST /admin/sj` di README `backend-migrasi`) —
supir itu tetap bisa lihat tugasnya & checkpoint foto sendiri lewat dashboard/`driverWorkflow.js`
di app-nya, PERSIS seperti kalau dulu di-plot manual, cuma sekarang otomatis tanpa langkah
terpisah. Supir eksternal sengaja TIDAK dibikinkan trip (tidak bisa login/checkpoint apa pun) —
status "sedang mengirim"-nya di tab Ekspedisi dibaca langsung dari status SJ, bukan dari trip.

## Master perusahaan ekspedisi eksternal (2026-08-20)

Layar baru **"Kelola Ekspedisi"** (`adminEkspedisiList.js`, `#/admin/ekspedisi/kelola`,
drill-down dari tab Ekspedisi — link "Kelola Ekspedisi" di sebelah "+ Tambah Supir") — tabel
Kode/Nama/PIC/No Telp/Status + tombol "+ Tambah" & "Edit" per baris (keduanya buka modal yang
sama, `openForm()`, cuma beda judul & nilai awal), checkbox "Tampilkan nonaktif" toggle query
`?all=1`. Field `is_active` cuma muncul di modal Edit (perusahaan baru selalu mulai aktif) --
"nonaktifkan" (bukan hapus) lewat checkbox itu, submit-nya `PUT`.

Backend-nya (lihat README `backend-migrasi` bagian "Master perusahaan ekspedisi eksternal")
sekarang tabel LOKAL (`ekspedisi_m_ekspedisi`) — dulu `GET /admin/ekspedisi` baca `m_expedisi`
milik backend-production (READ-ONLY, `id_expedisi`/`kode_expedisi`/`nama_expedisi`); field-nya
ikut berganti nama (`id`/`kode_ekspedisi`/`nama_ekspedisi`) — makanya dropdown "Perusahaan
Ekspedisi" di `adminNewDriver.js` (satu-satunya konsumen lama) disesuaikan (`e.id_expedisi` ->
`e.id`, `e.nama_expedisi` -> `e.nama_ekspedisi`).

**`components/modal.js` diperluas (2026-08-20, susulan)** — sebelumnya `renderModal()` cuma
balikin `{ close }` (cukup buat "Detail Surat Jalan" yang murni tampilan, tidak ada elemen buat
di-bind ulang). Sekarang juga balikin `$body` (elemen `.p-4` pembungkus `bodyHtml`, ditandai
`data-modal-body`) supaya pemanggil bisa `$body.find(...)` & bind event handler (submit form,
dst) SETELAH modal-nya kepasang ke DOM — dipakai `adminEkspedisiList.js` buat form Tambah/Edit.
Perubahan ini backward-compatible (properti tambahan di objek return, pemanggil lama yang cuma
pakai `close` tidak perlu diubah).

## Topbar dirombak: jam berjalan + back dipisah dari topbar (2026-08-20)

`components/navbar.js` (`renderNavbar()`, dipakai SEMUA halaman) dapat 2 perubahan struktural:

- **Tombol back TIDAK LAGI nempel di dalam topbar hijau.** Dulu ada di kiri judul, sekarang jadi
  bar TERPISAH (putih, `border-b`) tepat di bawah topbar — cuma dirender kalau `opts.onBack`
  diisi (halaman drill-down: Detail Supir, Perjalanan Baru, Tambah Supir, Buat Surat Jalan,
  Kelola Ekspedisi). Topbar sendiri jadi murni identitas/status (connection indicator, judul,
  nama user, jam, logout) — tidak ada elemen navigasi campur di situ lagi. 3 halaman ROOT admin
  (tab SPK/SJ/Ekspedisi, pakai `adminTabs.js` bukan `onBack`) tidak terpengaruh, sama sekali
  tidak pernah punya tombol back.
- **Jam berjalan** (baru) — tanggal + jam realtime di kiri tombol logout, tanggal DI ATAS jam.
  Format tanggal `13 Des 26` (tanggal + bulan Indonesia disingkat + tahun 2-digit, daftar nama
  bulan lokal `MONTHS_ID` di file yang sama, BUKAN `toLocaleDateString` krn perlu format
  spesifik yang beda dari bawaan browser), jam `23:00:01` (`HH:mm:ss`, 24 jam, `tabular-nums`
  biar angka tidak "goyang" tiap detik ganti). Update tiap detik (`setInterval` 1000ms) --
  timer dibersihkan pas pindah halaman lewat listener `hashchange` sekali-pakai, pola SAMA
  persis dgn auto-refresh `adminDashboard.js`/polling `adminSpkBelumSj.js` (`renderNavbar()`
  dipanggil di HAMPIR SEMUA halaman, jadi kalau timer-nya tidak dibersihkan bakal numpuk banyak
  interval berjalan sekaligus tiap kali pindah halaman).

## Tombol kolom "Aksi" disamakan ukurannya (2026-08-20)

Kelas baru `.btn-table-action` (`style.css`, `@layer components`) — `w-28` (lebar TETAP, apa pun
labelnya) + padding/font seragam, dipakai gantiin class ad-hoc yang beda-beda panjang sebelumnya
di tombol "Detail"/"Validasi" (`adminSuratJalan.js`), "Surat Jalan" (`adminSpkBelumSj.js`), "Edit"
(`adminEkspedisiList.js`) — SEBELUMNYA "Validasi" pakai `btn-ghost` (padding lebih besar) sementara
lainnya rounded-lg biasa, jadi baris tabel kelihatan "bergerigi" kalau 2 tombol Aksi tampil
sekaligus (mis. Detail+Validasi) dgn panjang beda. Cuma UKURAN yang dipaksa sama lewat kelas ini
-- warna/tone (`bg-slate-100`.../`border border-slate-200`...) tetap ditentukan tiap pemanggil
sesuai konteksnya masing-masing (mis. Validasi tetap dibedakan visualnya dari Detail, cuma
sekarang framenya sama besar).

## Tab Ekspedisi: label & tombol block (2026-08-20)

- Judul sidebar "Sedang Mengirim" -> **"Berjalan"** (`adminDashboard.js`).
- "Kelola Ekspedisi" (link teks polos) -> **ikon list + "Ekspedisi"**, dan "+ Tambah Supir" ->
  **ikon plus + "Supir"** -- keduanya diganti jadi tombol BLOK (`rounded-lg` + background +
  padding, konsisten dgn gaya tombol lain di app ini) alih-alih link teks polos kayak sebelumnya.
  Ikon SVG lokal (`LIST_ICON`/`PLUS_ICON`, pola sama dgn `components/tableToolbar.js` -- tiap
  file re-declare ikonnya sendiri, konsisten dgn duplikasi ringan yang sudah jadi kebiasaan di
  app ini drpd bikin modul ikon terpisah utk 2 SVG kecil).

## Urutan & isi kolom tabel disesuaikan (2026-08-20)

- **Tab "SPK" (`adminSpkBelumSj.js`)** — kolom **SPK dipindah ke PALING KIRI** di kedua mode
  (dulu di tengah: Perusahaan/Kota Tujuan/**SPK**/Kirim/Aksi di mode aktif, No SJ/**SPK**/Tujuan/
  Status/Tanggal di mode riwayat). Cuma urutan kolom `<th>`/`<td>` yang ditukar, data & endpoint-
  nya tidak berubah sama sekali.
- **Tab "SJ" (`adminSuratJalan.js`)** — kolom **Tujuan dihapus dari tabel** (sekarang: No SJ,
  Klien, Dikirim, Status, Aksi). Datanya TIDAK hilang — dipindah jadi baris tersendiri di modal
  "Detail Surat Jalan" (`detailBodyHtml()`, section baru sebelum "Supir & Kendaraan"), sama pola
  dgn perampingan kolom sebelumnya (Supir/Kirim/Foto/dst) — konsisten dgn keputusan "tabel cuma
  info yang perlu dilihat sekilas, detail lengkap di modal".

## Filter tahun di tab "SJ" (2026-08-20)

Dropdown tahun, SEJAJAR kotak cari (satu baris, `components/tableToolbar.js` diperluas dgn opsi
`yearOptions`/`yearValue`/`onYearChange`, opt-in -- tab lain yg pakai toolbar yang sama, mis. SPK,
tidak ikut kena krn tidak passing opsi ini). Default = **tahun berjalan**, TIDAK ADA pilihan
"semua tahun" (2026-08-20, sengaja dicabut atas permintaan user -- selalu difilter ke 1 tahun
spesifik, tidak pernah nampilin gabungan semua tahun sekaligus).

- Pilihan tahun **BUKAN range hardcode** (mis. "3 tahun terakhir") -- diambil dari
  `GET /admin/sj/years` (`App\Support\SuratJalan::availableYears()`), query `SELECT DISTINCT
  YEAR(...)` ke data sungguhan. Alasan: `migrate_legacy_surat_jalan.php` mundur beberapa tahun
  (dicek langsung ke produksi 2026-08-20: ada baris 2024/2025/2026), jadi range hardcode gampang
  ketinggalan begitu ada migrasi data lama lagi ke depannya.
- Tahun berjalan **selalu ditambahkan ke daftar opsi di FE** (`adminSuratJalan.js`) kalau belum
  ada di response `/admin/sj/years` -- backend cuma balikin tahun yang BENERAN py baris datanya,
  jadi kalau belum ada SJ sama sekali di tahun berjalan (mis. baru ganti tahun, belum ada
  transaksi), defaultnya tidak boleh "hilang" dari dropdown gara-gara tidak ada di hasil query.
- Filter tahun jalan di `YEAR(COALESCE(sj.tgl_kirim, sj.created_at))`, BUKAN cuma `tgl_kirim` --
  kolom ini nullable (baris tanpa tanggal kirim tampil "-" di kolom "Dikirim"), kalau filter cuma
  ke `tgl_kirim` baris begini tidak akan pernah muncul di filter tahun MANAPUN. Fallback ke
  `created_at` (selalu terisi) memastikan tiap baris punya tepat 1 tahun yang cocok. Query param
  `tahun` di `GET /admin/sj` (`SuratJalan::list()`) pakai logika yang SAMA PERSIS.
- Server-side (bukan filter client thd 1 halaman yang sudah termuat) -- konsisten dgn pagination
  SJ yang sudah server-side duluan (lihat catatan di atas soal `migrate_legacy_surat_jalan.php`
  bikin tabel ini py ribuan baris).
- Route `GET /admin/sj/years` WAJIB didaftarkan SEBELUM `GET /admin/sj/{id}` di `bootstrap.php`
  (backend) -- segmen path sama-sama 1 kata (`/admin/sj/years` vs `/admin/sj/{id}`), kalau kebalik
  "years" ketangkep sbg nilai `{id}` (pola yang sama dgn `/admin/sj/new` di FE `main.js`).

## Routing & role guard

`main.js` mendaftarkan route lewat `registerRoute(path, render, { roles, public })`:

| Path | Halaman | Role |
|---|---|---|
| `#/login` | `login.js` | publik |
| `#/driver` | `driverDashboard.js` | `driver` |
| `#/driver/trip/:tripId` | `driverWorkflow.js` | `driver` |
| `#/admin` | `adminSuratJalan.js` | `admin` — **tab "SJ", halaman awal admin** setelah login (2026-08-23, dulu `adminSpkBelumSj.js`/tab "SPK" — dihapus, lihat "Penyederhanaan 2026-08-23") (juga home role-mismatch redirect, lihat di bawah) |
| `#/admin/ekspedisi` | `adminDashboard.js` | `admin` — tab "Ekspedisi" |
| `#/admin/ekspedisi/kelola` | `adminEkspedisiList.js` | `admin` — kelola master perusahaan ekspedisi eksternal |
| `#/admin/sj` | `adminSuratJalan.js` | `admin` — tab "SJ" |
| `#/admin/driver/new` | `adminNewDriver.js` | `admin` — **wajib didaftarkan sebelum** `:driverId` di bawah (lihat komentar `main.js`), kalau tidak `new` akan ketangkep sebagai `:driverId` |
| `#/admin/driver/:driverId` | `adminDriverDetail.js` | `admin` |
| `#/admin/driver/:driverId/trip/new` | `adminNewTrip.js` | `admin` |
| `#/admin/sj/new` | `adminNewSuratJalan.js` | `admin` — didaftarkan sebelum `/admin/sj` di `main.js`, mengikuti pola `driver/new` |

**Tab bar SJ/Ekspedisi** (`components/adminTabs.js`, 2026-08-23 — dulu 3 tab SPK/SJ/Ekspedisi,
lihat "Penyederhanaan 2026-08-23" di bawah) dipasang cuma di 2 halaman ROOT
(`adminSuratJalan.js`/`adminDashboard.js`) — tab tidak aktif abu-abu (`bg-slate-100 text-slate-500`),
tab aktif hijau (`bg-brand-600 text-white`). Navbar (`navbar.js`) di keduanya judulnya **konstan
"Ekspedisi"** (identitas app, bukan judul per-halaman) — tanpa tombol back, karena berpindah tab
bukan "kembali". Halaman drill-down (detail supir, tambah supir, perjalanan baru, buat SJ) TIDAK
pakai tab bar — itu tetap navbar biasa dengan judul spesifik + tombol back ke tab root asalnya.

## Penyederhanaan 2026-08-23: 2 tab, nomor SJ manual

Perubahan produk sekaligus, atas permintaan user:

1. **Tab "SPK" dihapus.** Sisi admin sekarang cuma 2 tab: **SJ** (halaman awal admin setelah
   login, dulu tab "SPK") & **Ekspedisi** (monitoring, tidak berubah). File `adminSpkBelumSj.js`
   & `prefill.js` (handoff `penjualan_id` dari tab SPK ke form Buat SJ, cuma dipakai tab itu)
   DIHAPUS dari `ekspedisi-apk`; endpoint `GET /admin/spk-belum-sj` &
   `AdminController::spkBelumSj()` DIHAPUS dari `backend-migrasi` (`App\Ekspedisi\Support\
   SpkReadyKirim::listBelumSj()` ikut dihapus, `find()` dipertahankan — masih dipakai
   `createTrip()` buat validasi `penjualan_id` opsional di form "Perjalanan Baru"). Admin sekarang
   bikin SJ langsung dari tombol "+ Buat SJ" di tab SJ (sudah ada sebelumnya), tidak lagi lewat
   drill-down dari daftar SPK ready-kirim.
2. **Nomor SJ diinput manual admin**, bukan lagi auto-generate dari id/tanggal
   (`SJ_YYYYMMDD_XXXX`) — supaya cocok nomor kertas SJ fisik yang sudah dicetak. Skema
   `ekspedisi_t_surat_jalan` dapat kolom baru `nomor_urut` (int unsigned, unique — awalnya file
   migrasi terpisah `04_nomor_sj_manual.sql`, sudah digabung ke `database/ekspedisi/01_schema.sql`
   sejak konsolidasi 2026-08-23, lihat README `backend-migrasi`) sbg **sumber kebenaran** angkanya; kolom lama
   `no_surat_jalan` (varchar) tetap ada utk kompatibilitas kontrak, tapi SEKARANG SELALU
   diturunkan dari `nomor_urut` (`'SJ_' . nomor_urut`) oleh `App\Ekspedisi\Support\SuratJalan::
   create()`/`update()` — admin cukup ketik angkanya (mis. "1234") di field baru "Nomor SJ" pada
   form Buat SJ (`adminNewSuratJalan.js`), backend validasi wajib+positif+unik sebelum insert
   (`SuratJalanController::store()`). Baris yang lahir dari checkpoint foto supir
   (`upsertFromTripPhoto()`) TIDAK LAGI auto-assign nomor — admin lengkapi belakangan lewat
   `PUT /admin/sj/{id}` (`nomor_urut` sekarang salah satu field yang bisa diedit di sana).
3. **Nomor yang terlewat ditandai baris merah.** Karena nomor sekarang manual, ada risiko admin
   lupa/lewat menginput 1 nomor kertas SJ. `App\Ekspedisi\Support\SuratJalan::listWithGaps()`
   (dipanggil `list()` kalau `q` kosong) menghitung nomor yang hilang di antara nomor
   terkecil-terbesar **dalam tahun yang difilter, lintas SEMUA status** (bukan cuma status view
   yang sedang ditampilkan — supaya nomor yang sebenarnya ADA tapi kebetulan beda status tidak
   salah ketandai "terlewat", lihat docblock method itu utk penjelasan lengkap) dan menyisipkan
   baris VIRTUAL (`missing: true`, TIDAK ADA di DB) di posisi yang pas secara berurutan. FE
   (`adminSuratJalan.js`) merender baris ini merah (`bg-status-alert/10`), tanpa aksi apa pun.
   Mode pencarian (`q` diisi) TIDAK ikut deteksi gap (`listSearch()`, SQL LIMIT/OFFSET biasa) —
   pencarian teks bebas tidak match konsep "rentang nomor berurutan". Sort tabel juga berubah
   dari `created_at DESC` jadi `nomor_urut DESC` (baris tanpa nomor di bawah) supaya nomor yang
   hilang kelihatan berurutan di antara tetangganya.
4. **Aturan baru: 1 SJ boleh lintas SPK, TAPI cuma kalau semua dari klien/perusahaan yang sama.**
   `App\Ekspedisi\Support\PenjualanItemLookup` (JOIN baru ke `t_penjualan_header`+`m_client`)
   sekarang bawa `client_id`/`client_nama` di tiap lini produk. `GET /admin/sj/spk/{penjualan_id}
   /items` berubah bentuk dari array polos jadi `{ client_id, client_nama, lines }`.
   `adminNewSuratJalan.js` cek `client_id` tiap SPK yang ditambahkan cocok dgn SPK pertama sebelum
   diizinkan masuk grup (feedback cepat); `SuratJalanController::store()` validasi ULANG di
   server (menolak 422 kalau item yang disentuh berasal dari >1 `client_id` berbeda) — FE cuma
   feedback, bukan satu-satunya penjaga.
5. **Kolom Status dicopot dari tabel SJ, tombol "Detail" diganti dobel klik baris.** Karena mode
   "aktif" sekarang murni "belum tervalidasi" (`belum_tervalidasi=1`, lihat poin di atas) dan mode
   "riwayat" murni "tervalidasi" (`status=tervalidasi`, tidak berubah), kolom Status di tabel jadi
   redundan — dicopot (tetap ada di modal "Detail Surat Jalan"). Tombol "Detail" di kolom Aksi
   dihapus, digantikan `dblclick` pada `<tr>` (kursor pointer + `title` hint) yang membuka modal
   yang sama; tombol "Validasi" (kalau ada) `stopPropagation()` supaya kliknya tidak ikut
   kehitung dobel klik baris.

Migrasi skema aslinya file terpisah (murni ADD COLUMN + UNIQUE INDEX, tidak menyentuh baris yang
sudah ada), **sudah digabung ke `database/ekspedisi/01_schema.sql`** ("Konsolidasi Keempat",
2026-08-23 — lihat README `backend-migrasi`) setelah dikonfirmasi jalan di produksi, supaya
fresh install baru (mis. deploy ke shared hosting) cukup 1 file skema. 1.508 baris
`migrasi_legacy` & sebagian besar baris `native` lama otomatis `nomor_urut IS NULL` sampai admin
melengkapinya manual lewat `PUT /admin/sj/{id}` kalau perlu (tidak wajib, cuma baris BARU yang
wajib punya nomor sejak perubahan ini).

`router.js` redirect ke `#/login` kalau belum `isAuthenticated()`, dan redirect ke home
role masing-masing (`#/admin` atau `#/driver`) kalau role tidak cocok dengan `roles` route
yang dituju. `isAuthenticated()` cuma cek ADA-tidaknya token tersimpan di localStorage —
tidak memverifikasi token itu masih valid di server (token bisa saja sudah di-revoke/expired).
Token yang sudah tidak valid baru ketahuan saat request pertama gagal 401 (lihat catatan
`api.js` di atas), yang otomatis memaksa logout + redirect ke `#/login`.

## Tracking lokasi

`geo.js`: `watchPosition` jalan terus-menerus di device (update `lastPosition` di memori),
tapi **kirim ke server cuma tiap `LOCATION_PING_INTERVAL_MS`** (default 30 detik) lewat
`setInterval` terpisah — bukan tiap event `watchPosition`, supaya hemat baterai & kuota.
`startTracking()`/`stopTracking()` dipanggil otomatis mengikuti toggle status di
`driverDashboard.js` (online → start, resting/offline → stop) dan dari `navbar.js` saat
logout.

**Belum ada tracking saat app di-background/minimize** — `watchPosition` browser/Cordova
standar berhenti begitu WebView tidak aktif. Untuk itu butuh plugin tambahan
(`cordova-plugin-background-geolocation`, biasanya berbayar/perlu lisensi) — di luar scope
saat ini.

## Checkpoint foto (`driverWorkflow.js`)

Step wizard linear, 3 tahap tetap: `berangkat` → `serah_terima` → `sj`. Tiap tahap: ambil
foto (`camera.js`) → ambil posisi GPS sesaat (`geo.getCurrentPosition()`, gagal-pun tetap
lanjut upload dengan `lat`/`lng` kosong) → upload multipart. Begitu step ke-3 selesai,
otomatis panggil `POST /driver/trip/:id/complete` dan kembali ke dashboard.

`camera.js`: pakai `navigator.camera` (plugin Cordova) kalau tersedia; kalau tidak
(development di browser), fallback ke `<input type="file" capture="environment">`. Kedua
jalur resolve ke `Blob` dengan interface yang sama, jadi kode pemanggilnya tidak perlu tahu
bedanya.

## Build ke Android/iOS

`platforms/` belum pernah digenerate di repo ini — jalankan `cordova platform add` dulu:

```bash
npm install -g cordova     # kalau CLI belum ada
cordova platform add android
# cordova platform add ios   # butuh macOS + Xcode

npm run cordova:android    # = npm run build (vite) lalu cordova run android
npm run cordova:ios
```

Vite build (`npm run build`) menulis langsung ke `www/` (lihat `vite.config.js`), yang lalu
disalin `cordova prepare`/`run` ke project native. Tag `<script src="cordova.js">` di
`src/index.html` **jangan dihapus** meski file-nya belum ada saat development di browser —
Cordova CLI menyuntikkan file itu otomatis saat build.

**Permission native** (dari `config.xml`): `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`,
`CAMERA`, `INTERNET` (Android); `NSLocationWhenInUseUsageDescription`,
`NSCameraUsageDescription` (iOS). `minSdkVersion` 24, orientasi dikunci portrait,
`usesCleartextTraffic` diaktifkan (perlu kalau `API_BASE_URL` masih http, bukan https, saat
development).

Sebelum rilis sungguhan, ganti placeholder di `config.xml`: `id="com.koperindo.ekspedisi"`
dan `<author email="dev@example.com">` masih nilai default template.

### Dua bug build Android yang sudah pernah kejadian & sudah di-fix (2026-08-20)

`platforms/android` sudah pernah digenerate di mesin dev ini (`cordova-android@15.1.0`, CLI
global 13.0.0). `cordova build android` sempat gagal total dua kali berturut-turut, root cause-nya
beda-beda, keduanya sekarang sudah ditangani otomatis:

1. **`Could not load API for android project .../cordova/Api.js`** -- pesan generik ini
   nyembunyiin error aslinya (`ReferenceError: module is not defined in ES module scope`, cuma
   kelihatan kalau pakai `cordova build android --verbose`). Penyebab: `package.json` project ini
   sengaja `"type": "module"` (dipakai `vite.config.js`/`postcss.config.js`/`tailwind.config.js`
   yang pakai `import`/`export` tanpa ekstensi `.mjs`), tapi file-file platform Cordova
   (`platforms/*/cordova/*.js`, mis. `Api.js`) SELALU CommonJS (`module.exports`) dan tidak punya
   `package.json` sendiri buat nge-override -- jadi Node ikut nganggep mereka ES module juga
   (Node cari `package.json` terdekat ke ATAS dari lokasi file yang di-`require`).
   Fix: `fix-platform-type.cjs` (root project) nulis `{"type": "commonjs"}` ke
   `platforms/<platform>/package.json` tiap platform yang ada. **`platforms/` di-gitignore &
   digenerate ulang tiap `cordova platform add`**, jadi fix ini WAJIB dijalankan ulang tiap kali --
   makanya sudah dipasang otomatis di depan `npm run cordova:prepare` / `cordova:android` /
   `cordova:ios` (lihat `package.json`). Kalau pernah jalanin `cordova` langsung (bukan lewat
   script npm di atas) dan ketemu error yang sama, jalankan manual: `npm run fix:platforms`.

2. **`ParseError ... AttributePrefixUnbound?application&android:usesCleartextTraffic&android`**
   saat task Gradle `:app:mergeDebugResources` -- Cordova nyalin SELURUH isi `config.xml`
   (termasuk elemen `<edit-config>`/`<config-file>` yang isinya pakai atribut ber-prefix
   `android:`, lihat baris `usesCleartextTraffic` & `uses-permission` di bagian platform android
   atas) mentah-mentah ke `platforms/android/app/src/main/res/xml/config.xml` -- padahal
   `<widget>` root di `config.xml` project ini nggak pernah deklarasi namespace `android:`
   (cuma ada `xmlns:cdv`), jadi compiler resource Android (aapt2, strict/namespace-aware) nolak
   filenya. Fix: tambahin `xmlns:android="http://schemas.android.com/apk/res/android"` di elemen
   `<widget>` root `config.xml` (sudah dipasang). Fix ini permanen (bukan di `platforms/` yang
   digenerate ulang) -- kalau ketemu error serupa lagi setelah nambah `android:...` attribute baru
   di `config.xml`, cek dulu namespace-nya sudah dideklarasi apa belum, jangan curiga ke tempat
   lain dulu.

Verifikasi: `cordova build android` sukses penuh (`BUILD SUCCESSFUL`), APK debug ada di
`platforms/android/app/build/outputs/apk/debug/app-debug.apk`.

## Icon dan splashscreen app (2026-08-20, splashscreen diperbaiki lagi 2026-08-21)

Sebelumnya app ini masih pakai icon/splashscreen DEFAULT Cordova (burung/robot generik) --
diganti pakai logo asli perusahaan (`public/logo_koperindo.jpeg`, "Koper Indonesia", sudah
dipakai juga di navbar app). Sumber icon/splash disimpan di `resources/` (root project, BUKAN
di-gitignore, beda dari `platforms/`/`www/` -- source ini harus ikut ter-commit krn tidak bisa
di-generate ulang otomatis dari `public/logo_koperindo.jpeg` tanpa proses manual di bawah):

- `resources/icon.png` -- source icon FLAT (persegi, logo apa adanya, dengan background
  gradient abu-abu muda melingkar sudah menyatu di dalam file). Sekarang JUGA dipakai sebagai
  source splashscreen icon (lihat bawah), bukan cuma app icon.
- `resources/splash.png` -- source splashscreen versi LAMA (kanvas putih 2000x2000, fit-cover
  per-density) -- SUDAH TIDAK DIPAKAI sejak 2026-08-21, lihat root cause di bawah. Dibiarkan ada
  cuma buat referensi historis, jangan bingung kalau lihat file ini masih ada.
- `resources/android/icon-foreground.png` -- percobaan adaptive-icon (lihat catatan di bawah,
  TIDAK terpakai efektif, disimpan buat referensi kalau nanti dicoba lagi).

### Root cause splashscreen sempat tetap default Cordova walau `<splash>` sudah diisi (2026-08-21)

`config.xml` sempat berisi tag `<splash density="port-*" src="resources/android/splash/..." />`
(generated dari `resources/splash.png` lewat `cordova-res --type splash`) dan file-nya memang
BENAR ada di dalam APK jadi (`res/drawable-port-xxxhdpi-v4/splash.png` dkk) -- tapi splashscreen
yang tampil di HP tetap logo Cordova default. Root cause: **`cordova-android` versi project ini
(`^15.1.0`) sudah TIDAK MEMBACA tag `<splash>` sama sekali** -- sejak cordova-android 12, splash
screen Android dikontrol lewat Android 12 SplashScreen API (AndroidX Core SplashScreen), bukan
lagi lewat drawable per-density seperti dulu. `cordova-android/lib/prepare.js` bahkan eksplisit
emit warning "The `<splash>` tags were detected and are no longer supported" tiap `cordova
prepare` -- tapi warning ini gampang kelewat/gak keliatan pas `cordova build` biasa. Verifikasi
sebelumnya (2026-08-20, di bawah) SALAH SASARAN: yang dicek cuma "file splash.png ada di APK",
padahal file itu orphan/tidak pernah direferensikan theme manapun -- yang beneran dipakai adalah
`res/values/cdv_themes.xml` (`Theme.App.SplashScreen`) dan `res/drawable*/ic_cdv_splashscreen.*`,
yang waktu itu masih persis default cordova-android (diverifikasi lewat `diff` byte-for-byte).

Perbaikan: tag `<splash>` dihapus dari `config.xml`, diganti preference baru (lihat juga contoh
yang sama di `absensi-v2`/`purchase-finance-apk`, sama-sama `cordova-android` v14/v15):

```xml
<preference name="AndroidWindowSplashScreenAnimatedIcon" value="resources/icon.png" />
<preference name="AndroidWindowSplashScreenBackground" value="#FFFFFF" />
```

`resources/android/splash/` (output `cordova-res --type splash` yang lama) sudah dihapus dari
repo karena jadi dead file -- generated output, bukan source, dan sudah tidak dipakai jalur mana
pun. Kalau suatu saat perlu lagi (mis. downgrade cordova-android ke versi lama yang masih pakai
`<splash>`), regenerate dari `resources/splash.png` pakai command `cordova-res` yang masih
didokumentasikan di bawah.

Verifikasi hasil akhir (2026-08-21), JANGAN cuma percaya log `cordova build`, cek APK jadi:

```bash
aapt2 dump resources platforms/android/app/build/outputs/apk/debug/app-debug.apk \
  | grep -A5 'style/Theme.App.SplashScreen'
# windowSplashScreenBackground harus #ffffffff, windowSplashScreenAnimatedIcon @drawable/ic_cdv_splashscreen
unzip -p platforms/android/app/build/outputs/apk/debug/app-debug.apk \
  res/drawable-nodpi-v4/ic_cdv_splashscreen.png | md5sum
md5sum resources/icon.png   # harus SAMA -- berarti logo Koperindo, bukan vektor default cordova
```

Regenerasi (kalau logo perusahaan berubah lagi ke depannya):

```bash
npx cordova-res android --type icon --icon-source resources/icon.png --android-project platforms/android --copy
npx cordova-res android --type splash --splash-source resources/splash.png --fit cover --android-project platforms/android --copy
```

**WAJIB pakai `--android-project platforms/android`** -- tanpa flag ini, `cordova-res` (versi
0.15.4) salah nebak default folder project jadi `./android` (bikin folder baru salah tempat di
root repo, bukan `platforms/android` yang sungguhan dipakai Cordova) -- kejadian nyata pas
ngerjain ini pertama kali, sempat bikin folder `android/` nyasar yang harus dihapus manual.

**Adaptive icon (mipmap-\*-v26, mask bulat/squircle Android 8+) SENGAJA tidak dipakai** --
`cordova-res` bisa generate file-nya (`--type adaptive-icon`), dan sempat berhasil ditaruh manual
ke `platforms/android/app/src/main/res/mipmap-*-v26/`, TAPI cordova-android 15.1.0 di project ini
selalu menghapusnya lagi setiap `cordova prepare`/`build` (atribut `background`/`foreground` pada
elemen `<icon>` di `config.xml` adalah ekstensi milik `cordova-res`, BUKAN atribut config.xml
standar yang cordova-android versi ini proses/pertahankan -- root cause pasti, sudah diverifikasi
lewat isi APK jadi, bukan dugaan). Icon FLAT (`mipmap-*/ic_launcher.png`, jalur `<icon
density=.. src=..>` yang standar) sudah benar dan terverifikasi masuk ke APK final -- itu yang
tampil di launcher manapun; adaptive cuma nambah efek masking/parallax kosmetik, bukan sesuatu
yang esensial buat app internal seperti ini. Kalau nanti mau dicoba lagi (mis. setelah upgrade
`cordova-android`/`cordova-res`), source foreground sudah tersedia di
`resources/android/icon-foreground.png` (logo dengan padding transparan di sekitarnya, supaya
aman dari safe-zone masking) -- tinggal generate ulang dengan:

```bash
npx cordova-res android --type adaptive-icon --icon-foreground-source resources/android/icon-foreground.png --icon-background-source '#FFFFFF' --android-project platforms/android --copy
```

lalu verifikasi isi APK jadi (`unzip -l app-debug.apk | grep mipmap.*v26`) sebelum percaya itu
benar-benar kepakai -- JANGAN cuma percaya log `cordova-res` ("Copied N resource items"), log itu
tidak mendeteksi kalau `cordova prepare` diam-diam menghapusnya lagi setelahnya.

Verifikasi hasil akhir (2026-08-20): extract `res/mipmap-xxxhdpi-v4/ic_launcher.png` langsung
dari `app-debug.apk` jadi, dicek visual -- logo Koper Indonesia yang benar, bukan default Cordova
lagi. (Catatan koreksi 2026-08-21: verifikasi splash `res/drawable-port-xxxhdpi-v4/splash.png` di
sesi ini KELIRU -- file itu ada di APK tapi ternyata orphan/tidak pernah dipakai runtime; root
cause dan perbaikan yang benar ada di bagian "Root cause splashscreen..." di atas.)

## Format nomor SPK (2026-08-20)

`src/js/format.js` (`formatSpkNo()`) -- konversi `penjualan_id` asli (identifier backend, format
`INV_{no_spk berpadding 0}` + opsional `-{urutan}` kalau order dipecah jadi beberapa baris
performa, mis. `INV_01811-2`) jadi label ringkas `SPK-{no_spk tanpa leading zero}{-urutan kalau
ada}` (mis. `SPK-1811-2`) buat SEMUA tampilan nomor SPK di app ini: tab "SPK" (kedua mode, dulu
mode aktif malah pakai `no_spk` mentah dari `t_penjualan_header` -- field beda, kehilangan info
urutan pemecahan order), modal "Detail Surat Jalan" (`adminSuratJalan.js`), riwayat perjalanan
supir (`adminDriverDetail.js`), dan judul grup di form "Buat Surat Jalan" (`adminNewSuratJalan.js`).
`penjualan_id` ASLI (bukan hasil format ini)
tetap yang dikirim ke backend di semua request/lookup (`items[].penjualan_id`, `POST
/admin/drivers/{driver}/trip`, dst) -- ini MURNI transformasi tampilan, bukan identifier baru.
Field input "Nomor SPK" (`adminNewSuratJalan.js`, dipakai admin ketik/cari sebelum "+ Tambah")
SENGAJA tidak ikut diformat -- itu tetap harus diisi `penjualan_id` asli (placeholder `Contoh:
INV_01701-5`) krn itu yang dikirim ke `GET /admin/sj/spk/{penjualan_id}/items`. Kalau polanya
tidak dikenali (bukan `INV_...`), `formatSpkNo()` fallback tampilkan apa adanya (tidak menelan
data yang polanya beda).

## Popup gambar / lightbox (2026-08-20)

`components/lightbox.js` — overlay gelap penuh layar + gambar di tengah (`object-contain`),
ditutup klik di mana pun/tombol X/Esc. Beda dari `components/modal.js` (panel putih, ada
judul/konten terstruktur) — lightbox murni gambar, tanpa chrome. Dipasang via **1 delegated
click listener** di `document` (`initLightboxDelegation()`, dipanggil sekali di `main.js`
`bootstrap()`) utk **SEMUA** `<img data-lightbox>` di app ini — checkpoint foto (riwayat supir,
`adminDriverDetail.js`), foto SJ/validasi (modal "Detail Surat Jalan", `adminSuratJalan.js`), dan
preview foto yang baru diambil supir (`driverWorkflow.js`, sebelum lanjut ke checkpoint
berikutnya). Sengaja delegated (bukan bind manual per elemen) — otomatis jalan juga utk `<img>`
yang baru ditambah belakangan (mis. isi modal yang dirender ulang tiap dibuka), tidak perlu
wiring tambahan di tiap halaman selain nempel atribut `data-lightbox` + kelas `cursor-zoom-in`.
Logo login (`login.js`) SENGAJA tidak ikut — itu branding/chrome, bukan foto/dokumen yang perlu
di-zoom. Sebelumnya thumbnail-thumbnail ini dibungkus `<a target="_blank">` (buka tab baru) —
diganti lightbox in-app supaya tidak keluar dari konteks app (penting terutama di WebView
Cordova, "tab baru" di sana pengalamannya kurang mulus).

## Penyimpanan & format foto upload (2026-08-20)

Semua foto yang diupload dari app ini (checkpoint trip, foto SJ/validasi) sekarang dikonversi ke
**WEBP** di sisi backend sebelum disimpan (`App\Support\PhotoStorage::save()`, lihat README
`backend-migrasi`) — tidak ada perubahan di sisi frontend utk ini (`camera.js`/`api.js`
tetap kirim blob foto asli apa adanya, konversi murni tanggung jawab server). Foto tersimpan di
folder **per konteks masing-masing** di server (`public/uploads/trips/{trip_id}/` utk checkpoint
supir, `public/uploads/sj/{id}/` utk foto SJ) — bukan folder baru, konvensi ini sudah ada
sebelumnya, yang berubah cuma nama filenya: sekarang dinamai sesuai SLOT/perannya
(`berangkat.webp`, `serah_terima.webp`, `sj.webp`, `bukti.webp`, `validasi.webp`) alih-alih
timestamp, jadi re-upload ke slot yang sama TIMPA file lama, tidak numpuk sampah. Frontend tidak
perlu tahu ekstensi filenya apa — selalu pakai `path`/URL yang dibalikin backend apa adanya
(`fotoUrl()` di `adminSuratJalan.js`, `p.url` di `adminDriverDetail.js`), jadi perubahan ekstensi
ini otomatis kompatibel tanpa perlu sentuh kode tampilannya.

## Notifikasi "SPK baru" di tab SPK (2026-08-20)

`adminSpkBelumSj.js` polling `GET /admin/spk-belum-sj` tiap 20 detik (`NEW_DATA_POLL_MS`, mirip
pola auto-refresh 15 detik yang sudah ada di `adminDashboard.js`) — **independen** dari
page/query/mode yang sedang ditampilkan user (per_page besar sendiri, 100, biar 1x ambil cukup
mewakili semua SPK "belum ada SJ" yg ada). Baseline (`penjualan_id` yang sudah pernah kelihatan)
diambil sekali di awal, TIDAK memicu notifikasi — cuma `penjualan_id` yang muncul SETELAH
baseline yang dianggap "baru". Begitu ketemu, banner amber muncul di `$bannerSlot` (dipasang
sengaja di LUAR `$main`, supaya tidak ikut kehapus tiap `render()` bikin ulang isi `$main` pas
search/toggle/refresh) — "`<jumlah>` SPK baru siap dikirim, belum ada SJ." + tombol **"Muat
Ulang"** yang reset ke mode aktif halaman 1 sekaligus bersihkan banner. Timer polling dibersihkan
saat pindah halaman lewat listener `hashchange` sekali-pakai (pola sama persis dgn cleanup
auto-refresh `adminDashboard.js`). Ini **notifikasi in-app saja** — tidak ada push notification
(app harus terbuka di tab SPK/sedang jalan di background tab browser/WebView utk polling-nya
jalan), sesuai lingkup "notifikasi sederhana" yang diminta; push notification sungguhan (mis.
lewat FCM, buat notifikasi walau app tertutup) tetap tercatat sbg belum ada di bagian "Yang belum
ada" di bawah.

## Header tabel rata tengah (2026-08-20)

Semua `<th>` di kedua tabel (`adminSpkBelumSj.js`/`adminSuratJalan.js`) diganti dari `text-left`
jadi `text-center` — CUMA header, isi baris (`<td>`) TIDAK ikut berubah (tetap rata kiri, kolom
"Aksi" tetap rata kanan). Class `py-2` (tanpa `.5`) dipakai sbg penanda buat bedain `<th>` dari
`<td>` (`py-2.5`) saat replace massal, supaya body tabel tidak ikut kesenggol.

## Dokumen supir: foto KTP/SIM/STNK (2026-08-20)

Form "Tambah Supir" (`adminNewDriver.js`) sekarang minta foto dokumen, WAJIB sebelum submit —
**SIM** utk SEMUA supir (internal maupun eksternal), **+ KTP & STNK** tambahan kalau tipe-nya
eksternal (bukan pegawai, tidak ada identitas/aset kendaraan perusahaan yang sudah terverifikasi
kayak supir internal). Tiap field dokumen dirender lewat `renderPhotoField()` (helper baru di
file yang sama) — tombol "Ambil Foto" manggil `takePhoto()` (kamera native/fallback, SAMA persis
dgn checkpoint foto supir & foto SJ), begitu berhasil tampil thumbnail preview (`data-lightbox`,
bisa di-zoom sebelum submit) + tombol berubah jadi "Ganti Foto". Blob-nya ditahan di closure
sampai form displit `submit` — **belum ada file dipilih = submit diblokir** duluan di sisi client
(cek `getBlob()` tiap field wajib sesuai tipe) sebelum sempat hit API, dobel-dicek lagi di server
(`POST /admin/drivers`, 422 kalau ada yang belum lengkap).

Karena field-nya sekarang CAMPURAN teks (`username`/`nama`/dst) & file (Blob), request-nya
otomatis jadi multipart — `api.postMultipart()` (baru, `api.js`) generik utk kasus ini, beda dari
`api.uploadFile()` yang lama (asumsi cuma 1 field file bernama tetap `'photo'`).

**Gap yang sengaja ditutup:** profil supir INTERNAL bisa ke-provision OTOMATIS saat login pertama
(`SupirProfile::ensure()` di backend, dipanggil dari alur login) — **tanpa pernah lewat form
"Tambah Supir" sama sekali**, jadi tidak ada titik mana pun dokumennya kesimpan. Halaman **Detail
Supir** (`adminDriverDetail.js`) sekarang punya card "Dokumen" — SIM selalu tampil (semua tipe),
KTP+STNK cuma kalau `tipe === 'eksternal'`. Tiap slot: kalau `foto_*` dari `GET
/admin/drivers/:id` sudah terisi, tampilkan thumbnail (`data-lightbox`); kalau masih `null`,
tombol **"Upload Foto"** yang langsung ambil+kirim foto begitu diklik (`POST
/admin/drivers/:id/documents`, beda dari form Tambah Supir yang nunda kirim sampai submit —
di sini drivernya SUDAH ADA, jadi upload langsung per-slot, mirip pola tombol "Validasi" SJ).

## Cek versi app (2026-08-20)

Pola yang SAMA dipakai app lain di workspace ini (`absensi-apk`, `finance-apk`, `admin-finance-apk`)
— app polling backend tiap 30 detik nanya "versi saya masih boleh dipakai?", kalau tidak ->
alert pesan dari server + paksa logout. `config_id` yang dipakai: **`VERSION_EKSPEDISI_PUSAT`**
(lihat README `backend-migrasi` bagian "Cek versi app" utk detail backend & skema tabel
`config`-nya).

**`src/js/versionCheck.js`** (`initVersionCheck()`, dipanggil sekali di `bootstrap()` `main.js`,
BUKAN per-halaman kayak timer lain di app ini — jalan terus APA PUN halaman yang lagi dibuka) —
`$.ajax` POST `/config/check-version` tiap 30 detik, body `{ current_version_code:
CURRENT_APP_VERSION_CODE }`. Kalau respons `is_valid: false`: `alert(config.config_keterangan)`
lalu `logout()` + `navigate('/login')`, timer di-`clearInterval` PERMANEN (tidak perlu cek lagi
setelah user sudah dipaksa keluar). Gagal hubungi endpoint (offline/timeout) diam-diam diabaikan
di siklus itu — SENGAJA tidak disamakan dgn "versi tidak valid", supaya masalah jaringan tidak
memaksa logout orang yang justru butuh app-nya tetap jalan (mis. supir di lapangan, sinyal lemah).
**Dilewati total kalau `MOCK_MODE: true`** (tidak ada backend nyata utk ditanya).

**`src/js/app-version.js`** — **[AUTO-GENERATE, JANGAN diedit manual]** — `export const
CURRENT_APP_VERSION_CODE`/`CURRENT_APP_VERSION_STRING`, ditulis ulang oleh **`bump-version.cjs`**
(root repo, `.cjs` SENGAJA bukan `.js` — `package.json` app ini `"type": "module"`, `require()`
polos di file `.js` bakal gagal). Jalankan lewat:
```bash
npm run version:patch    # 1.0.0 -> 1.0.1, android-versionCode naik 1
npm run version:minor    # 1.0.0 -> 1.1.0
npm run version:major    # 1.0.0 -> 2.0.0
npm run version:custom -- 1.2.3   # set versi spesifik
```
Sekali jalan, update **3 file sekaligus** supaya konsisten: `config.xml` (`version`,
`android-versionCode`, `ios-CFBundleVersion`), `package.json` (`version`), dan
`src/js/app-version.js`. **TIDAK push otomatis ke server** — nilai `config_value_minimal` di
tabel `config` (`config_id='VERSION_EKSPEDISI_PUSAT'`) HARUS diupdate manual terpisah (lewat SQL
langsung, lihat README backend) kalau rilis itu memang wajib dipakai (baik cuma direkomendasikan,
tanpa update DB versi lama tetap `is_valid: true` selamanya).

Beda dari `bump-version.js` versi `finance-apk` (Cordova `<script>` tag polos, `var` global) --
app ini Vite/ESM, `app-version.js` di sini pakai `export const` biasa, di-`import` langsung oleh
`versionCheck.js` & ikut di-bundle Vite (bukan ditaruh manual sbg `<script>` di `index.html`).

Adaptasi dari pola LAMA yang dipakai `absensi-apk` (`AbsenController::checkInternetAbsen()`,
exact-match `config_value_string`, digabung sama urusan lain kayak ijin/last_login) —
`backend-migrasi` ikut konvensi TERBARU yang dipakai `finance-apk`/`admin-finance-apk`
(`API\Config\VersionController` di `backend-production`): `current_version_code` **integer**
(Android versionCode) dibandingkan `>=` ke `config_value_minimal`, bukan exact-match string --
lebih fleksibel, admin bisa naikkan syarat minimal tanpa perlu tahu persis versi apa yang beredar
di device masing-masing.

## Yang belum ada (di luar scope prototype ini)

- Tracking lokasi saat app di-background/minimize.
- Push notification (mis. notifikasi perjalanan baru ke supir).
- Manajemen supir dari sisi admin baru sebatas **tambah** (`adminNewDriver.js`) — belum ada
  edit/nonaktifkan/hapus profil supir dari app (harus manual lewat DB kalau perlu).
- **Supir eksternal tidak bisa login ke app ini sama sekali** (tidak ada akun) — jadi checkpoint
  foto (`berangkat`/`serah_terima`/`sj`) tidak relevan utk trip tipe ini. **Sudah ada jalan
  keluarnya (2026-08-19):** tombol "Tandai Selesai" di `adminDriverDetail.js`, tampil khusus
  utk trip aktif milik supir eksternal, panggil `POST /admin/trips/:id/complete` — detail
  keputusan (kenapa ditolak utk supir internal) ada di README `backend-migrasi`.
- **Pengajuan biaya ke finance** — backend (`POST`/`GET /admin/trips/{trip}/pengajuan-biaya`)
  sudah siap, tapi belum ada form/tombol di `ekspedisi-apk` utk memakainya, dan belum ada
  approve/reject dari sisi finance sama sekali (siapa berperan sebagai finance juga belum
  diputuskan). Detail lengkap ada di README `backend-migrasi`.
- Export laporan (Excel/PDF) riwayat perjalanan.
- Ikon & splash screen aplikasi (`public/` isinya baru `logo_koperindo.jpeg` buat halaman
  login, belum ada app icon/splash Cordova sungguhan — itu nanti masuk `res/` terpisah,
  konvensi Cordova, lihat catatan di bagian Tema di atas).
