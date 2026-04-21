/**
 * SBTI 精怪人格数据模型
 * 36种山海经精怪人格 + 4个隐藏款
 */

const PERSONALITIES = [
  // ===== 01-09 =====
  {
    id: 'pixiu',
    name: '貔貅',
    title: '铁公鸡里的战斗机',
    d1: 4, d2: 2, d3: 1, d4: 2, d5: 2,
    slogan: '你赚的每分钱都是命根子，掉地上钢镚能追三条街',
    good_for: '现金生意，成本控制、会员沉淀',
    avoid: '千万别投资理财，全存银行最香',
    is_secret: false,
  },
  {
    id: 'taotie',
    name: '饕餮',
    title: '什么都想吃的贪心鬼',
    d1: 1, d2: 2, d3: 1, d4: 2, d5: 3,
    slogan: '别人开店你开店，别人摆摊你包场，最后什么都没捞着',
    good_for: '聚焦单一品类，做深做透',
    avoid: '多元化是毒药，一辈子只干一件事',
    is_secret: false,
  },
  {
    id: 'jiweifox',
    name: '九尾狐',
    title: '八百个心眼子',
    d1: 2, d2: 1, d3: 2, d4: 4, d5: 2,
    slogan: '你的嘴就是印钞机，没有搞不定的客户',
    good_for: '社群运营、关系生意、渠道整合',
    avoid: '别只会干活，不会忽悠',
    is_secret: false,
  },
  {
    id: 'gonggong',
    name: '共工',
    title: '点火就炸的火药桶',
    d1: 2, d2: 3, d3: 4, d4: 2, d5: 3,
    slogan: '员工天天等你辞职，客户看见你都绕道走',
    good_for: '标准流程、雇店长管人',
    avoid: '面对客户是找死，躲后头才是出路',
    is_secret: false,
  },
  {
    id: 'jingwei',
    name: '精卫',
    title: '填海填到死',
    d1: 2, d2: 4, d3: 2, d4: 2, d5: 4,
    slogan: '别人都撤了，你还在扛，最后要么发财要么破产',
    good_for: '刚需产品、长期主义、慢生意',
    avoid: '不是所有坑都值得填，该撤就撤',
    is_secret: false,
  },
  {
    id: 'xingtian',
    name: '刑天',
    title: '没头的实干家',
    d1: 2, d2: 4, d3: 1, d4: 1, d5: 3,
    slogan: '你是店里最累的，赚的还没员工多',
    good_for: '标准化服务、让机器干活',
    avoid: '当老板不是当劳模，该放手就放手',
    is_secret: false,
  },
  {
    id: 'baize',
    name: '白泽',
    title: '什么都知道的万事通',
    d1: 2, d2: 2, d3: 1, d4: 4, d5: 2,
    slogan: '你知道所有内幕，但就是赚不到钱',
    good_for: '信息差、中介、咨询服务',
    avoid: '光知道没用，得下场干',
    is_secret: false,
  },
  {
    id: 'qiongqi',
    name: '穷奇',
    title: '抬杠专业的杠精',
    d1: 2, d2: 2, d3: 2, d4: 2, d5: 4,
    slogan: '你怀疑一切，最后错过所有赚钱机会',
    good_for: '逆向思维、差异化竞争',
    avoid: '别人说好，你偏说No，最后就剩你自己',
    is_secret: false,
  },
  {
    id: 'hundun',
    name: '混沌',
    title: '稀里糊涂的糊涂蛋',
    d1: 2, d2: 2, d3: 1, d4: 2, d5: 1,
    slogan: '不知道自己赚了多少，也不知道亏了多少',
    good_for: '简单生意、现金交易、不记账',
    avoid: '糊涂一时可以，糊涂一世就完了',
    is_secret: false,
  },

  // ===== 10-18 =====
  {
    id: 'zhulong',
    name: '烛龙',
    title: '睁眼天亮闭眼天黑',
    d1: 2, d2: 4, d3: 2, d4: 1, d5: 3,
    slogan: '你的店就是你的命，全年无休，没有生活',
    good_for: '24小时生意、外卖、连锁',
    avoid: '店是你的命，但你不是店的命',
    is_secret: false,
  },
  {
    id: 'kunpeng',
    name: '鲲鹏',
    title: '画大饼的梦想家',
    d1: 2, d2: 2, d3: 4, d4: 2, d5: 1,
    slogan: '想干翻马云，其实连房租都交不起',
    good_for: '借势风口、平台型、追梦型',
    avoid: '没有翅膀，别想飞',
    is_secret: false,
  },
  {
    id: 'qilin',
    name: '麒麟',
    title: '老实巴交的冤大头',
    d1: 1, d2: 2, d3: 2, d4: 2, d5: 2,
    slogan: '对员工比亲妈还好，最后被坑得底朝天',
    good_for: '熟客生意、人情经营、口碑传播',
    avoid: '太善良会被欺负，该狠就得狠',
    is_secret: false,
  },
  {
    id: 'xiezhi',
    name: '獬豸',
    title: '一根筋的法外狂徒',
    d1: 2, d2: 3, d3: 1, d4: 2, d5: 4,
    slogan: '你说对就是对，客户说错就是错，永远不认输',
    good_for: '规则型生意、契约精神、标准化',
    avoid: '赢了道理，输了生意',
    is_secret: false,
  },
  {
    id: 'taowu',
    name: '梼杌',
    title: '油盐不进的滚刀肉',
    d1: 2, d2: 3, d3: 1, d4: 1, d5: 4,
    slogan: '所有人劝你都没用，你永远是对的',
    good_for: '坚持特色、传统老店、百年老卤',
    avoid: '顽固不是优点，是破产的预兆',
    is_secret: false,
  },
  {
    id: 'fenghuang',
    name: '凤凰',
    title: '死了都要折腾的疯子',
    d1: 2, d2: 3, d3: 4, d4: 2, d5: 4,
    slogan: '失败了爬起来，再失败再爬起，次数多了总会赢',
    good_for: '连续创业、极限挑战、高风险项目',
    avoid: '不是所有人都能重生，有些人注定是炮灰',
    is_secret: false,
  },
  {
    id: 'luanniao',
    name: '鸾鸟',
    title: '好好先生和事佬',
    d1: 2, d2: 2, d3: 1, d4: 4, d5: 1,
    slogan: '谁都不得罪，谁都说你好，但就是没人给你送钱',
    good_for: '社群运营、调解服务、合伙生意',
    avoid: '好人缘不等于好生意',
    is_secret: false,
  },
  {
    id: 'bo',
    name: '驳',
    title: '只会正面对刚的莽夫',
    d1: 2, d2: 2, d3: 4, d4: 1, d5: 2,
    slogan: '二话不说就是干，打得过要打，打不过也要打',
    good_for: '正面对抗、抢占市场、并购扩张',
    avoid: '打架赢了，法院输了',
    is_secret: false,
  },
  {
    id: 'jiao',
    name: '狡',
    title: '蹭运气的投机客',
    d1: 2, d2: 2, d3: 2, d4: 3, d5: 2,
    slogan: '你一去哪个店，哪个店就发财，其实跟你没关系',
    good_for: '加盟连锁蹭热度、追风口、资源整合',
    avoid: '没有实力，风过了你就掉下来',
    is_secret: false,
  },

  // ===== 19-27 =====
  {
    id: 'chenghuang',
    name: '乘黄',
    title: '磨蹭到天荒地老',
    d1: 2, d2: 3, d3: 1, d4: 2, d5: 1,
    slogan: '慢慢来比较快，你这辈子应该能看到发财那天',
    good_for: '长周期投资、百年老店、传承生意',
    avoid: '船快沉了，你还在欣赏海景',
    is_secret: false,
  },
  {
    id: 'dangkang',
    name: '当康',
    title: '瞎乐观的傻白甜',
    d1: 2, d2: 2, d3: 1, d4: 2, d5: 2,
    slogan: '天天喊生意好，其实兜里比脸还干净',
    good_for: '心态好型、情绪价值、熬死对手',
    avoid: '盲目乐观是破产的第一步',
    is_secret: false,
  },
  {
    id: 'kuinu',
    name: '夔牛',
    title: '一招鲜吃遍天',
    d1: 2, d2: 4, d3: 2, d4: 1, d5: 2,
    slogan: '就靠这一招，其他什么都不管，吃老本吃到死',
    good_for: '技术型生意、单品爆款、独家秘方',
    avoid: '一招鲜能活，但活不长',
    is_secret: false,
  },
  {
    id: 'bifang',
    name: '毕方',
    title: '自命清高的独行侠',
    d1: 2, d2: 3, d3: 2, d4: 1, d5: 2,
    slogan: '我技术最强，凭什么要跟你合作？最后孤家寡人',
    good_for: '技术壁垒、独特产品、专家型',
    avoid: '曲高和寡，你的客户听不懂你说什么',
    is_secret: false,
  },
  {
    id: 'tiangou',
    name: '天狗',
    title: '整天疑神疑鬼的迫害狂',
    d1: 4, d2: 3, d3: 1, d4: 1, d5: 2,
    slogan: '员工偷你一根葱，你能查三代宗族',
    good_for: '风控型生意、安保、高壁垒行业',
    avoid: '疑心病太重，没人愿意跟你干',
    is_secret: false,
  },
  {
    id: 'leoyu',
    name: '蠃鱼',
    title: '哪边都想蹭的两栖动物',
    d1: 2, d2: 2, d3: 3, d4: 3, d5: 2,
    slogan: '线上线下都想干，最后哪边都没干明白',
    good_for: '跨界融合、OMO、多元化',
    avoid: '脚踏两条船，注定要落水',
    is_secret: false,
  },
  {
    id: 'yayu',
    name: '猰貐',
    title: '被伤过从此黑化的狠人',
    d1: 3, d2: 3, d3: 3, d4: 2, d5: 4,
    slogan: '以前被人坑过，现在发誓要坑回来，赚钱就要心狠',
    good_for: '危机反转、绝地反击、复仇型商业',
    avoid: '仇恨能让你拼命，也能让你进监狱',
    is_secret: false,
  },
  {
    id: 'kaimingshou',
    name: '开明兽',
    title: '门神一样的守财奴',
    d1: 3, d2: 4, d3: 1, d4: 1, d5: 2,
    slogan: '进我店的都是客，想往外掏钱的都是敌人',
    good_for: '防守型生意、收门票、高门槛',
    avoid: '守财奴和守财奴的区别是前者有钱',
    is_secret: false,
  },
  {
    id: 'diting',
    name: '谛听',
    title: '什么都打听的八卦精',
    d1: 2, d2: 1, d3: 1, d4: 4, d5: 2,
    slogan: '你知道所有人的秘密，但秘密不能当饭吃',
    good_for: '情报生意、FA、对接资源',
    avoid: '听来的消息不如自己算的准',
    is_secret: false,
  },

  // ===== 28-36 =====
  {
    id: 'yingzhao',
    name: '英招',
    title: '能打又能舔的和事稀泥',
    d1: 2, d2: 2, d3: 2, d4: 4, d5: 2,
    slogan: '一边打市场一边舔客户，两头都不得罪',
    good_for: '销售型生意、复合能力、多面手',
    avoid: '什么都会一点，什么都不精',
    is_secret: false,
  },
  {
    id: 'qinglong',
    name: '青龙',
    title: '天生就是老大命',
    d1: 2, d2: 2, d3: 4, d4: 4, d5: 2,
    slogan: '别人跟着你能发财，你就是天生的领袖',
    good_for: '领袖型、平台型、带队创业',
    avoid: '一个人能走得快，一群人能走得远',
    is_secret: false,
  },
  {
    id: 'baihu',
    name: '白虎',
    title: '不服就干的战斗狂',
    d1: 2, d2: 2, d3: 4, d4: 1, d5: 2,
    slogan: '打价格战你从来没输过，把对手熬死了你也累死了',
    good_for: '价格战、市场份额争夺、消耗战',
    avoid: '赢了对手，输了利润',
    is_secret: false,
  },
  {
    id: 'zhuque',
    name: '朱雀',
    title: '满嘴跑火车的社交花',
    d1: 2, d2: 2, d3: 1, d4: 4, d5: 2,
    slogan: '你认识的人能坐满三个微信群，但转化成客户的不超过三个',
    good_for: '社交电商、关系型销售，人脉变现',
    avoid: '人脉不等于钱脉',
    is_secret: false,
  },
  {
    id: 'xuanwu',
    name: '玄武',
    title: '阴在心里算账的老狐狸',
    d1: 4, d2: 3, d3: 2, d4: 2, d5: 2,
    slogan: '表面笑嘻嘻，心里打算盘，谁也别想从我兜里掏一分钱',
    good_for: '幕后操盘、批发、高端分销',
    avoid: '太精明的人没人愿意跟他做生意',
    is_secret: false,
  },
  {
    id: 'yinglong',
    name: '应龙',
    title: '开了挂的神级老板',
    d1: 2, d2: 2, d3: 4, d4: 2, d5: 4,
    slogan: '运气实力都有，猪都能飞起来的那种',
    good_for: '天选之人、风口型、命硬型',
    avoid: '时代红利吃完，你就什么都不是',
    is_secret: false,
  },
  {
    id: 'luwu',
    name: '陆吾',
    title: '什么生意都想插一脚',
    d1: 2, d2: 2, d3: 1, d4: 4, d5: 2,
    slogan: '这个也干那个也干，最后发现哪个都没搞懂',
    good_for: '撮合型、中介型、资源整合',
    avoid: '摊子铺太大，总有一个会亏',
    is_secret: false,
  },
  {
    id: 'yeyoushen',
    name: '夜游神',
    title: '就喜欢夜里干活',
    d1: 2, d2: 4, d3: 2, d4: 2, d5: 2,
    slogan: '别人睡觉你干活，别人干活你还在干活',
    good_for: '夜经济、娱乐场所、24小时店',
    avoid: '黑白颠倒，身体先垮',
    is_secret: false,
  },
  {
    id: 'goumang',
    name: '句芒',
    title: '春天到了我就活了',
    d1: 2, d2: 2, d3: 2, d4: 2, d5: 1,
    slogan: '别人旺季我在观望，别人淡季我在准备，等风来再说',
    good_for: '季节型生意、等待型、冷门赛道',
    avoid: '等风来的人，风来了也接不住',
    is_secret: false,
  },
]

// 4个隐藏款
const SECRET_PERSONALITIES = [
  {
    id: 'secret_h1',
    name: '韭菜',
    title: '被收割的冤大头',
    d1: 1, d2: 1, d3: 1, d4: 1, d5: 1,
    slogan: '你不是老板，你是韭菜，被人割了还在帮人数钱',
    good_for: '学习为主，先上班积累经验',
    avoid: '别乱投资，别乱合伙，别信天上掉馅饼',
    is_secret: true,
    secret_trigger: '24题全部选A',
  },
  {
    id: 'secret_h2',
    name: '卷王',
    title: '卷王之王',
    d1: 4, d2: 4, d3: 4, d4: 4, d5: 4,
    slogan: '你不是老板，你是卷王之王，卷到最后发现对手都死了你也差不多了',
    good_for: '极致效率型生意，但记得保命',
    avoid: '卷死自己不如卷死对手，但别把自己卷没了',
    is_secret: true,
    secret_trigger: '24题全部选D',
  },
  {
    id: 'secret_h3',
    name: '墙头草',
    title: '随风倒的老好人',
    d1: 3, d2: 3, d3: 3, d4: 3, d5: 3,
    slogan: '你不是老板，你是墙头草，风往哪吹你就往哪倒，没有主心骨',
    good_for: '跟对老板、抱大腿、做配角',
    avoid: '自己做决定，尤其是大决定',
    is_secret: true,
    secret_trigger: '所有维度都是中等(3分)',
  },
  {
    id: 'secret_h4',
    name: '影帝',
    title: '演老板的演员',
    d1: 2, d2: 2, d3: 2, d4: 2, d5: 2,
    slogan: '你不是老板，你是演员，演老板演得太投入了',
    good_for: '表演型生意、自媒体、网红经济',
    avoid: '别入戏太深，老板是演出来的，不是真当的',
    is_secret: true,
    secret_trigger: '前10题全B + 后14题全C',
  },
]

/**
 * 获取所有36种精怪人格
 */
function getAllPersonalities() {
  return [...PERSONALITIES, ...SECRET_PERSONALITIES]
}

/**
 * 根据ID获取人格
 */
function getPersonalityById(id) {
  const all = getAllPersonalities()
  return all.find(p => p.id === id) || null
}

/**
 * 根据SBTI分数计算最匹配的人格（曼哈顿距离）
 */
function matchPersonality(sbtiScores) {
  const { d1, d2, d3, d4, d5 } = sbtiScores

  let minDistance = Infinity
  let matchedPersonality = null

  for (const p of PERSONALITIES) {
    const distance = Math.abs(d1 - p.d1) + Math.abs(d2 - p.d2) + Math.abs(d3 - p.d3) +
                     Math.abs(d4 - p.d4) + Math.abs(d5 - p.d5)
    if (distance < minDistance) {
      minDistance = distance
      matchedPersonality = p
    }
  }

  return matchedPersonality
}

/**
 * 检测隐藏款触发条件
 */
function detectSecretPersonality(answers, sbtiScores) {
  // H1: 24题全部选A
  const allA = answers.every(a => a === 'A')
  if (allA) return SECRET_PERSONALITIES.find(p => p.id === 'secret_h1')

  // H2: 24题全部选D
  const allD = answers.every(a => a === 'D')
  if (allD) return SECRET_PERSONALITIES.find(p => p.id === 'secret_h2')

  // H3: 所有维度都是3分(中等)
  const { d1, d2, d3, d4, d5 } = sbtiScores
  if (d1 === 3 && d2 === 3 && d3 === 3 && d4 === 3 && d5 === 3) {
    return SECRET_PERSONALITIES.find(p => p.id === 'secret_h3')
  }

  // H4: 前10题全选B + 后14题全选C
  const first10AllB = answers.slice(0, 10).every(a => a === 'B')
  const last14AllC = answers.slice(10).every(a => a === 'C')
  if (first10AllB && last14AllC) {
    return SECRET_PERSONALITIES.find(p => p.id === 'secret_h4')
  }

  return null
}

module.exports = {
  getAllPersonalities,
  getPersonalityById,
  matchPersonality,
  detectSecretPersonality,
  PERSONALITIES,
  SECRET_PERSONALITIES,
}
