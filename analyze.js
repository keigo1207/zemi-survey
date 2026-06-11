// AI分析API(Vercelサーバーレス関数)
// APIキーはここに書かず、Vercelの環境変数「ANTHROPIC_API_KEY」に設定する。
// キー未設定の間は { notConfigured: true } を返すだけなので、置いておいて問題なし。

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POSTのみ対応しています" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // APIキーがまだ設定されていない場合(後で有効化する)
    return res.status(200).json({ notConfigured: true });
  }

  try {
    const { summary, count } = req.body || {};
    if (!Array.isArray(summary) || summary.length === 0) {
      return res.status(400).json({ error: "回答データがありません" });
    }

    const prompt = `あなたは大学ゼミのイベント幹事をサポートするアシスタントです。以下はゼミ生${count}名のイベント希望アンケートの回答データ(JSON)です。

${JSON.stringify(summary, null, 1)}

このデータを分析し、必ず次のJSON形式のみで回答してください。前置き・後置き・マークダウンの\`\`\`は一切不要です:
{
 "insights": ["全体の傾向に関する分析を2〜4個。時期・予算・コメントの内容も踏まえること"],
 "proposal": {"title": "最もおすすめの企画案タイトル(1つ)", "detail": "なぜそれが最適か、時期・予算・形式の具体案を含めて150字程度で"},
 "cautions": ["幹事が気をつけるべき点を1〜3個"]
}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: data?.error?.message || "Anthropic APIエラー" });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const analysis = JSON.parse(clean);

    return res.status(200).json({ analysis });
  } catch (e) {
    return res.status(500).json({ error: "分析結果の処理に失敗しました" });
  }
}
