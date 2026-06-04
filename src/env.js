export function isWeChatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent || '')
}
