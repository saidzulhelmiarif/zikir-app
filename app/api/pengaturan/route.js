import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { admin } from "../../../lib/server";

export const dynamic = "force-dynamic";
const fail = (error, status) => NextResponse.json({ error }, { status });

// Simpan pengaturan: hanya untuk akun panitia yang sedang login (token diperiksa di server).
export async function POST(req) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    const sb = admin();
    const { data: u, error: ue } = await sb.auth.getUser(token);
    if (ue || !u?.user) return fail("Sesi login tidak valid. Keluar lalu masuk lagi.", 401);
    const { data: p } = await sb.from("panitia").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!p) return fail("Akun ini bukan panitia.", 403);
    const { data } = await req.json();
    if (!data || typeof data !== "object") return fail("Data pengaturan tidak valid.", 400);
    const { error } = await sb.from("pengaturan").upsert({ id: 1, data });
    if (error) return fail("Gagal menyimpan: " + error.message, 500);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail("Kesalahan server: " + e.message, 500);
  }
}
