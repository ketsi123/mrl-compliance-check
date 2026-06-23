# MRL Compliance Check

ระบบตรวจสอบสารตกค้างในอาหาร (Maximum Residue Limits) สำหรับสินค้าปศุสัตว์และสัตว์น้ำ

## ข้อมูล
- **275 สาร** (Antibiotic / Pesticide / Other)
- **35 มาตรฐาน** (ต่างประเทศ + ในประเทศ)
- **4 สินค้าหลัก**: Pork, Egg, Chicken, Shrimp

## ฟีเจอร์
| Tab | คำอธิบาย |
|-----|----------|
| 📋 รายการตรวจ | ค้นหาสาร + กรอง MRL แบบ multi-select สินค้า/มาตรฐาน + Export Excel |
| 🔬 ตรวจสอบ Report | อัปโหลด PDF Lab Report → AI วิเคราะห์ PASS/FAIL อัตโนมัติ |
| ⚙️ Admin | CRUD มาตรฐาน/ค่า MRL + Draft Mode + Publish + Audit Log |

## วิธีใช้งาน (Local)

1. ดาวน์โหลด `MRL_Compliance_Check_V5.html`
2. เปิดด้วย browser ได้เลย — ไม่ต้องมี server
3. ใส่ Anthropic API Key ที่ topbar เพื่อใช้ฟีเจอร์ AI (Tab 1)

## Deploy บน Google Drive + Apps Script

### ขั้นตอน

1. **Upload ไฟล์ HTML** ขึ้น Google Drive
   - ไปที่ [drive.google.com](https://drive.google.com)
   - Upload `MRL_Compliance_Check_V5.html`

2. **สร้าง Apps Script**
   - ใน Drive: New → More → Google Apps Script
   - ลบ code เดิม แล้ววาง `Code.gs` ทั้งหมด
   - บันทึก (Ctrl+S)

3. **แก้ชื่อไฟล์** (ถ้าจำเป็น)
   ```js
   const FILE_NAME = 'MRL_Compliance_Check_V5.html';
   ```

4. **Deploy**
   - กด **Deploy** → **New Deployment**
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone** (หรือ Anyone with Google Account)
   - กด **Deploy** → Copy URL

5. **เปิด URL** ได้เลย 🎉

### หมายเหตุ GAS
- GAS มี quota: 6 min/execution, 20k URL fetch/day
- ถ้าต้องการซ่อน API Key ให้เก็บไว้ใน Script Properties แทน:
  ```js
  // ใน Code.gs
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  ```
  แล้วตั้งค่าที่ Project Settings → Script Properties

## โครงสร้างไฟล์

```
├── MRL_Compliance_Check_V5.html   # Single-file web app
├── Code.gs                         # Google Apps Script
├── README.md                       # ไฟล์นี้
└── MRL_Compliance_Database_Prototype.xlsx  # Source data (อ้างอิง)
```

## Tech Stack
- Vanilla HTML/CSS/JS (no framework)
- [PDF.js](https://mozilla.github.io/pdf.js/) — อ่าน PDF
- [SheetJS](https://sheetjs.com/) — Export Excel
- [Anthropic Claude API](https://docs.anthropic.com/) — AI analysis

## Data Schema

### DATA (substances)
```js
{
  name: "Tetracycline",
  segment: "Antibiotic",      // Antibiotic | Pesticide | Other
  group: "Tetracyclines",
  std_mrls: {
    "EU Directive": { "Shrimp": "100", "Pork": "200" },
    "DLD ปศุสัตว์": { "Chicken": "100" }
  },
  aliases: ["TC", "Tetracyclines"]
}
```

### STD_META (standards)
```js
{
  "EU Directive": {
    label: "EU Directive",
    g: "ต่างประเทศ",     // ต่างประเทศ | ในประเทศ
    note: "",
    country: "EU Directive"
  }
}
```

## Admin
- รหัสผ่าน: `1234`
- ข้อมูลบันทึกใน `localStorage` (ต่อ browser)
- Publish → bump version → snapshot ข้อมูล
