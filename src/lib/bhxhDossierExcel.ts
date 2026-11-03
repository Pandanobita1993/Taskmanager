import * as XLSX from 'xlsx-js-style';
import type { BhxhUnitKind } from './bhxhUnits';
import { saveFileToPreferredDirectory } from './fileStorage';

export type DossierTargetKind = BhxhUnitKind; // 'employees' | 'legal_representative' | 'foreign_workers'

export interface BhxhDossierEmployee {
  id: string;
  fullName: string;
  gender: string;
  bhxhCode: string;
  dob: string;
  baseSalary: number;
  allowance: number;
  position: string;
  contractNo: string;
  contractDate: string;
  cccd: string;
  cccdDate: string;
  address: string;
  phone: string;
  hospital: string;
  changeMonth: string;
  decreaseDate: string;
  decreaseDoc: string;
  householdHeadName: string;
  householdHeadCccd: string;
  householdHeadDob: string;
  householdHeadAddress: string;
  active: boolean;
  note: string;
}

export interface BhxhUnitDossier {
  key: string;
  clientId: string;
  companyName: string;
  taxCode: string;
  unitCode: string;
  targetKind: DossierTargetKind;
  agencyName: string;
  agencyCode: string;
  contractNote: string;
  // TK3-TS fields for new/updated units
  businessAddress: string;
  contactAddress: string;
  phone: string;
  email: string;
  legalRepName: string;
  legalRepTitle: string;
  legalRepCccd: string;
  licenseNo: string;
  licenseIssuedDate: string;
  licenseIssuedBy: string;
  businessField: string;
  paymentMethod: string;
  bankAccountNo: string;
  bankName: string;
  employees: BhxhDossierEmployee[];
  updatedAt: string;
}

export interface ContributionBreakdown {
  salary: number;
  totalRate: number;
  empBhxh: number;
  empBhyt: number;
  empBhtn: number;
  empTotal: number;
  compBhxh: number;
  compBhyt: number;
  compBhtnOrOdTs: number;
  compTotal: number;
  grandTotal: number;
}

export function calculateEmployeeContribution(
  emp: Pick<BhxhDossierEmployee, 'baseSalary' | 'allowance'>,
  kind: DossierTargetKind
): ContributionBreakdown {
  const salary = Math.max(0, Math.round((Number(emp.baseSalary) || 0) + (Number(emp.allowance) || 0)));
  if (kind === 'legal_representative') {
    const compBhxh = Math.round(salary * 0.22);
    const compBhyt = Math.round(salary * 0.045);
    const compOdTs = Math.round(salary * 0.03);
    const compTotal = compBhxh + compBhyt + compOdTs;
    return {
      salary,
      totalRate: 0.295,
      empBhxh: 0,
      empBhyt: 0,
      empBhtn: 0,
      empTotal: 0,
      compBhxh,
      compBhyt,
      compBhtnOrOdTs: compOdTs,
      compTotal,
      grandTotal: compTotal
    };
  }
  if (kind === 'foreign_workers') {
    const empBhxh = Math.round(salary * 0.08);
    const empBhyt = Math.round(salary * 0.015);
    const empTotal = empBhxh + empBhyt;
    const compBhxh = Math.round(salary * 0.175);
    const compBhyt = Math.round(salary * 0.03);
    const compTotal = compBhxh + compBhyt;
    return {
      salary,
      totalRate: 0.3,
      empBhxh,
      empBhyt,
      empBhtn: 0,
      empTotal,
      compBhxh,
      compBhyt,
      compBhtnOrOdTs: 0,
      compTotal,
      grandTotal: empTotal + compTotal
    };
  }
  // Default: 'employees' (32%: NLĐ 10.5% + Công ty 21.5%)
  const empBhxh = Math.round(salary * 0.08);
  const empBhyt = Math.round(salary * 0.015);
  const empBhtn = Math.round(salary * 0.01);
  const empTotal = empBhxh + empBhyt + empBhtn;
  const compBhxh = Math.round(salary * 0.175);
  const compBhyt = Math.round(salary * 0.03);
  const compBhtn = Math.round(salary * 0.01);
  const compTotal = compBhxh + compBhyt + compBhtn;
  return {
    salary,
    totalRate: 0.32,
    empBhxh,
    empBhyt,
    empBhtn,
    empTotal,
    compBhxh,
    compBhyt,
    compBhtnOrOdTs: compBhtn,
    compTotal,
    grandTotal: empTotal + compTotal
  };
}

const borderThin = {
  top: { style: 'thin', color: { rgb: '94A3B8' } },
  bottom: { style: 'thin', color: { rgb: '94A3B8' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } }
};

function styleRange(
  ws: XLSX.WorkSheet,
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  style: Record<string, unknown>
) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) {
        ws[addr] = { t: 's', v: '' };
      }
      ws[addr].s = { ...(ws[addr].s || {}), ...style };
    }
  }
}

function formatMonthDisplay(monthYm: string): string {
  const m = monthYm.match(/^(\d{4})-(\d{2})$/);
  return m ? `${m[2]}/${m[1]}` : monthYm;
}

function buildSheetBaoCao(dossier: BhxhUnitDossier, monthYm: string): XLSX.WorkSheet {
  const kind = dossier.targetKind;
  const monthText = formatMonthDisplay(monthYm);
  const activeEmployees = dossier.employees.filter((e) => e.active);
  const companyTitle = (dossier.companyName || '[TÊN CÔNG TY]').toUpperCase();
  const agencyTitle = dossier.agencyName
    ? dossier.agencyName.toUpperCase().startsWith('THAM GIA')
      ? dossier.agencyName.toUpperCase()
      : `THAM GIA TẠI ${dossier.agencyName.toUpperCase()}`
    : 'THAM GIA TẠI BHXH CƠ SỞ';
  const unitCodeText = dossier.unitCode || '……...';
  const agencyCodeText = dossier.agencyCode || '08008';

  const rows: (string | number)[][] = [];

  if (kind === 'legal_representative') {
    // 29.5% template (15 columns: A..O, table starts at C = col index 2)
    rows.push([companyTitle]);
    rows.push(['', '', `BÁO CÁO TIỀN ĐÓNG BHXH THÁNG ${monthText}`]);
    rows.push(['', '', '', agencyTitle]);
    rows.push([
      '',
      '',
      'STT',
      'HỌ TÊN',
      'Giới\ntính',
      'Mã số sổ BHXH',
      'Ngày sinh',
      'Lương CB',
      'Phụ cấp \nlương',
      'Lương tham gia BHXH',
      'Tỷ lệ đóng',
      'Tổng số phải đóng 29.5%',
      'CÔNG TY ĐÓNG 29,5%',
      '',
      '',
      '',
      ''
    ]);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', 'Công Ty đóng\n29.5%', '', '', 'Tổng', 'Ghi chú']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', 'HT&TT', 'BHYT', 'ÔĐ-TS', 'BHXH,BHYT,BHTN', '']);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', 0.22, 0.045, 0.03, 0.295, '']);

    const list = activeEmployees.length
      ? activeEmployees
      : [
          {
            id: 'empty-1',
            fullName: '',
            gender: '',
            bhxhCode: '',
            dob: '',
            baseSalary: 0,
            allowance: 0,
            note: ''
          } as BhxhDossierEmployee
        ];

    let sumBase = 0;
    let sumAllow = 0;
    let sumSal = 0;
    let sumGrand = 0;
    let sumHt = 0;
    let sumBhyt = 0;
    let sumOd = 0;
    let sumComp = 0;

    list.forEach((emp, idx) => {
      const calc = calculateEmployeeContribution(emp, kind);
      sumBase += Number(emp.baseSalary) || 0;
      sumAllow += Number(emp.allowance) || 0;
      sumSal += calc.salary;
      sumGrand += calc.grandTotal;
      sumHt += calc.compBhxh;
      sumBhyt += calc.compBhyt;
      sumOd += calc.compBhtnOrOdTs;
      sumComp += calc.compTotal;

      rows.push([
        '',
        '',
        idx + 1,
        emp.fullName,
        emp.gender,
        emp.bhxhCode,
        emp.dob,
        Number(emp.baseSalary) || 0,
        Number(emp.allowance) || 0,
        calc.salary,
        0.295,
        calc.grandTotal,
        calc.compBhxh,
        calc.compBhyt,
        calc.compBhtnOrOdTs,
        calc.compTotal,
        emp.note || ''
      ]);
    });

    rows.push([
      '',
      '',
      '',
      'TỔNG CỘNG',
      '',
      '',
      '',
      sumBase,
      sumAllow,
      sumSal,
      '',
      sumGrand,
      sumHt,
      sumBhyt,
      sumOd,
      sumComp,
      ''
    ]);
    rows.push([]);
    rows.push([
      '',
      '',
      '',
      'Cú pháp đóng tiền',
      '',
      `+BHXH+103+00+${unitCodeText}+${agencyCodeText}+DONG BHXH+`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = [
      { s: { r: 3, c: 2 }, e: { r: 6, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 6, c: 3 } },
      { s: { r: 3, c: 4 }, e: { r: 6, c: 4 } },
      { s: { r: 3, c: 5 }, e: { r: 6, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 6, c: 6 } },
      { s: { r: 3, c: 7 }, e: { r: 6, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 6, c: 8 } },
      { s: { r: 3, c: 9 }, e: { r: 6, c: 9 } },
      { s: { r: 3, c: 10 }, e: { r: 6, c: 10 } },
      { s: { r: 3, c: 11 }, e: { r: 6, c: 11 } },
      { s: { r: 3, c: 12 }, e: { r: 3, c: 16 } },
      { s: { r: 4, c: 12 }, e: { r: 4, c: 14 } }
    ];
    styleRange(ws, 0, 0, 2, 16, { font: { bold: true, sz: 12, name: 'Times New Roman' } });
    styleRange(ws, 3, 2, 6, 16, {
      font: { bold: true, sz: 10, name: 'Times New Roman' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      border: borderThin
    });
    const lastDataRow = 7 + list.length;
    styleRange(ws, 7, 2, lastDataRow, 16, {
      font: { sz: 10, name: 'Times New Roman' },
      border: borderThin
    });
    styleRange(ws, lastDataRow, 2, lastDataRow, 16, {
      font: { bold: true, sz: 10, name: 'Times New Roman' },
      fill: { fgColor: { rgb: 'F8FAFC' } },
      border: borderThin
    });
    ws['!cols'] = [
      { wch: 3 },
      { wch: 3 },
      { wch: 6 },
      { wch: 26 },
      { wch: 8 },
      { wch: 15 },
      { wch: 12 },
      { wch: 14 },
      { wch: 13 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 13 },
      { wch: 13 },
      { wch: 16 },
      { wch: 18 }
    ];
    return ws;
  }

  if (kind === 'foreign_workers') {
    // 30% template (NLĐ 9.5% + Công ty 20.5%)
    rows.push(['', '', companyTitle]);
    rows.push(['', '', `BÁO CÁO TIỀN ĐÓNG BHXH THÁNG ${monthText}`]);
    rows.push(['', '', agencyTitle]);
    rows.push([
      '',
      '',
      'STT',
      'HỌ TÊN',
      'Giới tính',
      'Mã số sổ BHXH',
      'Ngày sinh',
      'Lương CB',
      'Phụ cấp \nlương',
      'Lương tham gia BHXH',
      'Tỷ lệ đóng',
      'Tổng số phải đóng 30%',
      'NGƯỜI LAO ĐỘNG ĐÓNG 9,5%',
      '',
      '',
      'CÔNG TY  ĐÓNG 20,5%',
      '',
      '',
      ''
    ]);
    rows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'NLĐ đóng 9,5%',
      '',
      'Tổng',
      'Công Ty đóng\n20,5%',
      '',
      'Tổng',
      'Ghi chú'
    ]);
    rows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'BHXH 8%',
      'BHYT 1.5%',
      'BHXH,BHYT,BHTN',
      'BHXH 17,5%',
      'BHYT 3%',
      'BHXH,BHYT,BHTN',
      ''
    ]);
    rows.push(['', '', '', '', '', '', '', '', '', '', '', '', 0.08, 0.015, 0.095, 0.175, 0.03, 0.205, '']);

    const list = activeEmployees.length
      ? activeEmployees
      : [
          {
            id: 'empty-1',
            fullName: '',
            gender: '',
            bhxhCode: '',
            dob: '',
            baseSalary: 0,
            allowance: 0,
            note: ''
          } as BhxhDossierEmployee
        ];

    let sumBase = 0;
    let sumAllow = 0;
    let sumSal = 0;
    let sumGrand = 0;
    let sumEmpBhxh = 0;
    let sumEmpBhyt = 0;
    let sumEmpTot = 0;
    let sumCompBhxh = 0;
    let sumCompBhyt = 0;
    let sumCompTot = 0;

    list.forEach((emp, idx) => {
      const calc = calculateEmployeeContribution(emp, kind);
      sumBase += Number(emp.baseSalary) || 0;
      sumAllow += Number(emp.allowance) || 0;
      sumSal += calc.salary;
      sumGrand += calc.grandTotal;
      sumEmpBhxh += calc.empBhxh;
      sumEmpBhyt += calc.empBhyt;
      sumEmpTot += calc.empTotal;
      sumCompBhxh += calc.compBhxh;
      sumCompBhyt += calc.compBhyt;
      sumCompTot += calc.compTotal;

      rows.push([
        '',
        '',
        idx + 1,
        emp.fullName,
        emp.gender,
        emp.bhxhCode,
        emp.dob,
        Number(emp.baseSalary) || 0,
        Number(emp.allowance) || 0,
        calc.salary,
        0.3,
        calc.grandTotal,
        calc.empBhxh,
        calc.empBhyt,
        calc.empTotal,
        calc.compBhxh,
        calc.compBhyt,
        calc.compTotal,
        emp.note || ''
      ]);
    });

    rows.push([
      '',
      '',
      '',
      'TỔNG CỘNG',
      '',
      '',
      '',
      sumBase,
      sumAllow,
      sumSal,
      '',
      sumGrand,
      sumEmpBhxh,
      sumEmpBhyt,
      sumEmpTot,
      sumCompBhxh,
      sumCompBhyt,
      sumCompTot,
      ''
    ]);
    rows.push([
      '',
      '',
      '',
      'Cú pháp đóng tiền',
      '',
      `+BHXH+103+00+${unitCodeText}+${agencyCodeText}+ĐÓNG BHXH+`
    ]);
    rows.push([
      '',
      '',
      '',
      'Đóng bhxh lần đầu để cấp mã',
      '',
      `+BHXH+103+00+${companyTitle}+${agencyCodeText}+ĐÓNG BHXH+`
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = [
      { s: { r: 3, c: 2 }, e: { r: 6, c: 2 } },
      { s: { r: 3, c: 3 }, e: { r: 6, c: 3 } },
      { s: { r: 3, c: 4 }, e: { r: 6, c: 4 } },
      { s: { r: 3, c: 5 }, e: { r: 6, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 6, c: 6 } },
      { s: { r: 3, c: 7 }, e: { r: 6, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 6, c: 8 } },
      { s: { r: 3, c: 9 }, e: { r: 6, c: 9 } },
      { s: { r: 3, c: 10 }, e: { r: 6, c: 10 } },
      { s: { r: 3, c: 11 }, e: { r: 6, c: 11 } },
      { s: { r: 3, c: 12 }, e: { r: 3, c: 14 } },
      { s: { r: 3, c: 15 }, e: { r: 3, c: 18 } },
      { s: { r: 4, c: 12 }, e: { r: 4, c: 13 } },
      { s: { r: 4, c: 15 }, e: { r: 4, c: 16 } }
    ];
    styleRange(ws, 0, 0, 2, 18, { font: { bold: true, sz: 12, name: 'Times New Roman' } });
    styleRange(ws, 3, 2, 6, 18, {
      font: { bold: true, sz: 10, name: 'Times New Roman' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      border: borderThin
    });
    const lastDataRow = 7 + list.length;
    styleRange(ws, 7, 2, lastDataRow, 18, {
      font: { sz: 10, name: 'Times New Roman' },
      border: borderThin
    });
    styleRange(ws, lastDataRow, 2, lastDataRow, 18, {
      font: { bold: true, sz: 10, name: 'Times New Roman' },
      fill: { fgColor: { rgb: 'F8FAFC' } },
      border: borderThin
    });
    ws['!cols'] = [
      { wch: 3 },
      { wch: 3 },
      { wch: 6 },
      { wch: 26 },
      { wch: 8 },
      { wch: 15 },
      { wch: 12 },
      { wch: 14 },
      { wch: 13 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 13 },
      { wch: 13 },
      { wch: 15 },
      { wch: 13 },
      { wch: 13 },
      { wch: 15 },
      { wch: 18 }
    ];
    return ws;
  }

  // Default: 'employees' (32%: NLĐ 10.5% + Công ty 21.5%)
  rows.push(['', '', companyTitle]);
  rows.push(['', '', `BÁO CÁO TIỀN ĐÓNG BHXH THÁNG ${monthText}`]);
  rows.push(['', '', agencyTitle]);
  rows.push([
    '',
    '',
    'STT',
    'HỌ TÊN',
    'Giới tính',
    'Mã số sổ BHXH',
    'Ngày sinh',
    'Lương CB',
    'Phụ cấp \nlương',
    'Lương tham gia BHXH',
    'Tỷ lệ đóng',
    'Tổng số phải đóng 32%',
    'NGƯỜI LAO ĐỘNG ĐÓNG 10.5%',
    '',
    '',
    '',
    'CÔNG TY  ĐÓNG 21.5%',
    '',
    '',
    '',
    ''
  ]);
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'NLĐ đóng 10,5%',
    '',
    '',
    'Tổng',
    'Công Ty đóng\n21.5%',
    '',
    '',
    'Tổng',
    'Ghi chú'
  ]);
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'BHXH 8%',
    'BHYT 1.5%',
    'BHTN 1%',
    'BHXH,BHYT,BHTN',
    'BHXH 17,5%',
    'BHYT 3%',
    'BHTN 1%',
    'BHXH,BHYT,BHTN',
    ''
  ]);
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0.08,
    0.015,
    0.01,
    0.105,
    0.175,
    0.03,
    0.01,
    0.215,
    ''
  ]);

  const list = activeEmployees.length
    ? activeEmployees
    : [
        {
          id: 'empty-1',
          fullName: '',
          gender: '',
          bhxhCode: '',
          dob: '',
          baseSalary: 0,
          allowance: 0,
          note: ''
        } as BhxhDossierEmployee
      ];

  let sumBase = 0;
  let sumAllow = 0;
  let sumSal = 0;
  let sumGrand = 0;
  let sumEmpBhxh = 0;
  let sumEmpBhyt = 0;
  let sumEmpBhtn = 0;
  let sumEmpTot = 0;
  let sumCompBhxh = 0;
  let sumCompBhyt = 0;
  let sumCompBhtn = 0;
  let sumCompTot = 0;

  list.forEach((emp, idx) => {
    const calc = calculateEmployeeContribution(emp, kind);
    sumBase += Number(emp.baseSalary) || 0;
    sumAllow += Number(emp.allowance) || 0;
    sumSal += calc.salary;
    sumGrand += calc.grandTotal;
    sumEmpBhxh += calc.empBhxh;
    sumEmpBhyt += calc.empBhyt;
    sumEmpBhtn += calc.empBhtn;
    sumEmpTot += calc.empTotal;
    sumCompBhxh += calc.compBhxh;
    sumCompBhyt += calc.compBhyt;
    sumCompBhtn += calc.compBhtnOrOdTs;
    sumCompTot += calc.compTotal;

    rows.push([
      '',
      '',
      idx + 1,
      emp.fullName,
      emp.gender,
      emp.bhxhCode,
      emp.dob,
      Number(emp.baseSalary) || 0,
      Number(emp.allowance) || 0,
      calc.salary,
      0.32,
      calc.grandTotal,
      calc.empBhxh,
      calc.empBhyt,
      calc.empBhtn,
      calc.empTotal,
      calc.compBhxh,
      calc.compBhyt,
      calc.compBhtnOrOdTs,
      calc.compTotal,
      emp.note || ''
    ]);
  });

  rows.push([
    '',
    '',
    '',
    'TỔNG CỘNG',
    '',
    '',
    '',
    sumBase,
    sumAllow,
    sumSal,
    '',
    sumGrand,
    sumEmpBhxh,
    sumEmpBhyt,
    sumEmpBhtn,
    sumEmpTot,
    sumCompBhxh,
    sumCompBhyt,
    sumCompBhtn,
    sumCompTot,
    ''
  ]);
  rows.push([
    '',
    '',
    '',
    'Cú pháp đóng tiền',
    '',
    `+BHXH+103+00+${unitCodeText}+${agencyCodeText}+ĐÓNG BHXH+`
  ]);
  rows.push([
    '',
    '',
    '',
    'Đóng bhxh lần đầu để cấp mã',
    '',
    `+BHXH+103+00+${companyTitle}+${agencyCodeText}+ĐÓNG BHXH+`
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [
    { s: { r: 3, c: 2 }, e: { r: 6, c: 2 } },
    { s: { r: 3, c: 3 }, e: { r: 6, c: 3 } },
    { s: { r: 3, c: 4 }, e: { r: 6, c: 4 } },
    { s: { r: 3, c: 5 }, e: { r: 6, c: 5 } },
    { s: { r: 3, c: 6 }, e: { r: 6, c: 6 } },
    { s: { r: 3, c: 7 }, e: { r: 6, c: 7 } },
    { s: { r: 3, c: 8 }, e: { r: 6, c: 8 } },
    { s: { r: 3, c: 9 }, e: { r: 6, c: 9 } },
    { s: { r: 3, c: 10 }, e: { r: 6, c: 10 } },
    { s: { r: 3, c: 11 }, e: { r: 6, c: 11 } },
    { s: { r: 3, c: 12 }, e: { r: 3, c: 15 } },
    { s: { r: 3, c: 16 }, e: { r: 3, c: 20 } },
    { s: { r: 4, c: 12 }, e: { r: 4, c: 14 } },
    { s: { r: 4, c: 16 }, e: { r: 4, c: 18 } }
  ];
  styleRange(ws, 0, 0, 2, 20, { font: { bold: true, sz: 12, name: 'Times New Roman' } });
  styleRange(ws, 3, 2, 6, 20, {
    font: { bold: true, sz: 10, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: borderThin
  });
  const lastDataRow = 7 + list.length;
  styleRange(ws, 7, 2, lastDataRow, 20, {
    font: { sz: 10, name: 'Times New Roman' },
    border: borderThin
  });
  styleRange(ws, lastDataRow, 2, lastDataRow, 20, {
    font: { bold: true, sz: 10, name: 'Times New Roman' },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    border: borderThin
  });
  ws['!cols'] = [
    { wch: 3 },
    { wch: 3 },
    { wch: 6 },
    { wch: 26 },
    { wch: 8 },
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 13 },
    { wch: 16 },
    { wch: 10 },
    { wch: 16 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 15 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 15 },
    { wch: 18 }
  ];
  return ws;
}

function buildSheetTangGiam(dossier: BhxhUnitDossier, monthYm: string): XLSX.WorkSheet {
  const monthText = formatMonthDisplay(monthYm);
  const rows: (string | number)[][] = [];

  if (dossier.targetKind === 'legal_representative') {
    rows.push([
      `THÔNG TIN CẦN CUNG CẤP KHI BÁO TĂNG / GIẢM THÁNG ${monthText}`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Trường hợp NLĐ chưa có số sổ BHXH\nthì cung cấp thêm thông tin chủ hộ gia đình + hình CCCD của người lao động',
      '',
      '',
      ''
    ]);
    rows.push([
      'Họ & Tên',
      'Mức tiền lương \nđóng BHXH',
      'Chức vụ',
      'Số sổ BHXH',
      'Ngày sinh',
      'CCCD',
      'Ngày cấp',
      'Nơi ở',
      'SĐT',
      'Bệnh viện khám bệnh\n lần đầu',
      'GHI CHÚ',
      'Tăng / giảm\ntừ tháng…',
      'Họ & tên',
      'CCCD/CC',
      'Ngày sinh',
      'Địa chỉ'
    ]);
    for (const emp of dossier.employees) {
      const salary = (Number(emp.baseSalary) || 0) + (Number(emp.allowance) || 0);
      rows.push([
        emp.fullName,
        salary,
        emp.position,
        emp.bhxhCode,
        emp.dob,
        emp.cccd,
        emp.cccdDate,
        emp.address,
        emp.phone,
        emp.hospital,
        emp.note,
        emp.changeMonth || monthText,
        emp.householdHeadName,
        emp.householdHeadCccd,
        emp.householdHeadDob,
        emp.householdHeadAddress
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    styleRange(ws, 0, 0, 1, 15, {
      font: { bold: true, sz: 10, name: 'Times New Roman' },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      border: borderThin
    });
    if (dossier.employees.length > 0) {
      styleRange(ws, 2, 0, 1 + dossier.employees.length, 15, {
        font: { sz: 10, name: 'Times New Roman' },
        border: borderThin
      });
    }
    return ws;
  }

  // Employees (32%) & Foreign workers (30%)
  rows.push([
    `THÔNG TIN CẦN CUNG CẤP KHI BÁO TĂNG / GIẢM THÁNG ${monthText}`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    dossier.contractNote || 'Báo tăng lao động theo hợp đồng lao động',
    '',
    '',
    'Trường hợp NLĐ chưa có số sổ BHXH\nthì cung cấp thêm thông tin chủ hộ gia đình + hình CCCD của người lao động',
    '',
    '',
    '',
    'Ngày báo giảm BH',
    'Văn bản'
  ]);
  rows.push([
    'Họ & Tên',
    'Giới tính',
    'Lương tham gia BHXH',
    'Chức vụ - Phòng ban',
    'Số HĐLĐ',
    'Ngày ký',
    'Mã số sổ BHXH',
    'Ngày sinh',
    'CCCD',
    'Ngày cấp',
    'Nơi ở',
    'SĐT',
    'Bệnh viện khám bệnh\n lần đầu',
    'Tăng / giảm\ntừ tháng…',
    'Họ & tên',
    'CCCD/CC',
    'Ngày sinh',
    'Địa chỉ',
    'Ngày báo giảm BH',
    'Văn bản'
  ]);
  for (const emp of dossier.employees) {
    const salary = (Number(emp.baseSalary) || 0) + (Number(emp.allowance) || 0);
    rows.push([
      emp.fullName,
      emp.gender,
      salary,
      emp.position,
      emp.contractNo,
      emp.contractDate,
      emp.bhxhCode,
      emp.dob,
      emp.cccd,
      emp.cccdDate,
      emp.address,
      emp.phone,
      emp.hospital,
      emp.changeMonth || monthText,
      emp.householdHeadName,
      emp.householdHeadCccd,
      emp.householdHeadDob,
      emp.householdHeadAddress,
      emp.decreaseDate,
      emp.decreaseDoc
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  styleRange(ws, 0, 0, 1, 19, {
    font: { bold: true, sz: 10, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: borderThin
  });
  if (dossier.employees.length > 0) {
    styleRange(ws, 2, 0, 1 + dossier.employees.length, 19, {
      font: { sz: 10, name: 'Times New Roman' },
      border: borderThin
    });
  }
  return ws;
}

export async function exportMonthlyBhxhReportExcel(
  dossier: BhxhUnitDossier,
  monthYm: string
): Promise<{ fileName: string; savedToFolder: boolean }> {
  const wb = XLSX.utils.book_new();
  const wsReport = buildSheetBaoCao(dossier, monthYm);
  const wsChange = buildSheetTangGiam(dossier, monthYm);
  XLSX.utils.book_append_sheet(wb, wsReport, 'BAO CAO TIEN DONG BHXH');
  XLSX.utils.book_append_sheet(wb, wsChange, 'THONG TIN BAO TANG GIAM');

  const safeCompany = (dossier.unitCode || dossier.companyName || 'DonVi')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 40);
  const fileName = `BaoCao_BHXH_${safeCompany}_${monthYm}.xlsx`;

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  let savedToFolder = false;
  try {
    savedToFolder = await saveFileToPreferredDirectory(
      fileName,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  } catch {
    savedToFolder = false;
  }

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { fileName, savedToFolder };
}

export async function exportTk3TsExcel(
  dossier: BhxhUnitDossier
): Promise<{ fileName: string; savedToFolder: boolean }> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  const rows: (string | number)[][] = [
    ['BẢO HIỂM XÃ HỘI VIỆT NAM', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['', '', '', '', 'Độc lập - Tự do - Hạnh phúc'],
    ['', '', '', '', 'Mẫu TK3-TS'],
    ['', '', '', '', '(Ban hành kèm theo QĐ số: 490/QĐ-BHXH ngày 28/03/2023 của BHXH Việt Nam)'],
    [],
    ['TỜ KHAI', '', '', '', '', '', '', ''],
    ['ĐƠN VỊ THAM GIA, ĐIỀU CHỈNH THÔNG TIN BHXH, BHYT', '', '', '', '', '', '', ''],
    [`Kính gửi: ${dossier.agencyName || 'Bảo hiểm xã hội Cơ sở ................................'}`, '', '', '', '', '', '', ''],
    [],
    ['I. THÔNG TIN CỦA ĐƠN VỊ (Dành cho đơn vị đăng ký tham gia lần đầu hoặc điều chỉnh thông tin)', '', '', '', '', '', '', ''],
    [`[01]. Tên đơn vị: ${(dossier.companyName || '').toUpperCase()}`, '', '', '', '', '', '', ''],
    [
      `[02]. Mã số đơn vị (nếu đã được cấp): ${dossier.unitCode || 'Đăng ký cấp mã lần đầu'}`,
      '',
      '',
      '',
      `[03]. Mã số thuế: ${dossier.taxCode || ''}`,
      '',
      '',
      ''
    ],
    [`[04]. Địa chỉ đăng ký kinh doanh: ${dossier.businessAddress || ''}`, '', '', '', '', '', '', ''],
    [`[05]. Địa chỉ nhận thông báo / giao dịch: ${dossier.contactAddress || dossier.businessAddress || ''}`, '', '', '', '', '', '', ''],
    [
      `[06]. Số điện thoại: ${dossier.phone || ''}`,
      '',
      '',
      '',
      `[07]. Địa chỉ Email: ${dossier.email || ''}`,
      '',
      '',
      ''
    ],
    [
      `[08]. Quyết định thành lập / Giấy phép ĐKKD số: ${dossier.licenseNo || ''}`,
      '',
      '',
      '',
      `Ngày cấp: ${dossier.licenseIssuedDate || ''}`,
      '',
      `Cơ quan cấp: ${dossier.licenseIssuedBy || 'Sở KH&ĐT / Sở Tài chính'}`,
      ''
    ],
    [
      `[09]. Người đại diện theo pháp luật: ${dossier.legalRepName || ''}`,
      '',
      '',
      '',
      `Chức danh: ${dossier.legalRepTitle || 'Giám đốc'}`,
      '',
      `Số CCCD/Hộ chiếu: ${dossier.legalRepCccd || ''}`,
      ''
    ],
    [`[10]. Lĩnh vực hoạt động / Ngành nghề chính: ${dossier.businessField || ''}`, '', '', '', '', '', '', ''],
    [
      `[11]. Tài khoản ngân hàng số: ${dossier.bankAccountNo || ''}`,
      '',
      '',
      '',
      `Mở tại Ngân hàng: ${dossier.bankName || ''}`,
      '',
      '',
      ''
    ],
    [`[12]. Phương thức đóng khác (nếu có): ${dossier.paymentMethod || 'Đóng hằng tháng'}`, '', '', '', '', '', '', ''],
    [],
    ['II. NỘI DUNG THAY ĐỔI, YÊU CẦU (Dành cho đơn vị điều chỉnh thông tin)', '', '', '', '', '', '', ''],
    ['STT', 'Nội dung chỉ tiêu điều chỉnh', '', 'Thông tin cũ', '', 'Thông tin mới', '', 'Ghi chú / Tài liệu kèm theo'],
    ['1', 'Đăng ký tham gia BHXH, BHYT, BHTN cho đơn vị', '', '', '', (dossier.companyName || '').toUpperCase(), '', 'Giấy phép ĐKKD'],
    ['2', '', '', '', '', '', '', ''],
    [],
    [
      'Đơn vị cam kết hoàn toàn chịu trách nhiệm trước pháp luật về tính chính xác, trung thực của nội dung kê khai trên và lưu giữ hồ sơ tại đơn vị theo đúng quy định./.'
    ],
    [],
    ['', '', '', '', `..........., ngày ${day} tháng ${month} năm ${year}`],
    ['Cán bộ tiếp nhận hồ sơ', '', '', '', 'THỦ TRƯỞNG ĐƠN VỊ'],
    ['(Ký và ghi rõ họ tên)', '', '', '', '(Ký, ghi rõ họ tên và đóng dấu)'],
    [],
    [],
    [],
    ['', '', '', '', dossier.legalRepName || '']
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: 4 }, e: { r: 0, c: 7 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 7 } },
    { s: { r: 2, c: 4 }, e: { r: 2, c: 7 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 7 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 7 } },
    { s: { r: 6, c: 0 }, e: { r: 6, c: 7 } },
    { s: { r: 7, c: 0 }, e: { r: 7, c: 7 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 7 } },
    { s: { r: 10, c: 0 }, e: { r: 10, c: 7 } },
    { s: { r: 12, c: 0 }, e: { r: 12, c: 7 } },
    { s: { r: 13, c: 0 }, e: { r: 13, c: 7 } },
    { s: { r: 17, c: 0 }, e: { r: 17, c: 7 } },
    { s: { r: 19, c: 0 }, e: { r: 19, c: 7 } },
    { s: { r: 21, c: 0 }, e: { r: 21, c: 7 } },
    { s: { r: 22, c: 1 }, e: { r: 22, c: 2 } },
    { s: { r: 22, c: 3 }, e: { r: 22, c: 4 } },
    { s: { r: 22, c: 5 }, e: { r: 22, c: 6 } },
    { s: { r: 23, c: 1 }, e: { r: 23, c: 2 } },
    { s: { r: 23, c: 3 }, e: { r: 23, c: 4 } },
    { s: { r: 23, c: 5 }, e: { r: 23, c: 6 } },
    { s: { r: 24, c: 1 }, e: { r: 24, c: 2 } },
    { s: { r: 24, c: 3 }, e: { r: 24, c: 4 } },
    { s: { r: 24, c: 5 }, e: { r: 24, c: 6 } },
    { s: { r: 26, c: 0 }, e: { r: 26, c: 7 } },
    { s: { r: 28, c: 4 }, e: { r: 28, c: 7 } },
    { s: { r: 29, c: 0 }, e: { r: 29, c: 2 } },
    { s: { r: 29, c: 4 }, e: { r: 29, c: 7 } },
    { s: { r: 30, c: 0 }, e: { r: 30, c: 2 } },
    { s: { r: 30, c: 4 }, e: { r: 30, c: 7 } },
    { s: { r: 34, c: 4 }, e: { r: 34, c: 7 } }
  ];

  styleRange(ws, 0, 0, 34, 7, { font: { sz: 11, name: 'Times New Roman' } });
  styleRange(ws, 0, 0, 1, 7, {
    font: { bold: true, sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center' }
  });
  styleRange(ws, 5, 0, 6, 7, {
    font: { bold: true, sz: 14, name: 'Times New Roman' },
    alignment: { horizontal: 'center' }
  });
  styleRange(ws, 7, 0, 7, 7, {
    font: { italic: true, bold: true, sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center' }
  });
  styleRange(ws, 9, 0, 9, 7, { font: { bold: true, sz: 11, name: 'Times New Roman' } });
  styleRange(ws, 21, 0, 21, 7, { font: { bold: true, sz: 11, name: 'Times New Roman' } });
  styleRange(ws, 22, 0, 22, 7, {
    font: { bold: true, sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: borderThin
  });
  styleRange(ws, 23, 0, 24, 7, {
    font: { sz: 11, name: 'Times New Roman' },
    border: borderThin
  });
  styleRange(ws, 29, 0, 30, 7, {
    font: { bold: true, sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center' }
  });
  styleRange(ws, 34, 4, 34, 7, {
    font: { bold: true, sz: 11, name: 'Times New Roman' },
    alignment: { horizontal: 'center' }
  });

  ws['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TK3-TS');

  const safeCompany = (dossier.unitCode || dossier.companyName || 'DonVi')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 40);
  const fileName = `Mau_TK3-TS_${safeCompany}.xlsx`;

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  let savedToFolder = false;
  try {
    savedToFolder = await saveFileToPreferredDirectory(
      fileName,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  } catch {
    savedToFolder = false;
  }

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  return { fileName, savedToFolder };
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d.-]/g, '');
    const num = Number(cleaned);
    return isFinite(num) ? num : 0;
  }
  return 0;
}

function cleanStr(val: unknown): string {
  if (val == null) return '';
  return String(val).replace(/\s+/g, ' ').trim();
}

export async function parseDossierFromExcelFile(file: File): Promise<{
  companyName?: string;
  agencyName?: string;
  agencyCode?: string;
  targetKind?: DossierTargetKind;
  employees: BhxhDossierEmployee[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const employeesMap = new Map<string, BhxhDossierEmployee>();
  let detectedCompany = '';
  let detectedAgency = '';
  let detectedAgencyCode = '';
  let detectedKind: DossierTargetKind | undefined;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
      header: 1,
      defval: ''
    });

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r] || [];
      const rowJoined = row.map(cleanStr).join(' | ');

      if (!detectedAgency && /THAM GIA TẠI BHXH/i.test(rowJoined)) {
        const cell = row.map(cleanStr).find((c) => /THAM GIA TẠI BHXH/i.test(c)) || '';
        detectedAgency = cell.replace(/^THAM GIA TẠI\s*/i, '').trim();
      }
      if (!detectedCompany && /BÁO CÁO TIỀN ĐÓNG BHXH/i.test(rowJoined) && r > 0) {
        const prevRow = rows[r - 1] || [];
        const cand = prevRow.map(cleanStr).find((c) => c && !/^\[TÊN CÔNG TY\]$/i.test(c));
        if (cand) detectedCompany = cand;
      }
      if (!detectedAgencyCode && /\+BHXH\+103\+00\+/i.test(rowJoined)) {
        const m = rowJoined.match(/\+BHXH\+103\+00\+[^+]+\+(\d{5})\+/i);
        if (m) detectedAgencyCode = m[1];
      }
      if (/29[.,]5%/.test(rowJoined)) detectedKind = 'legal_representative';
      else if (/20[.,]5%|9[.,]5%/.test(rowJoined)) detectedKind = 'foreign_workers';
      else if (/21[.,]5%|10[.,]5%|32%/.test(rowJoined) && !detectedKind) detectedKind = 'employees';

      // Check if this row is the header row of BÁO CÁO TIỀN ĐÓNG BHXH ("STT", "HỌ TÊN")
      const sttIdx = row.findIndex((c) => /^STT$/i.test(cleanStr(c)));
      const nameIdx = row.findIndex((c) => /^HỌ\s*(&\s*)?TÊN$/i.test(cleanStr(c)));

      if (sttIdx >= 0 && nameIdx > sttIdx) {
        for (let dr = r + 1; dr < rows.length; dr++) {
          const dRow = rows[dr] || [];
          const fullName = cleanStr(dRow[nameIdx]);
          if (!fullName || /^TỔNG|Cú pháp|BHXH|HT&TT|0\.\d+/i.test(fullName)) continue;
          const gender = cleanStr(dRow[nameIdx + 1]);
          const bhxhCode = cleanStr(dRow[nameIdx + 2]);
          const dob = cleanStr(dRow[nameIdx + 3]);
          const baseSalary = parseNumber(dRow[nameIdx + 4]);
          const allowance = parseNumber(dRow[nameIdx + 5]);
          const totalSal = parseNumber(dRow[nameIdx + 6]);
          const finalBase = baseSalary > 0 ? baseSalary : totalSal;

          const key = (bhxhCode || fullName).toLocaleLowerCase('vi');
          const existing = employeesMap.get(key);
          employeesMap.set(key, {
            id: existing?.id || crypto.randomUUID(),
            fullName,
            gender: gender || existing?.gender || '',
            bhxhCode: bhxhCode || existing?.bhxhCode || '',
            dob: dob || existing?.dob || '',
            baseSalary: finalBase || existing?.baseSalary || 0,
            allowance: allowance || existing?.allowance || 0,
            position: existing?.position || '',
            contractNo: existing?.contractNo || '',
            contractDate: existing?.contractDate || '',
            cccd: existing?.cccd || '',
            cccdDate: existing?.cccdDate || '',
            address: existing?.address || '',
            phone: existing?.phone || '',
            hospital: existing?.hospital || '',
            changeMonth: existing?.changeMonth || '',
            decreaseDate: existing?.decreaseDate || '',
            decreaseDoc: existing?.decreaseDoc || '',
            householdHeadName: existing?.householdHeadName || '',
            householdHeadCccd: existing?.householdHeadCccd || '',
            householdHeadDob: existing?.householdHeadDob || '',
            householdHeadAddress: existing?.householdHeadAddress || '',
            active: true,
            note: existing?.note || ''
          });
        }
      } else if (nameIdx === 0 && /Lương|Chức vụ/i.test(rowJoined)) {
        // Header row of THÔNG TIN CẦN CUNG CẤP KHI BÁO TĂNG / GIẢM
        const isLegalRep = /Mức tiền lương/i.test(cleanStr(row[1]));
        for (let dr = r + 1; dr < rows.length; dr++) {
          const dRow = rows[dr] || [];
          const fullName = cleanStr(dRow[0]);
          if (
            !fullName ||
            /^\[TÊN CÔNG TY\]|BÁO CÁO|THAM GIA|STT|Họ & Tên/i.test(fullName)
          ) {
            if (/BÁO CÁO TIỀN ĐÓNG/i.test(dRow.map(cleanStr).join(' '))) break;
            continue;
          }
          if (isLegalRep) {
            const salary = parseNumber(dRow[1]);
            const position = cleanStr(dRow[2]);
            const bhxhCode = cleanStr(dRow[3]);
            const dob = cleanStr(dRow[4]);
            const cccd = cleanStr(dRow[5]);
            const cccdDate = cleanStr(dRow[6]);
            const address = cleanStr(dRow[7]);
            const phone = cleanStr(dRow[8]);
            const hospital = cleanStr(dRow[9]);
            const note = cleanStr(dRow[10]);
            const changeMonth = cleanStr(dRow[11]);
            const key = (bhxhCode || fullName).toLocaleLowerCase('vi');
            const existing = employeesMap.get(key);
            employeesMap.set(key, {
              id: existing?.id || crypto.randomUUID(),
              fullName,
              gender: existing?.gender || '',
              bhxhCode: bhxhCode || existing?.bhxhCode || '',
              dob: dob || existing?.dob || '',
              baseSalary: salary || existing?.baseSalary || 0,
              allowance: existing?.allowance || 0,
              position: position || existing?.position || '',
              contractNo: existing?.contractNo || '',
              contractDate: existing?.contractDate || '',
              cccd: cccd || existing?.cccd || '',
              cccdDate: cccdDate || existing?.cccdDate || '',
              address: address || existing?.address || '',
              phone: phone || existing?.phone || '',
              hospital: hospital || existing?.hospital || '',
              changeMonth: changeMonth || existing?.changeMonth || '',
              decreaseDate: existing?.decreaseDate || '',
              decreaseDoc: existing?.decreaseDoc || '',
              householdHeadName: cleanStr(dRow[12]) || existing?.householdHeadName || '',
              householdHeadCccd: cleanStr(dRow[13]) || existing?.householdHeadCccd || '',
              householdHeadDob: cleanStr(dRow[14]) || existing?.householdHeadDob || '',
              householdHeadAddress: cleanStr(dRow[15]) || existing?.householdHeadAddress || '',
              active: true,
              note: note || existing?.note || ''
            });
          } else {
            const gender = cleanStr(dRow[1]);
            const salary = parseNumber(dRow[2]);
            const position = cleanStr(dRow[3]);
            const contractNo = cleanStr(dRow[4]);
            const contractDate = cleanStr(dRow[5]);
            const bhxhCode = cleanStr(dRow[6]);
            const dob = cleanStr(dRow[7]);
            const cccd = cleanStr(dRow[8]);
            const cccdDate = cleanStr(dRow[9]);
            const address = cleanStr(dRow[10]);
            const phone = cleanStr(dRow[11]);
            const hospital = cleanStr(dRow[12]);
            const changeMonth = cleanStr(dRow[13]);
            const key = (bhxhCode || fullName).toLocaleLowerCase('vi');
            const existing = employeesMap.get(key);
            employeesMap.set(key, {
              id: existing?.id || crypto.randomUUID(),
              fullName,
              gender: gender || existing?.gender || '',
              bhxhCode: bhxhCode || existing?.bhxhCode || '',
              dob: dob || existing?.dob || '',
              baseSalary: salary || existing?.baseSalary || 0,
              allowance: existing?.allowance || 0,
              position: position || existing?.position || '',
              contractNo: contractNo || existing?.contractNo || '',
              contractDate: contractDate || existing?.contractDate || '',
              cccd: cccd || existing?.cccd || '',
              cccdDate: cccdDate || existing?.cccdDate || '',
              address: address || existing?.address || '',
              phone: phone || existing?.phone || '',
              hospital: hospital || existing?.hospital || '',
              changeMonth: changeMonth || existing?.changeMonth || '',
              decreaseDate: cleanStr(dRow[18]) || existing?.decreaseDate || '',
              decreaseDoc: cleanStr(dRow[19]) || existing?.decreaseDoc || '',
              householdHeadName: cleanStr(dRow[14]) || existing?.householdHeadName || '',
              householdHeadCccd: cleanStr(dRow[15]) || existing?.householdHeadCccd || '',
              householdHeadDob: cleanStr(dRow[16]) || existing?.householdHeadDob || '',
              householdHeadAddress: cleanStr(dRow[17]) || existing?.householdHeadAddress || '',
              active: !cleanStr(dRow[18]),
              note: existing?.note || ''
            });
          }
        }
      }
    }
  }

  return {
    companyName: detectedCompany || undefined,
    agencyName: detectedAgency || undefined,
    agencyCode: detectedAgencyCode || undefined,
    targetKind: detectedKind,
    employees: Array.from(employeesMap.values())
  };
}
