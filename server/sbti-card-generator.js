/**
 * SBTI 人格卡片生成服务
 * 生成36种精怪+4个隐藏款的人格卡片
 */

const { getPersonalityById } = require('./db/sbti-personalities')

/**
 * 卡片风格配置
 */
const CARD_STYLES = {
  // 吐槽风：文案最扎心，适合转发到老板群
 吐槽风: {
    emoji: '🤣',
    title: '吐槽风',
    color: '#FF6B6B',
    bgGradient: ['#FF6B6B', '#FF8E53'],
  },
  // 励志风：文案积极向上，适合转发到朋友圈
  励志风: {
    emoji: '😊',
    title: '励志风',
    color: '#4ECDC4',
    bgGradient: ['#4ECDC4', '#44A08D'],
  },
  // 商务风：文案简洁专业，适合转发给同行
  商务风: {
    emoji: '📊',
    title: '商务风',
    color: '#667EEA',
    bgGradient: ['#667EEA', '#764BA2'],
  },
}

/**
 * 生成卡片基础数据
 * @param {Object} personality - 人格数据
 * @param {Object} userData - 用户数据（可选）
 * @returns {Object} 卡片数据
 */
function generateCard(personality, userData = {}) {
  if (!personality) {
    return null
  }

  return {
    id: personality.id,
    name: personality.name,
    title: personality.title,
    slogan: personality.slogan,
    good_for: personality.good_for,
    avoid: personality.avoid,
    is_secret: personality.is_secret || false,
    secret_trigger: personality.secret_trigger || null,
    emoji: getPersonalityEmoji(personality.id),
    tags: generateTags(personality),
    style: CARD_STYLES,
  }
}

/**
 * 生成隐藏款特殊样式卡片
 * @param {Object} personality - 人格数据
 * @param {Object} userData - 用户数据
 * @returns {Object} 隐藏款卡片数据
 */
function generateSecretCard(personality, userData = {}) {
  const baseCard = generateCard(personality, userData)

  return {
    ...baseCard,
    is_secret: true,
    secret_style: {
      glow: true,
      border: 'dashed',
      label: '🔒 隐藏款',
    },
  }
}

/**
 * 获取精怪对应的emoji
 */
function getPersonalityEmoji(personalityId) {
  const emojiMap = {
    pixiu: '🐉',
    taotie: '🦁',
    jiweifox: '🦊',
    gonggong: '💥',
    jingwei: '🐦',
    xingtian: '💪',
    baize: '🦄',
    qiongqi: '🦄',
    hundun: '🌫️',
    zhulong: '🐉',
    kunpeng: '🦅',
    qilin: '🦄',
    xiezhi: '⚖️',
    taowu: '🐗',
    fenghuang: '🔥',
    luanniao: '🐦',
    bo: '🐴',
    jiao: '🦌',
    chenghuang: '🐴',
    dangkang: '🐷',
    kuinu: '🐂',
    bifang: '🦅',
    tiangou: '🌙',
    leoyu: '🐟',
    yayu: '🐉',
    kaimingshou: '🦁',
    diting: '🐕',
    yingzhao: '🦄',
    qinglong: '🐲',
    baihu: '🐯',
    zhuque: '🦅',
    xuanwu: '🐢',
    yinglong: '🐉',
    luwu: '🦌',
    yeyoushen: '🌙',
    goumang: '🌱',
    // 隐藏款
    secret_h1: '🥬',
    secret_h2: '👑',
    secret_h3: '🌾',
    secret_h4: '🎭',
  }
  return emojiMap[personalityId] || '🦄'
}

/**
 * 生成标签
 */
function generateTags(personality) {
  const tags = []

  // D1 抠门指数
  if (personality.d1 >= 3) tags.push({ icon: '💰', text: '只进不出' })
  if (personality.d1 <= 2) tags.push({ icon: '🤑', text: '舍得投入' })

  // D2 亲力指数
  if (personality.d2 >= 3) tags.push({ icon: '👐', text: '事必躬亲' })
  if (personality.d2 <= 2) tags.push({ icon: '👔', text: '授权团队' })

  // D3 冒险指数
  if (personality.d3 >= 3) tags.push({ icon: '🎰', text: '敢赌敢冲' })
  if (personality.d3 <= 2) tags.push({ icon: '⚖️', text: '稳扎稳打' })

  // D4 社交指数
  if (personality.d4 >= 3) tags.push({ icon: '🗣️', text: '八面玲珑' })
  if (personality.d4 <= 2) tags.push({ icon: '🤫', text: '埋头干活' })

  // D5 执念指数
  if (personality.d5 >= 3) tags.push({ icon: '💎', text: '永不放弃' })
  if (personality.d5 <= 2) tags.push({ icon: '🔄', text: '懂得变通' })

  return tags
}

/**
 * 生成赚钱潜力评分 (1-5星)
 */
function calculateMoneyScore(personality) {
  // 基于人格特质计算赚钱潜力
  let score = 3 // 基础分

  // 冒险型+社交型更适合赚钱
  if (personality.d3 >= 3) score += 0.5
  if (personality.d4 >= 3) score += 0.5

  // 太抠门或太执着可能影响
  if (personality.d1 >= 4) score -= 0.5
  if (personality.d5 >= 4) score -= 0.5

  return Math.min(5, Math.max(1, Math.round(score)))
}

/**
 * 生成分享文案
 * @param {Object} personality - 人格数据
 * @param {string} style - 卡片风格 '吐槽风' | '励志风' | '商务风'
 * @returns {Object} 分享文案数据
 */
function getCardShareText(personality, style = '吐槽风') {
  const shareTexts = {
    吐槽风: {
      primary: `我测了一下，我是${personality.name}·${personality.title}！说的太准了！`,
      secondary: `快测测你是什么山海经精怪转世的老板👇`,
      hashtags: '#山海经老板测试 #精怪老板 #SBTI测试',
    },
    励志风: {
      primary: `测出我是${personality.name}型老板，我的赚钱之道是：${personality.good_for.split('、')[0]}！`,
      secondary: `想知道你是什么类型的老板吗？戳下方👇`,
      hashtags: '#老板测试 #创业心得 #赚钱干货',
    },
    商务风: {
      primary: `SBTI测试结果：${personality.name}型 | ${personality.title}`,
      secondary: `适合的商业模式：${personality.good_for.split('、')[0]}`,
      hashtags: '#SBTI #商业人格测试 #老板必测',
    },
  }

  return shareTexts[style] || shareTexts['吐槽风']
}

/**
 * 生成完整卡片数据（包含所有风格）
 */
function generateCardWithAllStyles(personality, userData = {}) {
  const baseCard = personality.is_secret
    ? generateSecretCard(personality, userData)
    : generateCard(personality, userData)

  // 生成所有风格的分享文案
  const shareTexts = {}
  for (const style of Object.keys(CARD_STYLES)) {
    shareTexts[style] = getCardShareText(personality, style)
  }

  return {
    ...baseCard,
    money_score: calculateMoneyScore(personality),
    share_texts: shareTexts,
    card_template: {
      ratio: '9:16',
      layout: 'vertical',
      sections: [
        { position: 'top', type: 'emoji_name', height: '33%' },
        { position: 'middle', type: 'slogan_tags', height: '33%' },
        { position: 'bottom', type: 'score_share', height: '34%' },
      ],
    },
  }
}

module.exports = {
  generateCard,
  generateSecretCard,
  generateCardWithAllStyles,
  getCardShareText,
  calculateMoneyScore,
  getPersonalityEmoji,
  generateTags,
  CARD_STYLES,
}
