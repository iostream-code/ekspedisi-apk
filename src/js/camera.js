/**
 * Ambil foto pakai plugin cordova-plugin-camera.
 * Saat development di browser (npm run dev) plugin ini belum ada,
 * jadi otomatis fallback ke <input type="file" capture="environment">.
 * Return: Promise<Blob>
 */
export function takePhoto() {
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
          sourceType: Camera.PictureSourceType.CAMERA,
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
    input.capture = 'environment';
    input.onchange = () => {
      if (input.files && input.files[0]) resolve(input.files[0]);
      else reject(new Error('Tidak ada foto dipilih'));
    };
    input.click();
  });
}
