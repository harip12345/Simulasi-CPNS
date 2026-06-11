import Groq from "groq-sdk";

// Inisialisasi Groq Client
// Pastikan Anda menambahkan Environment Variable GROQ_API_KEY di Dashboard Vercel Anda
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  // Setup CORS agar API bisa diakses dari Frontend (bahkan jika dihosting beda domain)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Bisa diganti URL frontend jika ingin lebih aman
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { type } = req.query;

  if (!type || (type !== 'skd' && type !== 'skb')) {
    return res.status(400).json({ error: "Parameter type harus diisi 'skd' atau 'skb'" });
  }

  try {
    let promptText = "";

    // PROMPT ENGINEER UNTUK SKD
    if (type === 'skd') {
      promptText = `
Anda adalah ahli pembuat soal CAT CPNS. Buatkan 3 soal simulasi SKD yang terdiri dari: 1 soal TWK (Tes Wawasan Kebangsaan), 1 soal TIU (Tes Intelejensi Umum), dan 1 soal TKP (Tes Karakteristik Pribadi).
Output harus BERUPA JSON MURNI tanpa markdown, tanpa penjelasan.

Format JSON yang diwajibkan:
{
  "questions": [
    {
      "id": 1,
      "subtest": "TWK",
      "subtestFull": "Tes Wawasan Kebangsaan",
      "tipe": "pilihan_ganda",
      "text": "Pertanyaan studi kasus implementasi Pancasila...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "kunciJawaban": "B",
      "nilai": { "benar": 5, "salah": 0 }
    },
    {
      "id": 2,
      "subtest": "TIU",
      "subtestFull": "Tes Intelejensi Umum",
      "tipe": "pilihan_ganda",
      "text": "Pertanyaan deret angka atau logika...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "kunciJawaban": "D",
      "nilai": { "benar": 5, "salah": 0 }
    },
    {
      "id": 3,
      "subtest": "TKP",
      "subtestFull": "Tes Karakteristik Pribadi",
      "tipe": "tkp",
      "text": "Pertanyaan skenario pelayanan publik/profesionalisme...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "nilaiOpsi": { "A": 1, "B": 2, "C": 5, "D": 3, "E": 4 }
    }
  ]
}
PENTING: Untuk TKP pastikan menggunakan 'nilaiOpsi' (skor 1-5), bukan 'kunciJawaban'.
`;
    } 
    // PROMPT ENGINEER UNTUK SKB
    else {
      promptText = `
Anda adalah ahli pembuat soal CAT CPNS. Buatkan 2 soal simulasi SKB (Seleksi Kompetensi Bidang) tentang tata kelola administrasi pemerintahan / Manajemen ASN terbaru.
Output harus BERUPA JSON MURNI tanpa markdown, tanpa penjelasan.

Format JSON yang diwajibkan:
{
  "questions": [
    {
      "id": 1,
      "subtest": "SKB",
      "subtestFull": "Seleksi Kompetensi Bidang",
      "tipe": "pilihan_ganda",
      "text": "Pertanyaan manajerial teknis ASN...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "kunciJawaban": "C",
      "nilai": { "benar": 5, "salah": 0 }
    }
  ]
}`;
    }

    // Memanggil API Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an API that outputs strictly valid JSON only. Do not wrap with ```json or markdown."
        },
        {
          role: "user",
          content: promptText
        }
      ],
      // Llama 3 70b sangat mahir menghasilkan JSON sesuai format
      model: "llama3-70b-8192", 
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" } // Memaksa Groq menghasilkan JSON
    });

    // Parsing hasil jawaban AI
    const rawContent = chatCompletion.choices[0]?.message?.content;
    const jsonResult = JSON.parse(rawContent);

    // Kirim JSON ke frontend
    res.status(200).json(jsonResult);

  } catch (error) {
    console.error("Error from Groq API:", error);
    res.status(500).json({ error: "Gagal men-generate soal dari AI" });
  }
}
