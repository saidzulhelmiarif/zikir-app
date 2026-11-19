"use client";
import { useState, useEffect } from "react";
import { sb } from "../../lib/supabase";
import { DEF, merge, lines, pair } from "../../lib/defaults";

const FS = [["tanggal", "Tanggal lomba", "date"], ["waktu", "Waktu (mis. 08.00 WIB)", "text"], ["lokasi", "Lokasi", "text"], ["batas", "Batas akhir pendaftaran", "date"], ["undian", "Jadwal undian", "text"], ["hadir", "Hadir sebelum tampil (menit)", "number"], ["durasi", "Durasi tampil maksimal (menit)", "number"], ["kontak", "Kontak panitia", "text"], ["jmin", "Anggota minimal per grup", "number"], ["jmax", "Anggota maksimal per grup", "number"], ["umin", "Usia minimal", "number"], ["umax", "Usia maksimal", "number"], ["asn", "Maksimal ASN KUA per grup", "number"], ["syarat", "Syarat peserta (per baris: Judul | Keterangan)", "ta"], ["kriteria", "Kriteria penilaian (per baris: Nama | Bobot)", "ta"], ["faq", "Pertanyaan umum (per baris: Pertanyaan | Jawaban)", "ta"]];

export default function Panitia() {
  const c = sb();
  const [sess, setSess] = useState(undefined);
  const [isP, setIsP] = useState(null);
  const [list, setList] = useState([]);
  const [form, setForm] = useState(DEF);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const [links, setLinks] = useState({});
  const [note, setNote] = useState("");
  const [cred, setCred] = useState({ email: "", password: "" });

  useEffect(() => {
    c.auth.getSession().then(({ data }) => setSess(data.session));
    const { data: sub } = c.auth.onAuthStateChange((_e, s) => setSess(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (sess) load(); }, [sess]);

  async function load() {
    const { data: me } = await c.from("panitia").select("user_id").maybeSingle();
    if (!me) return setIsP(false);
    setIsP(true);
    const [a, b] = await Promise.all([c.from("pendaftaran").select("*").order("dibuat"), c.from("pengaturan").select("data").eq("id", 1).maybeSingle()]);
    setList(a.data || []); setForm(merge(b.data));
  }
  async function masuk(e) {
    e.preventDefault(); setNote("");
    const { error } = await c.auth.signInWithPassword(cred);
    if (error) setNote("Login gagal: " + error.message);
  }
  async function toggle(r) { await c.from("pendaftaran").update({ status: r.status === "Terverifikasi" ? "Menunggu" : "Terverifikasi" }).eq("kode", r.kode); load(); }
  async function hapus(r) {
    if (!confirm("Hapus pendaftaran " + r.nama + " beserta berkasnya?")) return;
    const paths = (r.anggota || []).flatMap((m) => [m.dok, m.foto]).filter(Boolean);
    if (paths.length) await c.storage.from("berkas").remove(paths);
    await c.from("pendaftaran").delete().eq("kode", r.kode); load();
  }
  async function undi() {
    if (!list.length || !confirm("Undi ulang nomor urut untuk semua grup?")) return;
    const a = list.map((r) => r.kode);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    for (let i = 0; i < a.length; i++) await c.from("pendaftaran").update({ urut: i + 1 }).eq("kode", a[i]);
    setNote("Undian nomor urut selesai."); load();
  }
  async function detail(r) {
    const o = !open[r.kode]; setOpen({ ...open, [r.kode]: o });
    if (o && r.metode === "online" && !links[r.kode]) {
      const paths = (r.anggota || []).flatMap((m) => [m.dok, m.foto]).filter(Boolean);
      const { data } = await c.storage.from("berkas").createSignedUrls(paths, 3600);
      setLinks({ ...links, [r.kode]: Object.fromEntries((data || []).map((x) => [x.path, x.signedUrl])) });
    }
  }
  function csv() {
    const e = (x) => '"' + String(x ?? "").replace(/"/g, '""') + '"';
    const head = ["Kode", "Urut", "Grup", "Desa", "Kecamatan", "Syekh", "HP", "Pembina", "Jumlah", "Metode", "Berkas", "Anggota", "Status", "Dibuat"];
    const rows = list.map((r) => [r.kode, r.urut, r.nama, r.desa, r.kec, r.syekh, r.hp, r.pembina, r.jumlah, r.metode, r.berkas, (r.anggota || []).map((m) => `${m.nama} (${m.umur}, ${m.status})`).join("; "), r.status, r.dibuat].map(e).join(","));
    const url = URL.createObjectURL(new Blob(["\ufeff" + [head.map(e).join(","), ...rows].join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "pendaftar_lomba_zikir.csv"; a.click(); URL.revokeObjectURL(url);
  }
  const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  // Membuka halaman cetak formulir (satu atau banyak grup). Di dialog cetak pilih "Simpan sebagai PDF" untuk mengunduh.
  async function cetak(rows) {
    if (!rows.length) return;
    const w = window.open("", "_blank");
    if (!w) return setNote("Pop-up diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.");
    w.document.write("<p style='font-family:sans-serif'>Menyiapkan formulir...</p>");
    const paths = rows.flatMap((r) => (r.anggota || []).map((m) => m.foto)).filter(Boolean);
    let url = {};
    if (paths.length) { const { data } = await c.storage.from("berkas").createSignedUrls(paths, 3600); url = Object.fromEntries((data || []).map((x) => [x.path, x.signedUrl])); }
    const page = (r) => `<div class="pg">
<h1>FORMULIR PENDAFTARAN<br>LOMBA ZIKIR MAULID SIMTUDDUROR</h1>
<h2>HAB Kemenag Ke-81 · Kantor Kementerian Agama Kab. Gayo Lues</h2>
<table class="kv">
<tr><td>Kode pendaftaran</td><td>: <b>${esc(r.kode)}</b></td></tr>
<tr><td>Tanggal mendaftar</td><td>: ${esc(new Date(r.dibuat).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))} WIB</td></tr>
<tr><td>Metode</td><td>: ${r.metode === "offline" ? "Offline (berkas fisik diserahkan ke panitia)" : "Online (berkas diunggah)"}</td></tr>
<tr><td>Nama grup</td><td>: ${esc(r.nama)}</td></tr>
<tr><td>Asal</td><td>: ${esc(r.desa)}, Kecamatan ${esc(r.kec)}</td></tr>
<tr><td>Syekh/Radat</td><td>: ${esc(r.syekh)}</td></tr>
<tr><td>HP/WhatsApp</td><td>: ${esc(r.hp)}</td></tr>
<tr><td>Pembina/pendamping</td><td>: ${esc(r.pembina || "-")}</td></tr>
<tr><td>Status</td><td>: ${esc(r.status)}${r.urut ? " · Nomor urut tampil: " + esc(r.urut) : ""}</td></tr>
</table>
<h3>Daftar Anggota (${(r.anggota || []).length} orang)</h3>
<table class="g"><tr><th>No</th><th>Nama</th><th>Umur</th><th>Status</th><th>Berkas</th><th>Pas foto</th></tr>
${(r.anggota || []).map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.nama)}</td><td>${esc(m.umur)}</td><td>${esc(m.status)}</td><td>${r.metode === "online" ? "KTP/SK dan foto terunggah" : "&#9744; " + (m.status === "ASN KUA" ? "SK" : "KTP") + " &nbsp; &#9744; Pas foto"}</td><td class="ph">${m.foto && url[m.foto] ? `<img src="${esc(url[m.foto])}">` : ""}</td></tr>`).join("")}
</table>
<p class="sm">Pernyataan: data di atas benar dan grup bersedia mengikuti seluruh ketentuan lomba.</p>
<div class="ttd"><div>Penanggung Jawab Grup<br><br><br><br>( ${esc(r.syekh)} )</div><div>Blangkejeren, ........................ 20....<br>Panitia Penerima<br><br><br>( ........................ )</div></div>
</div>`;
    const css = "body{font-family:Arial,sans-serif;font-size:12px;color:#000;margin:0}.pg{padding:24px 32px;page-break-after:always}.pg:last-child{page-break-after:auto}h1{font-size:16px;text-align:center;margin:0 0 4px}h2{font-size:12px;text-align:center;font-weight:normal;margin:0 0 16px}h3{font-size:13px;margin:16px 0 6px}table{border-collapse:collapse;width:100%}.kv td{padding:3px 4px;vertical-align:top}.kv td:first-child{width:150px}.g th,.g td{border:1px solid #000;padding:5px;text-align:left;vertical-align:middle}.g th{background:#eee}.ph{width:56px;height:74px;text-align:center}.ph img{width:50px;height:67px;object-fit:cover}.sm{margin-top:14px}.ttd{display:flex;justify-content:space-between;margin-top:20px}.ttd div{text-align:center;width:46%}@page{size:A4;margin:12mm}";
    w.document.open();
    w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Formulir Pendaftaran</title><style>${css}</style></head><body>${rows.map(page).join("")}<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>`);
    w.document.close();
  }
  async function simpan() {
    const o = {}; FS.forEach(([k, , t]) => { o[k] = t === "number" ? Number(form[k]) : String(form[k] ?? "").trim(); });
    const bad = !(o.jmin >= 1 && o.jmax >= o.jmin && o.jmax <= 30) || !(o.umin > 0 && o.umax >= o.umin) || o.asn < 0 || !o.tanggal || lines(o.kriteria).some((x) => isNaN(+pair(x)[1]));
    if (bad) return setNote("Periksa isian: tanggal wajib, anggota min ≤ maks (1–30), usia min ≤ maks, bobot nilai berupa angka.");
    const { data: ses } = await c.auth.getSession();
    const r = await fetch("/api/pengaturan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (ses.session?.access_token || "") }, body: JSON.stringify({ data: o }) });
    const j = await r.json().catch(() => ({}));
    setNote(r.ok ? "Pengaturan tersimpan. Muat ulang halaman utama untuk melihat perubahan." : j.error || "Gagal menyimpan pengaturan.");
  }

  const shown = list.filter((r) => !q || [r.nama, r.kec, r.desa, r.syekh].join(" ").toLowerCase().includes(q.toLowerCase()));
  const wrap = (x) => (<section><div className="in"><h2>Panel Panitia</h2><p className="sub"><a href="/" className="lnk">← Halaman publik</a></p>{x}</div></section>);

  if (sess === undefined) return wrap(<p className="hint">Memuat...</p>);
  if (!sess) return wrap(
    <form className="card" onSubmit={masuk}>
      <label>Email panitia</label><input type="email" required value={cred.email} onChange={(e) => setCred({ ...cred, email: e.target.value })} />
      <label>Kata sandi</label><input type="password" required value={cred.password} onChange={(e) => setCred({ ...cred, password: e.target.value })} />
      <button className="btn" style={{ width: "100%", marginTop: 14 }}>Masuk</button>
      {note && <div className="msg err">{note}</div>}
    </form>);
  if (isP === false) return wrap(<div className="card"><div className="msg err">Akun ini belum terdaftar sebagai panitia.</div><button className="btn sec" onClick={() => c.auth.signOut()}>Keluar</button></div>);

  return wrap(<>
    <div className="tools"><button className="btn sec" onClick={load}>Muat ulang</button><button className="btn sec" onClick={() => c.auth.signOut()}>Keluar</button></div>
    <details><summary>Pengaturan jadwal dan ketentuan</summary>
      {FS.map(([k, l, t]) => (<div key={k}><label>{l}</label>{t === "ta" ? <textarea value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /> : <input type={t} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}</div>))}
      <button className="btn" style={{ marginTop: 16 }} onClick={simpan}>Simpan Pengaturan</button>
    </details>
    <div className="stats">
      <div className="card"><b>{list.length}</b>Grup</div>
      <div className="card"><b>{list.filter((r) => r.status === "Terverifikasi").length}</b>Terverifikasi</div>
      <div className="card"><b>{list.filter((r) => r.urut).length}</b>Sudah diundi</div>
    </div>
    <div className="tools"><input placeholder="Cari grup, kecamatan, syekh" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn sec" onClick={undi}>Undi Nomor Urut</button><button className="btn sec" onClick={csv}>Ekspor CSV</button><button className="btn sec" onClick={() => cetak(shown)}>Cetak Semua Formulir</button></div>
    {note && <div className="hint">{note}</div>}
    <div className="scroll"><table>
      <thead><tr><th>Urut</th><th>Grup</th><th>Asal</th><th>Syekh / HP</th><th>Status</th><th></th></tr></thead>
      <tbody>
        {!shown.length && <tr><td colSpan={6}>Belum ada pendaftar.</td></tr>}
        {shown.map((r) => [
          <tr key={r.kode}>
            <td>{r.urut ?? "-"}</td>
            <td><button className="lk" onClick={() => detail(r)}>{r.nama}</button></td>
            <td>{r.desa}, {r.kec} · {r.metode === "offline" ? "Offline" : "Online"}{r.metode === "online" && r.berkas !== "lengkap" ? " (berkas belum lengkap)" : ""}</td>
            <td>{r.syekh} / {r.hp}</td>
            <td><button className={"badge" + (r.status === "Terverifikasi" ? " v" : "")} onClick={() => toggle(r)}>{r.status}</button></td>
            <td><button className="btn sec" onClick={() => cetak([r])}>Unduh Formulir</button> <button className="btn dng" onClick={() => hapus(r)}>Hapus</button></td>
          </tr>,
          open[r.kode] && <tr key={r.kode + "d"}><td colSpan={6} className="hint">
            {(r.anggota || []).map((m, i) => (<div key={i}>{i + 1}. {m.nama} ({m.umur}, {m.status}) {[["dok", "KTP/SK"], ["foto", "Foto"]].map(([k, l]) => m[k] && links[r.kode]?.[m[k]] && <a key={k} className="lnk" href={links[r.kode][m[k]]} target="_blank" rel="noopener noreferrer">{l}</a>)}</div>))}
            <div>Kode: {r.kode}</div>
          </td></tr>,
        ])}
      </tbody>
    </table></div>
  </>);
}
