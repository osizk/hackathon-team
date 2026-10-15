# Idea

**CryptoMate** - "เพื่อนคู่ใจที่ดูแลเงิน crypto ของคุณ ให้ง่ายและปลอดภัย".
A friend that keeps your crypto money easy and safe.
Each decision is also written in [decisions.md](decisions.md).

## Problem

Paying with crypto today is hard and risky. Few shops accept it. There are
fees and price swings. Scams are common.

## Users

- People who hold crypto and want to spend it on everyday things.
- Later: builders of shopping agents who need safe payment rules (the rules
  engine sold as an API).

## What the demo shows

About 3 minutes on stage. The agent's Chrome window is shared next to the web
app.

1. The user types what they want in the web app.
2. The agent shows a marketplace list, labelled 1, 2, 3. The user picks one.
3. A detail view compares price and shipping across shops. The user presses buy.
4. The agent opens the shop, fills the address form and reaches payment.
5. The rules check passes. The owner approves in the web app.
6. The assistant pays with the U-Card in the real U-topia app. This is one
   real small buy, for example a 60 THB coin pouch.
7. A fake concert-ticket seller is blocked: the shop is not on the allowed list.
8. A purchase over the monthly budget is stopped.
9. A slide shows the money story: a 0.5-1% fee per purchase now, the rules
   engine as an API later. No real fee is taken on stage.

## What we will not build

- A real fee charge. The fee is on a slide only.
- Support for shops that block agent browsers, such as Shopee, Lazada and Amazon.
- A U-topia API or SDK. None exists; the agent drives the real app.
- More than one real payment on stage.
- LINE approve and the live agent screen in the web app, unless time allows.

## Open questions

- Final shop. Candidate: NaRaYa on Shopify, coin pouch at 60 THB.
  Runner-up: 7-Eleven ALL Online. Not final.
- U-topia send screens, OTP and network are not yet seen.
- LINE approve and the live agent screen: only if time allows.
