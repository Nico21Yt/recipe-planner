// 识别冰箱/食材照片中的常备食材（仅名称，无用量）

const SYSTEM_PROMPT = `你是识别中式家常食材的助手。用户上传一张冰箱或厨房里的照片。
请列出照片中能辨认出的食材，只用简短中文名称（如：豆腐、鸡蛋、韭菜、牛奶），不要数量、规格、品牌。
忽略调料瓶上看不清的内容；看不清的不要猜。
必须输出严格 JSON：{"ingredients": ["食材1", "食材2"]}
只输出 JSON，不要 markdown 或其它文字。`

const MAX_IMAGE_CHARS = 6_000_000

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

  const image = (req.body?.image || '').toString().trim()
  if (!image.startsWith('data:image/')) {
    res.status(400).json({ error: '请提供图片 data URL' })
    return
  }
  if (image.length > MAX_IMAGE_CHARS) {
    res.status(400).json({ error: '图片太大，请换一张或重拍' })
    return
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini'
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'

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
            content: [
              {
                type: 'text',
                text: '请识别这张照片里有哪些食材，按 JSON 格式返回。',
              },
              { type: 'image_url', image_url: { url: image } },
            ],
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

    const ingredients = normalizeNames(parsed.ingredients)
    res.status(200).json({ ingredients })
  } catch (e) {
    res.status(500).json({ error: '请求失败', detail: String(e).slice(0, 300) })
  }
}

function normalizeNames(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const name = (item || '').toString().trim()
    if (!name || name.length > 20) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}
