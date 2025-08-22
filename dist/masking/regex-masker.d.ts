import { RegxRule } from "../utils/type";
export declare class MaskingEngine {
    private rules;
    private secreKey;
    constructor(rules: RegxRule[], secreKey: string);
    mask(data: string, mode?: string): Promise<string>;
    handlePDF(existingPdfBytes: Buffer, mode?: string): Promise<Uint8Array<ArrayBufferLike> | undefined>;
}
//# sourceMappingURL=regex-masker.d.ts.map