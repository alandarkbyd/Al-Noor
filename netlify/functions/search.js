// netlify/functions/search.js
// কোরআন ও হাদিস সার্চ — alquran.cloud + AI fallback

exports.handler = async (event) => {
  const { query, type } = event.queryStringParameters || {};

  if (!query || query.trim().length < 2) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "কমপক্ষে ২ অক্ষর লিখুন" }),
    };
  }

  try {
    if (type === "quran") {
      // alquran.cloud search — Bengali + English দুটোতে
      const [bnRes, enRes] = await Promise.allSettled([
        fetch(
          `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/bn.bengali`
        ),
        fetch(
          `https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/en.sahih`
        ),
      ]);

      const results = [];
      const seen = new Set();

      for (const res of [bnRes, enRes]) {
        if (res.status === "fulfilled" && res.value.ok) {
          const data = await res.value.json();
          if (data.code === 200 && data.data?.matches) {
            for (const match of data.data.matches.slice(0, 10)) {
              const key = `${match.surah.number}:${match.numberInSurah}`;
              if (seen.has(key)) continue;
              seen.add(key);
              results.push({
                type: "quran",
                surah_number: match.surah.number,
                surah_name: match.surah.englishName,
                surah_name_arabic: match.surah.name,
                ayah_number: match.numberInSurah,
                text: match.text,
                reference: `সূরা ${match.surah.englishName} (${match.surah.number}:${match.numberInSurah})`,
              });
            }
          }
        }
      }

      // Result না পেলে AI দিয়ে খুঁজবে
      if (results.length === 0) {
        const aiRes = await fetch(
          `${process.env.URL || ""}/.netlify/functions/ai-query`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemPrompt:
                "তুমি একজন কোরআন বিশেষজ্ঞ। User এর query সম্পর্কিত আয়াত খুঁজে দাও। " +
                "সুরার নাম, নম্বর, আয়াত নম্বর, আরবি টেক্সট ও বাংলা অর্থ সহ দাও। " +
                "JSON format এ দাও: [{surah_name, surah_number, ayah_number, arabic, bangla, reference}]",
              messages: [{ role: "user", content: `Search: ${query}` }],
            }),
          }
        );

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          try {
            const parsed = JSON.parse(aiData.result);
            parsed.forEach((item) =>
              results.push({ ...item, type: "quran", source: "ai" })
            );
          } catch {
            results.push({
              type: "quran",
              text: aiData.result,
              reference: "AI উত্তর",
              source: "ai",
            });
          }
        }
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results, total: results.length }),
      };
    }

    // হাদিস সার্চ — AI দিয়ে
    const aiRes = await fetch(
      `${process.env.URL || ""}/.netlify/functions/ai-query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt:
            "তুমি একজন হাদিস বিশেষজ্ঞ। User এর query সম্পর্কিত হাদিস খুঁজে দাও। " +
            "প্রতিটি হাদিসে: বাংলা অর্থ, আরবি (যদি থাকে), এবং সঠিক reference (বুখারী/মুসলিম/তিরমিযী + নম্বর) দাও। " +
            "JSON format: [{text_bangla, text_arabic, narrator, reference, collection}] — শুধু JSON, আর কিছু না।",
          messages: [
            { role: "user", content: `হাদিস সার্চ করো: ${query}` },
          ],
        }),
      }
    );

    const aiData = await aiRes.json();
    let results = [];

    try {
      const cleaned = aiData.result
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      results = JSON.parse(cleaned);
      results = results.map((r) => ({ ...r, type: "hadith" }));
    } catch {
      results = [
        {
          type: "hadith",
          text_bangla: aiData.result,
          reference: "AI উত্তর",
          source: "ai",
        },
      ];
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results, total: results.length }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
