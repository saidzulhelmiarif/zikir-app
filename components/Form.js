"use client";
import { useState, useEffect, useRef } from "react";
import { sb } from "../lib/supabase";
import { validate, tgl } from "../lib/defaults";

const DK = "zms-draft";
const blank = () => ({ nama: "", umur: "", status: "Umum", dok: null, foto: null });

async function shrink(f) {
  if (!/^image\//.test(f.type)) return f;
  try {
    const bmp = await createImageBitmap(f);
    const sc = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b || f), "image/jpeg", 0.85));
  } catch { return f; }
}

export default function Form({ S }) {
  const [step, setStep] = useState(1);
  const [metode, setMetode] = useState("online");
  const [v, setV] = useState({ nama: "", desa: "", kec: "", syekh: "", hp: "", pembina: "" });
  const [m, setM] = useState(() => Array.from({ length: S.jmin }, blank));
  const [setuju, setSetuju] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [ready, setReady] = useState(false);
  const info = useRef(null), upl = useRef(new Set()), top = useRef(null);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DK) || "null");
      if (d) { setV(d.v); const L = d.m.slice(0, S.jmax).map((x) => ({ ...blank(), ...x })); while (L.length < S.jmin) L.push(blank()); setM(L); }
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem(DK, JSON.stringify({ v, m: m.map(({ nama, umur, status }) => ({ nama, umur, status })) })); } catch {}
  }, [v, m, ready]);

  const go = (n) => { setStep(n); setMsg(""); top.current?.scrollIntoView(); };
  const setMem = (i, k, val) => setM((a) => a.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const payload = () => ({ ...v, metode, anggota: m.map(({ nama, umur, status }) => ({ nama, umur: +umur, status })) });
  const fileErr = () => {
    if (metode !== "online") return "";
    const i = m.findIndex((x) => !x.dok || !x.foto);
    if (i >= 0) return `Unggah KTP/SK dan pas foto anggota ke-${i + 1}, atau pilih metode Offline.`;
    if (m.some((x) => x.dok.size > 8e6 || x.foto.size > 8e6)) return "Ukuran berkas maksimal 8 MB.";
    return "";
  };
  const next1 = () => { for (const k of ["nama", "desa", "kec", "syekh", "hp"]) if (!v[k].trim()) return setMsg("Lengkapi semua isian bertanda *."); if (!/^[0-9+\-\s]{8,16}$/.test(v.hp.trim())) return setMsg("Nomor HP/WhatsApp tidak valid."); go(2); };
  const next2 = () => { const e = validate(payload(), S) || fileErr(); e ? setMsg(e) : go(3); };

  async function kirim() {
    const e = validate(payload(), S) || fileErr();
    if (e) return setMsg(e);
    if (!setuju) return setMsg("Centang pernyataan persetujuan terlebih dahulu.");
    setBusy(true); setMsg("");
    try {
      if (!info.current) {
        const r = await fetch("/api/daftar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Pendaftaran gagal dikirim.");
        info.current = j;
      }
      if (metode === "online") {
        const c = sb(), { kode, uploads } = info.current;
        const files = m.flatMap((x) => [x.dok, x.foto]);
        for (let i = 0; i < files.length; i++) {
          if (upl.current.has(i)) continue;
          setMsg(`Mengunggah berkas ${i + 1}/${files.length}...`);
          const b = await shrink(files[i]);
          const { error } = await c.storage.from("berkas").uploadToSignedUrl(uploads[i].path, uploads[i].token, b, { contentType: b.type || files[i].type });
          if (error) throw new Error("Unggah berkas gagal (" + error.message + "). Tekan Kirim lagi untuk melanjutkan.");
          upl.current.add(i);
        }
        const r2 = await fetch("/api/daftar/selesai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kode }) });
        if (!r2.ok) throw new Error((await r2.json()).error || "Berkas belum lengkap.");
      }
      try { localStorage.removeItem(DK); } catch {}
      setDone(info.current.kode); setMsg("");
    } catch (er) { setMsg(er.message); }
    setBusy(false);
  }

  if (done) return (
    <div className="card"><div className="msg ok">
      <div>Pendaftaran berhasil. Simpan kode pendaftaran Anda:</div>
      <div className="code">{done}</div>
      <div className="hint">{metode === "online" ? "Berkas Anda sudah terunggah dan akan diverifikasi panitia. " : "Serahkan berkas fisik (KTP/SK dan pas foto 4x6 latar merah, dalam map hijau) kepada panitia. "}Undian tampil dilakukan {S.undian} (lomba {tgl(S.tanggal)}).</div>
    </div></div>
  );

  return (
    <div className="card" ref={top}>
      <div className="dots">{["1. Data grup", "2. Anggota", "3. Kirim"].map((t, i) => <div key={i} className={"dot" + (step === i + 1 ? " on" : step > i + 1 ? " done" : "")}>{t}</div>)}</div>

      {step === 1 && <div>
        <label>Metode pendaftaran *</label>
        <div className="mt">
          {[["online", "Online", "Unggah berkas langsung di formulir"], ["offline", "Offline", "Serahkan berkas fisik ke panitia"]].map(([k, a, b]) => (
            <label className="opt" key={k}><input type="radio" name="metode" checked={metode === k} onChange={() => setMetode(k)} /><span><b>{a}</b><br />{b}</span></label>))}
        </div>
        <label>Nama grup *</label><input value={v.nama} onChange={(e) => setV({ ...v, nama: e.target.value })} />
        <div className="row">
          <div><label>Desa/Kelurahan *</label><input value={v.desa} onChange={(e) => setV({ ...v, desa: e.target.value })} /></div>
          <div><label>Kecamatan *</label><input value={v.kec} onChange={(e) => setV({ ...v, kec: e.target.value })} /></div>
        </div>
        <div className="row">
          <div><label>Syekh/Radat (pemimpin) *</label><input value={v.syekh} onChange={(e) => setV({ ...v, syekh: e.target.value })} /></div>
          <div><label>HP/WhatsApp *</label><input type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" value={v.hp} onChange={(e) => setV({ ...v, hp: e.target.value })} /></div>
        </div>
        <label>Pembina/pendamping (opsional)</label><input value={v.pembina} onChange={(e) => setV({ ...v, pembina: e.target.value })} />
        <div className="nav2"><button className="btn" onClick={next1}>Lanjut: Anggota</button></div>
      </div>}

      {step === 2 && <div>
        <p className="hint" style={{ marginTop: 0 }}>{metode === "offline" ? "Berkas fisik (KTP/SK dan pas foto 4x6 latar merah, dalam map hijau) diserahkan langsung kepada panitia setelah mendaftar." : "Unggah KTP/SK dan pas foto setiap anggota (maks. 8 MB per berkas)."}</p>
        <div className="cnt">{m.filter((x) => x.nama.trim()).length} nama terisi (min {S.jmin}, maks {S.jmax}) · ASN KUA {m.filter((x) => x.status === "ASN KUA").length}/{S.asn}</div>
        <div className={metode === "offline" ? "off" : ""}>
          {m.map((x, i) => (
            <div className="mr" key={i}>
              <span>{i + 1}</span>
              <input placeholder={i ? "Nama anggota" : "Nama Syekh/Radat"} value={x.nama} onChange={(e) => setMem(i, "nama", e.target.value)} />
              <input type="number" inputMode="numeric" placeholder="Umur" value={x.umur} onChange={(e) => setMem(i, "umur", e.target.value)} />
              <select value={x.status} onChange={(e) => setMem(i, "status", e.target.value)}><option>Umum</option><option>ASN KUA</option></select>
              <div className="fl">
                <label>KTP/SK (foto atau PDF){x.dok ? " ✓" : ""}<input type="file" accept="image/*,application/pdf" onChange={(e) => setMem(i, "dok", e.target.files[0] || null)} /></label>
                <label>Pas foto 4x6 latar merah{x.foto ? " ✓" : ""}<input type="file" accept="image/*" onChange={(e) => setMem(i, "foto", e.target.files[0] || null)} /></label>
              </div>
            </div>))}
        </div>
        <div className="tools">
          {m.length < S.jmax && <button className="btn sec" onClick={() => setM([...m, blank()])}>+ Tambah anggota</button>}
          {m.length > S.jmin && <button className="btn sec" onClick={() => setM(m.slice(0, -1))}>Hapus baris terakhir</button>}
        </div>
        <div className="nav2"><button className="btn sec" onClick={() => go(1)}>Kembali</button><button className="btn" onClick={next2}>Lanjut</button></div>
      </div>}

      {step === 3 && <div>
        <p className="hint" style={{ margin: 0 }}>Periksa kembali data sebelum mengirim.</p>
        <div className="sum">{`Grup: ${v.nama}\nAsal: ${v.desa}, Kec. ${v.kec}\nSyekh/Radat: ${v.syekh} (${v.hp})\nPembina: ${v.pembina || "-"}\nMetode: ${metode === "online" ? "Online (berkas diunggah)" : "Offline (berkas diserahkan ke panitia)"}\nAnggota: ${m.length} orang, ASN KUA ${m.filter((x) => x.status === "ASN KUA").length}`}</div>
        <label className="chk"><input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} /><span>Data di atas benar, grup kami bersedia mengikuti seluruh ketentuan, dan akan melengkapi berkas sesuai metode pendaftaran yang dipilih.</span></label>
        <div className="nav2"><button className="btn sec" disabled={busy} onClick={() => go(2)}>Kembali</button><button className="btn" disabled={busy} onClick={kirim}>{busy ? "Mengirim..." : "Kirim Pendaftaran"}</button></div>
      </div>}

      {msg && <div className={"msg " + (busy ? "ok" : "err")}>{msg}</div>}
    </div>
  );
}
