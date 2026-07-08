import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image base64 is required' }, { status: 400 });
    }

    // Gunakan Google Generative AI resmi (Gemini)
    // Dapatkan API Key GRATIS di https://aistudio.google.com/
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY belum dikonfigurasi di .env.local' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Anda adalah asisten AI ahli yang bertugas mengekstrak daftar menu makanan/minuman dari sebuah gambar buku menu fisik atau papan menu restoran. 
Tugas Anda adalah membaca gambar tersebut dan mengembalikan data dalam format JSON Array MURNI tanpa markdown atau teks pengantar apa pun. 
Setiap objek dalam array harus memiliki struktur berikut:
- name: (string) Nama menu makanan/minuman.
- price: (number) Harga dalam angka murni (tanpa "Rp" atau titik). Misalnya: 25000. Jika harga tidak ada, isi dengan 0.
- description: (string) Deskripsi menu jika ada di gambar, atau kosongkan "" jika tidak ada.
- category: (string) Ambil nama kategori langsung dari tulisan di buku menu (contoh: "Non Coffee", "Signature", "Main Course"). JANGAN PERNAH otomatis mengarang dan memasukkannya ke "Promo" atau "Paket Promo". Jika di gambar tidak ada petunjuk pengelompokan kategori sama sekali, kosongkan saja nilainya (isi dengan "").

KEMBALIKAN HANYA JSON.`;

    // Format Base64 untuk Gemini
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    // Bersihkan markdown jika AI mengembalikannya (misal ```json ... ```)
    let content = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let extractedMenus = [];
    try {
      extractedMenus = JSON.parse(content);
    } catch (parseError) {
      console.error('[AI Menu Extract] Parsing Error:', parseError, content);
      return NextResponse.json({ error: 'Gagal membaca format JSON dari AI', content }, { status: 500 });
    }

    return NextResponse.json({ menus: extractedMenus });

  } catch (error: any) {
    console.error('[AI Menu Extract] Internal Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
