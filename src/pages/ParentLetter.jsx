import { useState, useEffect } from "react";
import API from "../api";
import headerLogo from "../assets/logo image.jpg";

function getLetterGrade(mark, maxMark, passMark) {
  const m = String(mark).toUpperCase().trim();
  
  // Handle direct string grades (e.g. from ESE Excel upload)
  const directGrades = ["O", "A+", "A", "B+", "B", "C", "C+", "S", "U", "U*", "W", "SA", "RA", "AB", "P", "F", "UA", "WD"];
  if (directGrades.includes(m)) {
    return { grade: m === "A" && !mark.includes("A") ? m : m === "AB" ? "Ab" : m, pass: !["U", "F", "RA", "UA", "WD", "W", "AB", "U*"].includes(m) };
  }

  if (m === "AB" || m === "A") return { grade: "Ab", pass: false };
  
  const num = Number(mark);
  if (isNaN(num) || mark === "") return { grade: "—", pass: false };
  if (num < passMark) return { grade: "U", pass: false };
  const pct = maxMark > 0 ? (num / maxMark) * 100 : 0;
  if (pct >= 90) return { grade: "O", pass: true };
  if (pct >= 85) return { grade: "A+", pass: true };
  if (pct >= 80) return { grade: "A", pass: true };
  if (pct >= 75) return { grade: "B+", pass: true };
  if (pct >= 70) return { grade: "B", pass: true };
  if (pct >= 60) return { grade: "C", pass: true };
  if (pct >= 50) return { grade: "D", pass: true };
  return { grade: "U", pass: false };
}

const DEFAULT_TEMPLATE = {
  iqacNo: "MEC/IQAC/2026-27/COE/",
  examDescription: "End Semester Examination - April/May-2026",
  collegeTamilName: "முத்தாயம்மால் பொறியியல் கல்லூரி, இராசிபுரம் – 637 408",
  letterTitle: "STATEMENT OF GRADES",
  englishGreeting: "Marks secured by your son / daughter in the {examDescription} are given below,",
  tamilGreeting: "தேர்வில் தங்கள் மகன் / மகள் பெற்ற மதிப்பெண்கள் கீழே\nகொடுக்கப்பட்டுள்ள அட்டவணையில் குறிப்பிடப்பட்டுள்ளன.",
  noteEnglish: "Candidates who secure less than 80 % of overall attendance in a semester will not be Permitted to write the End Semester Examinations.",
  noteTamil: "கல்வியாண்டில் (ஒவ்வொரு செமஸ்டரிலும்) 80 சதவீதத்திற்கு குறைவாக வருகைப்பதிவு இருந்தால் அம்மாணவ, மாணவியர் இறுதி செமஸ்டர் தேர்வு எழுத அனுமதிக்கப்படமாட்டார்,",
  signatureLeft: "MENTOR /\nCLASS ADVISOR",
  signatureMiddle: "HOD",
  signatureRight: "PRINCIPAL",
  letterDate: "",
  columns: [
    { id: "1", header: "S. No.", type: "sno" },
    { id: "2", header: "Name of the Course", type: "courseName" },
    { id: "3", header: "Letter Grade", type: "grade", examName: "ESE" },
    { id: "4", header: "Result", type: "result", examName: "ESE" }
  ]
};

export default function ParentLetter() {
  const [classes, setClasses] = useState([]);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [filters, setFilters] = useState({ year: "II", semester: "IV", section: "A", exam: "Model Exam" });
  const [matchingClasses, setMatchingClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [checkedStudents, setCheckedStudents] = useState({});

  // Fetched full class details mapping: { "CIA - I": classData, "ESE": classData }
  const [classesDataMap, setClassesDataMap] = useState({});
  const [primaryClassData, setPrimaryClassData] = useState(null); // Used for students list & courses

  const examNameOptions = [
    "Model Exam", "Model Practical Exam",
    "Unit Test - I", "Unit Test - II", "Unit Test - III", "Unit Test - IV", "Unit Test - V",
    "CIA - I", "CIA - II", "CIA - III", "MKC", "ESE"
  ];

  const getSemOptionsForYear = (y) => {
    switch (y) {
      case "I": return ["I","II"];
      case "II": return ["III","IV"];
      case "III": return ["V","VI"];
      case "IV": return ["VII","VIII"];
      default: return ["I","II","III","IV","V","VI","VII","VIII"];
    }
  };

  const formatDate = (ds) => {
    if (!ds) return "";
    const p = ds.split("-");
    return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : ds;
  };

  const getDisplayDate = () => {
    if (primaryClassData && primaryClassData.date) return formatDate(primaryClassData.date);
    const t = new Date();
    return `${String(t.getDate()).padStart(2,"0")}.${String(t.getMonth()+1).padStart(2,"0")}.${t.getFullYear()}`;
  };

  useEffect(() => { loadClasses(); loadTemplate(); }, []);

  const loadTemplate = async () => {
    try {
      const res = await API.get("/api/letter-template");
      if (res.data) setTemplate({ ...DEFAULT_TEMPLATE, ...res.data });
    } catch (e) { /* use defaults */ }
  };

  async function loadClasses() {
    try {
      const res = await API.get("/api/classes");
      setClasses(res.data);
      applyFilters(res.data, filters);
    } catch (e) { console.error(e); }
  }

  const applyFilters = (all, f) => {
    const tgt = `${f.year}/${f.semester}/${f.section}`;
    const filtered = all.filter(c => c.yearSemSec === tgt);
    setMatchingClasses(filtered);
    setClassesDataMap({});
    setPrimaryClassData(null);
  };

  const handleFilterChange = (field, val) => {
    let nf = { ...filters, [field]: val };
    if (field === "year") {
      const opts = getSemOptionsForYear(val);
      if (!opts.includes(nf.semester)) nf.semester = opts[0];
    }
    setFilters(nf);
    applyFilters(classes, nf);
  };

  // Determine required exams from the template columns
  const rawRequiredExams = [...new Set((template.columns || [])
    .filter(c => ["mark", "grade", "result"].includes(c.type) && c.examName)
    .map(c => c.examName))];

  if (template.attendanceSourceExam) {
    rawRequiredExams.push(template.attendanceSourceExam);
  }

  // Map "[Selected Exam]" to the currently selected filter exam
  const requiredExams = [...new Set(rawRequiredExams.map(e => e === "[Selected Exam]" ? filters.exam : e))];

  const canGenerate = requiredExams.length > 0 && requiredExams.every(exam => 
    matchingClasses.some(c => c.examName === exam)
  );

  const missingExams = requiredExams.filter(exam => !matchingClasses.some(c => c.examName === exam));

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const dataMap = {};
      let firstClass = null;
      for (const exam of requiredExams) {
        const classObj = matchingClasses.find(c => c.examName === exam);
        const res = await API.get(`/api/classes/${encodeURIComponent(classObj.className)}`);
        dataMap[exam] = res.data;
        if (!firstClass) firstClass = res.data;
      }
      
      if (firstClass) {
        let studs = firstClass.students.map(s => ({
          ...s,
          marks: (!s.marks || s.marks.length !== firstClass.subjects.length)
            ? Array(firstClass.subjects.length).fill("") : s.marks
        }));
        studs.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true, sensitivity: "base" }));
        
        const cds = (firstClass.courseDetails || []).map(cd => {
          if (cd.courseCode && cd.courseCode.includes(" & ")) {
            const p = cd.courseCode.split(" & ");
            return { courseCode: p[0].trim(), courseName: cd.courseName || p[1]?.trim() || "", shortName: cd.shortName || "", facultyName: cd.facultyName || "" };
          }
          return { ...cd, shortName: cd.shortName || "" };
        });
        
        firstClass = { ...firstClass, students: studs, courseDetails: cds };
        setPrimaryClassData(firstClass);
        
        const ch = {};
        const att = {};
        
        const attendanceExamName = (template.attendanceSourceExam === "[Selected Exam]" || !template.attendanceSourceExam) 
          ? filters.exam 
          : template.attendanceSourceExam;
        const attendanceClassData = dataMap[attendanceExamName];

        studs.forEach(s => { 
          ch[s.regNo] = true; 
          if (attendanceClassData) {
            const attStudent = attendanceClassData.students.find(stu => stu.regNo === s.regNo);
            if (attStudent && attStudent.attendance) {
              att[s.regNo] = attStudent.attendance;
            }
          }
        });
        setCheckedStudents(ch);
        setAttendanceMap(att);
      }
      setClassesDataMap(dataMap);
    } catch (e) {
      console.error(e);
      alert("Error loading class data");
    } finally {
      setLoading(false);
    }
  };

  const getCourses = () => {
    if (!primaryClassData) return [];
    if (primaryClassData.courseDetails && primaryClassData.courseDetails.length > 0) return primaryClassData.courseDetails;
    return (primaryClassData.subjects || []).map(s => ({ courseCode: s, courseName: s, shortName: s, facultyName: "" }));
  };

  // Helper to get student's mark for a specific exam and course index
  const getStudentMark = (studentRegNo, examName, courseIndex) => {
    const examData = classesDataMap[examName];
    if (!examData) return "";
    const student = examData.students.find(s => s.regNo === studentRegNo);
    if (!student || !student.marks || student.marks[courseIndex] === undefined) return "";
    return student.marks[courseIndex];
  };

  // Calculate overall result across all REQUIRED exams for a student
  const getStudentOverallResult = (student) => {
    const cs = getCourses();
    const ok = cs.every((_, j) => {
      return requiredExams.every(exam => {
        const examData = classesDataMap[exam];
        const mark = getStudentMark(student.regNo, exam, j);
        const { grade, pass } = getLetterGrade(mark, examData.markPerSubject, examData.passMark);
        return grade !== "Ab" && pass;
      });
    });
    return ok ? "Pass" : "Fail";
  };

  const selectAll = () => { const c = {}; primaryClassData.students.forEach(s => { c[s.regNo] = true; }); setCheckedStudents(c); };
  const deselectAll = () => { const c = {}; primaryClassData.students.forEach(s => { c[s.regNo] = false; }); setCheckedStudents(c); };

  const selectedStudents = primaryClassData ? primaryClassData.students.filter(s => checkedStudents[s.regNo]) : [];
  const courses = getCourses();
  
  const getReplacedNote = (noteText) => {
    if (!noteText) return "";
    let n = noteText;
    const pExam = classesDataMap[filters.exam];
    const passM = pExam ? pExam.passMark : "";
    const maxM = pExam ? pExam.markPerSubject : "";
    n = n.replace(/{passMark}/g, passM);
    n = n.replace(/{maxMark}/g, maxM);
    n = n.replace(/{examDescription}/g, template.examDescription);
    return n;
  };

  const englishText = getReplacedNote(template.englishGreeting);

  const [savingAtt, setSavingAtt] = useState(false);
  const saveAttendance = async () => {
    if (!primaryClassData) return;
    setSavingAtt(true);
    try {
      const attendanceExamName = (template.attendanceSourceExam === "[Selected Exam]" || !template.attendanceSourceExam) 
        ? filters.exam 
        : template.attendanceSourceExam;
      const attendanceClassData = classesDataMap[attendanceExamName];
      if (!attendanceClassData) throw new Error("Attendance class not found");

      await API.post(`/api/classes/${encodeURIComponent(attendanceClassData.className)}/attendance`, {
        attendanceMap
      });
      alert("Attendance saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save attendance");
    } finally {
      setSavingAtt(false);
    }
  };

  return (
    <div style={{ fontFamily: "var(--font-body)", padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0.5cm 0.7cm; }
          body { margin: 0 !important; padding: 0 !important; background: white !important; }
          .no-print { display: none !important; }
          .sidebar, .mobile-top-bar { display: none !important; }
          .main-content { margin: 0 !important; padding: 0 !important; }
          .page-layout { padding: 0 !important; margin: 0 !important; }
          .pl-letter {
            page-break-after: always;
            page-break-inside: avoid;
            width: 100% !important;
            margin: 0 !important;
            padding: 14pt 18pt 10pt !important;
            border: none !important;
            box-shadow: none !important;
          }
          .pl-letter:last-child { page-break-after: avoid; }
        }
        .pl-letter {
          font-family: "Times New Roman", Times, serif !important;
          font-size: 14pt;
        }
        .pl-letter .pl-header-text {
          font-size: 16pt !important;
        }
        .pl-panel { background: var(--surface); border: 1px solid var(--border-color); border-radius: 16px; padding: 22px 24px; margin-bottom: 24px; }
        .pl-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(130px,1fr)); gap: 14px; margin-bottom: 14px; }
        .pl-lbl { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 5px; }
        .pl-sel { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--surface-2); color: var(--text-primary); font-size: 0.87rem; }
        .pl-att { width: 62px; padding: 4px 7px; border: 1px solid var(--border-color); border-radius: 6px; text-align: center; font-size: 12px; background: var(--surface-2); color: var(--text-primary); }
        .pl-t { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
        .pl-t th { font-size: 0.69rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid var(--border-color); text-align: left; }
        .pl-t td { padding: 9px 10px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
        .reg-chip { background: rgba(99,102,241,0.12); color: #6366f1; padding: 2px 9px; border-radius: 5px; font-size: 0.75rem; font-weight: 700; font-family: monospace; }
        .btn-pr { padding: 10px 20px; background: linear-gradient(135deg,#10b981,#059669); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.88rem; }
        .btn-gen { padding: 10px 20px; background: linear-gradient(135deg,#6366f1,#8b5cf6); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.88rem; width: 100%; }
        .cp { color: #059669; background: rgba(16,185,129,0.12); padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 0.78rem; }
        .cf { color: #dc2626; background: rgba(239,68,68,0.12); padding: 2px 10px; border-radius: 12px; font-weight: 700; font-size: 0.78rem; }
      `}</style>

      <div className="no-print" style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          📬 Dynamic Parent Letters
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "5px 0 0", fontSize: "0.88rem" }}>
          Generate individual <strong>Statement of Grades</strong> letters. The table format is dynamically driven by the <strong>Letter Template</strong> settings in the Admin Panel.
        </p>
      </div>

      <div className="pl-panel no-print">
        <h3 style={{ margin: "0 0 14px", fontWeight: 700, fontSize: "0.95rem" }}>🔍 1. Select Target Class</h3>
        <div className="pl-grid">
          {[
            { label: "Year", field: "year", opts: ["I","II","III","IV"] },
            { label: "Semester", field: "semester", opts: getSemOptionsForYear(filters.year) },
            { label: "Section", field: "section", opts: ["A","B","C","D","E"] },
            { label: "Exam (For Dynamic Columns)", field: "exam", opts: examNameOptions }
          ].map(({ label, field, opts }) => (
            <div key={field}>
              <div className="pl-lbl">{label}</div>
              <select className="pl-sel" value={filters[field]} onChange={e => handleFilterChange(field, e.target.value)}>
                {opts.map(o => <option key={o} value={o}>{o === "ESE" ? "End Semester Examination" : o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(99,102,241,0.05)", borderRadius: "8px", border: "1px solid rgba(99,102,241,0.2)" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#6366f1" }}>⚙️ Template Requirements</h4>
          {requiredExams.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Your current Admin Template doesn't require any exams (no mark/grade columns). Please configure columns in the Admin Panel first.</p>
          ) : (
            <>
              <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Based on your Admin Letter Template, the following exams are required for this class:
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {requiredExams.map(exam => {
                  const found = matchingClasses.some(c => c.examName === exam);
                  return (
                    <span key={exam} style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold", background: found ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: found ? "#10b981" : "#ef4444" }}>
                      {exam} {found ? "✅" : "❌ (Missing)"}
                    </span>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: "14px" }}>
            <button className="btn-gen" onClick={handleGenerate} disabled={!canGenerate || loading}
              style={{ opacity: (!canGenerate || loading) ? 0.5 : 1, cursor: (!canGenerate || loading) ? "not-allowed" : "pointer" }}>
              {loading ? "Fetching Data..." : !canGenerate ? "Missing Required Exams" : "Generate Dynamic Letters"}
            </button>
          </div>
        </div>
      </div>

      {primaryClassData && !loading && (
        <div>
          <div className="pl-panel no-print">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700 }}>✅ {primaryClassData.yearSemSec} Students</h3>
                <p style={{ margin: "3px 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  {primaryClassData.students.length} students loaded · <strong style={{ color: "#6366f1" }}>{selectedStudents.length} selected for printing</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button onClick={selectAll} style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid var(--border-color)", background: "var(--surface-2)", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>☑ All</button>
                <button onClick={deselectAll} style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid var(--border-color)", background: "var(--surface-2)", color: "var(--text-primary)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>☐ None</button>
                <button className="btn-pr" onClick={() => window.print()} disabled={selectedStudents.length === 0}
                  style={{ opacity: selectedStudents.length === 0 ? 0.5 : 1, cursor: selectedStudents.length === 0 ? "not-allowed" : "pointer" }}>
                  🖨️ Print {selectedStudents.length} Letter{selectedStudents.length !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
            
            <div style={{ padding: "8px 13px", background: "rgba(99,102,241,0.07)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.17)", fontSize: "0.79rem", color: "var(--text-muted)", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                💡 Enter <strong>Attendance %</strong> → Uncheck students to exclude → Click <strong>Print</strong>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={saveAttendance} 
                disabled={savingAtt}
                style={{ padding: "4px 10px", fontSize: "0.8rem", borderRadius: "6px" }}
              >
                {savingAtt ? "Saving..." : "💾 Save Attendance"}
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="pl-t">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>Print</th>
                    <th>Reg. No.</th>
                    <th>Name</th>
                    <th style={{ textAlign: "center" }}>Attendance %</th>
                    <th style={{ textAlign: "center" }}>Overall Result</th>
                  </tr>
                </thead>
                <tbody>
                  {primaryClassData.students.map((s, i) => {
                    const result = getStudentOverallResult(s);
                    return (
                      <tr key={s.regNo || i} style={{ opacity: checkedStudents[s.regNo] ? 1 : 0.42, transition: "opacity 0.15s" }}>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={!!checkedStudents[s.regNo]} onChange={() => setCheckedStudents(p => ({ ...p, [s.regNo]: !p[s.regNo] }))}
                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#6366f1" }} />
                        </td>
                        <td><span className="reg-chip">{s.regNo}</span></td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ textAlign: "center" }}>
                          <input type="number" className="pl-att" min="0" max="100" placeholder="72"
                            value={attendanceMap[s.regNo] || ""} onChange={e => setAttendanceMap(p => ({ ...p, [s.regNo]: e.target.value }))} />
                          <span style={{ marginLeft: 3, color: "var(--text-muted)", fontSize: "0.78rem" }}>%</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={result === "Pass" ? "cp" : "cf"}>{result}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selectedStudents.map((student, idx) => {
            const attendance = attendanceMap[student.regNo] || "";
            const refNum = template.iqacNo || "";
            const ltrStyle = { fontFamily: '"Times New Roman", Times, serif', fontSize: "14pt", color: "black", background: "white" };
            const failBg = { background: "rgba(220,38,38,0.15)", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

            return (
              <div key={student.regNo || idx} className="pl-letter" style={{ ...ltrStyle, padding: "5pt 18pt 5pt", boxSizing: "border-box" }}>
                <div style={{ textAlign: "right", fontSize: "9pt", fontWeight: "bold", marginBottom: "2pt", minHeight: "12pt" }}>{refNum}</div>
                {template.headerLogo ? (
                  <img src={template.headerLogo} alt="Header Logo" style={{ width: "100%", height: "auto", display: "block" }} />
                ) : (
                  <img src={headerLogo} alt="MEC Header" style={{ width: "100%", height: "auto", display: "block" }} />
                )}
                <div className="pl-header-text" style={{ textAlign: "center", fontWeight: "bold", margin: "5pt 0 2pt" }}>{template.collegeTamilName}</div>
                <div className="pl-header-text" style={{ textAlign: "center", textDecoration: "underline", fontWeight: "bold", marginBottom: "4pt", letterSpacing: "0.5pt" }}>{template.letterTitle}</div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3pt", fontSize: "14pt" }}>
                  <div><strong>Name of the Student:</strong> {student.name}</div>
                  <div><strong>Reg.No :</strong> {student.regNo}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6pt", fontSize: "14pt", flexWrap: "wrap", gap: "4pt" }}>
                  <div><strong>Dept:</strong> {primaryClassData.department || "CSE"}</div>
                  <div><strong>Year / Sem. :</strong> {primaryClassData.yearSemSec}</div>
                  <div><strong>% of Attendance :</strong> {attendance ? attendance : "………"}</div>
                </div>

                <div style={{ fontSize: "14pt", marginBottom: "4pt" }}>
                  <div><strong>Dear Parents,</strong></div>
                  <div style={{ paddingLeft: "24pt", marginTop: "3pt" }}>Warm Greetings,</div>
                  <div style={{ paddingLeft: "24pt", marginTop: "3pt" }}>{englishText}</div>
                </div>
                <div style={{ fontSize: "14pt", marginBottom: "4pt" }}>
                  <div>அன்பார்ந்த பெற்றோர்களே,</div>
                  {template.tamilGreeting.split("\n").map((line, li) => (
                    <div key={li} style={{ paddingLeft: li === 0 ? 0 : "24pt", marginTop: "2pt" }}>{line}</div>
                  ))}
                </div>

                {/* DYNAMIC MARKS TABLE */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6pt", fontSize: "14pt" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      {(template.columns || []).map((col, i) => (
                        <th key={col.id || i} style={{ padding: "6pt 8pt", textAlign: "center", border: "1px solid black", lineHeight: 1.3, fontSize: "14pt" }}>
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, j) => {
                      // Pre-calculate failure status for the row to highlight
                      let rowHasFail = false;
                      
                      const rowCells = (template.columns || []).map((col, i) => {
                        let cellContent = "";
                        let isCellFail = false;
                        
                        if (col.type === "sno") cellContent = j + 1;
                        else if (col.type === "courseName") cellContent = `${course.courseCode} - ${course.courseName || course.courseCode}`;
                        else if (col.type === "courseCode") cellContent = course.courseCode;
                        else if (["mark", "grade", "result"].includes(col.type)) {
                          const actualExamName = col.examName === "[Selected Exam]" ? filters.exam : col.examName;
                          const examData = classesDataMap[actualExamName];
                          const mark = getStudentMark(student.regNo, actualExamName, j);
                          const maxMark = examData ? examData.markPerSubject : 100;
                          const passMark = examData ? examData.passMark : 50;
                          const { grade, pass } = getLetterGrade(mark, maxMark, passMark);
                          
                          isCellFail = !pass || grade === "Ab" || grade === "U*";
                          if (isCellFail) rowHasFail = true;

                          if (col.type === "mark") cellContent = mark;
                          else if (col.type === "grade") cellContent = grade;
                          else if (col.type === "result") cellContent = (grade === "Ab" || grade === "U*" ? "Absent" : isCellFail ? "Fail" : "Pass");
                        }

                        return (
                          <td key={col.id || i} style={{ padding: "6pt 8pt", textAlign: col.type === "courseName" ? "left" : "center", border: "1px solid black", fontWeight: ["mark","grade","result"].includes(col.type) ? "bold" : "normal", ...(isCellFail ? failBg : {}) }}>
                            {cellContent}
                          </td>
                        );
                      });

                      return (
                        <tr key={j}>
                          {rowCells}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ fontSize: "14pt", marginBottom: "4pt", whiteSpace: "pre-line" }}>
                  <u><strong>{template.noteTitleEnglish || "Note:"}{filters.exam !== "ESE" && classesDataMap[filters.exam]?.passMark ? ` PASS MARK ${classesDataMap[filters.exam].passMark}` : ""}</strong></u>
                  <br />
                  {getReplacedNote(template.noteEnglish) || "Candidates who secure less than 80 % of overall attendance in a semester will not be Permitted to write the End Semester Examinations."}
                </div>
                <div style={{ fontSize: "14pt", marginBottom: "4pt", whiteSpace: "pre-line" }}>
                  <u><strong>{template.noteTitleTamil || "குறிப்பு:"}{filters.exam !== "ESE" && classesDataMap[filters.exam]?.passMark ? ` PASS MARK ${classesDataMap[filters.exam].passMark}` : ""}</strong></u>
                  <br />
                  {getReplacedNote(template.noteTamil) || "கல்வியாண்டில் (ஒவ்வொரு செமஸ்டரிலும்) 80 சதவீதத்திற்கு குறைவாக வருகைப்பதிவு இருந்தால் அம்மாணவ, மாணவியர் இறுதி செமஸ்டர் தேர்வு எழுத அனுமதிக்கப்படமாட்டார்,"}
                </div>
                <div style={{ fontSize: "14pt", marginBottom: "8pt" }}>
                  <strong>Specific Remarks:</strong> ………………………………………………………………………………………………<br />
                  ………………………………………………………………………………………………………………………………..
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: "14pt", fontWeight: "bold" }}>
                  <div><strong>DATE :</strong> {template.letterDate || getDisplayDate()}</div>
                  <div style={{ textAlign: "center", whiteSpace: "pre-line" }}><strong>{template.signatureLeft}</strong></div>
                  <div style={{ textAlign: "center", whiteSpace: "pre-line" }}><strong>{template.signatureMiddle}</strong></div>
                  <div style={{ textAlign: "center", whiteSpace: "pre-line" }}><strong>{template.signatureRight}</strong></div>
                </div>
              </div>
            );
          })}

          {selectedStudents.length === 0 && (
            <div className="no-print" style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>☐</div>
              <p>Check at least one student above to generate letters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
