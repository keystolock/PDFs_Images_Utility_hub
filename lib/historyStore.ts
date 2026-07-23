export interface HistoryItem {
  id: string;
  filename: string;
  toolName: string;
  downloadUrl: string;
  fileSizeText: string;
  timestamp: string;
}

const STORAGE_KEY = 'utility_session_history';

export const getHistory = (): HistoryItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading session history', err);
    return [];
  }
};

export const addHistoryItem = (item: {
  filename: string;
  toolName: string;
  downloadUrl: string;
  fileSizeText: string;
}) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getHistory();
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      filename: item.filename,
      toolName: item.toolName,
      downloadUrl: item.downloadUrl,
      fileSizeText: item.fileSizeText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [newItem, ...current];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setTimeout(() => {
      window.dispatchEvent(new Event('utilityHistoryUpdated'));
    }, 0);
  } catch (err) {
    console.error('Error saving session history', err);
  }
};

export const clearHistory = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    setTimeout(() => {
      window.dispatchEvent(new Event('utilityHistoryUpdated'));
    }, 0);
  } catch (err) {
    console.error('Error clearing session history', err);
  }
};
