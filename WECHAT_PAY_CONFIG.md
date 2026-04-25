# 微信支付配置指南

## 概述

当您准备好接入真实微信支付时，请提供以下配置信息。

## 必需配置

| 配置项 | 环境变量 | 说明 |
|--------|----------|------|
| 微信支付APPID | `WECHAT_APPID` | 微信公众平台应用ID |
| 商户号 | `WECHAT_MCHID` | 微信支付商户号 |
| APIv2密钥 | `WECHAT_APIV2_KEY` | APIv2版本的密钥 |
| APIv3密钥 | `WECHAT_APIV3_KEY` | APIv3版本的密钥 |
| 证书序列号 | `WECHAT_SERIAL_NO` | 商户证书序列号 |
| 私钥 | `WECHAT_PRIVATE_KEY` | 商户私钥（PKCS8格式） |

## 配置方式

### 1. 环境变量 (.env)

```env
# 微信支付配置
WECHAT_APPID=your_appid
WECHAT_MCHID=your_mchid
WECHAT_APIV2_KEY=your_apiv2_key
WECHAT_APIV3_KEY=your_apiv3_key
WECHAT_SERIAL_NO=your_serial_no
WECHAT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----"
```

### 2. 后端API路由

配置代理到后端服务（`next.config.js` 已配置）:

```js
async rewrites() {
  return [
    {
      source: '/api/sbti/:path*',
      destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/sbti/:path*`,
    },
  ]
}
```

## 支付流程

1. **前端发起支付** → `POST /api/sbti/payment`
2. **后端调用微信支付统一下单API** → 获取 `prepay_id`
3. **返回二维码链接** → 前端生成支付二维码
4. **用户扫码支付** → 微信支付回调通知
5. **回调验证签名** → 更新订单状态，解锁报告

## 回调地址配置

在微信支付商户平台配置支付回调地址:
- 回调URL: `https://your-domain.com/api/sbti/callback`

## 测试建议

1. 先使用沙箱环境测试
2. 验证签名逻辑
3. 测试支付回调处理
4. 验证报告解锁功能

## 当前状态

- [x] 支付UI已集成（微信支付按钮 + 二维码弹窗）
- [x] 支付API路由已创建（mock模式）
- [x] 回调处理已创建（待接入真实微信支付）
- [x] 报告解锁机制已就绪

## 下一步

当您提供微信支付配置后，可以：
1. 更新 `/src/app/api/sbti/payment/route.ts` 接入真实微信支付
2. 更新 `/src/app/api/sbti/callback/route.ts` 验证签名
3. 配置数据库记录支付和订单状态
