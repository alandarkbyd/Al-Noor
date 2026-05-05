// netlify/functions/surah.js
// Word-by-word সূরা data — quranwbw API + alquran.cloud fallback

exports.handler = async (event) => {
  const surahNumber = parseInt(event.queryStringParameters?.surah || "1");

  if (surahNumber < 1 || surahNumber > 114) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "সূরা নম্বর ১–১১৪ এর মধ্যে হতে হবে" }),
    };
  }

  try {
    // quranwbw.com এর public API
    // language=5 = Bengali word translations
    const wbwRes = await fetch(
      `https://api.quranwbw.com/v1/surah?surah=${surahNumber}&language=5`,
      { headers: { "Accept": "application/json" } }
    );

    if (wbwRes.ok) {
      const wbwData = await wbwRes.json();

      // quranwbw response structure normalize করো
      if (wbwData && wbwData.data) {
        const words = [];
        const verses = wbwData.data.verses || {};

        for (const [verseKey, verseData] of Object.entries(verses)) {
          const ayahNum = verseKey.split(":")[1];
          const wordArr = Array.isArray(verseData) ? verseData : verseData.words || [];

          wordArr.forEach((w, idx) => {
            words.push({
              id: `${surahNumber}:${ayahNum}:${idx + 1}`,
              arabic: w.arabic || w.word_arabic || "",
              transliteration: w.transliteration || w.word_transliteration || "",
              bangla: w.translation || w.word_translation || w.word_meaning || "",
              ayah: parseInt(ayahNum),
              position: idx + 1,
            });
          });
        }

        // সূরার info
        const surahInfo = wbwData.data.surah_info || {};

        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=86400",
          },
          body: JSON.stringify({
            surah_number: surahNumber,
            surah_name_arabic: surahInfo.name_arabic || "",
            surah_name_english: surahInfo.name_english || "",
            surah_name_bangla: surahInfo.name_bengali || "",
            total_ayahs: surahInfo.ayahs_count || 0,
            words,
            source: "quranwbw",
          }),
        };
      }
    }

    // Fallback: alquran.cloud দিয়ে ayah-level data নিয়ে word split করো
    const surahRes = await fetch(
      `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.transliteration,bn.bengali`
    );
    const surahData = await surahRes.json();

    if (surahData.code !== 200) {
      throw new Error("API থেকে data আসেনি");
    }

    const arabicEdition = surahData.data[0];
    const translitEdition = surahData.data[1];
    const bengaliEdition = surahData.data[2];

    const words = [];
    arabicEdition.ayahs.forEach((ayah, ayahIdx) => {
      // প্রতিটি ayah কে word-level এ ভাগ করো
      const arabicWords = ayah.text.split(" ");
      const translitText = translitEdition.ayahs[ayahIdx]?.text || "";
      const bengaliText = bengaliEdition.ayahs[ayahIdx]?.text || "";

      arabicWords.forEach((word, wIdx) => {
        words.push({
          id: `${surahNumber}:${ayah.numberInSurah}:${wIdx + 1}`,
          arabic: word,
          transliteration: wIdx === 0 ? translitText : "",
          bangla: wIdx === 0 ? bengaliText : "",
          ayah: ayah.numberInSurah,
          position: wIdx + 1,
          is_ayah_start: wIdx === 0,
          full_ayah_bangla: bengaliText,
          full_ayah_translit: translitText,
        });
      });
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
      },
      body: JSON.stringify({
        surah_number: surahNumber,
        surah_name_arabic: arabicEdition.name,
        surah_name_english: arabicEdition.englishName,
        surah_name_bangla: arabicEdition.englishName,
        total_ayahs: arabicEdition.numberOfAyahs,
        words,
        source: "alquran-cloud-fallback",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
