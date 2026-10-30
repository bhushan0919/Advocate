import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { IWorkspace } from '../models/Workspace.js';

export interface PDFExportOptions {
  reportTitle: string;
  workspace: IWorkspace;
  dateRangeText?: string;
  filterText?: string;
  columns: Array<{ header: string; key: string; width?: number; align?: 'left' | 'center' | 'right' }>;
  data: Array<Record<string, any>>;
  lang?: 'en' | 'mr';
}

function getFontPaths(): { regular: string; bold: string } | null {
  const possiblePaths = [
    path.resolve(process.cwd(), 'assets/fonts'),
    path.resolve(process.cwd(), 'backend/assets/fonts'),
    path.resolve(__dirname, '../../assets/fonts'),
    path.resolve(__dirname, '../assets/fonts'),
  ];
  for (const dir of possiblePaths) {
    const regular = path.join(dir, 'Nirmala.ttf');
    const bold = path.join(dir, 'NirmalaB.ttf');
    if (fs.existsSync(regular)) {
      return { regular, bold: fs.existsSync(bold) ? bold : regular };
    }
  }
  return null;
}

export class PDFExportService {
  /**
   * Generates a printable PDF report buffer using PDFKit with full Devanagari font support
   */
  public static async generateReport(options: PDFExportOptions): Promise<Buffer> {
    const { reportTitle, workspace, dateRangeText, filterText, columns, data, lang = 'en' } = options;
    const isMr = lang === 'mr';
    const fontPaths = getFontPaths();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: columns.length > 5 ? 'landscape' : 'portrait',
        margin: 36,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      if (isMr && fontPaths) {
        doc.registerFont('Devanagari', fontPaths.regular);
        doc.registerFont('Devanagari-Bold', fontPaths.bold);
      }

      const regularFont = isMr && fontPaths ? 'Devanagari' : 'Helvetica';
      const boldFont = isMr && fontPaths ? 'Devanagari-Bold' : 'Helvetica-Bold';

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftMargin = doc.page.margins.left;

      // 1. Chamber Brand Header
      doc.rect(leftMargin, 30, pageWidth, 56).fill('#0f2942');

      doc.fillColor('#ffffff').fontSize(14).font(boldFont);
      doc.text(workspace.name || (isMr ? 'वकील कार्यालय (AdvD)' : 'AdvD Legal Chambers'), leftMargin + 16, 40, {
        width: pageWidth - 32,
      });

      doc.fontSize(8).font(regularFont).fillColor('#94bedc');
      const addressLine = [workspace.officeName, workspace.address, workspace.contactPhone, workspace.contactEmail]
        .filter(Boolean)
        .join(' | ');
      doc.text(
        addressLine ||
          (isMr ? 'अॅडव्होकेट डिजिटल कोर्ट डायरी व केस व्यवस्थापन प्रणाली' : 'Digital Court Diary & Advocate Case Management'),
        leftMargin + 16,
        58,
        {
          width: pageWidth - 32,
        }
      );

      doc.moveDown(2);
      let currentY = 100;

      // 2. Report Title & Metadata
      doc.fillColor('#0f2942').fontSize(13).font(boldFont);
      doc.text(reportTitle.toUpperCase(), leftMargin, currentY);

      doc.fontSize(8).font(regularFont).fillColor('#64748b');
      const generatedPrefix = isMr ? 'तयार केले:' : 'Generated:';
      const periodPrefix = isMr ? 'कालावधी:' : 'Period:';
      const filtersPrefix = isMr ? 'फिल्टर्स:' : 'Filters:';

      const meta = [
        `${generatedPrefix} ${new Date().toLocaleString(isMr ? 'mr-IN' : 'en-IN')}`,
        dateRangeText ? `${periodPrefix} ${dateRangeText}` : '',
        filterText ? `${filtersPrefix} ${filterText}` : '',
      ]
        .filter(Boolean)
        .join('  •  ');
      doc.text(meta, leftMargin, currentY + 16);

      currentY += 36;

      // 3. Calculate Column Widths
      const totalDefinedWidth = columns.reduce((acc, col) => acc + (col.width || 0), 0);
      const unassignedCount = columns.filter((col) => !col.width).length;
      const remainingWidth = Math.max(pageWidth - totalDefinedWidth, 0);
      const defaultColWidth = unassignedCount > 0 ? remainingWidth / unassignedCount : 80;

      const colWidths = columns.map((col) => col.width || defaultColWidth);

      // Helper: Draw Table Header
      const drawTableHeader = (y: number) => {
        doc.rect(leftMargin, y, pageWidth, 20).fill('#21547b');
        doc.fillColor('#ffffff').font(boldFont).fontSize(8);

        let colX = leftMargin + 4;
        columns.forEach((col, idx) => {
          doc.text(col.header, colX, y + 5, {
            width: colWidths[idx] - 8,
            align: col.align || 'left',
          });
          colX += colWidths[idx];
        });

        return y + 20;
      };

      currentY = drawTableHeader(currentY);

      // 4. Draw Rows
      doc.font(regularFont).fontSize(8);

      if (data.length === 0) {
        doc.fillColor('#94a3b8');
        const emptyMsg = isMr
          ? 'निवडलेल्या निकषांनुसार कोणतेही रेकॉर्ड सापडले नाहीत.'
          : 'No records found for the selected criteria.';
        doc.text(emptyMsg, leftMargin, currentY + 14, {
          width: pageWidth,
          align: 'center',
        });
        currentY += 30;
      } else {
        data.forEach((row, rowIdx) => {
          // Estimate row height based on cell text length
          let maxLines = 1;
          columns.forEach((col, idx) => {
            const text = String(row[col.key] ?? '');
            const charPerLine = Math.floor(colWidths[idx] / 5);
            const lines = Math.ceil(text.length / Math.max(charPerLine, 1));
            if (lines > maxLines) maxLines = Math.min(lines, 3);
          });

          const rowHeight = Math.max(16, maxLines * 12 + 6);

          // Check if row exceeds page boundary
          if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - 30) {
            doc.addPage();
            currentY = drawTableHeader(36);
          }

          // Alternating background
          if (rowIdx % 2 === 1) {
            doc.rect(leftMargin, currentY, pageWidth, rowHeight).fill('#f8fafc');
          }

          // Cell contents
          doc.fillColor('#1e293b');
          let colX = leftMargin + 4;
          columns.forEach((col, idx) => {
            const val = String(row[col.key] ?? '-');
            doc.text(val, colX, currentY + 4, {
              width: colWidths[idx] - 8,
              align: col.align || 'left',
              ellipsis: true,
            });
            colX += colWidths[idx];
          });

          // Bottom border
          doc.rect(leftMargin, currentY + rowHeight - 0.5, pageWidth, 0.5).fill('#e2e8f0');

          currentY += rowHeight;
        });
      }

      // 5. Page Numbers & Confidentiality Footer on all buffered pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 28;

        doc.rect(leftMargin, footerY - 4, pageWidth, 0.5).fill('#cbd5e1');

        doc.fillColor('#64748b').fontSize(7).font(regularFont);
        const footerText = isMr
          ? 'अॅडव्होकेट डिजिटल डायरी (AdvD) — गोपनीय वकील-पक्षकार न्यायालयीन नोंद'
          : 'AdvD Digital Diary — Confidential Advocate-Client Court Record';
        doc.text(footerText, leftMargin, footerY);

        const pageText = isMr
          ? `पृष्ठ ${i + 1} पैकी ${range.count}`
          : `Page ${i + 1} of ${range.count}`;
        doc.text(pageText, leftMargin, footerY, {
          width: pageWidth,
          align: 'right',
        });
      }

      doc.end();
    });
  }
}

