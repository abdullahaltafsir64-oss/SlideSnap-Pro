
export interface DocumentPage {
  index: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export interface ConversionResult {
  fileName: string;
  pages: DocumentPage[];
}

export interface AISuggestion {
  headline: string;
  caption: string;
  hashtags: string[];
}

export enum ConversionStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
