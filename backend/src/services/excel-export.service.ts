import ExcelJS from 'exceljs';
import { IWorkspace } from '../models/Workspace.js';

export interface ExcelExportOptions {
  sheetName: string;
  reportTitle: string;
  workspace: IWorkspace;
  columns: Array<{ header: string; key: string; width?: number }>;
  data: Array<Record<string, any>>;
  lang?: 'en' | 'mr';
}

export class ExcelExportService {
  /**
   * Generates a styled Excel (.xlsx) workbook buffer using ExcelJS
   */
  public static async generateReport(options: ExcelExportOptions): Promise<Buffer> {
    const { sheetName, reportTitle, workspace, columns, data, lang = 'en' } = options;
    const isMr = lang === 'mr';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = isMr ? 'वकील डिजिटल डायरी (AdvD)' : 'AdvD Digital Court Diary';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName.slice(0, 31), {
      views: [{ showGridLines: true }],
    });

    // 1. Chamber Banner Title
    worksheet.mergeCells(1, 1, 1, columns.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${workspace.name || (isMr ? 'वकील कार्यालय' : 'AdvD Legal Chambers')} — ${reportTitle}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F2942' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    // Subtitle
    worksheet.mergeCells(2, 1, 2, columns.length);
    const subCell = worksheet.getCell(2, 1);
    const subDate = new Date().toLocaleString(isMr ? 'mr-IN' : 'en-IN');
    subCell.value = isMr
      ? `निर्यात दिनांक: ${subDate} | विशेषाधिकार प्राप्त वकील कामकाज नोंद`
      : `Exported on: ${subDate} | Privileged Legal Chamber Record`;
    subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 18;

    // Blank row
    worksheet.getRow(3).height = 8;

    // 2. Table Column Headers
    const headerRowNumber = 4;
    const headerRow = worksheet.getRow(headerRowNumber);
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF21547B' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F2942' } },
      };
    });
    headerRow.height = 24;

    // 3. Add Data Rows
    data.forEach((row, rowIdx) => {
      const currentRow = worksheet.getRow(headerRowNumber + 1 + rowIdx);
      columns.forEach((col, colIdx) => {
        const cell = currentRow.getCell(colIdx + 1);
        const val = row[col.key];
        cell.value = val !== undefined && val !== null ? val : '-';
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };

        // Zebra striping
        if (rowIdx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }

        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        };
      });
      currentRow.height = 20;
    });

    // 4. Auto Column Widths
    columns.forEach((col, idx) => {
      let maxLen = col.header.length;
      data.forEach((row) => {
        const str = String(row[col.key] ?? '');
        if (str.length > maxLen) maxLen = str.length;
      });
      const finalWidth = col.width ? col.width : Math.max(maxLen + 4, 14);
      worksheet.getColumn(idx + 1).width = Math.min(finalWidth, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

