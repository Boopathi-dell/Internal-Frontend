import React, { useState, useEffect, useMemo, useRef } from "react";
import API from "../api";
import * as XLSX from "xlsx";
import { 
  Printer, 
  FileSpreadsheet, 
  Download, 
  Settings, 
  RefreshCw, 
  Edit3, 
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
  EyeOff,
  Save
} from "lucide-react";

export default function InternalMarkSheet() {
  const [availableRegulations, setAvailableRegulations] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Theory");
  const allTemplatesRef = useRef([]);
  const selectedCategoryRef = useRef("Theory");

  const getTemplateCategory = (t) => {
    if (!t) return "Theory";
    if (t.courseCategory === "Lab" || t.courseCategory === "Theory") return t.courseCategory;
    return /\blab\b|laboratory|practical/i.test(t.templateName || "") ? "Lab" : "Theory";
  };

  const getTemplateOrientation = (t) => {
    if (!t) return "landscape";
    if (t.printOrientation === "portrait" || t.printOrientation === "landscape") return t.printOrientation;
    return getTemplateCategory(t) === "Lab" ? "portrait" : "landscape";
  };

  const isPortraitMode = getTemplateOrientation(activeTemplate) === "portrait";

  const resolveTemplateForRegulationAndCategory = (list = [], reg, category = "Theory") => {
    if (!Array.isArray(list) || list.length === 0) return null;
    const cat = category === "Lab" ? "Lab" : "Theory";
    return (
      list.find(t => t.regulation === reg && getTemplateCategory(t) === cat && t.isActive) ||
      list.find(t => t.regulation === reg && getTemplateCategory(t) === cat) ||
      list.find(t => t.regulation === reg && t.isActive) ||
      list.find(t => t.regulation === reg) ||
      null
    );
  };

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
    pageSplitMode: "2pages", // "2pages" (default: Split all students across max 2 pages), "1page", "30", "25"
    tableWidthMode: "full", // "full" (100% Stretch - standard MEC landscape), "autoFit"
    nameColWidth: "auto" // "auto" (default: Auto-Fit to student names), "160px", "200px", "240px"
  });

  const [headerImage, setHeaderImage] = useState(() => localStorage.getItem("internalMarkHeaderImage") || "");
  const [studentsData, setStudentsData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentCohortRoster, setCurrentCohortRoster] = useState(null);
  const [allFetchedClasses, setAllFetchedClasses] = useState([]);
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [userHiddenColumns, setUserHiddenColumns] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [savingHiddenCols, setSavingHiddenCols] = useState(false);
  const [hiddenColsMsg, setHiddenColsMsg] = useState("");
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const excelMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target)) {
        setShowExcelMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const getTemplateHiddenSignature = (template) => {
    if (!template || !Array.isArray(template.columns)) return "default";
    const colsSig = template.columns.map((c, idx) => `${idx}:${c.heading}:${Boolean(c.isHidden)}`).join("|");
    return `${template.updatedAt || ""}::${colsSig}`;
  };

  const getHiddenStorageKey = (reg, template) => {
    return `internalMarkHiddenCols_${reg || "default"}_${template?._id || "default"}`;
  };

  const persistHiddenLocal = (nextKeys, reg, template) => {
    try {
      const storageKey = getHiddenStorageKey(reg, template);
      localStorage.setItem(storageKey, JSON.stringify({
        hiddenKeys: nextKeys,
        dbSignature: getTemplateHiddenSignature(template)
      }));
    } catch {
      // Ignore storage quota errors
    }
  };

  // Sync hidden columns when active template or regulation changes (preserving saved choices per regulation)
  useEffect(() => {
    const rawCols = (activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0)
      ? activeTemplate.columns
      : defaultMecColumns;
    const keyedCols = getColumnsWithKeys(rawCols);
    const dbHiddenKeys = keyedCols.filter(c => c.isHidden).map(c => c.colKey);
    const dbSig = getTemplateHiddenSignature(activeTemplate);
    const storageKey = getHiddenStorageKey(formData.regulation, activeTemplate);

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed && parsed.dbSignature === dbSig && Array.isArray(parsed.hiddenKeys)) {
          const validKeys = new Set(keyedCols.map(c => c.colKey));
          setUserHiddenColumns(parsed.hiddenKeys.filter(k => validKeys.has(k)));
          return;
        }
      }
    } catch {
      // Malformed storage falls back to DB defaults
    }

    setUserHiddenColumns(dbHiddenKeys);
  }, [activeTemplate, formData.regulation]);

  const toggleColumnVisibility = (colKey) => {
    setHiddenColsMsg("");
    setUserHiddenColumns(prev => {
      const next = prev.includes(colKey)
        ? prev.filter(k => k !== colKey)
        : [...prev, colKey];
      persistHiddenLocal(next, formData.regulation, activeTemplate);
      return next;
    });
  };

  const handleShowAllColumns = () => {
    setHiddenColsMsg("");
    setUserHiddenColumns([]);
    persistHiddenLocal([], formData.regulation, activeTemplate);
  };

  // Persist hidden columns directly into active Regulation template so all subjects & browsers stay synced
  const handleSaveHiddenColumnsForRegulation = async () => {
    persistHiddenLocal(userHiddenColumns, formData.regulation, activeTemplate);
    if (!activeTemplate || !activeTemplate._id) {
      setHiddenColsMsg(`Saved locally for Regulation ${formData.regulation} (all subjects)`);
      setTimeout(() => setHiddenColsMsg(""), 3500);
      return;
    }

    setSavingHiddenCols(true);
    setHiddenColsMsg("");
    try {
      const keyedCols = getColumnsWithKeys(activeTemplate.columns || []);
      const updatedColumns = (activeTemplate.columns || []).map((col, idx) => ({
        ...col,
        isHidden: userHiddenColumns.includes(keyedCols[idx].colKey)
      }));
      const payload = {
        templateName: activeTemplate.templateName,
        regulation: activeTemplate.regulation,
        courseCategory: getTemplateCategory(activeTemplate),
        printOrientation: getTemplateOrientation(activeTemplate),
        passMark: activeTemplate.passMark ?? 0,
        isActive: activeTemplate.isActive,
        headerImage: activeTemplate.headerImage,
        columns: updatedColumns
      };
      const res = await API.put(`/api/internal-marks/${activeTemplate._id}`, payload);
      const savedTemplate = res.data || { ...activeTemplate, columns: updatedColumns };
      allTemplatesRef.current = allTemplatesRef.current.map(t => (t._id === savedTemplate._id ? savedTemplate : t));
      setActiveTemplate(savedTemplate);
      persistHiddenLocal(userHiddenColumns, formData.regulation, savedTemplate);
      setHiddenColsMsg(`Saved permanently for Regulation ${formData.regulation} (all subjects)!`);
      setTimeout(() => setHiddenColsMsg(""), 4000);
    } catch (err) {
      console.error("Failed to save hidden columns to template:", err);
      setHiddenColsMsg(`Saved locally for this browser (Regulation ${formData.regulation})`);
      setTimeout(() => setHiddenColsMsg(""), 4000);
    } finally {
      setSavingHiddenCols(false);
    }
  };

  // 1. Fetch All Admin Templates & Extract Regulations
  useEffect(() => {
    fetchTemplatesAndRegulations();
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
      const res = await API.get("/api/internal-marks", { params: { _ts: Date.now() } });
      const templates = res.data || [];
      allTemplatesRef.current = templates;

      const regs = [...new Set(templates.map(t => t.regulation).filter(Boolean))];
      setAvailableRegulations(regs);

      // Prioritize whichever regulation has an Active template set by Admin first
      if (regs.length > 0) {
        const activeAny = templates.find(t => t.isActive);
        const defaultReg = (activeAny && activeAny.regulation)
          ? activeAny.regulation
          : (regs.includes("2023") ? "2023" : (regs.includes("2025") ? "2025" : regs[0]));
        setFormData(prev => ({ ...prev, regulation: defaultReg }));
        const matched = resolveTemplateForRegulationAndCategory(templates, defaultReg, selectedCategoryRef.current);
        setActiveTemplate(matched || null);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  // Switch Theory <-> Lab format manually or via subject selection
  const applyCategoryAndResolveTemplate = (category, regOverride = null) => {
    const nextCat = category === "Lab" ? "Lab" : "Theory";
    selectedCategoryRef.current = nextCat;
    setSelectedCategory(nextCat);
    const targetReg = regOverride || formData.regulation;
    const matched = resolveTemplateForRegulationAndCategory(allTemplatesRef.current, targetReg, nextCat);
    if (matched) {
      setActiveTemplate(matched);
    }
  };

  // When selected regulation changes, automatically activate matching template for active category
  const handleRegulationChange = (reg) => {
    setFormData(prev => ({ ...prev, regulation: reg }));
    const matched = resolveTemplateForRegulationAndCategory(allTemplatesRef.current, reg, selectedCategoryRef.current);
    setActiveTemplate(matched || null);
  };

  const handleTargetSubjectChange = (val) => {
    if (val === "CUSTOM") {
      setFormData(prev => ({ ...prev, selectedSubject: "CUSTOM", isCustomSubject: true }));
      return;
    }
    const subjObj = subjects.find(s => s.code === val);
    const nextCat = subjObj?.isLab ? "Lab" : "Theory";
    setFormData(prev => ({ ...prev, selectedSubject: val, isCustomSubject: false, customSubject: "" }));
    applyCategoryAndResolveTemplate(nextCat);
  };

  const handleCustomSubjectChange = (textVal) => {
    setFormData(prev => ({ ...prev, customSubject: textVal }));
    const nextCat = /\blab\b|laboratory|practical/i.test(textVal || "") ? "Lab" : "Theory";
    if (nextCat !== selectedCategoryRef.current) {
      applyCategoryAndResolveTemplate(nextCat);
    }
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

  // Fast, targeted fetch for ONLY the selected Department & Section
  const loadClassAndSubjectData = async () => {
    setLoading(true);
    try {
      const yearSemSec = `${formData.year}/${formData.semester}/${formData.section}`;
      const [classRes, rosterRes, currSubjRes] = await Promise.all([
        API.get("/api/classes", { params: { department: formData.department, yearSemSec } }),
        API.get("/api/rosters", { params: { department: formData.department, year: formData.year, semester: formData.semester, section: formData.section } }),
        API.get("/api/curriculum/subjects", { params: { department: formData.department, year: formData.year, semester: formData.semester } }).catch(() => ({ data: [] }))
      ]);

      const filteredClasses = classRes.data || [];
      const rosterList = rosterRes.data || [];
      const matchedRoster = rosterList[0] || null;

      setAllFetchedClasses(filteredClasses);
      setCurrentCohortRoster(matchedRoster);

      const masterLabCodes = new Set();
      (Array.isArray(currSubjRes.data) ? currSubjRes.data : []).forEach(doc => {
        (doc.subjects || []).forEach(s => {
          if (s.category === "Lab" && s.courseCode) {
            masterLabCodes.add(String(s.courseCode).trim().toUpperCase());
          }
        });
      });

      const courseMap = {};
      const allCourseCodes = new Set();
      const examNamesByCode = {};
      filteredClasses.forEach(c => {
        const examStr = String(c.examName || "");
        if (c.courseDetails && Array.isArray(c.courseDetails)) {
          c.courseDetails.forEach(cd => {
            if (cd.courseCode) {
              const code = cd.courseCode.trim();
              courseMap[code] = cd.courseName ? cd.courseName.trim() : code;
              allCourseCodes.add(code);
              if (!examNamesByCode[code]) examNamesByCode[code] = [];
              examNamesByCode[code].push(examStr);
            }
          });
        }
        if (c.subjects && Array.isArray(c.subjects)) {
          c.subjects.forEach(s => {
            if (s && s.trim()) {
              const code = s.trim();
              allCourseCodes.add(code);
              if (!examNamesByCode[code]) examNamesByCode[code] = [];
              examNamesByCode[code].push(examStr);
            }
          });
        }
      });

      const distinctSubjectCodes = [...allCourseCodes];
      const subjectsWithNames = distinctSubjectCodes.map(code => {
        const name = courseMap[code] || "Theory Subject";
        const exList = examNamesByCode[code] || [];
        const isLab =
          masterLabCodes.has(code.toUpperCase()) ||
          /\blab\b|laboratory|practical/i.test(name) ||
          /\blab\b/i.test(code) ||
          (exList.length > 0 && exList.every(ex => /lab|practical|observation/i.test(ex)));
        return { code, name, isLab };
      }).sort((a, b) => a.code.localeCompare(b.code));

      setSubjects(subjectsWithNames);

      let targetSubj = formData.selectedSubject;
      let nextIsCustom = formData.isCustomSubject;
      if (subjectsWithNames.length > 0) {
        if (!targetSubj || !subjectsWithNames.some(s => s.code === targetSubj)) {
          targetSubj = subjectsWithNames[0].code;
          nextIsCustom = false;
          setFormData(prev => ({ ...prev, selectedSubject: targetSubj, isCustomSubject: false }));
        }
      } else {
        targetSubj = "CUSTOM";
        nextIsCustom = true;
        setFormData(prev => ({ ...prev, selectedSubject: "CUSTOM", isCustomSubject: true }));
      }

      const targetSubjObj = subjectsWithNames.find(s => s.code === targetSubj);
      const targetSubjName = targetSubjObj?.name || "";
      const detectedCat = nextIsCustom
        ? (/\blab\b|laboratory|practical/i.test(formData.customSubject || "") ? "Lab" : "Theory")
        : (targetSubjObj?.isLab ? "Lab" : "Theory");

      selectedCategoryRef.current = detectedCat;
      setSelectedCategory(detectedCat);
      const resolvedTpl = resolveTemplateForRegulationAndCategory(allTemplatesRef.current, formData.regulation, detectedCat) || activeTemplate;
      if (resolvedTpl && resolvedTpl._id !== activeTemplate?._id) {
        setActiveTemplate(resolvedTpl);
      }

      calculateStudentsMarks(filteredClasses, matchedRoster, targetSubj, resolvedTpl, targetSubjName);
    } catch (e) {
      console.error("Error loading class data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassAndSubjectData();
  }, [formData.department, formData.year, formData.semester, formData.section]);

  // Helper to parse numbers safely
  const parseNum = (val) => {
    if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "AB") return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // Normalize string for fuzzy match
  const normStr = (str) => (str || "").toLowerCase().replace(/[\s\-_]/g, "");

  // Normalize exam name specifically so CIA 1, CIA 2, CIA 3, Practical & UT 1..5 never cross-collide
  const normalizeExam = (name) => {
    if (!name) return "";
    let s = String(name).toLowerCase().replace(/[\s\-_.]/g, "");
    if (s.includes("practical") || s.includes("lab")) return s;
    s = s.replace(/unittest/g, "ut");
    if (/^modelexam(ination)?$/.test(s) || s === "model") return "cia3_model";
    s = s.replace(/cia(iii|3)/g, "cia3")
         .replace(/cia(ii|2)/g, "cia2")
         .replace(/cia(iv|4)/g, "cia4")
         .replace(/cia(i|1)/g, "cia1");
    s = s.replace(/ut(iii|3)/g, "ut3")
         .replace(/ut(ii|2)/g, "ut2")
         .replace(/ut(iv|4)/g, "ut4")
         .replace(/ut(v|5)/g, "ut5")
         .replace(/ut(i|1)/g, "ut1");
    s = s.replace(/seminar/g, "sm");
    return s;
  };

  // Returns match priority: 2 = Exact Exam Match, 1 = Model Exam <-> CIA 3 Fallback, 0 = No Match
  const getExamMatchPriority = (targetExam, classExam) => {
    if (!targetExam || !classExam) return 0;
    const n1 = normalizeExam(targetExam);
    const n2 = normalizeExam(classExam);
    if (!n1 || !n2) return 0;
    if (n1 === n2) return 2;
    const cia3Aliases = new Set(["cia3", "cia3_model"]);
    if (cia3Aliases.has(n1) && cia3Aliases.has(n2)) return 1;
    return 0;
  };

  // Finds exact matching subject index in a Class record without empty-string or prefix false positives
  const findSubjectIndexInClass = (cls, targetSubjCode, targetSubjName = "") => {
    const cleanCode = normStr(targetSubjCode);
    const cleanName = (targetSubjName && targetSubjName !== "Theory Subject") ? normStr(targetSubjName) : "";
    const count = Math.max(cls.subjects?.length || 0, cls.courseDetails?.length || 0);
    if (count === 0) return -1;

    // Pass 1: Strict Exact Match (prevents e.g. 23CS301 matching 23CS301L or "" empty string matches)
    for (let i = 0; i < count; i++) {
      const sRaw = normStr(cls.subjects?.[i]);
      const cd = cls.courseDetails?.[i];
      const cCode = normStr(cd?.courseCode);
      const cName = normStr(cd?.courseName);
      const cShort = normStr(cd?.shortName);

      if (cleanCode && (sRaw === cleanCode || cCode === cleanCode)) return i;
      if (cleanName && (sRaw === cleanName || cName === cleanName || cShort === cleanName)) return i;
      if (cleanCode && cleanName && sRaw === `${cleanCode}${cleanName}`) return i;
    }

    // Pass 2: Delimited Code Prefix (e.g. subjects[i] = "23CSE01 - Internet of Things") or Long Name Match
    const rawCodeToken = String(targetSubjCode || "").trim().toLowerCase();
    for (let i = 0; i < count; i++) {
      const rawSubjStr = String(cls.subjects?.[i] || "").trim().toLowerCase();
      const firstToken = rawSubjStr.split(/[\s–\-:|]+/)[0];
      if (rawCodeToken && firstToken && firstToken === rawCodeToken) return i;

      const cd = cls.courseDetails?.[i];
      const cCode = normStr(cd?.courseCode);
      const cName = normStr(cd?.courseName);
      if (cleanName && cleanName.length >= 6 && cName && cName.length >= 6 && (cName.includes(cleanName) || cleanName.includes(cName))) {
        return i;
      }
      if (cleanCode && cleanCode.length >= 4 && cCode && cCode.length >= 4 && cCode === cleanCode) {
        return i;
      }
    }

    return -1;
  };

  // Accurate exam mark finder prioritizing Exact Exam Match + Exact Subject Match
  const findExamMarkForStudent = (student, examName, targetSubjCode, allClassesForSection, targetSubjName = "") => {
    if (!examName) return "";
    const targetReg = String(student.regNo || "").trim().toUpperCase();
    if (!targetReg) return "";

    const matchingClasses = (allClassesForSection || [])
      .map(cls => ({ cls, priority: getExamMatchPriority(examName, cls.examName) }))
      .filter(item => item.priority > 0)
      .sort((a, b) => b.priority - a.priority);

    for (const { cls } of matchingClasses) {
      const subjIdx = findSubjectIndexInClass(cls, targetSubjCode, targetSubjName);
      if (subjIdx !== -1 && Array.isArray(cls.students)) {
        const stObj = cls.students.find(s => String(s.regNo || "").trim().toUpperCase() === targetReg);
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

  // Helper to get active columns with guaranteed unique keys (prevents collisions like "MKC" vs "MKC IM")
  const getColumnsWithKeys = (cols) => {
    let imIndex = 0;
    const usedKeys = new Set();
    return cols.map((c, i) => {
      let key = c.colKey || c.key;
      const headingLower = (c.heading || "").toLowerCase().trim();
      const isFormulaLike = c.type === "formula" || c.type === "calculation" || /\bim\b/.test(headingLower) || headingLower.includes("internal");

      if (!key) {
        if (isFormulaLike) {
          if (headingLower.includes("total")) {
            key = "total";
          } else if (headingLower.startsWith("im") || headingLower === "internal") {
            imIndex += 1;
            key = `im${imIndex}`;
          } else {
            key = `col_${i}`;
          }
        } else if (headingLower.includes("ut-1") || headingLower.includes("ut 1") || headingLower.includes("ut1")) key = "ut1";
        else if (headingLower.includes("ut-2") || headingLower.includes("ut 2") || headingLower.includes("ut2")) key = "ut2";
        else if (headingLower.includes("ut-3") || headingLower.includes("ut 3") || headingLower.includes("ut3")) key = "ut3";
        else if (headingLower.includes("ut-4") || headingLower.includes("ut 4") || headingLower.includes("ut4")) key = "ut4";
        else if (headingLower.includes("ut-5") || headingLower.includes("ut 5") || headingLower.includes("ut5")) key = "ut5";
        else if (headingLower.includes("cia1") || headingLower.includes("cia 1") || headingLower.includes("cia-1") || headingLower.includes("cia-i")) key = "cia1";
        else if (headingLower.includes("cia2") || headingLower.includes("cia 2") || headingLower.includes("cia-2") || headingLower.includes("cia-ii")) key = "cia2";
        else if (headingLower.includes("cia3") || headingLower.includes("cia 3") || headingLower.includes("cia-3") || headingLower.includes("cia-iii") || headingLower.includes("model")) key = "cia3";
        else if (headingLower.includes("total")) key = "total";
        else if (headingLower.includes("sm") || headingLower.includes("seminar")) key = "sm";
        else if (headingLower.includes("mkc")) key = "mkc";
        else key = `col_${i}`;
      }

      if (usedKeys.has(key)) {
        key = `col_${i}`;
      }
      usedKeys.add(key);

      const parsed = parseHeading(c.heading || "");
      return {
        ...c,
        colKey: key,
        title: c.title || parsed.title,
        maxMark: c.maxMark || parsed.maxMark
      };
    });
  };

  // Helper: Resolve effective formula string & detect broken/unlinked calculation columns in a template
  const stripTrailingImLabel = (text) =>
    String(text || "")
      .replace(/\(.*?\)/g, "")
      .replace(/\b(internal\s*marks?|im)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const findColumnByToken = (cols, candidateCols, rawToken, usageCursor = null) => {
    const token = String(rawToken || "").trim();
    if (!token) return null;

    const cleanPlain = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const stripParens = (s) => parseHeading(String(s || "")).title;
    const tokenBase = stripParens(token);
    const tokenNormExam = normalizeExam(tokenBase);
    const tokenNormStr = normStr(tokenBase);

    const searchPools = (poolList) => {
      for (const poolSource of poolList) {
        if (!poolSource || poolSource.length === 0) continue;

        // 1. Exact trimmed heading / title
        let pool = poolSource.filter(c => String(c.heading || "").trim() === token || String(c.title || "").trim() === token);
        // 2. Case-insensitive heading / paren-stripped title
        if (pool.length === 0) {
          pool = poolSource.filter(c =>
            cleanPlain(c.heading) === cleanPlain(token) ||
            cleanPlain(c.title) === cleanPlain(tokenBase) ||
            cleanPlain(stripParens(c.heading)) === cleanPlain(tokenBase)
          );
        }
        // 3. Normalized exam/code match (e.g. "CIA 2" / "CIA-II" / "CIA - II" <-> "CIA II")
        if (pool.length === 0 && (tokenNormExam || tokenNormStr)) {
          pool = poolSource.filter(c => {
            const cTitle = stripParens(c.heading || c.title || "");
            const cExam = normalizeExam(c.examName || "");
            const cHeadExam = normalizeExam(cTitle);
            return (
              (tokenNormExam && ((cHeadExam && cHeadExam === tokenNormExam) || (cExam && cExam === tokenNormExam))) ||
              (tokenNormStr && (normStr(cTitle) === tokenNormStr || normStr(c.examName) === tokenNormStr))
            );
          });
        }
        if (pool.length > 0) return pool;
      }
      return [];
    };

    // Explicit occurrence token e.g. "IM (10) ::2"
    const occMatch = token.match(/^(.*?)\s*::(\d+)$/);
    if (occMatch) {
      const baseName = occMatch[1].trim();
      const occNum = parseInt(occMatch[2], 10);
      const baseNoParens = stripParens(baseName);
      const matchFn = (c) =>
        String(c.heading || "").trim() === baseName ||
        String(c.title || "").trim() === baseName ||
        cleanPlain(stripParens(c.heading)) === cleanPlain(baseNoParens);
      const candMatch = candidateCols.filter(matchFn);
      const allMatch = candMatch.length >= occNum ? candMatch : cols.filter(matchFn);
      return allMatch[occNum - 1] || null;
    }

    // Direct colKey lookup
    const byKey = candidateCols.find(c => c.colKey === token) || cols.find(c => c.colKey === token);
    if (byKey) return byKey;

    const matchedPool = searchPools([candidateCols, cols]);
    if (matchedPool.length === 0) return null;

    if (!usageCursor) return matchedPool[0];
    const usedIdx = usageCursor[token] || 0;
    const picked = matchedPool[Math.min(usedIdx, matchedPool.length - 1)];
    usageCursor[token] = usedIdx + 1;
    return picked;
  };

  const getEffectiveFormulaString = (col) => {
    const raw = (col?.formula || "").trim();
    if (raw) return raw;
    if (Array.isArray(col?.calcSources) && col.calcSources.length > 0) {
      const sumPart = col.calcSources.map(s => `#[${s}]`).join(" + ");
      if (col.calcType === "sum") return `(${sumPart})`;
      const safeOut = Number(col.calcOutof) > 0 ? Number(col.calcOutof) : 1;
      const safeW = col.calcWeightage !== undefined && col.calcWeightage !== "" ? Number(col.calcWeightage) : 1;
      return `(${sumPart}) / ${safeOut} * ${safeW}`;
    }
    return "";
  };

  const inferDefaultExamMaxMark = (srcCol) => {
    const explicitMax = parseFloat(srcCol?.maxMark || parseHeading(srcCol?.heading || "").maxMark);
    if (!isNaN(explicitMax) && explicitMax > 0) return explicitMax;
    const ex = normalizeExam(srcCol?.examName || srcCol?.title || srcCol?.heading || "");
    if (ex.includes("cia3") || ex.includes("model")) return 100;
    if (ex.includes("cia1") || ex.includes("cia2")) return 50;
    if (ex.includes("ut")) return 30;
    if (ex.includes("mkc") || ex.includes("sm") || ex.includes("seminar")) return 5;
    return 50;
  };

  const isBrokenFormulaColumn = (col, colIdx, cols) => {
    if (!(col.type === "formula" || col.type === "calculation")) return false;
    const fStr = getEffectiveFormulaString(col);
    if (!fStr) return true;
    const tokens = [...fStr.matchAll(/#\[(.*?)\]/g)].map(m => m[1]);
    if (tokens.length === 0) return true;
    const candidateCols = cols.slice(0, colIdx);
    const cursor = {};
    return tokens.some(tok => !findColumnByToken(cols, candidateCols, tok, cursor));
  };

  // Helper to evaluate row formulas (strictly executes Admin formulas + smart alias & auto-repair for unlinked IM columns)
  const evaluateRowFormulas = (row, cols, isUsingAdminTemplate = false) => {
    const isFormulaCol = (c) => c && (c.type === "formula" || c.type === "calculation");
    const evaluatedSet = new Set();

    const getColValue = (targetCol, visiting) => {
      if (!targetCol) return 0;
      const tIdx = cols.indexOf(targetCol);
      if (isFormulaCol(targetCol) && tIdx !== -1 && !evaluatedSet.has(tIdx) && !visiting.has(tIdx)) {
        evalColAtIndex(tIdx, visiting);
      }
      return parseNum(row[targetCol.colKey] !== undefined ? row[targetCol.colKey] : row[targetCol.heading]);
    };

    const computeFallbackForBrokenIm = (col, colIdx, visiting) => {
      const headingText = col.title || parseHeading(col.heading || "").title || col.heading || "";
      if (/\btotal\b/i.test(headingText)) {
        const priorCols = cols.slice(0, colIdx);
        const formulaCols = priorCols.filter(isFormulaCol);
        if (formulaCols.length > 0) {
          return Math.round(formulaCols.reduce((sum, fc) => sum + getColValue(fc, visiting), 0));
        }
        return Math.round(priorCols.reduce((sum, ec) => sum + getColValue(ec, visiting), 0));
      }

      const prefix = stripTrailingImLabel(headingText);
      const nonFormulaCols = cols.filter(c => !isFormulaCol(c));
      const matchedSource = findColumnByToken(nonFormulaCols, nonFormulaCols.filter(c => cols.indexOf(c) < colIdx), prefix);
      if (!matchedSource) return 0;

      const srcVal = getColValue(matchedSource, visiting);
      const srcMax = inferDefaultExamMaxMark(matchedSource);
      const targetExplicit = parseFloat(col.maxMark || parseHeading(col.heading || "").maxMark);
      const targetMax = (!isNaN(targetExplicit) && targetExplicit > 0)
        ? targetExplicit
        : (/\b(mkc|sem|sm|seminar)\b/i.test(prefix) ? 5 : 10);

      if (srcMax <= 0) return 0;
      return Math.round((srcVal / srcMax) * targetMax);
    };

    const evalColAtIndex = (colIdx, visiting = new Set()) => {
      if (evaluatedSet.has(colIdx)) return;
      const col = cols[colIdx];
      if (!isFormulaCol(col)) return;

      visiting.add(colIdx);
      const fStr = getEffectiveFormulaString(col);
      const candidateCols = cols.slice(0, colIdx);

      let computedVal = 0;
      let usedAutoFallback = false;

      if (!fStr) {
        usedAutoFallback = true;
      } else {
        const tokens = [...fStr.matchAll(/#\[(.*?)\]/g)].map(m => m[1]);
        if (tokens.length === 0) {
          usedAutoFallback = true;
        } else {
          const usageCursor = {};
          let unresolved = false;
          const expr = fStr.replace(/#\[(.*?)\]/g, (_, rawToken) => {
            const picked = findColumnByToken(cols, candidateCols, rawToken, usageCursor);
            if (!picked) {
              unresolved = true;
              return "0";
            }
            return getColValue(picked, visiting);
          });

          if (unresolved) {
            usedAutoFallback = true;
          } else {
            try {
              if (/^[\d+\-*/().\s]+$/.test(expr)) {
                const res = Function(`"use strict"; return (${expr})`)();
                computedVal = !isFinite(res) || isNaN(res) ? 0 : Math.round(res);
              } else {
                usedAutoFallback = true;
              }
            } catch {
              usedAutoFallback = true;
            }
          }
        }
      }

      if (usedAutoFallback) {
        computedVal = computeFallbackForBrokenIm(col, colIdx, visiting);
      }

      row[col.colKey] = computedVal;
      if (col.heading) row[col.heading] = computedVal;
      evaluatedSet.add(colIdx);
      visiting.delete(colIdx);
    };

    // 1. Evaluate every configured formula/calculation column left-to-right (resolving dependencies seamlessly)
    if (isUsingAdminTemplate) {
      cols.forEach((col, colIdx) => {
        if (isFormulaCol(col)) {
          evalColAtIndex(colIdx, new Set());
        }
      });
    }

    // 2. Default MEC Calculations ONLY when no Admin template is configured
    if (!isUsingAdminTemplate) {
      const ut1 = parseNum(row.ut1 ?? row["UT-1 (30)"] ?? row["UT-1"]);
      const ut2 = parseNum(row.ut2 ?? row["UT-2 (30)"] ?? row["UT-2"]);
      const cia1 = parseNum(row.cia1 ?? row["CIA1 (50)"] ?? row["CIA1"]);
      const ut3 = parseNum(row.ut3 ?? row["UT-3 (30)"] ?? row["UT-3"]);
      const ut4 = parseNum(row.ut4 ?? row["UT-4 (30)"] ?? row["UT-4"]);
      const cia2 = parseNum(row.cia2 ?? row["CIA2 (50)"] ?? row["CIA2"]);
      const ut5 = parseNum(row.ut5 ?? row["UT-5 (30)"] ?? row["UT-5"]);
      const cia3 = parseNum(row.cia3 ?? row["CIA3 (100)"] ?? row["CIA3"]);
      const sm = parseNum(row.sm ?? row["SM (5)"] ?? row["SM"]);
      const mkc = parseNum(row.mkc ?? row["MKC (5)"] ?? row["MKC"]);

      row.im1 = Math.round(((ut1 + ut2 + cia1) / 110) * 10);
      row.im2 = Math.round(((ut3 + ut4 + cia2) / 110) * 10);
      row.im3 = Math.round(((ut5 + cia3) / 130) * 10);
      row.total = Math.min(40, Math.round(row.im1 + row.im2 + row.im3 + sm + mkc));
    }

    // Sync headings for downstream read fallback
    cols.forEach(col => {
      if (col.heading && row[col.colKey] !== undefined) {
        row[col.heading] = row[col.colKey];
      }
    });

    return row;
  };

  // Builds evaluated student mark rows for any given subject (reused by UI & multi-subject Excel export)
  const buildEvaluatedRowsForSubject = (classesList, rosterObj, targetSubject, template, targetSubjName = "") => {
    if (!targetSubject) return [];

    const studentMap = {};

    // 1. Gather all students from Roster of this section
    if (rosterObj && rosterObj.students) {
      rosterObj.students.forEach(student => {
        if (student.regNo) {
          studentMap[student.regNo] = {
            regNo: student.regNo,
            name: student.name || ""
          };
        }
      });
    }

    // 2. Also gather students from uploaded classes of this section
    (classesList || []).forEach(c => {
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

    const hasAdminTemplate = Boolean(template && template.columns && template.columns.length > 0);
    const rawCols = hasAdminTemplate
      ? template.columns
      : defaultMecColumns;
    const columnsToUse = getColumnsWithKeys(rawCols);

    // 3. Compute marks and formulas for every student against columnsToUse
    const evaluatedStudents = Object.values(studentMap).map(student => {
      const row = { ...student };

      columnsToUse.forEach(col => {
        if (col.type === "exam") {
          const mark = findExamMarkForStudent(student, col.examName || col.title || col.heading, targetSubject, classesList || [], targetSubjName);
          row[col.colKey] = mark;
          row[col.heading] = mark;
        }
      });

      evaluateRowFormulas(row, columnsToUse, hasAdminTemplate);
      return row;
    });

    evaluatedStudents.sort((a, b) => (a.regNo || "").localeCompare(b.regNo || "", undefined, { numeric: true }));
    return evaluatedStudents;
  };

  // Pure in-memory student marks & formulas calculation (Instant 0ms update, Zero API calls)
  const calculateStudentsMarks = (classesList, rosterObj, targetSubj, template, targetSubjName = "") => {
    const targetSubject = targetSubj || (formData.isCustomSubject ? formData.customSubject : formData.selectedSubject);
    if (!targetSubject) {
      setStudentsData([]);
      return;
    }
    const resolvedName = targetSubjName || (formData.isCustomSubject ? "" : (subjects.find(s => s.code === targetSubject)?.name || ""));
    const evaluatedStudents = buildEvaluatedRowsForSubject(classesList, rosterObj, targetSubject, template, resolvedName);
    setStudentsData(evaluatedStudents);
  };

  // Instant in-memory recalculation when subject, custom subject, or active template changes (0ms delay)
  useEffect(() => {
    if (allFetchedClasses.length > 0 || currentCohortRoster) {
      const targetSubj = formData.isCustomSubject ? formData.customSubject : formData.selectedSubject;
      const targetSubjName = formData.isCustomSubject ? "" : (subjects.find(s => s.code === targetSubj)?.name || "");
      calculateStudentsMarks(allFetchedClasses, currentCohortRoster, targetSubj, activeTemplate, targetSubjName);
    }
  }, [
    formData.selectedSubject, 
    formData.customSubject, 
    formData.isCustomSubject,
    activeTemplate
  ]);

  // Handle cell edit on screen
  const handleCellEdit = (studentIndex, colKeyOrHeading, value) => {
    setStudentsData(prev => {
      if (!prev[studentIndex]) return prev;
      const updated = [...prev];
      const hasAdminTemplate = Boolean(activeTemplate && activeTemplate.columns && activeTemplate.columns.length > 0);
      const rawCols = hasAdminTemplate
        ? activeTemplate.columns
        : defaultMecColumns;
      const columnsToUse = getColumnsWithKeys(rawCols);

      const matchedCol = columnsToUse.find(c => c.colKey === colKeyOrHeading || c.heading === colKeyOrHeading);
      const row = { ...updated[studentIndex], [colKeyOrHeading]: value };
      if (matchedCol) {
        row[matchedCol.colKey] = value;
        if (matchedCol.heading) row[matchedCol.heading] = value;
      }

      evaluateRowFormulas(row, columnsToUse, hasAdminTemplate);

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

  // Detect any Admin formula column with missing/broken links that triggered automatic sibling inference
  const autoRepairedColumns = useMemo(() => {
    if (!activeTemplate || !Array.isArray(activeTemplate.columns) || activeTemplate.columns.length === 0) {
      return [];
    }
    return currentColumns.filter((col, idx) => isBrokenFormulaColumn(col, idx, currentColumns));
  }, [activeTemplate, currentColumns]);

  // Visible Columns (Filters out hidden columns while calculations still run for all columns in background)
  const visibleColumns = useMemo(() => {
    return currentColumns.filter(c => !userHiddenColumns.includes(c.colKey));
  }, [currentColumns, userHiddenColumns]);

  // Check if visible columns have subheaders (like "(50)")
  const hasSubHeaders = useMemo(() => {
    return visibleColumns.some(c => c.maxMark || (c.heading && c.heading.includes("(") && c.heading.includes(")")));
  }, [visibleColumns]);

  // Multi-page chunking: Balanced 2 Pages (Fit ONLY actual enrolled students cleanly into max 2 pages; Portrait fits more rows vertically)
  const studentPages = useMemo(() => {
    const baseList = [...studentsData];

    if (baseList.length === 0) {
      return [[]];
    }

    const mode = formData.pageSplitMode || "2pages";

    // Balanced 2 Pages: Portrait A4 fits up to 36 rows on 1 page cleanly; Landscape fits up to 24 rows on 1 page cleanly
    if (mode === "2pages") {
      const singlePageCap = isPortraitMode ? 36 : 24;
      if (baseList.length <= singlePageCap) {
        return [baseList];
      }
      const splitThreshold = isPortraitMode ? 58 : 40;
      const splitIdx = baseList.length > splitThreshold
        ? Math.max(1, Math.floor((baseList.length - 3) / 2))
        : Math.ceil(baseList.length / 2);
      return [
        baseList.slice(0, splitIdx),
        baseList.slice(splitIdx)
      ];
    }

    // Single continuous sheet (All students on 1 page)
    if (mode === "1page") {
      return [baseList];
    }

    // Fixed rows per page (e.g. 25, 30)
    const chunkSize = parseInt(mode) || 30;
    const pages = [];
    for (let i = 0; i < baseList.length; i += chunkSize) {
      pages.push(baseList.slice(i, i + chunkSize));
    }
    return pages;
  }, [studentsData, formData.pageSplitMode, isPortraitMode]);

  // Dynamically scale row height & font in print so Header + Table + Signatures + Page Number fit cleanly in both Landscape and Portrait A4
  const printMetrics = useMemo(() => {
    const maxRows = Math.max(1, ...studentPages.map(p => p.length));
    if (isPortraitMode) {
      if (maxRows <= 34) return { rowHeight: 19, fontSize: 9.5, paddingY: 1 };
      if (maxRows <= 40) return { rowHeight: 17, fontSize: 9, paddingY: 0 };
      if (maxRows <= 46) return { rowHeight: 15, fontSize: 8.5, paddingY: 0 };
      const fitted = Math.max(11, Math.floor(780 / maxRows));
      return { rowHeight: fitted, fontSize: Math.max(7.5, fitted - 3), paddingY: 0 };
    }
    if (maxRows <= 25) return { rowHeight: 17, fontSize: 9.5, paddingY: 1 };
    if (maxRows <= 30) return { rowHeight: 15, fontSize: 9, paddingY: 0 };
    if (maxRows <= 34) return { rowHeight: 14, fontSize: 8.5, paddingY: 0 };
    if (maxRows <= 38) return { rowHeight: 13, fontSize: 8, paddingY: 0 };
    const fitted = Math.max(10, Math.floor(490 / maxRows));
    return { rowHeight: fitted, fontSize: Math.max(7.5, fitted - 4), paddingY: 0 };
  }, [studentPages, isPortraitMode]);

  // Auto-fit student Name column width to longest enrolled name while keeping mark columns roomy within Portrait (~650px) or Landscape (~920px) budget
  const resolvedNameColWidth = useMemo(() => {
    if (formData.nameColWidth !== "auto") return formData.nameColWidth;
    const maxChars = studentsData.reduce((mx, st) => Math.max(mx, (st.name || "").length), 14);
    const totalBudget = isPortraitMode ? 650 : 920;
    const minColSpace = isPortraitMode ? 36 : 40;
    const reservedForMarks = Math.max(isPortraitMode ? 185 : 240, visibleColumns.length * minColSpace);
    const maxAllowedForName = isPortraitMode
      ? Math.max(115, Math.min(200, totalBudget - reservedForMarks))
      : Math.max(145, Math.min(270, totalBudget - reservedForMarks));
    const charFactor = isPortraitMode ? 6.0 : 6.8;
    const minName = isPortraitMode ? 115 : 145;
    const desired = Math.max(minName, Math.ceil(maxChars * charFactor + 14));
    return `${Math.min(maxAllowedForName, desired)}px`;
  }, [formData.nameColWidth, studentsData, visibleColumns.length, isPortraitMode]);

  // Identifies the final formula/total column for UI highlight & summary KPIs (no functional change)
  const finalSummaryColumn = useMemo(() => {
    return [...currentColumns].reverse().find(c => c.type === "formula" || c.type === "calculation")
      || currentColumns[currentColumns.length - 1]
      || null;
  }, [currentColumns]);

  // Minimum Internal Pass Mark configured in Admin Template for this Regulation (0 = disabled)
  const internalPassMark = useMemo(() => {
    const val = Number(activeTemplate?.passMark);
    return !isNaN(val) && val > 0 ? val : 0;
  }, [activeTemplate]);

  // Derived screen-only KPI stats for visual overview
  const screenSummaryStats = useMemo(() => {
    if (!studentsData.length || !finalSummaryColumn) {
      return { total: studentsData.length, highest: 0, average: "0.0", maxMark: finalSummaryColumn?.maxMark || "", belowPassCount: 0 };
    }
    const vals = studentsData
      .map(st => Number(st[finalSummaryColumn.colKey] ?? st[finalSummaryColumn.heading]))
      .filter(n => !isNaN(n));
    const highest = vals.length ? Math.max(...vals) : 0;
    const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0.0";
    const belowPassCount = internalPassMark > 0 ? vals.filter(n => n < internalPassMark).length : 0;
    return {
      total: studentsData.length,
      highest,
      average: avg,
      maxMark: finalSummaryColumn.maxMark || "",
      belowPassCount
    };
  }, [studentsData, finalSummaryColumn, internalPassMark]);

  const handlePrint = () => {
    window.print();
  };

  // Normalizes cell values so numeric marks export as real Excel numbers without breaking "AB"/blank cells
  const normalizeExcelCellValue = (val, isFormula) => {
    if (isFormula) {
      if (val === undefined || val === null || val === "") return 0;
      const n = Number(val);
      return isNaN(n) ? 0 : n;
    }
    if (val === undefined || val === null || val === "") return "";
    const str = String(val).trim();
    if (str !== "" && !isNaN(Number(str)) && typeof val !== "boolean") {
      return Number(str);
    }
    return str;
  };

  // Builds a valid, unique Excel sheet tab name (max 31 chars, no invalid characters)
  const makeSafeSheetName = (rawName, usedNames = new Set()) => {
    const cleaned = (rawName || "Sheet").replace(/[:\\/?*[\]]/g, " ").trim() || "Sheet";
    let candidate = cleaned.slice(0, 31);
    let suffix = 2;
    while (usedNames.has(candidate)) {
      const tag = `_${suffix}`;
      candidate = `${cleaned.slice(0, 31 - tag.length)}${tag}`;
      suffix += 1;
    }
    usedNames.add(candidate);
    return candidate;
  };

  // Constructs a formatted, merged, landscape-ready SheetJS worksheet matching Admin template columns
  const buildSubjectWorksheet = (listToExport, subjectDisplay) => {
    const rows = [];
    const totalCols = Math.max(6, 3 + visibleColumns.length);
    const lastColIdx = totalCols - 1;
    const iqacStartCol = Math.max(0, lastColIdx - 2);

    const refRow = new Array(totalCols).fill("");
    refRow[iqacStartCol] = formData.iqacRef;
    rows.push(refRow);

    const collegeRow = new Array(totalCols).fill("");
    collegeRow[0] = "MUTHAYAMMAL ENGINEERING COLLEGE (AUTONOMOUS)";
    rows.push(collegeRow);

    const addressRow = new Array(totalCols).fill("");
    addressRow[0] = "Rasipuram – 637 408, Namakkal (Dt.), Tamil Nadu, India.";
    rows.push(addressRow);
    rows.push([]);

    const meta1Row = new Array(totalCols).fill("");
    meta1Row[0] = `Dept: ${formData.department}`;
    meta1Row[2] = `Year/Sem/Sec: ${formData.year}/${formData.semester}/${formData.section}`;
    meta1Row[Math.min(Math.max(3, Math.floor(totalCols * 0.45)), Math.max(3, lastColIdx - 2))] = formData.semesterSession;
    meta1Row[Math.max(0, lastColIdx - 1)] = `Date: ${formData.date}`;
    rows.push(meta1Row);

    const meta2Row = new Array(totalCols).fill("");
    meta2Row[0] = `Course Code/ Name : ${subjectDisplay}`;
    rows.push(meta2Row);
    rows.push([]);

    const headerRowIdx = rows.length;
    const row1 = ["S.No", "Reg.No.", "Name"];
    const row2 = ["", "", ""];
    visibleColumns.forEach(c => {
      row1.push(c.title);
      row2.push(c.maxMark);
    });

    rows.push(row1);
    if (hasSubHeaders) rows.push(row2);

    let maxNameLen = 18;
    listToExport.forEach((st, idx) => {
      if (st.name && st.name.length > maxNameLen) maxNameLen = st.name.length;
      const sNo = st.sNo || idx + 1;
      const stRow = [sNo, st.regNo || "", st.name || ""];
      visibleColumns.forEach(c => {
        const isFormula = c.type === "formula" || c.type === "calculation";
        const val = st[c.colKey] !== undefined ? st[c.colKey] : st[c.heading];
        stRow.push(normalizeExcelCellValue(val, isFormula));
      });
      rows.push(stRow);
    });

    rows.push([]);
    rows.push([]);
    const sigRow = new Array(totalCols).fill("");
    sigRow[2] = "Course Faculty";
    sigRow[Math.max(3, Math.floor(totalCols * 0.55))] = "Year Co-ordinator";
    sigRow[Math.max(4, lastColIdx - 1)] = "HoD";
    rows.push(sigRow);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const merges = [
      { s: { r: 0, c: iqacStartCol }, e: { r: 0, c: lastColIdx } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: lastColIdx } }
    ];
    if (hasSubHeaders) {
      merges.push(
        { s: { r: headerRowIdx, c: 0 }, e: { r: headerRowIdx + 1, c: 0 } },
        { s: { r: headerRowIdx, c: 1 }, e: { r: headerRowIdx + 1, c: 1 } },
        { s: { r: headerRowIdx, c: 2 }, e: { r: headerRowIdx + 1, c: 2 } }
      );
    }
    ws["!merges"] = merges;
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: Math.min(36, Math.max(24, maxNameLen + 3)) },
      ...visibleColumns.map(c => ({
        wch: Math.max(8, String(c.title || "").length + 3, String(c.maxMark || "").length + 3)
      }))
    ];
    ws["!pageSetup"] = { orientation: isPortraitMode ? "portrait" : "landscape", paperSize: 9, fitToWidth: 1, fitToHeight: 2 };
    return ws;
  };

  const getExportSubjectList = () => {
    if (subjects.length > 0) return subjects;
    const fallbackCode = (formData.isCustomSubject ? formData.customSubject : formData.selectedSubject) || "Course";
    return [{ code: fallbackCode, name: "" }];
  };

  // Option 1: Export Currently Selected Subject (.xlsx)
  const handleExportCurrentSubjectExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = buildSubjectWorksheet(studentsData, getDisplaySubject());
    const usedNames = new Set();
    const rawSubj = formData.isCustomSubject ? (formData.customSubject || "Internal Marks") : (formData.selectedSubject || "Internal Marks");
    const tabName = makeSafeSheetName(rawSubj, usedNames);
    XLSX.utils.book_append_sheet(wb, ws, tabName);
    const subjSlug = rawSubj.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Internal_Mark_${formData.department}_${formData.year}_Sem${formData.semester}_Sec${formData.section}_${subjSlug}.xlsx`;
    XLSX.writeFile(wb, filename);
    setShowExcelMenu(false);
  };

  // Option 2: Export ALL Subjects of Class in a Single Multi-Sheet Workbook (.xlsx)
  const handleExportAllSubjectsExcel = () => {
    const targetList = getExportSubjectList();
    const wb = XLSX.utils.book_new();
    const usedNames = new Set();

    targetList.forEach(subj => {
      const evalRows = (subj.code === formData.selectedSubject && !formData.isCustomSubject)
        ? studentsData
        : buildEvaluatedRowsForSubject(allFetchedClasses, currentCohortRoster, subj.code, activeTemplate, subj.name);
      const displaySubj = subj.name ? `${subj.code} - ${subj.name}` : subj.code;
      const ws = buildSubjectWorksheet(evalRows, displaySubj);
      XLSX.utils.book_append_sheet(wb, ws, makeSafeSheetName(subj.code, usedNames));
    });

    const filename = `Internal_Marks_All_Subjects_${formData.department}_${formData.year}_Sem${formData.semester}_Sec${formData.section}.xlsx`;
    XLSX.writeFile(wb, filename);
    setShowExcelMenu(false);
  };

  // Option 3: Export Final Internal Total Consolidated Summary Across All Subjects (.xlsx)
  const handleExportSummaryExcel = () => {
    const targetList = getExportSubjectList();
    const summaryCol = [...currentColumns].reverse().find(c => c.type === "formula" || c.type === "calculation")
      || currentColumns[currentColumns.length - 1];
    const isSummaryFormula = Boolean(summaryCol && (summaryCol.type === "formula" || summaryCol.type === "calculation"));

    const perSubjectRows = {};
    const masterStudents = {};

    targetList.forEach(subj => {
      const evalRows = (subj.code === formData.selectedSubject && !formData.isCustomSubject)
        ? studentsData
        : buildEvaluatedRowsForSubject(allFetchedClasses, currentCohortRoster, subj.code, activeTemplate, subj.name);
      perSubjectRows[subj.code] = {};
      evalRows.forEach(st => {
        if (!st.regNo) return;
        masterStudents[st.regNo] = { regNo: st.regNo, name: st.name || masterStudents[st.regNo]?.name || "" };
        const rawTotal = summaryCol ? (st[summaryCol.colKey] !== undefined ? st[summaryCol.colKey] : st[summaryCol.heading]) : "";
        perSubjectRows[subj.code][st.regNo] = normalizeExcelCellValue(rawTotal, isSummaryFormula);
      });
    });

    const sortedStudents = Object.values(masterStudents).sort((a, b) =>
      (a.regNo || "").localeCompare(b.regNo || "", undefined, { numeric: true })
    );

    const totalCols = Math.max(5, 3 + targetList.length);
    const lastColIdx = totalCols - 1;
    const rows = [
      ["MUTHAYAMMAL ENGINEERING COLLEGE (AUTONOMOUS)"],
      [`Consolidated Internal Marks Summary (${summaryCol ? summaryCol.heading : "Total"})`],
      [`Dept: ${formData.department}`, "", `Year/Sem/Sec: ${formData.year}/${formData.semester}/${formData.section}`, "", formData.semesterSession],
      [],
      ["S.No", "Reg.No.", "Name", ...targetList.map(s => s.code)]
    ];

    let maxNameLen = 20;
    sortedStudents.forEach((st, idx) => {
      if (st.name && st.name.length > maxNameLen) maxNameLen = st.name.length;
      rows.push([
        idx + 1,
        st.regNo,
        st.name,
        ...targetList.map(subj => perSubjectRows[subj.code]?.[st.regNo] ?? 0)
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } }
    ];
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: Math.min(36, Math.max(24, maxNameLen + 3)) },
      ...targetList.map(s => ({ wch: Math.max(12, String(s.code).length + 3) }))
    ];
    ws["!pageSetup"] = { orientation: "landscape", paperSize: 9, fitToWidth: 1, fitToHeight: 0 };
    XLSX.utils.book_append_sheet(wb, ws, "Consolidated Summary");
    const filename = `Internal_Marks_Summary_${formData.department}_${formData.year}_Sem${formData.semester}_Sec${formData.section}.xlsx`;
    XLSX.writeFile(wb, filename);
    setShowExcelMenu(false);
  };

  return (
    <div className="fade-in internal-mark-root" style={{ padding: "1.2rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* SCREEN CONTROLS & HEADER (HIDDEN IN PRINT) */}
      <div className="no-print">
        {/* Top Header Bar */}
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "18px",
          padding: "1.15rem 1.5rem",
          marginBottom: "1.25rem",
          boxShadow: "0 4px 18px rgba(15, 23, 42, 0.04)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "46px",
              height: "46px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 16px rgba(79, 70, 229, 0.28)"
            }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h1 style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                  Internal Mark Generator
                </h1>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  padding: "3px 10px",
                  borderRadius: "99px",
                  background: "rgba(99, 102, 241, 0.1)",
                  color: "#4338ca"
                }}>
                  {formData.department} • {formData.year}/{formData.semester}/{formData.section}
                </span>
              </div>
              <p style={{ color: "#64748b", margin: "2px 0 0 0", fontSize: "0.85rem" }}>
                Admin-configured mark sheet with automatic calculations, Excel export, and A4 {isPortraitMode ? "Portrait" : "Landscape"} print.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className={`btn ${userHiddenColumns.length > 0 ? "btn-warning" : "btn-secondary"}`}
              style={{ height: "40px", display: "flex", alignItems: "center", gap: "7px", fontWeight: "600", fontSize: "0.85rem", padding: "0 1rem", borderRadius: "10px" }}
              title="Hide or show specific columns on report"
            >
              {userHiddenColumns.length > 0 ? <EyeOff size={16} /> : <Eye size={16} />}
              Columns {userHiddenColumns.length > 0 ? `(${userHiddenColumns.length} Hidden)` : ""}
            </button>

            <button
              onClick={() => setIsEditingMarks(!isEditingMarks)}
              className={`btn ${isEditingMarks ? "btn-warning" : "btn-secondary"}`}
              style={{ height: "40px", display: "flex", alignItems: "center", gap: "7px", fontWeight: "600", fontSize: "0.85rem", padding: "0 1rem", borderRadius: "10px" }}
              title="Toggle inline mark editing"
            >
              <Edit3 size={16} /> {isEditingMarks ? "Lock Editing" : "Edit Inline"}
            </button>

            <div ref={excelMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowExcelMenu(prev => !prev)}
                disabled={studentsData.length === 0 && subjects.length === 0}
                className="btn btn-secondary"
                style={{
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontWeight: "700",
                  fontSize: "0.85rem",
                  padding: "0 1rem",
                  borderRadius: "10px",
                  border: "1.5px solid #10b981",
                  color: "#059669",
                  background: "rgba(16, 185, 129, 0.08)"
                }}
                title="Download Internal Marks in Excel (.xlsx)"
              >
                <Download size={16} /> Excel (.xlsx) <ChevronDown size={15} />
              </button>

              {showExcelMenu && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  minWidth: "290px",
                  background: "#ffffff",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  borderRadius: "12px",
                  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.16)",
                  padding: "8px",
                  zIndex: 50,
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <button
                    type="button"
                    onClick={handleExportCurrentSubjectExcel}
                    disabled={studentsData.length === 0}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "rgba(16, 185, 129, 0.08)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#065f46" }}>
                      1. Current Subject Sheet (.xlsx)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                      Download formatted table for {formData.selectedSubject || "selected subject"}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportAllSubjectsExcel}
                    disabled={subjects.length === 0 && studentsData.length === 0}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "rgba(99, 102, 241, 0.08)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#3730a3" }}>
                      2. All Subjects Workbook (.xlsx)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                      Separate formatted sheet for every subject ({subjects.length || 1} tabs)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSummaryExcel}
                    disabled={subjects.length === 0 && studentsData.length === 0}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "rgba(245, 158, 11, 0.09)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#92400e" }}>
                      3. Consolidated Total Summary (.xlsx)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                      All subjects&apos; final total mark side-by-side per student
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              disabled={studentsData.length === 0}
              style={{
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: "700",
                fontSize: "0.88rem",
                padding: "0 1.25rem",
                borderRadius: "10px",
                boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)"
              }}
            >
              <Printer size={17} /> Print Report
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
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {hiddenColsMsg && (
                  <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#15803d", background: "rgba(34, 197, 94, 0.12)", padding: "4px 10px", borderRadius: "99px" }}>
                    {hiddenColsMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleShowAllColumns}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "0.78rem", padding: "6px 12px", borderRadius: "8px" }}
                >
                  Show All Columns
                </button>
                <button
                  type="button"
                  onClick={handleSaveHiddenColumnsForRegulation}
                  disabled={savingHiddenCols}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: "0.78rem", padding: "6px 14px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Save size={14} /> {savingHiddenCols ? "Saving..." : `Save for Reg ${formData.regulation} (All Subjects)`}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {currentColumns.map(col => {
                const isHidden = userHiddenColumns.includes(col.colKey);
                return (
                  <button
                    key={col.colKey}
                    onClick={() => toggleColumnVisibility(col.colKey)}
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

            {/* Template Badge + Theory/Lab Mode Switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div style={{
                display: "inline-flex",
                background: "#f1f5f9",
                borderRadius: "99px",
                padding: "3px",
                border: "1px solid #cbd5e1"
              }}>
                <button
                  type="button"
                  onClick={() => applyCategoryAndResolveTemplate("Theory")}
                  style={{
                    border: "none",
                    borderRadius: "99px",
                    padding: "4px 12px",
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: selectedCategory === "Theory" ? "#4f46e5" : "transparent",
                    color: selectedCategory === "Theory" ? "#ffffff" : "#475569"
                  }}
                >
                  📘 Theory
                </button>
                <button
                  type="button"
                  onClick={() => applyCategoryAndResolveTemplate("Lab")}
                  style={{
                    border: "none",
                    borderRadius: "99px",
                    padding: "4px 12px",
                    fontSize: "0.78rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    background: selectedCategory === "Lab" ? "#db2777" : "transparent",
                    color: selectedCategory === "Lab" ? "#ffffff" : "#475569"
                  }}
                >
                  🧪 Lab
                </button>
              </div>

              {activeTemplate ? (
                <>
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
                      {activeTemplate.templateName} ({currentColumns.length} cols • {isPortraitMode ? "Portrait" : "Landscape"})
                    </span>
                  </div>
                  {internalPassMark > 0 && (
                    <div style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "6px 12px",
                      borderRadius: "30px",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      color: "#dc2626"
                    }}>
                      Pass Mark: {internalPassMark}
                    </div>
                  )}
                </>
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

              <button
                type="button"
                onClick={fetchTemplatesAndRegulations}
                title="Sync latest template settings from Admin Panel"
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "30px",
                  padding: "5px 10px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <RefreshCw size={12} /> Sync
              </button>
            </div>
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
                onChange={e => handleTargetSubjectChange(e.target.value)}
                style={{ 
                  border: "2px solid rgba(99, 102, 241, 0.3)", 
                  background: "#ffffff", 
                  fontWeight: "bold", 
                  borderRadius: "10px" 
                }}
              >
                {subjects.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}{s.isLab ? " (Lab)" : ""}</option>)}
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
                  onChange={e => handleCustomSubjectChange(e.target.value)}
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
              <span>Print Pages: <strong style={{ color: "#16a34a" }}>{formData.pageSplitMode === "2pages" ? `Fit All in ${studentPages.length} Page${studentPages.length > 1 ? "s" : ""} (${isPortraitMode ? "Portrait" : "Landscape"})` : `${formData.pageSplitMode} Mode`}</strong></span>
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
                    Print Page Layout ({isPortraitMode ? "Portrait" : "Landscape"})
                  </label>
                  <select 
                    className="input-field" 
                    value={formData.pageSplitMode} 
                    onChange={e => setFormData({ ...formData, pageSplitMode: e.target.value })}
                    style={{ background: "#ffffff", padding: "6px 10px", fontWeight: "600", borderColor: "#6366f1" }}
                  >
                    <option value="2pages">Fit All Students in 2 Pages (Balanced - Recommended)</option>
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

        {/* BROKEN/UNLINKED ADMIN FORMULA AUTO-REPAIR NOTICE (HIDDEN IN PRINT) */}
        {!loading && autoRepairedColumns.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            padding: "0.75rem 1.1rem",
            marginBottom: "1rem",
            borderRadius: "12px",
            background: "rgba(254, 243, 199, 0.75)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            color: "#92400e",
            fontSize: "0.83rem",
            fontWeight: "600"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={17} style={{ color: "#d97706", flexShrink: 0 }} />
              <span>
                Auto-calculated <strong>{autoRepairedColumns.map(c => c.heading || c.title).join(", ")}</strong> from matching exam marks because its Admin template formula was missing or unlinked. Open <em>Admin Panel → Internal Mark Templates → Edit Format</em> to verify and save permanently.
              </span>
            </div>
          </div>
        )}

        {/* SCREEN KPI OVERVIEW STRIP (HIDDEN IN PRINT) */}
        {!loading && studentsData.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "0.95rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 10px rgba(15,23,42,0.03)" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Enrolled Students</div>
                <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{screenSummaryStats.total}</div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GraduationCap size={20} />
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "0.95rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 10px rgba(15,23,42,0.03)" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Highest {finalSummaryColumn ? finalSummaryColumn.title : "Score"}
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#059669", marginTop: "2px" }}>
                  {screenSummaryStats.highest}{screenSummaryStats.maxMark ? ` / ${screenSummaryStats.maxMark}` : ""}
                </div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={20} />
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "0.95rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 10px rgba(15,23,42,0.03)" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Class Average</div>
                <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "#4338ca", marginTop: "2px" }}>{screenSummaryStats.average}</div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Calendar size={20} />
              </div>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "0.95rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 10px rgba(15,23,42,0.03)" }}>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {internalPassMark > 0 ? `Below Pass (< ${internalPassMark})` : "Print Layout"}
                </div>
                {internalPassMark > 0 ? (
                  <div style={{ fontSize: "1.45rem", fontWeight: "800", color: screenSummaryStats.belowPassCount > 0 ? "#dc2626" : "#059669", marginTop: "2px" }}>
                    {screenSummaryStats.belowPassCount}
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#64748b", marginLeft: "6px" }}>
                      ({studentPages.length}p Print)
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>
                    {studentPages.length} {isPortraitMode ? "Portrait" : "Landscape"} {studentPages.length > 1 ? "Pages" : "Page"}
                  </div>
                )}
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: internalPassMark > 0 ? "#fee2e2" : "#fff7ed", color: internalPassMark > 0 ? "#dc2626" : "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {internalPassMark > 0 ? <AlertCircle size={20} /> : <Printer size={20} />}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="no-print" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <div style={{ width: "36px", height: "36px", border: "4px solid rgba(99,102,241,0.2)", borderTop: "4px solid var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem auto" }}></div>
          Loading student marks for Regulation {formData.regulation}...
        </div>
      )}
      {/* SCREEN MODERN UI + OFFICIAL PRINT STYLES (DYNAMIC A4 LANDSCAPE / PORTRAIT) */}
      <style>{`
        .internal-mark-root .input-field {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
          color: #0f172a;
          font-size: 0.9rem;
          font-weight: 500;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .internal-mark-root .input-field:hover {
          border-color: #94a3b8;
        }
        .internal-mark-root .input-field:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
        }

        @media screen {
          .print-container {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            align-items: center;
          }
          .print-sheet {
            background: #ffffff;
            color: #0f172a;
            width: 100%;
            max-width: ${isPortraitMode ? "820px" : "1420px"};
            border: 1px solid #e2e8f0;
            padding: 24px 28px;
            box-shadow: 0 12px 32px -12px rgba(15, 23, 42, 0.1);
            border-radius: 18px;
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .print-sheet .table-responsive-wrapper {
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            overflow-x: auto;
            margin-top: 8px;
          }
          .print-sheet .mec-official-table {
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            font-size: 13px;
            color: #1e293b;
          }
          .print-sheet .mec-official-table th,
          .print-sheet .mec-official-table td {
            border: 1px solid #e2e8f0;
          }
          .print-sheet .mec-official-table thead tr:first-child th {
            background: #f1f5f9;
            color: #334155;
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            font-size: 12px;
            font-weight: 700;
            padding: 10px 8px;
            letter-spacing: 0.02em;
          }
          .print-sheet .mec-official-table thead tr.max-mark-row th {
            background: #f8fafc;
            color: #64748b;
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 8px;
          }
          .print-sheet .mec-official-table thead th.col-formula {
            background: #eef2ff;
            color: #3730a3;
          }
          .print-sheet .mec-official-table thead th.col-total {
            background: #ecfdf5;
            color: #065f46;
          }
          .print-sheet .mec-official-table tbody tr {
            height: 36px;
            transition: background-color 0.12s ease;
          }
          .print-sheet .mec-official-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          .print-sheet .mec-official-table tbody tr:hover {
            background: #eef2ff;
          }
          .print-sheet .mec-official-table tbody td {
            padding: 7px 8px;
          }
          .print-sheet .mec-official-table tbody td.col-sno {
            color: #64748b;
            font-weight: 600;
          }
          .print-sheet .mec-official-table tbody td.col-reg {
            color: #334155;
            font-variant-numeric: tabular-nums;
            font-weight: 500;
          }
          .print-sheet .mec-official-table tbody td.col-name {
            color: #0f172a;
            font-weight: 600;
          }
          .print-sheet .mec-official-table tbody td.col-formula {
            background: rgba(238, 242, 255, 0.5);
            color: #312e81;
            font-weight: 700;
          }
          .print-sheet .mec-official-table tbody td.col-total {
            background: rgba(236, 253, 245, 0.72);
            color: #047857;
            font-weight: 800;
          }
          .print-sheet .mec-official-table tbody td.cell-absent {
            color: #dc2626;
            background: rgba(254, 226, 226, 0.45);
            font-weight: 700;
          }
          .print-sheet .mec-official-table tbody tr.row-fail-mark {
            background: rgba(254, 242, 242, 0.72) !important;
          }
          .print-sheet .mec-official-table tbody tr.row-fail-mark:hover {
            background: rgba(254, 226, 226, 0.9) !important;
          }
          .print-sheet .mec-official-table tbody td.cell-fail-mark {
            background: #fee2e2 !important;
            color: #dc2626 !important;
            font-weight: 800 !important;
            box-shadow: inset 0 0 0 2px #ef4444, 0 0 14px rgba(239, 68, 68, 0.6) !important;
          }
          .editable-cell-input {
            width: 100%;
            height: 28px;
            border: 1.5px solid #6366f1;
            border-radius: 6px;
            padding: 2px 4px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #0f172a;
            background: #ffffff;
            outline: none;
          }
          .editable-cell-input:focus {
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          }
        }

        @media print {
          @page {
            size: ${isPortraitMode ? "A4 portrait" : "A4 landscape"};
            margin: ${isPortraitMode ? "6mm 7mm 11mm 7mm" : "5mm 7mm 11mm 7mm"};
            @bottom-center {
              content: "Page " counter(page) " of " counter(pages);
              font-size: 10px;
              font-family: "Times New Roman", Times, serif;
              color: #000000;
            }
          }
          .mec-official-table thead {
            display: table-header-group !important;
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
          .internal-mark-root {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-container {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            display: block !important;
            box-sizing: border-box !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            outline: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: visible !important;
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
            max-height: ${isPortraitMode ? "48px" : "40px"} !important;
          }
          .print-sheet img.mec-crest-logo {
            height: ${isPortraitMode ? "40px" : "36px"} !important;
          }
          .print-sheet h2 {
            font-size: ${isPortraitMode ? "12.5pt" : "13.5pt"} !important;
          }
          .print-bottom-block {
            margin-top: 6px !important;
            margin-bottom: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          .print-metadata-row {
            margin: 2px 0 2px 0 !important;
            font-size: ${isPortraitMode ? "9px" : "10px"} !important;
          }
          .print-signatures {
            padding: ${isPortraitMode ? "10px 8px 2px 8px" : "8px 20px 2px 20px"} !important;
            margin-bottom: 2px !important;
            font-size: ${isPortraitMode ? "9.5px" : "10px"} !important;
          }
          .mec-official-table tbody tr,
          .mec-official-table tbody tr:nth-child(even),
          .mec-official-table tbody tr:hover {
            background: #ffffff !important;
            height: ${printMetrics.rowHeight}px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .mec-official-table th,
          .mec-official-table td,
          .mec-official-table thead th.col-formula,
          .mec-official-table thead th.col-total,
          .mec-official-table thead tr.max-mark-row th,
          .mec-official-table tbody tr.row-fail-mark,
          .mec-official-table tbody tr.row-fail-mark:nth-child(even),
          .mec-official-table tbody tr.row-fail-mark:hover,
          .mec-official-table tbody td.col-formula,
          .mec-official-table tbody td.col-total,
          .mec-official-table tbody td.cell-absent,
          .mec-official-table tbody td.cell-fail-mark {
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 1px solid #000000 !important;
            padding: ${printMetrics.paddingY}px 2px !important;
            font-size: ${printMetrics.fontSize}px !important;
            line-height: 1.1 !important;
          }
          .mec-official-table th,
          .mec-official-table thead tr:first-child th,
          .mec-official-table thead tr.max-mark-row th {
            font-family: "Times New Roman", Times, serif !important;
            font-size: ${isPortraitMode ? "8.5px" : "9.5px"} !important;
          }
          .mec-official-table th.col-sno, .mec-official-table td.col-sno {
            width: ${isPortraitMode ? "26px" : "30px"} !important;
          }
          .mec-official-table th.col-reg, .mec-official-table td.col-reg {
            width: ${isPortraitMode ? "72px" : "85px"} !important;
          }
          .mec-official-table th.col-name, .mec-official-table td.col-name {
            padding-left: 4px !important;
          }
          .mec-official-table th.col-mark, .mec-official-table td.col-mark {
            width: auto !important;
          }
          .print-sheet .table-responsive-wrapper,
          .table-responsive-wrapper {
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .mec-official-table tbody td {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
          }
          .mec-official-table tbody td.col-name,
          .mec-official-table tbody td.col-sno,
          .mec-official-table tbody td.col-reg {
            font-weight: normal !important;
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
          width: auto !important;
          min-width: 75%;
          margin: 0 auto;
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
                  {/* SCREEN-ONLY PAGE BANNER STRIP (HIDDEN IN PRINT) */}
                  <div className="no-print" style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: "12px",
                    marginBottom: "14px",
                    borderBottom: "1px dashed #e2e8f0",
                    flexWrap: "wrap",
                    gap: "8px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                        color: "#ffffff",
                        fontSize: "0.76rem",
                        fontWeight: "700",
                        padding: "4px 12px",
                        borderRadius: "99px"
                      }}>
                        Page {pageNum} of {totalPages}
                      </span>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#475569" }}>
                        Rows {startSno} – {startSno + pageStudents.length - 1}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: "600", color: isEditingMarks ? "#d97706" : "#64748b" }}>
                      {isEditingMarks
                        ? "Inline Editing Mode • Changes recalculate automatically"
                        : `Screen Preview • Prints in Official A4 ${isPortraitMode ? "Portrait" : "Landscape"} Format`}
                    </span>
                  </div>

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
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "6px" }}>
                          <img 
                            src="/logo1.png" 
                            alt="MEC Logo" 
                            className="mec-crest-logo"
                            style={{ height: "48px", width: "auto", objectFit: "contain" }}
                            onError={(e) => { e.target.style.display = "none"; }}
                          />

                          <div style={{ textAlign: "center" }}>
                            <h2 style={{ fontSize: "16pt", fontWeight: "900", margin: "0", letterSpacing: "0.5px", fontFamily: '"Times New Roman", Times, serif', textTransform: "uppercase", color: "#000000" }}>
                              MUTHAYAMMAL ENGINEERING COLLEGE
                            </h2>
                            <div style={{ fontSize: "11pt", fontWeight: "bold", margin: "1px 0", color: "#000000" }}>
                              (Autonomous)
                            </div>
                            <div style={{ fontSize: "9pt", margin: 0, fontWeight: "600", color: "#000000" }}>
                              Rasipuram – 637 408, Namakkal (Dt.), Tamil Nadu, India.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Metadata Row 1 (Image 1 Format) */}
                      <div className="print-metadata-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10pt", fontWeight: "bold", margin: "4px 0 3px 0", fontFamily: '"Times New Roman", Times, serif', color: "#000000" }}>
                        <div style={{ flex: "1", textAlign: "left" }}>Dept: {formData.department}</div>
                        <div style={{ flex: "1.2", textAlign: "center" }}>Year/Sem/Sec: {formData.year}/{formData.semester}/{formData.section}</div>
                        <div style={{ flex: "2", textAlign: "center", letterSpacing: "0.5px" }}>{formData.semesterSession}</div>
                        <div style={{ flex: "1", textAlign: "right" }}>Date: {formData.date}</div>
                      </div>

                      {/* Metadata Row 2 */}
                      <div style={{ fontSize: "10pt", fontWeight: "bold", margin: "2px 0 5px 0", fontFamily: '"Times New Roman", Times, serif', textAlign: "left", color: "#000000" }}>
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
                    <table className={`mec-official-table ${formData.tableWidthMode === "autoFit" ? "auto-fit-table" : "full-width-table"}`}>
                      <thead>
                        {/* HEADER ROW 1 */}
                        <tr>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="col-sno">S.No</th>
                          <th rowSpan={hasSubHeaders ? 2 : 1} className="col-reg">Reg.No.</th>
                          <th 
                            rowSpan={hasSubHeaders ? 2 : 1} 
                            className="col-name"
                            style={{
                              width: resolvedNameColWidth,
                              maxWidth: resolvedNameColWidth
                            }}
                          >
                            Name
                          </th>
                          {visibleColumns.map((col, idx) => {
                            const isFormula = col.type === "formula" || col.type === "calculation";
                            const isTotal = finalSummaryColumn && col.colKey === finalSummaryColumn.colKey;
                            return (
                              <th key={idx} className={`col-mark ${isTotal ? "col-total" : isFormula ? "col-formula" : ""}`}>
                                {col.title}
                              </th>
                            );
                          })}
                        </tr>

                        {/* HEADER ROW 2 (MAX MARKS ROW) */}
                        {hasSubHeaders && (
                          <tr className="max-mark-row">
                            {visibleColumns.map((col, idx) => {
                              const isFormula = col.type === "formula" || col.type === "calculation";
                              const isTotal = finalSummaryColumn && col.colKey === finalSummaryColumn.colKey;
                              return (
                                <th key={idx} className={`col-mark ${isTotal ? "col-total" : isFormula ? "col-formula" : ""}`}>
                                  {col.maxMark}
                                </th>
                              );
                            })}
                          </tr>
                        )}
                      </thead>

                      <tbody>
                        {pageStudents.map((st, i) => {
                          const sNo = st.sNo || (startSno + i);
                          const globalIndex = startSno - 1 + i;
                          const finalScoreRaw = finalSummaryColumn ? (st[finalSummaryColumn.colKey] ?? st[finalSummaryColumn.heading]) : undefined;
                          const finalScoreVal = Number(finalScoreRaw);
                          const isBelowPass = Boolean(!st.isPlaceholder && internalPassMark > 0 && !isNaN(finalScoreVal) && finalScoreVal < internalPassMark);

                          return (
                            <tr key={st.regNo || i} className={isBelowPass ? "row-fail-mark" : ""}>
                              <td className="col-sno">{sNo}</td>
                              <td className="col-reg">{st.regNo || ""}</td>
                              <td 
                                className="col-name name-col" 
                                title={st.name}
                                style={{
                                  width: resolvedNameColWidth,
                                  maxWidth: resolvedNameColWidth
                                }}
                              >
                                {st.name || ""}
                              </td>

                              {visibleColumns.map((col, colIdx) => {
                                const isFormula = col.type === "formula" || col.type === "calculation";
                                const isTotal = finalSummaryColumn && col.colKey === finalSummaryColumn.colKey;
                                const rawVal = st[col.colKey] !== undefined ? st[col.colKey] : st[col.heading];

                                let displayVal = "";
                                if (isFormula) {
                                  displayVal = (rawVal !== undefined && rawVal !== null && rawVal !== "") ? rawVal : 0;
                                } else {
                                  displayVal = (rawVal !== undefined && rawVal !== null) ? rawVal : "";
                                }
                                const isAbsent = String(displayVal).trim().toUpperCase() === "AB";
                                const highlightFailBox = isTotal && isBelowPass;

                                return (
                                  <td 
                                    key={colIdx} 
                                    className={`col-mark ${highlightFailBox ? "cell-fail-mark" : isTotal ? "col-total" : isFormula ? "col-formula" : ""} ${isAbsent ? "cell-absent" : ""}`}
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

                  {/* Screen-only footer (Print renders automatic "Page X of Y" via @page @bottom-center) */}
                  <div className="no-print" style={{ textAlign: "center", fontSize: "10.5px", fontFamily: '"Times New Roman", Times, serif', marginTop: isLastPage ? "2px" : "8px" }}>
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
