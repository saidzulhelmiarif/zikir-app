import { NextResponse } from "next/server";
import { admin } from "../../../../lib/server";

async function handle(req) {
  const { kode } = await req.json().catch(() => ({}));
  if (!kode) return NextResponse.json({ error: "Kode tidak valid." }, { status: 400 });
  const sb = admin();
  const { data: row } = await sb.from("pendaftaran").select("jumlah,metode").eq("kode", kode).maybeSingle();
  if (!row || row.metode !== "online") return NextResponse.json({ error: "Pendaftaran tidak ditemukan." }, { status: 404 });
  const { data: files } = await sb.storage.from("berkas").list(kode, { limit: 100 });
  if ((files || []).length < row.jumlah * 2)
    return NextResponse.json({ error: "Berkas belum lengkap terunggah. Tekan Kirim lagi." }, { status: 409 });
  await sb.from("pendaftaran").update({ berkas: "lengkap" }).eq("kode", kode);
  return NextResponse.json({ ok: true });
}

export async function POST(req) {
  try { return await handle(req); } catch (e) { return NextResponse.json({ error: "Kesalahan server: " + e.message }, { status: 500 }); }
}
