/**
 * Format nomor SPK utk DITAMPILKAN. `penjualan_id` (identifier asli dari
 * backend-production, t_penjualan_header.penjualan_id -- dipakai APA ADANYA
 * di semua request/lookup ke backend, JANGAN diformat sebelum dikirim)
 * polanya "INV_{no_spk berpadding 0}" + opsional "-{urutan}" kalau 1 order
 * dipecah jadi beberapa baris performa (lihat t_penjualan_header.no_spk vs
 * .penjualan_id). Ditampilkan ulang jadi "SPK-{no_spk tanpa leading zero}
 * {-urutan kalau ada}" (2026-08-20) -- mis. "INV_01811-2" -> "SPK-1811-2",
 * "INV_01836" -> "SPK-1836" (tanpa urutan kalau order-nya tidak dipecah).
 * Kalau polanya tidak dikenali (bukan "INV_..."), tampilkan apa adanya --
 * fallback aman, tidak "menelan"/menyembunyikan data yang polanya beda.
 */
export function formatSpkNo(penjualanId) {
  if (!penjualanId) return '';
  const m = String(penjualanId).match(/^INV_?(\d+)(-.+)?$/i);
  if (!m) return String(penjualanId);
  return `SPK-${parseInt(m[1], 10)}${m[2] || ''}`;
}

/**
 * Judul Case buat nama klien (m_client.client_nama, backend-production) --
 * datanya di lapangan ternyata tidak konsisten casing-nya (mis. "BAHA
 * INDONESIA" ALL CAPS vs "armain travel" huruf kecil semua, dicek langsung
 * ke database produksi 2026-08-20). Diseragamkan jadi "Baha Indonesia"/
 * "Armain Travel" tiap kali ditampilkan -- MURNI transformasi tampilan, tidak
 * mengubah data aslinya di backend/database.
 */
export function toTitleCase(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/\p{L}+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
