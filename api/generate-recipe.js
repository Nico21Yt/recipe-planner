// Vercel Serverless Function：代为调用 OpenAI 生成菜谱。
// API Key 只从环境变量读取，绝不出现在前端代码或 git 仓库里。
//
// 需要在 Vercel 项目设置里配置环境变量：
//   OPENAI_API_KEY  你的 OpenAI key（必填）
//   OPENAI_MODEL    模型名，默认 gpt-5.4（可选）
//   OPENAI_BASE_URL 接口地址，默认 https://api.openai.com/v1（可选，用代理时改）

const CATEGORIES = ['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '其他']

const SYSTEM_PROMPT = `你是一位耐心的中餐料理老师，专门帮做菜新手写清晰好懂的菜谱。
用户给你一个菜名，你要输出一份适合新手的菜谱，必须是严格的 JSON 对象，字段如下：
{
  "name": "菜名（字符串）",
  "category": "分类，必须是这几个之一：${CATEGORIES.join('、')}",
  "tags": ["3个以内的简短标签，如 快手、下饭、新手友好"],
  "ingredients": [{"name": "食材名", "amount": "用量，如 2个 / 适量 / 1汤匙"}],
  "steps": ["按顺序的做法步骤，每步一句话，写清楚火候和时间，新手能照做"],
  "notes": "给新手的小贴士、容易翻车的点（一两句话）"
}
要求：
- 步骤要具体、按新手视角写，避免“适当翻炒”这类模糊说法，尽量给出时间或状态判断。
- 只输出 JSON，不要任何额外文字、不要 markdown 代码块。`

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

  const dish = (req.body?.dish || '').toString().trim()
  if (!dish) {
    res.status(400).json({ error: '请提供菜名 dish' })
    return
  }
  if (dish.length > 40) {
    res.status(400).json({ error: '菜名太长了' })
    return
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.4'
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
          { role: 'user', content: `请为「${dish}」生成新手菜谱。` },
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

    let recipe
    try {
      recipe = JSON.parse(content)
    } catch {
      res.status(502).json({ error: 'AI 返回的不是合法 JSON' })
      return
    }

    res.status(200).json({ recipe })
  } catch (e) {
    res.status(500).json({ error: '请求失败', detail: String(e).slice(0, 300) })
  }
}
