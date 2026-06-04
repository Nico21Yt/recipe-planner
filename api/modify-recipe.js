// 根据用户描述修改现有菜谱（保留菜名/结构，按指令调整内容）

const SYSTEM_PROMPT = `你是一位耐心的中餐料理老师。用户会给你「现有菜谱」和「修改要求」，你要输出修改后的**完整**菜谱 JSON：
{
  "name": "菜名（字符串，除非用户要求改名否则可保持或微调）",
  "ingredients": [{"name": "食材名", "amount": "用量"}],
  "steps": ["按顺序的做法步骤，每步一句话，写清楚火候、温度和时间"],
  "notes": "给新手的小贴士（一两句话）"
}

先判断修改属于哪一类，再执行：

【重做型】——必须**整份推翻重写** ingredients、steps、notes（不是往旧步骤后面追加一句）：
- 换了食材来源或形态：生鲜→预制菜/冷冻/即食、现做→买现成的
- 换了核心做法或器具：油炸↔空气炸锅/烤箱/蒸、复杂预处理↔简单加热
- 用户说「重写」「推翻」「按新的来」「不用原来」「预制」「成品」等
- 做法：删掉旧版里所有不再适用的材料和步骤，按用户新场景从零写一份能直接照做的菜谱。禁止保留矛盾内容（例如预制菜却还写去内脏、腌制、裹粉）。

【微调型】——只改用户点名的部分，其余可保留：
- 例如改份量、咸淡、辣度、去掉某样配菜、步骤写简单点

通用要求：
- 输出的 steps 必须逻辑连贯，只描述**最终版本**该怎么做，不要出现「在原有步骤基础上再…」这种补丁式写法。
- 步骤具体、适合新手；只输出 JSON，不要 markdown 或额外说明。`

function recipeForAi(recipe) {
  return {
    name: (recipe.name || '').toString(),
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
              instruction +
              '\n\n若修改要求改变了食材类型（如改为预制菜）或主要做法（如改为空气炸锅加热），请按【重做型】处理：完整重写材料清单、做法步骤和小贴士，删除旧版中不再适用的内容，不要只在原步骤上追加。',
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
