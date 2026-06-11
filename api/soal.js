import Groq from "groq-sdk";

export default async function handler(req, res) {
  // Setup CORS agar API bisa diakses dari Frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
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
    // Inisialisasi di dalam handler agar env variable terbaca sempurna
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    let promptText = "";

    // PROMPT UNTUK SKD (15 SOAL)
    if (type === 'skd') {
      promptText = `
Anda adalah ahli pembuat soal CAT CPNS. Buatkan 15 soal simulasi SKD yang terdiri dari: 5 soal TWK, 5 soal TIU, dan 5 soal TKP.
Output HANYA dalam format JSON MURNI tanpa markdown, tanpa penjelasan.

Format JSON yang DIWAJIBKAN:
{
  "questions": [
    {
      "id": 1,
      "subtest": "TWK",
      "subtestFull": "Tes Wawasan Kebangsaan",
      "tipe": "pilihan_ganda",
      "text": "Pertanyaan studi kasus implementasi Pancasila/Sejarah...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "kunciJawaban": "B",
      "nilai": { "benar": 5, "salah": 0 }
    },
    ... (lanjutkan hingga total 15 soal)
  ]
}
PENTING: Untuk subtest "TKP", Anda TIDAK BOLEH menggunakan "kunciJawaban". Gunakan "nilaiOpsi" (skor 1, 2, 3, 4, 5 untuk masing-masing opsi).
Contoh TKP: "nilaiOpsi": { "A": 1, "B": 2, "C": 5, "D": 3, "E": 4 }
`;
    } 
    // PROMPT UNTUK SKB (10 SOAL)
    else {
      promptText = `
Anda adalah ahli pembuat soal CAT CPNS. Buatkan 10 soal simulasi SKB (Seleksi Kompetensi Bidang) tentang Tata Kelola Administrasi Pemerintahan, Manajemen ASN, dan Pelayanan Publik.
Output HANYA dalam format JSON MURNI tanpa markdown, tanpa penjelasan.

Format JSON yang DIWAJIBKAN:
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
    },
    ... (lanjutkan hingga total 10 soal)
  ]
}`;
    }

    // Memanggil API Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a JSON generator. Always output valid JSON object containing a 'questions' array. Do not include markdown tags like ```json."
        },
        {
          role: "user",
          content: promptText
        }
      ],
      // Menggunakan model cepat dan cerdas Groq untuk meminimalisir Timeout
      model: "llama-3.3-70b-versatile", 
      temperature: 0.5, // Suhu diturunkan agar format JSON lebih stabil
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    // Parsing hasil jawaban AI
    const rawContent = chatCompletion.choices[0]?.message?.content;
    const jsonResult = JSON.parse(rawContent);

    // Kirim JSON ke frontend
    res.status(200).json(jsonResult);

  } catch (error) {
    console.error("Error from Groq API:", error);
    res.status(500).json({ error: "Gagal men-generate soal dari AI", details: error.message });
  }
}
