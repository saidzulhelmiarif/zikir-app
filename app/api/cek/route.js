import { NextResponse } from "next/server";
import { admin } from "../../../lib/server";
export const dynamic = "force-dynamic";

// Halaman diagnosis sementara: buka /api/cek, lalu HAPUS folder app/api/cek setelah masalah selesai.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const out = {
    env: { url: !!url, anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
    bentukUrlBenar: /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url),
  };
  if (!out.env.url || !out.env.service) return NextResponse.json(out);
  try {
    const sb = admin();
    for (const t of ["pengaturan", "pendaftaran", "panitia"]) {
      const { error } = await sb.from(t).select("*", { head: true, count: "exact" });
      out["tabel_" + t] = error ? error.message : "ok";
    }
    const { data, error } = await sb.storage.getBucket("berkas");
    out.bucket_berkas = error ? error.message : data ? "ok" : "tidak ada";
  } catch (e) { out.error = e.message; }
  return NextResponse.json(out);
}
