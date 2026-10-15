// Every fixed line the agent says in the demo. scripts/render-voice.js turns
// each one into public/voice/<id>.mp3, so the stage voice works without Wi-Fi.
export const LINES = {
  greet: 'สวัสดี มีอะไรให้ช่วยไหม',
  unsure: 'ขอโทษนะ ยังไม่เข้าใจ ลองพูดอีกครั้งได้ไหม',
  shop_intro: 'สัปดาห์นี้ยุ่งใช่ไหม เดี๋ยวเช็คอีเมลให้นะ',
  shop_found: 'เจอรายการของที่ต้องซื้อในอีเมลแล้ว จัดให้ตามนี้เลยนะ',
  pay_ask: 'ยอดรวมอยู่ตรงนี้ กด Allow เพื่อยืนยันการจ่ายนะ',
  pay_button_only: 'เรื่องเงิน ต้องกดปุ่ม Allow เองนะ',
  pay_done: 'สั่งเรียบร้อยแล้ว ของจะมาส่งพรุ่งนี้เช้า',
  pay_denied: 'โอเค ยกเลิกแล้ว ไม่มีเงินออกนะ',
  train_intro: 'เมื่อคืนนอนดีมาก วันนี้เหมาะวิ่ง และมีงานวิ่งสิบกิโลเดือนหน้า เดี๋ยวสมัครให้เลยนะ',
  train_done: 'สมัครเรียบร้อย ไปซ้อมกันเลย',
  flight_intro: 'เที่ยวบินพรุ่งนี้ดีเลย์สองชั่วโมง เปลี่ยนเป็นไฟลท์ที่เร็วกว่าไหม',
  flight_done: 'เปลี่ยนให้แล้ว ได้ไฟลท์ใหม่ ถึงทันประชุมแน่นอน',
  flight_keep: 'โอเค ใช้ไฟลท์เดิมนะ',
};
