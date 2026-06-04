import { useState } from 'react'
import { isWeChatBrowser } from '../env'

const DISMISS_KEY = 'wechat-hint-dismissed'

export default function WeChatBanner() {
  const [hidden, setHidden] = useState(
    () => !isWeChatBrowser() || sessionStorage.getItem(DISMISS_KEY) === '1',
  )

  if (hidden) return null

  return (
    <div className="wechat-banner" role="status">
      <p>
        微信内输入时页面可能仍会跳动，建议用 Safari 打开或「添加到主屏幕」使用。
      </p>
      <button
        type="button"
        className="wechat-banner-dismiss"
        aria-label="知道了"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, '1')
          setHidden(true)
        }}
      >
        知道了
      </button>
    </div>
  )
}
