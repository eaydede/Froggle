import type { ReactNode } from 'react';

export type ChangelogKind = 'major' | 'minor';

export interface ChangelogEntry {
  id: string;
  date: string;
  kind: ChangelogKind;
  title: string;
  body: ReactNode;
}
