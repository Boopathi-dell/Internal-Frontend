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

/**
 * Finds the matching class summary record for an exam model in the selected
 * section or Year/Sem cohort so dropdowns can display Max & Pass marks.
 */
export const findMatchingExamClassMeta = (
  examName,
  classesList = [],
  { yearSemSec = "", department = "", year = "", semester = "" } = {}
) => {
  const name = String(examName || "").trim();
  const list = Array.isArray(classesList) ? classesList : [];
  if (!name || list.length === 0) return { match: null, scopeHasAnyClass: false };

  const scopeMatches = (c) => (!department || (c?.department || "CSE") === department);

  if (yearSemSec) {
    const scopeClasses = list.filter(c => c?.yearSemSec === yearSemSec && scopeMatches(c));
    const exact = scopeClasses.find(c => String(c?.examName || "").trim() === name) || null;
    if (exact) return { match: exact, scopeHasAnyClass: true };
    if (scopeClasses.length > 0) return { match: null, scopeHasAnyClass: true };
  }

  const cohortPrefix = year && semester ? `${year}/${semester}/` : "";
  if (cohortPrefix) {
    const cohortClasses = list.filter(c => String(c?.yearSemSec || "").startsWith(cohortPrefix) && scopeMatches(c));
    const cohortMatch = cohortClasses.find(c => String(c?.examName || "").trim() === name) || null;
    return { match: cohortMatch, scopeHasAnyClass: cohortClasses.length > 0 };
  }

  return { match: null, scopeHasAnyClass: false };
};

/**
 * Formats an Evaluation Module dropdown label with live Out-of Max & Pass marks.
 */
export const formatExamOptionLabel = (examName, classesList = [], scope = {}) => {
  const name = String(examName || "").trim();
  if (!name) return "";
  const baseLabel = name === "ESE" ? "End Semester Examination" : name;
  if (name === "ESE") return `${baseLabel} (Grade / 10-Pt SGPA)`;

  const { match, scopeHasAnyClass } = findMatchingExamClassMeta(name, classesList, scope);
  if (match && match.markPerSubject !== undefined) {
    const maxM = Number(match.markPerSubject) || 0;
    const passM = Number(match.passMark) || 0;
    return `${baseLabel} (Out of ${maxM} • Pass: ${passM})`;
  }
  if (scopeHasAnyClass) {
    return `${baseLabel} (Not Setup)`;
  }
  return baseLabel;
};

