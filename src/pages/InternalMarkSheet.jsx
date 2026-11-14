import React, { useState, useEffect, useMemo, useRef } from "react";
import API from "../api";
import * as XLSX from "xlsx";
import { safeGetSession } from "../utils/safeStorage";
import {
  normStr,
  normalizeRegNo,
  normalizeExam,
  findMatchingClassesForExam,
  findSubjectIndexInClass,
  findExamMarkForStudent
} from "../utils/examMatchUtils";
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

const getDefaultShortName = (subj) => {
  if (!subj) return "";
  const rawShort = String(subj.shortName || "").trim();
  if (rawShort) return rawShort.toUpperCase();
  const stopWords = new Set(["and", "of", "the", "in", "for", "to", "with", "using", "on"]);
  const words = String(subj.name || "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(w => w && !stopWords.has(w.toLowerCase()));
  if (words.length >= 2) {
    return words.map(w => w[0].toUpperCase()).join("").slice(0, 6);
  }
  if (words.length === 1) {
    return words[0].slice(0, 5).toUpperCase();
  }
  return String(subj.code || "").slice(-4).toUpperCase();
};

const getResolvedShortName = (subj, overrides = {}) => {
  if (!subj) return "";
  const custom = overrides[subj.code];
  if (typeof custom === "string" && custom.trim()) {
    return custom.trim().toUpperCase();
  }
  return getDefaultShortName(subj);
};

export default function InternalMarkSheet() {
  const [availableRegulations, setAvailableRegulations] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Theory");
  const [viewMode, setViewMode] = useState("subject"); // "subject" | "consolidated"
  const allTemplatesRef = useRef([]);
  const selectedCategoryRef = useRef("Theory");
  const viewModeRef = useRef("subject");

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

  const isPortraitMode = viewMode === "consolidated"
    ? true
    : getTemplateOrientation(activeTemplate) === "portrait";

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
    nameColWidth: "auto", // "auto" (default: Auto-Fit to student names), "160px", "200px", "240px"
    rowHeightMode: "auto", // "auto", "compact" (20px), "normal" (25px), "spacious" (30px), "extra" (36px), "custom"
    customRowHeight: 25,
    signatureSpace: 55 // Clearance (px) above Course Faculty, Year Coordinator, and HoD signatures
  });

  const [headerImage, setHeaderImage] = useState(() => localStorage.getItem("internalMarkHeaderImage") || "");
  const [studentsData, setStudentsData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentCohortRoster, setCurrentCohortRoster] = useState(null);
  const [allFetchedClasses, setAllFetchedClasses] = useState([]);
  const isAdmin = safeGetSession("role").toLowerCase() === "admin";
  const [isEditingMarks, setIsEditingMarks] = useState(false);
  const canEditInline = isAdmin && isEditingMarks;
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [userHiddenColumns, setUserHiddenColumns] = useState([]);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [savingHiddenCols, setSavingHiddenCols] = useState(false);
  const [hiddenColsMsg, setHiddenColsMsg] = useState("");
  const [showExamLinks, setShowExamLinks] = useState(false);
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const [hiddenConsolidatedSubjects, setHiddenConsolidatedSubjects] = useState([]);
  const [shortNameOverrides, setShortNameOverrides] = useState({});
  const [consolidatedEdits, setConsolidatedEdits] = useState({});
  const excelMenuRef = useRef(null);
  const syncDebounceTimersRef = useRef({});
  const [inlineSyncStatus, setInlineSyncStatus] = useState("");

  const getConsolidatedPrefsKey = (dept, year, sem, category) =>
    `internalMarkConsolidatedPrefs_${dept || "dept"}_${year || "yr"}_${sem || "sem"}_${category || "Theory"}`;

  useEffect(() => {
    const key = getConsolidatedPrefsKey(formData.department, formData.year, formData.semester, selectedCategory);
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      setHiddenConsolidatedSubjects(Array.isArray(saved?.hiddenSubjects) ? saved.hiddenSubjects : []);
      setShortNameOverrides(saved?.shortNames && typeof saved.shortNames === "object" ? saved.shortNames : {});
    } catch {
      setHiddenConsolidatedSubjects([]);
      setShortNameOverrides({});
    }
  }, [formData.department, formData.year, formData.semester, selectedCategory]);

  useEffect(() => {
    setConsolidatedEdits({});
  }, [formData.department, formData.year, formData.semester, formData.section, selectedCategory, formData.regulation]);

  const persistConsolidatedPrefs = (nextHidden, nextShortNames) => {
    const key = getConsolidatedPrefsKey(formData.department, formData.year, formData.semester, selectedCategory);
    try {
      localStorage.setItem(key, JSON.stringify({
        hiddenSubjects: nextHidden,
        shortNames: nextShortNames
      }));
    } catch {
      // Ignore storage quota or private browsing errors
    }
  };

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

  // Switch between single Subject-wise Sheet and class Consolidated Sheet (Portrait)
  const handleViewModeChange = (nextMode) => {
    const targetMode = nextMode === "consolidated" ? "consolidated" : "subject";
    viewModeRef.current = targetMode;
    setViewMode(targetMode);
    setShowColumnManager(false);
    setShowExcelMenu(false);
    if (targetMode === "subject" && !formData.isCustomSubject && formData.selectedSubject) {
      const subjObj = subjects.find(s => s.code === formData.selectedSubject);
      if (subjObj) {
        applyCategoryAndResolveTemplate(subjObj.isLab ? "Lab" : "Theory");
      }
    }
  };

  // When selected regulation changes, automatically activate matching template for active category
  const handleRegulationChange = (reg) => {
    setFormData(prev => ({ ...prev, regulation: reg }));
    const matched = resolveTemplateForRegulationAndCategory(allTemplatesRef.current, reg, selectedCategoryRef.current);
    setActiveTemplate(matched || null);
  };

  const getSemOptionsForYear = (year) => {
    switch (year) {
      case "I": return ["I", "II"];
      case "II": return ["III", "IV"];
      case "III": return ["V", "VI"];
      case "IV": return ["VII", "VIII"];
      default: return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    }
  };

  const handleYearChange = (nextYear) => {
    const validSems = getSemOptionsForYear(nextYear);
    setFormData(prev => ({
      ...prev,
      year: nextYear,
      semester: validSems.includes(prev.semester) ? prev.semester : validSems[0]
    }));
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
      const ts = Date.now();
      const [classRes, rosterRes, currSubjRes] = await Promise.all([
        API.get("/api/classes", { params: { department: formData.department, yearSemSec, _ts: ts } }),
        API.get("/api/rosters", { params: { department: formData.department, year: formData.year, semester: formData.semester, section: formData.section, _ts: ts } }),
        API.get("/api/curriculum/subjects", { params: { department: formData.department, year: formData.year, semester: formData.semester, _ts: ts } }).catch(() => ({ data: [] }))
      ]);

      const filteredClasses = classRes.data || [];
      const rosterList = rosterRes.data || [];
      const matchedRoster = rosterList[0] || null;

      setAllFetchedClasses(filteredClasses);
      setCurrentCohortRoster(matchedRoster);

      const masterLabCodes = new Set();
      const masterShortMap = {};
      (Array.isArray(currSubjRes.data) ? currSubjRes.data : []).forEach(doc => {
        (doc.subjects || []).forEach(s => {
          if (s.courseCode) {
            const normCode = String(s.courseCode).trim().toUpperCase();
            if (s.category === "Lab") {
              masterLabCodes.add(normCode);
            }
            if (s.shortName && String(s.shortName).trim() && !masterShortMap[normCode]) {
              masterShortMap[normCode] = String(s.shortName).trim();
            }
          }
        });
      });

      const courseMap = {};
      const courseShortMap = {};
      const allCourseCodes = new Set();
      const examNamesByCode = {};
      filteredClasses.forEach(c => {
        const examStr = String(c.examName || "");
        if (c.courseDetails && Array.isArray(c.courseDetails)) {
          c.courseDetails.forEach(cd => {
            if (cd.courseCode) {
              const code = cd.courseCode.trim();
              if (cd.courseName && cd.courseName.trim()) {
                courseMap[code] = cd.courseName.trim();
              } else if (!courseMap[code]) {
                courseMap[code] = code;
              }
              if (cd.shortName && cd.shortName.trim()) {
                courseShortMap[code] = cd.shortName.trim();
              }
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
        const shortName = courseShortMap[code] || masterShortMap[code.toUpperCase()] || "";
        const exList = examNamesByCode[code] || [];
        const isLab =
          masterLabCodes.has(code.toUpperCase()) ||
          /\blab\b|laboratory|practical/i.test(name) ||
          /\blab\b/i.test(code) ||
          (exList.length > 0 && exList.every(ex => /lab|practical|observation/i.test(ex)));
        return { code, name, shortName, isLab };
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
      const targetSubjShort = targetSubjObj?.shortName || "";
      const detectedCat = viewModeRef.current === "consolidated"
        ? selectedCategoryRef.current
        : nextIsCustom
          ? (/\blab\b|laboratory|practical/i.test(formData.customSubject || "") ? "Lab" : "Theory")
          : (targetSubjObj?.isLab ? "Lab" : "Theory");

      selectedCategoryRef.current = detectedCat;
      setSelectedCategory(detectedCat);
      const resolvedTpl = resolveTemplateForRegulationAndCategory(allTemplatesRef.current, formData.regulation, detectedCat) || activeTemplate;
      if (resolvedTpl && resolvedTpl._id !== activeTemplate?._id) {
        setActiveTemplate(resolvedTpl);
      }

      calculateStudentsMarks(filteredClasses, matchedRoster, targetSubj, resolvedTpl, targetSubjName, targetSubjShort);
    } catch (e) {
      console.error("Error loading class data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassAndSubjectData();
  }, [formData.department, formData.year, formData.semester, formData.section]);

  const handleSyncAll = async () => {
    await Promise.all([
      fetchTemplatesAndRegulations(),
      loadClassAndSubjectData()
    ]);
  };

  // Helper to parse numbers safely
  const parseNum = (val) => {
    if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "AB") return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
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
  const buildEvaluatedRowsForSubject = (classesList, rosterObj, targetSubject, template, targetSubjName = "", targetSubjShortName = "") => {
    if (!targetSubject) return [];

    const studentMap = {};

    // 1. Gather all students from Roster of this section
    if (rosterObj && rosterObj.students) {
      rosterObj.students.forEach(student => {
        const regKey = normalizeRegNo(student.regNo);
        if (regKey) {
          studentMap[regKey] = {
            regNo: String(student.regNo).trim(),
            name: student.name || ""
          };
        }
      });
    }

    // 2. Also gather students from uploaded classes of this section
    (classesList || []).forEach(c => {
      if (c.students && Array.isArray(c.students)) {
        c.students.forEach(st => {
          const regKey = normalizeRegNo(st.regNo);
          if (regKey && !studentMap[regKey]) {
            studentMap[regKey] = {
              regNo: String(st.regNo).trim(),
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
          const mark = findExamMarkForStudent(
            student,
            col.examName || col.title || col.heading,
            targetSubject,
            classesList || [],
            targetSubjName,
            targetSubjShortName,
            col.title || col.heading
          );
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
  const calculateStudentsMarks = (classesList, rosterObj, targetSubj, template, targetSubjName = "", targetSubjShortName = "") => {
    const targetSubject = targetSubj || (formData.isCustomSubject ? formData.customSubject : formData.selectedSubject);
    if (!targetSubject) {
      setStudentsData([]);
      return;
    }
    const matchedObj = formData.isCustomSubject ? null : subjects.find(s => s.code === targetSubject);
    const resolvedName = targetSubjName || matchedObj?.name || "";
    const resolvedShort = targetSubjShortName || matchedObj?.shortName || "";
    const evaluatedStudents = buildEvaluatedRowsForSubject(classesList, rosterObj, targetSubject, template, resolvedName, resolvedShort);
    setStudentsData(evaluatedStudents);
  };

  // Instant in-memory recalculation when subject, custom subject, or active template changes (0ms delay)
  useEffect(() => {
    if (allFetchedClasses.length > 0 || currentCohortRoster) {
      const targetSubj = formData.isCustomSubject ? formData.customSubject : formData.selectedSubject;
      const matchedObj = formData.isCustomSubject ? null : subjects.find(s => s.code === targetSubj);
      const targetSubjName = matchedObj?.name || "";
      const targetSubjShort = matchedObj?.shortName || "";
      calculateStudentsMarks(allFetchedClasses, currentCohortRoster, targetSubj, activeTemplate, targetSubjName, targetSubjShort);
    }
  }, [
    formData.selectedSubject, 
    formData.customSubject, 
    formData.isCustomSubject,
    activeTemplate
  ]);

  // Sync individual mark back to source ClassData (Mark Statement in MongoDB)
  const syncMarkToSourceClass = async (student, targetCol, value) => {
    if (!targetCol || targetCol.type !== "exam") return;
    const targetReg = student?.regNo;
    if (!targetReg) return;

    const targetSubjCode = formData.isCustomSubject ? formData.customSubject : formData.selectedSubject;
    const foundSubj = subjects.find(s => s.code === targetSubjCode);
    const targetSubjName = foundSubj ? foundSubj.name : "";
    const targetSubjShort = foundSubj ? foundSubj.shortName : "";

    const candidateExam = targetCol.examName || targetCol.title || targetCol.heading;
    const matches = findMatchingClassesForExam(allFetchedClasses, candidateExam, targetCol.title || targetCol.heading);
    const matchedCls = matches[0]?.cls;

    try {
      setInlineSyncStatus(`⏳ Saving ${targetReg} = ${value} to ${matchedCls?.examName || candidateExam}...`);
      const payload = {
        className: matchedCls?.className,
        department: formData.department,
        yearSemSec: `${formData.year}/${formData.semester}/${formData.section}`,
        examName: matchedCls?.examName || candidateExam,
        candidateExamNames: [targetCol.examName, targetCol.title, targetCol.heading].filter(Boolean),
        regNo: targetReg,
        subjectCode: targetSubjCode,
        subjectName: targetSubjName,
        mark: value,
        isAdmin: true
      };

      const res = await API.post("/api/classes/sync-student-mark", payload);

      if (res.data?.success) {
        setInlineSyncStatus(`✓ Saved ${targetReg} = ${value} to ${res.data.examName} Mark Statement`);

        // Update in-memory allFetchedClasses so subsequent operations have the new mark immediately
        if (matchedCls && Array.isArray(matchedCls.students)) {
          const normR = normalizeRegNo(targetReg);
          const stIdx = matchedCls.students.findIndex(s => normalizeRegNo(s.regNo) === normR);
          if (stIdx !== -1) {
            const sIdxInClass = findSubjectIndexInClass(matchedCls, targetSubjCode, targetSubjName, targetSubjShort);
            if (sIdxInClass !== -1) {
              const updatedMarks = [...(matchedCls.students[stIdx].marks || [])];
              while (updatedMarks.length <= sIdxInClass) updatedMarks.push("");
              updatedMarks[sIdxInClass] = String(value !== undefined && value !== null ? value : "").trim();
              matchedCls.students[stIdx].marks = updatedMarks;
              setAllFetchedClasses(prev => prev.map(c => c._id === matchedCls._id ? { ...matchedCls } : c));
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync student mark to source class:", err);
      setInlineSyncStatus(`⚠️ Sync warning: ${err.response?.data?.error || err.message}`);
    } finally {
      setTimeout(() => {
        setInlineSyncStatus(prev => prev.startsWith("✓") ? "" : prev);
      }, 4000);
    }
  };

  // Handle cell edit on screen with auto-sync to Mark Statement
  const handleCellEdit = (studentIndex, colKeyOrHeading, value) => {
    let targetStudent = null;
    let targetCol = null;

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
      targetStudent = row;
      targetCol = matchedCol;
      return updated;
    });

    // Debounced auto-save to source Mark Statement (500ms)
    if (targetCol && targetCol.type === "exam") {
      const cellTimerKey = `${studentIndex}_${colKeyOrHeading}`;
      if (syncDebounceTimersRef.current[cellTimerKey]) {
        clearTimeout(syncDebounceTimersRef.current[cellTimerKey]);
      }
      syncDebounceTimersRef.current[cellTimerKey] = setTimeout(() => {
        syncMarkToSourceClass(targetStudent, targetCol, value);
        delete syncDebounceTimersRef.current[cellTimerKey];
      }, 500);
    }
  };

  // Immediate save on blur (leaving the input)
  const handleCellBlur = (studentIndex, colKeyOrHeading, value) => {
    const cellTimerKey = `${studentIndex}_${colKeyOrHeading}`;
    if (syncDebounceTimersRef.current[cellTimerKey]) {
      clearTimeout(syncDebounceTimersRef.current[cellTimerKey]);
      delete syncDebounceTimersRef.current[cellTimerKey];
    }
    const student = studentsData[studentIndex];
    const columnsToUse = getColumnsWithKeys(
      Boolean(activeTemplate?.columns?.length) ? activeTemplate.columns : defaultMecColumns
    );
    const matchedCol = columnsToUse.find(c => c.colKey === colKeyOrHeading || c.heading === colKeyOrHeading);
    if (student && matchedCol && matchedCol.type === "exam") {
      syncMarkToSourceClass(student, matchedCol, value);
    }
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

  // Diagnostic mapping status showing which Exam class feeds each exam column
  const examLinksStatus = useMemo(() => {
    const targetCode = formData.isCustomSubject ? formData.customSubject : formData.selectedSubject;
    return visibleColumns
      .filter(c => c.type === "exam")
      .map(col => {
        const matched = findMatchingClassesForExam(
          allFetchedClasses,
          col.examName || col.title || col.heading,
          col.title || col.heading
        );
        const primaryMatch = matched[0]?.cls || null;
        const filledCount = targetCode
          ? studentsData.filter(st => {
              const v = st[col.colKey];
              return v !== "" && v !== undefined && v !== null;
            }).length
          : 0;
        return {
          heading: col.heading || col.title,
          expectedExam: col.examName || col.title || col.heading,
          matchedExam: primaryMatch?.examName || null,
          filledCount
        };
      });
  }, [visibleColumns, allFetchedClasses, studentsData, formData.selectedSubject, formData.customSubject, formData.isCustomSubject]);

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

  // Separate subjects strictly by active Theory / Lab category for Consolidated Sheet
  const consolidatedCategorySubjects = useMemo(() => {
    return subjects.filter(s => (selectedCategory === "Lab" ? s.isLab : !s.isLab));
  }, [subjects, selectedCategory]);

  const visibleConsolidatedSubjects = useMemo(() => {
    return consolidatedCategorySubjects.filter(s => !hiddenConsolidatedSubjects.includes(s.code));
  }, [consolidatedCategorySubjects, hiddenConsolidatedSubjects]);

  // Shared Consolidated evaluation engine (reused by Consolidated UI/Print & Summary Excel Export)
  const buildConsolidatedDataset = (targetSubjects, template, editsMap = {}) => {
    const rawCols = (template && Array.isArray(template.columns) && template.columns.length > 0)
      ? template.columns
      : defaultMecColumns;
    const cols = getColumnsWithKeys(rawCols);
    const summaryCol = [...cols].reverse().find(c => c.type === "formula" || c.type === "calculation")
      || cols[cols.length - 1]
      || null;
    const isSummaryFormula = Boolean(summaryCol && (summaryCol.type === "formula" || summaryCol.type === "calculation"));

    const masterStudents = {};
    const perSubjectScores = {};

    if (currentCohortRoster && Array.isArray(currentCohortRoster.students)) {
      currentCohortRoster.students.forEach(student => {
        const regKey = normalizeRegNo(student.regNo);
        if (regKey) {
          masterStudents[regKey] = {
            regNo: String(student.regNo).trim(),
            name: student.name || ""
          };
        }
      });
    }

    (allFetchedClasses || []).forEach(c => {
      if (Array.isArray(c.students)) {
        c.students.forEach(st => {
          const regKey = normalizeRegNo(st.regNo);
          if (regKey && !masterStudents[regKey]) {
            masterStudents[regKey] = {
              regNo: String(st.regNo).trim(),
              name: st.name || ""
            };
          }
        });
      }
    });

    (targetSubjects || []).forEach(subj => {
      const evalRows = buildEvaluatedRowsForSubject(
        allFetchedClasses,
        currentCohortRoster,
        subj.code,
        template,
        subj.name,
        subj.shortName
      );
      perSubjectScores[subj.code] = {};
      evalRows.forEach(st => {
        const regKey = normalizeRegNo(st.regNo);
        if (!regKey) return;
        if (!masterStudents[regKey]) {
          masterStudents[regKey] = { regNo: st.regNo, name: st.name || "" };
        } else if (!masterStudents[regKey].name && st.name) {
          masterStudents[regKey].name = st.name;
        }
        const rawTotal = summaryCol
          ? (st[summaryCol.colKey] !== undefined ? st[summaryCol.colKey] : st[summaryCol.heading])
          : "";
        perSubjectScores[subj.code][regKey] = normalizeExcelCellValue(rawTotal, isSummaryFormula);
      });
    });

    const rows = Object.entries(masterStudents)
      .map(([regKey, base]) => {
        const row = { regKey, regNo: base.regNo, name: base.name };
        (targetSubjects || []).forEach(subj => {
          const editKey = `${regKey}::${subj.code}`;
          if (editsMap[editKey] !== undefined) {
            row[subj.code] = editsMap[editKey];
          } else {
            row[subj.code] = perSubjectScores[subj.code]?.[regKey] ?? (isSummaryFormula ? 0 : "");
          }
        });
        return row;
      })
      .sort((a, b) => (a.regNo || "").localeCompare(b.regNo || "", undefined, { numeric: true }));

    return { rows, summaryCol, isSummaryFormula };
  };

  const isConsolidatedView = viewMode === "consolidated";

  const consolidatedDataset = useMemo(() => {
    if (!isConsolidatedView) {
      return { rows: [], summaryCol: finalSummaryColumn, isSummaryFormula: true };
    }
    return buildConsolidatedDataset(visibleConsolidatedSubjects, activeTemplate, consolidatedEdits);
  }, [
    isConsolidatedView,
    visibleConsolidatedSubjects,
    allFetchedClasses,
    currentCohortRoster,
    activeTemplate,
    consolidatedEdits,
    finalSummaryColumn
  ]);

  const handleConsolidatedCellEdit = (regNo, subjCode, value) => {
    const regKey = normalizeRegNo(regNo);
    if (!regKey || !subjCode) return;
    setConsolidatedEdits(prev => ({
      ...prev,
      [`${regKey}::${subjCode}`]: value
    }));
  };

  const activeRenderRows = isConsolidatedView ? consolidatedDataset.rows : studentsData;

  // Multi-page chunking: Balanced 2 Pages (Fit ONLY actual enrolled students cleanly into max 2 pages; Portrait fits more rows vertically)
  const studentPages = useMemo(() => {
    const baseList = [...activeRenderRows];

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
  }, [activeRenderRows, formData.pageSplitMode, isPortraitMode]);

  // Dynamically scale row height & font in print so Header + Table + Signatures + Page Number fit cleanly in both Landscape and Portrait A4
  const printMetrics = useMemo(() => {
    const maxRows = Math.max(1, ...studentPages.map(p => p.length));
    
    // Auto dynamic height based on row count
    let autoH;
    if (isPortraitMode) {
      if (maxRows <= 28) autoH = 24;
      else if (maxRows <= 34) autoH = 21;
      else if (maxRows <= 40) autoH = 19;
      else if (maxRows <= 46) autoH = 17;
      else autoH = Math.max(13, Math.floor(750 / maxRows));
    } else {
      if (maxRows <= 20) autoH = 24;
      else if (maxRows <= 25) autoH = 21;
      else if (maxRows <= 30) autoH = 18;
      else if (maxRows <= 35) autoH = 16;
      else autoH = Math.max(13, Math.floor(490 / maxRows));
    }

    // User-configured or auto row height
    let rowH;
    if (formData.rowHeightMode === "compact") {
      rowH = 20;
    } else if (formData.rowHeightMode === "normal") {
      rowH = 25;
    } else if (formData.rowHeightMode === "spacious") {
      rowH = 30;
    } else if (formData.rowHeightMode === "extra") {
      rowH = 36;
    } else if (formData.rowHeightMode === "custom") {
      rowH = Math.max(16, Math.min(60, Number(formData.customRowHeight) || 25));
    } else {
      rowH = autoH;
    }

    const fontSize = rowH >= 32 ? 11 : (rowH >= 26 ? 10 : (rowH >= 22 ? 9.5 : (rowH >= 18 ? 9 : 8)));
    const paddingY = rowH >= 32 ? 5 : (rowH >= 26 ? 3 : (rowH >= 22 ? 2 : 1));

    return { rowHeight: rowH, autoHeight: autoH, fontSize, paddingY };
  }, [studentPages, isPortraitMode, formData.rowHeightMode, formData.customRowHeight]);

  // Auto-fit student Name column width to longest enrolled name while keeping mark columns roomy within Portrait (~650px) or Landscape (~920px) budget
  const resolvedNameColWidth = useMemo(() => {
    if (formData.nameColWidth !== "auto") return formData.nameColWidth;
    const maxChars = activeRenderRows.reduce((mx, st) => Math.max(mx, (st.name || "").length), 14);
    const totalBudget = isPortraitMode ? 650 : 920;
    const activeMarkColCount = isConsolidatedView ? Math.max(1, visibleConsolidatedSubjects.length) : visibleColumns.length;
    const minColSpace = isPortraitMode ? (isConsolidatedView ? 44 : 36) : 40;
    const reservedForMarks = Math.max(isPortraitMode ? 185 : 240, activeMarkColCount * minColSpace);
    const maxAllowedForName = isPortraitMode
      ? Math.max(115, Math.min(200, totalBudget - reservedForMarks))
      : Math.max(145, Math.min(270, totalBudget - reservedForMarks));
    const charFactor = isPortraitMode ? 6.0 : 6.8;
    const minName = isPortraitMode ? 115 : 145;
    const desired = Math.max(minName, Math.ceil(maxChars * charFactor + 14));
    return `${Math.min(maxAllowedForName, desired)}px`;
  }, [formData.nameColWidth, activeRenderRows, isConsolidatedView, visibleConsolidatedSubjects.length, visibleColumns.length, isPortraitMode]);

  // Derived screen-only KPI stats for visual overview
  const screenSummaryStats = useMemo(() => {
    if (isConsolidatedView) {
      const rows = consolidatedDataset.rows;
      const summaryCol = consolidatedDataset.summaryCol || finalSummaryColumn;
      if (!rows.length || !visibleConsolidatedSubjects.length) {
        return { total: rows.length, highest: 0, average: "0.0", maxMark: summaryCol?.maxMark || "", belowPassCount: 0 };
      }
      const allVals = [];
      let belowPassStudents = 0;
      rows.forEach(st => {
        let studentHasFail = false;
        visibleConsolidatedSubjects.forEach(subj => {
          const n = Number(st[subj.code]);
          if (st[subj.code] !== "" && st[subj.code] !== undefined && st[subj.code] !== null && !isNaN(n)) {
            allVals.push(n);
            if (internalPassMark > 0 && n < internalPassMark) {
              studentHasFail = true;
            }
          }
        });
        if (studentHasFail) belowPassStudents += 1;
      });
      const highest = allVals.length ? Math.max(...allVals) : 0;
      const avg = allVals.length ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(1) : "0.0";
      return {
        total: rows.length,
        highest,
        average: avg,
        maxMark: summaryCol?.maxMark || "",
        belowPassCount: belowPassStudents
      };
    }

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
  }, [isConsolidatedView, consolidatedDataset, visibleConsolidatedSubjects, studentsData, finalSummaryColumn, internalPassMark]);

  const handlePrint = () => {
    window.print();
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
        : buildEvaluatedRowsForSubject(allFetchedClasses, currentCohortRoster, subj.code, activeTemplate, subj.name, subj.shortName);
      const displaySubj = subj.name ? `${subj.code} - ${subj.name}` : subj.code;
      const ws = buildSubjectWorksheet(evalRows, displaySubj);
      XLSX.utils.book_append_sheet(wb, ws, makeSafeSheetName(subj.code, usedNames));
    });

    const filename = `Internal_Marks_All_Subjects_${formData.department}_${formData.year}_Sem${formData.semester}_Sec${formData.section}.xlsx`;
    XLSX.writeFile(wb, filename);
    setShowExcelMenu(false);
  };

  // Option 3: Export Final Internal Total Consolidated Summary Across Category Subjects (.xlsx)
  const handleExportSummaryExcel = () => {
    const categoryPool = isConsolidatedView
      ? visibleConsolidatedSubjects
      : (consolidatedCategorySubjects.length > 0 ? consolidatedCategorySubjects : getExportSubjectList());
    const targetList = categoryPool;
    const { rows: consolidatedRows, summaryCol } = buildConsolidatedDataset(
      targetList,
      activeTemplate,
      isConsolidatedView ? consolidatedEdits : {}
    );

    const totalCols = Math.max(5, 3 + targetList.length);
    const lastColIdx = totalCols - 1;
    const iqacStartCol = Math.max(0, lastColIdx - 2);

    const refRow = new Array(totalCols).fill("");
    refRow[iqacStartCol] = formData.iqacRef;

    const collegeRow = new Array(totalCols).fill("");
    collegeRow[0] = "MUTHAYAMMAL ENGINEERING COLLEGE (AUTONOMOUS)";

    const addressRow = new Array(totalCols).fill("");
    addressRow[0] = "Rasipuram – 637 408, Namakkal (Dt.), Tamil Nadu, India.";

    const metaRow = new Array(totalCols).fill("");
    metaRow[0] = `Dept: ${formData.department}`;
    metaRow[2] = `Year/Sem/Sec: ${formData.year}/${formData.semester}/${formData.section}`;
    metaRow[Math.min(Math.max(3, Math.floor(totalCols * 0.48)), Math.max(3, lastColIdx - 1))] = formData.semesterSession;
    metaRow[lastColIdx] = `Date: ${formData.date}`;

    const rows = [
      refRow,
      collegeRow,
      addressRow,
      [],
      metaRow,
      []
    ];

    const headerRowIdx = rows.length;
    rows.push(["S.No", "Reg.No.", "Name", ...targetList.map(s => s.code)]);
    rows.push(["", "", "", ...targetList.map(s => getResolvedShortName(s, shortNameOverrides))]);

    let maxNameLen = 20;
    consolidatedRows.forEach((st, idx) => {
      if (st.name && st.name.length > maxNameLen) maxNameLen = st.name.length;
      rows.push([
        idx + 1,
        st.regNo,
        st.name,
        ...targetList.map(subj => (st[subj.code] !== undefined ? st[subj.code] : 0))
      ]);
    });

    rows.push([]);
    rows.push([]);
    rows.push([]);
    const sigRow = new Array(totalCols).fill("");
    sigRow[1] = "Class Advisor";
    sigRow[Math.max(2, Math.floor(totalCols * 0.5))] = "Year Co-ordinator";
    sigRow[Math.max(3, lastColIdx)] = "HoD";
    rows.push(sigRow);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!merges"] = [
      { s: { r: 0, c: iqacStartCol }, e: { r: 0, c: lastColIdx } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: headerRowIdx, c: 0 }, e: { r: headerRowIdx + 1, c: 0 } },
      { s: { r: headerRowIdx, c: 1 }, e: { r: headerRowIdx + 1, c: 1 } },
      { s: { r: headerRowIdx, c: 2 }, e: { r: headerRowIdx + 1, c: 2 } }
    ];
    ws["!cols"] = [
      { wch: 6 },
      { wch: 15 },
      { wch: Math.min(34, Math.max(22, maxNameLen + 3)) },
      ...targetList.map(s => ({
        wch: Math.max(10, String(s.code || "").length + 2, String(getResolvedShortName(s, shortNameOverrides)).length + 3)
      }))
    ];
    ws["!pageSetup"] = { orientation: "portrait", paperSize: 9, fitToWidth: 1, fitToHeight: 2 };
    const tabTitle = `Consolidated ${selectedCategory} (${summaryCol ? summaryCol.title : "Total"})`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, tabTitle);
    const filename = `Consolidated_${selectedCategory}_Internal_Marks_${formData.department}_${formData.year}_Sem${formData.semester}_Sec${formData.section}.xlsx`;
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
                {isConsolidatedView
                  ? `Consolidated ${selectedCategory} sheet across all subjects • A4 Portrait print (${visibleConsolidatedSubjects.length} subjects).`
                  : `Admin-configured mark sheet with automatic calculations, Excel export, and A4 ${isPortraitMode ? "Portrait" : "Landscape"} print.`}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Option A Inline View Mode Toggle */}
            <div style={{
              display: "inline-flex",
              background: "#f1f5f9",
              padding: "3px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              gap: "3px"
            }}>
              <button
                type="button"
                onClick={() => handleViewModeChange("subject")}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: !isConsolidatedView ? "#4f46e5" : "transparent",
                  color: !isConsolidatedView ? "#ffffff" : "#475569",
                  boxShadow: !isConsolidatedView ? "0 2px 6px rgba(79,70,229,0.28)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Subject-wise
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("consolidated")}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  padding: "7px 12px",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  background: isConsolidatedView ? "#0f766e" : "transparent",
                  color: isConsolidatedView ? "#ffffff" : "#475569",
                  boxShadow: isConsolidatedView ? "0 2px 6px rgba(15,118,110,0.28)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                Consolidated ({selectedCategory})
              </button>
            </div>

            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className={`btn ${(isConsolidatedView ? hiddenConsolidatedSubjects.length > 0 : userHiddenColumns.length > 0) ? "btn-warning" : "btn-secondary"}`}
              style={{ height: "40px", display: "flex", alignItems: "center", gap: "7px", fontWeight: "600", fontSize: "0.85rem", padding: "0 1rem", borderRadius: "10px" }}
              title={isConsolidatedView ? "Filter subjects & edit Row-2 short forms" : "Hide or show specific columns on report"}
            >
              {(isConsolidatedView ? hiddenConsolidatedSubjects.length > 0 : userHiddenColumns.length > 0) ? <EyeOff size={16} /> : <Eye size={16} />}
              {isConsolidatedView
                ? `Subjects${hiddenConsolidatedSubjects.length > 0 ? ` (${hiddenConsolidatedSubjects.length} Hidden)` : ""}`
                : `Columns${userHiddenColumns.length > 0 ? ` (${userHiddenColumns.length} Hidden)` : ""}`}
            </button>

            {isAdmin && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setIsEditingMarks(!isEditingMarks)}
                  className={`btn ${isEditingMarks ? "btn-warning" : "btn-secondary"}`}
                  style={{ height: "40px", display: "flex", alignItems: "center", gap: "7px", fontWeight: "600", fontSize: "0.85rem", padding: "0 1rem", borderRadius: "10px" }}
                  title="Toggle inline mark editing"
                >
                  <Edit3 size={16} /> {isEditingMarks ? "Lock Editing" : "Edit Inline"}
                </button>
                {inlineSyncStatus && (
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: "700",
                      padding: "4px 10px",
                      borderRadius: "8px",
                      background: inlineSyncStatus.startsWith("✓") ? "rgba(16, 185, 129, 0.15)" : inlineSyncStatus.startsWith("⏳") ? "rgba(59, 130, 246, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: inlineSyncStatus.startsWith("✓") ? "#047857" : inlineSyncStatus.startsWith("⏳") ? "#1d4ed8" : "#b45309",
                      border: inlineSyncStatus.startsWith("✓") ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(59, 130, 246, 0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {inlineSyncStatus}
                  </span>
                )}
              </div>
            )}

            <div ref={excelMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowExcelMenu(prev => !prev)}
                disabled={activeRenderRows.length === 0 && subjects.length === 0}
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
                  minWidth: "295px",
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
                    disabled={(consolidatedCategorySubjects.length === 0 && subjects.length === 0 && studentsData.length === 0) || (isConsolidatedView && visibleConsolidatedSubjects.length === 0)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: isConsolidatedView ? "1.5px solid #f59e0b" : "none",
                      background: "rgba(245, 158, 11, 0.12)",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: "700", fontSize: "0.88rem", color: "#92400e" }}>
                      3. Consolidated {selectedCategory} Summary (.xlsx)
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "2px" }}>
                      Official A4 Portrait 2-row header ({(isConsolidatedView ? visibleConsolidatedSubjects : consolidatedCategorySubjects).length} {selectedCategory} subjects)
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="btn btn-primary"
              disabled={activeRenderRows.length === 0 || (isConsolidatedView && visibleConsolidatedSubjects.length === 0)}
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

        {/* COLUMN / CONSOLIDATED SUBJECT & SHORT-FORM MANAGER DRAWER */}
        {showColumnManager && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98))",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "16px",
            padding: "1.25rem",
            marginBottom: "1.5rem",
            boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.1)"
          }}>
            {isConsolidatedView ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: "800", color: "#1e293b", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Eye size={16} color="var(--primary)" /> Consolidated {selectedCategory} Subjects & Short Forms
                    </h4>
                    <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      Toggle subjects to include on the Portrait Consolidated Sheet and customize Row-2 short labels (e.g. PS, CN, DAA, COA, WD, FDS).
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setHiddenConsolidatedSubjects([]);
                        persistConsolidatedPrefs([], shortNameOverrides);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.78rem", padding: "6px 12px", borderRadius: "8px" }}
                    >
                      Show All {selectedCategory} Subjects
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShortNameOverrides({});
                        persistConsolidatedPrefs(hiddenConsolidatedSubjects, {});
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.78rem", padding: "6px 12px", borderRadius: "8px" }}
                    >
                      Reset Short Forms
                    </button>
                  </div>
                </div>

                {consolidatedCategorySubjects.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                    No {selectedCategory} subjects found for {formData.department} {formData.year}/{formData.semester}/{formData.section}.
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                    {consolidatedCategorySubjects.map(subj => {
                      const isHidden = hiddenConsolidatedSubjects.includes(subj.code);
                      const resolvedShort = getResolvedShortName(subj, shortNameOverrides);
                      return (
                        <div
                          key={subj.code}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "12px",
                            background: isHidden ? "rgba(254, 242, 242, 0.7)" : "#ffffff",
                            border: isHidden ? "1px dashed rgba(239, 68, 68, 0.45)" : "1px solid #cbd5e1",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: "800", fontSize: "0.84rem", color: "#0f172a" }}>{subj.code}</div>
                              <div style={{ fontSize: "0.74rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={subj.name}>
                                {subj.name}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const nextHidden = isHidden
                                  ? hiddenConsolidatedSubjects.filter(c => c !== subj.code)
                                  : [...hiddenConsolidatedSubjects, subj.code];
                                setHiddenConsolidatedSubjects(nextHidden);
                                persistConsolidatedPrefs(nextHidden, shortNameOverrides);
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "99px",
                                fontSize: "0.74rem",
                                fontWeight: "700",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                border: isHidden ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(99,102,241,0.35)",
                                background: isHidden ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.1)",
                                color: isHidden ? "#dc2626" : "#4338ca",
                                flexShrink: 0
                              }}
                            >
                              {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                              {isHidden ? "Hidden" : "Shown"}
                            </button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "0.74rem", fontWeight: "700", color: "#475569", whiteSpace: "nowrap" }}>Short:</span>
                            <input
                              type="text"
                              value={shortNameOverrides[subj.code] !== undefined ? shortNameOverrides[subj.code] : resolvedShort}
                              onChange={(e) => {
                                const nextOverrides = {
                                  ...shortNameOverrides,
                                  [subj.code]: e.target.value.toUpperCase()
                                };
                                setShortNameOverrides(nextOverrides);
                                persistConsolidatedPrefs(hiddenConsolidatedSubjects, nextOverrides);
                              }}
                              maxLength={12}
                              placeholder={getDefaultShortName(subj)}
                              style={{
                                flex: 1,
                                height: "28px",
                                padding: "2px 8px",
                                borderRadius: "7px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.78rem",
                                fontWeight: "700",
                                color: "#0f172a",
                                textTransform: "uppercase"
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
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
                onClick={handleSyncAll}
                title="Sync latest templates and Mark Entry marks from server"
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
              <select className="input-field" value={formData.year} onChange={e => handleYearChange(e.target.value)} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {["I", "II", "III", "IV"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* 5. Semester */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Semester</label>
              <select className="input-field" value={formData.semester} onChange={e => setFormData({ ...formData, semester: e.target.value })} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {getSemOptionsForYear(formData.year).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 6. Section */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#64748b", textTransform: "uppercase" }}>Section</label>
              <select className="input-field" value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} style={{ borderRadius: "10px", background: "#ffffff" }}>
                {["A", "B", "C", "D", "E"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 7. Target Subject (Subject-wise) OR Consolidated Subject List Overview */}
            {isConsolidatedView ? (
              <div style={{ gridColumn: "span 2", minWidth: "260px" }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", fontSize: "0.8rem", fontWeight: "700", marginBottom: "0.45rem", color: "#0f766e", textTransform: "uppercase" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <GraduationCap size={14} /> Consolidated {selectedCategory} Subjects ({visibleConsolidatedSubjects.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowColumnManager(true)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#4f46e5",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      textDecoration: "underline",
                      textTransform: "none"
                    }}
                  >
                    Filter / Edit Short Forms
                  </button>
                </label>
                <div style={{
                  minHeight: "40px",
                  padding: "6px 10px",
                  borderRadius: "10px",
                  border: "1.5px solid rgba(15, 118, 110, 0.3)",
                  background: "#ffffff",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  {visibleConsolidatedSubjects.length === 0 ? (
                    <span style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: "600" }}>
                      No {selectedCategory} subjects active — switch Theory / Lab above or restore hidden subjects.
                    </span>
                  ) : (
                    visibleConsolidatedSubjects.map(s => (
                      <span
                        key={s.code}
                        title={s.name || s.code}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: selectedCategory === "Lab" ? "rgba(219, 39, 119, 0.09)" : "rgba(15, 118, 110, 0.1)",
                          color: selectedCategory === "Lab" ? "#9d174d" : "#0f766e",
                          border: selectedCategory === "Lab" ? "1px solid rgba(219, 39, 119, 0.25)" : "1px solid rgba(15, 118, 110, 0.25)"
                        }}
                      >
                        {s.code} ({getResolvedShortName(s, shortNameOverrides)})
                      </span>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Advanced Print & Layout Settings Toggle */}
          <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px dashed rgba(226, 232, 240, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "0.85rem", color: "#64748b", flexWrap: "wrap" }}>
              <span>Loaded Students: <strong style={{ color: "var(--primary)" }}>{activeRenderRows.length}</strong></span>
              <span>•</span>
              <span>Print Pages: <strong style={{ color: "#16a34a" }}>{formData.pageSplitMode === "2pages" ? `Fit All in ${studentPages.length} Page${studentPages.length > 1 ? "s" : ""} (${isPortraitMode ? "Portrait" : "Landscape"})` : `${formData.pageSplitMode} Mode`}</strong></span>
              <span>•</span>
              <span>Table Layout: <strong style={{ color: "#6366f1" }}>{formData.tableWidthMode === "autoFit" ? "Auto-Fit Content (Snug)" : "Full Width (100%)"}</strong></span>
              <span>•</span>
              <span>Name Col: <strong style={{ color: "#0f172a" }}>{formData.nameColWidth === "auto" ? "Auto-Fit" : formData.nameColWidth}</strong></span>
              <span>•</span>
              <span>Row Size: <strong style={{ color: "#8b5cf6" }}>{formData.rowHeightMode === "auto" ? `Auto (${printMetrics.rowHeight}px)` : `${printMetrics.rowHeight}px`}</strong></span>
              <span>•</span>
              <span>Sign Space: <strong style={{ color: "#0ea5e9" }}>{formData.signatureSpace}px</strong></span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              {!isConsolidatedView && examLinksStatus.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowExamLinks(prev => !prev)}
                  style={{ background: "transparent", border: "none", color: "#0f766e", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontWeight: "700" }}
                >
                  <Info size={14} /> Exam Links ({examLinksStatus.filter(x => x.matchedExam).length}/{examLinksStatus.length}) {showExamLinks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}

              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "700" }}
              >
                <Sliders size={14} /> {showAdvancedSettings ? "Hide Page & Layout Settings" : "Page & Layout Settings"} {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {!isConsolidatedView && showExamLinks && examLinksStatus.length > 0 && (
            <div style={{ marginTop: "0.85rem", padding: "0.9rem 1rem", background: "rgba(248, 250, 252, 0.9)", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: allFetchedClasses.length > 0 ? "8px" : 0 }}>
                {examLinksStatus.map((item, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "99px",
                      fontSize: "0.76rem",
                      fontWeight: "700",
                      background: item.matchedExam ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.1)",
                      color: item.matchedExam ? "#047857" : "#b91c1c",
                      border: item.matchedExam ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(239, 68, 68, 0.28)"
                    }}
                  >
                    {item.heading} ← {item.matchedExam ? `${item.matchedExam} (${item.filledCount} marks)` : `No class matching "${item.expectedExam}"`}
                  </span>
                ))}
              </div>
              {allFetchedClasses.length > 0 && (
                <div style={{ fontSize: "0.74rem", color: "#475569" }}>
                  Available Exam Models in {formData.year}/{formData.semester}/{formData.section}:{" "}
                  <strong>{[...new Set(allFetchedClasses.map(c => c.examName).filter(Boolean))].join(", ")}</strong>
                </div>
              )}
            </div>
          )}

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

                {/* Table Row Size / Height Adjustment */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569" }}>
                      Row Size / Height
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#8b5cf6" }}>
                      {printMetrics.rowHeight}px {formData.rowHeightMode === "auto" ? "(Auto)" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <select 
                      className="input-field" 
                      value={formData.rowHeightMode} 
                      onChange={e => setFormData(prev => ({ ...prev, rowHeightMode: e.target.value }))}
                      style={{ background: "#ffffff", padding: "6px 8px", fontWeight: "600", borderColor: "#8b5cf6", flex: 1 }}
                    >
                      <option value="auto">Auto-Fit ({printMetrics.autoHeight}px - Dynamic)</option>
                      <option value="compact">Compact (20px)</option>
                      <option value="normal">Normal / Balanced (25px)</option>
                      <option value="spacious">Spacious (30px)</option>
                      <option value="extra">Extra Large (36px)</option>
                      <option value="custom">✏️ Custom Height...</option>
                    </select>
                    {formData.rowHeightMode === "custom" && (
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, customRowHeight: Math.max(16, (Number(prev.customRowHeight) || 25) - 2) }))}
                          style={{ padding: "4px 8px", background: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                          title="Decrease Row Height"
                        >-</button>
                        <input
                          type="number"
                          min={16}
                          max={60}
                          value={formData.customRowHeight}
                          onChange={e => setFormData(prev => ({ ...prev, customRowHeight: Math.max(16, Math.min(60, parseInt(e.target.value, 10) || 25)) }))}
                          style={{ width: "52px", padding: "6px 2px", textAlign: "center", border: "1.5px solid #8b5cf6", borderRadius: "6px", fontWeight: "700" }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, customRowHeight: Math.min(60, (Number(prev.customRowHeight) || 25) + 2) }))}
                          style={{ padding: "4px 8px", background: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                          title="Increase Row Height"
                        >+</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* HoD & Faculty Signature Space (Clearance) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#475569" }}>
                      Signature Space (HoD Clearance)
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#0ea5e9" }}>
                      {formData.signatureSpace}px
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <select 
                      className="input-field" 
                      value={[35, 55, 75, 95].includes(Number(formData.signatureSpace)) ? String(formData.signatureSpace) : "custom"} 
                      onChange={e => {
                        const val = e.target.value;
                        if (val !== "custom") {
                          setFormData(prev => ({ ...prev, signatureSpace: Number(val) }));
                        }
                      }}
                      style={{ background: "#ffffff", padding: "6px 8px", fontWeight: "600", borderColor: "#0ea5e9", flex: 1 }}
                    >
                      <option value="35">Compact (35px)</option>
                      <option value="55">Standard (55px - Recommended)</option>
                      <option value="75">Spacious (75px - Large Sign/Stamp)</option>
                      <option value="95">Extra Spacious (95px)</option>
                      <option value="custom">✏️ Custom Space...</option>
                    </select>
                    {(![35, 55, 75, 95].includes(Number(formData.signatureSpace)) || formData.signatureSpace === "custom") && (
                      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, signatureSpace: Math.max(25, (Number(prev.signatureSpace) || 55) - 5) }))}
                          style={{ padding: "4px 8px", background: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                          title="Decrease Signature Space"
                        >-</button>
                        <input
                          type="number"
                          min={25}
                          max={150}
                          value={formData.signatureSpace}
                          onChange={e => setFormData(prev => ({ ...prev, signatureSpace: Math.max(25, Math.min(150, parseInt(e.target.value, 10) || 55)) }))}
                          style={{ width: "52px", padding: "6px 2px", textAlign: "center", border: "1.5px solid #0ea5e9", borderRadius: "6px", fontWeight: "700" }}
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, signatureSpace: Math.min(150, (Number(prev.signatureSpace) || 55) + 5) }))}
                          style={{ padding: "4px 8px", background: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                          title="Increase Signature Space"
                        >+</button>
                      </div>
                    )}
                  </div>
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
        {!loading && activeRenderRows.length > 0 && (!isConsolidatedView || visibleConsolidatedSubjects.length > 0) && (
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
                  {isConsolidatedView
                    ? `Highest (${selectedCategory})`
                    : `Highest ${finalSummaryColumn ? finalSummaryColumn.title : "Score"}`}
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
            max-width: ${isPortraitMode ? "900px" : "1420px"};
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
            font-size: ${isPortraitMode ? "10px" : "12px"};
            font-weight: 700;
            padding: ${isPortraitMode ? "8px 4px" : "10px 8px"};
            line-height: 1.25;
            letter-spacing: 0.01em;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .print-sheet .mec-official-table thead tr.max-mark-row th,
          .print-sheet .mec-official-table thead tr.consolidated-short-row th {
            background: #f8fafc;
            color: #334155;
            font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 700;
            padding: 5px 6px;
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
            height: ${printMetrics.rowHeight}px;
            transition: background-color 0.12s ease;
          }
          .print-sheet .mec-official-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          .print-sheet .mec-official-table tbody tr:hover {
            background: #eef2ff;
          }
          .print-sheet .mec-official-table tbody td {
            padding: ${printMetrics.paddingY + 2}px 6px;
            font-size: ${printMetrics.fontSize + 1}px;
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
          .print-sheet .mec-official-table tbody td.cell-absent,
          .print-sheet .mec-official-table tbody td.cell-fail-mark {
            background-color: rgba(239, 68, 68, 0.45) !important;
            background: rgba(239, 68, 68, 0.45) !important;
            color: #000000 !important;
            font-weight: 700 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.6) !important;
          }
          .print-sheet .mec-official-table tbody tr.row-fail-mark {
            background: transparent !important;
          }
          .print-sheet .mec-official-table tbody tr.row-fail-mark:hover {
            background: rgba(241, 245, 249, 0.8) !important;
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
            color: inherit !important;
            font-weight: inherit !important;
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
            margin-top: 8px !important;
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
            padding: 0 16px 2px 16px !important;
            min-height: ${Number(formData.signatureSpace) || 55}px !important;
            margin-top: 10px !important;
            margin-bottom: 2px !important;
            font-size: ${isPortraitMode ? "10px" : "10.5px"} !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
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
          .mec-official-table thead tr.consolidated-short-row th,
          .mec-official-table tbody tr.row-fail-mark,
          .mec-official-table tbody tr.row-fail-mark:nth-child(even),
          .mec-official-table tbody tr.row-fail-mark:hover,
          .mec-official-table tbody td.col-formula,
          .mec-official-table tbody td.col-total {
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 1px solid #000000 !important;
            padding: ${printMetrics.paddingY}px 2px !important;
            font-size: ${printMetrics.fontSize}px !important;
            line-height: 1.1 !important;
          }
          .mec-official-table tbody td.cell-fail-mark,
          .mec-official-table tbody td.cell-absent {
            background-color: rgba(239, 68, 68, 0.45) !important;
            background: rgba(239, 68, 68, 0.45) !important;
            color: #000000 !important;
            font-weight: bold !important;
            box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.6) !important;
            border: 1px solid #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .mec-official-table th,
          .mec-official-table thead tr:first-child th,
          .mec-official-table thead tr.max-mark-row th,
          .mec-official-table thead tr.consolidated-short-row th {
            font-family: "Times New Roman", Times, serif !important;
            font-size: ${isPortraitMode ? (isConsolidatedView ? "8.5px" : "8px") : "9.5px"} !important;
            font-weight: bold !important;
            line-height: 1.15 !important;
          }
          .mec-official-table th.col-mark {
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
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
          padding: 2px 3px;
          white-space: normal;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
      `}</style>

      {/* RENDER PAGES (PAGE 1 HAS FULL HEADER, PAGE 2 HAS COMPACT CONTINUATION & SIGNATURES) */}
      {!loading && activeRenderRows.length > 0 && (!isConsolidatedView || visibleConsolidatedSubjects.length > 0) && (
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
                        background: isConsolidatedView ? "linear-gradient(135deg, #0f766e, #14b8a6)" : "linear-gradient(135deg, #4f46e5, #6366f1)",
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
                        {isConsolidatedView ? ` • Consolidated ${selectedCategory}` : ""}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: "600", color: canEditInline ? "#d97706" : "#64748b" }}>
                      {canEditInline
                        ? isConsolidatedView
                          ? "Inline Consolidated Editing Mode"
                          : "Inline Editing Mode • Changes auto-save directly to source Mark Statement"
                        : `Screen Preview • Prints in Official A4 ${isPortraitMode ? "Portrait" : "Landscape"} Format`}
                    </span>
                  </div>

                  {/* TOP HEADER: PAGE 1 HAS FULL BANNER, PAGE 2 HAS COMPACT CONTINUATION */}
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

                      {/* Metadata Row 2 (Only in Subject-wise mode) */}
                      {!isConsolidatedView && (
                        <div style={{ fontSize: "10pt", fontWeight: "bold", margin: "2px 0 5px 0", fontFamily: '"Times New Roman", Times, serif', textAlign: "left", color: "#000000" }}>
                          Course Code/ Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* PAGE 2 HEADER */
                    <div>
                      {isConsolidatedView ? (
                        <div style={{ fontSize: "10.5px", fontWeight: "bold", margin: "0 0 4px 0", fontFamily: '"Times New Roman", Times, serif', textAlign: "left", color: "#000000" }}>
                          Dept: {formData.department} &nbsp;|&nbsp; Year/Sem/Sec: {formData.year}/{formData.semester}/{formData.section} &nbsp;|&nbsp; Consolidated {selectedCategory} Internal Marks
                        </div>
                      ) : (
                        <div style={{ fontSize: "11px", fontWeight: "bold", margin: "0 0 4px 0", fontFamily: '"Times New Roman", Times, serif', textAlign: "left" }}>
                          Course Code/ Name : <span style={{ fontWeight: "normal" }}>{getDisplaySubject()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TABLE WRAPPER */}
                  <div className="table-responsive-wrapper" style={{ width: "100%", overflowX: "auto" }}>
                    <table className={`mec-official-table ${formData.tableWidthMode === "autoFit" ? "auto-fit-table" : "full-width-table"}`}>
                      {isConsolidatedView ? (
                        <>
                          <thead>
                            <tr>
                              <th rowSpan={2} className="col-sno">S.No</th>
                              <th rowSpan={2} className="col-reg">Reg.No.</th>
                              <th
                                rowSpan={2}
                                className="col-name"
                                style={{
                                  width: resolvedNameColWidth,
                                  maxWidth: resolvedNameColWidth
                                }}
                              >
                                Name
                              </th>
                              {visibleConsolidatedSubjects.map(subj => (
                                <th
                                  key={subj.code}
                                  className="col-mark consolidated-code-th"
                                  title={subj.name || subj.code}
                                >
                                  {subj.code}
                                </th>
                              ))}
                            </tr>
                            <tr className="consolidated-short-row">
                              {visibleConsolidatedSubjects.map(subj => (
                                <th
                                  key={subj.code}
                                  className="col-mark consolidated-short-th"
                                  title={subj.name || subj.code}
                                >
                                  {getResolvedShortName(subj, shortNameOverrides)}
                                </th>
                              ))}
                            </tr>
                          </thead>

                          <tbody>
                            {pageStudents.map((st, i) => {
                              const sNo = st.sNo || (startSno + i);
                              return (
                                <tr key={st.regNo || i}>
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

                                  {visibleConsolidatedSubjects.map(subj => {
                                    const rawVal = st[subj.code];
                                    const displayVal = rawVal !== undefined && rawVal !== null ? rawVal : "";
                                    const numVal = Number(displayVal);
                                    const isAbsent = String(displayVal).trim().toUpperCase() === "AB";
                                    const isBelowPass = Boolean(
                                      !st.isPlaceholder &&
                                      internalPassMark > 0 &&
                                      displayVal !== "" &&
                                      !isNaN(numVal) &&
                                      numVal < internalPassMark
                                    );
                                    const isFailMark = isBelowPass || isAbsent;
                                    return (
                                      <td
                                        key={subj.code}
                                        className={`col-mark ${isBelowPass ? "cell-fail-mark" : ""} ${isAbsent ? "cell-absent" : ""}`}
                                        style={{
                                          backgroundColor: isFailMark ? "rgba(239, 68, 68, 0.45)" : undefined,
                                          WebkitPrintColorAdjust: "exact",
                                          printColorAdjust: "exact",
                                          fontWeight: isFailMark ? "bold" : "normal",
                                          color: isFailMark ? "#000000" : undefined
                                        }}
                                      >
                                        {canEditInline && !st.isPlaceholder ? (
                                          <input
                                            className="editable-cell-input"
                                            value={displayVal}
                                            onChange={e => handleConsolidatedCellEdit(st.regNo, subj.code, e.target.value)}
                                            style={{
                                              fontWeight: isFailMark ? "bold" : "normal",
                                              color: isFailMark ? "#000000" : undefined
                                            }}
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
                        </>
                      ) : (
                        <>
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
                                    const numVal = Number(displayVal);
                                    const isColBelowPass = Boolean(
                                      !st.isPlaceholder && (
                                        highlightFailBox ||
                                        (col.passMark && Number(col.passMark) > 0 && displayVal !== "" && !isNaN(numVal) && numVal < Number(col.passMark))
                                      )
                                    );
                                    const isFailMark = isColBelowPass || isAbsent;

                                    return (
                                      <td 
                                        key={colIdx} 
                                        className={`col-mark ${isColBelowPass ? "cell-fail-mark" : isTotal ? "col-total" : isFormula ? "col-formula" : ""} ${isAbsent ? "cell-absent" : ""}`}
                                        style={{ 
                                          fontWeight: isFormula || isFailMark ? "bold" : "normal",
                                          backgroundColor: isFailMark ? "rgba(239, 68, 68, 0.45)" : undefined,
                                          WebkitPrintColorAdjust: "exact",
                                          printColorAdjust: "exact",
                                          color: isFailMark ? "#000000" : undefined
                                        }}
                                      >
                                        {canEditInline && !isFormula && !st.isPlaceholder ? (
                                          <input 
                                            className="editable-cell-input" 
                                            value={displayVal} 
                                            onChange={e => handleCellEdit(globalIndex, col.colKey, e.target.value)} 
                                            onBlur={e => handleCellBlur(globalIndex, col.colKey, e.target.value)}
                                            style={{
                                              fontWeight: isFailMark ? "bold" : "normal",
                                              color: isFailMark ? "#000000" : undefined
                                            }}
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
                        </>
                      )}
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
                      minHeight: `${Number(formData.signatureSpace) || 55}px`, 
                      padding: "0 20px 4px 20px", 
                      marginTop: "14px", 
                      fontWeight: "bold", 
                      fontSize: "11px", 
                      fontFamily: '"Times New Roman", Times, serif' 
                    }}>
                      <div style={{ textAlign: "center", minWidth: "120px" }}>
                        <div>{isConsolidatedView ? "Class Advisor" : "Course Faculty"}</div>
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

      {/* EMPTY CONSOLIDATED SUBJECTS STATE */}
      {!loading && isConsolidatedView && activeRenderRows.length > 0 && visibleConsolidatedSubjects.length === 0 && (
        <div className="no-print" style={{ textAlign: "center", padding: "2.5rem", background: "var(--bg-secondary)", borderRadius: "16px", border: "1px dashed var(--border-color)", marginTop: "1rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", margin: "0 0 0.75rem 0", fontWeight: "600" }}>
            {consolidatedCategorySubjects.length === 0
              ? `No ${selectedCategory} courses found for ${formData.department} ${formData.year}/${formData.semester}/${formData.section}.`
              : `All ${selectedCategory} courses are currently hidden on the Consolidated Sheet.`}
          </p>
          {consolidatedCategorySubjects.length === 0 ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => applyCategoryAndResolveTemplate(selectedCategory === "Lab" ? "Theory" : "Lab")}
            >
              Switch to {selectedCategory === "Lab" ? "Theory" : "Lab"} Consolidated Sheet
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setHiddenConsolidatedSubjects([]);
                persistConsolidatedPrefs([], shortNameOverrides);
              }}
            >
              Show All {selectedCategory} Subjects
            </button>
          )}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && activeRenderRows.length === 0 && (
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
