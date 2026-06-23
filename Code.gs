/**
 * MRL Compliance Check — Google Apps Script Web App
 * Deploy: Extensions > Apps Script > Deploy > New Deployment > Web App
 *   Execute as: Me
 *   Who has access: Anyone (หรือ Anyone with Google Account)
 *
 * ไฟล์ที่ต้องใส่ใน Google Drive:
 *   - MRL_Compliance_Check_V5.html  (ในโฟลเดอร์เดียวกับ Script หรือระบุ FILE_ID)
 *
 * วิธีใช้งาน:
 *   1. เปิด Google Drive > New > More > Google Apps Script
 *   2. วาง Code.gs นี้ลงไป
 *   3. แก้ค่า FILE_NAME หรือ FILE_ID ให้ตรงกับไฟล์ใน Drive
 *   4. Deploy > New Deployment > Web App
 *   5. Copy URL มาแชร์ได้เลย
 */

// ── CONFIG ──────────────────────────────────────────────
const FILE_NAME = 'MRL_Compliance_Check_V5.html'; // ชื่อไฟล์ใน Drive
const FILE_ID   = '';  // (ทางเลือก) ถ้ารู้ File ID ใส่ตรงนี้จะเร็วกว่า
// ────────────────────────────────────────────────────────

/**
 * GET request — serve HTML file from Drive
 */
function doGet(e) {
  try {
    const html = getHtmlContent();
    return ContentService
      .createTextOutput(html)
      .setMimeType(ContentService.MimeType.HTML);
  } catch (err) {
    return ContentService
      .createTextOutput(`<h2>Error</h2><pre>${err.message}</pre>`)
      .setMimeType(ContentService.MimeType.HTML);
  }
}

/**
 * POST request — proxy Anthropic API (เพื่อซ่อน API Key ไว้ฝั่ง server)
 * Body JSON: { apiKey, messages, model, max_tokens }
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { apiKey, messages, model, max_tokens, system } = body;

    if (!apiKey || !messages) {
      return jsonResponse({ error: 'Missing apiKey or messages' }, 400);
    }

    const payload = {
      model: model || 'claude-sonnet-4-6',
      max_tokens: max_tokens || 4096,
      messages: messages
    };
    if (system) payload.system = system;

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    return jsonResponse(result, response.getResponseCode());

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ── HELPERS ─────────────────────────────────────────────

function getHtmlContent() {
  let file;

  if (FILE_ID) {
    file = DriveApp.getFileById(FILE_ID);
  } else {
    const files = DriveApp.getFilesByName(FILE_NAME);
    if (!files.hasNext()) {
      throw new Error(`ไม่พบไฟล์ชื่อ "${FILE_NAME}" ใน Google Drive`);
    }
    file = files.next();
  }

  return file.getBlob().getDataAsString('UTF-8');
}

function jsonResponse(data, statusCode) {
  // GAS ContentService ไม่รองรับ HTTP status code โดยตรง
  // แต่ client ต้องอ่าน .error field เอง
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── OPTIONAL: Version info ───────────────────────────────

function getVersion() {
  return { version: 'V5', updated: new Date().toISOString() };
}
