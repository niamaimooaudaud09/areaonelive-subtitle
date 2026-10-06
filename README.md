<<<<<<< HEAD
# areaonelive-subtitle
=======
# Live Subtitle for OBS

เว็บต้นแบบสำหรับ:

Microphone → Browser → Render → Speech-to-Text → Translation → Subtitle → OBS

## Files

- `public/index.html` — หน้า Control Panel
- `public/subtitle.html` — หน้า Subtitle Overlay สำหรับ OBS
- `public/app.js` — ขอไมค์ + ส่ง audio chunks + ตั้งค่า
- `public/subtitle.js` — แสดงซับ
- `public/style.css` — Control UI
- `public/subtitle.css` — Subtitle style
- `server.js` — Render/Node backend
- `.env.example` — ตัวอย่าง environment variables
- `render.yaml` — Render Blueprint

## Run locally

1. ติดตั้ง Node.js 20+
2. `npm install`
3. คัดลอก `.env.example` เป็น `.env`
4. ใส่ `OPENAI_API_KEY`
5. `npm start`
6. เปิด `http://localhost:10000`

## Deploy to Render

1. Push repository นี้ขึ้น GitHub
2. สร้าง Render Web Service จาก GitHub repository
3. Build Command: `npm install`
4. Start Command: `npm start`
5. เพิ่ม Environment Variable:
   - `OPENAI_API_KEY` = API key ของคุณ
   - `TRANSCRIPTION_MODEL` = `gpt-4o-mini-transcribe`
   - `TRANSLATION_MODEL` = `gpt-4.1-mini`
6. เปิด URL ของ Render

## OBS

เพิ่ม Browser Source:

`https://YOUR-RENDER-DOMAIN.onrender.com/subtitle.html`

แนะนำเริ่มด้วย 1920x1080 และเปิด "Shutdown source when not visible" เป็น Off ถ้าต้องการให้ overlay พร้อมตลอด

## หมายเหตุ

เวอร์ชันนี้ใช้ audio chunks ประมาณ 2–5 วินาที เพื่อให้ทำ prototype ได้ง่ายและมี delay แบบ live broadcast เล็กน้อย

สำหรับ production จริง ควรเปลี่ยนจาก chunk upload เป็น WebSocket/Realtime audio pipeline เพื่อให้ latency ต่ำและการแบ่งประโยคเป็นธรรมชาติกว่า
>>>>>>> eb5f694 (initial commit)
