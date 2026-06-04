// 根据用户描述修改现有菜谱（保留菜名/结构，按指令调整内容）

const CATEGORIES = ['家常菜', '汤羹', '主食', '甜点', '凉菜', '早餐', '其他']

const SYSTEM_PROMPT = `你是一位耐心的中餐料理老师，帮用户按他们的要求修改现有菜谱。
用户会提供一份现有菜谱（JSON）和修改说明。请输出修改后的完整菜谱，必须是严格的 JSON 对象：
{
  "name": "菜名（字符串）",
  "category": "分类，必须是这几个之一：${CATEGORIES.join('、')}",
  "tags": ["3个以内的简短标签，不要用「新手友好」"],
  "ingredients": [{"name": "食材名", "amount": "用量"}],
  "steps": ["按顺序的做法步骤，每步一句话，写清楚火候和时间"],
  "notes": "给新手的小贴士（一两句话）"
}
要求：
- 只改用户要求相关的部分，未提及的尽量保持原样。
- 若用户要求改菜名、分类、辣度、份量、食材、步骤等，按说明调整。
- 步骤要具体、适合新手，避免模糊说法。
- 只输出 JSON，不要 markdown 代码块或额外说明。`

function recipeForAi(recipe) {
  return {
    name: (recipe.name || '').toString(),
    category: recipe.category || '家常菜',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    notes: (recipe.notes || '').toString(),
  }
}

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

  const instruction = (req.body?.instruction || '').toString().trim()
  const recipe = req.body?.recipe
  if (!instruction) {
    res.status(400).json({ error: '请提供修改说明 instruction' })
    return
  }
  if (instruction.length > 500) {
    res.status(400).json({ error: '修改说明太长了（最多 500 字）' })
    return
  }
  if (!recipe || typeof recipe !== 'object' || !(recipe.name || '').toString().trim()) {
    res.status(400).json({ error: '请提供有效菜谱 recipe' })
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
            content:
              '现有菜谱：\n' +
              JSON.stringify(recipeForAi(recipe), null, 0) +
              '\n\n修改要求：\n' +
              instruction,
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

    let updated
    try {
      updated = JSON.parse(content)
    } catch {
      res.status(502).json({ error: 'AI 返回的不是合法 JSON' })
      return
    }

    res.status(200).json({ recipe: updated })
  } catch (e) {
    res.status(500).json({ error: '请求失败', detail: String(e).slice(0, 300) })
  }
}
