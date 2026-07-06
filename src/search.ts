import type { AppData, SearchResult } from './types';

function matches(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function search(data: AppData, query: string): SearchResult[] {
  const q = query.trim();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const note of data.notes) {
    if (matches(q, note.title) || matches(q, note.body)) {
      results.push({ type: 'note', item: note });
    }
  }

  for (const question of data.questions) {
    if (matches(q, question.text)) {
      results.push({ type: 'question', item: question });
    }
  }

  for (const source of data.sources) {
    if (matches(q, source.title) || matches(q, source.description) || matches(q, source.url)) {
      results.push({ type: 'source', item: source });
    }
  }

  return results;
}
