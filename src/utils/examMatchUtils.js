export const normStr = (str) =>
  String(str || "").toLowerCase().replace(/[\s\-_]/g, "");

export const normalizeRegNo = (regNo) =>
  String(regNo || "").replace(/\s+/g, "").toUpperCase();

const ROMAN_WORD_MAP = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8"
};

const tokenizeExamWords = (name) => {
  if (!name) return [];
  const spaced = String(name)
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!spaced) return [];
  return spaced.split(/\s+/).map(tok => {
    if (ROMAN_WORD_MAP[tok]) return ROMAN_WORD_MAP[tok];
    if (tok === "voice") return "voce";
    return tok;
  });
};

/**
 * Strict normalized exam identifier preserving distinction between Theory vs Lab/Practical
 * exams and numbered assessments (e.g., CIA 1 vs CIA 2, Viva Voce 1 vs Viva Voce 2).
 */
export const normalizeExam = (name) => {
  if (!name) return "";
  const words = tokenizeExamWords(name);
  if (words.length === 0) return "";

  const joined = words.join("");
  if (/^modelexam(ination)?$/.test(joined) || joined === "model") {
    return "cia3_model";
  }
  if (joined.includes("practical") || joined.includes("lab")) {
    return joined;
  }

  let s = joined.replace(/unittest/g, "ut");
  s = s
    .replace(/cia(iii|3)/g, "cia3")
    .replace(/cia(ii|2)/g, "cia2")
    .replace(/cia(iv|4)/g, "cia4")
    .replace(/cia(i|1)/g, "cia1");
  s = s
    .replace(/ut(iii|3)/g, "ut3")
    .replace(/ut(ii|2)/g, "ut2")
    .replace(/ut(iv|4)/g, "ut4")
    .replace(/ut(v|5)/g, "ut5")
    .replace(/ut(i|1)/g, "ut1");
  s = s.replace(/seminar/g, "sm");
  return s;
};

/**
 * Extracts core exam stem by removing generic wrapper words ("marks", "exam") and
 * optional lab qualifiers ("lab", "laboratory", "practical") without ever equating
 * Model Exam (theory) with Model Practical Exam.
 */
const getWrappedExamStem = (name) => {
  const words = tokenizeExamWords(name);
  if (words.length === 0) return "";

  const hasModel = words.includes("model");
  const filtered = words.filter((w, idx) => {
    if (w === "marks" || w === "mark" || w === "score" || w === "scores") return false;
    if (w === "exam" || w === "examination") return false;
    if (w === "test") {
      // Keep "unit test" identity, drop generic trailing "test" only when another content word exists
      if (idx > 0 && words[idx - 1] === "unit") return true;
      return words.length <= 2 && !words.some(x => ["observation", "record", "viva", "voce"].includes(x));
    }
    if (!hasModel && (w === "lab" || w === "laboratory" || w === "practical" || w === "practicals")) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) return normalizeExam(name);
  let stem = filtered.join("");
  stem = stem.replace(/^unittest/, "ut").replace(/^seminar$/, "sm");
  return stem;
};

const getAliasExamStem = (name) => {
  const stem = getWrappedExamStem(name);
  if (!stem) return "";
  return stem
    .replace(/vivavoce/g, "viva")
    .replace(/^obs(\d*)$/, "observation$1")
    .replace(/^rec(\d*)$/, "record$1");
};

/**
 * Returns match priority between a template exam label and a saved class examName:
 * 4 = Exact case-insensitive match
 * 3 = Strict normalized match (e.g. "VIVA VOCE 1" <-> "VIVA VOCE - I")
 * 2 = Model Exam <-> CIA 3 alias OR wrapper-stripped lab/exam stem match
 *     (e.g. "OBSERVATION" <-> "LAB OBSERVATION MARKS", "RECORD" <-> "RECORD MARKS")
 * 1 = Component shorthand alias (e.g. "VIVA VOCE 1" <-> "VIVA 1" / "LAB VIVA - I")
 * 0 = No match
 */
export const getExamMatchPriority = (targetExam, classExam) => {
  if (!targetExam || !classExam) return 0;
  const raw1 = String(targetExam).trim().toLowerCase();
  const raw2 = String(classExam).trim().toLowerCase();
  if (!raw1 || !raw2) return 0;
  if (raw1 === raw2) return 4;

  const n1 = normalizeExam(targetExam);
  const n2 = normalizeExam(classExam);
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 3;

  const cia3Aliases = new Set(["cia3", "cia3_model"]);
  if (cia3Aliases.has(n1) && cia3Aliases.has(n2)) return 2;

  const stem1 = getWrappedExamStem(targetExam);
  const stem2 = getWrappedExamStem(classExam);
  if (stem1 && stem2 && stem1 === stem2) return 2;

  const alias1 = getAliasExamStem(targetExam);
  const alias2 = getAliasExamStem(classExam);
  if (alias1 && alias2 && alias1 === alias2) return 1;

  return 0;
};

/**
 * Finds all matching classes in the section for a candidate exam name (or fallback title),
 * sorted from highest match priority to lowest.
 */
export const findMatchingClassesForExam = (allClassesForSection, primaryExamName, fallbackTitle = "") => {
  const rankWithLabel = (examLabel) => {
    if (!examLabel) return [];
    return (allClassesForSection || [])
      .map(cls => ({ cls, priority: getExamMatchPriority(examLabel, cls.examName) }))
      .filter(item => item.priority > 0)
      .sort((a, b) => b.priority - a.priority);
  };

  const primaryMatches = rankWithLabel(primaryExamName);
  if (primaryMatches.length > 0 || !fallbackTitle || fallbackTitle === primaryExamName) {
    return primaryMatches;
  }
  return rankWithLabel(fallbackTitle);
};

const normalizeLabWord = (s) => normStr(s).replace(/laboratory/g, "lab");

/**
 * Finds exact matching subject index in a Class record without empty-string or prefix false positives,
 * supporting courseCode, courseName, shortName ("QC LAB"), and code-prefixed strings.
 */
export const findSubjectIndexInClass = (cls, targetSubjCode, targetSubjName = "", targetSubjShortName = "") => {
  const cleanCode = normStr(targetSubjCode);
  const cleanName = (targetSubjName && targetSubjName !== "Theory Subject") ? normStr(targetSubjName) : "";
  const cleanLabName = cleanName ? normalizeLabWord(cleanName) : "";
  const cleanShort = normStr(targetSubjShortName);
  const count = Math.max(cls?.subjects?.length || 0, cls?.courseDetails?.length || 0);
  if (count === 0) return -1;

  // Pass 1: Strict exact match across code, name, and shortName
  for (let i = 0; i < count; i++) {
    const sRaw = normStr(cls.subjects?.[i]);
    const cd = cls.courseDetails?.[i];
    const cCode = normStr(cd?.courseCode);
    const cName = normStr(cd?.courseName);
    const cShort = normStr(cd?.shortName);

    if (cleanCode && (sRaw === cleanCode || cCode === cleanCode)) return i;
    if (cleanName && (sRaw === cleanName || cName === cleanName || cShort === cleanName)) return i;
    if (cleanShort && (sRaw === cleanShort || cShort === cleanShort || cCode === cleanShort)) return i;
    if (cleanCode && cleanName && sRaw === `${cleanCode}${cleanName}`) return i;
  }

  // Pass 2: Delimited code prefix (e.g. "23CSF40 - Quantum Computing" or "23CSF40 / QC LAB") or long name match
  const rawCodeToken = String(targetSubjCode || "").trim().toLowerCase();
  for (let i = 0; i < count; i++) {
    const rawSubjStr = String(cls.subjects?.[i] || "").trim().toLowerCase();
    const firstToken = rawSubjStr.split(/[\s–\-:|/]+/)[0];
    if (rawCodeToken && firstToken && firstToken === rawCodeToken) return i;

    const cd = cls.courseDetails?.[i];
    const cCode = normStr(cd?.courseCode);
    const cName = normStr(cd?.courseName);
    const cLabName = cName ? normalizeLabWord(cName) : "";

    if (cleanLabName && cleanLabName.length >= 6 && cLabName && cLabName.length >= 6 &&
        (cLabName.includes(cleanLabName) || cleanLabName.includes(cLabName))) {
      return i;
    }
    if (cleanCode && cleanCode.length >= 4 && cCode && cCode.length >= 4 && cCode === cleanCode) {
      return i;
    }
  }

  return -1;
};

/**
 * Fetches a student's mark for a template column from all classes in the cohort,
 * prioritizing exact exam + exact subject matches while seamlessly resolving lab exam aliases.
 */
export const findExamMarkForStudent = (
  student,
  examName,
  targetSubjCode,
  allClassesForSection,
  targetSubjName = "",
  targetSubjShortName = "",
  fallbackExamTitle = ""
) => {
  if (!examName && !fallbackExamTitle) return "";
  const targetReg = normalizeRegNo(student?.regNo);
  if (!targetReg) return "";

  const matchingClasses = findMatchingClassesForExam(allClassesForSection, examName, fallbackExamTitle);

  for (const { cls } of matchingClasses) {
    const subjIdx = findSubjectIndexInClass(cls, targetSubjCode, targetSubjName, targetSubjShortName);
    if (subjIdx !== -1 && Array.isArray(cls.students)) {
      const stObj = cls.students.find(s => normalizeRegNo(s.regNo) === targetReg);
      if (stObj && Array.isArray(stObj.marks) && stObj.marks.length > subjIdx) {
        const val = stObj.marks[subjIdx];
        if (val !== "" && val !== undefined && val !== null) {
          return val;
        }
      }
    }
  }
  return "";
};
