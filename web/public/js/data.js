// Default data for each scene. The agent (Claude or the keyword router) sends
// structured data in this shape; the scene fills its UI from it.
export const SCENE_DEFAULTS = {
  payment: {
    merchant: 'FreshMart Online',
    items: [{ name: 'Weekly groceries', qty: 1, price: 849 }],
    total: 849,
    currency: 'THB',
    method: 'U-Card •••• 2026',
    rules: { monthlyBudgetLeft: 5000, perPaymentCap: 2000, allowedShops: ['FreshMart Online', 'Bangkok City Run'] },
  },
  shopping: {
    email: { from: 'Mom', subject: 'ของที่ต้องซื้อสัปดาห์นี้', preview: 'นม ไข่ ขนมปัง ผัก ผลไม้ อย่าลืมนะ' },
    merchant: 'FreshMart Online',
    items: [
      { name: 'Fresh milk 2 L', price: 95 },
      { name: 'Eggs, 10 pack', price: 65 },
      { name: 'Wholewheat bread', price: 59 },
      { name: 'Chicken breast 1 kg', price: 189 },
      { name: 'Vegetable box', price: 249 },
      { name: 'Bananas & apples', price: 192 },
    ],
    currency: 'THB',
  },
  flight: {
    passenger: 'Ploy',
    reason: 'Ground delay at BKK',
    delayMinutes: 120,
    meeting: 'Client meeting, Chiang Mai',
    meetingTime: '11:00',
    old: { code: 'TG 102', from: 'BKK', to: 'CNX', depart: '08:00', arrive: '09:15' },
    proposed: { code: 'FD 3433', from: 'DMK', to: 'CNX', depart: '08:40', arrive: '09:55' },
  },
  training: {
    sleepScore: 86,
    sleepHours: '7 h 40 m',
    restingHr: 54,
    plan: [
      { day: 'Today', run: 'Easy 5 km', pace: '6:30 /km' },
      { day: 'Thu', run: 'Intervals 6 × 400 m', pace: '5:10 /km' },
      { day: 'Sat', run: 'Long 9 km', pace: '6:45 /km' },
    ],
    race: { name: 'Bangkok City 10K', date: '15 Nov 2026', place: 'Lumphini Park', entry: 'Free team slot' },
    runner: { name: 'Ploy Sangthong', email: 'ploy@example.com', shirt: 'M', emergency: '081 234 5678' },
  },
};

export const SCENES = Object.keys(SCENE_DEFAULTS);
