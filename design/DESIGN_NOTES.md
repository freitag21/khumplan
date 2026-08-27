# KhumPlan — Design system ("Nocturne", light palette)

ที่มา: Claude Design canvas — "UI mockups for Nocturne light palette"
artifact: https://claude.ai/code/artifact/584ea1f4-8111-4113-9525-79b92f1ba92b

- `nocturne-mockups.html` — ไฟล์ mockup ทั้งหมด (1a–1i) ที่ Claude Design ส่งมา เปิดในเบราว์เซอร์ดูได้
- `nocturne-system.css` — CSS design system เต็ม (tokens + component classes)

## สิ่งที่นำมาใช้ในโค้ดจริง (`src/styles/main.css`)

- **สี**: `--ap-bg #f4f6f9` · `--ap-card #fff` · `--ap-line #e2e7ee` · `--ap-ink #1c2530` · `--ap-ink2 #5b6875`
  · primary `--ap-pri #1f6feb` · **แถบเข้มจุดเดียว** `--ap-deep #12294f` (summary/login/footer)
  · สถานะ ok `#1a9e6a` / warn `#e0902a` / bad `#d64545` / info `#3b82c4` + soft variants
- **ฟอนต์**: Anuphan (ไทย) + IBM Plex Sans Thai fallback, heading weight 600; Inter สำหรับตัวเลข (`.n`, tabular-nums) — โหลดผ่าน Google Fonts
- **คอมโพเนนต์**: `.btn`/`.ap-fill` · `.tag`+`.p-bad/.p-warn/.p-ok/.p-info` · `.card.ap-g` · `.field.ap-f`/`.input` · `.seg`/`.seg-opt` · `.kv` · `.hr` (fading rule)
- radius sm4/md8/lg14 · shadow = hairline `0 0 0 1px` + soft drop

## หน้าที่ทำแล้ว

| mockup | สถานะในโค้ด |
|---|---|
| 1b หน้าผล ทิศทาง A "รายงานที่วางใจได้" | ✅ `src/ui/results.js` (เป็นต้นฉบับพิมพ์ A4) |
| 1f ฟอร์ม stepper 4 ขั้น | ✅ `src/ui/form.js` |
| 1g ล็อกอิน magic link | ✅ `src/ui/pages.js` |
| 1h Landing | ✅ `src/ui/pages.js` |
| 1c / 1d หน้าผล ทิศทาง B / C | ยังไม่ทำ — ใช้คอมโพเนนต์ชุดเดียวกัน สลับได้ภายหลัง |
| 1e หน้าผลมือถือ (มุมมองลูกค้า) | responsive ของ 1b รองรับอยู่ · แบดจ์ตัวแทนล่างจอแบบ sticky ยังไม่ทำ |
| 1i แดชบอร์ดตัวแทน (Module B) | ยังไม่ทำ — เป็นงาน Module B |

## ชื่อ/โลโก้

Claude Design เสนอชื่อสำรอง: "ปกป้อง พลัส" / "Gapview" / "Planway"
ตอนนี้โค้ดใช้ `BRAND = 'KhumPlan'` (ค่าเดียวใน `src/ui/dom.js`) — เปลี่ยนที่เดียว
โลโก้: สี่เหลี่ยมมนสีน้ำเงิน + เส้นหลังคาบ้าน (ดู `logoMark()` ใน `dom.js`)
