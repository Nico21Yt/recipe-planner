// 根据现有食材推荐可做的家常菜名

const SYSTEM_PROMPT = `你是中餐家常菜推荐助手。用户给出家里现有的食材列表。
请推荐 3～5 道适合家庭做的菜，菜名简短常见（如：番茄炒蛋、韭菜炒鸡蛋）。
优先用用户已有食材能做出来的菜；可以假设有盐、油、酱油等基础调料。
必须输出严格 JSON：{"dishes": ["菜名1", "菜名2"]}
只输出 JSON，不要 markdown 或其它文字。`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '只支持 POST' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: '服务器未配置 OPENAI_API_KEY' })
    return
  }

  const raw = req.body?.ingredients
  const ingredients = Array.isArray(raw)
    ? raw
        .map((s) => (s || '').toString().trim())
        .filter(Boolean)
        .slice(0, 40)
    : []

  if (ingredients.length === 0) {
    res.status(400).json({ error: '请提供食材列表 ingredients' })
    return
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const list = ingredients.join('、')

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `家里现有食材：${list}。请推荐能做的菜。`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    })

    if (!resp.ok) {
      const detail = await resp.text()
      res.status(502).json({ error: 'AI 接口出错', detail: detail.slice(0, 500) })
      return
    }

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      res.status(502).json({ error: 'AI 没有返回内容' })
      return
    }

    let parsed
    try {
      parsed = JSON.parse(content)
    } catch {
      res.status(502).json({ error: 'AI 返回的不是合法 JSON' })
      return
    }

    const dishes = normalizeDishes(parsed.dishes)
    res.status(200).json({ dishes })
  } catch (e) {
    res.status(500).json({ error: '请求失败', detail: String(e).slice(0, 300) })
  }
}

function normalizeDishes(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const name = (item || '').toString().trim()
    if (!name || name.length > 40) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out.slice(0, 8)
}
