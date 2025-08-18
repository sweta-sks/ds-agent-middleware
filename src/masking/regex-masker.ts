import { RegxRule } from "../utils/type";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { encrypt } from "../utils/encryption";

const fontMapping: Record<string, string> = {
  Courier: StandardFonts.Courier,
  Helvetica: StandardFonts.Helvetica,
  Times: StandardFonts.TimesRoman,
  TimesNewRoman: StandardFonts.TimesRoman,
  CourierBold: "Courier-Bold",
  CourierOblique: "Courier-Oblique",
  CourierBoldOblique: "Courier-BoldOblique",
  HelveticaBold: "Helvetica-Bold",
  HelveticaOblique: "Helvetica-Oblique",
  HelveticaBoldOblique: "Helvetica-BoldOblique",
  TimesRoman: "Times-Roman",
  TimesRomanBold: "Times-Bold",
  TimesRomanItalic: "Times-Italic",
  TimesRomanBoldItalic: "Times-BoldItalic",
  Symbol: "Symbol",
  ZapfDingbats: "ZapfDingbats",
  "": StandardFonts.Helvetica,
  Default: StandardFonts.Helvetica,
};

export class MaskingEngine {
  constructor(private rules: RegxRule[], private secreKey: string) {}

  async mask(data: string, mode?: string) {
    let maskedText = data;

    for (const rule of this.rules) {
      try {
        const regex = new RegExp(rule.pattern, "g");

        maskedText = maskedText.replace(regex, (...args: any[]) => {
          const match = args[0];
          const groups = args.slice(1, -2).filter(Boolean);
          if (mode === "encrypt") {
            return encrypt(match, this.secreKey);
          }
          if (rule.name === "Email" && groups.length === 3) {
            const [start, end, domain] = groups;
            const middleLen = match.indexOf("@") - start.length - end.length;
            const maskedMiddle = rule.maskWith.repeat(Math.max(middleLen, 1));
            return `${start}${maskedMiddle}${end}@${domain}`;
          }

          if (rule.isFullMask) {
            return rule.maskWith.repeat(match.length);
          }

          if (groups.length >= 2) {
            const prefix = groups[0];
            const suffix = groups[groups.length - 1];
            const middleLen = match.length - prefix.length - suffix.length;
            const maskedMiddle = rule.maskWith.repeat(Math.max(middleLen, 1));
            return `${prefix}${maskedMiddle}${suffix}`;
          }

          return rule.maskWith.repeat(match.length);
        });
      } catch (error) {
        console.warn(`Skipping invalid rule: ${rule.name}`, error);
      }
    }

    return maskedText;
  }

  async handlePDF(existingPdfBytes: Buffer, mode?: string) {
    try {
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      console.log(mode);
      const loadingTask = pdfjsLib.getDocument({
        data: existingPdfBytes,
        useSystemFonts: true,
      });
      const pdf = await loadingTask.promise;

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const page = pdfDoc.getPage(i);

        const pdfjsPage = await pdf.getPage(i + 1);
        const viewport = pdfjsPage.getViewport({ scale: 1.0 });
        const content = await pdfjsPage.getTextContent();

        for (const item of content.items as any[]) {
          const originalText = item.str;

          const maskedText = await this.mask(originalText, mode);

          if (originalText === maskedText) continue;

          const [a, b, c, d, e, f] = item.transform;
          const fontSize = Math.sqrt(a * a + b * b) || 10;
          // const textWidth = helveticaFont.widthOfTextAtSize(
          //   maskedText,
          //   fontSize
          // );
          const textHeight = fontSize;

          //   page.drawRectangle({
          //     x: e,
          //     y: f - textHeight * 0.25,
          //     width: textWidth,
          //     height: textHeight * 1.2,
          //     color: rgb(1, 1, 1),
          //   });
          const rawFontName = item.fontName || "Helvetica";
          const mappedFontName =
            fontMapping[rawFontName] || StandardFonts.Helvetica;
          const font = await pdfDoc.embedFont(mappedFontName);

          page.drawRectangle({
            x: e,
            y: f - textHeight * 0.25,
            width: item.width,
            height: item.height,
            color: rgb(1, 1, 1),
          });

          page.drawText(maskedText, {
            x: e,
            y: f,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
      }

      const maskedPdfBytes = await pdfDoc.save();

      return maskedPdfBytes;
    } catch (err: any) {
      console.log(err.message);
    }
  }
}
