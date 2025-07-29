export type MaskConfig = {
  documentFilesExtentions: string[];
  regxRules: {
    name: string;
    description: string;
    pattern: string;
    isFullMask: boolean;
    maskWith: string;
  }[];
  esc: string;
};

export type AgentConfig = {
  action: { isMask: boolean; isEncrypt: boolean };
} & MaskConfig;

export interface RegxRule {
  name: string;
  description: string;
  pattern: string;
  isFullMask: boolean;
  maskWith: string;
}
