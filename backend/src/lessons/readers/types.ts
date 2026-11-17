// What every reader gives back: raw text per page or slide, plus the extra counts.
export interface ReaderResult {
  units: string[];
  tablesRead: number | null;
  picturesSkipped: number | null;
}
