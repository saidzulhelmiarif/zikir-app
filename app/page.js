import { admin } from "../lib/server";
import { merge, lines, pair, tgl, todayWIB } from "../lib/defaults";
import Form from "../components/Form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  const { data } = await admin().from("pengaturan").select("data").eq("id", 1).maybeSingle();
  const S = merge(data);
  const d = Math.ceil((new Date(S.tanggal + "T00:00:00+07:00") - new Date()) / 864e5);
  const cd = isNaN(d) ? "-" : d > 0 ? "H-" + d : d === 0 ? "Hari ini" : "Selesai";
  const info = [S.waktu && "Pukul " + S.waktu, S.lokasi && "Lokasi: " + S.lokasi, S.batas && "Batas pendaftaran: " + tgl(S.batas), S.kontak && "Info: " + S.kontak].filter(Boolean).join(" · ");
  const ks = lines(S.kriteria).map(pair), tot = ks.reduce((a, k) => a + (+k[1] || 0), 0) || 1;
  const closed = !!S.batas && todayWIB() > S.batas;
  return (
    <>
      <nav><b>Zikir Maulid</b><a href="#syarat">Syarat</a><a href="#nilai">Penilaian</a><a href="#faq">FAQ</a><a className="cta" href="#daftar">Daftar</a></nav>
      <header className="hero">
        <small>HAB Kemenag Ke-81</small>
        <h1>Lomba Zikir Maulid Simtudduror</h1>
        <p>Semarakkan syiar shalawat dan zikir Maulid bersama Kantor Kementerian Agama Kabupaten Gayo Lues.</p>
        <a className="btn gold" href="#daftar">Daftarkan Grup Kecamatan Anda</a>
        <div className="chips">
          <div className="chip"><b>{cd}</b><span>{tgl(S.tanggal)}</span></div>
          <div className="chip"><b>{S.jmin}–{S.jmax} orang</b><span>per grup</span></div>
          <div className="chip"><b>{S.durasi} menit</b><span>maks. tampil</span></div>
          <div className="chip"><b>3 juri</b><span>Syariat Islam, Kemenag, MPU</span></div>
        </div>
        {info && <p style={{ margin: "20px auto 0", opacity: 0.92, fontSize: ".92rem" }}>{info}</p>}
      </header>
      <section className="alt"><div className="in">
        <h2>Alur Singkat</h2><p className="sub">Empat langkah dari pendaftaran sampai tampil.</p>
        <div className="steps">
          <div>Isi formulir: online (unggah berkas) atau offline (serahkan berkas fisik).</div>
          <div>Panitia memverifikasi data dan berkas pendaftaran Anda.</div>
          <div>Ikuti undian tampil {S.undian}.</div>
          <div>Hadir {S.hadir} menit sebelum tampil pada {tgl(S.tanggal)}.</div>
        </div>
      </div></section>
      <section id="syarat"><div className="in">
        <h2>Syarat Peserta</h2><p className="sub">Pastikan grup kecamatan Anda memenuhi ketentuan berikut.</p>
        <div className="grid">{lines(S.syarat).map((l, i) => { const [a, b] = pair(l); return <div className="card" key={i}><span className="ic">✓</span><h3>{a}</h3><p>{b}</p></div>; })}</div>
      </div></section>
      <section id="nilai" className="alt"><div className="in">
        <h2>Kriteria Penilaian</h2><p className="sub">Total nilai maksimal {tot}. Durasi maksimal {S.durasi} menit per grup.</p>
        {ks.map(([a, b], i) => (<div className="k" key={i}><div><span>{a}</span><b>{b}</b></div><i><u style={{ width: Math.min(100, ((+b || 0) / tot) * 100) + "%" }} /></i></div>))}
        <p className="hint">Dewan Juri: 3 orang perwakilan Dinas Syariat Islam, Kemenag, dan MPU. Keputusan juri bersifat mutlak.</p>
      </div></section>
      <section id="hadiah"><div className="in">
        <h2>Hadiah</h2><p className="sub">Penyerahan hadiah pada Upacara Peringatan HAB Kemenag Ke-81.</p>
        <div className="prize">
          <div className="card"><span className="ic">🏆</span><b>Juara I, II, III</b><p>Tropi + uang pembinaan</p></div>
          <div className="card"><span className="ic">🥇</span><b>Harapan I, II, III</b><p>Tropi + uang pembinaan</p></div>
          <div className="card"><span className="ic">📜</span><b>Sertifikat</b><p>Untuk para pemenang</p></div>
        </div>
      </div></section>
      <section id="daftar" className="alt"><div className="in fm">
        <h2>Formulir Pendaftaran</h2><p className="sub">Isi dalam 3 langkah. Isian teks tersimpan otomatis di perangkat ini.</p>
        {closed ? <div className="msg err">Pendaftaran sudah ditutup. Silakan hubungi panitia.</div> : <Form S={S} />}
      </div></section>
      <section id="faq"><div className="in">
        <h2>Pertanyaan Umum</h2><p className="sub">&nbsp;</p>
        {lines(S.faq).map((l, i) => { const [a, b] = pair(l); return <details key={i}><summary>{a}</summary><p>{b}</p></details>; })}
      </div></section>
      <footer>Kantor Kementerian Agama Kabupaten Gayo Lues<br />Panitia HAB Kemenag Ke-81 · <a href="/panitia">Masuk panitia</a></footer>
    </>
  );
}
