// netlify/functions/daily-content.js
// প্রতিদিন একটি আয়াত + একটি হাদিস — date-based rotation

exports.handler = async () => {
  try {
    const now = new Date();
    // বছরের কততম দিন — এটা দিয়ে daily rotation
    const dayOfYear = Math.floor(
      (now - new Date(now.getFullYear(), 0, 0)) / 86400000
    );

    // ১. আয়াত — alquran.cloud (free, no key)
    // ১১৪টি সূরার মধ্যে rotate করবে
    const surahNum = (dayOfYear % 114) + 1;
    // আয়াত নম্বর সূরার মধ্যে rotate (max 7 ধরে নিচ্ছি — সব সূরায় কাজ করে)
    const ayahNum = (dayOfYear % 7) + 1;

    const ayatRes = await fetch(
      `https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/editions/quran-uthmani,bn.bengali`
    );
    const ayatData = await ayatRes.json();

    let ayat = null;
    if (ayatData.code === 200 && ayatData.data) {
      const arabic = ayatData.data[0];
      const bangla = ayatData.data[1];
      ayat = {
        arabic: arabic.text,
        bangla: bangla.text,
        surah_name_arabic: arabic.surah.name,
        surah_name_english: arabic.surah.englishName,
        surah_number: surahNum,
        ayah_number: ayahNum,
        reference: `সূরা ${arabic.surah.englishName} (${surahNum}:${ayahNum})`,
      };
    }

    // ২. হাদিস — ahadith.co (free, no key)
    // collection: bukhari, muslim, abudawud, ibnmajah, tirmidhi
    const collections = ["bukhari", "muslim", "abudawud"];
    const col = collections[dayOfYear % collections.length];
    // hadiths সংখ্যা approximate — 7000 এর মধ্যে rotate
    const hadithNum = (dayOfYear * 17) % 1000 + 1;

    const hadithRes = await fetch(
      `https://ahadith.co/api/hadith/${col}/${hadithNum}`
    );
    const hadithData = await hadithRes.json();

    let hadith = null;
    if (hadithData && hadithData.hadith) {
      hadith = {
        text_english: hadithData.hadith.hadithEnglish || hadithData.hadith.text,
        text_arabic: hadithData.hadith.hadithArabic || "",
        reference: `${col.charAt(0).toUpperCase() + col.slice(1)} — হাদিস নং ${hadithNum}`,
        narrator: hadithData.hadith.narrator || "",
      };
    }

    // fallback যদি ahadith.co কাজ না করে
    if (!hadith) {
      const fallbackRes = await fetch(
        `https://random-hadith-generator.vercel.app/${col}/`
      );
      const fallbackData = await fallbackRes.json();
      if (fallbackData && fallbackData.data) {
        hadith = {
          text_english: fallbackData.data.hadith_english,
          text_arabic: fallbackData.data.hadith_arabic || "",
          reference: `${col.charAt(0).toUpperCase() + col.slice(1)} — ${fallbackData.data.refno || ""}`,
          narrator: fallbackData.data.header || "",
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // ১ ঘণ্টা cache
      },
      body: JSON.stringify({ ayat, hadith, dayOfYear }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
