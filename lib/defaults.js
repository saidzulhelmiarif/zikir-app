export const DEF = {
  tanggal: "2027-01-03", waktu: "", lokasi: "", batas: "", undian: "1 hari sebelum lomba",
  hadir: 30, durasi: 20, kontak: "", jmin: 6, jmax: 10, umin: 25, umax: 50, asn: 3,
  syarat: "1 grup per kecamatan | Setiap kecamatan mengirim satu grup laki-laki.\nAnggota 6–10 orang | Setiap grup beranggotakan 6 sampai 10 orang laki-laki.\nKomposisi | ASN KUA maksimal 3 orang, selebihnya masyarakat umum.\nUsia 25–50 tahun | Berlaku untuk seluruh anggota.\nBerkas identitas | Foto copy SK untuk ASN, foto copy KTP untuk masyarakat umum, untuk setiap anggota.\nPas foto | Pas foto warna 4x6 latar merah. Online: unggah di formulir. Offline: serahkan berkas fisik dalam map hijau.",
  kriteria: "Makhraj dan Tajwid | 25\nVokal, Suara dan Lagu | 20\nKekompakan / Harmonisasi | 25\nPenjiwaan dan Penghayatan | 20\nAdab, Kerapian, Kedisiplinan | 10",
  faq: "Berapa grup yang boleh dikirim satu kecamatan? | Satu grup laki-laki per kecamatan, beranggotakan 6 sampai 10 orang.\nBerkas apa yang harus diserahkan? | Setiap anggota: foto copy SK (ASN) atau KTP (masyarakat umum) dan pas foto warna 4x6 latar merah. Online: unggah langsung di formulir. Offline: serahkan fisik dalam map hijau kepada panitia.\nKapan undian nomor tampil? | Undian dilakukan 1 hari sebelum lomba. Setiap grup hadir 30 menit sebelum tampil.\nApa bedanya daftar online dan offline? | Online: isi formulir dan unggah berkas, tanpa perlu datang. Offline: isi formulir (atau didata panitia), lalu serahkan berkas fisik kepada panitia.",
};
export const lines = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
export const pair = (x) => { const i = x.indexOf("|"); return i < 0 ? [x, ""] : [x.slice(0, i).trim(), x.slice(i + 1).trim()]; };
export const tgl = (s) => { const d = new Date(s + "T00:00:00Z"); return isNaN(d) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); };
export const merge = (r) => ({ ...DEF, ...((r && r.data) || {}) });
export const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
export const todayWIB = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);

// Dipakai di browser (umpan balik cepat) DAN di server (pemeriksaan yang berlaku)
export function validate(d, S) {
  const t = (k) => String(d[k] || "").trim();
  for (const k of ["nama", "desa", "kec", "syekh", "hp"]) if (!t(k)) return "Lengkapi semua isian bertanda *.";
  if (!/^[0-9+\-\s]{8,16}$/.test(t("hp"))) return "Nomor HP/WhatsApp tidak valid.";
  const m = Array.isArray(d.anggota) ? d.anggota : [];
  if (m.length < S.jmin || m.length > S.jmax) return `Jumlah anggota harus ${S.jmin} sampai ${S.jmax} orang.`;
  if (m.some((x) => !String(x.nama || "").trim())) return "Isi nama semua anggota.";
  if (m.some((x) => !(+x.umur >= S.umin && +x.umur <= S.umax))) return `Usia setiap peserta harus ${S.umin} sampai ${S.umax} tahun.`;
  if (m.filter((x) => x.status === "ASN KUA").length > S.asn) return `Peserta ASN KUA maksimal ${S.asn} orang.`;
  if (!["online", "offline"].includes(d.metode)) return "Metode pendaftaran tidak valid.";
  return "";
}
