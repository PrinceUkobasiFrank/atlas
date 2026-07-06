export const STORAGE_KEY = 'research-companion-data';

export const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  notes: 'Notes',
  questions: 'Questions',
  sources: 'Sources',
};

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  investigating: 'Investigating',
  answered: 'Answered',
};

export const STATUS_COLORS: Record<string, string> = {
  open: 'var(--status-open)',
  investigating: 'var(--status-investigating)',
  answered: 'var(--status-answered)',
};
