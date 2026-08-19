# Ekspedisi (ekspedisi-apk)

_(dulu bernama "Tracking Supir" / `driver-apk` — sedang berkembang jadi aplikasi ekspedisi yang
lebih luas: supir internal & eksternal, plotting SPK, rencana modul surat jalan menyusul. Lihat
README [`ekspedisi-apk-backend`](../ekspedisi-apk-backend) bagian "Riwayat nama" untuk detail.)_

Aplikasi mobile (Cordova) untuk tracking supir pengiriman: satu app dengan dua role —
**supir** (toggle status online/istirahat/offline, kirim lokasi berkala, isi 3 checkpoint
foto per perjalanan) dan **admin/dispatcher** (peta live semua supir + riwayat perjalanan
per supir).

**Status: prototype/demo.** `platforms/` belum pernah di-generate (`cordova platform add`
belum dijalankan), dan secara default app jalan dalam **mode mock** (`MOCK_MODE: true` di
`src/js/config.js`) — semua data dummy, disimpan di memori, hilang tiap refresh. Backend
nyata untuk app ini ada di [`../ekspedisi-apk-backend`](../ekspedisi-apk-backend) (project Slim 4
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
├── tailwind.config.js      # palet warna: brand (teal), route (orange CTA), status (dot supir)
├── res/public/             # disalin apa adanya ke www/ oleh Vite (kosong saat ini — belum ada ikon/splash)
└── src/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── main.js          # entry point: registrasi route + bootstrap (deviceready vs DOMContentLoaded)
        ├── router.js         # hash router custom: dynamic segment `:param`, guard `roles`/`public`
        ├── config.js          # APP_CONFIG — MOCK_MODE, AUTO_LOGIN_ROLE, API_BASE_URL, dst
        ├── auth.js            # login (1 request -> token), session { token, role, user } di localStorage
        ├── api.js             # wrapper $.ajax (JSON) + uploadFile (multipart), auto-logout on 401
        ├── mock.js            # backend palsu in-memory, dipakai saat MOCK_MODE: true
        ├── geo.js             # watchPosition + ping lokasi berkala ke server
        ├── camera.js          # ambil foto: cordova-plugin-camera, fallback <input capture> di browser
        ├── components/
        │   ├── navbar.js       # header + tombol back/logout, dipakai tiap halaman
        │   └── loader.js       # spinner, page loader, setButtonLoading()
        └── pages/
            ├── login.js
            ├── driverDashboard.js     # status toggle + daftar perjalanan aktif
            ├── driverWorkflow.js      # step wizard 3 checkpoint foto per perjalanan
            ├── adminDashboard.js      # peta live (Leaflet) + list status, auto-refresh 15 detik
            ├── adminDriverDetail.js   # riwayat perjalanan & thumbnail foto per supir
            ├── adminNewTrip.js         # admin bikin perjalanan baru untuk supir tertentu
            ├── adminNewDriver.js       # admin tambah supir baru -- toggle internal (username pegawai) / eksternal (nama+telepon, opsional ekspedisi)
            ├── adminSpkKirim.js        # daftar SPK siap kirim (t_penjualan_header) + plot ke supir
            ├── adminSuratJalan.js      # daftar surat jalan (modul ekspedisi_t_surat_jalan, skema sendiri)
            └── adminNewSuratJalan.js   # bikin surat jalan manual, tidak terikat trip
```

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
[`ekspedisi-apk-backend`](../ekspedisi-apk-backend)) — ganti kalau backend jalan di host/port
lain. **Tanpa suffix `/api`** — beda dari `backend-production`, route Slim di
`ekspedisi-apk-backend` tidak pakai prefix itu (`/login`, `/driver/me`, dst langsung dari root).

Auth-nya **token Bearer (JWT), bukan cookie/session** — beda dari kebanyakan app lain di
workspace ini yang pakai `backend-production` (session-based, butuh
`withCredentials`+CORS-credentials khusus). Login cuma **1 request**: `POST /login` balikin
`{ token, role, user }` langsung (lihat `auth.js`), token disimpan di localStorage lalu
dikirim manual lewat header `Authorization: Bearer <token>` di tiap request selanjutnya
(`api.js`). Tidak perlu konfigurasi CORS khusus di sisi backend — `ekspedisi-apk-backend`
sudah mengizinkan semua origin tanpa kredensial (lihat CORS middleware-nya) karena tidak
ada cookie yang dikirim lintas-origin.

`ekspedisi-apk-backend` login pakai akun pegawai yang sudah ada (`shared_m_users`, database
produksi yang sama dipakai `backend-production`) — supir/admin tidak perlu akun baru khusus
app ini, tapi role admin baru aktif kalau `user_id`-nya sudah di-seed ke
`ekspedisi_m_admin_access` (lihat README backend-nya).

## Kontrak API

Sumber kebenaran endpoint & bentuk data adalah `src/js/mock.js` (dibuat mengikuti apa yang
benar-benar dipanggil `api.js`/pages), dan cocok persis dengan
[`ekspedisi-apk-backend`](../ekspedisi-apk-backend) yang sekarang jadi backend resminya.

| Method | Endpoint | Dipanggil dari | Request | Response |
|---|---|---|---|---|
| POST | `/login` | `auth.js login()` | `{ username, password }` (JSON) | `{ token, role, user: { id, name } }` |
| POST | `/logout` | `auth.js logout()` | header `Authorization: Bearer <token>` | fire-and-forget, tidak ditunggu |
| GET | `/driver/me` | `driverDashboard.js` | — | `{ id, name, status, active_trips: [{ id, destination, current_step_label, ... }] }` |
| POST | `/driver/status` | `driverDashboard.js` | `{ status: 'online'\|'resting'\|'offline' }` | `{ status }` |
| POST | `/driver/location` | `geo.js` (tiap 30 detik saat status online) | `{ lat, lng, speed, heading, accuracy, recorded_at }` | — |
| GET | `/driver/trip/:id` | `driverWorkflow.js` | — | `{ id, destination, completed_steps: ['berangkat', ...] }` |
| POST | `/driver/trip/:id/photo` | `driverWorkflow.js` (via `api.uploadFile`) | multipart: `photo` (file), `type` (`berangkat`\|`serah_terima`\|`sj`), `lat`, `lng` | `{ ok, completed_steps }` |
| POST | `/driver/trip/:id/complete` | `driverWorkflow.js` (otomatis setelah 3 foto) | — | `{ ...trip }` |
| GET | `/admin/drivers` | `adminDashboard.js` (auto-refresh 15 detik) | — | `[{ id, name, status, lat, lng, current_step_label }]` |
| POST | `/admin/drivers` | `adminNewDriver.js` | Internal: `{ tipe: 'internal', username }`. Eksternal: `{ tipe: 'eksternal', nama, telepon?, id_expedisi? }` | `{ id, name, status, tipe }` |
| GET | `/admin/ekspedisi` | `adminNewDriver.js` (dropdown perusahaan) | — | `[{ id_expedisi, kode_expedisi, nama_expedisi, pic, no_telp }]` |
| GET | `/admin/drivers/:id` | `adminDriverDetail.js`, `adminNewTrip.js` | — | `{ id, name, phone, status, trips: [{ id, destination, status_label, created_at, photos: [{ type, url }] }] }` |
| POST | `/admin/drivers/:id/trip` | `adminNewTrip.js`, `adminSpkKirim.js` | `{ destination, no_surat_jalan?, penjualan_id? }` | `{ ...trip baru }` |
| GET | `/admin/surat-jalan/:no` | `adminNewTrip.js` (tombol "Cek") | — | `{ no_surat_jalan, tanggal, kendaraan, plat, pengirim, valid_cs, client_nama, client_alamat }`, 404 kalau tidak ketemu |
| GET | `/admin/spk-ready-kirim` | `adminSpkKirim.js` | — | `[{ penjualan_id, no_spk, client_nama, kota_asal, kota_tujuan, penjualan_tanggal_kirim, tgl_cs_deadline, penjualan_total_qty }]` |
| GET | `/admin/sj` | `adminSuratJalan.js` | query opsional: `status`, `penjualan_id` | `[{ id, no_surat_jalan, trip_id, penjualan_id, driver_id, nama_supir, tujuan, kendaraan, plat, jumlah_kirim, foto_surat_jalan, catatan, status, created_at }]` |
| POST | `/admin/sj` | `adminNewSuratJalan.js` | `{ tujuan, driver_id?, kendaraan?, plat?, jumlah_kirim?, catatan? }` | 201, `{ ...surat jalan baru, no_surat_jalan auto-generated }` |
| GET | `/admin/sj/:id` | (belum dipanggil dari UI) | — | `{ ...detail surat jalan }`, 404 kalau tidak ketemu |
| PUT | `/admin/sj/:id` | (belum ada UI edit) | field opsional: `tujuan, kendaraan, plat, jumlah_kirim, catatan` | `{ ...surat jalan terupdate }` |

Catatan: `api.js` memaksa logout + redirect ke `#/login` otomatis pada **response 401** di
request apa pun (GET/POST/upload) — backend harus benar-benar balikin 401 untuk sesi
kadaluarsa, bukan 200 dengan pesan error di body.

`no_surat_jalan` di form "Perjalanan Baru" **opsional** — tautan ke SJ resmi (tabel
`surat_jalan` milik `backend-production`, dibuat lewat `surat-jalan-apk`/app lain). Cuma
tautan by-nomor, belum ada auto-fill/validasi CS otomatis — detail lengkap & batasannya ada
di README `ekspedisi-apk-backend`.

**Halaman "SPK Siap Kirim"** (`#/admin/spk-kirim`) — daftar order yang sudah disetujui utk
dikirim (`t_penjualan_header.shipment_status='approved'`, sudah lunas ATAU sudah di-approve
manual oleh sistem approval `backend-production`) tapi belum diplot ke supir manapun. Dropdown
pilih supir per baris menampilkan supir **internal maupun eksternal** sekaligus (label
"(Eksternal)" di belakang nama) — satu alur yang sama, tidak ada UI terpisah utk ekspedisi
luar. Admin pilih supir, klik "Plot" — bikin trip baru tertaut ke SPK itu
(`penjualan_id`), destination di-compose otomatis dari nama client + kota tujuan. Detail alur
lengkap (kapan order masuk daftar ini, kenapa) ada di README `ekspedisi-apk-backend`.

**Modul Surat Jalan** (`#/admin/sj`, `#/admin/sj/new`) — skema **sendiri** milik app ini
(`ekspedisi_t_surat_jalan`), independen dari tabel `surat_jalan` lama `backend-production`
(punya lampiran `no_surat_jalan` di atas). Dua jalur pembuatan: (1) **otomatis**, terbentuk/
terlengkapi tiap kali supir upload foto checkpoint bertipe `sj` di `driverWorkflow.js` (baris
berstatus `terkirim` begitu foto masuk); (2) **manual**, lewat `adminNewSuratJalan.js` — admin
bikin baris tanpa trip sama sekali (`trip_id: null`), supir opsional, bisa diisi belakangan
lewat `PUT /admin/sj/:id` (backend siap, UI edit belum ada). Nomor `no_surat_jalan` (format
`SJ-YYYYMMDD-xxxx`) di-generate otomatis oleh backend setelah insert. Detail penuh (struktur
kolom, FK, alasan skema terpisah) ada di README `ekspedisi-apk-backend`.

## Routing & role guard

`main.js` mendaftarkan route lewat `registerRoute(path, render, { roles, public })`:

| Path | Halaman | Role |
|---|---|---|
| `#/login` | `login.js` | publik |
| `#/driver` | `driverDashboard.js` | `driver` |
| `#/driver/trip/:tripId` | `driverWorkflow.js` | `driver` |
| `#/admin` | `adminDashboard.js` | `admin` |
| `#/admin/driver/new` | `adminNewDriver.js` | `admin` — **wajib didaftarkan sebelum** `:driverId` di bawah (lihat komentar `main.js`), kalau tidak `new` akan ketangkep sebagai `:driverId` |
| `#/admin/driver/:driverId` | `adminDriverDetail.js` | `admin` |
| `#/admin/driver/:driverId/trip/new` | `adminNewTrip.js` | `admin` |
| `#/admin/spk-kirim` | `adminSpkKirim.js` | `admin` |
| `#/admin/sj/new` | `adminNewSuratJalan.js` | `admin` — didaftarkan sebelum `/admin/sj` di `main.js`, mengikuti pola `driver/new` |
| `#/admin/sj` | `adminSuratJalan.js` | `admin` |

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

Sebelum rilis sungguhan, ganti placeholder di `config.xml`: `id="com.perusahaan.trackingsupir"`
dan `<author email="dev@example.com">` masih nilai default template.

## Yang belum ada (di luar scope prototype ini)

- Tracking lokasi saat app di-background/minimize.
- Push notification (mis. notifikasi perjalanan baru ke supir).
- Manajemen supir dari sisi admin baru sebatas **tambah** (`adminNewDriver.js`) — belum ada
  edit/nonaktifkan/hapus profil supir dari app (harus manual lewat DB kalau perlu).
- **Supir eksternal tidak bisa login ke app ini sama sekali** (tidak ada akun) — jadi checkpoint
  foto (`berangkat`/`serah_terima`/`sj`) tidak relevan utk trip tipe ini, dan belum ada cara di
  UI utk menandai trip eksternal selesai tanpa checkpoint foto. Masih gap terbuka.
- **Pengajuan biaya ke finance** — backend (`POST`/`GET /admin/trips/{trip}/pengajuan-biaya`)
  sudah siap, tapi belum ada form/tombol di `ekspedisi-apk` utk memakainya, dan belum ada
  approve/reject dari sisi finance sama sekali (siapa berperan sebagai finance juga belum
  diputuskan). Detail lengkap ada di README `ekspedisi-apk-backend`.
- Export laporan (Excel/PDF) riwayat perjalanan.
- Ikon & splash screen aplikasi (`res/public/` masih kosong).
