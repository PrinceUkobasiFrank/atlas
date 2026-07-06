import type { AppData, Note, Question, Source, View, SearchResult, Theme } from './types';
import { VIEW_LABELS, STATUS_LABELS, STATUS_COLORS } from './constants';
import { getGreeting } from './greeting';
import { search } from './search';
import { downloadExport } from './export';
import {
  loadData,
  saveData,
  createNote,
  createQuestion,
  createSource,
  updateFocus,
  addNote,
  updateNote,
  deleteNote,
  addQuestion,
  updateQuestionStatus,
  updateQuestionText,
  deleteQuestion,
  addSource,
  updateSource,
  deleteSource,
  updateTheme,
} from './storage';
import { initTheme, toggleTheme } from './theme';

// ─── State ───────────────────────────────────────────────────────────────────

let data: AppData = loadData();
let currentView: View = 'dashboard';
let searchQuery = '';
let editingNoteId: string | null = null;
let editingQuestionId: string | null = null;
let editingSourceId: string | null = null;

// ─── DOM References ──────────────────────────────────────────────────────────

const app = document.getElementById('app');
if (!app) throw new Error('App container not found');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: Partial<HTMLElementTagNameMap[K]> & { className?: string; text?: string }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options?.className) element.className = options.className;
  if (options?.text) element.textContent = options.text;
  if (options) {
    const { className, text, ...rest } = options;
    Object.assign(element, rest);
  }
  return element;
}

function debounce<T extends (...args: string[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function buildLayout(): void {
  app!.innerHTML = '';

  const sidebar = el('aside', { className: 'sidebar' });
  const main = el('main', { className: 'main' });

  // Sidebar header
  const sidebarHeader = el('div', { className: 'sidebar-header' });
  const logo = el('div', { className: 'logo', text: 'Research Companion' });
  sidebarHeader.appendChild(logo);
  sidebar.appendChild(sidebarHeader);

  // Navigation
  const nav = el('nav', { className: 'nav', role: 'navigation' });
  const views: View[] = ['dashboard', 'notes', 'questions', 'sources'];
  for (const view of views) {
    const btn = el('button', {
      className: `nav-item${view === currentView ? ' active' : ''}`,
      text: VIEW_LABELS[view],
    });
    btn.addEventListener('click', () => {
      currentView = view;
      searchQuery = '';
      editingNoteId = null;
      editingQuestionId = null;
      editingSourceId = null;
      render();
    });
    nav.appendChild(btn);
  }
  sidebar.appendChild(nav);

  // Sidebar footer
  const sidebarFooter = el('div', { className: 'sidebar-footer' });

  const exportBtn = el('button', {
    className: 'sidebar-action',
    text: 'Export Data',
  });
  exportBtn.addEventListener('click', () => downloadExport(data));
  sidebarFooter.appendChild(exportBtn);

  const themeBtn = el('button', {
    className: 'sidebar-action',
    text: data.theme === 'light' ? 'Dark Mode' : 'Light Mode',
  });
  themeBtn.addEventListener('click', () => {
    const newTheme = toggleTheme(data);
    data = updateTheme(data, newTheme);
    saveData(data);
    themeBtn.textContent = newTheme === 'light' ? 'Dark Mode' : 'Light Mode';
  });
  sidebarFooter.appendChild(themeBtn);

  sidebar.appendChild(sidebarFooter);

  app!.appendChild(sidebar);
  app!.appendChild(main);
}

// ─── Search ────────────────────────────────────────────────────────────────────

function buildSearch(container: HTMLElement): void {
  const searchWrap = el('div', { className: 'search-wrap' });
  const searchInput = el('input', {
    className: 'search-input',
    type: 'text',
    placeholder: 'Search notes, questions, sources...',
    value: searchQuery,
  });
  searchInput.addEventListener(
    'input',
    debounce((value: string) => {
      searchQuery = value;
      render();
    }, 150)
  );
  searchWrap.appendChild(searchInput);

  if (searchQuery.trim()) {
    const clearBtn = el('button', { className: 'search-clear', text: 'Clear' });
    clearBtn.addEventListener('click', () => {
      searchQuery = '';
      render();
    });
    searchWrap.appendChild(clearBtn);
  }

  container.appendChild(searchWrap);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function buildDashboard(container: HTMLElement): void {
  const greeting = el('h1', { className: 'greeting', text: getGreeting() });
  container.appendChild(greeting);

  const focusSection = el('section', { className: 'focus-section' });
  const focusLabel = el('label', { className: 'focus-label', text: "Today's Focus" });
  const focusInput = el('input', {
    className: 'focus-input',
    type: 'text',
    placeholder: 'What is your focus for today?',
    value: data.focus,
  });
  focusInput.addEventListener(
    'input',
    debounce((value: string) => {
      data = updateFocus(data, value);
      saveData(data);
    }, 300)
  );
  focusSection.appendChild(focusLabel);
  focusSection.appendChild(focusInput);
  container.appendChild(focusSection);

  // Summary
  const summary = el('section', { className: 'summary-section' });
  const summaryTitle = el('h2', { className: 'section-title', text: 'At a Glance' });
  summary.appendChild(summaryTitle);

  const stats = el('div', { className: 'stats-grid' });

  const noteStat = el('div', { className: 'stat-card' });
  noteStat.appendChild(el('span', { className: 'stat-number', text: String(data.notes.length) }));
  noteStat.appendChild(el('span', { className: 'stat-label', text: 'Notes' }));
  stats.appendChild(noteStat);

  const openQ = data.questions.filter((q) => q.status === 'open').length;
  const questionStat = el('div', { className: 'stat-card' });
  questionStat.appendChild(el('span', { className: 'stat-number', text: String(openQ) }));
  questionStat.appendChild(el('span', { className: 'stat-label', text: 'Open Questions' }));
  stats.appendChild(questionStat);

  const sourceStat = el('div', { className: 'stat-card' });
  sourceStat.appendChild(el('span', { className: 'stat-number', text: String(data.sources.length) }));
  sourceStat.appendChild(el('span', { className: 'stat-label', text: 'Sources' }));
  stats.appendChild(sourceStat);

  summary.appendChild(stats);
  container.appendChild(summary);

  // Recent notes
  if (data.notes.length > 0) {
    const recent = el('section', { className: 'recent-section' });
    const recentTitle = el('h2', { className: 'section-title', text: 'Recent Notes' });
    recent.appendChild(recentTitle);

    const noteList = el('div', { className: 'note-list' });
    const recentNotes = data.notes.slice(0, 5);
    for (const note of recentNotes) {
      const card = el('div', { className: 'note-card' });
      const title = el('h3', { className: 'note-card-title', text: note.title || 'Untitled Note' });
      const body = el('p', { className: 'note-card-body', text: note.body.slice(0, 200) + (note.body.length > 200 ? '...' : '') });
      const date = el('span', { className: 'note-card-date', text: formatDate(note.createdAt) });
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(date);
      card.addEventListener('click', () => {
        currentView = 'notes';
        editingNoteId = note.id;
        searchQuery = '';
        render();
      });
      noteList.appendChild(card);
    }
    recent.appendChild(noteList);
    container.appendChild(recent);
  }
}

// ─── Notes ───────────────────────────────────────────────────────────────────

function buildNotes(container: HTMLElement): void {
  const header = el('div', { className: 'view-header' });
  const title = el('h2', { className: 'view-title', text: 'Notes' });
  const addBtn = el('button', { className: 'btn-primary', text: 'New Note' });
  addBtn.addEventListener('click', () => {
    editingNoteId = null;
    render();
  });
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);

  buildSearch(container);

  // Editor
  const editor = el('div', { className: 'editor' });
  const titleInput = el('input', {
    className: 'editor-title',
    type: 'text',
    placeholder: 'Note title...',
  });
  const bodyInput = el('textarea', {
    className: 'editor-body',
    placeholder: 'Start writing...',
    rows: 8,
  });

  let editingNote: Note | undefined;
  if (editingNoteId) {
    editingNote = data.notes.find((n) => n.id === editingNoteId);
  }

  if (editingNote) {
    titleInput.value = editingNote.title;
    bodyInput.value = editingNote.body;
  }

  const saveBtn = el('button', { className: 'btn-primary', text: editingNote ? 'Update' : 'Save' });
  saveBtn.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title && !body) return;

    if (editingNote) {
      data = updateNote(data, editingNote.id, title, body);
    } else {
      const note = createNote(title, body);
      data = addNote(data, note);
    }
    saveData(data);
    editingNoteId = null;
    render();
  });

  const cancelBtn = el('button', { className: 'btn-secondary', text: 'Cancel' });
  cancelBtn.addEventListener('click', () => {
    editingNoteId = null;
    render();
  });

  const editorActions = el('div', { className: 'editor-actions' });
  editorActions.appendChild(saveBtn);
  editorActions.appendChild(cancelBtn);

  editor.appendChild(titleInput);
  editor.appendChild(bodyInput);
  editor.appendChild(editorActions);
  container.appendChild(editor);

  // Note list
  const noteList = el('div', { className: 'note-list' });
  const notesToShow = searchQuery.trim()
    ? data.notes.filter((n) =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data.notes;

  if (notesToShow.length === 0) {
    const empty = el('div', { className: 'empty-state', text: 'No notes yet.' });
    noteList.appendChild(empty);
  } else {
    for (const note of notesToShow) {
      const card = el('div', { className: `note-card${note.id === editingNoteId ? ' active' : ''}` });
      const cardHeader = el('div', { className: 'note-card-header' });
      const cardTitle = el('h3', { className: 'note-card-title', text: note.title || 'Untitled Note' });
      const cardDate = el('span', { className: 'note-card-date', text: formatDate(note.updatedAt) });
      cardHeader.appendChild(cardTitle);
      cardHeader.appendChild(cardDate);

      const cardBody = el('p', { className: 'note-card-body', text: note.body.slice(0, 300) + (note.body.length > 300 ? '...' : '') });

      const cardActions = el('div', { className: 'card-actions' });
      const editBtn = el('button', { className: 'card-action', text: 'Edit' });
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editingNoteId = note.id;
        render();
      });
      const deleteBtn = el('button', { className: 'card-action danger', text: 'Delete' });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this note?')) {
          data = deleteNote(data, note.id);
          saveData(data);
          if (editingNoteId === note.id) editingNoteId = null;
          render();
        }
      });
      cardActions.appendChild(editBtn);
      cardActions.appendChild(deleteBtn);

      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      card.appendChild(cardActions);
      noteList.appendChild(card);
    }
  }
  container.appendChild(noteList);
}

// ─── Questions ─────────────────────────────────────────────────────────────────

function buildQuestions(container: HTMLElement): void {
  const header = el('div', { className: 'view-header' });
  const title = el('h2', { className: 'view-title', text: 'Research Questions' });
  const addBtn = el('button', { className: 'btn-primary', text: 'New Question' });
  addBtn.addEventListener('click', () => {
    editingQuestionId = null;
    render();
  });
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);

  buildSearch(container);

  // Editor
  const editor = el('div', { className: 'editor' });
  const textInput = el('input', {
    className: 'editor-title',
    type: 'text',
    placeholder: 'What are you trying to understand?',
  });

  let editingQuestion: Question | undefined;
  if (editingQuestionId) {
    editingQuestion = data.questions.find((q) => q.id === editingQuestionId);
  }

  if (editingQuestion) {
    textInput.value = editingQuestion.text;
  }

  const saveBtn = el('button', { className: 'btn-primary', text: editingQuestion ? 'Update' : 'Add' });
  saveBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (!text) return;

    if (editingQuestion) {
      data = updateQuestionText(data, editingQuestion.id, text);
    } else {
      const question = createQuestion(text);
      data = addQuestion(data, question);
    }
    saveData(data);
    editingQuestionId = null;
    render();
  });

  const cancelBtn = el('button', { className: 'btn-secondary', text: 'Cancel' });
  cancelBtn.addEventListener('click', () => {
    editingQuestionId = null;
    render();
  });

  const editorActions = el('div', { className: 'editor-actions' });
  editorActions.appendChild(saveBtn);
  editorActions.appendChild(cancelBtn);

  editor.appendChild(textInput);
  editor.appendChild(editorActions);
  container.appendChild(editor);

  // Question list
  const questionList = el('div', { className: 'question-list' });
  const questionsToShow = searchQuery.trim()
    ? data.questions.filter((q) => q.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : data.questions;

  if (questionsToShow.length === 0) {
    const empty = el('div', { className: 'empty-state', text: 'No questions yet.' });
    questionList.appendChild(empty);
  } else {
    for (const question of questionsToShow) {
      const card = el('div', { className: `question-card${question.id === editingQuestionId ? ' active' : ''}` });
      const cardHeader = el('div', { className: 'question-card-header' });
      const cardText = el('p', { className: 'question-card-text', text: question.text });
      const statusSelect = el('select', { className: 'status-select' });
      const statuses: Question['status'][] = ['open', 'investigating', 'answered'];
      for (const s of statuses) {
        const opt = el('option', { value: s, text: STATUS_LABELS[s] });
        statusSelect.appendChild(opt);
      }
      statusSelect.value = question.status;
      statusSelect.addEventListener('change', () => {
        data = updateQuestionStatus(data, question.id, statusSelect.value as Question['status']);
        saveData(data);
        render();
      });
      cardHeader.appendChild(cardText);
      cardHeader.appendChild(statusSelect);

      const cardMeta = el('div', { className: 'question-card-meta' });
      cardMeta.appendChild(el('span', { text: `Added ${formatDate(question.createdAt)}` }));

      const cardActions = el('div', { className: 'card-actions' });
      const editBtn = el('button', { className: 'card-action', text: 'Edit' });
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editingQuestionId = question.id;
        render();
      });
      const deleteBtn = el('button', { className: 'card-action danger', text: 'Delete' });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this question?')) {
          data = deleteQuestion(data, question.id);
          saveData(data);
          if (editingQuestionId === question.id) editingQuestionId = null;
          render();
        }
      });
      cardActions.appendChild(editBtn);
      cardActions.appendChild(deleteBtn);

      card.appendChild(cardHeader);
      card.appendChild(cardMeta);
      card.appendChild(cardActions);
      questionList.appendChild(card);
    }
  }
  container.appendChild(questionList);
}

// ─── Sources ───────────────────────────────────────────────────────────────────

function buildSources(container: HTMLElement): void {
  const header = el('div', { className: 'view-header' });
  const title = el('h2', { className: 'view-title', text: 'Sources' });
  const addBtn = el('button', { className: 'btn-primary', text: 'New Source' });
  addBtn.addEventListener('click', () => {
    editingSourceId = null;
    render();
  });
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);

  buildSearch(container);

  // Editor
  const editor = el('div', { className: 'editor' });
  const titleInput = el('input', {
    className: 'editor-title',
    type: 'text',
    placeholder: 'Source title...',
  });
  const urlInput = el('input', {
    className: 'editor-input',
    type: 'url',
    placeholder: 'https://...',
  });
  const descInput = el('textarea', {
    className: 'editor-body',
    placeholder: 'Optional description...',
    rows: 3,
  });

  let editingSource: Source | undefined;
  if (editingSourceId) {
    editingSource = data.sources.find((s) => s.id === editingSourceId);
  }

  if (editingSource) {
    titleInput.value = editingSource.title;
    urlInput.value = editingSource.url;
    descInput.value = editingSource.description;
  }

  const saveBtn = el('button', { className: 'btn-primary', text: editingSource ? 'Update' : 'Save' });
  saveBtn.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const description = descInput.value.trim();
    if (!title || !url) return;

    if (editingSource) {
      data = updateSource(data, editingSource.id, title, url, description);
    } else {
      const source = createSource(title, url, description);
      data = addSource(data, source);
    }
    saveData(data);
    editingSourceId = null;
    render();
  });

  const cancelBtn = el('button', { className: 'btn-secondary', text: 'Cancel' });
  cancelBtn.addEventListener('click', () => {
    editingSourceId = null;
    render();
  });

  const editorActions = el('div', { className: 'editor-actions' });
  editorActions.appendChild(saveBtn);
  editorActions.appendChild(cancelBtn);

  editor.appendChild(titleInput);
  editor.appendChild(urlInput);
  editor.appendChild(descInput);
  editor.appendChild(editorActions);
  container.appendChild(editor);

  // Source list
  const sourceList = el('div', { className: 'source-list' });
  const sourcesToShow = searchQuery.trim()
    ? data.sources.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.url.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data.sources;

  if (sourcesToShow.length === 0) {
    const empty = el('div', { className: 'empty-state', text: 'No sources yet.' });
    sourceList.appendChild(empty);
  } else {
    for (const source of sourcesToShow) {
      const card = el('div', { className: `source-card${source.id === editingSourceId ? ' active' : ''}` });
      const cardHeader = el('div', { className: 'source-card-header' });
      const link = el('a', {
        className: 'source-card-title',
        href: source.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        text: source.title || 'Untitled Source',
      });
      const cardDate = el('span', { className: 'source-card-date', text: formatDate(source.createdAt) });
      cardHeader.appendChild(link);
      cardHeader.appendChild(cardDate);

      if (source.description) {
        const cardDesc = el('p', { className: 'source-card-desc', text: source.description });
        card.appendChild(cardDesc);
      }

      const cardActions = el('div', { className: 'card-actions' });
      const editBtn = el('button', { className: 'card-action', text: 'Edit' });
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        editingSourceId = source.id;
        render();
      });
      const deleteBtn = el('button', { className: 'card-action danger', text: 'Delete' });
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this source?')) {
          data = deleteSource(data, source.id);
          saveData(data);
          if (editingSourceId === source.id) editingSourceId = null;
          render();
        }
      });
      cardActions.appendChild(editBtn);
      cardActions.appendChild(deleteBtn);

      card.insertBefore(cardHeader, card.firstChild);
      card.appendChild(cardActions);
      sourceList.appendChild(card);
    }
  }
  container.appendChild(sourceList);
}

// ─── Search Results ────────────────────────────────────────────────────────────

function buildSearchResults(container: HTMLElement): void {
  const results = search(data, searchQuery);

  const header = el('div', { className: 'view-header' });
  const title = el('h2', { className: 'view-title', text: `Search Results` });
  header.appendChild(title);
  container.appendChild(header);

  buildSearch(container);

  const resultList = el('div', { className: 'result-list' });

  if (results.length === 0) {
    const empty = el('div', { className: 'empty-state', text: 'No results found.' });
    resultList.appendChild(empty);
  } else {
    for (const result of results) {
      const card = el('div', { className: `result-card result-${result.type}` });
      const typeLabel = el('span', { className: 'result-type', text: result.type });

      if (result.type === 'note') {
        const note = result.item;
        const titleEl = el('h3', { className: 'result-title', text: note.title || 'Untitled Note' });
        const bodyEl = el('p', { className: 'result-body', text: note.body.slice(0, 200) + (note.body.length > 200 ? '...' : '') });
        card.appendChild(typeLabel);
        card.appendChild(titleEl);
        card.appendChild(bodyEl);
        card.addEventListener('click', () => {
          currentView = 'notes';
          editingNoteId = note.id;
          searchQuery = '';
          render();
        });
      } else if (result.type === 'question') {
        const question = result.item;
        const textEl = el('p', { className: 'result-title', text: question.text });
        const statusEl = el('span', {
          className: 'result-status',
          text: STATUS_LABELS[question.status],
        });
        card.appendChild(typeLabel);
        card.appendChild(textEl);
        card.appendChild(statusEl);
        card.addEventListener('click', () => {
          currentView = 'questions';
          editingQuestionId = question.id;
          searchQuery = '';
          render();
        });
      } else {
        const source = result.item;
        const link = el('a', {
          className: 'result-title',
          href: source.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          text: source.title || 'Untitled Source',
        });
        const descEl = el('p', { className: 'result-body', text: source.description || source.url });
        card.appendChild(typeLabel);
        card.appendChild(link);
        card.appendChild(descEl);
      }

      resultList.appendChild(card);
    }
  }
  container.appendChild(resultList);
}

// ─── Render ────────────────────────────────────────────────────────────────────

function render(): void {
  buildLayout();
  const main = document.querySelector('.main');
  if (!main) return;

  if (searchQuery.trim() && currentView !== 'dashboard') {
    buildSearchResults(main);
    return;
  }

  switch (currentView) {
    case 'dashboard':
      buildDashboard(main);
      break;
    case 'notes':
      buildNotes(main);
      break;
    case 'questions':
      buildQuestions(main);
      break;
    case 'sources':
      buildSources(main);
      break;
  }
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export function init(): void {
  initTheme(data);
  render();
}
