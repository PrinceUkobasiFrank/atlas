export interface Note {
  readonly id: string;
  title: string;
  body: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Question {
  readonly id: string;
  text: string;
  status: QuestionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type QuestionStatus = 'open' | 'investigating' | 'answered';

export interface Source {
  readonly id: string;
  title: string;
  url: string;
  description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AppData {
  focus: string;
  notes: Note[];
  questions: Question[];
  sources: Source[];
  theme: Theme;
}

export type Theme = 'light' | 'dark';

export type View = 'dashboard' | 'notes' | 'questions' | 'sources';

export type SearchResult =
  | { type: 'note'; item: Note }
  | { type: 'question'; item: Question }
  | { type: 'source'; item: Source };
