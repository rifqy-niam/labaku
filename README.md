# 📱 Labaku – Lo‑Fi (Tanpa Grafik)
Aplikasi keuangan modern untuk UMKM: pemasukan, pengeluaran, laba bersih otomatis—**tanpa grafik** (lebih ringan).

## Fitur
- Dashboard: Pemasukan, Pengeluaran, Laba Bersih (sesuai mode rekap di Profil).
- Pemasukan (Kasir): nomor nota otomatis, tanggal realtime, hitung total otomatis.
- Pengeluaran: kategori Bahan Baku, Tenaga Kerja, Operasional, total per kategori (harian).
- Rekap Keuangan: filter Harian/Mingguan/Bulanan/Tahunan, daftar transaksi, ekspor CSV.
- Profil Usaha: nama, jenis usaha, mode rekap, diskon & pajak default, tema Light/Dark.
- Offline-ready: data tersimpan di localStorage.

## Jalankan di GitHub Pages
1) Buat repo baru di GitHub, misal `labaku`.
2) Upload semua file ini ke root repo.
3) Buka **Settings → Pages** → Source: `main` dan folder `/ (root)`.
4) Klik **Save**. Tunggu aktif.
5) Akses `https://<username>.github.io/labaku/`

## Catatan
- Tidak membutuhkan backend.
- Hapus data dengan membuka DevTools → Application → Local Storage, lalu clear key `incomes`, `expenses`, `profile`.
