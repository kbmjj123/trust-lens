export type RiskLevel = 'low' | 'medium' | 'high';

export type ClaimScope = 'none' | 'input' | 'meta' | 'credential';

export interface Claim {
  pattern: string | RegExp | ((url: string) => boolean);
  label?: string;
  data?: string;
  scope?: ClaimScope;
}

export interface ClassifiedRecord {
  raw: Record<string, any>;
  kind: string;
  risk: RiskLevel;
  title: string;
  detail: string;
  tags: string[];
  claim?: Claim;
}

export interface Summary {
  total: number;
  byKind: Record<string, number>;
  byRisk: { low: number; medium: number; high: number };
  userDataCount: number;
  thirdPartyDomains: string[];
  hasUnexpected: boolean;
  classified: ClassifiedRecord[];
}

export interface TrustLensOptions {
  siteName?: string;
  claims?: Claim[] | Record<string, any>;
  position?: string;
  theme?: string;
  autoStart?: boolean;
  showFab?: boolean;
  privacyUrl?: string;
}

export interface TrustLensInstance {
  options: TrustLensOptions;
  destroy(): void;
  refresh(): void;
  getRecords(): Record<string, any>[];
  getSummary(): Summary;
  getGrade(): { level: string; text: string };
}

export interface Collector {
  start(): void;
  stop(): void;
  getRecords(): Record<string, any>[];
  clearRecords(): void;
  onUpdate(fn: (rec: any, records: any[]) => void): () => void;
  getDomain(url: string): string;
  isSameSite(url: string): boolean;
  hasCredentialHeader(headers: any): boolean;
}

export function init(options?: TrustLensOptions): TrustLensInstance;
export function defineElement(tag?: string): void;
export class TrustLensElement extends HTMLElement {
  connectedCallback(): void;
  disconnectedCallback(): void;
}
export const collector: Collector;
export function normalizeClaims(claims: any): Claim[];
export function summarize(records: any[], claims?: Claim[]): Summary;

declare const _default: {
  init: typeof init;
  defineElement: typeof defineElement;
  TrustLensElement: typeof TrustLensElement;
};
export default _default;
