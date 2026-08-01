# Tracking Supir — Frontend (Cordova + jQuery + Tailwind + Vite)

## Struktur

```
frontend/
├── config.xml            # konfigurasi Cordova (plugin, permission, dst)
├── vite.config.js         # build src/ -> www/ (folder yang dibaca Cordova)
├── tailwind.config.js
├── src/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── main.js        # entry point, registrasi route
│       ├── router.js       # hash router + role guard
│       ├── auth.js         # login (pakai endpoint login-new), session di localStorage
│       ├── api.js          # wrapper $.ajax + upload multipart
│       ├── geo.js          # tracking lokasi (watchPosition + ping berkala)
│       ├── camera.js       # ambil foto (cordova-plugin-camera / fallback browser)
│       ├── components/navbar.js
│       └── pages/
│           ├── login.js
│           ├── driverDashboard.js     # toggle status + mulai perjalanan
│           ├── driverWorkflow.js      # step wizard: foto berangkat → serah terima → SJ
│           ├── adminDashboard.js      # peta live semua supir (Leaflet)
│           └── adminDriverDetail.js   # riwayat perjalanan & foto per supir
```

## Setup awal

```bash
cd frontend
npm install

# install Cordova CLI global kalau belum ada
npm install -g cordova

# tambah platform yang dibutuhkan
cordova platform add android
# cordova platform add ios   # kalau develop untuk iOS (butuh macOS + Xcode)
```

## Development di browser (tercepat untuk ngulik UI)

```bash
npm run dev
```
Buka `http://localhost:5173`. Fitur kamera akan otomatis fallback ke `<input type="file" capture>`,
dan geolocation dari browser (perlu izinkan lokasi + akses HTTPS/localhost).

> Sebelum development, isi `src/js/config.js` → `API_BASE_URL` dengan URL backend Laravel kamu.
> Kalau test dari HP fisik (bukan emulator), jangan pakai `localhost`, pakai IP LAN komputer.

## Build & jalankan di device/emulator

```bash
npm run cordova:android
# atau kalau sudah punya www/ ter-build:
cordova run android --device
```

`npm run build` akan menjalankan Vite build ke folder `www/`, lalu `cordova prepare/run`
akan menyalin `www/` ke project native dan otomatis menyuntik file `cordova.js`
(makanya tag `<script src="cordova.js"></script>` di `index.html` jangan dihapus meskipun filenya belum ada saat development).

## Auth & role

- Login memanggil `POST {API_BASE_URL}/login-new` (endpoint existing di BE Laravel 5).
- Response login **wajib** mengandung `token` dan `user.role` (`driver` atau `admin`) —
  sesuaikan mapping di `src/js/auth.js` fungsi `login()` kalau bentuk response BE beda.
- Setelah login, user driver diarahkan ke `#/driver`, admin ke `#/admin`. Router otomatis
  memblokir akses ke halaman yang bukan role-nya.

## Kontrak API yang dipakai frontend

Lihat `backend/README-BACKEND.md` untuk daftar lengkap endpoint yang perlu ada di sisi Laravel,
beserta contoh migration, model, dan controller yang bisa langsung disalin ke project BE kamu.
