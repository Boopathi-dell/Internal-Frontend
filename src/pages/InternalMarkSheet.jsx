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
  AlertCircle,
  Eye,
  EyeOff
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
    pageSplitMode: "2pages", // "2pages" (default: Strict 2 Pages MEC format), "1page", "30", "25"
    padTo60: true, // Pad blank rows to 60 to match official MEC 2-page print grid (Image 1 & 2)
    tableWidthMode: "full", // "full" (100% Stretch - standard MEC landscape), "autoFit"
    nameColWidth: "auto" // "auto" (default: Auto-Fit to student names), "160px", "200px", "240px"
  });

  const [headerImage, setHeaderImage] = useState(() => localStorage.getItem("internalMarkHeaderImage") || "");
  const [studentsData, setStudentsData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rosters, setRosters] = useState([]);
  const [allFetchedClasses, setAllFetchedClasses] = useState([]);
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [userHiddenColumns, setUserHiddenColumns] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Sync hidden columns when active template changes
  useEffect(() => {
    if (activeTemplate && activeTemplate.columns) {
      const templateHidden = activeTemplate.columns.filter(c => c.isHidden).map(c => c.heading);
      setUserHiddenColumns(templateHidden);
    } else {
      setUserHiddenColumns([]);
    }
  }, [activeTemplate]);

  const toggleColumnVisibility = (heading) => {
    setUserHiddenColumns(prev => {
      if (prev.includes(heading)) {
        return prev.filter(h => h !== heading);
      } else {
        return [...prev, heading];
      }
    });
  };

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

  // Normalize exam name specifically so CIA 1, CIA 2, CIA 3 and UT 1..5 never cross-collide
  const normalizeExam = (name) => {
    if (!name) return "";
    let s = String(name).toLowerCase().replace(/[\s\-_]/g, "");
    s = s.replace(/unittest/g, "ut");
    s = s.replace(/modelexam(ination)?/g, "cia3");
    s = s.replace(/cia-?iii/g, "cia3").replace(/cia-?3/g, "cia3");
    s = s.replace(/cia-?ii/g, "cia2").replace(/cia-?2/g, "cia2");
    s = s.replace(/cia-?i/g, "cia1").replace(/cia-?1/g, "cia1");
    s = s.replace(/ut-?v/g, "ut5").replace(/ut-?5/g, "ut5");
    s = s.replace(/ut-?iv/g, "ut4").replace(/ut-?4/g, "ut4");
    s = s.replace(/ut-?iii/g, "ut3").replace(/ut-?3/g, "ut3");
    s = s.replace(/ut-?ii/g, "ut2").replace(/ut-?2/g, "ut2");
    s = s.replace(/ut-?i/g, "ut1").replace(/ut-?1/g, "ut1");
    s = s.replace(/seminar/g, "sm");
    return s;
  };

  const isExamMatch = (targetExam, classExam) => {
    if (!targetExam || !classExam) return false;
    const n1 = normalizeExam(targetExam);
    const n2 = normalizeExam(classExam);
    if (n1 === n2) return true;
    if (n1 === "cia3" && (n2.includes("model") || n2 === "cia3")) return true;
    if (n2 === "cia3" && (n1.includes("model") || n1 === "cia3")) return true;
    return false;
  };

  // Flexible exam mark finder
  const findExamMarkForStudent = (student, examName, targetSubj, allClassesForSection) => {
    if (!examName) return "";
    const cleanTarget = normStr(targetSubj);

    for (const cls of allClassesForSection) {
      if (isExamMatch(examName, cls.examName)) {
        let subjIdx = -1;
        if (cls.subjects && Array.isArray(cls.subjects)) {
          subjIdx = cls.subjects.findIndex(s => {
            const c = normStr(s);
            return c === cleanTarget || c.includes(cleanTarget) || cleanTarget.includes(c);
          });
        }
        if (subjIdx === -1 && cls.courseDetails && Array.isArray(cls.courseDetails)) {
          subjIdx = cls.courseDetails.findIndex(cd => {
            const cCode = normStr(cd.courseCode);
            const cName = normStr(cd.courseName);
            return cCode === cleanTarget || cleanTarget.includes(cCode) || cCode.includes(cleanTarget) ||
                   cName === cleanTarget || cleanTarget.includes(cName) || cName.includes(cleanTarget);
          });
        }

        if (subjIdx !== -1 && cls.students) {
          const stObj = cls.students.find(s => s.regNo === student.regNo);
          if (stObj && stObj.marks && stObj.marks.length > subjIdx) {
            const val = stObj.marks[subjIdx];
            if (val !== "" && val !== undefined && val !== null) {
              return val;
            }
          }
        }
      }
    }
    return "";
  };

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

  // Default official MEC 17-column layout (Images 1 & 2)
  const defaultMecColumns = [
    { colKey: "ut1", heading: "UT-1 (30)", title: "UT-1", maxMark: "30", type: "exam", examName: "Unit Test - I" },
    { colKey: "ut2", heading: "UT-2 (30)", title: "UT-2", maxMark: "30", type: "exam", examName: "Unit Test - II" },
    { colKey: "cia1", heading: "CIA1 (50)", title: "CIA1", maxMark: "50", type: "exam", examName: "CIA - I" },
    { colKey: "im1", heading: "IM (10)", title: "IM", maxMark: "10", type: "formula", formulaType: "im1" },
    { colKey: "ut3", heading: "UT-3 (30)", title: "UT-3", maxMark: "30", type: "exam", examName: "Unit Test - III" },
    { colKey: "ut4", heading: "UT-4 (30)", title: "UT-4", maxMark: "30", type: "exam", examName: "Unit Test - IV" },
    { colKey: "cia2", heading: "CIA2 (50)", title: "CIA2", maxMark: "50", type: "exam", examName: "CIA - II" },
    { colKey: "im2", heading: "IM (10)", title: "IM", maxMark: "10", type: "formula", formulaType: "im2" },
    { colKey: "ut5", heading: "UT-5 (30)", title: "UT-5", maxMark: "30", type: "exam", examName: "Unit Test - V" },
    { colKey: "cia3", heading: "CIA3 (100)", title: "CIA3", maxMark: "100", type: "exam", examName: "Model Exam" },
    { colKey: "im3", heading: "IM (10)", title: "IM", maxMark: "10", type: "formula", formulaType: "im3" },
    { colKey: "sm", heading: "SM (5)", title: "SM", maxMark: "5", type: "exam", examName: "Seminar" },
    { colKey: "mkc", heading: "MKC (5)", title: "MKC", maxMark: "5", type: "exam", examName: "MKC" },
    { colKey: "total", heading: "TOTAL (40)", title: "TOTAL", maxMark: "40", type: "formula", formulaType: "total" }
  ];

  // Helper to get active columns with unique keys
  const getColumnsWithKeys = (cols) => {
    let imIndex = 0;
    return cols.map((c, i) => {
      let key = c.colKey || c.key;
      const headingLower = (c.heading || "").toLowerCase();
      if (!key) {
        if (headingLower.includes("ut-1") || headingLower.includes("ut 1") || headingLower.includes("ut1")) key = "ut1";
        else if (headingLower.includes("ut-2") || headingLower.includes("ut 2") || headingLower.includes("ut2")) key = "ut2";
        else if (headingLower.includes("ut-3") || headingLower.includes("ut 3") || headingLower.includes("ut3")) key = "ut3";
        else if (headingLower.includes("ut-4") || headingLower.includes("ut 4") || headingLower.includes("ut4")) key = "ut4";
        else if (headingLower.includes("ut-5") || headingLower.includes("ut 5") || headingLower.includes("ut5")) key = "ut5";
        else if (headingLower.includes("cia1") || headingLower.includes("cia 1") || headingLower.includes("cia-1") || headingLower.includes("cia-i")) key = "cia1";
        else if (headingLower.includes("cia2") || headingLower.includes("cia 2") || headingLower.includes("cia-2") || headingLower.includes("cia-ii")) key = "cia2";
        else if (headingLower.includes("cia3") || headingLower.includes("cia 3") || headingLower.includes("cia-3") || headingLower.includes("cia-iii") || headingLower.includes("model")) key = "cia3";
        else if (headingLower.startsWith("im") || headingLower.includes("internal")) {
          imIndex += 1;
          key = `im${imIndex}`;
        } else if (headingLower.includes("total")) {
          key = "total";
        } else if (headingLower.includes("sm") || headingLower.includes("seminar")) {
          key = "sm";
        } else if (headingLower.includes("mkc")) {
          key = "mkc";
        } else {
          key = `col_${i}`;
        }
      }
      const parsed = parseHeading(c.heading || "");
      return {
        ...c,
        colKey: key,
        title: c.title || parsed.title,
        maxMark: c.maxMark || parsed.maxMark
      };
    });
  };

  // Helper to evaluate row formulas (im1, im2, im3, total)
  const evaluateRowFormulas = (row, cols) => {
    // 1. Calculate IM1: ((UT1 + UT2 + CIA1) / 110) * 10
    const ut1 = parseNum(row.ut1 ?? row["UT-1 (30)"]);
    const ut2 = parseNum(row.ut2 ?? row["UT-2 (30)"]);
    const cia1 = parseNum(row.cia1 ?? row["CIA1 (50)"]);
    const im1 = Math.round(((ut1 + ut2 + cia1) / 110) * 10);
    row.im1 = im1;

    // 2. Calculate IM2: ((UT3 + UT4 + CIA2) / 110) * 10
    const ut3 = parseNum(row.ut3 ?? row["UT-3 (30)"]);
    const ut4 = parseNum(row.ut4 ?? row["UT-4 (30)"]);
    const cia2 = parseNum(row.cia2 ?? row["CIA2 (50)"]);
    const im2 = Math.round(((ut3 + ut4 + cia2) / 110) * 10);
    row.im2 = im2;

    // 3. Calculate IM3: ((UT5 + CIA3) / 130) * 10
    const ut5 = parseNum(row.ut5 ?? row["UT-5 (30)"]);
    const cia3 = parseNum(row.cia3 ?? row["CIA3 (100)"]);
    const im3 = Math.round(((ut5 + cia3) / 130) * 10);
    row.im3 = im3;

    // 4. Calculate TOTAL: IM1 + IM2 + IM3 + SM + MKC (max 40)
    const sm = parseNum(row.sm ?? row["SM (5)"]);
    const mkc = parseNum(row.mkc ?? row["MKC (5)"]);
    const total = Math.min(40, Math.round(im1 + im2 + im3 + sm + mkc));
    row.total = total;

    // For any custom template columns
    cols.forEach(col => {
      if (col.type === "formula" || col.type === "calculation") {
        if (!["im1", "im2", "im3", "total"].includes(col.colKey) && col.formula) {
          try {
            let f = col.formula;
            cols.forEach(inner => {
              const val = parseNum(row[inner.colKey] ?? row[inner.heading]);
              f = f.split(`#[${inner.heading}]`).join(val);
              f = f.split(`#[${inner.colKey}]`).join(val);
            });
            const res = new Function(`return ${f}`)();
            row[col.colKey] = isNaN(res) ? 0 : Math.round(res);
          } catch (e) {
            row[col.colKey] = 0;
          }
        }
        if (col.heading) {
          row[col.heading] = row[col.colKey];
        }
      }
    });

    return row;
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

      const rawCols = (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0)
        ? activeTemplate.columns
        : defaultMecColumns;
      const columnsToUse = getColumnsWithKeys(rawCols);

      // 3. Calculate marks for every student against columnsToUse
      const evaluatedStudents = Object.values(studentMap).map(student => {
        const row = { ...student };

        columnsToUse.forEach(col => {
          if (col.type === "exam") {
            const mark = findExamMarkForStudent(student, col.examName, targetSubject, allClassesForSection);
            row[col.colKey] = mark;
            row[col.heading] = mark;
          }
        });

        // Evaluate formulas with unique keys
        evaluateRowFormulas(row, columnsToUse);

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
  const handleCellEdit = (studentIndex, colKeyOrHeading, value) => {
    setStudentsData(prev => {
      if (!prev[studentIndex]) return prev;
      const updated = [...prev];
      const row = { ...updated[studentIndex], [colKeyOrHeading]: value };

      const rawCols = (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0)
        ? activeTemplate.columns
        : defaultMecColumns;
      const columnsToUse = getColumnsWithKeys(rawCols);

      evaluateRowFormulas(row, columnsToUse);

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

  // Columns definition helper (with unique colKeys)
  const currentColumns = useMemo(() => {
    const rawCols = (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0)
      ? activeTemplate.columns
      : defaultMecColumns;
    return getColumnsWithKeys(rawCols);
  }, [activeTemplate]);

  // Visible Columns (Filters out hidden columns while calculations still run for all columns in background)
  const visibleColumns = useMemo(() => {
    return currentColumns.filter(c => !userHiddenColumns.includes(c.heading) && !userHiddenColumns.includes(c.colKey));
  }, [currentColumns, userHiddenColumns]);

  // Check if visible columns have subheaders (like "(50)")
  const hasSubHeaders = useMemo(() => {
    return visibleColumns.some(c => c.maxMark || (c.heading && c.heading.includes("(") && c.heading.includes(")")));
  }, [visibleColumns]);

  // Multi-page chunking: Strict 2 Pages (MEC Official Format: Page 1 = 28, Page 2 = 32 / remaining)
  const studentPages = useMemo(() => {
    let baseList = [...studentsData];

    // If padTo60 is true (MEC official 2-page print grid as shown in user's Excel images)
    if (formData.padTo60) {
      const targetCount = Math.max(60, baseList.length);
      const rawCols = currentColumns;
      while (baseList.length < targetCount) {
        const dummySno = baseList.length + 1;
        const placeholderRow = {
          isPlaceholder: true,
          sNo: dummySno,
          regNo: "",
          name: "",
          ut1: "", ut2: "", cia1: "", im1: 0,
          ut3: "", ut4: "", cia2: "", im2: 0,
          ut5: "", cia3: "", im3: 0,
          sm: "", mkc: "", total: 0
        };
        rawCols.forEach(c => {
          if (["im1", "im2", "im3", "total"].includes(c.colKey)) {
            placeholderRow[c.colKey] = 0;
            placeholderRow[c.heading] = 0;
          } else {
            placeholderRow[c.colKey] = "";
            placeholderRow[c.heading] = "";
          }
        });
        baseList.push(placeholderRow);
      }
    }

    if (baseList.length === 0) {
      return [[]];
    }

    const mode = formData.pageSplitMode || "2pages";

    // Strict 2 Pages (MEC Official Format): Page 1 has exactly 28 rows, Page 2 has rows 29 to 60 (or end)
    if (mode === "2pages") {
      if (baseList.length <= 28 && !formData.padTo60) {
        return [baseList];
      }
      return [
        baseList.slice(0, 28),
        baseList.slice(28)
      ];
    }

    // Single continuous sheet (All students on 1 page)
    if (mode === "1page") {
      return [baseList];
    }

    // Fixed rows per page (e.g. 25, 30, 35)
    const chunkSize = parseInt(mode) || 28;
    const pages = [];
    for (let i = 0; i < baseList.length; i += chunkSize) {
      pages.push(baseList.slice(i, i + chunkSize));
    }
    return pages;
  }, [studentsData, formData.pageSplitMode, formData.padTo60, currentColumns]);

  const handlePrint = () => {
    window.print();
  };

  // Export to Excel (.xlsx) matching exact template columns (Images 1 & 2)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [];

    // Header info rows matching Image 1 & 2
    // Row 1: IQAC Reference Code on the top right
    const refRow = new Array(17).fill("");
    refRow[16] = formData.iqacRef;
    rows.push(refRow);

    // Row 2: College Name
    const collegeRow = new Array(17).fill("");
    collegeRow[3] = "MUTHAYAMMAL ENGINEERING COLLEGE (AUTONOMOUS)";
    rows.push(collegeRow);

    // Row 3: Address
    const addressRow = new Array(17).fill("");
    addressRow[3] = "Rasipuram – 637 408, Namakkal (Dt.), Tamil Nadu, India.";
    rows.push(addressRow);
    rows.push([]);

    // Row 4: Metadata Line 1
    const meta1Row = new Array(17).fill("");
    meta1Row[0] = `Dept: ${formData.department}`;
    meta1Row[2] = `Year/Sem/Sec: ${formData.year}/${formData.semester}/${formData.section}`;
    meta1Row[6] = formData.semesterSession;
    meta1Row[14] = `Date: ${formData.date}`;
    rows.push(meta1Row);

    // Row 5: Metadata Line 2
    const meta2Row = new Array(17).fill("");
    meta2Row[0] = `Course Code/ Name : ${getDisplaySubject()}`;
    rows.push(meta2Row);
    rows.push([]);

    // Table Header Row 1
    const row1 = ["S.No", "Reg.No.", "Name"];
    // Table Header Row 2 (Max Marks)
    const row2 = ["", "", ""];

    visibleColumns.forEach(c => {
      row1.push(c.title);
      row2.push(c.maxMark);
    });

    rows.push(row1);
    if (hasSubHeaders) rows.push(row2);

    // Student Data Rows
    const listToExport = formData.padTo60 ? studentPages.flat() : studentsData;
    listToExport.forEach((st, idx) => {
      const sNo = st.sNo || idx + 1;
      const stRow = [
        sNo,
        st.regNo || "",
        st.name || ""
      ];
      visibleColumns.forEach(c => {
        const isFormula = c.type === "formula" || c.type === "calculation" || ["im1", "im2", "im3", "total"].includes(c.colKey);
        const val = st[c.colKey] !== undefined ? st[c.colKey] : st[c.heading];
        if (isFormula) {
          stRow.push(val !== undefined && val !== null && val !== "" ? val : 0);
        } else {
          stRow.push(val !== undefined && val !== null ? val : "");
        }
      });
      rows.push(stRow);
    });

    // Signature Block (matching Image 1)
    rows.push([]);
    rows.push([]);
    const sigRow = new Array(17).fill("");
    sigRow[1] = "Course Faculty";
    sigRow[7] = "Year Co-ordinator";
    sigRow[15] = "HoD";
    rows.push(sigRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Internal Marks");
    const filename = `Internal_Mark_Sheet_${formData.department}_${formData.year}_Sem${formData.semester}_Sec${formData.section}.xlsx`;
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
              onClick={() => setFormData(prev => ({ ...prev, padTo60: !prev.padTo60 }))}
              className={`btn ${formData.padTo60 ? "btn-primary" : "btn-secondary"}`}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", padding: "0.65rem 1.2rem", borderRadius: "10px" }}
              title="Toggle 60-row official MEC grid padding"
            >
              <Check size={18} /> {formData.padTo60 ? "Official 60-Row Grid (Active)" : "Enrolled Students Only"}
            </button>

            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className={`btn ${userHiddenColumns.length > 0 ? "btn-warning" : "btn-secondary"}`}
              style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", padding: "0.65rem 1.2rem", borderRadius: "10px" }}
              title="Hide or show specific columns on report"
            >
              {userHiddenColumns.length > 0 ? <EyeOff size={18} /> : <Eye size={18} />}
              Columns Visibility {userHiddenColumns.length > 0 ? `(${userHiddenColumns.length} Hidden)` : ""}
            </button>

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

        {/* COLUMN VISIBILITY DRAWER */}
        {showColumnManager && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "16px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.1)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: "800", color: "#1e293b", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Eye size={16} color="var(--primary)" /> Manage Columns to Show / Hide on Mark Sheet
                </h4>
                <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Click to hide raw marks (like MKC or SEM). Hidden columns are omitted from printout & sheet, but formulas calculate them in the backend!
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => setUserHiddenColumns([])}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "6px" }}
                >
                  Show All Columns
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {currentColumns.map(col => {
                const isHidden = userHiddenColumns.includes(col.heading);
                return (
                  <button
                    key={col.heading}
                    onClick={() => toggleColumnVisibility(col.heading)}
                    type="button"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                      background: isHidden ? "rgba(239, 68, 68, 0.1)" : "rgba(99, 102, 241, 0.1)",
                      color: isHidden ? "#ef4444" : "var(--primary)",
                      border: isHidden ? "1px dashed rgba(239, 68, 68, 0.5)" : "1px solid rgba(99, 102, 241, 0.3)"
                    }}
                  >
                    {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{col.heading}</span>
                    {isHidden && <span style={{ fontSize: "0.7rem", opacity: 0.85 }}>(Hidden)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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

          {/* Advanced Print & Layout Settings Toggle */}
          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed rgba(226, 232, 240, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem", color: "#64748b", flexWrap: "wrap" }}>
              <span>Loaded Students: <strong style={{ color: "var(--primary)" }}>{studentsData.length}</strong></span>
              <span>•</span>
              <span>Print Pages: <strong style={{ color: "#16a34a" }}>{formData.pageSplitMode === "2pages" ? "Strict 2 Pages (Balanced)" : `${formData.pageSplitMode} Mode`}</strong></span>
              <span>•</span>
              <span>Table Layout: <strong style={{ color: "#6366f1" }}>{formData.tableWidthMode === "autoFit" ? "Auto-Fit Content (Snug)" : "Full Width (100%)"}</strong></span>
              <span>•</span>
              <span>Name Col: <strong style={{ color: "#0f172a" }}>{formData.nameColWidth === "auto" ? "Auto-Fit" : formData.nameColWidth}</strong></span>
            </div>

            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}
            >
              <Sliders size={14} /> {showAdvancedSettings ? "Hide Page & Layout Settings" : "Page & Layout Settings"} {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Advanced Settings Drawer */}
          {showAdvancedSettings && (
            <div style={{ marginTop: "1rem", padding: "1.25rem", background: "rgba(241, 245, 249, 0.7)", borderRadius: "14px", border: "1px solid rgba(203, 213, 225, 0.6)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
                {/* Print Page Layout */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Print Page Layout (Max 2 Pages)
                  </label>
                  <select 
                    className="input-field" 
                    value={formData.pageSplitMode} 
                    onChange={e => setFormData({ ...formData, pageSplitMode: e.target.value })}
                    style={{ background: "#ffffff", padding: "6px 10px", fontWeight: "600", borderColor: "#6366f1" }}
                  >
                    <option value="2pages">Strict 2 Pages (Balanced - Recommended)</option>
                    <option value="1page">Single Page (All Students on 1 Sheet)</option>
                    <option value="30">Fixed 30 Students per Page</option>
                    <option value="25">Fixed 25 Students per Page</option>
                  </select>
                </div>

                {/* Table Width Auto-Fit Mode */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Table Width Auto-Fit
                  </label>
                  <select 
                    className="input-field" 
                    value={formData.tableWidthMode} 
                    onChange={e => setFormData({ ...formData, tableWidthMode: e.target.value })}
                    style={{ background: "#ffffff", padding: "6px 10px", fontWeight: "600", borderColor: "#6366f1" }}
                  >
                    <option value="autoFit">Auto-Fit Content Width (Snug & Compact)</option>
                    <option value="full">Full Width (100% Stretch across page)</option>
                  </select>
                </div>

                {/* Student Name Column Width */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", marginBottom: "0.3rem", color: "#475569" }}>
                    Name Column Width Auto-Fix
                  </label>
                  <select 
                    className="input-field" 
                    value={formData.nameColWidth} 
                    onChange={e => setFormData({ ...formData, nameColWidth: e.target.value })}
                    style={{ background: "#ffffff", padding: "6px 10px" }}
                  >
                    <option value="auto">Auto-Fit (Fit to Longest Name)</option>
                    <option value="160px">Compact (160px)</option>
                    <option value="200px">Standard (200px)</option>
                    <option value="240px">Wide (240px)</option>
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
      {/* PRINT STYLES - ROBUST MULTI-PAGE LAYOUT WITHOUT EMPTY PAGES */}
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
            max-width: 1350px;
            border: 1.5px solid #000000;
            padding: 20px 24px;
            box-shadow: 0 10px 35px rgba(0,0,0,0.15);
            border-radius: 4px;
            font-family: "Times New Roman", Times, serif;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
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
            margin: 4mm 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
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
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 198mm !important;
            max-height: 200mm !important;
            border: 1.5px solid #000000 !important;
            border-radius: 0 !important;
            padding: 5mm 8mm 4mm 8mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
          .print-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print {
            display: none !important;
          }
          .editable-cell-input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .print-sheet img.header-banner-img {
            max-height: 48px !important;
          }
          .print-sheet img.mec-crest-logo {
            height: 44px !important;
          }
          .print-bottom-block {
            margin-top: 4px !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-metadata-row {
            margin: 3px 0 2px 0 !important;
            font-size: 11px !important;
          }
          .print-signatures {
            margin-bottom: 2px !important;
            font-size: 10px !important;
          }
          .mec-official-table tr {
            height: 16px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .mec-official-table th, .mec-official-table td {
            border: 1px solid #000000 !important;
            padding: 0 2px !important;
            font-size: 9.5px !important;
            line-height: 1.15 !important;
          }
          .mec-official-table th {
            font-size: 10px !important;
          }
          .mec-official-table th.col-sno, .mec-official-table td.col-sno {
            width: 30px !important;
          }
          .mec-official-table th.col-reg, .mec-official-table td.col-reg {
            width: 85px !important;
          }
          .mec-official-table th.col-name, .mec-official-table td.col-name {
            width: 170px !important;
            max-width: 190px !important;
            padding-left: 4px !important;
          }
          .mec-official-table th.col-mark, .mec-official-table td.col-mark {
            width: auto !important;
          }
          .table-responsive-wrapper {
            overflow: visible !important;
          }
        }

        .mec-official-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          font-size: 11px;
          color: #000000;
          table-layout: fixed;
        }
        .mec-official-table.auto-fit-table {
          width: 100% !important;
        }
        .mec-official-table.full-width-table {
          width: 100% !important;
        }
        .mec-official-table th, .mec-official-table td {
          border: 1px solid #000000;
          vertical-align: middle;
        }
        .mec-official-table th {
          font-weight: bold;
          background: #ffffff;
          font-family: "Times New Roman", Times, serif;
          font-size: 11px;
          text-align: center;
        }
        .mec-official-table th.col-sno, .mec-official-table td.col-sno {
          width: 34px;
          text-align: center;
          padding: 2px 2px;
        }
        .mec-official-table th.col-reg, .mec-official-table td.col-reg {
          width: 95px;
          text-align: center;
          padding: 2px 4px;
        }
        .mec-official-table th.col-name, .mec-official-table td.col-name {
          width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
          padding: 2px 6px;
        }
        .mec-official-table th.col-mark, .mec-official-table td.col-mark {
          text-align: center;
          padding: 2px 2px;
        }
      `}</style>

      {/* RENDER PAGES (PAGE 1 HAS FULL HEADER, PAGE 2 HAS ONLY COURSE CODE/NAME & SIGNATURES) */}
      {!loading && (
        <div className="print-container">
          {studentPages.map((pageStudents, pageIndex) => {
            const pageNum = pageIndex + 1;
            const totalPages = studentPages.length;
            const isLastPage = pageNum === totalPages;
            const startSno = studentPages.slice(0, pageIndex).reduce((sum, p) => sum + p.length, 0) + 1;

            return (
              <div key={pageIndex} className="print-sheet">
                <div>
                  {/* TOP HEADER: PAGE 1 HAS FULL BANNER, PAGE 2 HAS ONLY COURSE CODE/NAME (Image 1 & 2) */}
                  {pageIndex === 0 ? (
                    <div>
                      {/* Top Right Reference Code */}
                      <div style={{ textAlign: "right", fontSize: "10.5px", fontWeight: "bold", fontFamily: "Arial, sans-serif", marginBottom: "3px" }}>
                        {formData.iqacRef}
                      </div>

                      {/* Header Banner / Logo */}
                      {headerImage ? (
                        <div style={{ textAlign: "center", marginBottom: "4px" }}>
                          <img 
                            src={headerImage} 
                            alt="College Header Banner" 
                            className="header-banner-img"
                            style={{ maxHeight: "60px", width: "100%", objectFit: "contain" }} 
                          />
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", marginBottom: "4px" }}>
                          <div style={{ position: "absolute", left: "0", top: "0" }}>
                            <img 
                              src="/logo1.png" 
                              alt="MEC Logo" 
                              className="mec-crest-logo"
                              style={{ height: "46px", width: "auto", objectFit: "contain" }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <h2 style={{ fontSize: "17px", fontWeight: "bold", margin: "0", letterSpacing: "0.5px", fontFamily: '"Times New Roman", Times, serif', textTransform: "uppercase" }}>
                              MUTHAYAMMAL ENGINEERING COLLEGE
                            </h2>
                            <div style={{ fontSize: "12px", fontWeight: "bold", margin: "1px 0" }}>
                              (Autonomous)
                            </div>
                            <div style={{ fontSize: "10px", margin: 0 }}>
                              Rasipuram – 637 408, Namakkal (Dt.), Tamil Nadu, India.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata Row 1 */}
                      <div className="print-metadata-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", fontWeight: "bold", margin: "4px 0 2px 0", fontFamily: '"Times New Roman", Times, serif' }}>
                        <div style={{ flex: "0 0 140px" }}>Dept: {formData.department}</div>
                        <div style={{ flex: "0 0 190px" }}>Year/Sem/Sec: {formData.year} / {formData.semester} / {formData.section}</div>
                        <div style={{ flex: "1", textAlign: "center", letterSpacing: "0.5px" }}>{formData.semesterSession}</div>
                        <div style={{ flex: "0 0 130px", textAlign: "right" }}>Date: {formData.date}</div>
                      </div>

                      {/* Metadata Row 2 */}
                      <div style={{ fontSize: "11px", fontWeight: "bold", margin: "2px 0 4px 0", fontFamily: '"Times New Roman", Times, serif', textAlign: "left" }}>
                        Course Code/ Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                      </div>
                    </div>
                  ) : (
                    /* PAGE 2 HEADER: ONLY COURSE CODE/NAME (Image 1) */
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "bold", margin: "0 0 4px 0", fontFamily: '"Times New Roman", Times, serif', textAlign: "left" }}>
                        Course Code/ Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                      </div>
                    </div>
                  )}

                  {/* TABLE WRAPPER */}
                  <div className="table-responsive-wrapper" style={{ width: "100%", overflowX: "auto" }}>
                    <table className="mec-official-table">
                      <thead>
                        {/* HEADER ROW 1 */}
                        <tr>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="col-sno">S.No</th>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="col-reg">Reg.No.</th>
                          <th 
                            rowSpan={hasSubHeaders ? 2 : 1} 
                            className="col-name"
                            style={{
                              width: formData.nameColWidth === "auto" ? "180px" : formData.nameColWidth,
                              maxWidth: formData.nameColWidth === "auto" ? "220px" : formData.nameColWidth
                            }}
                          >
                            Name
                          </th>
                          {visibleColumns.map((col, idx) => (
                            <th key={idx} className="col-mark">
                              {col.title}
                            </th>
                          ))}
                        </tr>

                        {/* HEADER ROW 2 (MAX MARKS ROW) */}
                        {hasSubHeaders && (
                          <tr>
                            {visibleColumns.map((col, idx) => (
                              <th key={idx} className="col-mark">
                                {col.maxMark}
                              </th>
                            ))}
                          </tr>
                        )}
                      </thead>

                      <tbody>
                        {pageStudents.map((st, i) => {
                          const sNo = st.sNo || (startSno + i);
                          const globalIndex = startSno - 1 + i;

                          return (
                            <tr key={st.regNo || i} style={{ height: "18px" }}>
                              <td className="col-sno">{sNo}</td>
                              <td className="col-reg">{st.regNo || ""}</td>
                              <td 
                                className="col-name name-col" 
                                title={st.name}
                                style={{
                                  width: formData.nameColWidth === "auto" ? "180px" : formData.nameColWidth,
                                  maxWidth: formData.nameColWidth === "auto" ? "220px" : formData.nameColWidth
                                }}
                              >
                                {st.name || ""}
                              </td>

                              {visibleColumns.map((col, colIdx) => {
                                const isFormula = col.type === "formula" || col.type === "calculation" || ["im1", "im2", "im3", "total"].includes(col.colKey);
                                const rawVal = st[col.colKey] !== undefined ? st[col.colKey] : st[col.heading];

                                let displayVal = "";
                                if (isFormula) {
                                  displayVal = (rawVal !== undefined && rawVal !== null && rawVal !== "") ? rawVal : 0;
                                } else {
                                  displayVal = (rawVal !== undefined && rawVal !== null) ? rawVal : "";
                                }

                                return (
                                  <td 
                                    key={colIdx} 
                                    className="col-mark"
                                    style={{ fontWeight: isFormula ? "bold" : "normal" }}
                                  >
                                    {isEditingMarks && !isFormula && !st.isPlaceholder ? (
                                      <input 
                                        className="editable-cell-input" 
                                        value={displayVal} 
                                        onChange={e => handleCellEdit(globalIndex, col.colKey, e.target.value)} 
                                      />
                                    ) : (
                                      displayVal
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
                </div>

                {/* BOTTOM BLOCK: SIGNATURES ONLY ON LAST PAGE, FOOTER ON ALL */}
                <div className="print-bottom-block">
                  {isLastPage ? (
                    <div className="print-signatures" style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-end", 
                      padding: "16px 20px 4px 20px", 
                      fontWeight: "bold", 
                      fontSize: "11px", 
                      fontFamily: '"Times New Roman", Times, serif' 
                    }}>
                      <div style={{ textAlign: "center", minWidth: "120px" }}>
                        <div>Course Faculty</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "140px" }}>
                        <div>Year Co-ordinator</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "100px" }}>
                        <div>HoD</div>
                      </div>
                    </div>
                  ) : null}

                  {/* Centered Page Footer */}
                  <div style={{ textAlign: "center", fontSize: "10.5px", fontFamily: '"Times New Roman", Times, serif', marginTop: isLastPage ? "2px" : "8px" }}>
                    Page {pageNum} of {totalPages}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && studentsData.length === 0 && !formData.padTo60 && (
        <div className="no-print" style={{ textAlign: "center", padding: "3rem", background: "var(--bg-secondary)", borderRadius: "16px", border: "1px dashed var(--border-color)", marginTop: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>
            No students found for {formData.department} {formData.year}/{formData.semester}/{formData.section}.
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Ensure either a Student Roster or Exam marks have been uploaded in the system for this class, or turn on "Pad to 60 Rows".
          </p>
        </div>
      )}
    </div>
  );
}
