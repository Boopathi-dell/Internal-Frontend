/**
 * Format a clean subject label combining course code, short name, and course name.
 */
export function getSubjectLabel(classData, idx) {
  if (!classData) return "";
  const sub = (classData.subjects || [])[idx] || "";
  const cd = (classData.courseDetails || [])[idx];
  const code = cd?.courseCode || sub;
  const name = cd?.courseName || "";
  const short = cd?.shortName ? ` [${cd.shortName}]` : "";
  return name && name !== code ? `${code}${short} — ${name}` : `${code}${short}`;
}

/**
 * Determine whether a mark value matches the targeted clear filter mode.
 */
export function matchesClearMode(val, isESE, passMark, mode) {
  const strVal = String(val ?? "").toUpperCase().trim();
  if (strVal === "") return false;
  if (mode === "all") return true;
  if (mode === "absent") return strVal === "AB" || strVal === "A";
  if (mode === "fail") {
    if (isESE) {
      return ["AB", "A", "U", "U*", "FAIL", "RA", "SA", "W"].includes(strVal);
    }
    if (strVal === "AB" || strVal === "A") return true;
    const numVal = Number(strVal);
    return !isNaN(numVal) && numVal < Number(passMark);
  }
  return false;
}

/**
 * Count affected student marks for each smart clear mode on a given subject index.
 */
export function getSubjectClearBreakdown(classData, subjectIdx) {
  if (!classData || !Array.isArray(classData.students) || subjectIdx < 0) {
    return { totalStudents: 0, all: 0, absent: 0, fail: 0 };
  }
  const isESE = classData.examName === "ESE";
  const passMark = Number(classData.passMark || 0);
  let all = 0;
  let absent = 0;
  let fail = 0;

  classData.students.forEach((s) => {
    const val = (s.marks && s.marks[subjectIdx]) || "";
    if (matchesClearMode(val, isESE, passMark, "all")) all++;
    if (matchesClearMode(val, isESE, passMark, "absent")) absent++;
    if (matchesClearMode(val, isESE, passMark, "fail")) fail++;
  });

  return { totalStudents: classData.students.length, all, absent, fail };
}
