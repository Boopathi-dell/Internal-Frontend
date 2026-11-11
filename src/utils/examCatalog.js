const EXAM_CACHE_KEY = "cachedExamModelNames_v1";

/**
 * Reads previously observed exam model names from localStorage so dropdowns
 * populate immediately on mount while fresh class metadata loads.
 */
export const getCachedExamNames = () => {
  try {
    const raw = localStorage.getItem(EXAM_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map(x => String(x || "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

/**
 * Persists a deduplicated list of known exam model names into localStorage.
 * When replaceWithServer is true, only keeps valid server exam names.
 */
export const mergeCachedExamNames = (names = [], { replaceWithServer = false } = {}) => {
  const cleanedIncoming = (names || [])
    .map(n => String(n || "").trim())
    .filter(Boolean);
  const existing = replaceWithServer ? [] : getCachedExamNames();
  const merged = Array.from(new Set([...cleanedIncoming, ...existing]));
  try {
    localStorage.setItem(EXAM_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage quota errors
  }
  return merged;
};

/**
 * Builds ordered unique exam options for Evaluation Module dropdowns,
 * merging default options, live class exams, and any cached custom exams.
 */
export const buildDynamicExamOptions = (baseOptions = [], classesList = [], cachedNames = []) => {
  const classExams = Array.isArray(classesList)
    ? classesList.map(c => String(c?.examName || "").trim()).filter(Boolean)
    : [];
  // Prefer fresh server list once classes have loaded so deleted exams aren't kept forever
  const extra = classExams.length > 0 ? classExams : (cachedNames || []);
  return Array.from(new Set([
    ...baseOptions,
    ...extra
  ])).filter(Boolean);
};
