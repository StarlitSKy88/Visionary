/**
 * SBTI 融合测试题系统 v2.0
 * 完全适配「山海经精怪老板SBTI」设计原则：
 * - 极端场景 + 反常识选项 + 一题双维度映射
 * - 灵魂拷问题(50%) + 反常识题(20%) + 场景化拷问题(20%) + 反向验证题(10%)
 */

const QUESTIONS = [
  // ========== 第一组：生存导向维度（抠门vs大方）============

  {
    id: 1,
    question: '你掉在地上的卫龙辣条，三秒内会捡起来吃吗？',
    question_en: 'If your spicy gluten falls on the ground, will you pick it up within 3 seconds?',
    options: [
      { key: 'A', text: '立刻捡起来吹吹就吃，不干不净吃了没病', text_en: 'Pick it up immediately, no pain no gain' },
      { key: 'B', text: '看看周围有没有人，没人就偷偷捡', text_en: 'Check if anyone is looking, then pick up secretly' },
      { key: 'C', text: '太脏了，直接扔垃圾桶', text_en: 'Too dirty, throw it away' },
      { key: 'D', text: '踩一脚再扔，省得别人捡', text_en: 'Step on it then throw it away' },
    ],
    // D1=生存导向(抠门), D2=行为模式, D3=风险偏好, D4=社交, D5=执念
    d_scores: { d1: 5, d2: 1, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'pain_point',
    type: '灵魂拷问题',
  },
  {
    id: 2,
    question: '供应商多给你发了10箱矿泉水，没人知道，你会？',
    question_en: 'The supplier sent you 10 extra boxes of water, no one knows. What will you do?',
    options: [
      { key: 'A', text: '偷偷留下，反正他也发现不了', text_en: 'Keep it secretly, he wont find out' },
      { key: 'B', text: '告诉供应商，让他拉走或者下次扣钱', text_en: 'Tell the supplier, have him pick it up or deduct from next order' },
      { key: 'C', text: '留下5箱，剩下的退回去', text_en: 'Keep 5 boxes, return the rest' },
      { key: 'D', text: '全部留下，给员工当福利', text_en: 'Keep all, give to employees as bonus' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 3, d4: 0, d5: 0 },
    business_dimension: 'financial',
    type: '灵魂拷问题',
  },
  {
    id: 3,
    question: '顾客掉了100块钱在你店里，你会？',
    question_en: 'A customer dropped 100 yuan in your store. What will you do?',
    options: [
      { key: 'A', text: '偷偷揣进自己兜里', text_en: 'Secretly pocket it' },
      { key: 'B', text: '等顾客回来找，没人找就自己留着', text_en: 'Wait for customer to return, keep if no one claims it' },
      { key: 'C', text: '喊住顾客，把钱还给他', text_en: 'Call out to customer and return the money' },
      { key: 'D', text: '把钱放在收银台，贴个失物招领', text_en: 'Put it at the register with a lost and found note' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 0, d4: 1, d5: 0 },
    business_dimension: 'pain_point',
    type: '灵魂拷问题',
  },
  {
    id: 4,
    question: '店里过期3天的牛奶，你会怎么处理？',
    question_en: 'Milk expired 3 days ago. What will you do with it?',
    options: [
      { key: 'A', text: '偷偷改日期，按原价卖', text_en: 'Secretly change the date and sell at full price' },
      { key: 'B', text: '打5折特价处理，说明是临期', text_en: 'Discount to 50% and note it is near expiry' },
      { key: 'C', text: '自己喝或者给员工喝', text_en: 'Drink it myself or give to employees' },
      { key: 'D', text: '直接倒进下水道，怕出事', text_en: 'Pour it down the drain, afraid of trouble' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 5, d4: 0, d5: 0 },
    business_dimension: 'financial',
    type: '反常识题',
  },
  {
    id: 5,
    question: '员工喝剩的半瓶冰红茶，你会？',
    question_en: 'An employee leaves half a bottle of iced tea. What will you do?',
    options: [
      { key: 'A', text: '立刻拧开喝了，不喝白不喝', text_en: 'Immediately drink it, free is free' },
      { key: 'B', text: '放冰箱，第二天自己喝', text_en: 'Put in fridge, drink it tomorrow myself' },
      { key: 'C', text: '让员工扔了，但心里会心疼', text_en: 'Ask employee to throw away, but my heart aches' },
      { key: 'D', text: '直接倒进下水道，嫌脏', text_en: 'Pour it down the drain, too dirty' },
    ],
    d_scores: { d1: 5, d2: 1, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'resource',
    type: '灵魂拷问题',
  },

  // ========== 第二组：行为模式维度（亲力亲为vs甩手掌柜）============

  {
    id: 6,
    question: '店里的厕所，你会亲自打扫吗？',
    question_en: 'Will you personally clean the bathroom in your store?',
    options: [
      { key: 'A', text: '每天都自己扫，员工扫不干净', text_en: 'Clean it myself every day, employees are not clean enough' },
      { key: 'B', text: '没人的时候自己扫，有人的时候让员工扫', text_en: 'Clean it myself when no one is around, let employees do it otherwise' },
      { key: 'C', text: '让员工扫，扫不干净扣工资', text_en: 'Let employees clean, deduct wages if not clean enough' },
      { key: 'D', text: '花钱请保洁，自己绝对不碰', text_en: 'Hire a cleaner, never touch it myself' },
    ],
    d_scores: { d1: 0, d2: 5, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'scale',
    type: '场景化拷问题',
  },
  {
    id: 7,
    question: '凌晨1点刚躺床上，突然想起店里的卷帘门可能没锁，你会？',
    question_en: 'It is 1 AM, you just lay down but suddenly remember the shutter might not be locked. What will you do?',
    options: [
      { key: 'A', text: '立刻穿衣服开车回去检查', text_en: 'Get dressed and drive back to check immediately' },
      { key: 'B', text: '翻手机看监控，确认锁了再睡', text_en: 'Check the surveillance camera on phone, confirm locked before sleeping' },
      { key: 'C', text: '算了，反正有监控，丢不了什么', text_en: 'Forget it, surveillance will catch anything anyway' },
      { key: 'D', text: '骂自己一句，然后失眠到天亮', text_en: 'Curse myself, then stay awake all night' },
    ],
    d_scores: { d1: 0, d2: 5, d3: 1, d4: 0, d5: 0 },
    business_dimension: 'pain_point',
    type: '场景化拷问题',
  },
  {
    id: 8,
    question: '员工请假说家里有事，店里只剩你一个人，你会？',
    question_en: 'An employee asks for leave citing family matters, only you are left in the store. What will you do?',
    options: [
      { key: 'A', text: '不准假，没人看店怎么办', text_en: 'Deny the leave, who will watch the store' },
      { key: 'B', text: '准假，但扣双倍工资', text_en: 'Approve the leave but deduct double wages' },
      { key: 'C', text: '准假，工资照发，自己顶一天', text_en: 'Approve the leave, full pay, I will cover the day' },
      { key: 'D', text: '直接关门一天，自己也休息', text_en: 'Close for the day, I need rest too' },
    ],
    d_scores: { d1: 0, d2: 5, d3: 0, d4: 1, d5: 0 },
    business_dimension: 'resource',
    type: '灵魂拷问题',
  },
  {
    id: 9,
    question: '你会在店里装多少个监控？',
    question_en: 'How many security cameras will you install in your store?',
    options: [
      { key: 'A', text: '每个角落都装，连厕所都装', text_en: 'Every corner, even the bathroom' },
      { key: 'B', text: '收银台、门口、仓库各装一个', text_en: 'One at register, one at door, one at warehouse' },
      { key: 'C', text: '只装收银台一个意思意思', text_en: 'Just one at the register as a token' },
      { key: 'D', text: '不装，相信没人偷东西', text_en: 'Do not install, believe no one steals' },
    ],
    d_scores: { d1: 0, d2: 5, d3: 1, d4: 0, d5: 0 },
    business_dimension: 'resource',
    type: '场景化拷问题',
  },
  {
    id: 10,
    question: '店里的货，你会亲自搬吗？',
    question_en: 'Will you personally carry the goods in your store?',
    options: [
      { key: 'A', text: '所有货都自己搬，员工搬不动', text_en: 'Carry all goods myself, employees cannot handle it' },
      { key: 'B', text: '重货自己搬，轻货让员工搬', text_en: 'I carry heavy goods, employees carry light ones' },
      { key: 'C', text: '全部让员工搬，自己指挥', text_en: 'Let employees carry all, I give orders' },
      { key: 'D', text: '花钱请搬运工，自己绝对不搬', text_en: 'Hire movers, never carry anything myself' },
    ],
    d_scores: { d1: 0, d2: 5, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'scale',
    type: '场景化拷问题',
  },

  // ========== 第三组：风险偏好维度（保守vs激进）============

  {
    id: 11,
    question: '有人找你合伙开分店，投资10万，你会？',
    question_en: 'Someone asks you to open a branch together with 100k investment. What will you do?',
    options: [
      { key: 'A', text: '立刻答应，有钱一起赚', text_en: 'Agree immediately, wealth together' },
      { key: 'B', text: '考虑一个月，没问题再投', text_en: 'Think for a month, invest if no issues' },
      { key: 'C', text: '不合伙，自己干放心', text_en: 'No partnership, I do it myself' },
      { key: 'D', text: '绝对不合伙，合伙必吵架', text_en: 'Absolutely no partnership, partnerships always lead to fights' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 5, d4: 4, d5: 0 },
    business_dimension: 'resource',
    type: '反常识题',
  },
  {
    id: 12,
    question: '对面新开了一家店，打5折抢生意，你家客人全跑了，你会？',
    question_en: 'A new store opens across the street with 50% off, all your customers ran away. What will you do?',
    options: [
      { key: 'A', text: '打3折，跟他干到死', text_en: 'Offer 30% off, fight to the death' },
      { key: 'B', text: '搞会员充值活动，锁老客', text_en: 'Launch membership to retain old customers' },
      { key: 'C', text: '不管他，爱咋咋地', text_en: 'Ignore them, whatever' },
      { key: 'D', text: '转让店铺，换个地方开', text_en: 'Transfer the shop and open elsewhere' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 5, d4: 1, d5: 0 },
    business_dimension: 'competition',
    type: '场景化拷问题',
  },
  {
    id: 13,
    question: '抖音上有个产品爆火了，你会？',
    question_en: 'A product is trending on Douyin. What will you do?',
    options: [
      { key: 'A', text: '立刻进100件，卖完再进', text_en: 'Immediately order 100 pieces, restock when sold out' },
      { key: 'B', text: '先进20件试试水，好卖再补', text_en: 'Order 20 first to test, restock if it sells well' },
      { key: 'C', text: '看看再说，等别人卖火了再进', text_en: 'Wait and see, order after others succeed' },
      { key: 'D', text: '不跟风，卖自己的老产品', text_en: 'Do not follow trends, sell my own products' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 5, d4: 0, d5: 0 },
    business_dimension: 'competition',
    type: '反常识题',
  },
  {
    id: 14,
    question: '你赚了10万块钱，会怎么处理？',
    question_en: 'You earned 100k yuan. What will you do with it?',
    options: [
      { key: 'A', text: '全部投到生意里，扩大规模', text_en: 'Invest all in the business, expand the scale' },
      { key: 'B', text: '一半存银行，一半投生意', text_en: 'Half in bank, half in business' },
      { key: 'C', text: '全部存银行，一分钱不投', text_en: 'Save it all in the bank, not invest a cent' },
      { key: 'D', text: '拿去炒股买彩票', text_en: 'Use it to trade stocks or buy lottery' },
    ],
    d_scores: { d1: 1, d2: 0, d3: 5, d4: 0, d5: 0 },
    business_dimension: 'financial',
    type: '反向验证题',
  },
  {
    id: 15,
    question: '有顾客偷了你店里的东西，被你抓住了，你会？',
    question_en: 'A customer stole something from your store and was caught. What will you do?',
    options: [
      { key: 'A', text: '偷一罚十，不给钱就报警', text_en: '10x fine, call police if no payment' },
      { key: 'B', text: '让他把东西买了，下次别来了', text_en: 'Make him buy it, do not come back' },
      { key: 'C', text: '教育一顿，放他走', text_en: 'Educate him, let him go' },
      { key: 'D', text: '假装没看见，让他走', text_en: 'Pretend not to see, let him go' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 1, d4: 1, d5: 0 },
    business_dimension: 'competition',
    type: '灵魂拷问题',
  },

  // ========== 第四组：社交模式维度（社交型vs反社交型）============

  {
    id: 16,
    question: '能和来买东西的大爷大妈聊半小时家常吗？',
    question_en: 'Can you chat with elderly customers for half an hour?',
    options: [
      { key: 'A', text: '能，我跟谁都能聊', text_en: 'Yes, I can chat with anyone' },
      { key: 'B', text: '勉强能聊几句', text_en: 'Barely, just a few words' },
      { key: 'C', text: '不能，聊不下去', text_en: 'No, I cannot sustain conversation' },
      { key: 'D', text: '看见大爷大妈就头疼', text_en: 'Get a headache just seeing elderly people' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 0, d4: 5, d5: 0 },
    business_dimension: 'pain_point',
    type: '灵魂拷问题',
  },
  {
    id: 17,
    question: '顾客砍价砍到成本价，还说"不便宜我就去对面"，你会？',
    question_en: 'Customer bargains to cost price and says "I will go across the street if not cheaper". What will you do?',
    options: [
      { key: 'A', text: '不卖，宁愿扔了也不亏本', text_en: 'Do not sell, rather throw it away than lose money' },
      { key: 'B', text: '卖给他，少赚点也行', text_en: 'Sell to him, making less is fine' },
      { key: 'C', text: '送个小礼品，不降价', text_en: 'Give a small gift, no discount' },
      { key: 'D', text: '骂他一顿，让他滚', text_en: 'Scold him and tell him to leave' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 0, d4: 1, d5: 0 },
    business_dimension: 'competition',
    type: '灵魂拷问题',
  },
  {
    id: 18,
    question: '你会和隔壁店的老板一起吃饭喝酒吗？',
    question_en: 'Will you have dinner and drinks with the neighboring store owner?',
    options: [
      { key: 'A', text: '经常，都是朋友', text_en: 'Often, we are friends' },
      { key: 'B', text: '偶尔，过年过节聚一下', text_en: 'Occasionally, during holidays' },
      { key: 'C', text: '从不，同行是冤家', text_en: 'Never, competitors are foes' },
      { key: 'D', text: '看见就烦，躲着走', text_en: 'Get annoyed just seeing them, avoid them' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 0, d4: 5, d5: 0 },
    business_dimension: 'competition',
    type: '反向验证题',
  },
  {
    id: 19,
    question: '有顾客在店里大声骂你，说你卖的东西贵，你会？',
    question_en: 'A customer yells at you in the store, saying your stuff is expensive. What will you do?',
    options: [
      { key: 'A', text: '跟他对骂，谁怕谁', text_en: 'Argue back, not afraid of anyone' },
      { key: 'B', text: '耐心解释，给他退钱', text_en: 'Patiently explain, give him a refund' },
      { key: 'C', text: '不理他，让他自己骂', text_en: 'Ignore him, let him yell' },
      { key: 'D', text: '叫保安把他赶出去', text_en: 'Call security to kick him out' },
    ],
    d_scores: { d1: 0, d2: 0, d3: 5, d4: 1, d5: 0 },
    business_dimension: 'pain_point',
    type: '场景化拷问题',
  },
  {
    id: 20,
    question: '有人在你店里发传单，你会？',
    question_en: 'Someone is distributing flyers in your store. What will you do?',
    options: [
      { key: 'A', text: '抢过来撕了，赶出去', text_en: 'Snatch and tear it up, kick them out' },
      { key: 'B', text: '告诉他这里不让发，让他走', text_en: 'Tell them no soliciting here, ask them to leave' },
      { key: 'C', text: '拿一张，让他别发了', text_en: 'Take one, ask them to stop distributing' },
      { key: 'D', text: '不管他，随便发', text_en: 'Do not care, let them distribute' },
    ],
    d_scores: { d1: 0, d2: 5, d3: 0, d4: 1, d5: 0 },
    business_dimension: 'competition',
    type: '反向验证题',
  },

  // ========== 补充题：更多生存导向维度 ==========

  {
    id: 21,
    question: '顾客买完东西少付了你1块钱，走出店门了，你会？',
    question_en: 'A customer underpaid by 1 yuan and walked out of the store. What will you do?',
    options: [
      { key: 'A', text: '立刻追出去，把1块钱要回来', text_en: 'Chase immediately to get the 1 yuan back' },
      { key: 'B', text: '心里骂一句，但算了，不追', text_en: 'Curse internally but let it go, do not chase' },
      { key: 'C', text: '少1块就少1块，无所谓', text_en: '1 yuan less is nothing, do not care' },
      { key: 'D', text: '直接当送他了，还祝他下次再来', text_en: 'Just treat it as a gift, wish them to come again' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'financial',
    type: '灵魂拷问题',
  },
  {
    id: 22,
    question: '店里的塑料袋，你会让顾客尽量少拿吗？',
    question_en: 'Will you limit how many plastic bags customers take?',
    options: [
      { key: 'A', text: '会，一个袋子都不能多给，成本很高', text_en: 'Yes, not one bag extra, cost is too high' },
      { key: 'B', text: '看情况，买得多就多给，买得少就少给', text_en: 'Depends, give more for big purchases, less for small' },
      { key: 'C', text: '随便拿，袋子不值钱', text_en: 'Take as you like, bags are cheap' },
      { key: 'D', text: '主动多给几个，让顾客方便', text_en: 'Proactively give more for customer convenience' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'financial',
    type: '灵魂拷问题',
  },
  {
    id: 23,
    question: '晚上关店，灯和空调你会怎么关？',
    question_en: 'When closing the store at night, how do you handle lights and AC?',
    options: [
      { key: 'A', text: '最后一个人走，全部立刻关掉，一度电都不浪费', text_en: 'Last person turns everything off immediately, not wasting a single kWh' },
      { key: 'B', text: '检查一遍，确保主要耗电的关掉', text_en: 'Check once, ensure major power consumers are off' },
      { key: 'C', text: '偶尔忘关也无所谓，电费没多少钱', text_en: 'Occasionally forgetting is fine, electricity is not expensive' },
      { key: 'D', text: '经常不关，第二天来了再关', text_en: 'Often do not turn off, turn off next morning' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 0, d4: 0, d5: 0 },
    business_dimension: 'financial',
    type: '场景化拷问题',
  },
  {
    id: 24,
    question: '供应商给你的临期赠品（饮料/零食），你会怎么处理？',
    question_en: 'How will you handle near-expiry gifts (drinks/snacks) from suppliers?',
    options: [
      { key: 'A', text: '全部摆上货架当正品卖', text_en: 'Put all on shelf as regular products' },
      { key: 'B', text: '自己吃、员工吃，绝不浪费', text_en: 'Eat myself, give to employees, never waste' },
      { key: 'C', text: '打折卖掉，不浪费也不坑人', text_en: 'Discount and sell, no waste no cheating' },
      { key: 'D', text: '直接扔了，怕出事', text_en: 'Throw away directly, afraid of trouble' },
    ],
    d_scores: { d1: 5, d2: 0, d3: 4, d4: 0, d5: 0 },
    business_dimension: 'resource',
    type: '反常识题',
  },
]

// 生意维度映射（7维度）
const BUSINESS_DIMENSION_MAPPING = {
  location: [12],
  scale: [6, 10],
  financial: [2, 4, 14, 21, 22, 23],
  competition: [12, 13, 15, 18, 20],
  pain_point: [1, 3, 7, 16, 19],
  resource: [5, 8, 9, 11, 24],
  experience: [11, 14, 18, 20],
}

// 题型的中文标签
const TYPE_LABELS = {
  '灵魂拷问题': '💔 灵魂拷问',
  '反常识题': '🤯 反常识',
  '场景化拷问题': '🌙 深夜崩溃',
  '反向验证题': '❌ 绝对不会',
}

/**
 * 获取所有测试题
 */
function getQuestionnaire() {
  return QUESTIONS
}

/**
 * 根据题目ID获取题目
 */
function getQuestionById(id) {
  return QUESTIONS.find(q => q.id === id) || null
}

/**
 * 打乱题目顺序（随机抽取24题）
 */
function shuffleQuestions() {
  const shuffled = [...QUESTIONS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // 返回前24题
  return shuffled.slice(0, 24)
}

/**
 * 将答案映射为SBTI维度分数
 * @param {Array} answers - 答案数组 [{questionId, answer: 'A'|'B'|'C'|'D'}]
 * @returns {Object} {d1, d2, d3, d4, d5}
 */
function mapAnswersToSBTIDimensions(answers) {
  const scores = { d1: 0, d2: 0, d3: 0, d4: 0, d5: 0 }

  for (const { questionId, answer } of answers) {
    const question = getQuestionById(questionId)
    if (!question) continue

    const optionIndex = question.options.findIndex(o => o.key === answer)
    if (optionIndex === -1) continue

    // 选项A=1分, B=2分, C=3分, D=4分（反向：选A最极端）
    const optionScore = optionIndex + 1

    // 累加到对应维度
    const { d_scores } = question
    if (d_scores.d1) scores.d1 += optionScore
    if (d_scores.d2) scores.d2 += optionScore
    if (d_scores.d3) scores.d3 += optionScore
    if (d_scores.d4) scores.d4 += optionScore
    if (d_scores.d5) scores.d5 += optionScore
  }

  return scores
}

/**
 * 将答案映射为生意维度数据
 */
function mapAnswersToBusinessDimensions(answers) {
  const businessData = {
    location: null,
    scale: null,
    financial: null,
    competition: null,
    pain_point: null,
    resource: null,
    experience: null,
  }

  for (const { questionId, answer } of answers) {
    const question = getQuestionById(questionId)
    if (!question) continue

    const dimension = question.business_dimension
    if (!dimension || !businessData.hasOwnProperty(dimension)) continue

    const option = question.options.find(o => o.key === answer)
    if (!option) continue

    if (businessData[dimension]) {
      businessData[dimension] += ' | ' + option.text
    } else {
      businessData[dimension] = option.text
    }
  }

  return businessData
}

/**
 * 计算最终SBTI分数
 */
function calculateSBTIScores(answers) {
  return mapAnswersToSBTIDimensions(answers)
}

/**
 * 获取题目统计
 */
function getQuestionStats() {
  const typeCount = {}
  for (const q of QUESTIONS) {
    typeCount[q.type] = (typeCount[q.type] || 0) + 1
  }
  return {
    total: QUESTIONS.length,
    byType: typeCount,
  }
}

module.exports = {
  getQuestionnaire,
  getQuestionById,
  shuffleQuestions,
  mapAnswersToSBTIDimensions,
  mapAnswersToBusinessDimensions,
  calculateSBTIScores,
  BUSINESS_DIMENSION_MAPPING,
  TYPE_LABELS,
  QUESTIONS_COUNT: 24,
}
