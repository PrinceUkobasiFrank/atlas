import type { AppData, Note, Question, Source, Theme } from './types';
import { STORAGE_KEY } from './constants';

const defaultData: AppData = {
  focus: '',
  notes: [],
  questions: [],
  sources: [],
  theme: 'light',
};

function isValidAppData(data: unknown): data is AppData {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.focus === 'string' &&
    Array.isArray(d.notes) &&
    Array.isArray(d.questions) &&
    Array.isArray(d.sources) &&
    (d.theme === 'light' || d.theme === 'dark')
  );
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw);
    if (isValidAppData(parsed)) return parsed;
  } catch {
    // Ignore parse errors
  }
  return defaultData;
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createNote(title: string, body: string): Note {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: title.trim(),
    body: body.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function createQuestion(text: string): Question {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    text: text.trim(),
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
}

export function createSource(title: string, url: string, description: string): Source {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: title.trim(),
    url: url.trim(),
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTheme(data: AppData, theme: Theme): AppData {
  return { ...data, theme };
}

export function updateFocus(data: AppData, focus: string): AppData {
  return { ...data, focus: focus.trim() };
}

export function addNote(data: AppData, note: Note): AppData {
  return { ...data, notes: [note, ...data.notes] };
}

export function updateNote(data: AppData, id: string, title: string, body: string): AppData {
  const now = new Date().toISOString();
  return {
    ...data,
    notes: data.notes.map((n) =>
      n.id === id ? { ...n, title: title.trim(), body: body.trim(), updatedAt: now } : n
    ),
  };
}

export function deleteNote(data: AppData, id: string): AppData {
  return { ...data, notes: data.notes.filter((n) => n.id !== id) };
}

export function addQuestion(data: AppData, question: Question): AppData {
  return { ...data, questions: [question, ...data.questions] };
}

export function updateQuestionStatus(
  data: AppData,
  id: string,
  status: Question['status']
): AppData {
  const now = new Date().toISOString();
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id ? { ...q, status, updatedAt: now } : q
    ),
  };
}

export function updateQuestionText(data: AppData, id: string, text: string): AppData {
  const now = new Date().toISOString();
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id ? { ...q, text: text.trim(), updatedAt: now } : q
    ),
  };
}

export function deleteQuestion(data: AppData, id: string): AppData {
  return { ...data, questions: data.questions.filter((q) => q.id !== id) };
}

export function addSource(data: AppData, source: Source): AppData {
  return { ...data, sources: [source, ...data.sources] };
}

export function updateSource(
  data: AppData,
  id: string,
  title: string,
  url: string,
  description: string
): AppData {
  const now = new Date().toISOString();
  return {
    ...data,
    sources: data.sources.map((s) =>
      s.id === id
        ? { ...s, title: title.trim(), url: url.trim(), description: description.trim(), updatedAt: now }
        : s
    ),
  };
}

export function deleteSource(data: AppData, id: string): AppData {
  return { ...data, sources: data.sources.filter((s) => s.id !== id) };
}

export function exportData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}
