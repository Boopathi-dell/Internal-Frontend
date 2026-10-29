import React, { useState, useEffect, useMemo } from "react";
import API from "../api";
import * as XLSX from "xlsx";
import { 
  Printer, 
  FileSpreadsheet, 
  Download, 
  Settings, 
  RefreshCw, 
  Edit3, 
  Check, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Type,
  BookOpen,
  Calendar,
  Layers,
  GraduationCap,
  Sliders,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function InternalMarkSheet() {
  const [allTemplates, setAllTemplates] = useState([]);
  const [availableRegulations, setAvailableRegulations] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const [formData, setFormData] = useState({
    regulation: "2023",
    academicYear: "2026-27",
    department: "CSE",
    year: "II",
    semester: "IV",
    section: "A",
    selectedSubject: "",
    customSubject: "",
    isCustomSubject: false,
    iqacRef: "MEC/IQAC/2026-27/COE/022",
    date: new Date().toLocaleDateString("en-GB").replace(/\//g, "."),
    semesterSession: "EVEN SEM APRIL - 2027",
    rowsPerPage: 30
  });

  const [headerImage, setHeaderImage] = useState(() => localStorage.getItem("internalMarkHeaderImage") || "");
  const [studentsData, setStudentsData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rosters, setRosters] = useState([]);
  const [allFetchedClasses, setAllFetchedClasses] = useState([]);
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 1. Fetch All Admin Templates & Extract Regulations
  useEffect(() => {
    fetchTemplatesAndRegulations();
    fetchAllRosters();
    fetchHeaderImage();
  }, []);

  const fetchHeaderImage = async () => {
    try {
      const res = await API.get("/api/internal-marks/header-image");
      if (res.data && res.data.headerImage) {
        setHeaderImage(res.data.headerImage);
        localStorage.setItem("internalMarkHeaderImage", res.data.headerImage);
        return;
      }
      const letterRes = await API.get("/api/letter-template");
      if (letterRes.data && letterRes.data.headerLogo) {
        setHeaderImage(letterRes.data.headerLogo);
        localStorage.setItem("internalMarkHeaderImage", letterRes.data.headerLogo);
      }
    } catch (e) {
      console.error("Could not fetch header image:", e);
    }
  };

  const fetchTemplatesAndRegulations = async () => {
    try {
      const res = await API.get("/api/internal-marks");
      const templates = res.data || [];
      setAllTemplates(templates);

      const regs = [...new Set(templates.map(t => t.regulation).filter(Boolean))];
      setAvailableRegulations(regs);

      // If regulations exist in DB, default to first available regulation or match 2023 / 2025
      if (regs.length > 0) {
        const defaultReg = regs.includes("2023") ? "2023" : (regs.includes("2025") ? "2025" : regs[0]);
        setFormData(prev => ({ ...prev, regulation: defaultReg }));
        const matched = templates.find(t => t.regulation === defaultReg && t.isActive) || templates.find(t => t.regulation === defaultReg);
        setActiveTemplate(matched || null);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  const fetchAllRosters = async () => {
    try {
      const res = await API.get("/api/rosters");
      setRosters(res.data || []);
    } catch (err) {
      console.error("Failed to fetch rosters:", err);
    }
  };

  // When selected regulation changes, automatically activate matching template
  const handleRegulationChange = (reg) => {
    setFormData(prev => ({ ...prev, regulation: reg }));
    const matched = allTemplates.find(t => t.regulation === reg && t.isActive) || allTemplates.find(t => t.regulation === reg);
    setActiveTemplate(matched || null);
  };

  // Calculate default semester session based on Semester & Academic Year
  useEffect(() => {
    const isOdd = ["I", "III", "V", "VII"].includes(formData.semester);
    const startYear = formData.academicYear.split("-")[0] || "2026";
    const endYear = (parseInt(startYear) + 1).toString();
    const session = isOdd 
      ? `ODD SEM NOVEMBER - ${startYear}` 
      : `EVEN SEM APRIL - ${endYear}`;
    
    setFormData(prev => ({
      ...prev,
      semesterSession: session,
      iqacRef: `MEC/IQAC/${prev.academicYear || "2026-27"}/COE/022`
    }));
  }, [formData.semester, formData.academicYear]);

  // Fetch subjects for currently selected Dept & Class
  const fetchSubjectsForSelection = async () => {
    try {
      const yearSemSec = `${formData.year}/${formData.semester}/${formData.section}`;
      const res = await API.get(`/api/classes`);
      const classesList = res.data || [];
      setAllFetchedClasses(classesList);

      const filteredClasses = classesList.filter(c => 
        c.department === formData.department && 
        c.yearSemSec === yearSemSec
      );

      const courseMap = {};
      const allCourseCodes = new Set();

      filteredClasses.forEach(c => {
        if (c.courseDetails && Array.isArray(c.courseDetails)) {
          c.courseDetails.forEach(cd => {
            if (cd.courseCode) {
              const code = cd.courseCode.trim();
              courseMap[code] = cd.courseName ? cd.courseName.trim() : code;
              allCourseCodes.add(code);
            }
          });
        }
        if (c.subjects && Array.isArray(c.subjects)) {
          c.subjects.forEach(s => {
            if (s && s.trim()) allCourseCodes.add(s.trim());
          });
        }
      });

      const distinctSubjectCodes = [...allCourseCodes];
      const subjectsWithNames = distinctSubjectCodes.map(code => ({
        code: code,
        name: courseMap[code] || "Theory Subject"
      })).sort((a, b) => a.code.localeCompare(b.code));

      setSubjects(subjectsWithNames);

      if (subjectsWithNames.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          selectedSubject: prev.selectedSubject && subjectsWithNames.some(s => s.code === prev.selectedSubject) 
            ? prev.selectedSubject 
            : subjectsWithNames[0].code, 
          isCustomSubject: false
        }));
      } else {
        setFormData(prev => ({ ...prev, selectedSubject: "CUSTOM", isCustomSubject: true }));
      }
    } catch (e) {
      console.error("Error fetching subjects:", e);
    }
  };

  useEffect(() => {
    fetchSubjectsForSelection();
  }, [formData.department, formData.year, formData.semester, formData.section]);

  // Helper to parse numbers safely
  const parseNum = (val) => {
    if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "AB") return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // Normalize string for fuzzy match
  const normStr = (str) => (str || "").toLowerCase().replace(/[\s\-_]/g, "");

  // Flexible exam mark finder
  const findExamMarkForStudent = (student, examName, targetSubj, allClassesForSection) => {
    if (!examName) return 0;
    const cleanTarget = normStr(targetSubj);
    const cleanExam = normStr(examName);

    // Look for classes matching this exam
    for (const cls of allClassesForSection) {
      if (normStr(cls.examName) === cleanExam || (cleanExam.includes("cia") && normStr(cls.examName).includes("cia"))) {
        // Find subject index
        let subjIdx = -1;
        if (cls.subjects && Array.isArray(cls.subjects)) {
          subjIdx = cls.subjects.findIndex(s => normStr(s) === cleanTarget);
        }
        if (subjIdx === -1 && cls.courseDetails && Array.isArray(cls.courseDetails)) {
          subjIdx = cls.courseDetails.findIndex(cd => 
            normStr(cd.courseCode) === cleanTarget || normStr(cd.courseName) === cleanTarget
          );
        }

        if (subjIdx !== -1 && cls.students) {
          const stObj = cls.students.find(s => s.regNo === student.regNo);
          if (stObj && stObj.marks && stObj.marks.length > subjIdx) {
            const val = stObj.marks[subjIdx];
            return val !== "" && val !== undefined ? val : 0;
          }
        }
      }
    }
    return 0;
  };

  // Process and calculate student marks based on the current template
  const processSubjectData = async () => {
    setLoading(true);
    try {
      const yearSemSec = `${formData.year}/${formData.semester}/${formData.section}`;
      const res = await API.get(`/api/classes`);
      const classesList = res.data || [];
      setAllFetchedClasses(classesList);

      const allClassesForSection = classesList.filter(c => 
        c.department === formData.department && 
        c.yearSemSec === yearSemSec
      );

      const targetSubject = formData.isCustomSubject ? formData.customSubject : formData.selectedSubject;
      if (!targetSubject) {
        setStudentsData([]);
        setLoading(false);
        return;
      }

      const studentMap = {};

      // 1. Gather all students from Roster
      const matchingRoster = rosters.find(r => 
        r.department === formData.department && 
        r.year === formData.year && 
        r.semester === formData.semester && 
        r.section === formData.section
      );

      if (matchingRoster && matchingRoster.students) {
        matchingRoster.students.forEach(student => {
          if (student.regNo) {
            studentMap[student.regNo] = {
              regNo: student.regNo,
              name: student.name || ""
            };
          }
        });
      }

      // 2. Also gather students from ANY uploaded class for this department & section
      allClassesForSection.forEach(c => {
        if (c.students && Array.isArray(c.students)) {
          c.students.forEach(st => {
            if (st.regNo && !studentMap[st.regNo]) {
              studentMap[st.regNo] = {
                regNo: st.regNo,
                name: st.name || ""
              };
            }
          });
        }
      });

      // 3. Fallback Columns if no template exists: Default MEC 17-column structure
      const defaultMecColumns = [
        { heading: "UT-1 (30)", type: "exam", examName: "Unit Test - I" },
        { heading: "UT-2 (30)", type: "exam", examName: "Unit Test - II" },
        { heading: "CIA1 (50)", type: "exam", examName: "CIA - I" },
        { heading: "IM (10)", type: "formula", formula: "(#[UT-1 (30)] + #[UT-2 (30)] + #[CIA1 (50)]) / 110 * 10" },
        { heading: "UT-3 (30)", type: "exam", examName: "Unit Test - III" },
        { heading: "UT-4 (30)", type: "exam", examName: "Unit Test - IV" },
        { heading: "CIA2 (50)", type: "exam", examName: "CIA - II" },
        { heading: "IM (10)", type: "formula", formula: "(#[UT-3 (30)] + #[UT-4 (30)] + #[CIA2 (50)]) / 110 * 10" },
        { heading: "UT-5 (30)", type: "exam", examName: "Unit Test - V" },
        { heading: "CIA3 (100)", type: "exam", examName: "Model Exam" },
        { heading: "IM (10)", type: "formula", formula: "(#[UT-5 (30)] + #[CIA3 (100)]) / 130 * 10" },
        { heading: "SM (5)", type: "exam", examName: "Seminar" },
        { heading: "MKC (5)", type: "exam", examName: "MKC" },
        { heading: "TOTAL (40)", type: "formula", formula: "#[IM (10)] + #[IM (10)] + #[IM (10)] + #[SM (5)] + #[MKC (5)]" }
      ];

      // Use strictly active template's columns if available
      const columnsToUse = (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0)
        ? activeTemplate.columns
        : defaultMecColumns;

      // 4. Calculate marks for every student against columnsToUse
      const evaluatedStudents = Object.values(studentMap).map(student => {
        const row = { ...student };

        columnsToUse.forEach(col => {
          if (col.type === "exam") {
            const mark = findExamMarkForStudent(student, col.examName, targetSubject, allClassesForSection);
            row[col.heading] = mark;
          } else if (col.type === "formula" || col.type === "calculation") {
            try {
              let f = col.formula || "0";
              columnsToUse.forEach(inner => {
                const val = parseNum(row[inner.heading]);
                f = f.split(`#[${inner.heading}]`).join(val);
              });
              const res = new Function(`return ${f}`)();
              row[col.heading] = isNaN(res) ? 0 : Math.round(res);
            } catch (e) {
              row[col.heading] = 0;
            }
          }
        });

        return row;
      });

      evaluatedStudents.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
      setStudentsData(evaluatedStudents);
    } catch (err) {
      console.error("Error evaluating marks:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (formData.selectedSubject !== "CUSTOM" || formData.customSubject.length >= 2) {
      const timer = setTimeout(() => {
        processSubjectData();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [
    formData.selectedSubject, 
    formData.customSubject, 
    formData.department, 
    formData.year, 
    formData.semester, 
    formData.section, 
    formData.regulation, 
    formData.academicYear, 
    activeTemplate,
    rosters
  ]);

  // Handle cell edit on screen
  const handleCellEdit = (studentIndex, colHeading, value) => {
    setStudentsData(prev => {
      const updated = [...prev];
      const row = { ...updated[studentIndex], [colHeading]: value };

      const columnsToUse = (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0)
        ? activeTemplate.columns
        : [];

      // Re-evaluate formulas for this row
      columnsToUse.forEach(col => {
        if (col.type === "formula" || col.type === "calculation") {
          try {
            let f = col.formula || "0";
            columnsToUse.forEach(inner => {
              const val = parseNum(row[inner.heading]);
              f = f.split(`#[${inner.heading}]`).join(val);
            });
            const res = new Function(`return ${f}`)();
            row[col.heading] = isNaN(res) ? 0 : Math.round(res);
          } catch (e) {
            row[col.heading] = 0;
          }
        }
      });

      updated[studentIndex] = row;
      return updated;
    });
  };

  // Get Clean Formatted Course Code and Name automatically
  const getDisplaySubject = () => {
    if (formData.isCustomSubject) return formData.customSubject || "Course";
    const found = subjects.find(s => s.code === formData.selectedSubject);
    return found ? `${found.code} - ${found.name}` : (formData.selectedSubject || "Course");
  };

  // Columns definition helper
  const currentColumns = useMemo(() => {
    if (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0) {
      return activeTemplate.columns;
    }
    return [
      { heading: "UT-1 (30)", type: "exam" },
      { heading: "UT-2 (30)", type: "exam" },
      { heading: "CIA1 (50)", type: "exam" },
      { heading: "IM (10)", type: "formula" },
      { heading: "UT-3 (30)", type: "exam" },
      { heading: "UT-4 (30)", type: "exam" },
      { heading: "CIA2 (50)", type: "exam" },
      { heading: "IM (10)", type: "formula" },
      { heading: "UT-5 (30)", type: "exam" },
      { heading: "CIA3 (100)", type: "exam" },
      { heading: "IM (10)", type: "formula" },
      { heading: "SM (5)", type: "exam" },
      { heading: "MKC (5)", type: "exam" },
      { heading: "TOTAL (40)", type: "formula" }
    ];
  }, [activeTemplate]);

  // Check if columns have subheaders (like "(50)")
  const hasSubHeaders = useMemo(() => {
    return currentColumns.some(c => c.heading && c.heading.includes("(") && c.heading.includes(")"));
  }, [currentColumns]);

  // Clean title & max mark extractor
  const parseHeading = (headingStr) => {
    const match = headingStr.match(/\((.*?)\)/);
    if (match) {
      const title = headingStr.replace(/\(.*?\)/, "").trim();
      const maxMark = match[1].trim();
      return { title, maxMark };
    }
    return { title: headingStr, maxMark: "" };
  };

  // Multi-page chunking: Consistent pages whether 1, 2, or 3 pages!
  const studentPages = useMemo(() => {
    const pages = [];
    const chunkSize = formData.rowsPerPage || 30;

    if (studentsData.length === 0) {
      pages.push([]);
      return pages;
    }

    for (let i = 0; i < studentsData.length; i += chunkSize) {
      pages.push(studentsData.slice(i, i + chunkSize));
    }
    return pages;
  }, [studentsData, formData.rowsPerPage]);

  const handlePrint = () => {
    window.print();
  };

  // Export to Excel (.xlsx) matching exact template columns
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [];

    // Header info rows
    rows.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", formData.iqacRef]);
    rows.push(["MUTHAYAMMAL ENGINEERING COLLEGE (AUTONOMOUS)"]);
    rows.push(["Rasipuram - 637 408, Namakkal (Dt.), Tamil Nadu, India."]);
    rows.push([]);
    rows.push([
      `Dept: ${formData.department}`, 
      "", 
      `Year/Sem/Sec: ${formData.year} / ${formData.semester} / ${formData.section}`, 
      "", 
      "", 
      formData.semesterSession, 
      "", 
      "", 
      "", 
      "", 
      `Date: ${formData.date}`
    ]);
    rows.push([`Course Code / Name : ${getDisplaySubject()}`]);
    rows.push([]);

    // Table Header 1
    const row1 = ["S.No", "Reg.No.", "Name"];
    const row2 = ["", "", ""];

    currentColumns.forEach(c => {
      const { title, maxMark } = parseHeading(c.heading);
      row1.push(title);
      row2.push(maxMark);
    });

    rows.push(row1);
    if (hasSubHeaders) rows.push(row2);

    // Student Data Rows
    studentsData.forEach((st, idx) => {
      const stRow = [
        idx + 1,
        st.regNo,
        st.name
      ];
      currentColumns.forEach(c => {
        stRow.push(st[c.heading] !== undefined ? st[c.heading] : 0);
      });
      rows.push(stRow);
    });

    // Signature Block
    rows.push([]);
    rows.push([]);
    rows.push([
      "Course Faculty", "", "", 
      "Year Co-ordinator", "", "", 
      "HoD"
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Internal Marks");
    const filename = `Internal_Mark_Sheet_Reg${formData.regulation}_${formData.department}_${formData.year}_Sem${formData.semester}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="fade-in" style={{ padding: "1.2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* SCREEN CONTROLS & HEADER (HIDDEN IN PRINT) */}
      <div className="no-print">
        {/* Top Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--primary)", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
              <FileSpreadsheet size={30} /> Internal Mark Generator
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: "0.95rem" }}>
              Template-driven marksheet generator with automated formulas and multi-page print layout.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => setIsEditingMarks(!isEditingMarks)}
              className={`btn ${isEditingMarks ? "btn-warning" : "btn-secondary"}`}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", padding: "0.65rem 1.2rem", borderRadius: "10px" }}
              title="Toggle inline mark editing"
            >
              <Edit3 size={18} /> {isEditingMarks ? "Lock Editing" : "Edit Marks Inline"}
            </button>

            <button
              onClick={handleExportExcel}
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", padding: "0.65rem 1.2rem", borderRadius: "10px", border: "1px solid #10b981", color: "#10b981" }}
              title="Download Excel spreadsheet"
            >
              <Download size={18} /> Export Excel (.xlsx)
            </button>

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              disabled={studentsData.length === 0}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px", 
                fontWeight: "700", 
                padding: "0.75rem 1.6rem", 
                borderRadius: "12px", 
                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)",
                background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
              }}
            >
              <Printer size={20} /> Print Report
            </button>
          </div>
        </div>

        {/* LUXURIOUS, MODERN PARAMETERS CARD */}
        <div style={{
          background: "linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: "20px",
          padding: "1.75rem",
          boxShadow: "0 10px 30px -5px rgba(99, 102, 241, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.05)",
          marginBottom: "2rem",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Top Decorative Line */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)" }} />

          {/* Card Header & Active Template Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(226, 232, 240, 0.8)", paddingBottom: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ background: "rgba(99, 102, 241, 0.1)", color: "var(--primary)", padding: "8px", borderRadius: "10px" }}>
                <Layers size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "800", color: "#1e293b" }}>Class & Template Parameters</h3>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Select your regulation and class to generate the official internal mark format</span>
              </div>
            </div>

            {/* Template Badge */}
            {activeTemplate ? (
              <div style={{ 
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.15))", 
                border: "1px solid rgba(34, 197, 94, 0.3)", 
                padding: "6px 14px", 
                borderRadius: "30px", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px" 
              }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <span style={{ fontWeight: "700", color: "#15803d", fontSize: "0.85rem" }}>
                  Active Template: {activeTemplate.templateName} ({currentColumns.length} columns)
                </span>
              </div>
            ) : (
              <div style={{ 
                background: "rgba(234, 179, 8, 0.1)", 
                border: "1px solid rgba(234, 179, 8, 0.3)", 
                padding: "6px 14px", 
                borderRadius: "30px", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px" 
              }}>
                <AlertCircle size={16} color="#d97706" />
                <span style={{ fontWeight: "600", color: "#b45309", fontSize: "0.85rem" }}>
                  Standard MEC Format Active ({currentColumns.length} columns)
                </span>
              </div>
            )}
          </div>

          {/* Primary Parameter Selectors Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.25rem" }}>
            {/* 1. Regulation Selector (Only Regulations from Admin Panel) */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <BookOpen size={14} /> Regulation
              </label>
              <select 
                className="input-field"
                value={formData.regulation} 
                onChange={e => handleRegulationChange(e.target.value)}
                style={{ 
                  fontWeight: "bold", 
                  border: "2px solid rgba(99, 102, 241, 0.3)", 
                  background: "#ffffff", 
                  borderRadius: "10px",
                  boxShadow: "0 2px 6px rgba(99, 102, 241, 0.05)"
                }}
              >
                {availableRegulations.length > 0 ? (
                  availableRegulations.map(reg => (
                    <option key={reg} value={reg}>Regulation {reg}</option>
                  ))
                ) : (
                  <>
                    <option value="2023">Regulation 2023</option>
                    <option value="2025">Regulation 2025</option>
                    <option value="2021">Regulation 2021</option>
                  </>
                )}
              </select>
            </div>

            {/* 2. Academic Year */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Academic Year</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.academicYear} 
                onChange={e => setFormData({ ...formData, academicYear: e.target.value })} 
                placeholder="2026-27"
                style={{ borderRadius: "10px", background: "#ffffff" }}
              />
            </div>

            {/* 3. Department */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Department</label>
              <select className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {["CSE", "AI&DS", "ECE", "EEE", "MECH", "CIVIL", "IT"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* 4. Year */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Year</label>
              <select className="input-field" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {["I", "II", "III", "IV"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* 5. Semester */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Semester</label>
              <select className="input-field" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 6. Section */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Section</label>
              <select className="input-field" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {["A", "B", "C", "D"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 7. Target Subject (Auto Detect & Bound) */}
            <div style={{ gridColumn: "span 2", minWidth: "260px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "var(--primary)", textTransform: "uppercase" }}>
                <GraduationCap size={14} /> Target Subject (Auto Prints on Report)
              </label>
              <select 
                className="input-field" 
                value={formData.isCustomSubject ? "CUSTOM" : formData.selectedSubject} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === "CUSTOM") {
                    setFormData(prev => ({ ...prev, selectedSubject: "CUSTOM", isCustomSubject: true }));
                  } else {
                    setFormData(prev => ({ ...prev, selectedSubject: val, isCustomSubject: false, customSubject: "" }));
                  }
                }}
                style={{ 
                  border: "2px solid rgba(99, 102, 241, 0.3)", 
                  background: "#ffffff", 
                  fontWeight: "bold", 
                  borderRadius: "10px" 
                }}
              >
                {subjects.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                <option value="CUSTOM">+ Type Custom Subject Code & Name</option>
              </select>
            </div>

            {formData.isCustomSubject && (
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "var(--primary)" }}>
                  <Type size={14} /> Enter Subject Code & Name
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="E.g. 21CS401 - Operating Systems"
                  value={formData.customSubject}
                  onChange={e => setFormData({ ...formData, customSubject: e.target.value })}
                  style={{ border: "2px solid var(--primary)", background: "#ffffff", borderRadius: "10px" }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Advanced Print & Header Settings Toggle */}
          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed rgba(226, 232, 240, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem", color: "#64748b" }}>
              <span>Loaded Students: <strong style={{ color: "var(--primary)" }}>{studentsData.length}</strong></span>
              <span>•</span>
              <span>Print Format: <strong style={{ color: "#0f172a" }}>Course Code / Name : {getDisplaySubject()}</strong></span>
            </div>

            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}
            >
              <Sliders size={14} /> {showAdvancedSettings ? "Hide Page & Header Settings" : "Page & Header Settings"} {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Advanced Settings Drawer */}
          {showAdvancedSettings && (
            <div style={{ marginTop: "1rem", padding: "1.25rem", background: "rgba(241, 245, 249, 0.7)", borderRadius: "14px", border: "1px solid rgba(203, 213, 225, 0.6)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Rows Per Print Page
                  </label>
                  <select 
                    className="input-field" 
                    value={formData.rowsPerPage} 
                    onChange={e => setFormData({ ...formData, rowsPerPage: parseInt(e.target.value) || 30 })}
                    style={{ background: "#ffffff", padding: "6px 10px" }}
                  >
                    <option value={25}>25 Students per page</option>
                    <option value={30}>30 Students per page (Recommended)</option>
                    <option value={35}>35 Students per page</option>
                    <option value={100}>All on 1 page (Single Continuous Table)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Reference / IQAC Code (Top-Right)
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.iqacRef} 
                    onChange={e => setFormData({ ...formData, iqacRef: e.target.value })} 
                    placeholder="MEC/IQAC/2026-27/COE/022"
                    style={{ background: "#ffffff", padding: "6px 10px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Semester Session Text
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.semesterSession} 
                    onChange={e => setFormData({ ...formData, semesterSession: e.target.value })} 
                    placeholder="EVEN SEM APRIL - 2027"
                    style={{ background: "#ffffff", padding: "6px 10px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Print Date
                  </label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={formData.date} 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                    placeholder="29.10.2026"
                    style={{ background: "#ffffff", padding: "6px 10px" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="no-print" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <div style={{ width: "36px", height: "36px", border: "4px solid rgba(99,102,241,0.2)", borderTop: "4px solid var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem auto" }}></div>
          Loading student marks for Regulation {formData.regulation}...
        </div>
      )}

      {/* PRINT STYLES - ROBUST MULTI-PAGE LAYOUT */}
      <style>{`
        @media screen {
          .print-container {
            display: flex;
            flex-direction: column;
            gap: 2.5rem;
            align-items: center;
          }
          .print-sheet {
            background: #ffffff;
            color: #000000;
            width: 100%;
            max-width: 1400px;
            padding: 25px 30px;
            box-shadow: 0 10px 35px rgba(0,0,0,0.15);
            border-radius: 8px;
            font-family: "Times New Roman", Times, serif;
            box-sizing: border-box;
          }
          .editable-cell-input {
            width: 100%;
            border: 1px solid #6366f1;
            border-radius: 4px;
            padding: 2px;
            text-align: center;
            font-size: 11px;
            background: #f8fafc;
          }
        }

        @media print {
          @page {
            size: landscape;
            margin: 6mm 8mm 6mm 8mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-after: always;
            break-after: page;
            min-height: 190mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .print-sheet:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .no-print {
            display: none !important;
          }
          .editable-cell-input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
        }

        .mec-official-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 11px;
          color: #000000;
        }
        .mec-official-table th, .mec-official-table td {
          border: 1px solid #000000;
          padding: 3px 2px;
          text-align: center;
          vertical-align: middle;
        }
        .mec-official-table th {
          font-weight: bold;
          background: #ffffff;
          font-family: "Times New Roman", Times, serif;
          font-size: 11.5px;
        }
        .mec-official-table td.name-col {
          text-align: left;
          padding-left: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      {/* RENDER PAGES (EACH CHUNK WITH FULL CONSISTENT HEADER & LAYOUT) */}
      {!loading && (
        <div className="print-container">
          {studentPages.map((pageStudents, pageIndex) => {
            const pageNum = pageIndex + 1;
            const totalPages = studentPages.length;
            const isLastPage = pageNum === totalPages;
            const startSno = pageIndex * (formData.rowsPerPage || 30) + 1;

            return (
              <div key={pageIndex} className="print-sheet">
                <div>
                  {/* TOP HEADER BLOCK - UNIFORM ACROSS ALL PAGES */}
                  {/* Top Right Reference Code */}
                  <div style={{ textAlign: "right", fontSize: "11px", fontWeight: "bold", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>
                    {formData.iqacRef}
                  </div>

                  {/* HEADER BANNER / LOGO BLOCK */}
                  {headerImage ? (
                    <div style={{ textAlign: "center", marginBottom: "8px" }}>
                      <img 
                        src={headerImage} 
                        alt="College Header Banner" 
                        style={{ maxHeight: "90px", width: "100%", objectFit: "contain" }} 
                      />
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: "8px" }}>
                      <div style={{ position: "absolute", left: "0", top: "0" }}>
                        <img 
                          src="/logo1.png" 
                          alt="MEC Logo" 
                          style={{ height: "65px", width: "auto", objectFit: "contain" }}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "bold", margin: "0", letterSpacing: "0.5px", fontFamily: '"Times New Roman", Times, serif' }}>
                          MUTHAYAMMAL ENGINEERING COLLEGE
                        </h2>
                        <div style={{ fontSize: "13px", fontWeight: "bold", margin: "2px 0 1px 0" }}>
                          (Autonomous)
                        </div>
                        <div style={{ fontSize: "11px", margin: 0 }}>
                          Rasipuram – 637 408, Namakkal (Dt.), Tamil Nadu, India.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadata Row 1 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "bold", margin: "6px 0 4px 0", fontFamily: '"Times New Roman", Times, serif' }}>
                    <div style={{ flex: "0 0 160px" }}>Dept: {formData.department}</div>
                    <div style={{ flex: "0 0 200px" }}>Year/Sem/Sec: {formData.year} / {formData.semester} / {formData.section}</div>
                    <div style={{ flex: "1", textAlign: "center", letterSpacing: "0.5px" }}>{formData.semesterSession}</div>
                    <div style={{ flex: "0 0 140px", textAlign: "right" }}>Date: {formData.date}</div>
                  </div>

                  {/* Metadata Row 2 (Course Code / Name - Automatically Populated & Printed) */}
                  <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "6px", fontFamily: '"Times New Roman", Times, serif' }}>
                    Course Code / Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                  </div>

                  {/* DYNAMIC TEMPLATE TABLE */}
                  <table className="mec-official-table">
                    <thead>
                      {/* HEADER ROW 1 */}
                      <tr>
                        <th rowSpan={hasSubHeaders ? 2 : 1} style={{ width: "38px" }}>S.No</th>
                        <th rowSpan={hasSubHeaders ? 2 : 1} style={{ width: "105px" }}>Reg.No.</th>
                        <th rowSpan={hasSubHeaders ? 2 : 1} style={{ width: "200px" }}>Name</th>
                        {currentColumns.map((col, idx) => {
                          const { title } = parseHeading(col.heading);
                          return (
                            <th key={idx}>
                              {title}
                            </th>
                          );
                        })}
                      </tr>

                      {/* HEADER ROW 2 (MAX MARKS ROW IF APPLICABLE) */}
                      {hasSubHeaders && (
                        <tr>
                          {currentColumns.map((col, idx) => {
                            const { maxMark } = parseHeading(col.heading);
                            return (
                              <th key={idx}>
                                {maxMark}
                              </th>
                            );
                          })}
                        </tr>
                      )}
                    </thead>

                    <tbody>
                      {pageStudents.map((st, i) => {
                        const globalIndex = pageIndex * (formData.rowsPerPage || 30) + i;
                        const sNo = startSno + i;

                        return (
                          <tr key={st.regNo || i} style={{ height: "19px" }}>
                            <td>{sNo}</td>
                            <td>{st.regNo || ""}</td>
                            <td className="name-col" title={st.name}>{st.name || ""}</td>

                            {currentColumns.map((col, colIdx) => {
                              const val = st[col.heading];
                              const isFormula = col.type === "formula" || col.type === "calculation";

                              return (
                                <td 
                                  key={colIdx} 
                                  style={{ fontWeight: isFormula ? "bold" : "normal" }}
                                >
                                  {isEditingMarks && !isFormula ? (
                                    <input 
                                      className="editable-cell-input" 
                                      value={val !== undefined ? val : ""} 
                                      onChange={e => handleCellEdit(globalIndex, col.heading, e.target.value)} 
                                    />
                                  ) : (
                                    val !== undefined ? val : ""
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM SIGNATURE BLOCK (APPEARS ON FINAL PAGE) */}
                <div style={{ marginTop: "24px" }}>
                  {isLastPage ? (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 20px", fontWeight: "bold", fontSize: "12px", fontFamily: '"Times New Roman", Times, serif', marginBottom: "15px" }}>
                      <div style={{ textAlign: "center", minWidth: "120px" }}>
                        <div>Course Faculty</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "140px" }}>
                        <div>Year Co-ordinator</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "120px" }}>
                        <div>HoD</div>
                      </div>
                    </div>
                  ) : null}

                  {/* Centered Page Footer */}
                  <div style={{ textAlign: "center", fontSize: "11px", fontFamily: '"Times New Roman", Times, serif' }}>
                    Page {pageNum} of {totalPages}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && studentsData.length === 0 && (
        <div className="no-print" style={{ textAlign: "center", padding: "3rem", background: "var(--bg-secondary)", borderRadius: "16px", border: "1px dashed var(--border-color)", marginTop: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>
            No students found for {formData.department} {formData.year}/{formData.semester}/{formData.section}.
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Ensure either a Student Roster or Exam marks have been uploaded in the system for this class.
          </p>
        </div>
      )}
    </div>
  );
}
