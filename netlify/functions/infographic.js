// netlify/functions/infographic.js
// Gemini API দিয়ে সূরার SVG infographic তৈরি করো

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { surah_name, surah_number, total_ayahs, theme } = JSON.parse(event.body);

    if (!surah_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "surah_name দরকার" }),
      };
    }

    // Gemini দিয়ে infographic content তৈরি করো
    const prompt = `
তুমি একজন ইসলামিক content designer। সূরা "${surah_name}" (নম্বর: ${surah_number || "?"}, মোট আয়াত: ${total_ayahs || "?"}) এর জন্য একটি সুন্দর SVG infographic তৈরি করো।

SVG infographic এ এগুলো থাকবে:
1. শিরোনাম: সূরার নাম (আরবিতে + বাংলায়)
2. মূল theme বা বিষয়বস্তু (৩-৫ পয়েন্ট)
3. গুরুত্বপূর্ণ শিক্ষা (২-৩টি)
4. সূরার বৈশিষ্ট্য (মাক্কি/মাদানী, আয়াত সংখ্যা)
5. একটি অনুপ্রেরণামূলক উদ্ধৃতি

SVG rules:
- viewBox="0 0 800 600"
- ইসলামিক রঙ ব্যবহার করো: সবুজ (#1a6b3c), সোনালী (#c9a84c), গাঢ় (#1a2a1a)
- আরবি text এর জন্য font-family="Amiri, serif" এবং direction="rtl"
- বাংলা text এর জন্য font-size ছোট রাখো যাতে ভালো দেখায়
- সুন্দর geometric Islamic pattern background দাও (simple circles/lines)
- card-style layout — সাদা/ক্রিম background এর উপর রঙিন sections
- শুধু SVG code দাও, কোনো explanation নয়, \`\`\` ও নয়
`;

    // API key check
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable set করা নেই");
    }

    // Gemini 2.0 Flash — latest free model
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      if (geminiRes.status === 403) {
        throw new Error("Access Denied (403) — Google Cloud Console এ 'Generative Language API' enable করো: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com");
      }
      if (geminiRes.status === 400) {
        throw new Error("Bad Request (400) — API key সঠিক নয় বা model নাম ভুল");
      }
      throw new Error("Gemini API error " + geminiRes.status + ": " + errText.slice(0, 300));
    }

    const geminiData = await geminiRes.json();
    let svgContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // SVG clean করো
    svgContent = svgContent
      .replace(/```svg\n?/gi, "")
      .replace(/```xml\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    // SVG valid কিনা check করো
    if (!svgContent.includes("<svg")) {
      // Fallback: একটি সুন্দর default SVG বানাও
      svgContent = generateFallbackSVG(surah_name, surah_number, total_ayahs);
    }

    // SVG শুরু না হলে শুধু SVG অংশটুকু extract করো
    const svgStart = svgContent.indexOf("<svg");
    if (svgStart > 0) {
      svgContent = svgContent.substring(svgStart);
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify({ svg: svgContent }),
    };
  } catch (err) {
    console.error("Infographic error:", err);
    // Error হলেও একটি fallback SVG পাঠাও
    const { surah_name, surah_number, total_ayahs } = JSON.parse(event.body || "{}");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        svg: generateFallbackSVG(surah_name || "সূরা", surah_number, total_ayahs),
        fallback: true,
        error: err.message,
      }),
    };
  }
};

function generateFallbackSVG(name, number, ayahs) {
  // Islamic geometric pattern সহ সুন্দর fallback
  return `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" font-family="Georgia, serif">
  <!-- Background -->
  <rect width="800" height="600" fill="#0d2b1a"/>
  <!-- Geometric pattern -->
  <g opacity="0.15" stroke="#c9a84c" stroke-width="1" fill="none">
    <circle cx="400" cy="300" r="250"/>
    <circle cx="400" cy="300" r="200"/>
    <circle cx="400" cy="300" r="150"/>
    <line x1="150" y1="300" x2="650" y2="300"/>
    <line x1="400" y1="50" x2="400" y2="550"/>
    <line x1="223" y1="123" x2="577" y2="477"/>
    <line x1="577" y1="123" x2="223" y2="477"/>
  </g>
  <!-- Main card -->
  <rect x="60" y="40" width="680" height="520" rx="20" fill="#f8f3e8" opacity="0.95"/>
  <!-- Header -->
  <rect x="60" y="40" width="680" height="100" rx="20" fill="#1a6b3c"/>
  <rect x="60" y="100" width="680" height="40" fill="#1a6b3c"/>
  <!-- Title -->
  <text x="400" y="100" text-anchor="middle" font-size="36" font-weight="bold" fill="#c9a84c" font-family="Amiri, Georgia, serif">${name}</text>
  <!-- Surah info -->
  <text x="400" y="175" text-anchor="middle" font-size="18" fill="#1a6b3c" font-weight="bold">সূরা নম্বর: ${number || "—"} | মোট আয়াত: ${ayahs || "—"}</text>
  <!-- Divider -->
  <line x1="120" y1="195" x2="680" y2="195" stroke="#c9a84c" stroke-width="1.5"/>
  <!-- Content boxes -->
  <rect x="90" y="215" width="290" height="120" rx="10" fill="#1a6b3c" opacity="0.1"/>
  <text x="235" y="245" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a6b3c">মূল বিষয়বস্তু</text>
  <text x="235" y="270" text-anchor="middle" font-size="12" fill="#333">আল্লাহর একত্ব ও মহিমা</text>
  <text x="235" y="290" text-anchor="middle" font-size="12" fill="#333">ঈমান ও আমলের গুরুত্ব</text>
  <text x="235" y="310" text-anchor="middle" font-size="12" fill="#333">পরকালের প্রস্তুতি</text>
  <rect x="420" y="215" width="290" height="120" rx="10" fill="#c9a84c" opacity="0.15"/>
  <text x="565" y="245" text-anchor="middle" font-size="14" font-weight="bold" fill="#1a6b3c">গুরুত্বপূর্ণ শিক্ষা</text>
  <text x="565" y="270" text-anchor="middle" font-size="12" fill="#333">তাওয়াক্কুল ও ধৈর্য</text>
  <text x="565" y="290" text-anchor="middle" font-size="12" fill="#333">কৃতজ্ঞতা ও শুকর</text>
  <text x="565" y="310" text-anchor="middle" font-size="12" fill="#333">দোয়া ও ইবাদত</text>
  <!-- Quote box -->
  <rect x="90" y="355" width="620" height="80" rx="10" fill="#1a6b3c" opacity="0.08"/>
  <text x="400" y="385" text-anchor="middle" font-size="13" fill="#555">আল্লাহর কিতাব হলো আলো — যে এটি পড়ে সে পথ পায়,</text>
  <text x="400" y="407" text-anchor="middle" font-size="13" fill="#555">যে বোঝে সে জ্ঞান পায়, যে আমল করে সে সফল হয়।</text>
  <!-- Footer -->
  <rect x="60" y="490" width="680" height="70" rx="20" fill="#1a6b3c" opacity="0.05"/>
  <text x="400" y="525" text-anchor="middle" font-size="13" fill="#1a6b3c">আল-নূর ইসলামিক লার্নিং • Al-Noor Islamic Learning</text>
  <text x="400" y="545" text-anchor="middle" font-size="11" fill="#888">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</text>
</svg>`;
}
