export const DOCUMENT_TYPES = ['CCCD', 'HDLD', 'CHUNG_CHI', 'OTHER'] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number];
