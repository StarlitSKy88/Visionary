// 微信小程序登录工具
// 用于获取用户 openid（支付需要）

const WECHAT_MINI_APPID = process.env.WECHAT_MINI_APPID || ''
const WECHAT_MINI_APPSECRET = process.env.WECHAT_MINI_APPSECRET || ''

interface LoginResult {
  success: boolean
  openid?: string
  session_key?: string
  error?: string
}

/**
 * 小程序登录 - 获取 openid
 * 需要将 code 传到后端，由后端调用微信接口获取 openid
 */
export async function code2Session(code: string): Promise<LoginResult> {
  if (!WECHAT_MINI_APPID || !WECHAT_MINI_APPSECRET) {
    return { success: false, error: '微信配置缺失' }
  }

  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_MINI_APPID}&secret=${WECHAT_MINI_APPSECRET}&js_code=${code}&grant_type=authorization_code`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    const data = await response.json()

    if (data.errcode) {
      return {
        success: false,
        error: data.errmsg || '登录失败'
      }
    }

    return {
      success: true,
      openid: data.openid,
      session_key: data.session_key
    }
  } catch (error) {
    return {
      success: false,
      error: '网络请求失败'
    }
  }
}

/**
 * 验证手机号（也用 code2Session 类似逻辑）
 */
export async function getPhoneNumber(phoneCode: string): Promise<{ success: boolean; phone?: string; error?: string }> {
  // 微信手机号获取需要通过 button 组件的 encryptedData 和 iv
  // 这里先预留接口
  return { success: false, error: '需要前端传递加密数据' }
}