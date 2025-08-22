"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaskingEngine = void 0;
const pdf_lib_1 = require("pdf-lib");
const pdfjsLib = __importStar(require("pdfjs-dist/legacy/build/pdf.js"));
const encryption_1 = require("../utils/encryption");
const fontMapping = {
    Courier: pdf_lib_1.StandardFonts.Courier,
    Helvetica: pdf_lib_1.StandardFonts.Helvetica,
    Times: pdf_lib_1.StandardFonts.TimesRoman,
    TimesNewRoman: pdf_lib_1.StandardFonts.TimesRoman,
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
    "": pdf_lib_1.StandardFonts.Helvetica,
    Default: pdf_lib_1.StandardFonts.Helvetica,
};
class MaskingEngine {
    constructor(rules, secreKey) {
        this.rules = rules;
        this.secreKey = secreKey;
    }
    async mask(data, mode) {
        let maskedText = data;
        for (const rule of this.rules) {
            try {
                const regex = new RegExp(rule.pattern, "g");
                maskedText = maskedText.replace(regex, (...args) => {
                    const match = args[0];
                    const groups = args.slice(1, -2).filter(Boolean);
                    if (mode === "encrypt") {
                        return (0, encryption_1.encrypt)(match, this.secreKey);
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
            }
            catch (error) {
                console.warn(`Skipping invalid rule: ${rule.name}`, error);
            }
        }
        return maskedText;
    }
    async handlePDF(existingPdfBytes, mode) {
        try {
            const pdfDoc = await pdf_lib_1.PDFDocument.load(existingPdfBytes);
            console.log(mode);
            const loadingTask = pdfjsLib.getDocument({
                data: existingPdfBytes,
                useSystemFonts: true,
            });
            const pdf = await loadingTask.promise;
            const helveticaFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
            for (let i = 0; i < pdfDoc.getPageCount(); i++) {
                const page = pdfDoc.getPage(i);
                const pdfjsPage = await pdf.getPage(i + 1);
                const viewport = pdfjsPage.getViewport({ scale: 1.0 });
                const content = await pdfjsPage.getTextContent();
                for (const item of content.items) {
                    const originalText = item.str;
                    const maskedText = await this.mask(originalText, mode);
                    if (originalText === maskedText)
                        continue;
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
                    const mappedFontName = fontMapping[rawFontName] || pdf_lib_1.StandardFonts.Helvetica;
                    const font = await pdfDoc.embedFont(mappedFontName);
                    page.drawRectangle({
                        x: e,
                        y: f - textHeight * 0.25,
                        width: item.width,
                        height: item.height,
                        color: (0, pdf_lib_1.rgb)(1, 1, 1),
                    });
                    page.drawText(maskedText, {
                        x: e,
                        y: f,
                        size: fontSize,
                        font: font,
                        color: (0, pdf_lib_1.rgb)(0, 0, 0),
                    });
                }
            }
            const maskedPdfBytes = await pdfDoc.save();
            return maskedPdfBytes;
        }
        catch (err) {
            console.log(err.message);
        }
    }
}
exports.MaskingEngine = MaskingEngine;
