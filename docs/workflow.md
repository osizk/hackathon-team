# Team workflow

Read this page first. Then read [AGENTS.md](../AGENTS.md).

อ่านหน้านี้ก่อน แล้วค่อยอ่าน [AGENTS.md](../AGENTS.md)

## Tools

Each tool has one job.

| Tool | What it is for |
| --- | --- |
| Slack workspace `u-hackathon` | Talking |
| GitHub repo `phittayanan/hackathon-team` | Code, context and tasks |
| Your own agent (Claude Code or Codex) | Building |

เครื่องมือแต่ละตัวมีหน้าที่เดียว

| เครื่องมือ | ใช้ทำอะไร |
| --- | --- |
| Slack workspace `u-hackathon` | คุยกัน |
| GitHub repo `phittayanan/hackathon-team` | เก็บ code, context และงาน (task) |
| agent ของแต่ละคน (Claude Code หรือ Codex) | ใช้สร้างงาน |

## Slack channels

| Channel | What it is for |
| --- | --- |
| `#all-u-hackathon` | General talk |
| `#decisions` | A short summary of each decision. Then write it in [docs/decisions.md](decisions.md). |
| `#build` | Asking `@Claude` or `@Codex` for work |
| `#demo` | Preparing the demo and the pitch |

| Channel | ใช้ทำอะไร |
| --- | --- |
| `#all-u-hackathon` | คุยเรื่องทั่วไป |
| `#decisions` | สรุปสั้น ๆ ของแต่ละเรื่องที่ตัดสินใจแล้ว จากนั้นต้องเขียนลงใน [docs/decisions.md](decisions.md) ด้วย |
| `#build` | สั่งงาน `@Claude` หรือ `@Codex` |
| `#demo` | เตรียม demo และ pitch |

## The one rule

If it was agreed in chat, write it in the repo.
Agents read the repo, not the chat.

ถ้าตกลงอะไรกันในแชท ให้เขียนลงใน repo ด้วย
เพราะ agent อ่าน repo ไม่ได้อ่านแชท

## Roles

| Role | Job |
| --- | --- |
| head | Team lead: the idea, decisions, final review |
| A | Frontend |
| B | Backend and data |
| C | Design and demo (design in Claude Design) |

To pick a role, post your first and second choice in `#all-u-hackathon`.

| Role | หน้าที่ |
| --- | --- |
| head | หัวหน้าทีม: ดูแล idea, ตัดสินใจ, review รอบสุดท้าย |
| A | Frontend |
| B | Backend และ data |
| C | Design และ demo (ทำ design ใน Claude Design) |

วิธีเลือก role: โพสต์ role ที่อยากได้อันดับ 1 และอันดับ 2 ใน `#all-u-hackathon`

## The flow

```text
Idea talk in Slack
        |
        v
Decision written to docs/decisions.md
        |
        v
Issues on GitHub
        |
        v
A teammate picks an issue
        |
        v
Branch  (<issue-number>-<short-slug>)
        |
        v
Their agent builds
        |
        v
Pull request  (paste test and lint output)
        |
        v
One other teammate reviews
        |
        v
Merge to main
```

ขั้นตอนการทำงาน ตามแผนภาพด้านบน:

1. คุยเรื่อง idea กันใน Slack
2. เขียนสิ่งที่ตัดสินใจลงใน `docs/decisions.md`
3. สร้าง issue บน GitHub
4. สมาชิกในทีมเลือก issue ไปทำ
5. สร้าง branch ชื่อ `<issue-number>-<short-slug>`
6. agent ของคนนั้นสร้างงาน
7. เปิด pull request (แปะผล test และ lint ไว้ด้วย)
8. เพื่อนในทีมอีกหนึ่งคน review
9. merge เข้า `main`

## Using agents from Slack

- In `#build`, write: `@Claude <task> in phittayanan/hackathon-team`
- Connect your own Claude account once: open the Claude app Home tab in Slack.
  Then add the repo at <https://claude.ai/code>.
- Claude reads the whole thread. It may follow what other people wrote.
  So keep `#build` for the team only.
- One pull request per session.
- `@Codex` works the same way. You need a ChatGPT Plus plan or higher.
  Install it from the Codex connector settings.
- Each session uses the plan of the person who asks.

---

- ใน `#build` ให้พิมพ์: `@Claude <task> in phittayanan/hackathon-team`
- เชื่อมบัญชี Claude ของตัวเองครั้งเดียว: เปิดแท็บ Home ของ Claude app ใน Slack
  จากนั้นเพิ่ม repo ที่ <https://claude.ai/code>
- Claude อ่านทั้ง thread และอาจทำตามสิ่งที่คนอื่นเขียนไว้ด้วย
  ดังนั้นให้ใช้ `#build` เฉพาะคนในทีมเท่านั้น
- หนึ่ง session ต่อหนึ่ง pull request
- `@Codex` ใช้แบบเดียวกัน แต่ต้องมี ChatGPT Plus ขึ้นไป
  ติดตั้งได้จาก Codex connector settings
- แต่ละ session ใช้ plan ของคนที่สั่งงาน

## Never commit keys or passwords

- The repo is public. Everyone can read it.
- Keys go in `.env`. Git ignores `.env`. See [.env.example](../.env.example).
- If you push a key by mistake, revoke it at once.
  Deleting the commit is not enough: the key is already public.

---

- repo นี้เป็น public ใครก็อ่านได้
- key ให้ใส่ใน `.env` ซึ่ง git จะไม่ commit ไฟล์นี้ ดูตัวอย่างที่ [.env.example](../.env.example)
- ถ้าเผลอ push key ขึ้นไป ให้ revoke key นั้นทันที
  แค่ลบ commit ไม่พอ เพราะ key ถูกเปิดเผยไปแล้ว

## First day checklist

- [ ] Accept the GitHub invite.
- [ ] Join the Slack workspace `u-hackathon`.
- [ ] Connect Claude or Codex.
- [ ] Read [AGENTS.md](../AGENTS.md) and this page.
- [ ] Pick a role in `#all-u-hackathon`.

---

- [ ] กดรับคำเชิญ (invite) ของ GitHub
- [ ] เข้า Slack workspace `u-hackathon`
- [ ] เชื่อมบัญชี Claude หรือ Codex
- [ ] อ่าน [AGENTS.md](../AGENTS.md) และหน้านี้
- [ ] เลือก role ใน `#all-u-hackathon`
