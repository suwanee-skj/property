/**
 * ระบบบริหารทรัพย์สินสาขา v4.2
 * Google Apps Script Web App
 *
 * Script Properties:
 *   DB_FILE_ID              = Spreadsheet ID ของฐานข้อมูล (จำเป็น)
 *   APP_NAME                = ระบบบริหารทรัพย์สินสาขา (ไม่บังคับ)
 *   ASSET_UPLOAD_FOLDER_ID  = Folder ID สำหรับไฟล์รูป/PDF (ระบบสร้างให้ได้อัตโนมัติ)
 *
 * หลังแทน Code.gs / Index.html ให้รัน upgradeAssetSystemV2() หนึ่งครั้ง
 */

const ASSET_APP = {
  VERSION: '4.2.0',
  MASTER_SHEET: 'บันทึกทรัพย์สิน',
  AUDIT_SHEET: 'ตรวจนับทรัพย์สิน',
  HISTORY_SHEET: 'ประวัติทรัพย์สิน',
  USER_SHEET: 'ผู้ใช้งาน',
  CONFIG_SHEET: 'ตั้งค่าระบบ',
  TRANSFER_SHEET: 'โอนทรัพย์สิน',
  MAX_SEARCH_ROWS: 500,
  BRANCHES: [
    'ART','AYA','BKK-AC','BKK-AE','BKK-AU','BKK-DT','BKK-HR','BKK-LG','BKK-MKT','BKK-ST','BKK-TL',
    'CBI','CMI','CPN','CRI','CTI','FLM','HDY','KKN','LHA','LPS','LVT','LXK','LZK','NMA','NST','NWT',
    'OYI','PLK','PTN','RET','SNI','SNK','TRG','UBN','UDN','WHQ'
  ],
  RETIRED_BRANCHES: ['THG','KHP'],
  BRANCH_NAMES: {
    'ART':'สาขาอรัญประเทศ',
    'AYA':'สาขาอยุธยา',
    'BKK-AC':'สำนักงานใหญ่แผนกบัญชี',
    'BKK-AE':'สำนักงานใหญ่แผนกบัญชีนักธุรกิจ',
    'BKK-AU':'สำนักงานใหญ่แผนกตรวจสอบ',
    'BKK-DT':'สำนักงานใหญ่ DATA',
    'BKK-HR':'สำนักงานใหญ่แผนกบุคคล',
    'BKK-LG':'สำนักงานใหญ่แผนกกฎหมาย',
    'BKK-MKT':'สำนักงานใหญ่แผนกการตลาด',
    'BKK-ST':'สำนักงานใหญ่แผนกสโตร์',
    'BKK-TL':'สำนักงานใหญ่แผนก Teller',
    'CBI':'สาขาศรีราชา',
    'CMI':'สาขาเชียงใหม่',
    'CPN':'สาขาชุมพร',
    'CRI':'สาขาเชียงราย',
    'CTI':'สาขาจันทบุรี',
    'FLM':'คลัง Fulfillment',
    'HDY':'สาขาหาดใหญ่',
    'KKN':'สาขาขอนแก่น',
    'LHA':'คลังลาวอาเซียน',
    'LPS':'สาขาปากเซ',
    'LVT':'สาขาเวียงจันทน์',
    'LXK':'สาขาเชียงขวาง',
    'LZK':'สาขาสะหวันนะเขต',
    'NMA':'สาขาโคราช',
    'NST':'สาขานครศรีธรรมราช',
    'NWT':'สาขาย่อยนราธิวาส',
    'OYI':'สาขาสมุทรสาคร',
    'PLK':'สาขาพิษณุโลก',
    'PTN':'สาขาย่อยปัตตานี',
    'RET':'สาขาร้อยเอ็ด',
    'SNI':'สาขาสุราษฎร์ธานี',
    'SNK':'สาขาสกลนคร',
    'TRG':'สาขาตรัง',
    'UBN':'สาขาอุบลราชธานี',
    'UDN':'สาขาย่อยอุดรธานี',
    'WHQ':'คลังใหญ่'
  },
  ASSET_STATUSES: ['ใช้งาน','ตัดจำหน่าย(ขายซาก)','ส่งให้สาขา','รับจากสาขา'],
  AUDIT_STATUSES: ['พบและปกติ','พบแต่ชำรุด','ไม่พบ','ย้ายตำแหน่ง','ย้ายสาขา','รอจำหน่าย'],
  TRANSFER_STATUSES: ['รอส่ง','ระหว่างโอน','รอรับ','รับเรียบร้อย','ยกเลิก'],
  MASTER_HEADERS: {
    assetId: ['รหัสทรัพย์สิน'],
    assetName: ['ชื่อทรัพยสิน','ชื่อทรัพย์สิน'],
    serialNo: ['SeriaINO','SerialNo','Serial No.','Serial No'],
    assetType: ['ประเภททรัพย์สิน'],
    branch: ['สาขาที่ตั้ง','สาขา'],
    purchaseDate: ['ว/ด/ป จัดซื้อ','วันที่จัดซื้อ'],
    price: ['ราคาทรัพย์สิน(ก่อน VAT)','ราคาทรัพย์สิน'],
    quantity: ['จำนวนทรัพย์สิน','จำนวน'],
    brand: ['ยี่ห้อ'],
    model: ['รุ่น/สี','รุ่น'],
    image: ['รูปทรัพย์สิน'],
    barcode: ['บาร์โค้ชทรัพย์สิน','บาร์โค้ดทรัพย์สิน','QR/Barcode'],
    receipt: ['ใบเสร็จทรัพย์สิน','ใบเสร็จ'],
    custodian: ['ผู้ดูแลทรัพย์สิน'],
    custodianSign: ['ลายเซ็นผู้ดูแล'],
    purchaser: ['ผู้จัดซื้อ'],
    purchaserSign: ['รายเซ็นผู้จัดซื้อ','ลายเซ็นผู้จัดซื้อ'],
    accountant: ['เจ้าหน้าที่บัญชี ','เจ้าหน้าที่บัญชี'],
    accountantSign: ['ลายเซ็นเจ้าหน้าที่บัญชี'],
    auditor: ['ผู้ตรวจสอบ'],
    auditorSign: ['ลายเซ็นผู้ตรวจสอบ'],
    pdf: ['PDF','PDF URL'],
    recordDate: ['วันที่บันทึกทรัพย์สิน'],
    assetStatus: ['สถานะทรัพย์สิน'],
    statusNote: ['หมายเหตุสถานะ'],
    statusUpdated: ['วันที่อัปเดตสถานะ'],
    source: ['แหล่งที่มา']
  }
};

function doGet() {
  const appName = PropertiesService.getScriptProperties().getProperty('APP_NAME') || 'ระบบบริหารทรัพย์สินสาขา';
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** ใช้แทน setup เดิมได้ และรันซ้ำได้โดยไม่ลบข้อมูล */
function setupAssetSystem() {
  return upgradeAssetSystemV2();
}

/** รันครั้งเดียวหลังอัปเดตเป็น v2 */
function upgradeAssetSystemV2() {
  const ss = getDb_();
  const master = ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  if (!master) throw new Error('ไม่พบชีต "' + ASSET_APP.MASTER_SHEET + '"');

  ensureMasterColumns_(master);

  ensureSheet_(ss, ASSET_APP.AUDIT_SHEET, [
    'Audit ID','รหัสทรัพย์สิน','วันที่ตรวจ','ผลการตรวจ','สาขาตามทะเบียน','สาขาที่ตรวจพบ',
    'ตำแหน่ง/จุดติดตั้ง','ผู้ตรวจ','อีเมลผู้ตรวจ','หมายเหตุ','รูปหลักฐาน URL','วันที่บันทึก','แก้ไขล่าสุด'
  ]);
  ensureSheet_(ss, ASSET_APP.HISTORY_SHEET, [
    'History ID','รหัสทรัพย์สิน','วันที่เวลา','ประเภทเหตุการณ์','รายละเอียดเดิม','รายละเอียดใหม่',
    'สาขา','ผู้ดำเนินการ','อีเมล','หมายเหตุ'
  ]);
  ensureSheet_(ss, ASSET_APP.USER_SHEET, [
    'อีเมล','ชื่อผู้ใช้','บทบาท','สาขา','ดูข้อมูล','แก้ไขทะเบียน','ตรวจนับ','ดูรายงาน','จัดการระบบ','ใช้งาน',
    'แก้ไขล่าสุด','แก้ไขโดย','รหัสผ่าน Hash','Password Salt','เข้าสู่ระบบล่าสุด'
  ]);
  ensureUserColumns_(ss);
  ensureSheet_(ss, ASSET_APP.CONFIG_SHEET, ['ประเภทการตั้งค่า','รหัส','ชื่อ','ค่า','ใช้งาน','หมายเหตุ']);
  ensureSheet_(ss, ASSET_APP.TRANSFER_SHEET, [
    'Transfer ID','รหัสทรัพย์สิน','ชื่อทรัพย์สิน','สาขาต้นทาง','สาขาปลายทาง','วันที่สร้างรายการ','วันที่ส่ง','วันที่ถึงสาขา','วันที่รับ','สถานะการโอน',
    'ผู้สร้างรายการ','ผู้ส่ง','ผู้ยืนยันถึงสาขา','ผู้รับ','หมายเหตุ','สถานะทรัพย์สินเดิม','หมายเหตุเดิม','แก้ไขล่าสุด',
    'ชื่อผู้โอนทรัพย์สิน','ชื่อผู้รับโอน','ผู้ดูแลทรัพย์สินใหม่'
  ]);
  ensureTransferColumns_(ss);

  seedConfig_(ss);
  seedBranches_(ss);
  invalidateBranchCaches_(ss);
  retireRemovedBranches_(ss);
  seedAdmin_(ss);
  seedBranchUsers_(ss);
  formatSystemSheets_(ss);
  getUploadRootFolder_();
  invalidateBranchCaches_(ss);
  invalidateAssetCaches_(ss);

  return {
    ok: true,
    version: ASSET_APP.VERSION,
    spreadsheetName: ss.getName(),
    branches: getBranchCodes_(ss),
    message: 'อัปเกรดระบบ v4.2 เรียบร้อย — ปรับประสิทธิภาพและระบบอัปโหลดรูปแล้ว'
  };
}

function validateAssetSetup() {
  const out = {passed:true, errors:[], warnings:[], details:{}};
  let ss;
  try { ss = getDb_(); } catch (e) { out.passed=false; out.errors.push(e.message); return out; }
  const master = ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  if (!master) { out.passed=false; out.errors.push('ไม่พบชีต '+ASSET_APP.MASTER_SHEET); return out; }
  const map = getMasterHeaderMap_(master);
  ['assetId','assetName','assetType','branch','recordDate','assetStatus','statusNote','statusUpdated','source'].forEach(k => {
    if (!map[k]) { out.passed=false; out.errors.push('ไม่พบคอลัมน์สำคัญ: '+k); }
  });
  [ASSET_APP.AUDIT_SHEET,ASSET_APP.HISTORY_SHEET,ASSET_APP.USER_SHEET,ASSET_APP.CONFIG_SHEET,ASSET_APP.TRANSFER_SHEET].forEach(name => {
    if (!ss.getSheetByName(name)) out.warnings.push('ยังไม่มีชีต '+name+' — ให้รัน upgradeAssetSystemV2()');
  });
  const ids = master.getLastRow()>1 && map.assetId ? master.getRange(2,map.assetId,master.getLastRow()-1,1).getDisplayValues().flat().filter(String) : [];
  const seen={}, dups=[];
  ids.forEach(id => { const k=String(id).trim(); seen[k]=(seen[k]||0)+1; });
  Object.keys(seen).forEach(k => { if (seen[k]>1) dups.push(k); });
  if (dups.length) { out.passed=false; out.errors.push('พบรหัสทรัพย์สินซ้ำ '+dups.length+' รหัส'); }
  out.details = {spreadsheet:ss.getName(), masterRows:ids.length, branches:getBranchCodes_(ss), duplicateAssetIds:dups.slice(0,20)};
  return out;
}

// -------------------- App data --------------------

function getAppBootstrap(token) {
  const user = requireSession_(token);
  const ss = getDb_();
  const master = ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  if (!master) throw new Error('ไม่พบฐานข้อมูลทรัพย์สิน');

  // v4.2: อ่าน metadata เท่าที่จำเป็นแทนการโหลดทะเบียนทั้งชีตตอน Login
  const filterOptions = getMasterFilterOptions_(master);
  const branchMeta = getBranchMeta_(ss);
  const allBranches = branchMeta.codes;
  const branchNames = branchMeta.names;
  const visibleBranches = isAdmin_(user) ? allBranches : [user.branch];
  const makeBranchOption = code => {
    const name = branchNames[code] || code;
    return {code:code,name:name,label:(name && name!==code ? code+' '+name : code)};
  };

  return {
    appName: PropertiesService.getScriptProperties().getProperty('APP_NAME') || 'ระบบบริหารทรัพย์สินสาขา',
    version: ASSET_APP.VERSION,
    spreadsheetName: ss.getName(),
    user: user,
    branches: visibleBranches,
    branchNames: branchNames,
    branchOptions: visibleBranches.map(makeBranchOption),
    transferBranches: allBranches,
    transferBranchOptions: allBranches.map(makeBranchOption),
    assetTypes: filterOptions.assetTypes,
    custodians: filterOptions.custodians,
    auditStatuses: ASSET_APP.AUDIT_STATUSES.slice(),
    assetStatuses: ASSET_APP.ASSET_STATUSES.slice(),
    transferStatuses: ASSET_APP.TRANSFER_STATUSES.slice(),
    setup: getCachedSetupValidation_(ss)
  };
}

function buildDashboardPayload_(rows,latestAudits,filters,recentAudits){
  const filtered=rows.filter(r=>matchFilters_(r,filters||{}));
  let totalValue=0,totalQty=0;
  const branchMap={},typeMap={},statusMap={};
  filtered.forEach(r=>{
    const qty=num_(r.quantity)||1, price=num_(r.price);
    totalQty+=qty; totalValue+=price*qty;
    branchMap[r.branch||'ไม่ระบุ']=(branchMap[r.branch||'ไม่ระบุ']||0)+1;
    typeMap[r.assetType||'ไม่ระบุ']=(typeMap[r.assetType||'ไม่ระบุ']||0)+1;
    const a=latestAudits[r.assetId], st=a?a.status:'ยังไม่ตรวจ';
    statusMap[st]=(statusMap[st]||0)+1;
  });
  const audited=filtered.reduce((n,r)=>n+(latestAudits[r.assetId]?1:0),0);
  const issue=filtered.reduce((n,r)=>{const a=latestAudits[r.assetId];return n+(a&&a.status!=='พบและปกติ'?1:0);},0);
  return {
    kpis:{assetRecords:filtered.length,quantity:totalQty,totalValue:totalValue,branches:uniqueSorted_(filtered.map(r=>r.branch).filter(Boolean)).length,audited:audited,notAudited:Math.max(filtered.length-audited,0),issues:issue,auditPercent:filtered.length?audited/filtered.length*100:0},
    byBranch:mapToSeries_(branchMap),byType:mapToSeries_(typeMap),byStatus:mapToSeries_(statusMap),
    recentAudits:recentAudits||[]
  };
}

function getDashboard(token, filters) {
  const user=requireSession_(token); requirePermission_(user,'view');
  filters=applyUserBranch_(filters||{},user);
  const ss=getDb_(), rows=readMasterRows_(ss.getSheetByName(ASSET_APP.MASTER_SHEET));
  const snap=getAuditSnapshot_(ss,10,isAdmin_(user)?'ALL':user.branch);
  return buildDashboardPayload_(rows,snap.latest,filters,snap.recent);
}

function buildAssetSearchResult_(rows,latestAudits,filters){
  filters=filters||{};
  let out=rows.filter(r=>matchFilters_(r,filters));
  const q=String(filters.query||'').trim().toLowerCase();
  if(q) out=out.filter(r=>[r.assetId,r.assetName,r.serialNo,r.branch,r.assetType,r.brand,r.model,r.custodian,r.assetStatus].some(v=>String(v||'').toLowerCase().indexOf(q)>=0));
  const total=out.length, offset=Math.max(Number(filters.offset||0),0), limit=Math.min(Math.max(Number(filters.limit||100),1),ASSET_APP.MAX_SEARCH_ROWS);
  out=out.slice(offset,offset+limit).map(r=>{
    const a=latestAudits[r.assetId];
    return Object.assign({},r,{auditStatus:a?a.status:'ยังไม่ตรวจ',lastAuditDate:a?a.auditDate:'',lastAuditor:a?a.auditor:''});
  });
  return {total:total,offset:offset,limit:limit,rows:out};
}

function searchAssets(token, filters) {
  const user=requireSession_(token); requirePermission_(user,'view');
  filters=applyUserBranch_(filters||{},user);
  const ss=getDb_(), latestAudits=getLatestAudits_(ss), rows=readMasterRows_(ss.getSheetByName(ASSET_APP.MASTER_SHEET));
  return buildAssetSearchResult_(rows,latestAudits,filters);
}

function getAssetDetail(token, assetId) {
  const user=requireSession_(token); requirePermission_(user,'view');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  const map=getMasterHeaderMap_(sh), row=findAssetRow_(sh,map.assetId,assetId);
  if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  const asset=getAssetRowObject_(sh,row,map);
  enforceAssetBranch_(asset,user);
  return {asset:asset,latestAudit:getLatestAudits_(ss)[asset.assetId]||null,history:isAdmin_(user)?getAssetHistory_(assetId,user).slice(0,50):[]};
}

/** เพิ่ม/แก้ไขทะเบียน — รหัสทรัพย์สินใหม่รันอัตโนมัติ BRANCH-MPM01 */
function saveAsset(token,payload) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  payload=payload||{};
  const ss=getDb_(), sheet=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  ensureMasterColumns_(sheet);
  const map=getMasterHeaderMap_(sheet);

  let branch=clean_(payload.branch);
  if(!isAdmin_(user)) branch=user.branch;
  if(!branch) throw new Error('กรุณาระบุสาขา');
  if(getBranchCodes_(ss).indexOf(branch)<0) throw new Error('ไม่พบรหัสสาขา '+branch);
  if(!clean_(payload.assetName)) throw new Error('กรุณาระบุชื่อทรัพย์สิน');

  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    let assetId=clean_(payload.assetId);
    if(payload.mode==='create' || !assetId) assetId=generateNextAssetId_(sheet,map.assetId,branch);
    const foundRow=findAssetRow_(sheet,map.assetId,assetId);
    const isNew=!foundRow;
    if(!isNew && payload.mode==='create') throw new Error('รหัสทรัพย์สินนี้มีอยู่แล้ว');
    const row=foundRow||Math.max(sheet.getLastRow()+1,2);
    if(!isNew) enforceAssetBranch_(getAssetRowObject_(sheet,row,map),user);
    const oldData=!isNew?getAssetRowObject_(sheet,row,map):null;
    const now=new Date();

    let image=oldData?oldData.image:'';
    let receipt=oldData?oldData.receipt:'';
    const assetUploadFolder=(payload.imageData||payload.receiptData)?getAssetUploadFolder_(branch,assetId):null;
    if(payload.imageData) image=saveDataUrlFile_(payload.imageData,assetId+'_asset.jpg',branch,assetId,'images',assetUploadFolder);
    if(payload.receiptData) receipt=saveDataUrlFile_(payload.receiptData,assetId+'_receipt.jpg',branch,assetId,'receipts',assetUploadFolder);

    const recordDate=parseDateInput_(payload.recordDate) || (oldData && oldData.recordDateRaw) || now;
    const fieldValues={
      assetId:assetId,assetName:clean_(payload.assetName),serialNo:clean_(payload.serialNo),assetType:clean_(payload.assetType),branch:branch,source:clean_(payload.source)||'ไม่ระบุ',
      purchaseDate:parseDateInput_(payload.purchaseDate),price:num_(payload.price),quantity:num_(payload.quantity)||1,brand:clean_(payload.brand),model:clean_(payload.model),
      image:image,barcode:oldData?oldData.barcode:'',receipt:receipt,custodian:clean_(payload.custodian),purchaser:clean_(payload.purchaser),
      accountant:clean_(payload.accountant),auditor:clean_(payload.auditor),pdf:oldData?oldData.pdf:'',recordDate:recordDate,
      assetStatus:(oldData&&oldData.assetStatus)||'ใช้งาน',statusNote:(oldData&&oldData.statusNote)||'',statusUpdated:(oldData&&oldData.statusUpdatedRaw)||now
    };
    // v4.2: เขียนทั้งแถวครั้งเดียว ลดจำนวน Spreadsheet service calls อย่างมาก
    const lastCol=sheet.getLastColumn();
    const rowValues=isNew ? new Array(lastCol).fill('') : sheet.getRange(row,1,1,lastCol).getValues()[0];
    Object.keys(fieldValues).forEach(k=>{ if(map[k]) rowValues[map[k]-1]=fieldValues[k]; });
    sheet.getRange(row,1,1,lastCol).setValues([rowValues]);
    invalidateAssetCaches_(ss);
    appendHistory_(ss,assetId,isNew?'เพิ่มทรัพย์สิน':'แก้ไขทะเบียน',oldData?JSON.stringify(oldData):'',JSON.stringify(fieldValues),branch,payload.note||'',user);
    return {ok:true,assetId:assetId,branch:branch,mode:isNew?'created':'updated'};
  } finally { lock.releaseLock(); }
}

/** สร้าง QR ฝั่งเซิร์ฟเวอร์และ PDF รายงาน ไม่พึ่งไลบรารี QR ในเบราว์เซอร์ */
function finalizeAssetMedia(token,assetId) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET), map=getMasterHeaderMap_(sh);
  const row=findAssetRow_(sh,map.assetId,assetId); if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  const asset=getAssetRowObject_(sh,row,map); enforceAssetBranch_(asset,user);
  const qrUrl=generateAndSaveAssetQr_(asset,sh,map,row);
  const refreshed=getAssetRowObject_(sh,row,getMasterHeaderMap_(sh));
  const pdfUrl=generateAssetPdf_(refreshed,user);
  if(map.pdf) sh.getRange(row,map.pdf).setValue(pdfUrl);
  appendHistory_(ss,assetId,'สร้างรายงานทรัพย์สิน','',pdfUrl,asset.branch,'สร้าง QR และ PDF รายงานอัตโนมัติ',user);
  return {ok:true,assetId:assetId,qrUrl:qrUrl,pdfUrl:pdfUrl};
}

/** ส่ง QR ของทรัพย์สินกลับเป็น Base64 สำหรับ Pop-up / บันทึกเป็น PNG และสร้างใหม่อัตโนมัติเมื่อไฟล์เดิมมีปัญหา */
function getAssetQrImage(token,assetId) {
  const user=requireSession_(token); requirePermission_(user,'view');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET), map=getMasterHeaderMap_(sh);
  const row=findAssetRow_(sh,map.assetId,assetId); if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  let asset=getAssetRowObject_(sh,row,map); enforceAssetBranch_(asset,user);
  let blob=null;
  if(asset.barcode){
    try{
      const id=extractDriveFileId_(asset.barcode);
      if(id) blob=DriveApp.getFileById(id).getBlob();
    }catch(_e){}
  }
  if(!blob){
    const url=generateAndSaveAssetQr_(asset,sh,map,row);
    asset=getAssetRowObject_(sh,row,map);
    const id=extractDriveFileId_(url||asset.barcode);
    if(id) blob=DriveApp.getFileById(id).getBlob();
  }
  if(!blob) throw new Error('ไม่สามารถสร้าง QR ได้ กรุณาตรวจสอบสิทธิ์ UrlFetchApp/Drive แล้วลองใหม่');
  return {assetId:asset.assetId,filename:'QR_'+asset.assetId+'.png',mimeType:'image/png',base64:Utilities.base64Encode(blob.getBytes())};
}

function updateAssetStatus(token,payload) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  payload=payload||{};
  const assetId=clean_(payload.assetId), status=clean_(payload.status), note=clean_(payload.note);
  if(!assetId) throw new Error('ไม่พบรหัสทรัพย์สิน');
  if(ASSET_APP.ASSET_STATUSES.indexOf(status)<0) throw new Error('สถานะทรัพย์สินไม่ถูกต้อง');
  if(status!=='ใช้งาน' && !note) throw new Error('กรุณาระบุหมายเหตุสำหรับการเปลี่ยนสถานะ');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET); ensureMasterColumns_(sh);
  const map=getMasterHeaderMap_(sh), row=findAssetRow_(sh,map.assetId,assetId); if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  const asset=getAssetRowObject_(sh,row,map); enforceAssetBranch_(asset,user);
  const oldStatus=asset.assetStatus||'ใช้งาน', now=new Date();
  sh.getRange(row,map.assetStatus).setValue(status);
  sh.getRange(row,map.statusNote).setValue(note);
  sh.getRange(row,map.statusUpdated).setValue(now);
  appendHistory_(ss,assetId,'อัปเดตสถานะทรัพย์สิน',oldStatus,status,asset.branch,note,user);
  const updated=getAssetRowObject_(sh,row,map);
  const pdfUrl=generateAssetPdf_(updated,user);
  if(map.pdf) sh.getRange(row,map.pdf).setValue(pdfUrl);
  return {ok:true,assetId:assetId,status:status,pdfUrl:pdfUrl};
}

// -------------------- Audit: ADMIN only --------------------

function saveAudit(token,payload) {
  const user=requireSession_(token); requireAdminRole_(user);
  payload=payload||{};
  const assetId=clean_(payload.assetId), status=clean_(payload.status);
  if(!assetId) throw new Error('กรุณาระบุรหัสทรัพย์สิน');
  if(ASSET_APP.AUDIT_STATUSES.indexOf(status)<0) throw new Error('สถานะการตรวจไม่ถูกต้อง');
  const ss=getDb_(), masterSheet=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  ensureMasterColumns_(masterSheet);
  const masterMap=getMasterHeaderMap_(masterSheet), masterRow=findAssetRow_(masterSheet,masterMap.assetId,assetId);
  if(!masterRow) throw new Error('ไม่พบรหัสทรัพย์สินในทะเบียน: '+assetId);
  let asset=getAssetRowObject_(masterSheet,masterRow,masterMap);
  const sheet=ss.getSheetByName(ASSET_APP.AUDIT_SHEET); if(!sheet) throw new Error('ยังไม่มีชีตตรวจนับทรัพย์สิน');
  const now=new Date(), auditId='AUD-'+Utilities.formatDate(now,Session.getScriptTimeZone()||'Asia/Bangkok','yyyyMMdd-HHmmss')+'-'+Math.floor(Math.random()*900+100);
  const auditDate=parseDateInput_(payload.auditDate)||now;

  // ภาพที่ถ่ายระหว่างตรวจนับจะกลายเป็นรูปทรัพย์สินล่าสุดในทะเบียนทันที
  let evidenceUrl=clean_(payload.evidenceUrl);
  if(payload.imageData){
    evidenceUrl=saveDataUrlFile_(payload.imageData,assetId+'_audit_'+Utilities.formatDate(now,Session.getScriptTimeZone()||'Asia/Bangkok','yyyyMMdd_HHmmss')+'.jpg',asset.branch,assetId,'audit_photos');
    if(masterMap.image) masterSheet.getRange(masterRow,masterMap.image).setValue(evidenceUrl);
    appendHistory_(ss,assetId,'อัปเดตรูปทรัพย์สินจากการตรวจนับ',asset.image||'',evidenceUrl,asset.branch,'บันทึกรูปทรัพย์สินล่าสุดจากการตรวจนับ',user);
    asset=getAssetRowObject_(masterSheet,masterRow,masterMap);
  }

  sheet.appendRow([auditId,assetId,auditDate,status,asset.branch||'',clean_(payload.foundBranch)||asset.branch||'',clean_(payload.location),clean_(payload.auditor)||user.name||'',user.email||'',clean_(payload.note),evidenceUrl,now,now]);
  appendHistory_(ss,assetId,'ตรวจนับทรัพย์สิน','',status,clean_(payload.foundBranch)||asset.branch||'',clean_(payload.note),user);

  // ถ้ามีรูปใหม่ ให้สร้าง PDF ใหม่เพื่อให้รายงานล่าสุดใช้รูปปัจจุบัน
  let pdfUrl=asset.pdf||'';
  if(payload.imageData){
    try{
      pdfUrl=generateAssetPdf_(asset,user);
      if(masterMap.pdf) masterSheet.getRange(masterRow,masterMap.pdf).setValue(pdfUrl);
    }catch(_pdfErr){}
  }
  return {ok:true,auditId:auditId,asset:asset,status:status,evidenceUrl:evidenceUrl,pdfUrl:pdfUrl};
}

function getAssetHistory(token,assetId) {
  const user=requireSession_(token); requirePermission_(user,'view');
  return getAssetHistory_(assetId,user);
}

function buildAuditProgressFromRows_(assets,latest){
  const branch={};
  assets.forEach(a=>{const b=a.branch||'ไม่ระบุ';if(!branch[b])branch[b]={branch:b,total:0,audited:0,normal:0,issue:0,notAudited:0};branch[b].total++;const x=latest[a.assetId];if(x){branch[b].audited++;if(x.status==='พบและปกติ')branch[b].normal++;else branch[b].issue++;}else branch[b].notAudited++;});
  return Object.keys(branch).sort().map(k=>{const x=branch[k];x.percent=x.total?x.audited/x.total*100:0;return x;});
}

function getReports(token,filters) {
  const user=requireSession_(token); requirePermission_(user,'report');
  filters=applyUserBranch_(filters||{},user);
  const ss=getDb_(), rows=readMasterRows_(ss.getSheetByName(ASSET_APP.MASTER_SHEET));
  const snap=getAuditSnapshot_(ss,0,'ALL'), latest=snap.latest;
  const filtered=rows.filter(r=>matchFilters_(r,filters));
  const dashboard=buildDashboardPayload_(rows,latest,filters,[]);
  const progress=buildAuditProgressFromRows_(filtered,latest);
  const result=buildAssetSearchResult_(rows,latest,Object.assign({},filters,{offset:0,limit:ASSET_APP.MAX_SEARCH_ROWS}));
  return {dashboard:dashboard,progress:progress,assets:result.rows,assetStatuses:ASSET_APP.ASSET_STATUSES.slice()};
}


// -------------------- Asset transfer between branches --------------------

/** รายการโอนที่ผู้ใช้มีสิทธิ์เห็น: ADMIN เห็นทั้งหมด, USER เห็นต้นทาง/ปลายทางของสาขาตัวเอง */
function getTransfers(token, filters) {
  const user=requireSession_(token); requirePermission_(user,'view');
  filters=filters||{};
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.TRANSFER_SHEET);
  if(!sh||sh.getLastRow()<2) return [];
  ensureTransferColumns_(ss);
  const rows=sh.getRange(2,1,sh.getLastRow()-1,21).getValues();
  return rows.map(transferRowToObject_).filter(x=>{
    if(!x.transferId) return false;
    if(!isAdmin_(user) && x.fromBranch!==user.branch && x.toBranch!==user.branch) return false;
    if(filters.status && filters.status!=='ALL' && x.status!==filters.status) return false;
    if(filters.branch && filters.branch!=='ALL' && x.fromBranch!==filters.branch && x.toBranch!==filters.branch) return false;
    const q=clean_(filters.query).toLowerCase();
    if(q && ![x.transferId,x.assetId,x.assetName,x.fromBranch,x.toBranch,x.status,x.note,x.transferorName,x.receiverName,x.newCustodian].some(v=>String(v||'').toLowerCase().indexOf(q)>=0)) return false;
    return true;
  }).reverse();
}

/** สร้างรายการโอน — เก็บชื่อผู้โอนทรัพย์สินเพื่อใช้ในรายงานและประวัติ */
function createAssetTransfer(token,payload) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  payload=payload||{};
  const assetId=clean_(payload.assetId), toBranch=clean_(payload.toBranch).toUpperCase(), note=clean_(payload.note), transferorName=clean_(payload.transferorName);
  if(!assetId) throw new Error('กรุณาระบุรหัสทรัพย์สิน');
  if(!toBranch) throw new Error('กรุณาเลือกสาขาปลายทาง');
  if(!transferorName) throw new Error('กรุณาระบุชื่อผู้โอนทรัพย์สิน');
  const ss=getDb_(); ensureTransferColumns_(ss);
  const master=ss.getSheetByName(ASSET_APP.MASTER_SHEET), map=getMasterHeaderMap_(master);
  const row=findAssetRow_(master,map.assetId,assetId); if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  const asset=getAssetRowObject_(master,row,map); enforceAssetBranch_(asset,user);
  if(String(asset.branch).toUpperCase()===toBranch) throw new Error('สาขาปลายทางต้องไม่ใช่สาขาปัจจุบัน');
  if(getBranchCodes_(ss).indexOf(toBranch)<0) throw new Error('ไม่พบรหัสสาขาปลายทาง '+toBranch);
  const transferSh=ss.getSheetByName(ASSET_APP.TRANSFER_SHEET); if(!transferSh) throw new Error('ยังไม่มีชีตโอนทรัพย์สิน กรุณารัน upgradeAssetSystemV2()');
  const active=getActiveTransferForAsset_(transferSh,assetId);
  if(active) throw new Error('ทรัพย์สินนี้มีรายการโอนที่ยังไม่เสร็จ: '+active.transferId+' ('+active.status+')');
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try{
    const now=new Date(), transferId='TRF-'+Utilities.formatDate(now,Session.getScriptTimeZone()||'Asia/Bangkok','yyyyMMdd-HHmmss')+'-'+Math.floor(Math.random()*900+100);
    transferSh.appendRow([transferId,asset.assetId,asset.assetName,asset.branch,toBranch,now,'','','','รอส่ง',user.username||user.email||'','','','',note,asset.assetStatus||'ใช้งาน',asset.statusNote||'',now,transferorName,'','']);
    if(map.assetStatus) master.getRange(row,map.assetStatus).setValue('ส่งให้สาขา');
    if(map.statusNote) master.getRange(row,map.statusNote).setValue('รอโอนไปสาขา '+toBranch+' · '+transferId+(note?' · '+note:''));
    if(map.statusUpdated) master.getRange(row,map.statusUpdated).setValue(now);
    appendHistory_(ss,assetId,'สร้างรายการโอนทรัพย์สิน',asset.branch,toBranch,asset.branch,'ผู้โอน: '+transferorName+(note?' · '+note:''),user);
    return {ok:true,transferId:transferId,status:'รอส่ง'};
  } finally {lock.releaseLock();}
}

function sendAssetTransfer(token,transferId,note) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  return updateTransferStage_(user,transferId,'SEND',{note:note});
}
function markTransferArrived(token,transferId,note) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  return updateTransferStage_(user,transferId,'ARRIVE',{note:note});
}
/** รับเข้าทะเบียนพร้อมชื่อผู้รับโอนและผู้ดูแลทรัพย์สินใหม่ */
function receiveAssetTransfer(token,transferId,payload) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  payload=payload||{};
  return updateTransferStage_(user,transferId,'RECEIVE',payload);
}
function cancelAssetTransfer(token,transferId,note) {
  const user=requireSession_(token); requirePermission_(user,'edit');
  return updateTransferStage_(user,transferId,'CANCEL',{note:note});
}

function updateTransferStage_(user,transferId,action,payload) {
  payload=payload||{};
  const ss=getDb_(); ensureTransferColumns_(ss);
  const trSh=ss.getSheetByName(ASSET_APP.TRANSFER_SHEET);
  if(!trSh) throw new Error('ไม่พบชีตโอนทรัพย์สิน');
  const row=findTransferRow_(trSh,transferId); if(!row) throw new Error('ไม่พบรายการโอน '+transferId);
  const t=transferRowToObject_(trSh.getRange(row,1,1,21).getValues()[0]);
  const isSource=isAdmin_(user)||user.branch===t.fromBranch, isDest=isAdmin_(user)||user.branch===t.toBranch;
  const now=new Date(), actor=user.username||user.email||'';
  const appendNote=clean_(payload.note), combined=[t.note,appendNote].filter(Boolean).join(' | ');
  const master=ss.getSheetByName(ASSET_APP.MASTER_SHEET), map=getMasterHeaderMap_(master), assetRow=findAssetRow_(master,map.assetId,t.assetId);
  if(!assetRow) throw new Error('ไม่พบทรัพย์สิน '+t.assetId+' ในทะเบียน');
  const asset=getAssetRowObject_(master,assetRow,map);
  if(action==='SEND'){
    if(!isSource) throw new Error('เฉพาะสาขาต้นทางหรือ ADMIN เท่านั้นที่ยืนยันส่งได้');
    if(t.status!=='รอส่ง') throw new Error('รายการนี้ไม่อยู่ในสถานะรอส่ง');
    trSh.getRange(row,7).setValue(now); trSh.getRange(row,10).setValue('ระหว่างโอน'); trSh.getRange(row,12).setValue(actor);
    trSh.getRange(row,15).setValue(combined); trSh.getRange(row,18).setValue(now);
    appendHistory_(ss,t.assetId,'ส่งทรัพย์สินออกจากสาขา',t.fromBranch,t.toBranch,t.fromBranch,appendNote||t.transferId,user);
    return {ok:true,transferId:t.transferId,status:'ระหว่างโอน'};
  }
  if(action==='ARRIVE'){
    if(!isDest) throw new Error('เฉพาะสาขาปลายทางหรือ ADMIN เท่านั้นที่ยืนยันของถึงสาขาได้');
    if(t.status!=='ระหว่างโอน') throw new Error('รายการนี้ไม่อยู่ในสถานะระหว่างโอน');
    trSh.getRange(row,8).setValue(now); trSh.getRange(row,10).setValue('รอรับ'); trSh.getRange(row,13).setValue(actor);
    trSh.getRange(row,15).setValue(combined); trSh.getRange(row,18).setValue(now);
    appendHistory_(ss,t.assetId,'ทรัพย์สินถึงสาขาปลายทาง','ระหว่างโอน','รอรับ',t.toBranch,appendNote||t.transferId,user);
    return {ok:true,transferId:t.transferId,status:'รอรับ'};
  }
  if(action==='RECEIVE'){
    if(!isDest) throw new Error('เฉพาะสาขาปลายทางหรือ ADMIN เท่านั้นที่รับเข้าทะเบียนได้');
    if(t.status!=='รอรับ') throw new Error('รายการนี้ยังไม่พร้อมรับเข้าทะเบียน กรุณายืนยันว่าทรัพย์สินถึงสาขาก่อน');
    const receiverName=clean_(payload.receiverName), newCustodian=clean_(payload.newCustodian);
    if(!receiverName) throw new Error('กรุณาระบุชื่อผู้รับโอน');
    if(!newCustodian) throw new Error('กรุณาระบุชื่อผู้ดูแลทรัพย์สินใหม่');
    const lock=LockService.getScriptLock(); lock.waitLock(30000);
    try{
      const current=transferRowToObject_(trSh.getRange(row,1,1,21).getValues()[0]);
      if(current.status==='รับเรียบร้อย') throw new Error('รายการนี้รับเข้าทะเบียนแล้ว');
      if(map.branch) master.getRange(assetRow,map.branch).setValue(t.toBranch);
      if(map.source) master.getRange(assetRow,map.source).setValue('รับจากสาขา');
      if(map.assetStatus) master.getRange(assetRow,map.assetStatus).setValue('รับจากสาขา');
      if(map.statusNote) master.getRange(assetRow,map.statusNote).setValue('รับโอนจากสาขา '+t.fromBranch+' · '+t.transferId+(appendNote?' · '+appendNote:''));
      if(map.statusUpdated) master.getRange(assetRow,map.statusUpdated).setValue(now);
      if(map.custodian) master.getRange(assetRow,map.custodian).setValue(newCustodian);
      trSh.getRange(row,9).setValue(now); trSh.getRange(row,10).setValue('รับเรียบร้อย'); trSh.getRange(row,14).setValue(actor);
      trSh.getRange(row,15).setValue(combined); trSh.getRange(row,18).setValue(now);
      trSh.getRange(row,20).setValue(receiverName); trSh.getRange(row,21).setValue(newCustodian);
      appendHistory_(ss,t.assetId,'รับโอนทรัพย์สิน',t.fromBranch,t.toBranch,t.toBranch,'ผู้รับโอน: '+receiverName+' · ผู้ดูแลใหม่: '+newCustodian+(appendNote?' · '+appendNote:''),user);
      invalidateAssetCaches_(ss);
      const updated=getAssetRowObject_(master,assetRow,map);
      const pdfUrl=generateAssetPdf_(updated,user); if(map.pdf) master.getRange(assetRow,map.pdf).setValue(pdfUrl);
      return {ok:true,transferId:t.transferId,status:'รับเรียบร้อย',assetId:t.assetId,newBranch:t.toBranch,newCustodian:newCustodian,pdfUrl:pdfUrl};
    } finally {lock.releaseLock();}
  }
  if(action==='CANCEL'){
    if(!isSource) throw new Error('เฉพาะสาขาต้นทางหรือ ADMIN เท่านั้นที่ยกเลิกรายการโอนได้');
    if(t.status==='รับเรียบร้อย'||t.status==='ยกเลิก') throw new Error('รายการนี้ไม่สามารถยกเลิกได้');
    trSh.getRange(row,10).setValue('ยกเลิก'); trSh.getRange(row,15).setValue(combined); trSh.getRange(row,18).setValue(now);
    if(String(asset.branch)===String(t.fromBranch)){
      if(map.assetStatus) master.getRange(assetRow,map.assetStatus).setValue(t.oldAssetStatus||'ใช้งาน');
      if(map.statusNote) master.getRange(assetRow,map.statusNote).setValue(t.oldStatusNote||'');
      if(map.statusUpdated) master.getRange(assetRow,map.statusUpdated).setValue(now);
    }
    appendHistory_(ss,t.assetId,'ยกเลิกรายการโอน',t.toBranch,t.fromBranch,t.fromBranch,appendNote||t.transferId,user);
    return {ok:true,transferId:t.transferId,status:'ยกเลิก'};
  }
  throw new Error('คำสั่งการโอนไม่ถูกต้อง');
}

function findTransferRow_(sh,transferId){
  if(!sh||sh.getLastRow()<2) return 0;
  const vals=sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().flat();
  const i=vals.findIndex(v=>String(v).trim()===String(transferId).trim()); return i<0?0:i+2;
}
function getActiveTransferForAsset_(sh,assetId){
  if(!sh||sh.getLastRow()<2) return null;
  const width=Math.max(sh.getLastColumn(),21);
  const rows=sh.getRange(2,1,sh.getLastRow()-1,width).getValues();
  for(let i=rows.length-1;i>=0;i--){const t=transferRowToObject_(rows[i]);if(t.assetId===assetId&&['รอส่ง','ระหว่างโอน','รอรับ'].indexOf(t.status)>=0)return t;}
  return null;
}
function transferRowToObject_(r){
  return {transferId:clean_(r[0]),assetId:clean_(r[1]),assetName:clean_(r[2]),fromBranch:clean_(r[3]),toBranch:clean_(r[4]),createdDate:formatDateTime_(r[5]),sentDate:formatDateTime_(r[6]),arrivedDate:formatDateTime_(r[7]),receivedDate:formatDateTime_(r[8]),status:clean_(r[9]),createdBy:clean_(r[10]),sentBy:clean_(r[11]),arrivedBy:clean_(r[12]),receivedBy:clean_(r[13]),note:clean_(r[14]),oldAssetStatus:clean_(r[15]),oldStatusNote:clean_(r[16]),updated:formatDateTime_(r[17]),transferorName:clean_(r[18]),receiverName:clean_(r[19]),newCustodian:clean_(r[20])};
}

function getLatestCompletedTransferForAsset_(ss,assetId){
  const sh=ss.getSheetByName(ASSET_APP.TRANSFER_SHEET);
  if(!sh||sh.getLastRow()<2) return null;
  ensureTransferColumns_(ss);
  const rows=sh.getRange(2,1,sh.getLastRow()-1,21).getValues();
  for(let i=rows.length-1;i>=0;i--){
    const t=transferRowToObject_(rows[i]);
    if(t.assetId===assetId && t.status==='รับเรียบร้อย') return t;
  }
  return null;
}

// -------------------- Users / Login --------------------

function getUsers(token) {
  const user=requireSession_(token); requirePermission_(user,'admin');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.USER_SHEET);
  if(!sh||sh.getLastRow()<2) return [];
  return sh.getRange(2,1,sh.getLastRow()-1,15).getDisplayValues().filter(r=>r[1]).map((r,i)=>({
    row:i+2,email:r[0],username:r[1],role:r[2],branch:r[3],view:r[4],edit:r[5],audit:r[6],report:r[7],admin:r[8],active:r[9],updated:r[10],updatedBy:r[11],lastLogin:r[14]
  }));
}

function saveUser(token,payload) {
  const currentUser=requireSession_(token); requirePermission_(currentUser,'admin');
  payload=payload||{};
  const username=clean_(payload.username).toUpperCase();
  if(!username) throw new Error('กรุณาระบุชื่อผู้ใช้');
  const role=(clean_(payload.role)||'USER').toUpperCase();
  let branch=clean_(payload.branch).toUpperCase();
  if(role==='ADMIN') branch='ALL';
  if(role!=='ADMIN' && (!branch || branch==='ALL')) throw new Error('ผู้ใช้งานสาขาต้องระบุสาขา');

  const ss=getDb_();
  if(role!=='ADMIN' && getBranchCodes_(ss).indexOf(branch)<0) throw new Error('ไม่พบสาขาที่เปิดใช้งาน: '+branch);
  const sh=ss.getSheetByName(ASSET_APP.USER_SHEET); ensureUserColumns_(ss);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,15).getValues():[];
  let idx=rows.findIndex(r=>String(r[1]).trim().toUpperCase()===username);
  const row=idx>=0?idx+2:sh.getLastRow()+1;
  const existing=idx>=0?rows[idx]:[];
  let passwordHash=existing[12]||'', passwordSalt=existing[13]||'';
  const newPassword=String(payload.password||'');
  if(newPassword){
    if(newPassword.length<8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    passwordSalt=Utilities.getUuid().replace(/-/g,''); passwordHash=hashPassword_(newPassword,passwordSalt);
  }
  if(!passwordHash) throw new Error('กรุณากำหนดรหัสผ่านสำหรับผู้ใช้ใหม่');
  const email=clean_(payload.email).toLowerCase();
  const isAdmin=role==='ADMIN';
  sh.getRange(row,1,1,15).setValues([[
    email,username,role,branch,
    boolText_(payload.view,true),boolText_(payload.edit,isAdmin?true:true),
    isAdmin?'TRUE':'FALSE',boolText_(payload.report,true),isAdmin?'TRUE':'FALSE',boolText_(payload.active,true),
    new Date(),currentUser.username||currentUser.email||'',passwordHash,passwordSalt,existing[14]||''
  ]]);
  return {ok:true,username:username,passwordChanged:!!newPassword};
}

/** สร้าง/เติมบัญชีสาขา: ART_01 / ART@2026 เป็นต้น */


/**
 * ONE-TIME SETUP: สร้าง/อัปเดตบัญชี ADMIN_01
 * Username: ADMIN_01
 * Password: Admin@2026
 * หลังรันสำเร็จ แนะนำให้ลบฟังก์ชัน RunSetupAdmin01() ออกจาก Code.gs
 */
function RunSetupAdmin01() {
  return setupAdminAccount_('ADMIN_01', 'Admin@2026');
}

/** สร้างหรืออัปเดตบัญชี ADMIN พร้อม Hash/Salt และสิทธิ์ทั้งหมด */
function setupAdminAccount_(username, password) {
  username = clean_(username).toUpperCase();
  password = String(password || '');
  if (!username) throw new Error('กรุณาระบุชื่อผู้ใช้ ADMIN');
  if (password.length < 8) throw new Error('รหัสผ่าน ADMIN ต้องมีอย่างน้อย 8 ตัวอักษร');

  const ss = getDb_();
  ensureUserColumns_(ss);
  const sh = ss.getSheetByName(ASSET_APP.USER_SHEET);
  if (!sh) throw new Error('ไม่พบชีตผู้ใช้งาน');

  const rows = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 15).getValues()
    : [];
  const idx = rows.findIndex(r => String(r[1] || '').trim().toUpperCase() === username);
  const row = idx >= 0 ? idx + 2 : sh.getLastRow() + 1;
  const existing = idx >= 0 ? rows[idx] : [];
  const email = String(existing[0] || Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  const salt = Utilities.getUuid().replace(/-/g, '');
  const hash = hashPassword_(password, salt);
  const updatedBy = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'SYSTEM';

  sh.getRange(row, 1, 1, 15).setValues([[
    email,              // อีเมล
    username,           // ชื่อผู้ใช้
    'ADMIN',            // บทบาท
    'ALL',              // สาขา
    'TRUE',             // ดูข้อมูล
    'TRUE',             // แก้ไขทะเบียน
    'TRUE',             // ตรวจนับ
    'TRUE',             // ดูรายงาน
    'TRUE',             // จัดการระบบ
    'TRUE',             // ใช้งาน
    new Date(),         // แก้ไขล่าสุด
    updatedBy,          // แก้ไขโดย
    hash,               // Password Hash
    salt,               // Password Salt
    existing[14] || ''  // เข้าสู่ระบบล่าสุด
  ]]);

  return {
    ok: true,
    username: username,
    role: 'ADMIN',
    branch: 'ALL',
    message: 'ตั้งค่าบัญชี ADMIN_01 เรียบร้อยแล้ว'
  };
}

function setupBranchUsers() {
  const ss=getDb_(); ensureUserColumns_(ss); seedBranches_(ss); seedBranchUsers_(ss);
  return {ok:true,message:'สร้างบัญชีผู้ใช้งานรายสาขาที่ขาดเรียบร้อย',branches:getBranchCodes_(ss)};
}

/** ตั้งรหัส ADMIN ผ่าน Script Property INITIAL_ADMIN_PASSWORD */
function setupLoginSystem() {
  const ss=getDb_(); ensureUserColumns_(ss);
  const sh=ss.getSheetByName(ASSET_APP.USER_SHEET); if(!sh) throw new Error('ไม่พบชีตผู้ใช้งาน');
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,15).getValues():[];
  const idx=rows.findIndex(r=>String(r[2]).toUpperCase()==='ADMIN'&&isTrue_(r[9]));
  if(idx<0) throw new Error('ไม่พบผู้ใช้ ADMIN กรุณารัน upgradeAssetSystemV2() ก่อน');
  const password=PropertiesService.getScriptProperties().getProperty('INITIAL_ADMIN_PASSWORD')||'';
  if(password.length<8) throw new Error('กรุณาตั้ง Script Property: INITIAL_ADMIN_PASSWORD อย่างน้อย 8 ตัว');
  const salt=Utilities.getUuid().replace(/-/g,'');
  sh.getRange(idx+2,13).setValue(hashPassword_(password,salt)); sh.getRange(idx+2,14).setValue(salt);
  PropertiesService.getScriptProperties().deleteProperty('INITIAL_ADMIN_PASSWORD');
  return {ok:true,username:String(rows[idx][1]||'ADMIN'),message:'ตั้งรหัสผ่าน ADMIN เรียบร้อย'};
}

function login(username,password) {
  username=clean_(username).toUpperCase(); password=String(password||'');
  if(!username||!password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
  const ss=getDb_(); ensureUserColumns_(ss);
  const sh=ss.getSheetByName(ASSET_APP.USER_SHEET); if(!sh||sh.getLastRow()<2) throw new Error('ยังไม่มีผู้ใช้งานในระบบ');
  const rows=sh.getRange(2,1,sh.getLastRow()-1,15).getValues();
  const idx=rows.findIndex(r=>String(r[1]).trim().toUpperCase()===username);
  if(idx<0) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  const r=rows[idx]; if(!isTrue_(r[9])) throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
  if(!r[12]||!r[13]) throw new Error('บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ');
  if(hashPassword_(password,String(r[13]))!==String(r[12])) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  const user=userFromRow_(r), token=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put('LOGIN_'+token,JSON.stringify(user),21600);
  sh.getRange(idx+2,15).setValue(new Date());
  return {ok:true,token:token,user:user};
}

function logout(token) { if(token) CacheService.getScriptCache().remove('LOGIN_'+String(token)); return {ok:true}; }

function changeMyPassword(token,currentPassword,newPassword) {
  requireSession_(token);
  throw new Error('การเปลี่ยนรหัสผ่านดำเนินการโดย ADMIN เท่านั้น กรุณาติดต่อผู้ดูแลระบบ');
}


// -------------------- Internal --------------------

function getDb_() {
  const id=PropertiesService.getScriptProperties().getProperty('DB_FILE_ID');
  if(!id) throw new Error('ยังไม่ได้ตั้ง Script Property: DB_FILE_ID');
  return SpreadsheetApp.openById(id);
}

function ensureSheet_(ss,name,headers) {
  let sh=ss.getSheetByName(name); if(!sh) sh=ss.insertSheet(name);
  if(sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sh;
}

function ensureMasterColumns_(sh) {
  const required=['วันที่บันทึกทรัพย์สิน','สถานะทรัพย์สิน','หมายเหตุสถานะ','วันที่อัปเดตสถานะ','แหล่งที่มา'];
  let headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim());
  required.forEach(h=>{if(headers.indexOf(h)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);headers.push(h);}});
}

function ensureUserColumns_(ss) {
  const sh=ss.getSheetByName(ASSET_APP.USER_SHEET); if(!sh) return;
  const needed=['อีเมล','ชื่อผู้ใช้','บทบาท','สาขา','ดูข้อมูล','แก้ไขทะเบียน','ตรวจนับ','ดูรายงาน','จัดการระบบ','ใช้งาน','แก้ไขล่าสุด','แก้ไขโดย','รหัสผ่าน Hash','Password Salt','เข้าสู่ระบบล่าสุด'];
  const current=sh.getLastColumn()?sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0]:[];
  needed.forEach((h,i)=>{if(current[i]!==h) sh.getRange(1,i+1).setValue(h);});
}

function ensureTransferColumns_(ss) {
  const sh=ss.getSheetByName(ASSET_APP.TRANSFER_SHEET); if(!sh) return;
  const needed=['Transfer ID','รหัสทรัพย์สิน','ชื่อทรัพย์สิน','สาขาต้นทาง','สาขาปลายทาง','วันที่สร้างรายการ','วันที่ส่ง','วันที่ถึงสาขา','วันที่รับ','สถานะการโอน','ผู้สร้างรายการ','ผู้ส่ง','ผู้ยืนยันถึงสาขา','ผู้รับ','หมายเหตุ','สถานะทรัพย์สินเดิม','หมายเหตุเดิม','แก้ไขล่าสุด','ชื่อผู้โอนทรัพย์สิน','ชื่อผู้รับโอน','ผู้ดูแลทรัพย์สินใหม่'];
  for(let i=0;i<needed.length;i++){
    if(sh.getRange(1,i+1).getDisplayValue()!==needed[i]) sh.getRange(1,i+1).setValue(needed[i]);
  }
}

function seedConfig_(ss) {
  const sh=ss.getSheetByName(ASSET_APP.CONFIG_SHEET); if(!sh) return;
  const existing=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,6).getDisplayValues():[];
  const keys=new Set(existing.map(r=>r[0]+'|'+r[1]));
  const rows=[
    ['AUDIT_STATUS','NORMAL','พบและปกติ','พบและปกติ','TRUE',''],
    ['AUDIT_STATUS','DAMAGED','พบแต่ชำรุด','พบแต่ชำรุด','TRUE',''],
    ['AUDIT_STATUS','MISSING','ไม่พบ','ไม่พบ','TRUE',''],
    ['AUDIT_STATUS','MOVED_LOCATION','ย้ายตำแหน่ง','ย้ายตำแหน่ง','TRUE',''],
    ['AUDIT_STATUS','MOVED_BRANCH','ย้ายสาขา','ย้ายสาขา','TRUE',''],
    ['AUDIT_STATUS','DISPOSAL','รอจำหน่าย','รอจำหน่าย','TRUE',''],
    ['ASSET_STATUS','ACTIVE','ใช้งาน','ใช้งาน','TRUE',''],
    ['ASSET_STATUS','SCRAP','ตัดจำหน่าย(ขายซาก)','ตัดจำหน่าย(ขายซาก)','TRUE',''],
    ['ASSET_STATUS','SEND','ส่งให้สาขา','ส่งให้สาขา','TRUE',''],
    ['ASSET_STATUS','RECEIVE','รับจากสาขา','รับจากสาขา','TRUE',''],
    ['TRANSFER_STATUS','WAIT_SEND','รอส่ง','รอส่ง','TRUE',''],
    ['TRANSFER_STATUS','IN_TRANSIT','ระหว่างโอน','ระหว่างโอน','TRUE',''],
    ['TRANSFER_STATUS','WAIT_RECEIVE','รอรับ','รอรับ','TRUE',''],
    ['TRANSFER_STATUS','RECEIVED','รับเรียบร้อย','รับเรียบร้อย','TRUE',''],
    ['TRANSFER_STATUS','CANCELLED','ยกเลิก','ยกเลิก','TRUE','']
  ].filter(r=>!keys.has(r[0]+'|'+r[1]));
  if(rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,6).setValues(rows);
}

function seedBranches_(ss) {
  const sh=ss.getSheetByName(ASSET_APP.CONFIG_SHEET); if(!sh) return;
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,6).getValues():[];
  const rowByCode={};
  rows.forEach((r,i)=>{if(String(r[0]||'').trim()==='BRANCH'&&r[1]) rowByCode[String(r[1]).trim().toUpperCase()]=i+2;});
  const append=[];
  ASSET_APP.BRANCHES.forEach(code=>{
    const name=ASSET_APP.BRANCH_NAMES[code]||code;
    if(rowByCode[code]){
      // อัปเดตรหัส/ชื่อเท่านั้น และคงสถานะใช้งานที่ ADMIN กำหนดไว้
      sh.getRange(rowByCode[code],2,1,3).setValues([[code,name,name]]);
    }else{
      append.push(['BRANCH',code,name,name,'TRUE','']);
    }
  });
  if(append.length) sh.getRange(sh.getLastRow()+1,1,append.length,6).setValues(append);
}

function retireRemovedBranches_(ss) {
  const retired=(ASSET_APP.RETIRED_BRANCHES||[]).map(x=>String(x).toUpperCase());
  if(!retired.length) return;

  const config=ss.getSheetByName(ASSET_APP.CONFIG_SHEET);
  if(config&&config.getLastRow()>1){
    const vals=config.getRange(2,1,config.getLastRow()-1,6).getValues();
    vals.forEach((r,i)=>{
      const code=String(r[1]||'').trim().toUpperCase();
      if(String(r[0]||'').trim()==='BRANCH'&&retired.indexOf(code)>=0){
        config.getRange(i+2,5).setValue('FALSE');
        config.getRange(i+2,6).setValue('ยกเลิกใช้งานจากระบบ v2.8 — เก็บประวัติเดิมไว้');
      }
    });
  }

  const users=ss.getSheetByName(ASSET_APP.USER_SHEET);
  if(users&&users.getLastRow()>1){
    const vals=users.getRange(2,1,users.getLastRow()-1,15).getValues();
    vals.forEach((r,i)=>{
      const username=String(r[1]||'').trim().toUpperCase();
      const branch=String(r[3]||'').trim().toUpperCase();
      if(retired.indexOf(branch)>=0 || retired.some(code=>username===code+'_01')){
        users.getRange(i+2,10).setValue('FALSE');
        users.getRange(i+2,11).setValue(new Date());
        users.getRange(i+2,12).setValue('SYSTEM v2.8');
      }
    });
  }
}

function isRetiredBranch_(code){
  code=String(code||'').trim().toUpperCase();
  return (ASSET_APP.RETIRED_BRANCHES||[]).indexOf(code)>=0;
}

function setupCacheKey_(ss){ return 'SETUP_STATUS_V42_'+ss.getId(); }
function getCachedSetupValidation_(ss){
  const cache=CacheService.getScriptCache(), key=setupCacheKey_(ss), cached=cache.get(key);
  if(cached){try{return JSON.parse(cached);}catch(_e){}}
  const out=validateAssetSetup();
  try{cache.put(key,JSON.stringify(out),300);}catch(_e){}
  return out;
}
function branchCacheKey_(ss){ return 'BRANCH_META_V42_'+ss.getId(); }
function assetFilterCacheKey_(sheet){ return 'ASSET_FILTERS_V42_'+sheet.getParent().getId(); }
function invalidateBranchCaches_(ss){ try{CacheService.getScriptCache().remove(branchCacheKey_(ss));}catch(_e){} }
function invalidateAssetCaches_(ssArg){
  try{
    const ss=ssArg||getDb_();
    const sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET), cache=CacheService.getScriptCache();
    if(sh) cache.remove(assetFilterCacheKey_(sh));
    cache.remove(setupCacheKey_(ss));
  }catch(_e){}
}

/** v4.2: อ่านรายการสาขา/ชื่อสาขาจากชีตตั้งค่าเพียงครั้งเดียวและ cache ชั่วคราว */
function getBranchMeta_(ss) {
  const cache=CacheService.getScriptCache(), key=branchCacheKey_(ss), cached=cache.get(key);
  if(cached){ try{return JSON.parse(cached);}catch(_e){} }
  const names=Object.assign({},ASSET_APP.BRANCH_NAMES), active=[];
  const sh=ss.getSheetByName(ASSET_APP.CONFIG_SHEET);
  let hasBranchConfig=false;
  if(sh&&sh.getLastRow()>1){
    sh.getRange(2,1,sh.getLastRow()-1,6).getValues().forEach(r=>{
      if(String(r[0]||'').trim()==='BRANCH'&&r[1]){
        hasBranchConfig=true;
        const code=String(r[1]).trim().toUpperCase(), name=String(r[2]||r[3]||'').trim();
        if(name&&name!==code) names[code]=name;
        if(isTrue_(r[4])&&code&&!isRetiredBranch_(code)) active.push(code);
      }
    });
  }
  if(!hasBranchConfig){
    active.push.apply(active,ASSET_APP.BRANCHES.slice());
    const master=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
    if(master){
      const map=getMasterHeaderMap_(master);
      if(map.branch&&master.getLastRow()>1){
        master.getRange(2,map.branch,master.getLastRow()-1,1).getValues().forEach(r=>{
          const code=String(r[0]||'').trim().toUpperCase(); if(code&&!isRetiredBranch_(code)) active.push(code);
        });
      }
    }
  }
  const meta={codes:uniqueSorted_(active).filter(v=>!isRetiredBranch_(v)),names:names};
  try{cache.put(key,JSON.stringify(meta),300);}catch(_e){}
  return meta;
}

function getBranchNameMap_(ss) { return Object.assign({},getBranchMeta_(ss).names); }
function getBranchName_(ss,code) {
  code=String(code||'').trim().toUpperCase();
  if(!code) return '';
  return getBranchMeta_(ss).names[code]||code;
}
function formatBranchLabel_(ss,code) {
  code=String(code||'').trim().toUpperCase();
  const name=getBranchMeta_(ss).names[code]||code;
  return name&&name!==code ? code+' '+name : code;
}
function getBranchCodes_(ss) { return getBranchMeta_(ss).codes.slice(); }

/** v4.2: cache ตัวเลือกประเภท/ผู้ดูแล แทนการอ่านทะเบียนทั้งชีตตอน Login */
function getMasterFilterOptions_(sheet){
  const cache=CacheService.getScriptCache(), key=assetFilterCacheKey_(sheet), cached=cache.get(key);
  if(cached){ try{return JSON.parse(cached);}catch(_e){} }
  const map=getMasterHeaderMap_(sheet), last=sheet.getLastRow(), out={assetTypes:[],custodians:[]};
  if(last>1){
    if(map.assetType) out.assetTypes=uniqueSorted_(sheet.getRange(2,map.assetType,last-1,1).getValues().flat());
    if(map.custodian) out.custodians=uniqueSorted_(sheet.getRange(2,map.custodian,last-1,1).getValues().flat());
  }
  try{cache.put(key,JSON.stringify(out),300);}catch(_e){}
  return out;
}

/** รายการสาขาทั้งหมดสำหรับหน้า ADMIN รวมสาขาที่ปิดใช้งาน */
function getBranches(token) {
  const user=requireSession_(token); requirePermission_(user,'admin');
  const ss=getDb_(), config=ss.getSheetByName(ASSET_APP.CONFIG_SHEET);
  if(!config) throw new Error('ไม่พบชีต '+ASSET_APP.CONFIG_SHEET);
  const assetCounts={}, userCounts={};
  const master=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  if(master){
    const mmap=getMasterHeaderMap_(master);
    if(mmap.branch&&master.getLastRow()>1){
      master.getRange(2,mmap.branch,master.getLastRow()-1,1).getValues().forEach(r=>{
        const b=String(r[0]||'').trim().toUpperCase(); if(b) assetCounts[b]=(assetCounts[b]||0)+1;
      });
    }
  }
  const ush=ss.getSheetByName(ASSET_APP.USER_SHEET);
  if(ush&&ush.getLastRow()>1){
    ush.getRange(2,1,ush.getLastRow()-1,15).getDisplayValues().forEach(r=>{
      const b=String(r[3]||'').trim().toUpperCase();
      if(b&&b!=='ALL') userCounts[b]=(userCounts[b]||0)+1;
    });
  }
  const rows=config.getLastRow()>1?config.getRange(2,1,config.getLastRow()-1,6).getDisplayValues():[];
  return rows.filter(r=>String(r[0]||'').trim()==='BRANCH'&&r[1]).map((r,i)=>{
    const code=String(r[1]||'').trim().toUpperCase();
    return {row:i+2,code:code,name:String(r[2]||r[3]||code).trim(),active:isTrue_(r[4]),note:String(r[5]||''),assetCount:assetCounts[code]||0,userCount:userCounts[code]||0,defaultUsername:code+'_01'};
  }).sort((a,b)=>a.code.localeCompare(b.code));
}

/** เพิ่ม/แก้ไขสาขาจาก Web App — มีผลกับ Dropdown ทุกหน้าทันที */
function saveBranch(token,payload) {
  const user=requireSession_(token); requirePermission_(user,'admin');
  payload=payload||{};
  const code=clean_(payload.code).toUpperCase();
  const originalCode=clean_(payload.originalCode).toUpperCase();
  const name=clean_(payload.name);
  const note=clean_(payload.note);
  const active=payload.active!==false && String(payload.active).toUpperCase()!=='FALSE';
  if(!code) throw new Error('กรุณาระบุรหัสสาขา');
  if(code==='ALL') throw new Error('ไม่สามารถใช้ ALL เป็นรหัสสาขา');
  if(!/^[A-Z0-9][A-Z0-9-]{1,14}$/.test(code)) throw new Error('รหัสสาขาใช้ได้เฉพาะ A-Z, 0-9 และเครื่องหมาย - จำนวน 2–15 ตัว');
  if(!name) throw new Error('กรุณาระบุชื่อสาขาภาษาไทย');
  if(originalCode&&originalCode!==code) throw new Error('ไม่อนุญาตให้เปลี่ยนรหัสสาขาหลังสร้างแล้ว ให้สร้างสาขาใหม่แทน');
  if(isRetiredBranch_(code)) throw new Error('รหัสสาขา '+code+' ถูกยกเลิกถาวรในระบบ');

  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.CONFIG_SHEET);
  if(!sh) throw new Error('ไม่พบชีต '+ASSET_APP.CONFIG_SHEET);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,6).getValues():[];
  const idx=rows.findIndex(r=>String(r[0]||'').trim()==='BRANCH'&&String(r[1]||'').trim().toUpperCase()===code);
  const isNew=idx<0;
  const row=idx>=0?idx+2:sh.getLastRow()+1;
  sh.getRange(row,1,1,6).setValues([['BRANCH',code,name,name,active?'TRUE':'FALSE',note]]);

  // ปิดผู้ใช้ของสาขาทั้งหมดเมื่อปิดสาขา เพื่อป้องกันเข้าระบบด้วยสาขาที่เลิกใช้งาน
  const ush=ss.getSheetByName(ASSET_APP.USER_SHEET); ensureUserColumns_(ss);
  if(ush&&ush.getLastRow()>1&&!active){
    const urows=ush.getRange(2,1,ush.getLastRow()-1,15).getValues();
    urows.forEach((r,i)=>{
      if(String(r[3]||'').trim().toUpperCase()===code&&String(r[2]||'').trim().toUpperCase()!=='ADMIN'){
        ush.getRange(i+2,10).setValue('FALSE');
        ush.getRange(i+2,11).setValue(new Date());
        ush.getRange(i+2,12).setValue(user.username||user.email||'ADMIN');
      }
    });
  }

  let createdUser=false, initialPassword='';
  if(active&&ush){
    const username=code+'_01';
    const urows=ush.getLastRow()>1?ush.getRange(2,1,ush.getLastRow()-1,15).getValues():[];
    const uidx=urows.findIndex(r=>String(r[1]||'').trim().toUpperCase()===username);
    const wantCreate=(payload.createDefaultUser===true || String(payload.createDefaultUser).toUpperCase()==='TRUE');
    if(uidx<0&&wantCreate){
      initialPassword=String(payload.initialPassword||'').trim() || code+'@2026';
      if(initialPassword.length<8) throw new Error('รหัสผ่านเริ่มต้นต้องมีอย่างน้อย 8 ตัวอักษร');
      const salt=Utilities.getUuid().replace(/-/g,'');
      ush.appendRow(['',username,'USER',code,'TRUE','TRUE','FALSE','TRUE','FALSE','TRUE',new Date(),user.username||user.email||'ADMIN',hashPassword_(initialPassword,salt),salt,'']);
      createdUser=true;
    } else if(uidx>=0){
      // เปิดบัญชีหลักกลับอัตโนมัติเมื่อเปิดสาขาอีกครั้ง โดยไม่เปลี่ยนรหัสผ่านเดิม
      ush.getRange(uidx+2,10).setValue('TRUE');
      ush.getRange(uidx+2,11).setValue(new Date());
      ush.getRange(uidx+2,12).setValue(user.username||user.email||'ADMIN');
    }
  }

  invalidateBranchCaches_(ss);
  invalidateAssetCaches_(ss);
  return {ok:true,isNew:isNew,code:code,name:name,active:active,label:code+' '+name,createdUser:createdUser,username:code+'_01',initialPassword:createdUser?initialPassword:''};
}

function seedAdmin_(ss) {
  const sh=ss.getSheetByName(ASSET_APP.USER_SHEET); if(!sh) return;
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,15).getValues():[];
  if(rows.some(r=>String(r[2]).toUpperCase()==='ADMIN')) return;
  const email=Session.getActiveUser().getEmail()||Session.getEffectiveUser().getEmail()||'';
  sh.appendRow([email,'ADMIN','ADMIN','ALL','TRUE','TRUE','TRUE','TRUE','TRUE','TRUE',new Date(),email,'','','']);
}

function seedBranchUsers_(ss) {
  const sh=ss.getSheetByName(ASSET_APP.USER_SHEET); if(!sh) return;
  const existing=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,15).getValues():[];
  const usernames=new Set(existing.map(r=>String(r[1]||'').trim().toUpperCase()));
  const rows=[];
  getBranchCodes_(ss).forEach(branch=>{
    const username=branch.toUpperCase()+'_01';
    if(usernames.has(username)) return;
    const password=branch.toUpperCase()+'@2026', salt=Utilities.getUuid().replace(/-/g,'');
    rows.push(['',username,'USER',branch,'TRUE','TRUE','FALSE','TRUE','FALSE','TRUE',new Date(),'SYSTEM',hashPassword_(password,salt),salt,'']);
  });
  if(rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,15).setValues(rows);
}

function formatSystemSheets_(ss) {
  [ASSET_APP.AUDIT_SHEET,ASSET_APP.HISTORY_SHEET,ASSET_APP.USER_SHEET,ASSET_APP.CONFIG_SHEET,ASSET_APP.TRANSFER_SHEET].forEach(name=>{
    const sh=ss.getSheetByName(name); if(!sh) return; sh.setFrozenRows(1);
    const cols=sh.getLastColumn(); if(cols) sh.getRange(1,1,1,cols).setFontWeight('bold').setBackground('#0f3d56').setFontColor('#ffffff');
  });
}

function getMasterHeaderMap_(sheet) {
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0].map(v=>String(v||'').trim()), out={};
  Object.keys(ASSET_APP.MASTER_HEADERS).forEach(key=>{
    const aliases=ASSET_APP.MASTER_HEADERS[key].map(x=>String(x).trim());
    for(let i=0;i<headers.length;i++){if(aliases.indexOf(headers[i])>=0){out[key]=i+1;break;}}
  });
  return out;
}

function readMasterRows_(sheet) {
  if(!sheet||sheet.getLastRow()<2) return [];
  const map=getMasterHeaderMap_(sheet), lastRow=sheet.getLastRow(), lastCol=sheet.getLastColumn();
  // v4.2: ใช้ getValues เพียงครั้งเดียว แทน getValues + getDisplayValues เต็มชีต
  const values=sheet.getRange(2,1,lastRow-1,lastCol).getValues();
  return values.map((r,i)=>rowToAsset_(r,null,map,i+2)).filter(x=>x.assetId);
}

function rowToAsset_(r,d,map,rowNumber) {
  const v=k=>map[k]?r[map[k]-1]:'', dv=k=>{
    if(!map[k]) return '';
    if(d) return d[map[k]-1];
    const raw=r[map[k]-1];
    if(raw instanceof Date) return formatDate_(raw);
    return raw==null?'':String(raw);
  };
  return {
    rowNumber:rowNumber,assetId:clean_(dv('assetId')),assetName:clean_(dv('assetName')),serialNo:clean_(dv('serialNo')),assetType:clean_(dv('assetType')),branch:clean_(dv('branch')),
    purchaseDate:formatDate_(v('purchaseDate'))||clean_(dv('purchaseDate')),purchaseDateRaw:dateToTransport_(v('purchaseDate')),price:num_(v('price'))||num_(dv('price')),quantity:num_(v('quantity'))||num_(dv('quantity'))||1,totalPrice:(num_(v('price'))||num_(dv('price')))*(num_(v('quantity'))||num_(dv('quantity'))||1),
    brand:clean_(dv('brand')),model:clean_(dv('model')),image:extractLink_(v('image'),dv('image')),barcode:extractLink_(v('barcode'),dv('barcode')),receipt:extractLink_(v('receipt'),dv('receipt')),
    custodian:clean_(dv('custodian')),custodianSign:extractLink_(v('custodianSign'),dv('custodianSign')),purchaser:clean_(dv('purchaser')),purchaserSign:extractLink_(v('purchaserSign'),dv('purchaserSign')),
    accountant:clean_(dv('accountant')),accountantSign:extractLink_(v('accountantSign'),dv('accountantSign')),auditor:clean_(dv('auditor')),auditorSign:extractLink_(v('auditorSign'),dv('auditorSign')),pdf:extractLink_(v('pdf'),dv('pdf')),
    recordDate:formatDate_(v('recordDate'))||clean_(dv('recordDate')),recordDateRaw:dateToTransport_(v('recordDate')),assetStatus:clean_(dv('assetStatus'))||'ใช้งาน',statusNote:clean_(dv('statusNote')),source:clean_(dv('source'))||'ไม่ระบุ',
    statusUpdated:formatDateTime_(v('statusUpdated'))||clean_(dv('statusUpdated')),statusUpdatedRaw:dateTimeToTransport_(v('statusUpdated'))
  };
}

function getAssetRowObject_(sheet,row,map) {
  const values=sheet.getRange(row,1,1,sheet.getLastColumn()).getValues()[0];
  return rowToAsset_(values,null,map,row);
}

function findAssetRow_(sheet,assetIdCol,assetId) {
  if(!assetIdCol||sheet.getLastRow()<2) return 0;
  const wanted=String(assetId||'').trim();
  if(!wanted) return 0;
  const found=sheet.getRange(2,assetIdCol,sheet.getLastRow()-1,1)
    .createTextFinder(wanted).matchEntireCell(true).useRegularExpression(false).findNext();
  return found ? found.getRow() : 0;
}

function generateNextAssetId_(sheet,assetIdCol,branch) {
  const prefix=String(branch).toUpperCase()+'-MPM'; let max=0;
  if(sheet.getLastRow()>1){
    sheet.getRange(2,assetIdCol,sheet.getLastRow()-1,1).getDisplayValues().flat().forEach(v=>{
      const m=String(v||'').toUpperCase().match(new RegExp('^'+escapeRegex_(prefix)+'(\\d+)$'));
      if(m) max=Math.max(max,Number(m[1])||0);
    });
  }
  const n=max+1; return prefix+String(n).padStart(Math.max(2,String(n).length),'0');
}

function getAuditSnapshot_(ss,limit,branch){
  const sh=ss.getSheetByName(ASSET_APP.AUDIT_SHEET); if(!sh||sh.getLastRow()<2) return {latest:{},recent:[]};
  const values=sh.getRange(2,1,sh.getLastRow()-1,13).getValues(), latest={};
  values.forEach(r=>{const id=clean_(r[1]);if(!id)return;const ts=r[12] instanceof Date?r[12].getTime():new Date(r[12]||r[2]).getTime();if(!latest[id]||ts>=latest[id]._ts)latest[id]={_ts:ts,auditId:r[0],assetId:id,auditDate:formatDate_(r[2]),status:r[3],registeredBranch:r[4],foundBranch:r[5],location:r[6],auditor:r[7],email:r[8],note:r[9],evidenceUrl:r[10]};});
  let recent=[];
  if(limit){
    for(let i=values.length-1;i>=0&&recent.length<limit;i--){const r=values[i];if(branch&&branch!=='ALL'&&String(r[5]||r[4])!==String(branch))continue;recent.push({auditId:r[0],assetId:r[1],auditDate:formatDate_(r[2]),status:r[3],branch:r[5]||r[4],auditor:r[7],note:r[9]});}
  }
  return {latest:latest,recent:recent};
}
function getLatestAudits_(ss) { return getAuditSnapshot_(ss,0,'ALL').latest; }
function getRecentAudits_(ss,limit,branch) { return getAuditSnapshot_(ss,limit||10,branch).recent; }

function getAuditProgress_(filters) {
  filters=filters||{}; const ss=getDb_(), latest=getLatestAudits_(ss);
  const assets=readMasterRows_(ss.getSheetByName(ASSET_APP.MASTER_SHEET)).filter(r=>matchFilters_(r,filters)), branch={};
  assets.forEach(a=>{const b=a.branch||'ไม่ระบุ';if(!branch[b])branch[b]={branch:b,total:0,audited:0,normal:0,issue:0,notAudited:0};branch[b].total++;const x=latest[a.assetId];if(x){branch[b].audited++;if(x.status==='พบและปกติ')branch[b].normal++;else branch[b].issue++;}else branch[b].notAudited++;});
  return Object.keys(branch).sort().map(k=>{const x=branch[k];x.percent=x.total?x.audited/x.total*100:0;return x;});
}

function getAssetHistory_(assetId,user) {
  if(user) requireAdminRole_(user);
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.HISTORY_SHEET); if(!sh||sh.getLastRow()<2) return [];
  let rows=sh.getRange(2,1,sh.getLastRow()-1,10).getValues().filter(r=>!assetId||String(r[1])===String(assetId));
  if(user&&!isAdmin_(user)) rows=rows.filter(r=>String(r[6])===String(user.branch));
  return rows.reverse().map(r=>({historyId:r[0],assetId:r[1],date:formatDateTime_(r[2]),type:r[3],oldValue:r[4],newValue:r[5],branch:r[6],user:r[7],email:r[8],note:r[9]}));
}

function appendHistory_(ss,assetId,type,oldValue,newValue,branch,note,actor) {
  const sh=ss.getSheetByName(ASSET_APP.HISTORY_SHEET); if(!sh)return;
  const now=new Date(), user=actor||{username:'SYSTEM',name:'SYSTEM',email:''}, email=user.email||'';
  const id='HIS-'+Utilities.formatDate(now,Session.getScriptTimeZone()||'Asia/Bangkok','yyyyMMdd-HHmmss')+'-'+Math.floor(Math.random()*900+100);
  sh.appendRow([id,assetId,now,type,String(oldValue||''),String(newValue||''),branch||'',user.name||user.username||email,email,note||'']);
}

function getUploadRootFolder_() {
  const props=PropertiesService.getScriptProperties(); const id=props.getProperty('ASSET_UPLOAD_FOLDER_ID');
  if(id){try{return DriveApp.getFolderById(id);}catch(e){}}
  const folder=DriveApp.createFolder('AssetBranchUploads'); props.setProperty('ASSET_UPLOAD_FOLDER_ID',folder.getId()); return folder;
}

function getOrCreateChildFolder_(parent,name) {
  const it=parent.getFoldersByName(name); return it.hasNext()?it.next():parent.createFolder(name);
}

function getAssetUploadFolder_(branch,assetId){
  const root=getUploadRootFolder_(), branchFolder=getOrCreateChildFolder_(root,branch||'UNASSIGNED');
  return getOrCreateChildFolder_(branchFolder,assetId);
}
function saveDataUrlFile_(dataUrl,fileName,branch,assetId,category,assetFolderOpt) {
  const m=String(dataUrl||'').match(/^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/i); if(!m) throw new Error('รูปภาพไม่ถูกต้อง รองรับเฉพาะ PNG/JPG');
  const bytes=Utilities.base64Decode(m[2]); if(bytes.length>6*1024*1024) throw new Error('ไฟล์รูปมีขนาดใหญ่เกิน 6 MB');
  const assetFolder=assetFolderOpt||getAssetUploadFolder_(branch,assetId), catFolder=getOrCreateChildFolder_(assetFolder,category||'files');
  const blob=Utilities.newBlob(bytes,'image/jpeg',fileName.replace(/\.(png|jpeg)$/i,'.jpg'));
  const file=catFolder.createFile(blob); return file.getUrl();
}

/** สร้าง QR PNG จากรหัสทรัพย์สินผ่านบริการภายนอก โดยมี endpoint สำรอง */
function createQrPngBlob_(text) {
  text=String(text||'').trim(); if(!text) throw new Error('ไม่พบข้อความสำหรับสร้าง QR');
  const urls=[
    'https://quickchart.io/qr?text='+encodeURIComponent(text)+'&size=600&margin=3&ecLevel=M&format=png',
    'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&data='+encodeURIComponent(text),
    'https://chart.googleapis.com/chart?cht=qr&chs=600x600&chld=M%7C3&chl='+encodeURIComponent(text)
  ];
  let last='';
  for(let i=0;i<urls.length;i++){
    try{
      const res=UrlFetchApp.fetch(urls[i],{muteHttpExceptions:true,followRedirects:true,headers:{'User-Agent':'Mozilla/5.0 AssetBranchApp/3.4'}});
      const code=res.getResponseCode();
      if(code>=200&&code<300){
        const blob=res.getBlob();
        if(blob&&blob.getBytes().length>500) return blob.setName('QR_'+text+'.png').setContentType('image/png');
      }
      last='HTTP '+code;
    }catch(e){last=e.message||String(e);}
  }
  throw new Error('ไม่สามารถสร้าง QR ได้จากบริการสำรอง: '+last);
}

function saveBlobFile_(blob,fileName,branch,assetId,category) {
  const root=getUploadRootFolder_(), branchFolder=getOrCreateChildFolder_(root,branch||'UNASSIGNED'), assetFolder=getOrCreateChildFolder_(branchFolder,assetId), catFolder=getOrCreateChildFolder_(assetFolder,category||'files');
  const file=catFolder.createFile(blob.copyBlob().setName(fileName));
  return file.getUrl();
}

function generateAndSaveAssetQr_(asset,sh,map,row) {
  const blob=createQrPngBlob_(asset.assetId);
  const url=saveBlobFile_(blob,'QR_'+asset.assetId+'.png',asset.branch,asset.assetId,'codes');
  if(map.barcode&&row) sh.getRange(row,map.barcode).setValue(url);
  return url;
}

/** ส่งรายงาน PDF ปัจจุบันสำหรับแสดงหลังสแกน QR; สร้างใหม่เฉพาะกรณียังไม่มีไฟล์ */
function getAssetPdfPreview(token,assetId) {
  const user=requireSession_(token);
  requirePermission_(user,'view');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  if(!sh) throw new Error('ไม่พบฐานข้อมูลทรัพย์สิน');
  const map=getMasterHeaderMap_(sh), row=findAssetRow_(sh,map.assetId,assetId);
  if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  const asset=getAssetRowObject_(sh,row,map);
  enforceAssetBranch_(asset,user);
  let pdfUrl=asset.pdf||'';
  let fileId=extractDriveFileId_(pdfUrl);
  if(!fileId){
    pdfUrl=generateAssetPdf_(asset,user);
    if(map.pdf) sh.getRange(row,map.pdf).setValue(pdfUrl);
    fileId=extractDriveFileId_(pdfUrl);
  }
  if(!fileId) throw new Error('ไม่พบรายงาน PDF ของทรัพย์สิน '+assetId);
  const blob=DriveApp.getFileById(fileId).getBlob();
  if(blob.getContentType()!==MimeType.PDF) throw new Error('ไฟล์รายงานไม่ใช่ PDF');
  return {ok:true,assetId:asset.assetId,filename:'รายงานทรัพย์สิน_'+asset.assetId+'.pdf',mimeType:'application/pdf',base64:Utilities.base64Encode(blob.getBytes())};
}

/** ส่งไฟล์ PDF เป็น Base64 เพื่อให้หน้าเว็บเรียก Print dialog ได้ทันที */
function getAssetPdfForPrint(token,assetId) {
  const user=requireSession_(token);
  requirePermission_(user,'report');
  const ss=getDb_(), sh=ss.getSheetByName(ASSET_APP.MASTER_SHEET);
  if(!sh) throw new Error('ไม่พบฐานข้อมูลทรัพย์สิน');
  const map=getMasterHeaderMap_(sh), row=findAssetRow_(sh,map.assetId,assetId);
  if(!row) throw new Error('ไม่พบรหัสทรัพย์สิน '+assetId);
  const asset=getAssetRowObject_(sh,row,map);
  enforceAssetBranch_(asset,user);
  // สร้างรายงานใหม่ทุกครั้งก่อนพิมพ์ เพื่อให้ได้รูปแบบ PDF เวอร์ชันล่าสุดเสมอ
  const pdfUrl=generateAssetPdf_(asset,user);
  if(map.pdf) sh.getRange(row,map.pdf).setValue(pdfUrl);
  const fileId=extractDriveFileId_(pdfUrl);
  if(!fileId) throw new Error('ไม่สามารถสร้างไฟล์ PDF สำหรับพิมพ์ได้');
  const blob=DriveApp.getFileById(fileId).getBlob();
  if(blob.getContentType()!==MimeType.PDF) throw new Error('ไฟล์รายงานไม่ใช่ PDF');
  return {
    ok:true,
    assetId:asset.assetId,
    filename:'รายงานทรัพย์สิน_'+asset.assetId+'.pdf',
    mimeType:'application/pdf',
    base64:Utilities.base64Encode(blob.getBytes())
  };
}

function generateAssetPdf_(asset,user) {
  const ss=getDb_();
  const master=ss.getSheetByName(ASSET_APP.MASTER_SHEET), masterMap=getMasterHeaderMap_(master), masterRow=findAssetRow_(master,masterMap.assetId,asset.assetId);
  let qrUrl=asset.barcode||'';
  if(!qrUrl&&masterRow){
    try{ qrUrl=generateAndSaveAssetQr_(asset,master,masterMap,masterRow); asset.barcode=qrUrl; }catch(_qrErr){}
  }
  const transfer=getLatestCompletedTransferForAsset_(ss,asset.assetId);
  const root=getUploadRootFolder_();
  const branchFolder=getOrCreateChildFolder_(root,asset.branch||'UNASSIGNED');
  const assetFolder=getOrCreateChildFolder_(branchFolder,asset.assetId);
  const reportFolder=getOrCreateChildFolder_(assetFolder,'reports');
  const doc=DocumentApp.create('รายงานทะเบียนทรัพย์สินสาขา_'+asset.assetId);
  const body=doc.getBody();
  try{ body.setPageWidth(595).setPageHeight(842); }catch(_pageErr){}
  body.setMarginTop(24).setMarginBottom(20).setMarginLeft(32).setMarginRight(32);

  // Header: large title on the left, status pill on the right.
  const header=body.appendTable([['รายงานทะเบียนทรัพย์สินสาขา','สถานะ: '+(asset.assetStatus||'ใช้งาน')]]);
  header.setBorderWidth(0); header.setColumnWidth(0,400); header.setColumnWidth(1,105);
  const hTitle=header.getCell(0,0), hStatus=header.getCell(0,1);
  hTitle.setBackgroundColor('#FFFFFF'); hStatus.setBackgroundColor('#E7F5EE');
  hTitle.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  hStatus.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  hTitle.editAsText().setBold(true).setFontSize(14).setForegroundColor('#17384B');
  hStatus.editAsText().setBold(true).setFontSize(11).setForegroundColor('#34785E');

  body.appendParagraph('').setSpacingAfter(2);

  // Summary cards, matching the reference layout.
  const summary=body.appendTable([[ 
    'รหัสทรัพย์สิน\n'+(asset.assetId||'-')+'\nสาขา '+formatBranchLabel_(ss,asset.branch),
    'วันที่บันทึก\n'+(asset.recordDate||'-')+'\nอัปเดตล่าสุด',
    'แหล่งที่มา\n'+(asset.source||'ไม่ระบุ')+'\nจำนวน '+String(asset.quantity||1)+' รายการ'
  ]]);
  styleSummaryCards_(summary);

  appendSectionHeading_(body,'รายละเอียดทรัพย์สิน');
  const main=body.appendTable([['','']]);
  main.setBorderWidth(0); main.setColumnWidth(0,365); main.setColumnWidth(1,145);
  const left=main.getCell(0,0), right=main.getCell(0,1); left.clear(); right.clear();

  const detail=left.appendTable([
    ['ชื่อทรัพย์สิน',asset.assetName||'-'],
    ['Serial No.',asset.serialNo||'-'],
    ['ประเภททรัพย์สิน',asset.assetType||'-'],
    ['วันที่จัดซื้อ',asset.purchaseDate||'-'],
    ['ราคา (ต่อชิ้น)',formatMoneyText_(asset.price)+' บาท'],
    ['รวมราคา',formatMoneyText_((num_(asset.price)||0)*(num_(asset.quantity)||1))+' บาท'],
    ['ยี่ห้อ / รุ่น',[asset.brand,asset.model].filter(Boolean).join(' · ')||'-'],
    ['ผู้ดูแลทรัพย์สิน',asset.custodian||'-'],
    ['หมายเหตุสถานะ',asset.statusNote||'-']
  ]);
  styleReportTable_(detail,[0]);

  const imgBox=right.appendTable([['รูปทรัพย์สิน']]);
  imgBox.setBorderColor('#D8E2E8').setBorderWidth(1); imgBox.getCell(0,0).setBackgroundColor('#FFFFFF');
  imgBox.getCell(0,0).editAsText().setBold(true).setFontSize(10).setForegroundColor('#5F7480');
  appendDriveImageToCell_(imgBox.getCell(0,0),asset.image,118,92,'ไม่มีรูปทรัพย์สิน');

  right.appendParagraph('').setSpacingAfter(1);
  const qrBox=right.appendTable([['ทรัพย์สิน']]);
  qrBox.setBorderColor('#D8E2E8').setBorderWidth(1); qrBox.getCell(0,0).setBackgroundColor('#FFFFFF');
  qrBox.getCell(0,0).editAsText().setBold(true).setFontSize(10).setForegroundColor('#5F7480');
  appendDriveImageToCell_(qrBox.getCell(0,0),qrUrl,68,68,'ไม่สามารถแสดง QR');
  const qrp=qrBox.getCell(0,0).appendParagraph(asset.assetId||'');
  qrp.setAlignment(DocumentApp.HorizontalAlignment.CENTER); qrp.editAsText().setBold(true).setFontSize(11).setForegroundColor('#17384B');
  const qrHint=qrBox.getCell(0,0).appendParagraph('สแกนเพื่อค้นหา / ตรวจนับทรัพย์สิน');
  qrHint.setAlignment(DocumentApp.HorizontalAlignment.CENTER); qrHint.editAsText().setFontSize(9).setForegroundColor('#6D7E88');

  appendSectionHeading_(body,'การรับรองข้อมูล');
  const certItems=[
    ['ผู้ดูแลทรัพย์สิน',asset.custodian||'-'],
    ['ผู้ตรวจสอบ',asset.auditor||'-']
  ];
  if(transfer){
    certItems.splice(1,0,['ผู้โอน',transfer.transferorName||transfer.sentBy||'-']);
    certItems.splice(2,0,['ผู้รับโอน',transfer.receiverName||transfer.receivedBy||'-']);
  }
  const cert=body.appendTable([certItems.map(x=>x[0]+'\n'+x[1]+'\n\nลงชื่อ ____________________')]);
  styleCertificationTable_(cert);

  if(transfer){
    appendSectionHeading_(body,'ข้อมูลการโอนล่าสุด');
    const tr=body.appendTable([
      ['เลขที่โอน',transfer.transferId||'-','ต้นทาง',formatBranchLabel_(ss,transfer.fromBranch)],
      ['ปลายทาง',formatBranchLabel_(ss,transfer.toBranch),'วันที่รับ',transfer.receivedDate||'-'],
      ['ผู้ดูแลทรัพย์สินใหม่',transfer.newCustodian||asset.custodian||'-','หมายเหตุ',transfer.note||'-']
    ]);
    styleReportTable_(tr,[0,2]);
  }

  const foot=body.appendParagraph('เอกสารฉบับนี้จัดทำจากระบบบริหารทรัพย์สินสาขา · '+formatDateTime_(new Date()));
  foot.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  foot.editAsText().setFontSize(9).setForegroundColor('#6D7E88');

  applyPdfTypography_(body);
  hTitle.editAsText().setBold(true).setFontSize(14).setForegroundColor('#17384B');
  hStatus.editAsText().setBold(true).setFontSize(11).setForegroundColor('#34785E');
  doc.saveAndClose();
  const docFile=DriveApp.getFileById(doc.getId());
  const pdf=reportFolder.createFile(docFile.getAs(MimeType.PDF).setName('รายงานทรัพย์สิน_'+asset.assetId+'.pdf'));
  docFile.setTrashed(true);
  return pdf.getUrl();
}

function appendSectionHeading_(body,text){
  const p=body.appendParagraph('● '+text);
  p.setSpacingBefore(5).setSpacingAfter(3);
  p.editAsText().setBold(true).setFontSize(12).setForegroundColor('#176B83');
  return p;
}

function styleSummaryCards_(table){
  table.setBorderColor('#D9E4EA').setBorderWidth(1);
  for(let r=0;r<table.getNumRows();r++){
    const row=table.getRow(r);
    for(let c=0;c<row.getNumCells();c++){
      const cell=row.getCell(c); cell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER); cell.setBackgroundColor('#FFFFFF');
      try{cell.editAsText().setFontSize(10).setForegroundColor('#17384B');}catch(_e){}
    }
  }
}

function styleCertificationTable_(table){
  table.setBorderColor('#D8E2E8').setBorderWidth(1);
  const row=table.getRow(0);
  for(let c=0;c<row.getNumCells();c++){
    const cell=row.getCell(c); cell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER); cell.setBackgroundColor('#FFFFFF');
    try{cell.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.LEFT);}catch(_e){}
    try{cell.editAsText().setFontSize(10).setForegroundColor('#425D6B');}catch(_e){}
  }
}

/** ฟอนต์รายงาน Angsana News: ปรับขนาดจริงสำหรับ PDF A4 ให้ใกล้เคียง 14px/16px บนหน้าจอ */
function applyPdfTypography_(body){
  // Google Docs ใช้หน่วย point ไม่ใช่ px: 14px ≈ 10.5pt, 16px ≈ 12pt
  try{ body.editAsText().setFontFamily('Angsana News').setFontSize(10); }
  catch(e){ try{ body.editAsText().setFontFamily('Angsana New').setFontSize(10); }catch(_e){ try{body.editAsText().setFontFamily('Tahoma').setFontSize(10);}catch(__e){} } }
  for(let i=0;i<body.getNumChildren();i++){
    const el=body.getChild(i);
    if(el.getType()===DocumentApp.ElementType.PARAGRAPH){
      try{el.asParagraph().setLineSpacing(1.0).setSpacingBefore(0).setSpacingAfter(1);}catch(_e){}
    }
  }
}

function styleReportTable_(table,labelCols){
  labelCols=labelCols||[0];
  table.setBorderColor('#D8E2E8').setBorderWidth(1);
  for(let r=0;r<table.getNumRows();r++){
    const tr=table.getRow(r);
    for(let c=0;c<tr.getNumCells();c++){
      const cell=tr.getCell(c); cell.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);
      if(labelCols.indexOf(c)>=0){cell.setBackgroundColor('#F3F8FA');cell.editAsText().setBold(true).setForegroundColor('#425D6B');}
      try{cell.editAsText().setFontSize(10);}catch(_e){}
    }
  }
}

function appendDriveImageToCell_(cell,url,maxW,maxH,fallback){
  try{
    const id=extractDriveFileId_(url);
    if(!id) throw new Error('no id');
    const blob=DriveApp.getFileById(id).getBlob();
    const img=cell.appendImage(blob);
    const w=img.getWidth(), h=img.getHeight();
    const scale=Math.min(maxW/w,maxH/h,1);
    img.setWidth(Math.max(1,Math.round(w*scale))).setHeight(Math.max(1,Math.round(h*scale)));
  }catch(e){
    cell.appendParagraph(fallback||'ไม่สามารถแสดงรูปภาพ');
  }
}

function extractDriveFileId_(url){
  const s=String(url||'');
  let m=s.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  if(m) return m[1];
  m=s.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if(m) return m[1];
  m=s.match(/^([A-Za-z0-9_-]{20,})$/);
  return m?m[1]:'';
}

function formatMoneyText_(v){
  const n=Number(v)||0;
  return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function userFromRow_(r) {
  return {
    email:String(r[0]||''),username:String(r[1]||''),name:String(r[1]||'ผู้ใช้งาน'),role:String(r[2]||'USER').toUpperCase(),branch:String(r[3]||'ALL').toUpperCase()||'ALL',
    permissions:{view:isTrue_(r[4]),edit:isTrue_(r[5]),audit:isTrue_(r[6]),report:isTrue_(r[7]),admin:isTrue_(r[8])},active:isTrue_(r[9])
  };
}

function requireSession_(token) {
  token=String(token||''); if(!token) throw new Error('SESSION_EXPIRED: กรุณาเข้าสู่ระบบ');
  const cache=CacheService.getScriptCache(), raw=cache.get('LOGIN_'+token); if(!raw) throw new Error('SESSION_EXPIRED: Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  const user=JSON.parse(raw); if(!user.active) throw new Error('บัญชีนี้ถูกระงับการใช้งาน'); cache.put('LOGIN_'+token,raw,21600); return user;
}
function requirePermission_(user,key){if(!user||!user.permissions||!user.permissions[key])throw new Error('คุณไม่มีสิทธิ์ใช้งานส่วนนี้');}
function requireAdminRole_(user){if(!isAdmin_(user))throw new Error('ฟังก์ชันตรวจนับทรัพย์สินเปิดให้เฉพาะ ADMIN เท่านั้น');}
function isAdmin_(user){return !!user && (String(user.role).toUpperCase()==='ADMIN'||(user.permissions&&user.permissions.admin));}
function applyUserBranch_(filters,user){filters=Object.assign({},filters||{});if(user&&!isAdmin_(user))filters.branch=user.branch;return filters;}
function enforceAssetBranch_(asset,user){if(user&&!isAdmin_(user)&&String(asset.branch)!==String(user.branch))throw new Error('คุณไม่มีสิทธิ์ดูหรือแก้ไขข้อมูลสาขานี้');}

function hashPassword_(password,salt){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+'|'+String(password),Utilities.Charset.UTF_8);return bytes.map(b=>('0'+((b<0?b+256:b).toString(16))).slice(-2)).join('');}
function matchFilters_(r,f){if(f.branch&&f.branch!=='ALL'&&String(r.branch)!==String(f.branch))return false;if(f.assetType&&f.assetType!=='ALL'&&String(r.assetType)!==String(f.assetType))return false;if(f.custodian&&f.custodian!=='ALL'&&String(r.custodian)!==String(f.custodian))return false;return true;}
function uniqueSorted_(arr){return Array.from(new Set(arr.map(x=>String(x||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'th'));}
function mapToSeries_(obj){return Object.keys(obj).map(k=>({label:k,value:obj[k]})).sort((a,b)=>b.value-a.value);}
function extractLink_(raw,display){if(raw==null)return clean_(display);if(typeof raw==='string'){const m=raw.match(/https?:\/\/[^"'\s,)]+/i);if(m)return m[0];}return clean_(display);}

function dateToTransport_(v){
  if(v instanceof Date && !isNaN(v.getTime())){
    const y=v.getFullYear(),m=('0'+(v.getMonth()+1)).slice(-2),d=('0'+v.getDate()).slice(-2);
    return y+'-'+m+'-'+d;
  }
  return clean_(v);
}
function dateTimeToTransport_(v){
  if(v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  return clean_(v);
}

function parseDateInput_(v){if(!v)return '';if(v instanceof Date)return v;const s=String(v).trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));const d=new Date(s);return isNaN(d.getTime())?'':d;}
function formatDate_(v){if(!(v instanceof Date)||isNaN(v.getTime()))return '';let y=v.getFullYear();if(y>2400)y-=543;return ('0'+v.getDate()).slice(-2)+'/'+('0'+(v.getMonth()+1)).slice(-2)+'/'+y;}
function formatDateTime_(v){if(!(v instanceof Date)||isNaN(v.getTime()))return clean_(v);let y=v.getFullYear();if(y>2400)y-=543;const p=n=>('0'+n).slice(-2);return p(v.getDate())+'/'+p(v.getMonth()+1)+'/'+y+' '+p(v.getHours())+':'+p(v.getMinutes());}
function escapeRegex_(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function clean_(v){return v==null?'':String(v).trim();}
function num_(v){const n=Number(String(v==null?'':v).replace(/,/g,'').trim());return isFinite(n)?n:0;}
function isTrue_(v){return ['TRUE','1','YES','Y','ใช่'].indexOf(String(v||'').trim().toUpperCase())>=0;}
function boolText_(v,def){return(v===undefined||v===null||v==='')?(def?'TRUE':'FALSE'):(v===true||isTrue_(v)?'TRUE':'FALSE');}

/** ทดสอบการสร้าง QR จาก Apps Script Editor โดยไม่แก้ข้อมูลทะเบียน */
function RunTestQrGeneration() {
  const text='QR-TEST-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Bangkok','yyyyMMdd-HHmmss');
  const blob=createQrPngBlob_(text);
  return {ok:true,text:text,mimeType:blob.getContentType(),bytes:blob.getBytes().length};
}
