// State kecil di memori (bukan localStorage -- cukup hidup selama 1 navigasi)
// buat nitip nomor SPK dari tab "SPK" (adminSpkBelumSj.js, tombol "Buat SJ")
// ke form "Buat Surat Jalan" (adminNewSuratJalan.js), supaya admin tidak
// perlu ngetik ulang nomor yang sudah dipilih. router.js hash-based belum
// dukung query string, jadi ini jalan pintas paling sederhana dibanding
// nambah parsing query ke router.

let pendingPenjualanId = null;

export function setPrefillPenjualanId(id) {
  pendingPenjualanId = id;
}

export function consumePrefillPenjualanId() {
  const id = pendingPenjualanId;
  pendingPenjualanId = null;
  return id;
}
