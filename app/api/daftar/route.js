import { NextResponse } from "next/server";
import { admin } from "../../../lib/server";
import { merge, validate, norm, todayWIB } from "../../../lib/defaults";

const fail = (error, status = 400) => NextResponse.json({ error }, { status });

async function handle(req) {
  let d;
  try { d = await req.json(); } catch { return fail("Data tidak valid."); }
  const sb = admin();
  const { data: row } = await sb.from("pengaturan").select("data").eq("id", 1).maybeSingle();
  const S = merge(row);
  if (S.batas && todayWIB() > S.batas) return fail("Pendaftaran sudah ditutup.");
  const e = validate(d, S);
  if (e) return fail(e);

  const kode = "ZMS-" + Date.now().toString(36).toUpperCase().slice(-5) + Math.floor(Math.random() * 90 + 10);
  const online = d.metode === "online";
  const anggota = d.anggota.map((m, i) => ({
    nama: String(m.nama).trim(), umur: +m.umur, status: m.status === "ASN KUA" ? "ASN KUA" : "Umum",
    dok: online ? `${kode}/${i}-dok` : null, foto: online ? `${kode}/${i}-foto` : null,
  }));
  const { error } = await sb.from("pendaftaran").insert({
    kode, nama: String(d.nama).trim(), desa: String(d.desa).trim(), kec: String(d.kec).trim(), kec_n: norm(d.kec),
    syekh: String(d.syekh).trim(), hp: String(d.hp).trim(), pembina: String(d.pembina || "").trim(),
    metode: d.metode, jumlah: anggota.length, anggota, berkas: online ? "menunggu" : "fisik",
  });
  if (error) {
    if (error.code === "23505") return fail(`Kecamatan ${d.kec} sudah mendaftarkan 1 grup. Setiap kecamatan hanya boleh mengirim 1 grup.`, 409);
    return fail("Pendaftaran gagal disimpan: " + error.message, 500);
  }
  const uploads = [];
  if (online) {
    for (const m of anggota) for (const p of [m.dok, m.foto]) {
      const { data, error: ue } = await sb.storage.from("berkas").createSignedUploadUrl(p);
      if (ue) { await sb.from("pendaftaran").delete().eq("kode", kode); return fail("Gagal menyiapkan unggahan berkas: " + ue.message, 500); }
      uploads.push({ path: data.path, token: data.token });
    }
  }
  return NextResponse.json({ kode, uploads });
}

export async function POST(req) {
  try { return await handle(req); } catch (e) { return fail("Kesalahan server: " + e.message, 500); }
}
