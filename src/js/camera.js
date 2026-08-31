/**
 * Ambil foto pakai plugin cordova-plugin-camera.
 * Saat development di browser (npm run dev) plugin ini belum ada,
 * jadi otomatis fallback ke <input type="file">.
 * @param {{ source?: 'camera'|'gallery' }} [opts] - default 'camera' (checkpoint/dokumen
 *   yang memang harus difoto langsung). 'gallery' buka galeri/library foto yang sudah ada
 *   di device -- dipakai foto Serah Terima (adminSuratJalan.js), yang isinya seringkali
 *   sudah difoto duluan oleh supir eksternal lewat WA/aplikasi lain, bukan difoto ulang
 *   saat itu juga oleh admin.
 * Return: Promise<Blob>
 */
export function takePhoto({ source = 'camera' } = {}) {
  const hasCordovaCamera = typeof navigator !== 'undefined' && navigator.camera;

  if (hasCordovaCamera) {
    return new Promise((resolve, reject) => {
      navigator.camera.getPicture(
        (fileUri) => {
          window.resolveLocalFileSystemURL(fileUri, (fileEntry) => {
            fileEntry.file((file) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(new Blob([reader.result], { type: 'image/jpeg' }));
              reader.onerror = reject;
              reader.readAsArrayBuffer(file);
            }, reject);
          }, reject);
        },
        (err) => reject(new Error(err)),
        {
          quality: 70,
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: source === 'gallery' ? Camera.PictureSourceType.PHOTOLIBRARY : Camera.PictureSourceType.CAMERA,
          encodingType: Camera.EncodingType.JPEG,
          correctOrientation: true,
          saveToPhotoAlbum: false,
        }
      );
    });
  }

  // Fallback browser (mode development)
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // 'capture' cuma diisi utk source 'camera' -- ini yang jadi hint browser
    // mobile buat langsung buka kamera. Tanpa atribut ini, browser nampilin
    // galeri/file picker biasa (source 'gallery'). PAKAI setAttribute(), BUKAN
    // `input.capture = 'environment'` -- assignment properti itu TIDAK
    // ter-refleksi ke atribut HTML aslinya di Chrome (dicek langsung, jadi
    // hint-nya sebenarnya tidak pernah berfungsi) -- baru kepakai bener saat
    // dev-testing dari browser HP fisik di LAN (lihat vite.config.js `host: true`).
    if (source !== 'gallery') input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    // Chrome versi baru menolak membuka dialog file untuk <input> yang belum
    // ter-attach ke DOM saat di-.click() lewat JS -- harus di-append dulu.
    document.body.appendChild(input);
    input.onchange = () => {
      input.remove();
      if (input.files && input.files[0]) resolve(input.files[0]);
      else reject(new Error('Tidak ada foto dipilih'));
    };
    input.click();
  });
}
