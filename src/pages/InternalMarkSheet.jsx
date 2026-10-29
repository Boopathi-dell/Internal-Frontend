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
  Type
} from "lucide-react";

export default function InternalMarkSheet() {
  const [formData, setFormData] = useState({
    regulation: "2021",
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
    courseFaculty: "",
    yearCoordinator: "",
    hod: ""
  });

  const [activeFormat, setActiveFormat] = useState("official"); // "official" | "custom"
  const [customTemplate, setCustomTemplate] = useState(null);
  const [studentsData, setStudentsData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [availableExams, setAvailableExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rosters, setRosters] = useState([]);
  const [allFetchedClasses, setAllFetchedClasses] = useState([]);
  const [showExamMapping, setShowExamMapping] = useState(false);
  const [isEditingMarks, setIsEditingMarks] = useState(false);

  // Manual Exam Mapping (overrides auto-detection if chosen)
  const [examMapping, setExamMapping] = useState({
    ut1: "AUTO",
    ut2: "AUTO",
    cia1: "AUTO",
    ut3: "AUTO",
    ut4: "AUTO",
    cia2: "AUTO",
    ut5: "AUTO",
    cia3: "AUTO",
    sm: "AUTO",
    mkc: "AUTO"
  });

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

  // Fetch initial data
  useEffect(() => {
    fetchAllRosters();
    fetchActiveTemplate(formData.regulation);
  }, []);

  useEffect(() => {
    if (formData.regulation) {
      fetchActiveTemplate(formData.regulation);
    }
  }, [formData.regulation]);

  const fetchActiveTemplate = async (reg) => {
    try {
      const res = await API.get(`/api/internal-marks/active?regulation=${reg}`);
      if (res.data) setCustomTemplate(res.data);
      else setCustomTemplate(null);
    } catch (err) {
      console.error("Failed to fetch template:", err);
      setCustomTemplate(null);
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

      // Collect available exams in this class
      const distinctExams = [...new Set(filteredClasses.map(c => c.examName).filter(Boolean))];
      setAvailableExams(distinctExams);

      const courseMap = {};
      const allCourseCodes = new Set();
      let detectedFaculty = "";

      filteredClasses.forEach(c => {
        if (c.courseDetails && Array.isArray(c.courseDetails)) {
          c.courseDetails.forEach(cd => {
            if (cd.courseCode) {
              const code = cd.courseCode.trim();
              courseMap[code] = cd.courseName ? cd.courseName.trim() : code;
              allCourseCodes.add(code);
              if (cd.facultyName && !detectedFaculty) {
                detectedFaculty = cd.facultyName.trim();
              }
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
          selectedSubject: prev.selectedSubject && subjectsWithNames.some(s => s.code === prev.selectedSubject) ? prev.selectedSubject : subjectsWithNames[0].code, 
          isCustomSubject: false,
          courseFaculty: detectedFaculty || prev.courseFaculty
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

  // Match exam string flexibly
  const matchesExamName = (examName, targetType) => {
    if (!examName) return false;
    const clean = examName.toLowerCase().replace(/[\s\-_]/g, "");
    
    switch (targetType) {
      case "ut1":
        return clean === "ut1" || clean === "unittest1" || clean === "uniti" || clean === "unit1" || clean === "u1";
      case "ut2":
        return clean === "ut2" || clean === "unittest2" || clean === "unitii" || clean === "unit2" || clean === "u2";
      case "cia1":
        return clean === "cia1" || clean === "ciai" || clean === "internal1" || clean === "internali";
      case "ut3":
        return clean === "ut3" || clean === "unittest3" || clean === "unitiii" || clean === "unit3" || clean === "u3";
      case "ut4":
        return clean === "ut4" || clean === "unittest4" || clean === "unitiv" || clean === "unit4" || clean === "u4";
      case "cia2":
        return clean === "cia2" || clean === "ciaii" || clean === "internal2" || clean === "internalii";
      case "ut5":
        return clean === "ut5" || clean === "unittest5" || clean === "unitv" || clean === "unit5" || clean === "u5";
      case "cia3":
        return clean === "cia3" || clean === "ciaiii" || clean === "internal3" || clean === "internaliii";
      case "sm":
        return clean === "sm" || clean.includes("seminar") || clean.includes("skill");
      case "mkc":
        return clean === "mkc" || clean.includes("model") || clean.includes("modelexam");
      default:
        return false;
    }
  };

  // Helper to parse numbers safely
  const parseNum = (val) => {
    if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "AB") return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // Main student and mark calculation processor
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

      // 1. First populate studentMap from Roster if available
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
              name: student.name || "",
              rawExams: {},
              ut1: "",
              ut2: "",
              cia1: "",
              im1: 0,
              ut3: "",
              ut4: "",
              cia2: "",
              im2: 0,
              ut5: "",
              cia3: "",
              im3: 0,
              sm: "",
              mkc: "",
              total: 0
            };
          }
        });
      }

      // 2. Also ensure all students from ANY uploaded class for this department & section are included!
      allClassesForSection.forEach(c => {
        if (c.students && Array.isArray(c.students)) {
          c.students.forEach(st => {
            if (st.regNo && !studentMap[st.regNo]) {
              studentMap[st.regNo] = {
                regNo: st.regNo,
                name: st.name || "",
                rawExams: {},
                ut1: "",
                ut2: "",
                cia1: "",
                im1: 0,
                ut3: "",
                ut4: "",
                cia2: "",
                im2: 0,
                ut5: "",
                cia3: "",
                im3: 0,
                sm: "",
                mkc: "",
                total: 0
              };
            }
          });
        }
      });

      // 3. Populate raw marks for each exam
      allClassesForSection.forEach(examObj => {
        const examName = (examObj.examName || "").trim();
        let subjectIndex = -1;

        if (examObj.subjects && Array.isArray(examObj.subjects)) {
          subjectIndex = examObj.subjects.findIndex(s => s && s.trim().toLowerCase() === targetSubject.trim().toLowerCase());
        }

        if (subjectIndex === -1 && examObj.courseDetails && Array.isArray(examObj.courseDetails)) {
          subjectIndex = examObj.courseDetails.findIndex(cd => 
            (cd.courseCode && cd.courseCode.trim().toLowerCase() === targetSubject.trim().toLowerCase()) ||
            (cd.courseName && cd.courseName.trim().toLowerCase() === targetSubject.trim().toLowerCase())
          );
        }

        if (subjectIndex !== -1 && examObj.students) {
          examObj.students.forEach(student => {
            if (!studentMap[student.regNo]) {
              studentMap[student.regNo] = {
                regNo: student.regNo,
                name: student.name || "",
                rawExams: {},
                ut1: "",
                ut2: "",
                cia1: "",
                im1: 0,
                ut3: "",
                ut4: "",
                cia2: "",
                im2: 0,
                ut5: "",
                cia3: "",
                im3: 0,
                sm: "",
                mkc: "",
                total: 0
              };
            }
            const markVal = student.marks && student.marks.length > subjectIndex ? student.marks[subjectIndex] : "";
            studentMap[student.regNo].rawExams[examName] = markVal === "" ? "" : markVal;
          });
        }
      });

      // 4. Map raw marks to Official Columns and calculate IM & TOTAL
      const evaluatedStudents = Object.values(studentMap).map(student => {
        const row = { ...student };

        // Helper to pick mark for a column based on auto-detect or manual mapping
        const getMarkForCol = (colKey) => {
          const manualExam = examMapping[colKey];
          if (manualExam && manualExam !== "AUTO") {
            return row.rawExams[manualExam] !== undefined ? row.rawExams[manualExam] : "";
          }
          // Auto detection across rawExams
          for (const [examName, mark] of Object.entries(row.rawExams)) {
            if (matchesExamName(examName, colKey)) {
              return mark;
            }
          }
          return "";
        };

        row.ut1 = getMarkForCol("ut1");
        row.ut2 = getMarkForCol("ut2");
        row.cia1 = getMarkForCol("cia1");
        row.ut3 = getMarkForCol("ut3");
        row.ut4 = getMarkForCol("ut4");
        row.cia2 = getMarkForCol("cia2");
        row.ut5 = getMarkForCol("ut5");
        row.cia3 = getMarkForCol("cia3");
        row.sm = getMarkForCol("sm");
        row.mkc = getMarkForCol("mkc");

        // Calculate IM1: (UT1 + UT2 + CIA1) / 110 * 10
        const hasExam1 = row.ut1 !== "" || row.ut2 !== "" || row.cia1 !== "";
        if (hasExam1) {
          const sum1 = parseNum(row.ut1) + parseNum(row.ut2) + parseNum(row.cia1);
          row.im1 = Math.round((sum1 / 110) * 10);
        } else {
          row.im1 = 0;
        }

        // Calculate IM2: (UT3 + UT4 + CIA2) / 110 * 10
        const hasExam2 = row.ut3 !== "" || row.ut4 !== "" || row.cia2 !== "";
        if (hasExam2) {
          const sum2 = parseNum(row.ut3) + parseNum(row.ut4) + parseNum(row.cia2);
          row.im2 = Math.round((sum2 / 110) * 10);
        } else {
          row.im2 = 0;
        }

        // Calculate IM3: (UT5 + CIA3) / 130 * 10
        const hasExam3 = row.ut5 !== "" || row.cia3 !== "";
        if (hasExam3) {
          const sum3 = parseNum(row.ut5) + parseNum(row.cia3);
          row.im3 = Math.round((sum3 / 130) * 10);
        } else {
          row.im3 = 0;
        }

        // MKC Scaling: If entered out of 100, scale down to 5
        let mkcVal = parseNum(row.mkc);
        if (mkcVal > 5) {
          mkcVal = Math.round(mkcVal / 20);
        }

        const smVal = parseNum(row.sm);

        // TOTAL: IM1 + IM2 + IM3 + SM + MKC (Max 40)
        row.total = row.im1 + row.im2 + row.im3 + smVal + mkcVal;

        // Custom template columns evaluation if custom mode is chosen
        if (customTemplate && customTemplate.columns) {
          customTemplate.columns.forEach(col => {
            if (col.type === "exam") {
              row[col.heading] = row.rawExams[col.examName] !== undefined ? row.rawExams[col.examName] : 0;
            } else if (col.type === "formula" || col.type === "calculation") {
              try {
                let f = col.formula || "0";
                customTemplate.columns.forEach(inner => {
                  const num = parseNum(row[inner.heading]);
                  f = f.split(`#[${inner.heading}]`).join(num);
                });
                const res = new Function(`return ${f}`)();
                row[col.heading] = isNaN(res) ? 0 : Math.round(res);
              } catch (e) {
                row[col.heading] = 0;
              }
            }
          });
        }

        return row;
      });

      evaluatedStudents.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
      setStudentsData(evaluatedStudents);
    } catch (err) {
      console.error("Error processing internal marks:", err);
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
    examMapping,
    customTemplate,
    rosters
  ]);

  // Handle cell edit on screen
  const handleCellEdit = (studentIndex, field, value) => {
    setStudentsData(prev => {
      const updated = [...prev];
      const row = { ...updated[studentIndex], [field]: value };

      // Recalculate IM1
      const sum1 = parseNum(row.ut1) + parseNum(row.ut2) + parseNum(row.cia1);
      row.im1 = (row.ut1 !== "" || row.ut2 !== "" || row.cia1 !== "") ? Math.round((sum1 / 110) * 10) : 0;

      // Recalculate IM2
      const sum2 = parseNum(row.ut3) + parseNum(row.ut4) + parseNum(row.cia2);
      row.im2 = (row.ut3 !== "" || row.ut4 !== "" || row.cia2 !== "") ? Math.round((sum2 / 110) * 10) : 0;

      // Recalculate IM3
      const sum3 = parseNum(row.ut5) + parseNum(row.cia3);
      row.im3 = (row.ut5 !== "" || row.cia3 !== "") ? Math.round((sum3 / 130) * 10) : 0;

      let mkcVal = parseNum(row.mkc);
      if (mkcVal > 5) mkcVal = Math.round(mkcVal / 20);
      const smVal = parseNum(row.sm);

      row.total = row.im1 + row.im2 + row.im3 + smVal + mkcVal;
      updated[studentIndex] = row;
      return updated;
    });
  };

  // Quick action: Fill all SM with 5
  const quickFillSM = (val = 5) => {
    setStudentsData(prev => prev.map(student => {
      const row = { ...student, sm: val };
      let mkcVal = parseNum(row.mkc);
      if (mkcVal > 5) mkcVal = Math.round(mkcVal / 20);
      row.total = (row.im1 || 0) + (row.im2 || 0) + (row.im3 || 0) + val + mkcVal;
      return row;
    }));
  };

  const getDisplaySubject = () => {
    if (formData.isCustomSubject) return formData.customSubject;
    const found = subjects.find(s => s.code === formData.selectedSubject);
    return found ? `${found.code} - ${found.name}` : (formData.selectedSubject || "Theory Course");
  };

  const handlePrint = () => {
    window.print();
  };

  // Chunk students into pages of 30 for perfect Landscape A4 printing
  const studentPages = useMemo(() => {
    const pages = [];
    const chunkSize = 30;
    if (studentsData.length === 0) {
      // Create empty 30 rows if no students loaded yet
      const dummy = Array.from({ length: 30 }, (_, i) => ({
        regNo: "",
        name: "",
        ut1: "", ut2: "", cia1: "", im1: 0,
        ut3: "", ut4: "", cia2: "", im2: 0,
        ut5: "", cia3: "", im3: 0,
        sm: "", mkc: "", total: 0
      }));
      pages.push(dummy);
      return pages;
    }

    for (let i = 0; i < studentsData.length; i += chunkSize) {
      pages.push(studentsData.slice(i, i + chunkSize));
    }
    return pages;
  }, [studentsData]);

  // Export to Excel (.xlsx) matching the official format
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
      "", 
      formData.semesterSession, 
      "", 
      "", 
      "", 
      "", 
      "", 
      "", 
      "", 
      "", 
      "", 
      `Date: ${formData.date}`
    ]);
    rows.push([`Course Code / Name : ${getDisplaySubject()}`]);
    rows.push([]);

    // Table Header 1
    rows.push([
      "S.No", "Reg.No.", "Name", 
      "UT-1", "UT-2", "CIA1", "IM", 
      "UT-3", "UT-4", "CIA2", "IM", 
      "UT-5", "CIA3", "IM", 
      "SM", "MKC", "TOTAL"
    ]);

    // Table Header 2 (Max Marks)
    rows.push([
      "", "", "", 
      30, 30, 50, 10, 
      30, 30, 50, 10, 
      30, 100, 10, 
      5, 5, 40
    ]);

    // Student Data Rows
    studentsData.forEach((st, idx) => {
      rows.push([
        idx + 1,
        st.regNo,
        st.name,
        st.ut1 || 0,
        st.ut2 || 0,
        st.cia1 || 0,
        st.im1 || 0,
        st.ut3 || 0,
        st.ut4 || 0,
        st.cia2 || 0,
        st.im2 || 0,
        st.ut5 || 0,
        st.cia3 || 0,
        st.im3 || 0,
        st.sm || 0,
        st.mkc || 0,
        st.total || 0
      ]);
    });

    // Signature Block
    rows.push([]);
    rows.push([]);
    rows.push([
      "Course Faculty", "", "", "", 
      "", "", "Year Co-ordinator", "", 
      "", "", "", "", "", "", 
      "", "HoD", ""
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set Column Widths
    ws["!cols"] = [
      { wch: 6 },  // S.No
      { wch: 15 }, // Reg.No
      { wch: 28 }, // Name
      { wch: 7 },  // UT-1
      { wch: 7 },  // UT-2
      { wch: 7 },  // CIA1
      { wch: 7 },  // IM
      { wch: 7 },  // UT-3
      { wch: 7 },  // UT-4
      { wch: 7 },  // CIA2
      { wch: 7 },  // IM
      { wch: 7 },  // UT-5
      { wch: 7 },  // CIA3
      { wch: 7 },  // IM
      { wch: 6 },  // SM
      { wch: 6 },  // MKC
      { wch: 9 }   // TOTAL
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Internal Mark Sheet");
    const filename = `Theory_Internal_Mark_Format_${formData.department}_${formData.year}_Sem${formData.semester}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="fade-in" style={{ padding: "1.2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* SCREEN CONTROLS & HEADER (HIDDEN IN PRINT) */}
      <div className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--primary)", margin: 0, display: "flex", alignItems: "center", gap: "12px" }}>
              <FileSpreadsheet size={30} /> Theory Internal Mark Sheet
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: "0.95rem" }}>
              Official Muthayammal Engineering College internal mark format with automatic scale calculations.
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
              <Printer size={20} /> Print Report (Format)
            </button>
          </div>
        </div>

        {/* FORMAT SELECTOR PILLS */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.2rem" }}>
          <button 
            onClick={() => setActiveFormat("official")}
            className={`btn ${activeFormat === "official" ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "0.85rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Sparkles size={14} /> Official MEC Format (Images 1 & 2)
          </button>
          <button 
            onClick={() => setActiveFormat("custom")}
            className={`btn ${activeFormat === "custom" ? "btn-primary" : "btn-secondary"}`}
            style={{ borderRadius: "20px", padding: "6px 16px", fontSize: "0.85rem", fontWeight: "600" }}
          >
            Custom Admin Template {customTemplate ? `(${customTemplate.templateName})` : "(Not Configured)"}
          </button>
        </div>

        {/* PARAMETERS SELECTION CARD */}
        <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, color: "var(--text-color)", fontSize: "1.1rem", fontWeight: "700" }}>Class & Report Parameters</h3>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Loaded Students: <strong>{studentsData.length}</strong>
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Academic Year</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.academicYear} 
                onChange={e => setFormData({ ...formData, academicYear: e.target.value })} 
                placeholder="2026-27"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Regulation</label>
              <input 
                type="text" 
                list="reg-options-sheet"
                className="input-field" 
                value={formData.regulation} 
                onChange={e => setFormData({ ...formData, regulation: e.target.value })} 
                placeholder="2021"
              />
              <datalist id="reg-options-sheet">
                {["2019", "2021", "2025"].map(r => <option key={r} value={r}>{r}</option>)}
              </datalist>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Department</label>
              <select className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                {["CSE", "AI&DS", "ECE", "EEE", "MECH", "CIVIL", "IT"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Year</label>
              <select className="input-field" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })}>
                {["I", "II", "III", "IV"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Semester</label>
              <select className="input-field" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })}>
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Section</label>
              <select className="input-field" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })}>
                {["A", "B", "C", "D"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>Date</label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.date} 
                onChange={e => setFormData({ ...formData, date: e.target.value })} 
                placeholder="29.10.2026"
              />
            </div>
          </div>

          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--border-color)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--primary)" }}>Target Subject</label>
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
                style={{ border: "1px solid var(--primary)", background: "rgba(99, 102, 241, 0.05)" }}
              >
                {subjects.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                <option value="CUSTOM">+ Type Custom Subject</option>
              </select>
            </div>

            {formData.isCustomSubject && (
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--primary)" }}>
                  <Type size={14} /> Enter Subject Code / Name
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="E.g. 21CS401 - Operating Systems"
                  value={formData.customSubject}
                  onChange={e => setFormData({ ...formData, customSubject: e.target.value })}
                  style={{ border: "1px solid var(--primary)", background: "rgba(99, 102, 241, 0.05)" }}
                  autoFocus
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                Reference / IQAC Code (Top-Right)
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.iqacRef} 
                onChange={e => setFormData({ ...formData, iqacRef: e.target.value })} 
                placeholder="MEC/IQAC/2026-27/COE/022"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.4rem", color: "var(--text-muted)" }}>
                Semester Session Text (Header)
              </label>
              <input 
                type="text" 
                className="input-field" 
                value={formData.semesterSession} 
                onChange={e => setFormData({ ...formData, semesterSession: e.target.value })} 
                placeholder="ODD SEM NOVEMBER - 2026"
              />
            </div>
          </div>

          {/* QUICK ACTIONS & EXAM SOURCE MAPPING DRAWER */}
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={() => quickFillSM(5)}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "4px 12px", borderRadius: "8px" }}
              >
                Fill All SM with 5
              </button>
              <button
                onClick={processSubjectData}
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "4px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <RefreshCw size={12} /> Recalculate
              </button>
            </div>

            <button
              onClick={() => setShowExamMapping(!showExamMapping)}
              style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: "600" }}
            >
              <Settings size={14} /> {showExamMapping ? "Hide Exam Mapping" : "Customize Exam Sources"} {showExamMapping ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* EXAM MAPPING COLLAPSIBLE */}
          {showExamMapping && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg-main)", borderRadius: "10px", border: "1px solid var(--border-color)", animation: "fadeIn 0.2s ease" }}>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Info size={14} /> Map which uploaded exam in your database corresponds to each official column (Auto-detect matches standard names like Unit Test - I, CIA - I, etc.):
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
                {[
                  { key: "ut1", label: "UT-1 (30)" },
                  { key: "ut2", label: "UT-2 (30)" },
                  { key: "cia1", label: "CIA1 (50)" },
                  { key: "ut3", label: "UT-3 (30)" },
                  { key: "ut4", label: "UT-4 (30)" },
                  { key: "cia2", label: "CIA2 (50)" },
                  { key: "ut5", label: "UT-5 (30)" },
                  { key: "cia3", label: "CIA3 (100)" },
                  { key: "sm", label: "SM (5)" },
                  { key: "mkc", label: "MKC (5)" }
                ].map(col => (
                  <div key={col.key}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", marginBottom: "0.25rem", color: "var(--text-muted)" }}>{col.label}</label>
                    <select
                      className="input-field"
                      style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                      value={examMapping[col.key]}
                      onChange={e => setExamMapping({ ...examMapping, [col.key]: e.target.value })}
                    >
                      <option value="AUTO">Auto Detect</option>
                      {availableExams.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="no-print" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <div style={{ width: "36px", height: "36px", border: "4px solid rgba(99,102,241,0.2)", borderTop: "4px solid var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem auto" }}></div>
          Loading student marks and calculating scale factors...
        </div>
      )}

      {/* PRINT STYLES - PRECISE A4 LANDSCAPE (MATCHES USER'S EXCEL PREVIEW) */}
      <style>{`
        @media screen {
          .print-container {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            align-items: center;
          }
          .print-sheet {
            background: #ffffff;
            color: #000000;
            width: 100%;
            max-width: 1350px;
            padding: 25px 30px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            border-radius: 6px;
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

      {/* RENDER PAGES (EACH 30 STUDENTS CHUNK) */}
      {!loading && (
        <div className="print-container">
          {studentPages.map((pageStudents, pageIndex) => {
            const pageNum = pageIndex + 1;
            const totalPages = studentPages.length;
            const isLastPage = pageNum === totalPages;
            const startSno = pageIndex * 30 + 1;

            return (
              <div key={pageIndex} className="print-sheet">
                <div>
                  {/* PAGE 1 FULL INSTITUTION HEADER (EXACT MATCH TO IMAGE 2) */}
                  {pageNum === 1 ? (
                    <div>
                      {/* Top Right Reference Code */}
                      <div style={{ textAlign: "right", fontSize: "11px", fontWeight: "bold", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>
                        {formData.iqacRef}
                      </div>

                      {/* College Logo + Name Block */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: "10px" }}>
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

                      {/* Sub-Header Metadata Row 1 */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "bold", margin: "10px 0 6px 0", fontFamily: '"Times New Roman", Times, serif' }}>
                        <div style={{ flex: "0 0 160px" }}>Dept: {formData.department}</div>
                        <div style={{ flex: "0 0 200px" }}>Year/Sem/Sec: {formData.year} / {formData.semester} / {formData.section}</div>
                        <div style={{ flex: "1", textAlign: "center", letterSpacing: "0.5px" }}>{formData.semesterSession}</div>
                        <div style={{ flex: "0 0 140px", textAlign: "right" }}>Date: {formData.date}</div>
                      </div>

                      {/* Sub-Header Metadata Row 2 (Course Code / Name) */}
                      <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "8px", fontFamily: '"Times New Roman", Times, serif' }}>
                        Course Code / Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                      </div>
                    </div>
                  ) : (
                    /* PAGE 2+ CONTINUATION HEADER (EXACT MATCH TO IMAGE 1) */
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", fontFamily: '"Times New Roman", Times, serif', paddingBottom: "4px" }}>
                        Course Code / Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                      </div>
                    </div>
                  )}

                  {/* TABLE COMPONENT */}
                  <table className="mec-official-table">
                    <thead>
                      {/* HEADER ROW 1 */}
                      <tr>
                        <th rowSpan={2} style={{ width: "38px" }}>S.No</th>
                        <th rowSpan={2} style={{ width: "105px" }}>Reg.No.</th>
                        <th rowSpan={2} style={{ width: "200px" }}>Name</th>
                        <th style={{ width: "42px" }}>UT-1</th>
                        <th style={{ width: "42px" }}>UT-2</th>
                        <th style={{ width: "42px" }}>CIA1</th>
                        <th style={{ width: "42px" }}>IM</th>
                        <th style={{ width: "42px" }}>UT-3</th>
                        <th style={{ width: "42px" }}>UT-4</th>
                        <th style={{ width: "42px" }}>CIA2</th>
                        <th style={{ width: "42px" }}>IM</th>
                        <th style={{ width: "42px" }}>UT-5</th>
                        <th style={{ width: "45px" }}>CIA3</th>
                        <th style={{ width: "42px" }}>IM</th>
                        <th style={{ width: "38px" }}>SM</th>
                        <th style={{ width: "40px" }}>MKC</th>
                        <th style={{ width: "50px" }}>TOTAL</th>
                      </tr>

                      {/* HEADER ROW 2 (MAX MARKS) */}
                      <tr>
                        <th>30</th>
                        <th>30</th>
                        <th>50</th>
                        <th>10</th>
                        <th>30</th>
                        <th>30</th>
                        <th>50</th>
                        <th>10</th>
                        <th>30</th>
                        <th>100</th>
                        <th>10</th>
                        <th>5</th>
                        <th>5</th>
                        <th>40</th>
                      </tr>
                    </thead>

                    <tbody>
                      {pageStudents.map((st, i) => {
                        const globalIndex = pageIndex * 30 + i;
                        const sNo = startSno + i;

                        return (
                          <tr key={st.regNo || i} style={{ height: "19px" }}>
                            <td>{st.regNo ? sNo : ""}</td>
                            <td>{st.regNo || ""}</td>
                            <td className="name-col" title={st.name}>{st.name || ""}</td>

                            {/* UT-1 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.ut1} 
                                  onChange={e => handleCellEdit(globalIndex, "ut1", e.target.value)} 
                                />
                              ) : (st.ut1 !== undefined && st.ut1 !== "" ? st.ut1 : "")}
                            </td>

                            {/* UT-2 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.ut2} 
                                  onChange={e => handleCellEdit(globalIndex, "ut2", e.target.value)} 
                                />
                              ) : (st.ut2 !== undefined && st.ut2 !== "" ? st.ut2 : "")}
                            </td>

                            {/* CIA1 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.cia1} 
                                  onChange={e => handleCellEdit(globalIndex, "cia1", e.target.value)} 
                                />
                              ) : (st.cia1 !== undefined && st.cia1 !== "" ? st.cia1 : "")}
                            </td>

                            {/* IM1 (Calculated) */}
                            <td style={{ fontWeight: "600" }}>{st.regNo ? st.im1 : ""}</td>

                            {/* UT-3 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.ut3} 
                                  onChange={e => handleCellEdit(globalIndex, "ut3", e.target.value)} 
                                />
                              ) : (st.ut3 !== undefined && st.ut3 !== "" ? st.ut3 : "")}
                            </td>

                            {/* UT-4 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.ut4} 
                                  onChange={e => handleCellEdit(globalIndex, "ut4", e.target.value)} 
                                />
                              ) : (st.ut4 !== undefined && st.ut4 !== "" ? st.ut4 : "")}
                            </td>

                            {/* CIA2 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.cia2} 
                                  onChange={e => handleCellEdit(globalIndex, "cia2", e.target.value)} 
                                />
                              ) : (st.cia2 !== undefined && st.cia2 !== "" ? st.cia2 : "")}
                            </td>

                            {/* IM2 (Calculated) */}
                            <td style={{ fontWeight: "600" }}>{st.regNo ? st.im2 : ""}</td>

                            {/* UT-5 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.ut5} 
                                  onChange={e => handleCellEdit(globalIndex, "ut5", e.target.value)} 
                                />
                              ) : (st.ut5 !== undefined && st.ut5 !== "" ? st.ut5 : "")}
                            </td>

                            {/* CIA3 */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.cia3} 
                                  onChange={e => handleCellEdit(globalIndex, "cia3", e.target.value)} 
                                />
                              ) : (st.cia3 !== undefined && st.cia3 !== "" ? st.cia3 : "")}
                            </td>

                            {/* IM3 (Calculated) */}
                            <td style={{ fontWeight: "600" }}>{st.regNo ? st.im3 : ""}</td>

                            {/* SM (Seminar / Skill) */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.sm} 
                                  onChange={e => handleCellEdit(globalIndex, "sm", e.target.value)} 
                                />
                              ) : (st.sm !== undefined && st.sm !== "" ? st.sm : "")}
                            </td>

                            {/* MKC (Model Exam) */}
                            <td>
                              {isEditingMarks && st.regNo ? (
                                <input 
                                  className="editable-cell-input" 
                                  value={st.mkc} 
                                  onChange={e => handleCellEdit(globalIndex, "mkc", e.target.value)} 
                                />
                              ) : (st.mkc !== undefined && st.mkc !== "" ? st.mkc : "")}
                            </td>

                            {/* TOTAL (Calculated) */}
                            <td style={{ fontWeight: "bold" }}>{st.regNo ? st.total : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM SIGNATURE BLOCK (APPEARS ON FINAL PAGE AS IN IMAGE 1) */}
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
        <div className="no-print" style={{ textAlign: "center", padding: "3rem", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px dashed var(--border-color)", marginTop: "1rem" }}>
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
