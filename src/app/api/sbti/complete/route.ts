import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/sbti-db'

// 25种人格类型定义
const personalities = [
  { id: "DRAGON", name: "龙啸九天型", emoji: "🐉", cardImage: "01_龙啸九天型.png", dimensions: [90,70,80,60,70,75,80], slogan: "方向盘给我，我来开", desc: "你是那种一言九鼎、说一不二的老板。决策果断，气场强大，员工见到你都绕着走。" },
  { id: "TURTLE", name: "摸鱼大师型", emoji: "🐢", cardImage: "02_摸鱼大师型.png", dimensions: [30,50,20,40,60,20,30], slogan: "能躺着绝不坐着", desc: "你是职场老油条，深谙'能躺着绝不坐着'的真理。任务？能拖就拖，拖不了就应付。" },
  { id: "GIVER", name: "散财童子型", emoji: "💰", cardImage: "03_散财童子型.png", dimensions: [60,80,50,70,95,70,60], slogan: "钱是赚来的，不是省出来的", desc: "你对员工大方，公司现金流在你手里就像水一样流走。但你的员工爱你。" },
  { id: "CLOWN", name: "小丑表演型", emoji: "🤡", cardImage: "04_小丑表演型.png", dimensions: [50,60,40,50,40,80,90], slogan: "人生如戏，全靠演技", desc: "你是办公室的气氛担当，再严肃的场合都能被你整成春晚。你的演技已经炉火纯青。" },
  { id: "DEAD", name: "精神离职型", emoji: "💀", cardImage: "05_精神离职型.png", dimensions: [20,30,30,20,50,10,20], slogan: "我的肉体在工位，灵魂已远走", desc: "你的灵魂早已飘向远方，只剩肉体在工位上机械地敲键盘。对，你就是那个'行尸走肉'。" },
  { id: "FAKE", name: "双面人格型", emoji: "🎭", cardImage: "06_双面人格型.png", dimensions: [70,40,60,30,50,60,70], slogan: "见人说人话，见鬼说鬼话", desc: "你是变色龙，在不同人面前展现不同面孔。面对老板一个样，面对员工又一个样。" },
  { id: "OVERACHIEVER", name: "卷王本王型", emoji: "🔥", cardImage: "07_卷王本王型.png", dimensions: [95,80,90,95,70,95,80], slogan: "卷死你们，我就赢了", desc: "你是办公室卷王，加班到凌晨三点是你的日常。你坚信：只要卷不死，就往死里卷。" },
  { id: "NIGHT_OWL", name: "夜猫子型", emoji: "🌙", cardImage: "08_夜猫子型.png", dimensions: [60,60,50,50,60,95,50], slogan: "深夜才是我的主场", desc: "你是那种白天不干活，深夜疯狂输出的人。灵感总是在凌晨三点敲开你的门。" },
  { id: "EARLY_BIRD", name: "早起鸟型", emoji: "☀️", cardImage: "09_早起鸟型.png", dimensions: [70,70,60,70,60,20,60], slogan: "日出而作，功德圆满", desc: "你是早睡早起的典范，早上六点就在办公室蹲着了。员工都怕你。" },
  { id: "TIGHTWAD", name: "铁公鸡型", emoji: "💸", cardImage: "10_铁公鸡型.png", dimensions: [50,40,30,60,5,50,40], slogan: "一毛不拔，铁公鸡本鸡", desc: "你是一毛不拔的铁公鸡，报销审批能卡则卡。但你的公司账上躺着现金。" },
  { id: "SOCIAL_BUTTERFLY", name: "社交牛人型", emoji: "🎪", cardImage: "11_社交牛人型.png", dimensions: [60,80,50,50,50,60,100], slogan: "社牛本牛，人间交际花", desc: "你是社交天花板，应酬场合你就是主角。觥筹交错间，谈笑风生。" },
  { id: "LONE_WOLF", name: "独狼型", emoji: "🐺", cardImage: "12_独狼型.png", dimensions: [80,30,70,20,60,70,10], slogan: "独来独往，唯我独尊", desc: "你偏好单打独斗，觉得与其和蠢货合作不如自己干。团队？你就是团队。" },
  { id: "EMPEROR", name: "帝王型", emoji: "👑", cardImage: "13_帝王型.png", dimensions: [95,60,70,100,70,60,70], slogan: "君临天下，唯我独尊", desc: "你是帝王心态，所有人都要听你的。君叫臣死臣不得不死，你是老板也是皇帝。" },
  { id: "GOOD_SAMARITAN", name: "老好人型", emoji: "🤝", cardImage: "14_老好人型.png", dimensions: [30,90,20,60,80,50,70], slogan: "你好我好大家好", desc: "你是个好好先生，从不拒绝人。员工找你帮忙你都答应，结果自己累死。" },
  { id: "RISK_TAKER", name: "激进型", emoji: "🚀", cardImage: "15_激进型.png", dimensions: [80,50,100,40,40,70,50], slogan: "富贵险中求，不疯不成事", desc: "你是冒险家，高风险高回报是你的信仰。不博一把怎么知道自己是穷人还是富人？" },
  { id: "CONSERVATIVE", name: "保守型", emoji: "🛡️", cardImage: "16_保守型.png", dimensions: [40,60,10,70,70,40,50], slogan: "稳字当头，不进则退", desc: "你是风险厌恶者，任何变动都让你不安。但你的公司稳如老狗。" },
  { id: "DATA_GEEK", name: "数据控型", emoji: "📊", cardImage: "17_数据控型.png", dimensions: [60,50,40,70,60,60,40], slogan: "一切皆可量化", desc: "你相信数据说话，一切决策都要有数据支撑。凭感觉？不存在的。" },
  { id: "CREATIVE", name: "创意天才型", emoji: "💡", cardImage: "18_创意天才型.png", dimensions: [50,70,60,30,40,80,60], slogan: "点子多到溢出来", desc: "你是点子王，脑子里装满了各种奇思妙想。但大多数都还只是点子。" },
  { id: "EXECUTOR", name: "执行力爆棚型", emoji: "⚡", cardImage: "19_执行力爆棚型.png", dimensions: [90,60,70,80,50,80,50], slogan: "说干就干，绝不废话", desc: "你是行动派，想到了就去做。但有时候鲁莽冲动，三分钟热度。" },
  { id: "PERFECTIONIST", name: "完美主义者型", emoji: "🎯", cardImage: "20_完美主义者型.png", dimensions: [70,70,50,90,50,60,40], slogan: "细节决定成败，完美主义晚期", desc: "你是细节狂魔，一个PPT的颜色都能让你改100遍。你的员工被你折磨疯。" },
  { id: "GO_WITH_FLOW", name: "随波逐流型", emoji: "🌊", cardImage: "21_随波逐流型.png", dimensions: [30,50,30,30,50,40,60], slogan: "船到桥头自然直", desc: "你是佛系老板，一切都随缘。任务布置了能不能完成看天意。" },
  { id: "IRON_FIST", name: "铁腕型", emoji: "💪", cardImage: "22_铁腕型.png", dimensions: [100,30,80,100,40,70,30], slogan: "说一不二，不服就滚", desc: "你是铁腕老板，员工稍有不满就直接fire。你是暴君但公司效率确实高。" },
  { id: "GENTLE", name: "温柔管理型", emoji: "🌸", cardImage: "23_温柔管理型.png", dimensions: [40,95,20,80,70,50,60], slogan: "以德服人，以爱育人", desc: "你是温柔老板，从不对员工发火。但有时候太软弱被欺负。" },
  { id: "ICE_COLD", name: "冷漠疏离型", emoji: "🧊", cardImage: "24_冷漠疏离型.png", dimensions: [60,20,50,40,60,50,20], slogan: "保持距离，保持神秘", desc: "你刻意和员工保持距离，神秘感拉满。没人真正了解你。" },
  { id: "CHAOS", name: "随机冒险型", emoji: "🎲", cardImage: "25_随机冒险型.png", dimensions: [50,60,60,30,50,60,50], slogan: "看心情，看运气", desc: "你是薛定谔的老板，在发火和发糖之间反复横跳。没人知道下一秒你会怎样。" },
  { id: "FOX", name: "狐智型", emoji: "🦊", cardImage: "26_狐智型.png", dimensions: [70,90,50,40,50,70,60], slogan: "狡兔三窟，智珠在握", desc: "你是精明狡猾的老板，看透人心，谈判桌上从不吃亏。员工觉得你深不可测。" },
  { id: "PHOENIX", name: "涅槃型", emoji: "🔥", cardImage: "27_涅槃型.png", dimensions: [70,60,70,50,50,80,80], slogan: "置之死地而后生", desc: "你是打不死的小强，越挫越勇。每次跌倒都能以更华丽姿态站起。" },
  { id: "WHITE_TIGER", name: "白虎型", emoji: "🐯", cardImage: "28_白虎型.png", dimensions: [90,40,80,90,50,50,40], slogan: "杀气腾腾，威震四方", desc: "你是威猛霸气的老板，不怒自威。员工见到你腿就软。" },
  { id: "BLACK_TURTLE", name: "玄武型", emoji: "🐢", cardImage: "29_玄武型.png", dimensions: [60,50,40,80,70,30,50], slogan: "稳如磐石，深不可测", desc: "你是沉稳老练的老板，滴水不漏。永远留有后手，让人摸不透。" },
  { id: "GREEN_DRAGON", name: "青龙型", emoji: "🐲", cardImage: "30_青龙型.png", dimensions: [85,70,75,70,65,65,75], slogan: "东方神兽，统御四方", desc: "你是天赋异禀的领导，四海之内皆臣服。格局大，气场强，天生的领袖。" },
  { id: "VERMILION_BIRD", name: "朱雀型", emoji: "🦅", cardImage: "31_朱雀型.png", dimensions: [60,85,50,40,60,90,70], slogan: "浴火重生，热情如火", desc: "你是热情似火的老板，点燃团队激情。但有时候热情来得快去得也快。" },
  { id: "PIRXIU", name: "貔貅型", emoji: "🦅", cardImage: "32_貔貅型.png", dimensions: [70,30,60,90,10,60,30], slogan: "只进不出，聚财有道", desc: "你是吸金能力超强的老板，账上有钱心里不慌。但员工报销难如登天。" },
  { id: "KIRIN", name: "麒麟型", emoji: "🦄", cardImage: "33_麒麟型.png", dimensions: [50,95,30,70,80,50,80], slogan: "仁厚祥和，祥瑞之兽", desc: "你是仁厚善良的老板，关心员工福祉。公司氛围温馨如家。" },
  { id: "BAIZE", name: "白泽型", emoji: "🦌", cardImage: "34_白泽型.png", dimensions: [60,70,40,80,70,70,50], slogan: "博古通今，睿智如渊", desc: "你是博学多才的老板，知识渊博，洞察秋毫。开会时引经据典，员工佩服。" },
  { id: "KUN_PENG", name: "鲲鹏型", emoji: "🐋", cardImage: "35_鲲鹏型.png", dimensions: [80,60,90,50,60,70,90], slogan: "扶摇直上九万里", desc: "你是格局宏大的老板，想法天马行空。别人看一步，你想百步。但执行力存疑。" },
  { id: "NIAN", name: "年兽型", emoji: "👹", cardImage: "36_年兽型.png", dimensions: [85,20,70,70,40,40,30], slogan: "神秘莫测，不敢近前", desc: "你是传说级老板，江湖上只有你的传说。员工只在年度大会见过你一次。" }
]

// 根据维度得分匹配人格
function matchPersonality(dimensionScores: Record<number, number>) {
  let bestMatch = personalities[0]
  let bestScore = -1

  for (const personality of personalities) {
    let score = 0
    for (let i = 0; i < 7; i++) {
      const diff = Math.abs(personality.dimensions[i] - (dimensionScores[i + 1] || 0))
      score += (100 - diff)
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = personality
    }
  }

  return bestMatch
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '缺少sessionId' },
        { status: 400 }
      )
    }

    // 从数据库获取真实的维度得分
    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session不存在' },
        { status: 404 }
      )
    }

    // 使用 session 中存储的真实维度得分
    const dimensionScores = session.dimensionScores

    // 匹配人格
    const personality = matchPersonality(dimensionScores)

    // 生成报告ID
    const reportId = `RPT${Date.now().toString(36).toUpperCase()}`

    return NextResponse.json({
      success: true,
      personality: {
        id: personality.id,
        name: personality.name,
        title: personality.name,
        emoji: personality.emoji,
        slogan: personality.slogan,
        cardImage: personality.cardImage,
        is_secret: false
      },
      card: {
        name: personality.name,
        title: personality.slogan,
        slogan: personality.slogan,
        good_for: personality.desc,
        avoid: `过度${personality.name.replace(/型/, '')}可能带来的风险`,
        emoji: personality.emoji,
        cardImage: personality.cardImage,
        tags: [
          { icon: '💼', text: '管理风格' },
          { icon: '💰', text: '金钱观' },
          { icon: '⚡', text: '工作风格' }
        ],
        money_score: personality.dimensions[4],
        share_texts: {
          '吐槽风': {
            primary: `我是${personality.name}老板，${personality.slogan}`,
            secondary: '做完CEO-TI测试才发现，我可能是山海经里跑出来的神兽',
            hashtags: '#CEO-TI测试 #山海经老板 #离谱职场'
          },
          '励志风': {
            primary: `测出我是${personality.name}，原来这就是我的领导力密码`,
            secondary: '发掘你的老板天赋，从了解自己开始',
            hashtags: '#CEO-TI #老板人格 #职场成长'
          },
          '商务风': {
            primary: `${personality.name}型老板的职场生存指南`,
            secondary: '专业级老板人格分析，职场人必测',
            hashtags: '#CEO-TI #企业管理 #老板测试'
          }
        }
      },
      shareCode: session.shareCode,
      shareUrl: session.shareUrl,
      shareStatus: {
        opens: session.shareOpens,
        unlocked: session.shareUnlocked,
        remaining: Math.max(0, 3 - session.shareOpens)
      }
    })
  } catch (error) {
    console.error('CEO-TI Complete Error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'CEO-TI Complete API' })
}
