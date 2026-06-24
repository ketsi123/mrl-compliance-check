/**
 * MRL Compliance Check — Google Apps Script
 * Spreadsheet ID: 1-9ugxVpj3CpD_RHKnUvnEgiHotEsxyIPNLkTrE5nkrE
 *
 * Sheets ที่ต้องมีใน Spreadsheet:
 *   - Substances: name | segment | group | aliases
 *   - Standards:  name | label | group | note | country
 *   - Limits:     substance | standard | product | value
 */

const SS_ID = '1-9ugxVpj3CpD_RHKnUvnEgiHotEsxyIPNLkTrE5nkrE';
const HTML_FILE = 'MRL_Compliance_Check_V5.html';

// ── doGet: serve HTML ────────────────────────────────────────
function doGet(e) {
  try {
    const file = DriveApp.getFilesByName(HTML_FILE).next();
    const html = file.getBlob().getDataAsString('UTF-8');
    return HtmlService.createHtmlOutput(html)
      .setTitle('MRL Compliance Check')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    return HtmlService.createHtmlOutput('<h2>Error</h2><pre>'+err.message+'</pre>');
  }
}

// ── doPost: API endpoint ─────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { action } = body;
    let result;

    if      (action === 'read')          result = readDatabase();
    else if (action === 'saveLimit')     result = saveLimit(body);
    else if (action === 'deleteLimit')   result = deleteLimit(body);
    else if (action === 'saveStandard')  result = saveStandard(body);
    else if (action === 'deleteStandard')result = deleteStandard(body);
    else if (action === 'initSheets')    result = initSheets();
    else                                  result = { error: 'Unknown action: ' + action };

    return jsonOut(result);
  } catch(err) {
    return jsonOut({ error: err.message });
  }
}

// ── READ: ดึงข้อมูลทั้งหมดจาก Sheet ────────────────────────
function readDatabase() {
  const ss = SpreadsheetApp.openById(SS_ID);

  // Substances
  const subSheet = ss.getSheetByName('Substances');
  const subRows  = subSheet.getDataRange().getValues();
  const substances = {};
  subRows.slice(1).forEach(r => {
    if (!r[0]) return;
    const name = r[0].toString().trim();
    substances[name] = {
      name, segment: r[1]||'Other', group: r[2]||'Other',
      aliases: r[3] ? r[3].toString().split(',').map(s=>s.trim()).filter(Boolean) : [],
      std_mrls: {}
    };
  });

  // Standards
  const stdSheet = ss.getSheetByName('Standards');
  const stdRows  = stdSheet.getDataRange().getValues();
  const STD_META = {};
  stdRows.slice(1).forEach(r => {
    if (!r[0]) return;
    const name = r[0].toString().trim();
    STD_META[name] = {
      label:   r[1]||name,
      g:       r[2]||'ต่างประเทศ',
      note:    r[3]||'',
      country: r[4]||''
    };
  });

  // Limits
  const limSheet = ss.getSheetByName('Limits');
  const limRows  = limSheet.getDataRange().getValues();
  limRows.slice(1).forEach(r => {
    const sub  = (r[0]||'').toString().trim();
    const std  = (r[1]||'').toString().trim();
    const prod = (r[2]||'').toString().trim();
    const val  = (r[3]||'').toString().trim();
    if (!sub || !std || !prod || !val) return;
    if (!substances[sub]) {
      substances[sub] = { name:sub, segment:'Other', group:'Other', aliases:[], std_mrls:{} };
    }
    if (!substances[sub].std_mrls[std]) substances[sub].std_mrls[std] = {};
    substances[sub].std_mrls[std][prod] = val;
  });

  const DATA = Object.values(substances).filter(s => Object.keys(s.std_mrls).length > 0);
  return { ok: true, DATA, STD_META };
}

// ── SAVE LIMIT ───────────────────────────────────────────────
function saveLimit({ sub, std, prod, val, seg, grp }) {
  const ss = SpreadsheetApp.openById(SS_ID);

  // อัปเดต Limits sheet
  const limSheet = ss.getSheetByName('Limits');
  const limData  = limSheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < limData.length; i++) {
    if (limData[i][0] == sub && limData[i][1] == std && limData[i][2] == prod) {
      limSheet.getRange(i+1, 4).setValue(val);
      found = true; break;
    }
  }
  if (!found) limSheet.appendRow([sub, std, prod, val]);

  // อัปเดต Substances sheet (segment/group)
  if (seg || grp) {
    const subSheet = ss.getSheetByName('Substances');
    const subData  = subSheet.getDataRange().getValues();
    let subFound = false;
    for (let i = 1; i < subData.length; i++) {
      if (subData[i][0] == sub) {
        if (seg) subSheet.getRange(i+1, 2).setValue(seg);
        if (grp) subSheet.getRange(i+1, 3).setValue(grp);
        subFound = true; break;
      }
    }
    if (!subFound) subSheet.appendRow([sub, seg||'Other', grp||'Other', '']);
  }

  return { ok: true, message: 'บันทึกสำเร็จ: '+sub+' × '+std+' × '+prod };
}

// ── DELETE LIMIT ─────────────────────────────────────────────
function deleteLimit({ sub, std, prod }) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const limSheet = ss.getSheetByName('Limits');
  const limData  = limSheet.getDataRange().getValues();
  for (let i = limData.length - 1; i >= 1; i--) {
    if (limData[i][0] == sub && limData[i][1] == std && limData[i][2] == prod) {
      limSheet.deleteRow(i+1);
      return { ok: true, message: 'ลบสำเร็จ' };
    }
  }
  return { ok: false, message: 'ไม่พบรายการ' };
}

// ── SAVE STANDARD ────────────────────────────────────────────
function saveStandard({ name, label, group, note, country }) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const stdSheet = ss.getSheetByName('Standards');
  const stdData  = stdSheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < stdData.length; i++) {
    if (stdData[i][0] == name) {
      stdSheet.getRange(i+1, 1, 1, 5).setValues([[name, label||name, group||'ต่างประเทศ', note||'', country||'']]);
      found = true; break;
    }
  }
  if (!found) stdSheet.appendRow([name, label||name, group||'ต่างประเทศ', note||'', country||'']);
  return { ok: true, message: 'บันทึกมาตรฐานสำเร็จ: '+name };
}

// ── DELETE STANDARD ──────────────────────────────────────────
function deleteStandard({ name }) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const stdSheet = ss.getSheetByName('Standards');
  const stdData  = stdSheet.getDataRange().getValues();
  for (let i = stdData.length - 1; i >= 1; i--) {
    if (stdData[i][0] == name) {
      stdSheet.deleteRow(i+1);
      return { ok: true };
    }
  }
  return { ok: false, message: 'ไม่พบมาตรฐาน' };
}

// ── INIT SHEETS: สร้าง header row ────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);

  const setup = [
    ['Substances', ['name','segment','group','aliases']],
    ['Standards',  ['name','label','group','note','country']],
    ['Limits',     ['substance','standard','product','value']]
  ];

  setup.forEach(([sheetName, headers]) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    const existing = sheet.getRange(1,1,1,headers.length).getValues()[0];
    if (!existing[0]) {
      sheet.getRange(1,1,1,headers.length).setValues([headers]);
      sheet.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#E8EDF5');
    }
  });

  return { ok: true, message: 'สร้าง Sheets สำเร็จ' };
}

// ── Helper ───────────────────────────────────────────────────
function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
