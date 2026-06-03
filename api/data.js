// Vercel Serverless Function：读写云端共享数据（菜谱 + 计划）。
// 数据整体存成一个文档，所有人读写同一份，因此大家看到的内容一致。
//
// 需要的环境变量（在 Vercel 后台创建 Upstash Redis 集成后会自动注入）：
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN

import { Redis } from '@upstash/redis'

const KEY = 'recipe-planner:data'
const EMPTY = { recipes: [], plans: [] }

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export default async function handler(req, res) {
  const redis = getRedis()
  if (!redis) {
    res.status(500).json({ error: '服务器未配置 Redis（UPSTASH_REDIS_REST_URL/TOKEN）' })
    return
  }

  try {
    if (req.method === 'GET') {
      const data = await redis.get(KEY)
      res.status(200).json(data || EMPTY)
      return
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {}
      const doc = {
        recipes: Array.isArray(body.recipes) ? body.recipes : [],
        plans: Array.isArray(body.plans) ? body.plans : [],
      }
      await redis.set(KEY, doc)
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: '只支持 GET / POST' })
  } catch (e) {
    res.status(500).json({ error: '云端读写失败', detail: String(e).slice(0, 300) })
  }
}
