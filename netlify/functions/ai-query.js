// netlify/functions/ai-query.js
// OpenRouter দিয়ে multiple free models — auto-fallback chain

const MODELS = [
  "anthropic/claude-3-haiku",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "nousresearch/nous-capybara-7b:free",
  "openchat/openchat-7b:free",
];

async function callModel(model, messages, systemPrompt) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "https://al-noor.netlify.app",
      "X-Title": "Al-Noor Islamic Learning",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1500,
      temperature: 0.7,
    }),
  });

  const data = await res.json();

  // Rate limit বা token শেষ হলে error throw করো — পরের model try করবে
  if (data.error) {
    const code = data.error.code || data.error.type || "";
    if (
      code === 429 ||
      code === "rate_limit_exceeded" ||
      code === "tokens_exhausted" ||
      String(data.error.message || "").includes("limit")
    ) {
      throw new Error(`MODEL_LIMIT: ${model}`);
    }
    throw new Error(`MODEL_ERROR: ${data.error.message}`);
  }

  if (!data.choices || !data.choices[0]) {
    throw new Error("NO_RESPONSE");
  }

  return data.choices[0].message.content;
}

async function callWithFallback(messages, systemPrompt) {
  for (const model of MODELS) {
    try {
      const result = await callModel(model, messages, systemPrompt);
      return { result, model };
    } catch (err) {
      console.log(`[fallback] ${err.message} — trying next model`);
      continue;
    }
  }
  throw new Error("সব AI model limit শেষ। কিছুক্ষণ পর আবার চেষ্টা করুন।");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { messages, systemPrompt } = JSON.parse(event.body);

    if (!messages || !systemPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "messages ও systemPrompt দরকার" }),
      };
    }

    const { result, model } = await callWithFallback(messages, systemPrompt);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, model }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
