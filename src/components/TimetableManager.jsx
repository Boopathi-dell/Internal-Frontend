import React, { useState, useEffect, useMemo } from "react";
import API from "../api";
import { 
  Calendar, Clock, Users, BookOpen, Sparkles, CheckCircle2, 
  AlertTriangle, RefreshCw, Plus, Trash2, Edit3, Save, Download, 
  Printer, Filter, Search, Layers, ChevronRight, UserCheck, X,
  Lock, Unlock, History
} from "lucide-react";
import headerLogo from "../assets/logo image.jpg";

export const DEFAULT_PERIOD_TIMINGS = {
  1: "09:10 - 10:05",
  2: "10:05 - 11:00",
  teaBreak: "11:00 - 11:15",
  3: "11:15 - 12:10",
  4: "12:10 - 01:00",
  lunchBreak: "01:00 - 01:45",
  5: "01:45 - 02:40",
  6: "02:40 - 03:35",
  7: "03:35 - 04:30"
};

export default function TimetableManager() {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState("allocation"); // "allocation", "schedule", "master"
  
  // Master Filters
  const [department, setDepartment] = useState("CSE");
  const [academicYear, setAcademicYear] = useState(() => {
    try {
      return localStorage.getItem("timetable_selected_academic_year") || "2026-2027";
    } catch (e) {
      return "2026-2027";
    }
  });
  const [semesterType, setSemesterType] = useState("Odd"); // "Odd" (Sem 3, 5, 7) or "Even" (Sem 4, 6, 8)
  const [yearFilter, setYearFilter] = useState("All"); // "All", "II", "III", "IV"
  const [sectionFilter, setSectionFilter] = useState("All"); // "All", "A", "B", "C", "D"

  // Academic Years List (Preset + Saved in localStorage)
  const [academicYearList, setAcademicYearList] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_academic_years");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ["2024-2025", "2025-2026", "2026-2027", "2027-2028", "2028-2029"];
  });

  const [isAddingCustomYear, setIsAddingCustomYear] = useState(false);
  const [customAcademicYearInput, setCustomAcademicYearInput] = useState("");

  // Ensure current academicYear is always included in the list
  useEffect(() => {
    if (academicYear && !academicYearList.includes(academicYear)) {
      setAcademicYearList(prev => [...prev, academicYear].sort());
    }
  }, [academicYear, academicYearList]);

  // Handler for adding custom academic year
  const handleAddCustomAcademicYear = (inputVal) => {
    const raw = (inputVal !== undefined ? inputVal : customAcademicYearInput).trim();
    if (!raw) {
      showAlert("Please enter an Academic Year (e.g. 2027-2028)", "error");
      return;
    }

    // Normalize input: e.g. "2027 - 2028" -> "2027-2028"
    const cleaned = raw.replace(/\s*[-/]\s*/g, "-").replace(/\s+/g, "");
    if (!cleaned) {
      showAlert("Invalid Academic Year format", "error");
      return;
    }

    let updatedList = [...academicYearList];
    if (!updatedList.includes(cleaned)) {
      updatedList = [...updatedList, cleaned].sort();
      setAcademicYearList(updatedList);
      try {
        localStorage.setItem("timetable_academic_years", JSON.stringify(updatedList));
      } catch (e) {}
    }

    setAcademicYear(cleaned);
    try {
      localStorage.setItem("timetable_selected_academic_year", cleaned);
    } catch (e) {}
    setIsAddingCustomYear(false);
    setCustomAcademicYearInput("");
    showAlert(`Academic Year ${cleaned.includes("-") ? cleaned.replace("-", " - ") : cleaned} selected!`);
  };

  // Intake Sections per Year (e.g. I: A, B; II: A, B; III: A, B; IV: A, B, C)
  const [yearSections, setYearSections] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_year_sections");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed["I"]) parsed["I"] = ["A", "B"];
        return parsed;
      }
    } catch (e) {}
    return {
      "I": ["A", "B"],
      "II": ["A", "B"],
      "III": ["A", "B"],
      "IV": ["A", "B", "C"]
    };
  });

  // Custom Section text inputs per year (e.g. { "II": "E", "IV": "F" })
  const [customSectionInputs, setCustomSectionInputs] = useState({});

  // Dynamic section badge styling helper (supports A, B, C, D, E, F, etc.)
  const getSectionBadgeStyle = (section) => {
    const s = String(section || "A").trim().toUpperCase();
    if (s === "A") {
      return { bg: "rgba(59, 130, 246, 0.18)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.4)" };
    } else if (s === "B") {
      return { bg: "rgba(168, 85, 247, 0.18)", text: "#c084fc", border: "rgba(168, 85, 247, 0.4)" };
    } else if (s === "C") {
      return { bg: "rgba(245, 158, 11, 0.18)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.4)" };
    } else if (s === "D") {
      return { bg: "rgba(16, 185, 129, 0.18)", text: "#34d399", border: "rgba(16, 185, 129, 0.4)" };
    } else if (s === "E") {
      return { bg: "rgba(244, 63, 94, 0.18)", text: "#fb7185", border: "rgba(244, 63, 94, 0.4)" };
    } else if (s === "F") {
      return { bg: "rgba(6, 182, 212, 0.18)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.4)" };
    }
    return { bg: "rgba(148, 163, 184, 0.18)", text: "#94a3b8", border: "rgba(148, 163, 184, 0.4)" };
  };

  // Class Advisor mapping per classKey: { "II-A": "Dr. Rajesh", "IV-A": "A.Mehala" }
  const [classAdvisors, setClassAdvisors] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_class_advisors");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // Official IQAC Number (Editable from Time Table Admin tab)
  const [iqacNumber, setIqacNumber] = useState(() => {
    try {
      return localStorage.getItem("timetable_iqac_number") || "MEC/IQAC/2026 - 27/CSE/006";
    } catch (e) {
      return "MEC/IQAC/2026 - 27/CSE/006";
    }
  });

  // Official Hall Numbers per classKey (e.g. { "II-A": "LH-1", "IV-B": "LH-2" })
  const [hallNumbers, setHallNumbers] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_hall_numbers");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "I-A": "LH-1", "I-B": "LH-2",
      "II-A": "LH-3", "II-B": "LH-4", "II-C": "LH-5",
      "III-A": "LH-6", "III-B": "LH-7", "III-C": "LH-8",
      "IV-A": "LH-9", "IV-B": "LH-10", "IV-C": "LH-11"
    };
  });

  // Official Coordinators and Incharges
  const [coordinators, setCoordinators] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_coordinators");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      examCoordinator: "Mrs.M.Logapriya, AP/CSE",
      placementCoordinator: "Mrs.M.Buvaneswari, AP/CSE",
      timetableIncharge: "TIME TABLE INCHARGE",
      hod: "HOD"
    };
  });

  // Printable Academic Year Override (for Print Modals)
  const [printAcademicYear, setPrintAcademicYear] = useState(() => {
    try {
      return localStorage.getItem("timetable_print_academic_year") || "2026-2027";
    } catch (e) {
      return "2026-2027";
    }
  });

  // Sync printAcademicYear whenever main academicYear changes
  useEffect(() => {
    if (academicYear) {
      setPrintAcademicYear(academicYear);
      try {
        localStorage.setItem("timetable_print_academic_year", academicYear);
      } catch (e) {}
    }
  }, [academicYear]);

  // Letter Template Header data
  const [letterTemplateData, setLetterTemplateData] = useState(null);

  // Print Modals
  const [showClassPrintModal, setShowClassPrintModal] = useState(false);
  const [showFacultyPrintModal, setShowFacultyPrintModal] = useState(false);

  // Version History & Lock Modals/States
  const [historyList, setHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [lockingSchedule, setLockingSchedule] = useState(false);

  // Period Timings Configuration States (Admin Controlled)
  const [periodTimings, setPeriodTimings] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_period_timings");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_PERIOD_TIMINGS;
  });
  const [showTimingsModal, setShowTimingsModal] = useState(false);
  const [tempTimings, setTempTimings] = useState(DEFAULT_PERIOD_TIMINGS);
  const [savingTimings, setSavingTimings] = useState(false);

  // Roman Numeral Semester Helper
  const getRomanSem = (year, semType) => {
    if (year === "II") return semType === "Odd" ? "III" : "IV";
    if (year === "III") return semType === "Odd" ? "V" : "VI";
    if (year === "IV") return semType === "Odd" ? "VII" : "VIII";
    return semType === "Odd" ? "I" : "II";
  };

  // Helper to format Faculty with Designation and Department
  const formatFacultyInfo = (facName) => {
    if (!facName || facName === "-") return "-";
    const staff = staffList.find(s => s.name?.trim().toLowerCase() === facName.trim().toLowerCase());
    let desig = "AP";
    if (staff && staff.designation) {
      const dLow = staff.designation.toLowerCase();
      if (dLow.includes("associate")) desig = "ASP";
      else if (dLow.includes("head") || dLow.includes("hod")) desig = "Prof & Head";
      else if (dLow.includes("prof")) desig = "Prof";
      else if (dLow.includes("assistant")) desig = "AP";
      else desig = staff.designation;
    }
    const dept = (staff && staff.department) || department || "CSE";
    return `${facName}, ${desig}/${dept}`;
  };

  // Modal state for manual slot editing
  const [slotEditModal, setSlotEditModal] = useState(null);

  // Staff and Subject State
  const [staffList, setStaffList] = useState([]);
  const [subjectMasters, setSubjectMasters] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedStaffFilter, setSelectedStaffFilter] = useState("");
  
  // Generated Timetable State
  const [timetableSchedule, setTimetableSchedule] = useState(null);
  const [facultySchedules, setFacultySchedules] = useState({});
  const [selectedScheduleView, setSelectedScheduleView] = useState("class"); // "class" or "faculty"
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [selectedFacultyView, setSelectedFacultyView] = useState("");

  // Loading & Alert States
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);

  const PRESET_DESIGNATIONS = [
    "Assistant Professor",
    "Associate Professor",
    "Professor",
    "Professor & Head",
    "Teaching Assistant (TA)",
    "Lab Assistant"
  ];

  const PRESET_SUBJECT_TYPES = [
    "Theory",
    "Laboratory",
    "Project Work",
    "Seminar",
    "Library",
    "Placement / Soft Skills",
    "Mentoring / Tutor Ward",
    "NPTEL / Online Course"
  ];

  const [editingStaffId, setEditingStaffId] = useState(null);
  const [isCustomDesignation, setIsCustomDesignation] = useState(false);
  const [customDesignationText, setCustomDesignationText] = useState("");

  const [editingSubject, setEditingSubject] = useState(null); // { masterId, originalCode, batch, year, semester }

  const [newStaff, setNewStaff] = useState({
    name: "",
    staffCode: "",
    designation: "Assistant Professor",
    department: "CSE",
    maxHoursPerWeek: 18,
    maxTheory: 2,
    maxLab: 2
  });

  const [isCustomSubjectType, setIsCustomSubjectType] = useState(false);
  const [customSubjectTypeText, setCustomSubjectTypeText] = useState("");

  const [isCustomSlotPattern, setIsCustomSlotPattern] = useState(false);
  const [customSlotPatternText, setCustomSlotPatternText] = useState("");

  const [subjectForm, setSubjectForm] = useState(() => ({
    batch: "2023-2027",
    year: "II",
    semester: 3,
    department: "CSE",
    code: "",
    name: "",
    shortName: "",
    type: "Theory",
    difficulty: "Normal",
    isTraining: false,
    slotPattern: "regular",
    hoursPerWeek: 4
  }));

  // Synchronize subjectForm semester when semesterType changes
  useEffect(() => {
    const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    if (!validSems.includes(Number(subjectForm.semester))) {
      const defaultSem = semesterType === "Odd" 
        ? (subjectForm.year === "I" ? 1 : (subjectForm.year === "II" ? 3 : (subjectForm.year === "III" ? 5 : 7)))
        : (subjectForm.year === "I" ? 2 : (subjectForm.year === "II" ? 4 : (subjectForm.year === "III" ? 6 : 8)));
      setSubjectForm(prev => ({ ...prev, semester: defaultSem }));
    }
  }, [semesterType]);

  const getTypeBadgeDetails = (type) => {
    const t = (type || "Theory").toLowerCase();
    if (t.includes("lab")) return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)", icon: "🔬" };
    if (t.includes("project")) return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)", icon: "🚀" };
    if (t.includes("seminar")) return { bg: "rgba(6, 182, 212, 0.15)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)", icon: "🎤" };
    if (t.includes("library")) return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)", icon: "📚" };
    if (t.includes("training")) return { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "rgba(236, 72, 153, 0.3)", icon: "🎯" };
    if (t.includes("placement")) return { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "rgba(236, 72, 153, 0.3)", icon: "💼" };
    if (t.includes("mentor") || t.includes("tutor")) return { bg: "rgba(14, 165, 233, 0.15)", text: "#38bdf8", border: "rgba(14, 165, 233, 0.3)", icon: "👥" };
    return { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "rgba(99, 102, 241, 0.3)", icon: "📘" };
  };

  const getDifficultyBadgeDetails = (diff) => {
    const d = diff || "Normal";
    if (d === "Tough") {
      return { 
        label: "Tough", 
        icon: "🔥", 
        bg: "rgba(239, 68, 68, 0.15)", 
        text: "#f87171", 
        border: "rgba(239, 68, 68, 0.35)",
        tooltip: "Tough / Analytical: Strictly blocks Period 7 & avoids Period 6. Morning priority." 
      };
    }
    if (d === "Light") {
      return { 
        label: "Light", 
        icon: "🍃", 
        bg: "rgba(16, 185, 129, 0.15)", 
        text: "#34d399", 
        border: "rgba(16, 185, 129, 0.35)",
        tooltip: "Light / Leisure: Afternoon priority (Period 5-7)." 
      };
    }
    return { 
      label: "Normal", 
      icon: "📘", 
      bg: "rgba(148, 163, 184, 0.15)", 
      text: "#cbd5e1", 
      border: "rgba(148, 163, 184, 0.3)",
      tooltip: "Normal: Balanced across morning & afternoon periods." 
    };
  };

  // Load initial data
  useEffect(() => {
    fetchStaff();
    fetchSubjectsAndAllocations();
    fetchSavedSchedule();
    fetchHistory();
  }, [department, academicYear, semesterType]);

  const showAlert = (text, type = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // 1. Fetch Staff List
  const fetchStaff = async () => {
    try {
      const res = await API.get(`/api/timetable/staff?department=${department}`);
      setStaffList(res.data);
      if (res.data.length > 0 && !selectedFacultyView) {
        setSelectedFacultyView(res.data[0].name);
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  // Sync staff from registered Users
  const handleSyncUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/users"); // fallback check
    } catch (e) {}

    try {
      const res = await API.post("/api/timetable/staff/sync-users");
      showAlert(res.data.message || "Synced approved faculty successfully!");
      fetchStaff();
    } catch (err) {
      showAlert("Failed to sync faculty: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  // Synchronize curriculum subjects with saved staff allocations across all configured sections
  const syncAllocationsWithCurriculum = (masters, existingAllocations, currentSections = yearSections) => {
    const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    const allocMap = {};
    (existingAllocations || []).forEach(a => {
      if (a && a.subjectCode) {
        if (a.semester) {
          allocMap[`${a.year}-${a.semester}-${a.section || "A"}-${a.subjectCode.toUpperCase()}`] = a;
        }
        allocMap[`${a.year}-${a.section || "A"}-${a.subjectCode.toUpperCase()}`] = a;
      }
    });

    const merged = [];
    const seen = new Set();

    (masters || []).forEach(m => {
      if (validSems.includes(Number(m.semester))) {
        // Get configured sections for this master's year (e.g. IV -> ["A", "B", "C"])
        const sectionsForYear = (currentSections && currentSections[m.year]) || ["A", "B"];

        sectionsForYear.forEach(sec => {
          (m.subjects || []).forEach(sub => {
            if (!sub.code) return;
            const codeUpper = sub.code.toUpperCase();
            const key = `${m.year}-${sec}-${codeUpper}`;
            if (!seen.has(key)) {
              seen.add(key);
              const existing = allocMap[`${m.year}-${m.semester}-${sec}-${codeUpper}`] || allocMap[`${m.year}-${sec}-${codeUpper}`];
              const resolvedPattern = sub.slotPattern || (existing?.slotPattern ? existing.slotPattern : "regular");
              const resolvedIsTraining = resolvedPattern !== "regular";
              merged.push({
                id: key,
                year: m.year,
                semester: Number(m.semester),
                section: sec,
                subjectCode: codeUpper,
                subjectName: sub.name,
                shortName: sub.shortName || codeUpper,
                type: sub.type || "Theory",
                difficulty: sub.difficulty || existing?.difficulty || "Normal",
                isTraining: resolvedIsTraining,
                slotPattern: resolvedPattern,
                hoursPerWeek: Number(sub.hoursPerWeek) || (sub.type?.toLowerCase().includes("lab") ? 3 : 4),
                facultyNames: existing ? (existing.facultyNames || []) : []
              });
            }
          });
        });
      }
    });

    // Sort by Year (I, II, III, IV), Section (A, B, C), then Subject Code
    const yearOrder = { "I": 1, "II": 2, "III": 3, "IV": 4 };
    merged.sort((a, b) => {
      const yA = yearOrder[a.year] || 99;
      const yB = yearOrder[b.year] || 99;
      if (yA !== yB) return yA - yB;
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      return a.subjectCode.localeCompare(b.subjectCode);
    });

    return merged;
  };

  // 2. Fetch Both Subjects and Allocations Concurrently (Zero Race Condition)
  const fetchSubjectsAndAllocations = async () => {
    try {
      const [subjectsRes, allocRes] = await Promise.all([
        API.get(`/api/timetable/subjects?department=${department}`),
        API.get(`/api/timetable/allocation?department=${department}&academicYear=${academicYear}&semesterType=${semesterType}`)
      ]);

      const masters = subjectsRes.data || [];
      const savedAllocations = allocRes.data?.allocations || [];

      // Update sections from DB if available
      let activeSections = yearSections;
      if (allocRes.data?.yearSections && Object.keys(allocRes.data.yearSections).length > 0) {
        activeSections = allocRes.data.yearSections;
        setYearSections(activeSections);
        localStorage.setItem("timetable_year_sections", JSON.stringify(activeSections));
      }

      // Update class advisors from DB if available, else reset to empty for current semester
      if (allocRes.data?.classAdvisors && Object.keys(allocRes.data.classAdvisors).length > 0) {
        setClassAdvisors(allocRes.data.classAdvisors);
        localStorage.setItem("timetable_class_advisors", JSON.stringify(allocRes.data.classAdvisors));
      } else {
        setClassAdvisors({});
      }

      // Update IQAC number from DB if available
      if (allocRes.data?.iqacNumber) {
        setIqacNumber(allocRes.data.iqacNumber);
        localStorage.setItem("timetable_iqac_number", allocRes.data.iqacNumber);
      }

      // Update Hall numbers from DB if available
      if (allocRes.data?.hallNumbers && Object.keys(allocRes.data.hallNumbers).length > 0) {
        setHallNumbers(allocRes.data.hallNumbers);
        localStorage.setItem("timetable_hall_numbers", JSON.stringify(allocRes.data.hallNumbers));
      }

      // Update Coordinators from DB if available
      if (allocRes.data?.coordinators && Object.keys(allocRes.data.coordinators).length > 0) {
        setCoordinators(allocRes.data.coordinators);
        localStorage.setItem("timetable_coordinators", JSON.stringify(allocRes.data.coordinators));
      }

      // Update Period Timings from DB if available
      if (allocRes.data?.periodTimings && Object.keys(allocRes.data.periodTimings).length > 0) {
        setPeriodTimings(allocRes.data.periodTimings);
        localStorage.setItem("timetable_period_timings", JSON.stringify(allocRes.data.periodTimings));
      }

      setSubjectMasters(masters);

      // Merge saved faculty allocations with full curriculum master across all sections
      setAllocations(() => {
        return syncAllocationsWithCurriculum(masters, savedAllocations, activeSections);
      });
    } catch (err) {
      console.error("Failed to load subjects and allocations", err);
    }
  };

  // Fetch Letter Template header logo
  useEffect(() => {
    API.get("/api/letter-template")
      .then(res => {
        if (res.data) setLetterTemplateData(res.data);
      })
      .catch(e => console.log("Letter template header not loaded:", e));
  }, []);

  // Admin section intake count changer (1 to 5+ sections per year)
  const handleUpdateYearSectionCount = (targetYear, count) => {
    const allSecLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const newSecs = allSecLetters.slice(0, count);

    const updated = {
      ...yearSections,
      [targetYear]: newSecs
    };

    setYearSections(updated);
    localStorage.setItem("timetable_year_sections", JSON.stringify(updated));

    // Resync allocations with new sections
    setAllocations(prev => syncAllocationsWithCurriculum(subjectMasters, prev, updated));
    showAlert(`${targetYear} Year configured with ${count} Section(s): ${newSecs.join(", ")}!`);
  };

  // Add custom section (e.g. E, F, or custom naming)
  const handleAddCustomSection = (targetYear) => {
    const rawInput = (customSectionInputs[targetYear] || "").trim();
    if (!rawInput) {
      return showAlert("Please enter a section name or letter (e.g. E, F)", "error");
    }
    const cleanSec = rawInput.toUpperCase().replace(/^SEC(TION)?\s*/i, "").trim();
    if (!cleanSec) {
      return showAlert("Invalid section name", "error");
    }

    const currentSecs = (yearSections && yearSections[targetYear]) || ["A"];
    if (currentSecs.includes(cleanSec)) {
      return showAlert(`Section ${cleanSec} already exists for ${targetYear} Year!`, "error");
    }

    const updatedSecs = [...currentSecs, cleanSec].sort();
    const updated = {
      ...yearSections,
      [targetYear]: updatedSecs
    };

    setYearSections(updated);
    localStorage.setItem("timetable_year_sections", JSON.stringify(updated));

    // Clear input
    setCustomSectionInputs(prev => ({ ...prev, [targetYear]: "" }));

    // Resync allocations with new sections
    setAllocations(prev => syncAllocationsWithCurriculum(subjectMasters, prev, updated));
    showAlert(`Added Section ${cleanSec} to ${targetYear} Year! Now has ${updatedSecs.length} sections (${updatedSecs.join(", ")}).`);
  };

  // Remove section with confirmation
  const handleRemoveSection = (targetYear, sectionToRemove) => {
    const currentSecs = (yearSections && yearSections[targetYear]) || [];
    if (currentSecs.length <= 1) {
      return showAlert(`At least 1 section is required for ${targetYear} Year!`, "error");
    }

    if (!window.confirm(`Are you sure you want to remove Section ${sectionToRemove} from ${targetYear} Year? Allocated subjects for this section will also be removed.`)) {
      return;
    }

    const updatedSecs = currentSecs.filter(s => s !== sectionToRemove);
    const updated = {
      ...yearSections,
      [targetYear]: updatedSecs
    };

    setYearSections(updated);
    localStorage.setItem("timetable_year_sections", JSON.stringify(updated));

    // Resync allocations
    setAllocations(prev => syncAllocationsWithCurriculum(subjectMasters, prev, updated));
    showAlert(`Removed Section ${sectionToRemove} from ${targetYear} Year.`);
  };

  // 3. Fetch Saved Schedule
  const fetchSavedSchedule = async () => {
    try {
      const res = await API.get(
        `/api/timetable/schedule?department=${department}&academicYear=${academicYear}&semesterType=${semesterType}`
      );
      if (res.data && res.data.classes && res.data.classes.length > 0) {
        setTimetableSchedule(res.data);
        if (res.data.periodTimings && Object.keys(res.data.periodTimings).length > 0) {
          setPeriodTimings(res.data.periodTimings);
          localStorage.setItem("timetable_period_timings", JSON.stringify(res.data.periodTimings));
        }
        if (!selectedClassKey && res.data.classes[0]) {
          setSelectedClassKey(res.data.classes[0].classKey);
        }
      } else {
        setTimetableSchedule(null);
      }
    } catch (err) {
      console.error("Failed to load saved schedule", err);
      setTimetableSchedule(null);
    }
  };

  // 4. Fetch Timetable Version History
  const fetchHistory = async () => {
    try {
      const res = await API.get(
        `/api/timetable/history?department=${department}&academicYear=${academicYear}&semesterType=${semesterType}`
      );
      setHistoryList(res.data || []);
    } catch (err) {
      console.error("Failed to load history versions", err);
    }
  };

  // 5. Lock or Unlock Timetable Schedule (Finalize)
  const handleToggleLock = async () => {
    if (!timetableSchedule) return;
    const willLock = !timetableSchedule.isLocked;
    try {
      setLockingSchedule(true);
      const res = await API.put("/api/timetable/lock", {
        department,
        academicYear,
        semesterType,
        isLocked: willLock,
        lockedBy: "Admin"
      });
      if (res.data.success) {
        setTimetableSchedule(prev => ({ ...prev, isLocked: willLock }));
        showAlert(
          willLock 
            ? "🔒 Timetable Finalized and LOCKED! Generating or modifying slots is protected." 
            : "🔓 Timetable Unlocked! Generation and editing are now enabled.",
          willLock ? "success" : "info"
        );
        fetchHistory();
      }
    } catch (err) {
      showAlert("Lock toggle failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLockingSchedule(false);
    }
  };

  // 6. Restore Historical Version
  const handleRestoreVersion = async (versionId) => {
    if (!window.confirm("Are you sure you want to restore this historical version as the active timetable?")) return;
    try {
      const res = await API.post(`/api/timetable/history/restore/${versionId}`);
      if (res.data.success) {
        showAlert("✅ " + res.data.message);
        setTimetableSchedule(res.data.schedule);
        if (res.data.schedule.classes && res.data.schedule.classes.length > 0) {
          setSelectedClassKey(res.data.schedule.classes[0].classKey);
        }
        setShowHistoryModal(false);
        fetchHistory();
      }
    } catch (err) {
      showAlert("Restore failed: " + (err.response?.data?.error || err.message), "error");
    }
  };

  // 7. Delete Historical Version
  const handleDeleteHistoryVersion = async (versionId) => {
    if (!window.confirm("Are you sure you want to delete this historical archive?")) return;
    try {
      await API.delete(`/api/timetable/history/${versionId}`);
      showAlert("Historical version removed.");
      fetchHistory();
    } catch (err) {
      showAlert("Delete failed: " + (err.response?.data?.error || err.message), "error");
    }
  };

  // 8. Open & Save Period Timings Modal (Admin Configurable)
  const handleOpenTimingsModal = () => {
    setTempTimings({
      ...DEFAULT_PERIOD_TIMINGS,
      ...(periodTimings || {})
    });
    setShowTimingsModal(true);
  };

  const handleSavePeriodTimings = async () => {
    try {
      setSavingTimings(true);
      const res = await API.put("/api/timetable/timings", {
        department,
        academicYear,
        semesterType,
        timings: tempTimings
      });
      if (res.data.success) {
        setPeriodTimings(tempTimings);
        localStorage.setItem("timetable_period_timings", JSON.stringify(tempTimings));
        if (res.data.schedule) {
          setTimetableSchedule(res.data.schedule);
        }
        showAlert("⏱️ Period timings saved and updated across all timetables!");
        setShowTimingsModal(false);
      }
    } catch (err) {
      showAlert("Failed to save timings: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setSavingTimings(false);
    }
  };

  // Add default curriculums if empty
  const handleLoadSampleSubjects = async () => {
    const sampleCurriculum = semesterType === "Odd" ? [
      // I Year (Sem 1)
      {
        batch: "2025-2029", year: "I", semester: 1, department: "CSE",
        subjects: [
          { code: "MA3151", name: "Matrices and Calculus", shortName: "M-I", type: "Theory", hoursPerWeek: 4 },
          { code: "PH3151", name: "Engineering Physics", shortName: "PHY", type: "Theory", hoursPerWeek: 3 },
          { code: "CY3151", name: "Engineering Chemistry", shortName: "CHEM", type: "Theory", hoursPerWeek: 3 },
          { code: "GE3151", name: "Problem Solving and Python Programming", shortName: "PSPP", type: "Theory", hoursPerWeek: 3 },
          { code: "GE3171", name: "Problem Solving and Python Programming Laboratory", shortName: "Python Lab", type: "Lab", hoursPerWeek: 3 },
          { code: "BS3171", name: "Physics and Chemistry Laboratory", shortName: "PC Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      },
      // II Year (Sem 3)
      {
        batch: "2024-2028", year: "II", semester: 3, department: "CSE",
        subjects: [
          { code: "MA3354", name: "Discrete Mathematics", shortName: "DM", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3351", name: "Digital Principles & Computer Org", shortName: "DPCO", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3352", name: "Foundations of Data Science", shortName: "FDS", type: "Theory", hoursPerWeek: 4 },
          { code: "CD3291", name: "Data Structures and Algorithms", shortName: "DSA", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3361", name: "Data Science Laboratory", shortName: "DS Lab", type: "Lab", hoursPerWeek: 3 },
          { code: "CS3381", name: "Data Structures Laboratory", shortName: "DSA Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      },
      // III Year (Sem 5)
      {
        batch: "2023-2027", year: "III", semester: 5, department: "CSE",
        subjects: [
          { code: "CS3591", name: "Computer Networks", shortName: "CN", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3501", name: "Compiler Design", shortName: "CD", type: "Theory", hoursPerWeek: 4 },
          { code: "CB3491", name: "Cryptography & Cyber Security", shortName: "CCS", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3551", name: "Distributed Computing", shortName: "DC", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3511", name: "Networks Laboratory", shortName: "NW Lab", type: "Lab", hoursPerWeek: 3 },
          { code: "CS3521", name: "Security Laboratory", shortName: "SEC Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      },
      // IV Year (Sem 7)
      {
        batch: "2022-2026", year: "IV", semester: 7, department: "CSE",
        subjects: [
          { code: "CS3701", name: "Cloud Computing & Services", shortName: "CC", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3702", name: "Deep Learning Architectures", shortName: "DL", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3791", name: "Human Computer Interaction", shortName: "HCI", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3711", name: "Cloud & AI Project Lab", shortName: "Project Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      }
    ] : [
      // I Year (Sem 2)
      {
        batch: "2025-2029", year: "I", semester: 2, department: "CSE",
        subjects: [
          { code: "MA3251", name: "Statistics and Numerical Methods", shortName: "SNM", type: "Theory", hoursPerWeek: 4 },
          { code: "PH3256", name: "Physics for Information Science", shortName: "PIS", type: "Theory", hoursPerWeek: 3 },
          { code: "BE3251", name: "Basic Electrical and Electronics Engineering", shortName: "BEEE", type: "Theory", hoursPerWeek: 3 },
          { code: "CS3251", name: "Programming in C", shortName: "C Prog", type: "Theory", hoursPerWeek: 3 },
          { code: "CS3271", name: "Programming in C Laboratory", shortName: "C Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      },
      // II Year (Sem 4)
      {
        batch: "2024-2028", year: "II", semester: 4, department: "CSE",
        subjects: [
          { code: "CS3452", name: "Theory of Computation", shortName: "TOC", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3491", name: "Artificial Intelligence and Machine Learning", shortName: "AIML", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3492", name: "Database Management Systems", shortName: "DBMS", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3401", name: "Algorithms", shortName: "ALGO", type: "Theory", hoursPerWeek: 4 },
          { code: "GE3451", name: "Environmental Sciences and Sustainability", shortName: "ESS", type: "Theory", hoursPerWeek: 2 },
          { code: "CS3461", name: "Database Management Systems Laboratory", shortName: "DBMS Lab", type: "Lab", hoursPerWeek: 3 },
          { code: "CS3481", name: "Artificial Intelligence and Machine Learning Laboratory", shortName: "AIML Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      },
      // III Year (Sem 6)
      {
        batch: "2023-2027", year: "III", semester: 6, department: "CSE",
        subjects: [
          { code: "CCS335", name: "Cloud Computing", shortName: "CC", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3691", name: "Embedded Systems and IoT", shortName: "ES-IoT", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3601", name: "Object Oriented Analysis and Design", shortName: "OOAD", type: "Theory", hoursPerWeek: 4 },
          { code: "CS3661", name: "Embedded Systems and IoT Laboratory", shortName: "IoT Lab", type: "Lab", hoursPerWeek: 3 },
          { code: "CS3611", name: "Mobile App Development Laboratory", shortName: "MAD Lab", type: "Lab", hoursPerWeek: 3 }
        ]
      },
      // IV Year (Sem 8)
      {
        batch: "2022-2026", year: "IV", semester: 8, department: "CSE",
        subjects: [
          { code: "CS3811", name: "Project Work / Internship", shortName: "PROJECT", type: "Project Work", hoursPerWeek: 12 },
          { code: "GE3791", name: "Professional Ethics in Engineering", shortName: "PEE", type: "Theory", hoursPerWeek: 3 }
        ]
      }
    ];

    try {
      setLoading(true);
      for (const cur of sampleCurriculum) {
        await API.post("/api/timetable/subjects", cur);
      }
      showAlert(`Sample curriculum loaded for ${semesterType} Semester (I, II, III, and IV Years)!`);
      await fetchSubjectsAndAllocations();
    } catch (err) {
      showAlert("Error loading sample subjects", "error");
    } finally {
      setLoading(false);
    }
  };

  // Staff Workload Calculations (User's Key Feature: Theory count & Lab count!)
  const staffWorkloadMap = useMemo(() => {
    const map = {};

    // Initialize all staff from staffList
    staffList.forEach(s => {
      map[s.name] = {
        name: s.name,
        designation: s.designation,
        department: s.department,
        maxHours: s.maxHoursPerWeek || 18,
        theoryCount: 0,
        labCount: 0,
        trainingCount: 0,
        trainingHours: 0,
        otherCount: 0,
        totalHours: 0,
        assignedSubjects: []
      };
    });

    // Tally from allocations
    const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    allocations.forEach(alloc => {
      if (alloc.semester && !validSems.includes(Number(alloc.semester))) return;
      const facs = alloc.facultyNames || [];
      facs.forEach(facName => {
        if (!map[facName]) {
          map[facName] = {
            name: facName,
            designation: "Faculty",
            department,
            maxHours: 18,
            theoryCount: 0,
            labCount: 0,
            trainingCount: 0,
            trainingHours: 0,
            otherCount: 0,
            totalHours: 0,
            assignedSubjects: []
          };
        }

        const t = (alloc.type || "").toLowerCase();
        const isTr = alloc.isTraining === true || t.includes("training") || t.includes("trainer") || (alloc.slotPattern && alloc.slotPattern !== "regular");

        if (isTr) {
          map[facName].trainingCount += 1;
          map[facName].trainingHours += Number(alloc.hoursPerWeek) || 0;
        } else if (t === "theory") {
          map[facName].theoryCount += 1;
        } else if (t.includes("lab") || t.includes("project")) {
          map[facName].labCount += 1;
        } else {
          map[facName].otherCount = (map[facName].otherCount || 0) + 1;
        }

        map[facName].totalHours += Number(alloc.hoursPerWeek) || 0;
        map[facName].assignedSubjects.push({
          subjectCode: alloc.subjectCode,
          shortName: alloc.shortName,
          year: alloc.year,
          section: alloc.section,
          type: alloc.type,
          hours: alloc.hoursPerWeek
        });
      });
    });

    return map;
  }, [staffList, allocations, department]);

  // Handle Faculty Assignment Change for a Subject
  const handleAssignFaculty = (allocId, facultyName, isMulti = false) => {
    setAllocations(prev => prev.map(item => {
      if (item.id === allocId) {
        if (!isMulti) {
          // Single select (Theory)
          return {
            ...item,
            facultyNames: facultyName ? [facultyName] : []
          };
        } else {
          // Toggle in array (Lab)
          let current = [...(item.facultyNames || [])];
          if (current.includes(facultyName)) {
            current = current.filter(f => f !== facultyName);
          } else {
            current.push(facultyName);
          }
          return { ...item, facultyNames: current };
        }
      }
      return item;
    }));
  };

  // Handle Subject Difficulty Change in Workload Allocation
  const handleChangeDifficulty = (allocId, newDiff) => {
    setAllocations(prev => prev.map(item => {
      if (item.id === allocId) {
        return { ...item, difficulty: newDiff };
      }
      return item;
    }));
  };

  // Handle Subject Training Mode Toggle in Workload Allocation
  const handleToggleTraining = (allocId) => {
    setAllocations(prev => prev.map(item => {
      if (item.id === allocId) {
        return { ...item, isTraining: !item.isTraining };
      }
      return item;
    }));
  };

  // Handle Subject Continuous Hours Pattern Change in Workload Allocation
  const handleUpdateSlotPattern = (allocId, newPattern) => {
    setAllocations(prev => prev.map(item => {
      if (item.id === allocId) {
        return { ...item, slotPattern: newPattern };
      }
      return item;
    }));
  };

  // Save Allocations, Year-Sections, Class Advisors, IQAC & Coordinators to DB
  const handleSaveAllocations = async () => {
    try {
      setLoading(true);
      await API.post("/api/timetable/allocation", {
        department,
        academicYear,
        semesterType,
        allocations,
        yearSections,
        classAdvisors,
        iqacNumber,
        hallNumbers,
        coordinators,
        periodTimings
      });
      localStorage.setItem("timetable_year_sections", JSON.stringify(yearSections));
      localStorage.setItem("timetable_class_advisors", JSON.stringify(classAdvisors));
      localStorage.setItem("timetable_iqac_number", iqacNumber);
      localStorage.setItem("timetable_hall_numbers", JSON.stringify(hallNumbers));
      localStorage.setItem("timetable_coordinators", JSON.stringify(coordinators));
      localStorage.setItem("timetable_period_timings", JSON.stringify(periodTimings));
      showAlert("Subject Allocations, IQAC Number, Hall Numbers & Coordinators saved successfully!");
    } catch (err) {
      showAlert("Failed to save allocations: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  // Generate Clash-Free Timetable
  const handleGenerateTimetable = async () => {
    // Check if timetable is locked
    if (timetableSchedule?.isLocked) {
      return showAlert("🔒 Timetable is LOCKED (Finalized)! Please unlock it in the Schedule view before generating a new timetable.", "error");
    }

    // Check if at least some subjects have staff assigned
    const assignedCount = allocations.filter(a => a.facultyNames && a.facultyNames.length > 0).length;
    if (assignedCount === 0) {
      return showAlert("Please assign staff to subjects before generating the timetable!", "error");
    }

    try {
      setGenerating(true);
      // Save current allocations, sections, class advisors, IQAC & coordinators first
      await API.post("/api/timetable/allocation", {
        department,
        academicYear,
        semesterType,
        allocations,
        yearSections,
        classAdvisors,
        iqacNumber,
        hallNumbers,
        coordinators,
        periodTimings
      });
      localStorage.setItem("timetable_class_advisors", JSON.stringify(classAdvisors));
      localStorage.setItem("timetable_iqac_number", iqacNumber);
      localStorage.setItem("timetable_hall_numbers", JSON.stringify(hallNumbers));
      localStorage.setItem("timetable_coordinators", JSON.stringify(coordinators));
      localStorage.setItem("timetable_period_timings", JSON.stringify(periodTimings));

      // Call generation algorithm
      const res = await API.post("/api/timetable/generate", {
        department,
        academicYear,
        semesterType,
        allocations,
        classAdvisors,
        timings: periodTimings
      });

      if (res.data.success) {
        setTimetableSchedule(res.data);
        setFacultySchedules(res.data.facultySchedules || {});
        if (res.data.classes && res.data.classes.length > 0) {
          setSelectedClassKey(res.data.classes[0].classKey);
        }
        showAlert("⚡ Clash-Free Timetable Generated Successfully with Staff Rest Breaks & Monday Period 1 Advisors!");
        fetchHistory();
        setActiveSubTab("schedule");
      }
    } catch (err) {
      showAlert("Generation failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setGenerating(false);
    }
  };

  // Open slot edit modal
  const handleOpenSlotEdit = (classKey, day, slot) => {
    if (timetableSchedule?.isLocked) {
      return showAlert("🔒 Timetable is LOCKED (Finalized)! Unlock it first to edit slots.", "error");
    }
    setSlotEditModal({
      isOpen: true,
      classKey,
      day,
      period: slot.period,
      time: slot.time,
      subjectCode: slot.subjectCode === "FREE" ? "FREE" : slot.subjectCode,
      subjectName: slot.subjectCode === "FREE" ? "Library / Mentoring" : slot.subjectName,
      shortName: slot.shortName || "",
      facultyName: slot.facultyName === "-" ? "" : slot.facultyName,
      type: slot.type || "Theory",
      room: slot.room || "LH-1"
    });
  };

  // Save edited slot (Manual Override saved to DB permanently)
  const handleSaveSlotEdit = async () => {
    if (!slotEditModal) return;
    const { classKey, day, period, time, subjectCode, subjectName, shortName, facultyName, type, room } = slotEditModal;

    const isFree = !subjectCode || subjectCode === "FREE";
    const updatedSlot = {
      period,
      time,
      subjectCode: isFree ? "FREE" : subjectCode.trim(),
      subjectName: isFree ? "Free Period / Self Study" : (subjectName || subjectCode).trim(),
      shortName: isFree ? "FREE" : (shortName || subjectCode).trim(),
      facultyName: isFree ? "-" : (facultyName || "").trim(),
      facultyNames: (!isFree && facultyName) ? [facultyName.trim()] : [],
      type: isFree ? "Free" : type,
      room: isFree ? "-" : (room || (type === "Lab" ? "Lab" : "LH-1"))
    };

    try {
      setLoading(true);
      const res = await API.put("/api/timetable/schedule/cell", {
        department,
        academicYear,
        semesterType,
        classKey,
        day,
        period,
        updatedSlot
      });

      if (res.data.success) {
        // Update local schedule state
        setTimetableSchedule(prev => {
          if (!prev || !prev.classes) return prev;
          const updatedClasses = prev.classes.map(cls => {
            if (cls.classKey !== classKey) return cls;
            const daySlots = [...(cls.days[day] || [])];
            const pIdx = daySlots.findIndex(s => s.period === period);
            if (pIdx !== -1) {
              daySlots[pIdx] = { ...daySlots[pIdx], ...updatedSlot };
            }
            return {
              ...cls,
              days: {
                ...cls.days,
                [day]: daySlots
              }
            };
          });
          return { ...prev, classes: updatedClasses };
        });

        // Update faculty schedules if returned
        if (res.data.facultySchedules) {
          setFacultySchedules(res.data.facultySchedules);
        }

        showAlert(`Updated ${classKey} [${day} Period ${period}] successfully! Saved to database.`);
        setSlotEditModal(null);
      }
    } catch (err) {
      showAlert("Failed to update slot: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  // Start editing a staff member
  const handleStartEditStaff = (staff) => {
    setEditingStaffId(staff._id);
    const isPreset = PRESET_DESIGNATIONS.includes(staff.designation);
    setIsCustomDesignation(!isPreset);
    setCustomDesignationText(!isPreset ? staff.designation : "");
    setNewStaff({
      name: staff.name,
      staffCode: staff.staffCode || "",
      designation: isPreset ? staff.designation : "custom",
      department: staff.department || department,
      maxHoursPerWeek: staff.maxHoursPerWeek || 18,
      maxTheory: staff.maxTheory || 2,
      maxLab: staff.maxLab || 2
    });
  };

  const handleCancelEditStaff = () => {
    setEditingStaffId(null);
    setIsCustomDesignation(false);
    setCustomDesignationText("");
    setNewStaff({
      name: "",
      staffCode: "",
      designation: "Assistant Professor",
      department,
      maxHoursPerWeek: 18,
      maxTheory: 2,
      maxLab: 2
    });
  };

  // Add or Update staff
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name.trim()) return showAlert("Staff name is required", "error");

    const finalDesignation = (isCustomDesignation 
      ? customDesignationText.trim() 
      : (newStaff.designation === "custom" ? customDesignationText.trim() : newStaff.designation)) || "Teaching Assistant";

    const payload = {
      ...newStaff,
      name: newStaff.name.trim(),
      designation: finalDesignation
    };

    try {
      setLoading(true);
      if (editingStaffId) {
        const oldStaff = staffList.find(s => s._id === editingStaffId);
        await API.put(`/api/timetable/staff/${editingStaffId}`, payload);
        
        // If staff name was updated, update any allocation referencing old name
        if (oldStaff && oldStaff.name !== payload.name) {
          setAllocations(prev => prev.map(a => ({
            ...a,
            facultyNames: (a.facultyNames || []).map(f => f === oldStaff.name ? payload.name : f)
          })));
        }
        showAlert(`Faculty ${payload.name} updated successfully!`);
        setEditingStaffId(null);
      } else {
        await API.post("/api/timetable/staff", payload);
        showAlert(`Faculty ${payload.name} added!`);
      }

      setNewStaff({
        name: "",
        staffCode: "",
        designation: "Assistant Professor",
        department,
        maxHoursPerWeek: 18,
        maxTheory: 2,
        maxLab: 2
      });
      setIsCustomDesignation(false);
      setCustomDesignationText("");
      fetchStaff();
    } catch (err) {
      showAlert(err.response?.data?.error || "Failed to save faculty", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete staff
  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Delete staff member ${name}?`)) return;
    try {
      await API.delete(`/api/timetable/staff/${id}`);
      showAlert(`Staff ${name} deleted`);
      if (editingStaffId === id) handleCancelEditStaff();
      fetchStaff();
    } catch (err) {
      showAlert("Failed to delete staff", "error");
    }
  };

  // Start editing a subject from the curriculum badges
  const handleStartEditSubject = (sm, sub) => {
    setEditingSubject({
      masterId: sm._id,
      originalCode: sub.code,
      batch: sm.batch,
      year: sm.year,
      semester: sm.semester
    });

    let matchedType = sub.type || "Theory";
    if (matchedType === "Lab") matchedType = "Laboratory";

    const isPreset = PRESET_SUBJECT_TYPES.includes(matchedType);
    if (!isPreset) {
      setIsCustomSubjectType(true);
      setCustomSubjectTypeText(sub.type);
    } else {
      setIsCustomSubjectType(false);
      setCustomSubjectTypeText("");
    }

    const PRESET_PATTERNS = ["regular", "2+2", "2+1", "2+1+1", "3+1", "4", "3", "2", "2+2+1", "3+2", "4+3"];
    const initialPattern = sub.slotPattern || (sub.isTraining ? (sub.hoursPerWeek >= 4 ? "4" : "3") : "regular");
    const isPresetPattern = PRESET_PATTERNS.includes(initialPattern);
    if (!isPresetPattern && initialPattern) {
      setIsCustomSlotPattern(true);
      setCustomSlotPatternText(initialPattern);
    } else {
      setIsCustomSlotPattern(false);
      setCustomSlotPatternText("");
    }

    setSubjectForm({
      batch: sm.batch,
      year: sm.year,
      semester: sm.semester,
      department: sm.department || department,
      code: sub.code,
      name: sub.name,
      shortName: sub.shortName || sub.code,
      type: isPreset ? matchedType : "custom",
      difficulty: sub.difficulty || "Normal",
      isTraining: sub.isTraining !== undefined ? sub.isTraining : (sub.type?.toLowerCase().includes("training") || false),
      slotPattern: initialPattern,
      hoursPerWeek: sub.hoursPerWeek || 4
    });

    // Smooth scroll to subject form
    setTimeout(() => {
      const formEl = document.getElementById("curriculum-subject-form");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  // Cancel editing subject
  const handleCancelEditSubject = () => {
    setEditingSubject(null);
    setIsCustomSubjectType(false);
    setCustomSubjectTypeText("");
    setIsCustomSlotPattern(false);
    setCustomSlotPatternText("");
    setSubjectForm(prev => ({
      ...prev,
      code: "",
      name: "",
      shortName: "",
      type: "Theory",
      difficulty: "Normal",
      isTraining: false,
      slotPattern: "regular",
      hoursPerWeek: 4
    }));
  };

  // Add or Update Subject in Subject Master
  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.code || !subjectForm.name) {
      return showAlert("Subject Code and Name are required", "error");
    }

    const finalType = isCustomSubjectType 
      ? (customSubjectTypeText.trim() || "Theory") 
      : (subjectForm.type === "custom" ? (customSubjectTypeText.trim() || "Theory") : subjectForm.type);

    const finalSlotPattern = isCustomSlotPattern
      ? (customSlotPatternText.trim() || "regular")
      : (subjectForm.slotPattern === "custom" ? (customSlotPatternText.trim() || "regular") : (subjectForm.slotPattern || "regular"));

    const finalIsTraining = !!subjectForm.isTraining || (finalSlotPattern !== "regular");

    let defaultHours = Number(subjectForm.hoursPerWeek);
    if (!defaultHours) {
      const t = finalType.toLowerCase();
      defaultHours = t.includes("lab") || t.includes("project") ? 3 : (t.includes("library") || t.includes("seminar") || t.includes("mentor") ? 1 : 4);
    }

    const formattedCode = subjectForm.code.trim().toUpperCase();
    const formattedName = subjectForm.name.trim();
    const formattedShort = subjectForm.shortName.trim() || formattedCode;

    try {
      setLoading(true);

      if (editingSubject) {
        // Find existing doc where subject was
        const existingDoc = subjectMasters.find(
          sm => sm._id === editingSubject.masterId || 
               (sm.year === editingSubject.year && sm.semester === Number(editingSubject.semester))
        );

        const targetBatch = subjectForm.batch || existingDoc?.batch || (
          subjectForm.year === "I" ? "2025-2029" : (subjectForm.year === "II" ? "2024-2028" : (subjectForm.year === "III" ? "2023-2027" : "2022-2026"))
        );

        const isMoved = existingDoc && (existingDoc.year !== subjectForm.year || existingDoc.semester !== Number(subjectForm.semester));

        if (isMoved && existingDoc) {
          // Remove from old doc
          const oldUpdatedSubjects = (existingDoc.subjects || []).filter(s => s.code !== editingSubject.originalCode);
          await API.post("/api/timetable/subjects", {
            department: existingDoc.department || department,
            batch: existingDoc.batch,
            year: existingDoc.year,
            semester: existingDoc.semester,
            subjects: oldUpdatedSubjects
          });

          // Add to new doc
          const newDoc = subjectMasters.find(
            sm => sm.year === subjectForm.year && sm.semester === Number(subjectForm.semester)
          );
          const newSubjects = newDoc ? [...(newDoc.subjects || []).filter(s => s.code !== formattedCode)] : [];
          newSubjects.push({
            code: formattedCode,
            name: formattedName,
            shortName: formattedShort,
            type: finalType,
            difficulty: subjectForm.difficulty || "Normal",
            isTraining: finalIsTraining,
            slotPattern: finalSlotPattern,
            hoursPerWeek: defaultHours
          });
          await API.post("/api/timetable/subjects", {
            department,
            batch: newDoc?.batch || targetBatch,
            year: subjectForm.year,
            semester: Number(subjectForm.semester),
            subjects: newSubjects
          });
        } else {
          // Update in-place in existing document
          const docToUpdate = existingDoc || subjectMasters.find(
            sm => sm.year === subjectForm.year && sm.semester === Number(subjectForm.semester)
          );

          if (!docToUpdate) {
            throw new Error("Target curriculum record not found");
          }

          const updatedSubjects = (docToUpdate.subjects || []).map(s => {
            if (s.code === editingSubject.originalCode) {
              return {
                code: formattedCode,
                name: formattedName,
                shortName: formattedShort,
                type: finalType,
                difficulty: subjectForm.difficulty || "Normal",
                isTraining: finalIsTraining,
                slotPattern: finalSlotPattern,
                hoursPerWeek: defaultHours
              };
            }
            return s;
          });

          await API.post("/api/timetable/subjects", {
            department: docToUpdate.department || department,
            batch: docToUpdate.batch || targetBatch,
            year: docToUpdate.year,
            semester: docToUpdate.semester,
            subjects: updatedSubjects
          });
        }

        // Sync Allocations state if matching subject exists
        const nextAllocations = allocations.map(a => {
          if (a.year === editingSubject.year && a.semester === Number(editingSubject.semester) && a.subjectCode === editingSubject.originalCode) {
            return {
              ...a,
              year: subjectForm.year,
              semester: Number(subjectForm.semester),
              subjectCode: formattedCode,
              subjectName: formattedName,
              shortName: formattedShort,
              type: finalType,
              difficulty: subjectForm.difficulty || "Normal",
              isTraining: finalIsTraining,
              slotPattern: finalSlotPattern,
              hoursPerWeek: defaultHours
            };
          }
          return a;
        });

        setAllocations(nextAllocations);

        // Also persist updated allocation state to MongoDB immediately so slotPattern is permanently stored
        try {
          await API.post("/api/timetable/allocation", {
            department,
            academicYear,
            semesterType,
            allocations: nextAllocations,
            yearSections
          });
        } catch (saveAllocErr) {
          console.log("Could not auto-sync allocations to DB:", saveAllocErr);
        }

        showAlert(`Subject ${formattedCode} updated successfully with pattern ${finalSlotPattern}!`);
        handleCancelEditSubject();
      } else {
        // Adding brand new subject
        const targetBatch = subjectForm.batch || (
          subjectForm.year === "I" ? "2025-2029" : (subjectForm.year === "II" ? "2024-2028" : (subjectForm.year === "III" ? "2023-2027" : "2022-2026"))
        );

        const existingDoc = subjectMasters.find(
          sm => sm.year === subjectForm.year && 
                sm.semester === Number(subjectForm.semester)
        );

        let updatedSubjects = existingDoc ? [...existingDoc.subjects] : [];
        const alreadyExists = updatedSubjects.some(s => s.code.toUpperCase() === formattedCode);
        if (alreadyExists) {
          return showAlert(`Subject code ${formattedCode} already exists in ${subjectForm.year} Year (Sem ${subjectForm.semester})!`, "error");
        }

        updatedSubjects.push({
          code: formattedCode,
          name: formattedName,
          shortName: formattedShort,
          type: finalType,
          difficulty: subjectForm.difficulty || "Normal",
          isTraining: finalIsTraining,
          slotPattern: finalSlotPattern,
          hoursPerWeek: defaultHours
        });

        await API.post("/api/timetable/subjects", {
          department,
          batch: existingDoc?.batch || targetBatch,
          year: subjectForm.year,
          semester: Number(subjectForm.semester),
          subjects: updatedSubjects
        });

        showAlert(`Subject ${formattedCode} (${finalType}) added to ${subjectForm.year} Year!`);
        setSubjectForm(prev => ({ ...prev, code: "", name: "", shortName: "", difficulty: "Normal", isTraining: false, slotPattern: "regular" }));
        setIsCustomSubjectType(false);
        setCustomSubjectTypeText("");
        setIsCustomSlotPattern(false);
        setCustomSlotPatternText("");
      }

      await fetchSubjectsAndAllocations();
    } catch (err) {
      showAlert(err.response?.data?.error || err.message || "Failed to save subject", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete a single subject from curriculum
  const handleDeleteSubject = async (sm, subjectCode, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete subject "${subjectCode}" from ${sm.year} Year (Sem ${sm.semester})?`)) {
      return;
    }

    try {
      setLoading(true);
      const updatedSubjects = (sm.subjects || []).filter(s => s.code !== subjectCode);
      await API.post("/api/timetable/subjects", {
        department: sm.department || department,
        batch: sm.batch,
        year: sm.year,
        semester: sm.semester,
        subjects: updatedSubjects
      });

      // Remove from allocations
      setAllocations(prev => prev.filter(a => !(a.year === sm.year && a.semester === sm.semester && a.subjectCode === subjectCode)));

      if (editingSubject?.originalCode === subjectCode) {
        handleCancelEditSubject();
      }

      showAlert(`Subject ${subjectCode} deleted successfully!`);
      await fetchSubjectsAndAllocations();
    } catch (err) {
      showAlert("Failed to delete subject", "error");
    } finally {
      setLoading(false);
    }
  };

  // Available sections list for current yearFilter
  const availableSections = useMemo(() => {
    if (yearFilter === "All") {
      const allSecs = new Set();
      Object.values(yearSections).forEach(secs => (secs || []).forEach(s => allSecs.add(s)));
      return Array.from(allSecs).sort();
    }
    return ((yearSections && yearSections[yearFilter]) || ["A"]).sort();
  }, [yearFilter, yearSections]);

  // Counts of available subjects per year (filtered by sectionFilter)
  const yearCounts = useMemo(() => {
    const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    const counts = { All: 0, I: 0, II: 0, III: 0, IV: 0 };
    allocations.forEach(a => {
      if (a.semester && !validSems.includes(Number(a.semester))) return;
      if (sectionFilter === "All" || a.section === sectionFilter) {
        counts.All++;
        if (counts[a.year] !== undefined) {
          counts[a.year]++;
        }
      }
    });
    return counts;
  }, [allocations, sectionFilter, semesterType]);

  // Counts of available subjects per section (for current yearFilter)
  const sectionCounts = useMemo(() => {
    const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    const counts = { All: 0 };
    allocations.forEach(a => {
      if (a.semester && !validSems.includes(Number(a.semester))) return;
      if (yearFilter === "All" || a.year === yearFilter) {
        counts.All++;
        counts[a.section] = (counts[a.section] || 0) + 1;
      }
    });
    return counts;
  }, [allocations, yearFilter, semesterType]);

  // Filtered allocations based on Year Filter (All, I, II, III, IV) and Section Filter (All, A, B, C)
  const filteredAllocations = useMemo(() => {
    const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
    return allocations.filter(item => {
      const matchSem = item.semester ? validSems.includes(Number(item.semester)) : true;
      const matchYear = yearFilter === "All" || item.year === yearFilter;
      const matchSection = sectionFilter === "All" || item.section === sectionFilter;
      const matchStaff = !selectedStaffFilter || (item.facultyNames || []).includes(selectedStaffFilter);
      return matchSem && matchYear && matchSection && matchStaff;
    });
  }, [allocations, yearFilter, sectionFilter, selectedStaffFilter, semesterType]);

  // Current selected class schedule object
  const currentClassSchedule = useMemo(() => {
    if (!timetableSchedule || !timetableSchedule.classes) return null;
    return timetableSchedule.classes.find(c => c.classKey === selectedClassKey) || timetableSchedule.classes[0];
  }, [timetableSchedule, selectedClassKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Alert Banner */}
      {alertMessage && (
        <div style={{
          padding: "1rem 1.5rem",
          borderRadius: "12px",
          background: alertMessage.type === "error" ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
          border: `1px solid ${alertMessage.type === "error" ? "var(--danger)" : "var(--success)"}`,
          color: alertMessage.type === "error" ? "#ef4444" : "#10b981",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "fadeIn 0.3s ease"
        }}>
          {alertMessage.type === "error" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
              <span style={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>
                Time Table & Workload Allocator
              </span>
              <span style={{
                fontSize: "0.75rem",
                padding: "4px 10px",
                borderRadius: "20px",
                background: "rgba(99, 102, 241, 0.15)",
                color: "#818cf8",
                border: "1px solid rgba(99, 102, 241, 0.3)"
              }}>
                Auto Clash-Free Engine
              </span>
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.35rem", marginBottom: 0 }}>
              Assign faculty, track Theory vs Lab workload live, and generate conflict-free schedules across 2nd, 3rd, and Final years.
            </p>
          </div>

          {/* Quick Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700" }}>DEPARTMENT</span>
              <select 
                className="select-input" 
                value={department} 
                onChange={e => setDepartment(e.target.value)}
                style={{ padding: "0.5rem 0.8rem", fontSize: "0.85rem" }}
              >
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="AIDS">AIDS</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", minWidth: "165px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700" }}>ACADEMIC YEAR</span>
                {!isAddingCustomYear && (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsAddingCustomYear(true);
                      setCustomAcademicYearInput("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#818cf8",
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      padding: "0 2px"
                    }}
                    title="Add Custom Academic Year"
                  >
                    + Custom
                  </button>
                )}
              </div>

              {isAddingCustomYear ? (
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. 2027-2028"
                    value={customAcademicYearInput}
                    onChange={e => setCustomAcademicYearInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomAcademicYear();
                      } else if (e.key === "Escape") {
                        setIsAddingCustomYear(false);
                        setCustomAcademicYearInput("");
                      }
                    }}
                    autoFocus
                    style={{ 
                      padding: "0.45rem 0.6rem", 
                      fontSize: "0.82rem", 
                      width: "120px",
                      borderColor: "#818cf8"
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAddCustomAcademicYear()}
                    style={{ padding: "0.45rem 0.6rem", fontSize: "0.75rem", fontWeight: "700" }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsAddingCustomYear(false);
                      setCustomAcademicYearInput("");
                    }}
                    style={{ padding: "0.45rem 0.5rem", fontSize: "0.75rem" }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <select 
                  className="select-input" 
                  value={academicYear} 
                  onChange={e => {
                    if (e.target.value === "__add_custom__") {
                      setIsAddingCustomYear(true);
                      setCustomAcademicYearInput("");
                    } else {
                      setAcademicYear(e.target.value);
                      try {
                        localStorage.setItem("timetable_selected_academic_year", e.target.value);
                      } catch (err) {}
                    }
                  }}
                  style={{ padding: "0.5rem 0.8rem", fontSize: "0.85rem" }}
                >
                  {academicYearList.map(yr => (
                    <option key={yr} value={yr}>
                      {yr.includes("-") ? yr.replace("-", " - ") : yr}
                    </option>
                  ))}
                  <option value="__add_custom__">➕ + Add Custom Year...</option>
                </select>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700" }}>SEMESTER</span>
              <select 
                className="select-input" 
                value={semesterType} 
                onChange={e => setSemesterType(e.target.value)}
                style={{ padding: "0.5rem 0.8rem", fontSize: "0.85rem" }}
              >
                <option value="Odd">Odd Sem (3, 5, 7)</option>
                <option value="Even">Even Sem (4, 6, 8)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div style={{ display: "flex", gap: "10px", marginTop: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1px" }}>
          <button 
            className={`btn ${activeSubTab === "allocation" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("allocation")}
            style={{ borderRadius: "8px 8px 0 0", padding: "0.65rem 1.4rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Users size={18} />
            <span>1. Workload & Staff Allocation</span>
          </button>

          <button 
            className={`btn ${activeSubTab === "schedule" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("schedule")}
            style={{ borderRadius: "8px 8px 0 0", padding: "0.65rem 1.4rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Calendar size={18} />
            <span>2. Timetable Schedule & Routine</span>
            {timetableSchedule && (
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
            )}
          </button>

          <button 
            className={`btn ${activeSubTab === "master" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveSubTab("master")}
            style={{ borderRadius: "8px 8px 0 0", padding: "0.65rem 1.4rem", display: "flex", alignItems: "center", gap: "8px" }}
          >
            <BookOpen size={18} />
            <span>3. Admin Master Setup (Staff & Subjects)</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: WORKLOAD & STAFF ALLOCATION                         */}
      {/* ============================================================== */}
      {activeSubTab === "allocation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* USER HIGHLIGHT: DYNAMIC STAFF WORKLOAD CARDS */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700" }}>
                  Staff Workload Status Overview
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  (Showing dynamic Theory & Lab counts as you assign)
                </span>
              </div>
              {selectedStaffFilter && (
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}
                  onClick={() => setSelectedStaffFilter("")}
                >
                  Clear Staff Filter ({selectedStaffFilter}) ✕
                </button>
              )}
            </div>

            {/* Staff Cards Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
              maxHeight: "360px",
              overflowY: "auto",
              paddingRight: "6px"
            }}>
              {Object.values(staffWorkloadMap).map(fac => {
                const isSelected = selectedStaffFilter === fac.name;
                const isOptimal = fac.theoryCount > 0 || fac.labCount > 0;
                const isHeavy = fac.totalHours > 18 || (fac.theoryCount >= 3 && fac.labCount >= 2);

                return (
                  <div 
                    key={fac.name}
                    onClick={() => setSelectedStaffFilter(isSelected ? "" : fac.name)}
                    style={{
                      background: isSelected ? "rgba(99, 102, 241, 0.18)" : "var(--card-bg, rgba(255,255,255,0.03))",
                      border: isSelected 
                        ? "2px solid #6366f1" 
                        : "1px solid var(--border-color, rgba(255,255,255,0.1))",
                      borderRadius: "14px",
                      padding: "1rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                      boxShadow: isSelected ? "0 4px 20px rgba(99, 102, 241, 0.25)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-color)" }}>
                          {fac.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {fac.designation}
                        </div>
                      </div>

                      {/* Status indicator pill */}
                      <span style={{
                        fontSize: "0.68rem",
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: "20px",
                        background: !isOptimal 
                          ? "rgba(148, 163, 184, 0.15)" 
                          : isHeavy 
                            ? "rgba(239, 68, 68, 0.18)" 
                            : "rgba(16, 185, 129, 0.18)",
                        color: !isOptimal ? "#94a3b8" : isHeavy ? "#ef4444" : "#10b981",
                        border: `1px solid ${!isOptimal ? "#64748b" : isHeavy ? "#ef4444" : "#10b981"}`
                      }}>
                        {!isOptimal ? "Unassigned" : isHeavy ? "Heavy" : "Active"}
                      </span>
                    </div>

                    {/* THEORY, LAB, OTHER COUNT BADGES */}
                    <div style={{
                      display: "flex",
                      gap: "6px",
                      marginTop: "0.65rem",
                      padding: "0.5rem 0.6rem",
                      borderRadius: "10px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid rgba(255,255,255,0.05)"
                    }}>
                      <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "0.65rem", color: "#818cf8", fontWeight: "700", textTransform: "uppercase" }}>
                          📘 Theory
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: "800", color: fac.theoryCount > 0 ? "#818cf8" : "var(--text-muted)" }}>
                          {fac.theoryCount}
                        </div>
                      </div>

                      <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "0.65rem", color: "#a855f7", fontWeight: "700", textTransform: "uppercase" }}>
                          🔬 Lab
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: "800", color: fac.labCount > 0 ? "#c084fc" : "var(--text-muted)" }}>
                          {fac.labCount}
                        </div>
                      </div>

                      <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: "0.65rem", color: "#f59e0b", fontWeight: "700", textTransform: "uppercase" }}>
                          🚀 Others
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: "800", color: fac.otherCount > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                          {fac.otherCount || 0}
                        </div>
                      </div>

                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#10b981", fontWeight: "700", textTransform: "uppercase" }}>
                          ⏱️ Total
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#10b981" }}>
                          {fac.totalHours}h
                        </div>
                      </div>
                    </div>

                    {/* Assigned Subjects Summary Pills */}
                    {fac.assignedSubjects.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "0.6rem" }}>
                        {fac.assignedSubjects.map((sub, idx) => (
                          <span 
                            key={idx}
                            style={{
                              fontSize: "0.68rem",
                              padding: "2px 6px",
                              borderRadius: "6px",
                              background: sub.type === "Lab" ? "rgba(168, 85, 247, 0.15)" : "rgba(99, 102, 241, 0.15)",
                              color: sub.type === "Lab" ? "#c084fc" : "#818cf8",
                              border: `1px solid ${sub.type === "Lab" ? "rgba(168, 85, 247, 0.3)" : "rgba(99, 102, 241, 0.3)"}`
                            }}
                          >
                            {sub.shortName} ({sub.year} Yr)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* YEAR WISE SUBJECT ALLOCATION TABLE */}
          <div className="glass-card" style={{ padding: "1.5rem", borderRadius: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>
                  Year-Wise Subject Staff Allocation
                </h3>

                {/* Year & Section Filter Buttons */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                  {/* Year Filter Buttons with Subject Counts */}
                  <div style={{ display: "flex", gap: "6px", background: "rgba(0,0,0,0.2)", padding: "3px", borderRadius: "8px" }}>
                    {["All", "I", "II", "III", "IV"].map(y => {
                      const count = yearCounts[y] || 0;
                      return (
                        <button 
                          key={y}
                          onClick={() => {
                            setYearFilter(y);
                            if (y !== "All" && yearSections[y] && !yearSections[y].includes(sectionFilter)) {
                              setSectionFilter("All");
                            }
                          }}
                          style={{
                            padding: "4px 12px",
                            fontSize: "0.8rem",
                            fontWeight: "700",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            background: yearFilter === y ? "#6366f1" : "transparent",
                            color: yearFilter === y ? "#ffffff" : "var(--text-muted)",
                            transition: "all 0.2s ease",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px"
                          }}
                        >
                          <span>{y === "All" ? "All Years" : `${y} Year`}</span>
                          <span style={{
                            fontSize: "0.68rem",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: yearFilter === y ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)",
                            color: yearFilter === y ? "#ffffff" : "var(--text-muted)"
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Section Filter Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>SECTION:</span>
                    <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", padding: "3px", borderRadius: "8px", flexWrap: "wrap" }}>
                      {["All", ...availableSections].map(sec => {
                        const count = sectionCounts[sec] || 0;
                        const sStyle = sec !== "All" ? getSectionBadgeStyle(sec) : null;
                        const isSelected = sectionFilter === sec;
                        return (
                          <button 
                            key={sec}
                            onClick={() => setSectionFilter(sec)}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.78rem",
                              fontWeight: "700",
                              borderRadius: "6px",
                              border: isSelected && sStyle ? `1px solid ${sStyle.border}` : "none",
                              cursor: "pointer",
                              background: isSelected ? (sStyle ? sStyle.bg : "#8b5cf6") : "transparent",
                              color: isSelected ? (sStyle ? sStyle.text : "#ffffff") : "var(--text-muted)",
                              transition: "all 0.2s ease",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span>{sec === "All" ? "All Secs" : `Sec ${sec}`}</span>
                            <span style={{
                              fontSize: "0.65rem",
                              padding: "1px 5px",
                              borderRadius: "8px",
                              background: isSelected ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)",
                              color: isSelected ? (sStyle ? sStyle.text : "#ffffff") : "var(--text-muted)"
                            }}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleOpenTimingsModal}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  title="Configure start and end timings for all periods"
                >
                  <Clock size={16} />
                  <span>⏱️ Period Timings</span>
                </button>

                <button 
                  className="btn btn-secondary" 
                  onClick={handleSaveAllocations} 
                  disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Save size={16} />
                  <span>Save Allocations</span>
                </button>

                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerateTimetable} 
                  disabled={generating || timetableSchedule?.isLocked}
                  style={{
                    background: timetableSchedule?.isLocked 
                      ? "#64748b" 
                      : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: "700",
                    boxShadow: timetableSchedule?.isLocked ? "none" : "0 4px 15px rgba(99, 102, 241, 0.35)",
                    cursor: timetableSchedule?.isLocked ? "not-allowed" : "pointer"
                  }}
                  title={timetableSchedule?.isLocked ? "Timetable is Locked! Unlock in Schedule view to re-generate." : ""}
                >
                  {timetableSchedule?.isLocked ? <Lock size={18} /> : <Sparkles size={18} />}
                  <span>
                    {generating 
                      ? "Generating Clash-Free..." 
                      : (timetableSchedule?.isLocked ? "🔒 Timetable Locked (Finalized)" : "⚡ Auto-Generate Timetable")}
                  </span>
                </button>
              </div>
            </div>

            {/* Allocations Table */}
            {filteredAllocations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <BookOpen size={42} style={{ opacity: 0.4, marginBottom: "0.75rem" }} />
                <h4 style={{ margin: 0, fontWeight: "600" }}>
                  No Subjects Available for {yearFilter === "All" ? "Current Filter" : `${yearFilter} Year`} {sectionFilter !== "All" ? `(Section ${sectionFilter})` : ""}
                </h4>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "450px", margin: "0.5rem auto" }}>
                  {yearFilter !== "All" && yearCounts["All"] > 0
                    ? `There are ${yearCounts["All"]} subjects available in other years. Click "View All Years" below or configure subjects in Admin Master Setup.`
                    : 'Go to "Admin Master Setup" tab to add curriculum subjects, or click below to populate sample standard curriculum.'}
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "0.75rem", flexWrap: "wrap" }}>
                  {(yearFilter !== "All" || sectionFilter !== "All") && yearCounts["All"] > 0 && (
                    <button 
                      className="btn btn-primary" 
                      onClick={() => { setYearFilter("All"); setSectionFilter("All"); }}
                    >
                      View All Years & Sections ({allocations.length} Subjects)
                    </button>
                  )}
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleLoadSampleSubjects}
                  >
                    Load Sample II, III, IV Year Curriculum
                  </button>
                </div>
              </div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>Year</th>
                      <th style={{ width: "70px", textAlign: "center" }}>Sec</th>
                      <th style={{ width: "110px" }}>Subject Code</th>
                      <th>Subject Name</th>
                      <th style={{ width: "100px" }}>Type</th>
                      <th style={{ width: "135px" }}>Difficulty</th>
                      <th style={{ width: "90px" }}>Hours/Wk</th>
                      <th style={{ width: "320px" }}>Assign Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAllocations.map((item) => {
                      const isMultiFaculty = item.type && (item.type.toLowerCase().includes("lab") || item.type.toLowerCase().includes("project"));
                      const isLibrary = item.type && item.type.toLowerCase().includes("library");
                      const assignedFacs = item.facultyNames || [];
                      const badge = getTypeBadgeDetails(item.type);

                      return (
                        <tr key={item.id}>
                          <td>
                            <span style={{
                              fontWeight: "700",
                              fontSize: "0.8rem",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: item.year === "I" ? "rgba(14, 165, 233, 0.15)" : item.year === "II" ? "rgba(59, 130, 246, 0.15)" : item.year === "III" ? "rgba(168, 85, 247, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: item.year === "I" ? "#38bdf8" : item.year === "II" ? "#60a5fa" : item.year === "III" ? "#c084fc" : "#34d399"
                            }}>
                              {item.year} Year
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {(() => {
                              const sStyle = getSectionBadgeStyle(item.section);
                              return (
                                <span style={{
                                  fontWeight: "800",
                                  fontSize: "0.74rem",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  background: sStyle.bg,
                                  color: sStyle.text,
                                  border: `1px solid ${sStyle.border}`
                                }}>
                                  Sec {item.section}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ fontWeight: "700", color: "#818cf8" }}>{item.subjectCode}</td>
                          <td>
                            <div style={{ fontWeight: "600" }}>{item.subjectName}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Short: {item.shortName}</div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: "0.75rem",
                              fontWeight: "700",
                              padding: "3px 8px",
                              borderRadius: "12px",
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              whiteSpace: "nowrap"
                            }}>
                              {badge.icon} {item.type}
                            </span>
                          </td>
                          <td>
                            {(() => {
                              const diff = item.difficulty || "Normal";
                              const dBadge = getDifficultyBadgeDetails(diff);
                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <select 
                                    value={diff}
                                    onChange={(e) => handleChangeDifficulty(item.id, e.target.value)}
                                    title={dBadge.tooltip}
                                    style={{
                                      fontSize: "0.76rem",
                                      fontWeight: "700",
                                      padding: "3px 6px",
                                      borderRadius: "8px",
                                      background: dBadge.bg,
                                      color: dBadge.text,
                                      border: `1px solid ${dBadge.border}`,
                                      cursor: "pointer",
                                      outline: "none"
                                    }}
                                  >
                                    <option value="Normal" style={{ background: "#1e1e2d", color: "#f8fafc" }}>📘 Normal</option>
                                    <option value="Tough" style={{ background: "#1e1e2d", color: "#f87171" }}>🔥 Tough (No P7)</option>
                                    <option value="Light" style={{ background: "#1e1e2d", color: "#34d399" }}>🍃 Light (Afternoon)</option>
                                  </select>
                                  <span
                                    onClick={() => handleToggleTraining(item.id)}
                                    title="Click to toggle External Trainer Continuous Block scheduling mode"
                                    style={{
                                      fontSize: "0.68rem",
                                      fontWeight: "800",
                                      padding: "2px 6px",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      background: item.isTraining ? "rgba(236, 72, 153, 0.22)" : "rgba(255, 255, 255, 0.05)",
                                      color: item.isTraining ? "#f472b6" : "var(--text-muted)",
                                      border: item.isTraining ? "1px solid rgba(236, 72, 153, 0.45)" : "1px solid var(--border-color)",
                                      textAlign: "center",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "3px",
                                      userSelect: "none"
                                    }}
                                  >
                                    {item.isTraining ? "🎯 Trainer Block" : "Regular (1h)"}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ fontWeight: "700", textAlign: "center" }}>
                            <div>{item.hoursPerWeek} hrs</div>
                            {!["Laboratory", "Lab", "Project Work"].includes(item.type) && (
                              <select
                                className="select-input"
                                value={item.slotPattern || (item.isTraining ? (Number(item.hoursPerWeek) >= 7 ? "4+3" : "2+2") : "regular")}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "custom_prompt") {
                                    const customVal = window.prompt(
                                      "Enter Continuous Pattern (e.g. 2+1, 2+2, 3+1, 4):", 
                                      item.slotPattern && item.slotPattern !== "regular" ? item.slotPattern : "2+1"
                                    );
                                    if (customVal && customVal.trim()) {
                                      const clean = customVal.trim();
                                      handleUpdateSlotPattern(item.id, clean);
                                      if (!item.isTraining && clean !== "regular") {
                                        handleToggleTraining(item.id);
                                      } else if (item.isTraining && clean === "regular") {
                                        handleToggleTraining(item.id);
                                      }
                                    }
                                    return;
                                  }

                                  handleUpdateSlotPattern(item.id, val);
                                  if (val !== "regular" && !item.isTraining) {
                                    handleToggleTraining(item.id);
                                  } else if (val === "regular" && item.isTraining) {
                                    handleToggleTraining(item.id);
                                  }
                                }}
                                style={{
                                  fontSize: "0.68rem",
                                  padding: "2px 4px",
                                  marginTop: "4px",
                                  borderRadius: "6px",
                                  background: (item.slotPattern && item.slotPattern !== "regular") || item.isTraining ? "rgba(147, 51, 234, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                  borderColor: (item.slotPattern && item.slotPattern !== "regular") || item.isTraining ? "#a855f7" : "var(--border-color)",
                                  color: (item.slotPattern && item.slotPattern !== "regular") || item.isTraining ? "#c084fc" : "var(--text-muted)",
                                  width: "100%",
                                  maxWidth: "110px",
                                  cursor: "pointer"
                                }}
                                title="Continuous Hours Slot Pattern (e.g. 2h+1h, 2h+2h, 4h Block, or type custom)"
                              >
                                <option value="regular" style={{ background: "#1e1e2d", color: "#f8fafc" }}>1h Daily</option>
                                <option value="2+1" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 2h + 1h</option>
                                <option value="2+2" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 2h + 2h</option>
                                <option value="2+1+1" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 2h + 1h + 1h</option>
                                <option value="3+1" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 3h + 1h</option>
                                <option value="4" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 4h Block</option>
                                <option value="3" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 3h Block</option>
                                <option value="2" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 2h Block</option>
                                <option value="2+2+1" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 2h + 2h + 1h</option>
                                <option value="3+2" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 3h + 2h</option>
                                <option value="4+3" style={{ background: "#1e1e2d", color: "#c084fc" }}>⚡ 4h + 3h Trainer</option>
                                {item.slotPattern && !["regular", "2+1", "2+2", "2+1+1", "3+1", "4", "3", "2", "2+2+1", "3+2", "4+3"].includes(item.slotPattern) && (
                                  <option value={item.slotPattern} style={{ background: "#1e1e2d", color: "#f472b6" }}>⚡ {item.slotPattern} (Custom)</option>
                                )}
                                <option value="custom_prompt" style={{ background: "#1e1e2d", color: "#38bdf8" }}>✏️ Custom Pattern...</option>
                              </select>
                            )}
                          </td>
                          <td>
                            {/* Staff Dropdown Selector */}
                            {!isMultiFaculty ? (
                              // Single Select for Theory, Seminar, Library, etc.
                              <select 
                                className="select-input"
                                value={assignedFacs[0] || ""}
                                onChange={(e) => handleAssignFaculty(item.id, e.target.value, false)}
                                style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}
                              >
                                <option value="">{isLibrary ? "-- No Faculty (Library Self Study) --" : "-- Choose Faculty / Incharge --"}</option>
                                {staffList.map(s => {
                                  const stats = staffWorkloadMap[s.name] || {};
                                  return (
                                    <option key={s._id} value={s.name}>
                                      {s.name} ({stats.theoryCount || 0}T, {stats.labCount || 0}L{stats.trainingCount > 0 ? `, ${stats.trainingCount}Tr` : ""}{stats.otherCount > 0 ? `, ${stats.otherCount}O` : ""})
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              // Multi-Faculty Badge Select for Lab / Project Work
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {assignedFacs.map(f => (
                                    <span 
                                      key={f}
                                      style={{
                                        fontSize: "0.72rem",
                                        background: "rgba(168, 85, 247, 0.2)",
                                        color: "#c084fc",
                                        padding: "2px 8px",
                                        borderRadius: "6px",
                                        border: "1px solid rgba(168, 85, 247, 0.4)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px"
                                      }}
                                    >
                                      {f}
                                      <span 
                                        onClick={() => handleAssignFaculty(item.id, f, true)}
                                        style={{ cursor: "pointer", fontWeight: "bold", marginLeft: "2px" }}
                                      >
                                        ✕
                                      </span>
                                    </span>
                                  ))}
                                </div>
                                <select 
                                  className="select-input"
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) handleAssignFaculty(item.id, e.target.value, true);
                                  }}
                                  style={{ width: "100%", padding: "0.4rem 0.65rem", fontSize: "0.8rem" }}
                                >
                                  <option value="">+ Add Guide / Incharge / Co-Staff...</option>
                                  {staffList.filter(s => !assignedFacs.includes(s.name)).map(s => {
                                    const stats = staffWorkloadMap[s.name] || {};
                                    return (
                                      <option key={s._id} value={s.name}>
                                        {s.name} ({stats.theoryCount || 0}T, {stats.labCount || 0}L{stats.trainingCount > 0 ? `, ${stats.trainingCount}Tr` : ""}{stats.otherCount > 0 ? `, ${stats.otherCount}O` : ""})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: GENERATED CLASH-FREE TIMETABLE & ROUTINE            */}
      {/* ============================================================== */}
      {activeSubTab === "schedule" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Schedule Controls Card */}
          <div className="glass-card" style={{ padding: "1.25rem 1.5rem", borderRadius: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              
              {/* Toggle Class View vs Faculty View */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>VIEW MODE:</span>
                <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", padding: "3px", borderRadius: "8px" }}>
                  <button 
                    onClick={() => setSelectedScheduleView("class")}
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: selectedScheduleView === "class" ? "#6366f1" : "transparent",
                      color: selectedScheduleView === "class" ? "#ffffff" : "var(--text-muted)"
                    }}
                  >
                    📚 Class Timetable
                  </button>
                  <button 
                    onClick={() => setSelectedScheduleView("faculty")}
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      background: selectedScheduleView === "faculty" ? "#6366f1" : "transparent",
                      color: selectedScheduleView === "faculty" ? "#ffffff" : "var(--text-muted)"
                    }}
                  >
                    👨‍🏫 Faculty Routine (Individual)
                  </button>
                </div>
              </div>

              {/* Selector based on view mode */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {selectedScheduleView === "class" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>SELECT CLASS:</span>
                    <select 
                      className="select-input"
                      value={selectedClassKey}
                      onChange={e => setSelectedClassKey(e.target.value)}
                      style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", fontWeight: "700" }}
                    >
                      {timetableSchedule && timetableSchedule.classes && timetableSchedule.classes.map(c => (
                        <option key={c.classKey} value={c.classKey}>
                          {c.year} Year - Section {c.section} ({department})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>SELECT FACULTY:</span>
                    <select 
                      className="select-input"
                      value={selectedFacultyView}
                      onChange={e => setSelectedFacultyView(e.target.value)}
                      style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", fontWeight: "700" }}
                    >
                      {staffList.map(s => {
                        const stats = staffWorkloadMap[s.name] || {};
                        const parts = [];
                        if ((stats.theoryCount || 0) > 0) parts.push(`${stats.theoryCount} Theory`);
                        if ((stats.labCount || 0) > 0) parts.push(`${stats.labCount} Lab`);
                        if ((stats.trainingCount || 0) > 0) parts.push(`${stats.trainingCount} Training (${stats.trainingHours}h)`);
                        const loadStr = parts.length > 0 ? parts.join(", ") : "0 Load";
                        return (
                          <option key={s._id} value={s.name}>
                            {s.name} - {loadStr}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Official Print Buttons */}
                {selectedScheduleView === "class" ? (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowClassPrintModal(true)}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "7px", 
                      background: "linear-gradient(135deg, #4f46e5, #06b6d4)", 
                      color: "#ffffff", 
                      fontWeight: "700",
                      padding: "0.5rem 1.1rem",
                      borderRadius: "8px",
                      boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)"
                    }}
                  >
                    <Printer size={16} />
                    <span>🖨️ Print Class Timetable (Official Format)</span>
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowFacultyPrintModal(true)}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "7px", 
                      background: "linear-gradient(135deg, #059669, #10b981)", 
                      color: "#ffffff", 
                      fontWeight: "700",
                      padding: "0.5rem 1.1rem",
                      borderRadius: "8px",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)"
                    }}
                  >
                    <Printer size={16} />
                    <span>🖨️ Print / Download Faculty Routine (Official Format)</span>
                  </button>
                )}

                {/* Period Timings Config Button */}
                <button 
                  className="btn btn-secondary"
                  onClick={handleOpenTimingsModal}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "7px", 
                    fontWeight: "700",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px"
                  }}
                  title="Configure official start and end times for all 7 periods"
                >
                  <Clock size={16} />
                  <span>⏱️ Period Timings</span>
                </button>

                {/* Version History Button */}
                <button 
                  className="btn btn-secondary"
                  onClick={() => { fetchHistory(); setShowHistoryModal(true); }}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "7px", 
                    fontWeight: "700",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px"
                  }}
                  title="View and restore previously generated timetables"
                >
                  <History size={16} />
                  <span>📜 History ({historyList.length})</span>
                </button>

                {/* Finalize / Lock Button */}
                {timetableSchedule && timetableSchedule.classes && timetableSchedule.classes.length > 0 && (
                  <button 
                    className="btn"
                    onClick={handleToggleLock}
                    disabled={lockingSchedule}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "7px",
                      background: timetableSchedule.isLocked 
                        ? "rgba(239, 68, 68, 0.15)" 
                        : "linear-gradient(135deg, #10b981, #059669)",
                      color: timetableSchedule.isLocked ? "#ef4444" : "#ffffff",
                      border: timetableSchedule.isLocked ? "1px solid rgba(239, 68, 68, 0.4)" : "none",
                      fontWeight: "700",
                      padding: "0.5rem 1.1rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      boxShadow: timetableSchedule.isLocked ? "none" : "0 4px 14px rgba(16, 185, 129, 0.35)"
                    }}
                    title={timetableSchedule.isLocked ? "Click to unlock this timetable for editing/generating" : "Click to finalize & protect this timetable"}
                  >
                    {timetableSchedule.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                    <span>{timetableSchedule.isLocked ? "🔓 Unlock Schedule" : "🔒 Finalize & Lock"}</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* SCHEDULE GRID DISPLAY */}
          {!timetableSchedule || !timetableSchedule.classes || timetableSchedule.classes.length === 0 ? (
            <div className="glass-card" style={{ padding: "3rem 1rem", textAlign: "center", borderRadius: "16px" }}>
              <Clock size={48} style={{ opacity: 0.4, marginBottom: "1rem" }} />
              <h3 style={{ margin: 0, fontWeight: "700" }}>No Timetable Schedule Generated Yet</h3>
              <p style={{ color: "var(--text-muted)", maxWidth: "450px", margin: "0.5rem auto 1.5rem" }}>
                Switch to "Workload & Staff Allocation" tab, assign faculty for each year's subjects, and click "Auto-Generate Timetable".
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setActiveSubTab("allocation")}
              >
                Go to Allocation Tab
              </button>
            </div>
          ) : selectedScheduleView === "class" ? (
            // ================= CLASS SCHEDULE GRID =================
            currentClassSchedule && (
              <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "var(--text-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                      Class Schedule: {currentClassSchedule.year} Year - Section {currentClassSchedule.section}
                      {timetableSchedule?.isLocked && (
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: "800"
                        }}>
                          🔒 FINALIZED / OFFICIAL
                        </span>
                      )}
                    </h2>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Department of {department} | Academic Year {academicYear} | {semesterType} Semester
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#818cf8" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(99, 102, 241, 0.4)" }}></span> Theory
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#c084fc" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(168, 85, 247, 0.4)" }}></span> Laboratory
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "#94a3b8" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: "rgba(148, 163, 184, 0.2)" }}></span> Library / Seminar
                    </span>
                  </div>
                </div>

                {/* Timetable Table */}
                <div className="table-container">
                  <table className="admin-table" style={{ borderCollapse: "separate", borderSpacing: "4px" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "110px", textAlign: "center" }}>Day / Period</th>
                        {[1, 2, 3, 4, 5, 6, 7].map(p => (
                          <th key={p} style={{ textAlign: "center", minWidth: "135px" }}>
                            <div style={{ fontWeight: "800" }}>Period {p}</div>
                            <div style={{ fontSize: "0.7rem", fontWeight: "600", opacity: 0.85, color: "#818cf8" }}>
                              {periodTimings[p] || DEFAULT_PERIOD_TIMINGS[p]}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => {
                        const daySlots = currentClassSchedule.days[day] || [];

                        return (
                          <tr key={day}>
                            <td style={{ fontWeight: "800", color: "#818cf8", textAlign: "center", background: "rgba(99, 102, 241, 0.05)" }}>
                              {day}
                            </td>
                            {daySlots.map((slot, sIdx) => {
                              const isLab = slot.type === "Lab";
                              const isFree = slot.type === "Free";

                              return (
                                <td 
                                  key={sIdx}
                                  onClick={() => handleOpenSlotEdit(currentClassSchedule.classKey, day, slot)}
                                  title={`Click to manually edit Period ${slot.period} on ${day} ✏️`}
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    position: "relative",
                                    background: isFree 
                                      ? "rgba(255, 255, 255, 0.015)" 
                                      : isLab 
                                        ? "rgba(168, 85, 247, 0.12)" 
                                        : "rgba(99, 102, 241, 0.12)",
                                    border: isFree 
                                      ? "1px dashed rgba(255, 255, 255, 0.12)" 
                                      : isLab 
                                        ? "1px solid rgba(168, 85, 247, 0.3)" 
                                        : "1px solid rgba(99, 102, 241, 0.3)",
                                    transition: "all 0.18s ease"
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.25)";
                                    e.currentTarget.style.borderColor = "#818cf8";
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.transform = "none";
                                    e.currentTarget.style.boxShadow = "none";
                                    e.currentTarget.style.borderColor = isFree 
                                      ? "rgba(255, 255, 255, 0.12)" 
                                      : isLab 
                                        ? "rgba(168, 85, 247, 0.3)" 
                                        : "rgba(99, 102, 241, 0.3)";
                                  }}
                                >
                                  {isFree ? (
                                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic", padding: "4px 0" }}>
                                      {slot.shortName || "Free"}
                                      <div style={{ fontSize: "0.62rem", opacity: 0.6, marginTop: "2px" }}>✏️ Edit</div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div style={{ fontWeight: "800", fontSize: "0.9rem", color: isLab ? "#c084fc" : "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                                        <span>{slot.shortName || slot.subjectCode}</span>
                                        {slot.isTraining && <span title="External Trainer Continuous Block Session" style={{ fontSize: "0.72rem" }}>🎯</span>}
                                        {slot.difficulty === "Tough" && <span title="Tough / Problematic Subject (Protected from Period 7)" style={{ fontSize: "0.72rem" }}>🔥</span>}
                                        {slot.difficulty === "Light" && <span title="Light Subject" style={{ fontSize: "0.72rem" }}>🍃</span>}
                                      </div>
                                      <div style={{ fontSize: "0.72rem", color: "var(--text-color)", opacity: 0.85, marginTop: "2px" }}>
                                        {slot.facultyName || "-"}
                                      </div>
                                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                        {slot.room || (isLab ? "Lab" : "LH-1")}
                                      </div>
                                    </div>
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
            )
          ) : (
            // ================= FACULTY ROUTINE VIEW =================
            <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "var(--text-color)" }}>
                    Faculty Routine: {selectedFacultyView}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#818cf8", fontWeight: "700" }}>
                      📘 Theory: {staffWorkloadMap[selectedFacultyView]?.theoryCount || 0}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#c084fc", fontWeight: "700" }}>
                      🔬 Lab: {staffWorkloadMap[selectedFacultyView]?.labCount || 0}
                    </span>
                    {(staffWorkloadMap[selectedFacultyView]?.trainingCount || 0) > 0 && (
                      <span style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: "700" }}>
                        🎯 Training: {staffWorkloadMap[selectedFacultyView]?.trainingCount} ({staffWorkloadMap[selectedFacultyView]?.trainingHours}h)
                      </span>
                    )}
                    <span style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "700" }}>
                      ⏱️ Total Workload: {staffWorkloadMap[selectedFacultyView]?.totalHours || 0} Hours/Week
                    </span>
                  </div>
                </div>
                <div style={{ padding: "4px 12px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid #10b981", fontSize: "0.8rem", fontWeight: "700" }}>
                  ✅ 0% Period Clash (Verified)
                </div>
              </div>

              {/* Faculty Weekly Routine Table */}
              <div className="table-container">
                <table className="admin-table" style={{ borderCollapse: "separate", borderSpacing: "4px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "110px", textAlign: "center" }}>Day / Period</th>
                      {[1, 2, 3, 4, 5, 6, 7].map(p => (
                        <th key={p} style={{ textAlign: "center", minWidth: "135px" }}>
                          <div style={{ fontWeight: "800" }}>Period {p}</div>
                          <div style={{ fontSize: "0.7rem", fontWeight: "600", opacity: 0.85, color: "#10b981" }}>
                            {periodTimings[p] || DEFAULT_PERIOD_TIMINGS[p]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => {
                      const facRoutine = facultySchedules[selectedFacultyView]?.days[day] || [];

                      return (
                        <tr key={day}>
                          <td style={{ fontWeight: "800", color: "#818cf8", textAlign: "center", background: "rgba(99, 102, 241, 0.05)" }}>
                            {day}
                          </td>
                          {facRoutine.map((slot, sIdx) => {
                            const isBusy = slot.occupied;
                            const isLab = slot.type === "Lab";

                            return (
                              <td 
                                key={sIdx}
                                style={{
                                  padding: "8px",
                                  textAlign: "center",
                                  borderRadius: "8px",
                                  background: !isBusy 
                                    ? "rgba(255, 255, 255, 0.015)" 
                                    : isLab 
                                      ? "rgba(168, 85, 247, 0.15)" 
                                      : "rgba(99, 102, 241, 0.15)",
                                  border: !isBusy 
                                    ? "1px dashed rgba(255, 255, 255, 0.08)" 
                                    : isLab 
                                      ? "1px solid rgba(168, 85, 247, 0.4)" 
                                      : "1px solid rgba(99, 102, 241, 0.4)"
                                }}
                              >
                                {!isBusy ? (
                                  <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>
                                    Free
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{
                                      display: "inline-block",
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      fontSize: "0.7rem",
                                      fontWeight: "800",
                                      background: isLab ? "#a855f7" : "#6366f1",
                                      color: "#ffffff",
                                      marginBottom: "4px"
                                    }}>
                                      {slot.classKey}
                                    </div>
                                    <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--text-color)" }}>
                                      {slot.shortName || slot.subjectName}
                                    </div>
                                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                      {slot.type}
                                    </div>
                                  </div>
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
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: ADMIN MASTER SETUP (STAFF & SUBJECTS)               */}
      {/* ============================================================== */}
      {activeSubTab === "master" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
          
          {/* SECTION 0: YEAR & INTAKE SECTION CONFIGURATION */}
          <div className="glass-card" style={{ gridColumn: "1 / -1", padding: "1.5rem 1.75rem", borderRadius: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>🎓</span>
                  <span>Year-Wise Sections & Intake Configuration</span>
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Configure presets (1 to 5+ sections) or add/remove custom sections per year based on student intake
                </span>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={handleSaveAllocations}
                style={{ fontSize: "0.8rem", padding: "0.45rem 1rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Save size={15} />
                <span>Save Section Settings</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.2rem" }}>
              {[
                { key: "I", label: "I Year", sem: semesterType === "Odd" ? "Semester 1" : "Semester 2", color: "#38bdf8" },
                { key: "II", label: "II Year", sem: semesterType === "Odd" ? "Semester 3" : "Semester 4", color: "#60a5fa" },
                { key: "III", label: "III Year", sem: semesterType === "Odd" ? "Semester 5" : "Semester 6", color: "#c084fc" },
                { key: "IV", label: "IV Year (Final)", sem: semesterType === "Odd" ? "Semester 7" : "Semester 8", color: "#f59e0b" }
              ].map(yr => {
                const currentSecs = (yearSections && yearSections[yr.key]) || ["A", "B"];
                return (
                  <div key={yr.key} style={{
                    background: "rgba(0,0,0,0.18)",
                    padding: "1.1rem",
                    borderRadius: "14px",
                    border: `1px solid rgba(255,255,255,0.08)`,
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {/* Header: Title and Active Section Badges with Delete (✕) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <div style={{ fontWeight: "700", fontSize: "0.95rem", color: yr.color }}>{yr.label}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{yr.sem}</div>
                      </div>

                      {/* Active Section Pills */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        {currentSecs.map(s => {
                          const bStyle = getSectionBadgeStyle(s);
                          return (
                            <span 
                              key={s} 
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "800",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                background: bStyle.bg,
                                color: bStyle.text,
                                border: `1px solid ${bStyle.border}`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px"
                              }}
                            >
                              <span>Sec {s}</span>
                              {currentSecs.length > 1 && (
                                <button
                                  type="button"
                                  title={`Remove Section ${s}`}
                                  onClick={() => handleRemoveSection(yr.key, s)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: bStyle.text,
                                    cursor: "pointer",
                                    padding: "0 2px",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                    opacity: 0.7,
                                    lineHeight: 1
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                  onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Preset Buttons (1 to 5 Sections) */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700" }}>QUICK PRESETS:</span>
                        <span style={{ fontSize: "0.68rem", color: yr.color }}>{currentSecs.length} Active Sec{currentSecs.length > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "5px" }}>
                        {[1, 2, 3, 4, 5].map(num => {
                          const standard = ["A", "B", "C", "D", "E"].slice(0, num);
                          const isActive = currentSecs.length === num && standard.every((s, i) => currentSecs[i] === s);
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleUpdateYearSectionCount(yr.key, num)}
                              style={{
                                padding: "6px 2px",
                                fontSize: "0.73rem",
                                fontWeight: "700",
                                borderRadius: "6px",
                                border: isActive ? `1px solid ${yr.color}` : "1px solid var(--border-color)",
                                background: isActive ? `${yr.color}25` : "rgba(0,0,0,0.2)",
                                color: isActive ? yr.color : "var(--text-muted)",
                                cursor: "pointer",
                                textAlign: "center",
                                transition: "all 0.2s ease"
                              }}
                            >
                              {num} Sec{num > 1 ? "s" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Add Section Input Field */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700", display: "block", marginBottom: "5px" }}>
                        OR ADD CUSTOM SECTION:
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <input 
                          type="text"
                          placeholder="e.g. E or F"
                          maxLength={5}
                          value={customSectionInputs[yr.key] || ""}
                          onChange={e => setCustomSectionInputs({ ...customSectionInputs, [yr.key]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomSection(yr.key);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "5px 10px",
                            fontSize: "0.78rem",
                            borderRadius: "6px",
                            background: "rgba(0,0,0,0.35)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-color)"
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddCustomSection(yr.key)}
                          style={{
                            padding: "5px 12px",
                            fontSize: "0.76rem",
                            fontWeight: "700",
                            borderRadius: "6px",
                            background: `${yr.color}25`,
                            border: `1px solid ${yr.color}`,
                            color: yr.color,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          + Add Sec
                        </button>
                      </div>
                    </div>

                    {/* Class Advisor Configuration (Monday Period 1 Incharges) */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "8px" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                        👨‍🏫 CLASS ADVISORS (If teaching a subject in this class, scheduled on Monday Period 1):
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {currentSecs.map(s => {
                          const classKey = `${yr.key}-${s}`;
                          const currentAdvisor = classAdvisors[classKey] || "";

                          return (
                            <div 
                              key={s} 
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                background: "rgba(0,0,0,0.25)",
                                padding: "4px 8px",
                                borderRadius: "8px",
                                border: "1px solid rgba(255,255,255,0.05)"
                              }}
                            >
                              <span style={{ fontSize: "0.75rem", fontWeight: "800", color: yr.color, minWidth: "48px" }}>
                                Sec {s}:
                              </span>
                              <select
                                className="select-input"
                                value={currentAdvisor}
                                onChange={e => {
                                  const updated = { ...classAdvisors, [classKey]: e.target.value };
                                  setClassAdvisors(updated);
                                  localStorage.setItem("timetable_class_advisors", JSON.stringify(updated));
                                }}
                                style={{ flex: 1, padding: "3px 6px", fontSize: "0.76rem" }}
                              >
                                <option value="">-- Choose Class Advisor --</option>
                                {staffList.map(st => (
                                  <option key={st._id} value={st.name}>
                                    {st.name} ({st.designation})
                                  </option>
                                ))}
                              </select>
                              {currentAdvisor && (
                                <span style={{
                                  fontSize: "0.68rem",
                                  fontWeight: "700",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "#10b981",
                                  whiteSpace: "nowrap"
                                }}>
                                  Mon P1 📌
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 0B: OFFICIAL TIMETABLE PRINT & IQAC HEADER CONFIGURATION */}
          <div className="glass-card" style={{ 
            gridColumn: "1 / -1", 
            padding: "1.5rem 1.75rem", 
            borderRadius: "16px", 
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))", 
            border: "1px solid rgba(99, 102, 241, 0.3)" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", color: "#818cf8" }}>
                  <span>🏛️</span>
                  <span>Official Timetable Print & IQAC Header Configuration</span>
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Fill IQAC Number, Class Hall Numbers, and Coordinators to appear dynamically in the printed timetable headers
                </span>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveAllocations}
                style={{ fontSize: "0.82rem", padding: "0.5rem 1.25rem", display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #4f46e5, #06b6d4)", color: "#fff", fontWeight: "700" }}
              >
                <Save size={15} />
                <span>Save IQAC & Print Settings</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {/* Card 1: IQAC Reference Number */}
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>📋</span>
                  <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#38bdf8" }}>IQAC Number (Top-Right Header)</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 10px 0" }}>
                  Whatever you enter here will automatically appear on the top right of the official Faculty Timetable:
                </p>
                <input 
                  type="text"
                  className="select-input"
                  value={iqacNumber}
                  onChange={e => {
                    setIqacNumber(e.target.value);
                    localStorage.setItem("timetable_iqac_number", e.target.value);
                  }}
                  placeholder="e.g. MEC/IQAC/2026 - 27/CSE/006"
                  style={{ width: "100%", padding: "0.6rem 0.9rem", fontSize: "0.95rem", fontWeight: "700", letterSpacing: "0.5px", background: "rgba(0,0,0,0.4)" }}
                />
                <span style={{ fontSize: "0.7rem", color: "#38bdf8", opacity: 0.85, marginTop: "6px", display: "block" }}>
                  💡 Live Output: <code>{iqacNumber || "MEC/IQAC/2026 - 27/CSE/006"}</code>
                </span>
              </div>

              {/* Card 2: Coordinators and Incharges */}
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(192, 132, 252, 0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>👥</span>
                  <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#c084fc" }}>Official Coordinators (Print Footer)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>Exam Coordinator:</label>
                    <input 
                      type="text" 
                      className="select-input"
                      value={coordinators.examCoordinator || ""} 
                      onChange={e => setCoordinators(prev => ({ ...prev, examCoordinator: e.target.value }))}
                      placeholder="e.g. Mrs.M.Logapriya, AP/CSE"
                      style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>Placement Coordinator:</label>
                    <input 
                      type="text" 
                      className="select-input"
                      value={coordinators.placementCoordinator || ""} 
                      onChange={e => setCoordinators(prev => ({ ...prev, placementCoordinator: e.target.value }))}
                      placeholder="e.g. Mrs.M.Buvaneswari, AP/CSE"
                      style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>Timetable Incharge:</label>
                    <input 
                      type="text" 
                      className="select-input"
                      value={coordinators.timetableIncharge || ""} 
                      onChange={e => setCoordinators(prev => ({ ...prev, timetableIncharge: e.target.value }))}
                      placeholder="TIME TABLE INCHARGE"
                      style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "3px" }}>HOD Name / Signature:</label>
                    <input 
                      type="text" 
                      className="select-input"
                      value={coordinators.hod || ""} 
                      onChange={e => setCoordinators(prev => ({ ...prev, hod: e.target.value }))}
                      placeholder="HOD"
                      style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Hall Numbers per Class */}
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(52, 211, 153, 0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>🚪</span>
                  <span style={{ fontWeight: "700", fontSize: "0.95rem", color: "#34d399" }}>Class Hall Numbers (HALL NO)</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 8px 0" }}>
                  Enter room/hall for each section to appear on top-right of Class Timetable:
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px", maxHeight: "150px", overflowY: "auto", paddingRight: "4px" }}>
                  {["I", "II", "III", "IV"].flatMap(yr => ((yearSections && yearSections[yr]) || ["A", "B"]).map(s => {
                    const ck = `${yr}-${s}`;
                    return (
                      <div key={ck} style={{ background: "rgba(0,0,0,0.25)", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: "800", color: "#34d399" }}>{ck}:</span>
                        <input 
                          type="text"
                          className="select-input"
                          value={hallNumbers[ck] || ""}
                          onChange={e => setHallNumbers(prev => ({ ...prev, [ck]: e.target.value }))}
                          placeholder="LH-1"
                          style={{ width: "100%", padding: "3px 6px", fontSize: "0.78rem", marginTop: "2px" }}
                        />
                      </div>
                    );
                  }))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: STAFF MASTER MANAGEMENT */}
          <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Faculty Master List</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Total {staffList.length} faculty registered in {department}
                </span>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={handleSyncUsers} 
                disabled={loading}
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <RefreshCw size={14} />
                <span>Sync from Users</span>
              </button>
            </div>

            {/* Add / Edit Staff Form */}
            <form onSubmit={handleSaveStaff} style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "10px", 
              background: editingStaffId ? "rgba(99, 102, 241, 0.08)" : "rgba(0,0,0,0.15)", 
              padding: "1rem", 
              borderRadius: "12px", 
              border: editingStaffId ? "1px solid #6366f1" : "1px solid var(--border-color)", 
              marginBottom: "1.25rem",
              transition: "all 0.3s ease"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "700", fontSize: "0.85rem", color: editingStaffId ? "#a855f7" : "#818cf8" }}>
                  {editingStaffId ? `✏️ Edit Faculty Member: ${newStaff.name}` : "+ Add New Faculty Member"}
                </span>
                {editingStaffId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEditStaff}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Cancel Edit ✕
                  </button>
                )}
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px" }}>
                <div>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Faculty Name (e.g. Dr. Rajesh K)" 
                    value={newStaff.name} 
                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                    required
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Staff Code" 
                    value={newStaff.staffCode} 
                    onChange={e => setNewStaff({ ...newStaff, staffCode: e.target.value })}
                    style={{ fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* Designation selector with Custom option */}
              <div style={{ display: "grid", gridTemplateColumns: isCustomDesignation ? "1fr 1fr" : "1fr", gap: "8px" }}>
                <div>
                  <select 
                    className="select-input" 
                    value={isCustomDesignation ? "custom" : newStaff.designation} 
                    onChange={e => {
                      if (e.target.value === "custom") {
                        setIsCustomDesignation(true);
                        setNewStaff({ ...newStaff, designation: "custom" });
                      } else {
                        setIsCustomDesignation(false);
                        setNewStaff({ ...newStaff, designation: e.target.value });
                      }
                    }}
                    style={{ fontSize: "0.85rem" }}
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Professor & Head">Professor & Head</option>
                    <option value="Teaching Assistant (TA)">Teaching Assistant (TA)</option>
                    <option value="Lab Assistant">Lab Assistant</option>
                    <option value="custom">✍️ Custom / Type Manually...</option>
                  </select>
                </div>

                {isCustomDesignation && (
                  <div>
                    <input 
                      type="text" 
                      className="text-input" 
                      placeholder="Type Designation (e.g. TA, Guest Lecturer)" 
                      value={customDesignationText} 
                      onChange={e => setCustomDesignationText(e.target.value)}
                      required={isCustomDesignation}
                      style={{ fontSize: "0.85rem", borderColor: "#a855f7" }}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={loading}
                  style={{ 
                    flex: 1, 
                    justifyContent: "center", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    fontSize: "0.85rem",
                    background: editingStaffId ? "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)" : undefined
                  }}
                >
                  {editingStaffId ? <Save size={16} /> : <Plus size={16} />}
                  <span>{editingStaffId ? "Update Faculty Member" : "Add Faculty Member"}</span>
                </button>

                {editingStaffId && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCancelEditStaff}
                    style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Staff List Table with Edit and Delete options */}
            <div style={{ maxHeight: "350px", overflowY: "auto" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th>Designation</th>
                    <th style={{ width: "90px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s._id} style={{ background: editingStaffId === s._id ? "rgba(99, 102, 241, 0.1)" : undefined }}>
                      <td>
                        <div style={{ fontWeight: "700" }}>{s.name}</div>
                        {s.staffCode && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Code: {s.staffCode}</div>}
                      </td>
                      <td>
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          background: s.designation && s.designation.toLowerCase().includes("ta") ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          color: s.designation && s.designation.toLowerCase().includes("ta") ? "#f59e0b" : "var(--text-muted)",
                          border: s.designation && s.designation.toLowerCase().includes("ta") ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid var(--border-color)"
                        }}>
                          {s.designation}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                          <button 
                            onClick={() => handleStartEditStaff(s)}
                            style={{ 
                              background: "rgba(99, 102, 241, 0.15)", 
                              border: "1px solid rgba(99, 102, 241, 0.3)", 
                              color: "#818cf8", 
                              cursor: "pointer", 
                              padding: "4px 8px", 
                              borderRadius: "6px" 
                            }}
                            title="Edit faculty member"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteStaff(s._id, s.name)}
                            style={{ 
                              background: "rgba(239, 68, 68, 0.15)", 
                              border: "1px solid rgba(239, 68, 68, 0.3)", 
                              color: "var(--danger)", 
                              cursor: "pointer", 
                              padding: "4px 8px", 
                              borderRadius: "6px" 
                            }}
                            title="Delete faculty member"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION B: SUBJECT & CURRICULUM MASTER */}
          <div className="glass-card" style={{ padding: "1.75rem", borderRadius: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>Curriculum & Subjects</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Configure Theory & Lab subjects for Year/Sem
                </span>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={handleLoadSampleSubjects}
                disabled={loading}
                style={{ fontSize: "0.75rem", padding: "0.4rem 0.8rem" }}
              >
                Reset / Load Samples
              </button>
            </div>

            {/* Add or Edit Subject Form */}
            <form 
              id="curriculum-subject-form"
              onSubmit={handleSaveSubject} 
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "10px", 
                background: editingSubject ? "rgba(168, 85, 247, 0.08)" : "rgba(0,0,0,0.15)", 
                padding: "1rem", 
                borderRadius: "12px", 
                border: editingSubject ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid var(--border-color)", 
                marginBottom: "1.25rem",
                transition: "all 0.3s ease"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.85rem", color: editingSubject ? "#c084fc" : "#818cf8" }}>
                    {editingSubject ? `✏️ Edit Subject: ${editingSubject.originalCode}` : "+ Add Subject to Curriculum"}
                  </span>
                  {editingSubject && (
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: "rgba(168, 85, 247, 0.2)",
                      color: "#c084fc",
                      border: "1px solid rgba(168, 85, 247, 0.4)"
                    }}>
                      EDIT MODE
                    </span>
                  )}
                </div>

                {editingSubject && (
                  <button 
                    type="button" 
                    onClick={handleCancelEditSubject}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      padding: "2px 6px"
                    }}
                  >
                    Cancel ✕
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>YEAR</span>
                  <select 
                    className="select-input" 
                    value={subjectForm.year} 
                    onChange={e => {
                      const y = e.target.value;
                      const defaultSem = semesterType === "Odd" 
                        ? (y === "I" ? 1 : (y === "II" ? 3 : (y === "III" ? 5 : 7)))
                        : (y === "I" ? 2 : (y === "II" ? 4 : (y === "III" ? 6 : 8)));
                      const defaultBatch = y === "I" ? "2025-2029" : (y === "II" ? "2024-2028" : (y === "III" ? "2023-2027" : "2022-2026"));
                      setSubjectForm({ ...subjectForm, year: y, semester: defaultSem, batch: defaultBatch });
                    }}
                    style={{ fontSize: "0.85rem" }}
                  >
                    <option value="I">I Year</option>
                    <option value="II">II Year</option>
                    <option value="III">III Year</option>
                    <option value="IV">Final Year</option>
                  </select>
                </div>

                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>SEMESTER</span>
                  <select 
                    className="select-input" 
                    value={subjectForm.semester} 
                    onChange={e => setSubjectForm({ ...subjectForm, semester: Number(e.target.value) })}
                    style={{ fontSize: "0.85rem" }}
                  >
                    {(semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8]).map(s => (
                      <option key={s} value={s}>Sem {s} ({semesterType} Sem)</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: isCustomSubjectType ? "1fr 1fr" : "1fr", gap: "8px" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>TYPE</span>
                    <select 
                      className="select-input" 
                      value={isCustomSubjectType ? "custom" : (subjectForm.type === "Lab" ? "Laboratory" : subjectForm.type)} 
                      onChange={e => {
                        if (e.target.value === "custom") {
                          setIsCustomSubjectType(true);
                          setSubjectForm({ ...subjectForm, type: "custom" });
                        } else {
                          setIsCustomSubjectType(false);
                          const t = e.target.value;
                          let hrs = 4;
                          let isTr = subjectForm.isTraining;
                          if (t === "Training") { hrs = 4; isTr = true; }
                          else if (t === "Laboratory" || t === "Project Work") hrs = 3;
                          else if (t === "Seminar" || t === "Library" || t === "Mentoring / Tutor Ward") hrs = 1;
                          else if (t === "Placement / Soft Skills") hrs = 2;
                          setSubjectForm({ ...subjectForm, type: t, isTraining: isTr, hoursPerWeek: hrs });
                        }
                      }}
                      style={{ fontSize: "0.85rem" }}
                    >
                      <option value="Theory">📘 Theory</option>
                      <option value="Training">🎯 External Training / Continuous Block</option>
                      <option value="Laboratory">🔬 Laboratory</option>
                      <option value="Project Work">🚀 Project Work</option>
                      <option value="Seminar">🎤 Seminar / Presentation</option>
                      <option value="Library">📚 Library Hour</option>
                      <option value="Placement / Soft Skills">💼 Placement / Soft Skills</option>
                      <option value="Mentoring / Tutor Ward">👥 Mentoring / Tutor Ward</option>
                      <option value="NPTEL / Online Course">💻 NPTEL / Online Course</option>
                      <option value="custom">✍️ Custom (Type Manually)...</option>
                    </select>
                  </div>

                  {isCustomSubjectType && (
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>CUSTOM TYPE NAME</span>
                      <input 
                        type="text" 
                        className="text-input" 
                        placeholder="e.g. Mini Project, Sports" 
                        value={customSubjectTypeText} 
                        onChange={e => setCustomSubjectTypeText(e.target.value)}
                        required={isCustomSubjectType}
                        style={{ fontSize: "0.85rem", borderColor: "#a855f7" }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Code (e.g. CS3401)" 
                  value={subjectForm.code} 
                  onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  required
                  style={{ fontSize: "0.85rem" }}
                />
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Subject Name (e.g. Operating Systems)" 
                  value={subjectForm.name} 
                  onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  required
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              {/* External Trainer / Continuous Block Selection Box */}
              <div 
                onClick={() => setSubjectForm(prev => {
                  const nextIsTraining = !prev.isTraining;
                  let nextPattern = prev.slotPattern;
                  if (nextIsTraining && (!nextPattern || nextPattern === "regular")) {
                    const h = Number(prev.hoursPerWeek) || 4;
                    nextPattern = h >= 7 ? "4+3" : (h === 4 ? "2+2" : (h === 3 ? "3" : (h === 2 ? "2" : "2+2")));
                  } else if (!nextIsTraining) {
                    nextPattern = "regular";
                  }
                  return { ...prev, isTraining: nextIsTraining, slotPattern: nextPattern };
                })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") ? "rgba(236, 72, 153, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  border: subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") ? "1.5px solid #ec4899" : "1px solid var(--border-color)",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="checkbox"
                    id="subjectIsTraining"
                    checked={!!subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular")}
                    onChange={e => {
                      e.stopPropagation();
                      const checked = e.target.checked;
                      setSubjectForm(prev => {
                        let nextPattern = prev.slotPattern;
                        if (checked && (!nextPattern || nextPattern === "regular")) {
                          const h = Number(prev.hoursPerWeek) || 4;
                          nextPattern = h >= 7 ? "4+3" : (h === 4 ? "2+2" : (h === 3 ? "3" : (h === 2 ? "2" : "2+2")));
                        } else if (!checked) {
                          nextPattern = "regular";
                        }
                        return { ...prev, isTraining: checked, slotPattern: nextPattern };
                      });
                    }}
                    style={{ width: "17px", height: "17px", cursor: "pointer", accentColor: "#ec4899" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.84rem", fontWeight: "800", color: subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") ? "#f472b6" : "var(--text-color)" }}>
                      🎯 Continuous Block Session (e.g. DAA 2h+2h, Aptitude, Trainer)
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular")
                        ? `Continuous block active: ${subjectForm.slotPattern || "2+2"} (Scheduled as continuous periods on separate days)`
                        : "Click here to mark as Continuous Session (e.g. 2h+2h continuous periods)"}
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: "800",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  background: subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") ? "rgba(236, 72, 153, 0.3)" : "rgba(255, 255, 255, 0.08)",
                  color: subjectForm.isTraining || (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") ? "#f472b6" : "var(--text-muted)",
                  whiteSpace: "nowrap"
                }}>
                  {subjectForm.slotPattern && subjectForm.slotPattern !== "regular" ? `⚡ ${subjectForm.slotPattern.toUpperCase()} BLOCK` : (subjectForm.isTraining ? "⚡ CONTINUOUS" : "REGULAR (1H)")}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr 1.6fr", gap: "8px" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>SHORT NAME</span>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Short (e.g. DAA)" 
                    value={subjectForm.shortName} 
                    onChange={e => setSubjectForm({ ...subjectForm, shortName: e.target.value })}
                    style={{ fontSize: "0.85rem", width: "100%" }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>HOURS / WEEK</span>
                  <input 
                    type="number" 
                    className="text-input" 
                    placeholder="Hours/Week" 
                    value={subjectForm.hoursPerWeek} 
                    onChange={e => setSubjectForm({ ...subjectForm, hoursPerWeek: e.target.value })}
                    style={{ fontSize: "0.85rem", width: "100%" }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>DIFFICULTY</span>
                  <select
                    className="select-input"
                    value={subjectForm.difficulty || "Normal"}
                    onChange={e => setSubjectForm({ ...subjectForm, difficulty: e.target.value })}
                    style={{ 
                      fontSize: "0.85rem",
                      width: "100%",
                      borderColor: subjectForm.difficulty === "Tough" ? "#ef4444" : (subjectForm.difficulty === "Light" ? "#10b981" : "var(--border-color)")
                    }}
                    title="Tough: strictly blocks Period 7 & avoids Period 6. Morning priority. Light: afternoon priority."
                  >
                    <option value="Normal">📘 Normal</option>
                    <option value="Tough">🔥 Tough (No P7)</option>
                    <option value="Light">🍃 Light (Afternoon)</option>
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>SESSION PATTERN</span>
                  <select
                    className="select-input"
                    value={isCustomSlotPattern ? "custom" : (subjectForm.slotPattern || "regular")}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "custom") {
                        setIsCustomSlotPattern(true);
                        const defaultCustom = (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") ? subjectForm.slotPattern : "2+1";
                        setCustomSlotPatternText(defaultCustom);
                        setSubjectForm(prev => ({ ...prev, slotPattern: defaultCustom, isTraining: true }));
                      } else {
                        setIsCustomSlotPattern(false);
                        setCustomSlotPatternText("");
                        setSubjectForm(prev => ({
                          ...prev,
                          slotPattern: val,
                          isTraining: val !== "regular"
                        }));
                      }
                    }}
                    style={{ 
                      fontSize: "0.82rem",
                      width: "100%",
                      borderColor: (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") || isCustomSlotPattern ? "#a855f7" : "var(--border-color)",
                      color: (subjectForm.slotPattern && subjectForm.slotPattern !== "regular") || isCustomSlotPattern ? "#c084fc" : "inherit"
                    }}
                    title="Choose whether this subject runs as regular 1-hour periods daily, or continuous 2h+1h, 2h+2h, 4h block, or enter custom pattern."
                  >
                    <option value="regular">1h Daily (Regular)</option>
                    <option value="2+1">⚡ 2h + 1h Continuous</option>
                    <option value="2+2">⚡ 2h + 2h Continuous</option>
                    <option value="2+1+1">⚡ 2h + 1h + 1h</option>
                    <option value="3+1">⚡ 3h + 1h</option>
                    <option value="4">⚡ 4h Half-Day Block</option>
                    <option value="3">⚡ 3h Half-Day Block</option>
                    <option value="2">⚡ 2h Continuous Block</option>
                    <option value="2+2+1">⚡ 2h + 2h + 1h</option>
                    <option value="3+2">⚡ 3h + 2h</option>
                    <option value="4+3">⚡ 4h + 3h (Trainer Flip)</option>
                    {subjectForm.slotPattern && !["regular", "2+1", "2+2", "2+1+1", "3+1", "4", "3", "2", "2+2+1", "3+2", "4+3", "custom"].includes(subjectForm.slotPattern) && (
                      <option value={subjectForm.slotPattern}>⚡ {subjectForm.slotPattern} (Custom)</option>
                    )}
                    <option value="custom">✏️ Custom Pattern (Enter manual e.g. 2+1)...</option>
                  </select>
                </div>
              </div>

              {/* Custom Continuous Pattern Manual Input Box */}
              {isCustomSlotPattern && (
                <div style={{
                  background: "rgba(168, 85, 247, 0.1)",
                  border: "1.5px dashed #a855f7",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: "800", color: "#c084fc" }}>
                      ✏️ ENTER CUSTOM CONTINUOUS PATTERN:
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      Separate hours with '+' (e.g. <b>2+1</b>, <b>2+2</b>, <b>3+1</b>)
                    </span>
                  </div>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="Enter pattern e.g. 2+1, 2+2, 3+1" 
                    value={customSlotPatternText} 
                    onChange={e => {
                      const val = e.target.value;
                      setCustomSlotPatternText(val);
                      setSubjectForm(prev => ({
                        ...prev,
                        slotPattern: val,
                        isTraining: val.trim() !== "regular" && val.trim() !== ""
                      }));
                    }}
                    style={{ fontSize: "0.85rem", width: "100%", borderColor: "#a855f7", color: "#c084fc", fontWeight: "700" }}
                    autoFocus
                  />
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    💡 Example: typing <b>2+1</b> schedules a 2-hour continuous block on Day 1, and 1-hour regular period on Day 2!
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ 
                    flex: 1,
                    justifyContent: "center", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    fontSize: "0.85rem",
                    padding: "0.55rem 1rem",
                    background: editingSubject ? "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)" : undefined
                  }}
                >
                  {editingSubject ? <Save size={16} /> : <Plus size={16} />}
                  <span>{editingSubject ? "Update Subject" : "Add Subject"}</span>
                </button>

                {editingSubject && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleCancelEditSubject}
                    style={{ fontSize: "0.85rem", padding: "0.55rem 1.25rem" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* List of Configured Subject Masters with Click to Edit */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#818cf8" }}>
                  📚 {semesterType} Semester Subjects (Sem {semesterType === "Odd" ? "1, 3, 5, 7" : "2, 4, 6, 8"}):
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  💡 Click on any subject chip below to <strong>Edit & Change</strong> it
                </span>
              </div>

              <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                {(() => {
                  const validSems = semesterType === "Odd" ? [1, 3, 5, 7] : [2, 4, 6, 8];
                  const currentSemesterMasters = subjectMasters.filter(sm => validSems.includes(Number(sm.semester)));

                  if (currentSemesterMasters.length === 0) {
                    return (
                      <div style={{ textAlign: "center", padding: "1.5rem", background: "rgba(0,0,0,0.1)", borderRadius: "10px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        No curriculum subjects added for <strong>{semesterType} Semester (Sem {validSems.join(", ")})</strong> yet.<br />
                        Fill the form above to add subjects or click <strong>"Reset / Load Samples"</strong>.
                      </div>
                    );
                  }

                  return currentSemesterMasters.map((sm) => (
                  <div key={sm._id} style={{ padding: "0.85rem", background: "rgba(0,0,0,0.1)", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                      <span style={{ fontWeight: "700", color: "#818cf8", fontSize: "0.9rem" }}>
                        {sm.year} Year - Semester {sm.semester} ({sm.batch})
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {sm.subjects.length} subjects
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {sm.subjects.map((sub, idx) => {
                        const typeInfo = getTypeBadgeDetails(sub.type);
                        const isBeingEdited = editingSubject && 
                          editingSubject.originalCode === sub.code && 
                          editingSubject.year === sm.year && 
                          editingSubject.semester === sm.semester;

                        return (
                          <div 
                            key={idx}
                            onClick={() => handleStartEditSubject(sm, sub)}
                            title="Click to edit subject details"
                            style={{
                              fontSize: "0.76rem",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              background: isBeingEdited ? "rgba(168, 85, 247, 0.25)" : typeInfo.bg,
                              color: isBeingEdited ? "#e9d5ff" : typeInfo.text,
                              border: isBeingEdited ? "2px solid #a855f7" : `1px solid ${typeInfo.border}`,
                              boxShadow: isBeingEdited ? "0 0 12px rgba(168, 85, 247, 0.5)" : "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (!isBeingEdited) {
                                e.currentTarget.style.transform = "translateY(-1px)";
                                e.currentTarget.style.borderColor = "#a855f7";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isBeingEdited) {
                                e.currentTarget.style.transform = "none";
                                e.currentTarget.style.borderColor = typeInfo.border;
                              }
                            }}
                          >
                            <span>{typeInfo.icon}</span>
                            <span style={{ fontWeight: "700" }}>{sub.code}:</span>
                            <span>{sub.shortName || sub.name}</span>
                            <span style={{ opacity: 0.85, fontSize: "0.7rem" }}>({sub.type})</span>
                            <span style={{ 
                              fontSize: "0.68rem", 
                              background: "rgba(0,0,0,0.25)", 
                              padding: "1px 5px", 
                              borderRadius: "4px",
                              opacity: 0.85
                            }}>
                              {sub.hoursPerWeek || 4}h
                            </span>
                            {sub.difficulty && sub.difficulty !== "Normal" && (
                              <span style={{ 
                                fontSize: "0.66rem", 
                                fontWeight: "700",
                                background: sub.difficulty === "Tough" ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)", 
                                color: sub.difficulty === "Tough" ? "#fca5a5" : "#6ee7b7",
                                padding: "1px 5px", 
                                borderRadius: "4px"
                              }}>
                                {sub.difficulty === "Tough" ? "🔥 Tough" : "🍃 Light"}
                              </span>
                            )}
                            {(sub.isTraining || sub.type === "Training") && (
                              <span style={{ 
                                fontSize: "0.66rem", 
                                fontWeight: "800",
                                background: "rgba(236, 72, 153, 0.25)", 
                                color: "#f472b6",
                                padding: "1px 6px", 
                                borderRadius: "4px",
                                border: "1px solid rgba(236, 72, 153, 0.4)"
                              }}>
                                🎯 Trainer
                              </span>
                            )}
                            {sub.slotPattern && sub.slotPattern !== "regular" && (
                              <span style={{ 
                                fontSize: "0.66rem", 
                                fontWeight: "800",
                                background: "rgba(147, 51, 234, 0.25)", 
                                color: "#c084fc",
                                padding: "1px 6px", 
                                borderRadius: "4px",
                                border: "1px solid rgba(147, 51, 234, 0.4)"
                              }}>
                                ⚡ {sub.slotPattern}
                              </span>
                            )}

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditSubject(sm, sub);
                              }}
                              title="Edit this subject"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "inherit",
                                padding: "0 2px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                opacity: 0.8
                              }}
                            >
                              <Edit3 size={12} />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSubject(sm, sub.code, e)}
                              title="Delete this subject"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ef4444",
                                padding: "0 2px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                opacity: 0.75,
                                fontSize: "0.85rem",
                                lineHeight: 1
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1.2)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.transform = "none"; }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MANUAL TIMETABLE SLOT EDITING DIALOG                    */}
      {/* ============================================================== */}
      {slotEditModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div className="glass-card" style={{
            width: "100%",
            maxWidth: "520px",
            borderRadius: "16px",
            padding: "1.75rem",
            background: "#1e1b4b",
            border: "1px solid rgba(129, 140, 248, 0.3)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
            animation: "fadeIn 0.2s ease"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✏️</span>
                  <span>Manual Edit Period Slot</span>
                </h3>
                <span style={{ fontSize: "0.8rem", color: "#a5b4fc" }}>
                  Class: <b>{slotEditModal.classKey}</b> | Day: <b>{slotEditModal.day}</b> | Period: <b>{slotEditModal.period} ({slotEditModal.time})</b>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSlotEditModal(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Choose Subject from allocated subjects */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  CHOOSE SUBJECT:
                </label>
                <select
                  className="select-input"
                  value={slotEditModal.subjectCode || "FREE"}
                  onChange={e => {
                    const code = e.target.value;
                    if (code === "FREE") {
                      setSlotEditModal(prev => ({
                        ...prev,
                        subjectCode: "FREE",
                        subjectName: "Library / Mentoring",
                        shortName: "LIB/SEM",
                        facultyName: "",
                        type: "Free",
                        room: "Library"
                      }));
                    } else if (code === "CUSTOM") {
                      setSlotEditModal(prev => ({
                        ...prev,
                        subjectCode: "",
                        subjectName: "",
                        shortName: "",
                        facultyName: "",
                        type: "Theory",
                        room: "LH-1"
                      }));
                    } else {
                      const matched = allocations.find(a => 
                        `${a.year}-${a.section}` === slotEditModal.classKey && a.subjectCode.toUpperCase() === code.toUpperCase()
                      );
                      if (matched) {
                        setSlotEditModal(prev => ({
                          ...prev,
                          subjectCode: matched.subjectCode,
                          subjectName: matched.subjectName,
                          shortName: matched.shortName || matched.subjectCode,
                          facultyName: (matched.facultyNames && matched.facultyNames[0]) || "",
                          type: matched.type || "Theory",
                          room: matched.type === "Lab" ? "Lab" : (matched.type === "Seminar" ? "Seminar Hall" : "LH-1")
                        }));
                      }
                    }
                  }}
                  style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                >
                  <option value="FREE">-- Free Period / Library / Mentoring --</option>
                  {allocations
                    .filter(a => `${a.year}-${a.section}` === slotEditModal.classKey)
                    .map(a => (
                      <option key={a.id} value={a.subjectCode}>
                        [{a.type}] {a.subjectCode} - {a.subjectName} ({a.facultyNames?.join(", ") || "No Faculty"})
                      </option>
                    ))
                  }
                  <option value="CUSTOM">-- Custom / Other Subject --</option>
                </select>
              </div>

              {/* Subject Details (if not FREE) */}
              {slotEditModal.subjectCode !== "FREE" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        SUBJECT CODE:
                      </label>
                      <input 
                        type="text"
                        value={slotEditModal.subjectCode}
                        onChange={e => setSlotEditModal({ ...slotEditModal, subjectCode: e.target.value })}
                        placeholder="e.g. CS3591"
                        style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", color: "white" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        SHORT NAME / ABBR:
                      </label>
                      <input 
                        type="text"
                        value={slotEditModal.shortName}
                        onChange={e => setSlotEditModal({ ...slotEditModal, shortName: e.target.value })}
                        placeholder="e.g. CN or FDS"
                        style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", color: "white" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      SUBJECT FULL NAME:
                    </label>
                    <input 
                      type="text"
                      value={slotEditModal.subjectName}
                      onChange={e => setSlotEditModal({ ...slotEditModal, subjectName: e.target.value })}
                      placeholder="e.g. Computer Networks"
                      style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", color: "white" }}
                    />
                  </div>

                  {/* Faculty Dropdown */}
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                      ASSIGNED FACULTY:
                    </label>
                    <select
                      className="select-input"
                      value={slotEditModal.facultyName}
                      onChange={e => setSlotEditModal({ ...slotEditModal, facultyName: e.target.value })}
                      style={{ width: "100%", padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                    >
                      <option value="">-- No Faculty / Self Study --</option>
                      {staffList.map(st => (
                        <option key={st._id} value={st.name}>
                          {st.name} ({st.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        PERIOD TYPE:
                      </label>
                      <select
                        className="select-input"
                        value={slotEditModal.type}
                        onChange={e => setSlotEditModal({ ...slotEditModal, type: e.target.value })}
                        style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}
                      >
                        <option value="Theory">Theory</option>
                        <option value="Lab">Laboratory</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Library">Library</option>
                        <option value="Mentoring">Class Advisor / Mentoring</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                        ROOM / HALL:
                      </label>
                      <input 
                        type="text"
                        value={slotEditModal.room}
                        onChange={e => setSlotEditModal({ ...slotEditModal, room: e.target.value })}
                        placeholder="e.g. LH-1 or CSE Lab 2"
                        style={{ width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.85rem", borderRadius: "6px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-color)", color: "white" }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSlotEditModal(prev => ({
                      ...prev,
                      subjectCode: "FREE",
                      subjectName: "Library / Mentoring",
                      shortName: "LIB/SEM",
                      facultyName: "",
                      type: "Free",
                      room: "Library"
                    }));
                  }}
                  style={{ fontSize: "0.8rem", padding: "0.5rem 0.9rem" }}
                >
                  Clear to Free
                </button>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSlotEditModal(null)}
                    style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveSlotEdit}
                    disabled={loading}
                    style={{ fontSize: "0.8rem", padding: "0.5rem 1.2rem", fontWeight: "700" }}
                  >
                    {loading ? "Saving..." : "Save Slot Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VERSION HISTORY MODAL (OPTION A - RESTORE PREVIOUS TIMETABLES) */}
      {/* ============================================================== */}
      {showHistoryModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.78)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10001,
          padding: "1.5rem"
        }}>
          <div style={{
            background: "var(--card-bg, #1e293b)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "85vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))"
          }}>
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <History size={22} style={{ color: "#818cf8" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--text-color)" }}>
                    📜 Timetable Version History
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Department of {department} | {academicYear} | {semesterType} Semester
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="btn btn-secondary"
                style={{ padding: "6px", borderRadius: "8px", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {historyList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                  <History size={42} style={{ opacity: 0.3, marginBottom: "0.75rem" }} />
                  <p style={{ margin: 0, fontWeight: "700", fontSize: "1rem" }}>No saved history versions yet.</p>
                  <span style={{ fontSize: "0.8rem", display: "block", marginTop: "4px", maxWidth: "420px", margin: "4px auto 0" }}>
                    Whenever you generate a new timetable, your previous schedule is automatically archived here so you never lose it!
                  </span>
                </div>
              ) : (
                historyList.map((ver, idx) => (
                  <div key={ver._id} style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    flexWrap: "wrap"
                  }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: "800", fontSize: "0.95rem", color: "var(--text-color)" }}>
                          {ver.versionName || `Version ${historyList.length - idx}`}
                        </span>
                        {ver.isLocked && (
                          <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontWeight: "700" }}>
                            🔒 Finalized
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: "3px" }}>
                        Generated: {new Date(ver.generatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        {" • "}{ver.classes?.length || 0} Classes Included
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => handleRestoreVersion(ver._id)}
                        className="btn btn-primary"
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: "700",
                          padding: "6px 14px",
                          borderRadius: "8px",
                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        <RefreshCw size={13} />
                        <span>Restore</span>
                      </button>

                      <button
                        onClick={() => handleDeleteHistoryVersion(ver._id)}
                        className="btn btn-secondary"
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          color: "#ef4444",
                          borderColor: "rgba(239, 68, 68, 0.3)"
                        }}
                        title="Delete this history version"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.15)"
            }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Restoring a version will set it as your active timetable schedule.
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setShowHistoryModal(false)}
                style={{ fontSize: "0.85rem", padding: "6px 16px", borderRadius: "8px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PERIOD TIMINGS CONFIGURATION MODAL (ADMIN CONTROLLED)          */}
      {/* ============================================================== */}
      {showTimingsModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10002,
          padding: "1.5rem"
        }}>
          <div style={{
            background: "var(--card-bg, #1e293b)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "620px",
            maxHeight: "90vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.12))"
          }}>
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={22} style={{ color: "#38bdf8" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", color: "var(--text-color)" }}>
                    ⏱️ Set Official Period Timings
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Set timings for Period 1 to 7 and breaks. Applies across all classes, routines & official prints!
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowTimingsModal(false)}
                className="btn btn-secondary"
                style={{ padding: "6px", borderRadius: "8px", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Timings Form Body */}
            <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2].map(p => (
                <div key={p} style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.9rem", color: "#818cf8" }}>Period {p}:</span>
                  <input
                    type="text"
                    className="text-input"
                    value={tempTimings[p] || ""}
                    onChange={e => setTempTimings({ ...tempTimings, [p]: e.target.value })}
                    placeholder="e.g. 09:10 - 10:05"
                    style={{ fontWeight: "700", fontSize: "0.88rem" }}
                  />
                </div>
              ))}

              {/* Tea Break */}
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: "12px", background: "rgba(245, 158, 11, 0.08)", padding: "8px 14px", borderRadius: "10px", border: "1px dashed rgba(245, 158, 11, 0.3)" }}>
                <span style={{ fontWeight: "800", fontSize: "0.85rem", color: "#f59e0b" }}>☕ Tea Break:</span>
                <input
                  type="text"
                  className="text-input"
                  value={tempTimings.teaBreak || ""}
                  onChange={e => setTempTimings({ ...tempTimings, teaBreak: e.target.value })}
                  placeholder="e.g. 11:00 - 11:15"
                  style={{ fontWeight: "700", fontSize: "0.85rem" }}
                />
              </div>

              {[3, 4].map(p => (
                <div key={p} style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.9rem", color: "#818cf8" }}>Period {p}:</span>
                  <input
                    type="text"
                    className="text-input"
                    value={tempTimings[p] || ""}
                    onChange={e => setTempTimings({ ...tempTimings, [p]: e.target.value })}
                    placeholder="e.g. 11:15 - 12:10"
                    style={{ fontWeight: "700", fontSize: "0.88rem" }}
                  />
                </div>
              ))}

              {/* Lunch Break */}
              <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: "12px", background: "rgba(16, 185, 129, 0.08)", padding: "8px 14px", borderRadius: "10px", border: "1px dashed rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontWeight: "800", fontSize: "0.85rem", color: "#10b981" }}>🍱 Lunch Break:</span>
                <input
                  type="text"
                  className="text-input"
                  value={tempTimings.lunchBreak || ""}
                  onChange={e => setTempTimings({ ...tempTimings, lunchBreak: e.target.value })}
                  placeholder="e.g. 01:00 - 01:45"
                  style={{ fontWeight: "700", fontSize: "0.85rem" }}
                />
              </div>

              {[5, 6, 7].map(p => (
                <div key={p} style={{ display: "grid", gridTemplateColumns: "130px 1fr", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontWeight: "800", fontSize: "0.9rem", color: "#818cf8" }}>Period {p}:</span>
                  <input
                    type="text"
                    className="text-input"
                    value={tempTimings[p] || ""}
                    onChange={e => setTempTimings({ ...tempTimings, [p]: e.target.value })}
                    placeholder="e.g. 01:45 - 02:40"
                    style={{ fontWeight: "700", fontSize: "0.88rem" }}
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.15)"
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTempTimings(DEFAULT_PERIOD_TIMINGS)}
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
              >
                Reset to Default
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTimingsModal(false)}
                  style={{ fontSize: "0.85rem", padding: "6px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSavePeriodTimings}
                  disabled={savingTimings}
                  style={{
                    fontSize: "0.85rem",
                    padding: "6px 18px",
                    fontWeight: "800",
                    background: "linear-gradient(135deg, #0284c7, #06b6d4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Save size={15} />
                  <span>{savingTimings ? "Saving..." : "Save Timings"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRINT MODAL 1: OFFICIAL CLASS TIME TABLE (IMAGE 1 FORMAT)      */}
      {/* ============================================================== */}
      {showClassPrintModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 15, 29, 0.88)",
          backdropFilter: "blur(8px)",
          zIndex: 10000,
          overflowY: "auto",
          padding: "1.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          {/* Top Control Bar (Hidden during print) */}
          <div className="no-print" style={{
            width: "100%",
            maxWidth: "850px",
            background: "rgba(30, 41, 59, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "12px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)"
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🖨️</span>
                <span>Official Class Timetable Print Preview</span>
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {currentClassSchedule?.year} Year - Section {currentClassSchedule?.section} | Academic Year {printAcademicYear || academicYear}
              </span>
            </div>

            {/* Quick Hall No, IQAC & Academic Year Editor */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#cbd5e1" }}>HALL NO:</span>
                <input 
                  type="text"
                  className="select-input"
                  value={hallNumbers[currentClassSchedule?.classKey] || ""}
                  onChange={e => {
                    const updated = { ...hallNumbers, [currentClassSchedule?.classKey]: e.target.value };
                    setHallNumbers(updated);
                    localStorage.setItem("timetable_hall_numbers", JSON.stringify(updated));
                  }}
                  placeholder="e.g. LH-1"
                  style={{ width: "90px", padding: "4px 8px", fontSize: "0.8rem", fontWeight: "700" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#cbd5e1" }}>IQAC NO:</span>
                <input 
                  type="text"
                  className="select-input"
                  value={iqacNumber}
                  onChange={e => {
                    setIqacNumber(e.target.value);
                    localStorage.setItem("timetable_iqac_number", e.target.value);
                  }}
                  placeholder="MEC/IQAC/..."
                  style={{ width: "210px", padding: "4px 8px", fontSize: "0.8rem", fontWeight: "700" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#cbd5e1" }}>ACAD YEAR:</span>
                <input 
                  type="text"
                  className="select-input"
                  value={printAcademicYear}
                  onChange={e => {
                    setPrintAcademicYear(e.target.value);
                    try {
                      localStorage.setItem("timetable_print_academic_year", e.target.value);
                    } catch (err) {}
                  }}
                  placeholder="e.g. 2026-2027"
                  style={{ width: "125px", padding: "4px 8px", fontSize: "0.8rem", fontWeight: "700" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowClassPrintModal(false)}
                style={{ fontSize: "0.8rem", padding: "0.5rem 0.9rem", display: "flex", alignItems: "center", gap: "5px" }}
              >
                <X size={15} />
                <span>Close</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.5rem 1.25rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  color: "#ffffff"
                }}
              >
                <Printer size={16} />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Printable White Sheet (Exact Image 1 Layout) */}
          <div 
            id="official-class-print-area"
            style={{
              width: "100%",
              maxWidth: "850px",
              background: "#ffffff",
              color: "#000000",
              padding: "24px 30px",
              borderRadius: "4px",
              boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
              fontFamily: "Arial, sans-serif",
              boxSizing: "border-box"
            }}
          >
            {/* Top Right IQAC Number */}
            <div style={{ textAlign: "right", fontSize: "9.5pt", fontWeight: "800", color: "#000000", marginBottom: "4px", fontFamily: "Arial, sans-serif" }}>
              {iqacNumber || "MEC/IQAC/2026 - 27/CSE/006"}
            </div>

            {/* Full-Width Letterhead Header Banner (Exact ParentLetter Style) */}
            <div style={{ width: "100%", marginBottom: "4px" }}>
              <img 
                src={letterTemplateData?.headerLogo || headerLogo} 
                alt="College Header" 
                style={{ width: "100%", height: "auto", display: "block" }} 
                onError={e => { e.target.src = headerLogo; }}
              />
            </div>
            <div style={{ textAlign: "center", fontSize: "11pt", fontWeight: "900", color: "#000000", fontFamily: "Arial, sans-serif", letterSpacing: "0.4px", margin: "4px 0 2px" }}>
              DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
            </div>
            <div style={{ textAlign: "center", fontSize: "12pt", fontWeight: "900", color: "#000000", textDecoration: "underline", fontFamily: "Arial, sans-serif", margin: "2px 0" }}>
              CLASS TIME TABLE
            </div>
            <div style={{ textAlign: "center", fontSize: "10pt", fontWeight: "800", fontStyle: "italic", textDecoration: "underline", color: "#000000", marginBottom: "8px", fontFamily: "Arial, sans-serif" }}>
              {semesterType.toUpperCase()} SEMESTER - Academic Year [{printAcademicYear || academicYear}]
            </div>

            {/* Subheader: Year/Sem/Sec & HALL NO */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontWeight: "900", fontSize: "10pt", margin: "10px 0 4px", color: "#000000", fontFamily: "Arial, sans-serif" }}>
              <div>
                Year/Sem/Sec: {currentClassSchedule?.year}/{getRomanSem(currentClassSchedule?.year, semesterType)}/{currentClassSchedule?.section}
              </div>
              <div>
                HALL NO: {hallNumbers[currentClassSchedule?.classKey] || "LH-1"}
              </div>
            </div>

            {/* 7-Period Timetable Grid */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000000", fontSize: "8.5pt", color: "#000000", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th rowSpan={2} style={{ border: "1px solid #000000", padding: "4px 2px", width: "55px", fontSize: "8.5pt", fontWeight: "900" }}>
                    Hour /<br/>Time /<br/>Day
                  </th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>1</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>2</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "26px" }}>-</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>3</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>4</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "26px" }}>-</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>5</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>6</th>
                  <th style={{ border: "1px solid #000000", padding: "3px", fontWeight: "900", width: "70px" }}>7</th>
                </tr>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[1] || "09:10-10:05"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[2] || "10:05-11:00"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings.teaBreak || "11:00-11:15"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[3] || "11:15-12:10"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[4] || "12:10-01:00"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings.lunchBreak || "01:00-01:45"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[5] || "01:45-02:40"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[6] || "02:40-03:35"})</th>
                  <th style={{ border: "1px solid #000000", padding: "2px", fontSize: "7pt", fontWeight: "800" }}>({periodTimings[7] || "03:35-04:30"})</th>
                </tr>
              </thead>
              <tbody>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, dIdx) => {
                  const shortDay = ["MON", "TUE", "WED", "THU", "FRI"][dIdx];
                  const daySlots = currentClassSchedule?.days?.[day] || [];
                  const getSlotVal = (period) => {
                    const s = daySlots.find(item => item.period === period);
                    if (!s || s.type === "Free") return "";
                    return s.shortName || s.subjectCode || "";
                  };

                  return (
                    <tr key={day} style={{ height: "36px" }}>
                      <td style={{ border: "1px solid #000000", fontWeight: "900", background: "#f8fafc", fontSize: "9pt" }}>
                        {shortDay}
                      </td>
                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(1)}
                      </td>
                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(2)}
                      </td>

                      {/* BREAK column with rowSpan=5 on Monday */}
                      {dIdx === 0 && (
                        <td rowSpan={5} style={{
                          border: "1px solid #000000",
                          width: "26px",
                          textAlign: "center",
                          fontWeight: "900",
                          fontSize: "9pt",
                          letterSpacing: "4px",
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          background: "#ffffff",
                          padding: 0
                        }}>
                          BREAK
                        </td>
                      )}

                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(3)}
                      </td>
                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(4)}
                      </td>

                      {/* LUNCH BREAK column with rowSpan=5 on Monday */}
                      {dIdx === 0 && (
                        <td rowSpan={5} style={{
                          border: "1px solid #000000",
                          width: "26px",
                          textAlign: "center",
                          fontWeight: "900",
                          fontSize: "8.5pt",
                          letterSpacing: "3px",
                          writingMode: "vertical-rl",
                          transform: "rotate(180deg)",
                          background: "#ffffff",
                          padding: 0
                        }}>
                          LUNCH BREAK
                        </td>
                      )}

                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(5)}
                      </td>
                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(6)}
                      </td>
                      <td style={{ border: "1px solid #000000", fontWeight: "800", fontSize: "9pt", padding: "4px 2px" }}>
                        {getSlotVal(7)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Course & Faculty Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px", border: "1px solid #000000", fontSize: "8.5pt", color: "#000000", fontFamily: "Arial, sans-serif" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th rowSpan={2} style={{ border: "1px solid #000000", width: "35px", textAlign: "center", padding: "4px", fontWeight: "900" }}>S.No</th>
                  <th colSpan={2} style={{ border: "1px solid #000000", textAlign: "center", padding: "4px", fontWeight: "900" }}>Course</th>
                  <th style={{ border: "1px solid #000000", textAlign: "center", padding: "4px", fontWeight: "900" }}>Faculty</th>
                </tr>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ border: "1px solid #000000", textAlign: "center", padding: "4px", fontWeight: "900" }}>Code & Title</th>
                  <th style={{ border: "1px solid #000000", width: "85px", textAlign: "center", padding: "4px", fontWeight: "900" }}>Abbreviation</th>
                  <th style={{ border: "1px solid #000000", textAlign: "center", padding: "4px", fontWeight: "900" }}>Name/Designation/Department</th>
                </tr>
              </thead>
              <tbody>
                {allocations
                  .filter(a => a.year === currentClassSchedule?.year && a.section === currentClassSchedule?.section)
                  .map((a, idx) => (
                    <tr key={idx}>
                      <td style={{ border: "1px solid #000000", textAlign: "center", padding: "4px" }}>{idx + 1}</td>
                      <td style={{ border: "1px solid #000000", padding: "4px 8px", fontWeight: "600" }}>
                        {a.subjectCode === a.subjectName ? a.subjectCode : `${a.subjectCode} - ${a.subjectName}`}
                      </td>
                      <td style={{ border: "1px solid #000000", textAlign: "center", padding: "4px", fontWeight: "800" }}>
                        {a.shortName || a.subjectCode}
                      </td>
                      <td style={{ border: "1px solid #000000", padding: "4px 8px" }}>
                        {a.facultyNames && a.facultyNames.length > 0
                          ? a.facultyNames.map(f => formatFacultyInfo(f)).join(", ")
                          : "-"}
                      </td>
                    </tr>
                  ))
                }
                {/* Coordinator Rows */}
                <tr>
                  <td colSpan={3} style={{ border: "1px solid #000000", textAlign: "right", padding: "4px 12px", fontWeight: "900" }}>Class Advisor</td>
                  <td style={{ border: "1px solid #000000", padding: "4px 8px", fontWeight: "800" }}>
                    {classAdvisors[currentClassSchedule?.classKey] ? formatFacultyInfo(classAdvisors[currentClassSchedule?.classKey]) : "-"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ border: "1px solid #000000", textAlign: "right", padding: "4px 12px", fontWeight: "900" }}>Exam Coordinator</td>
                  <td style={{ border: "1px solid #000000", padding: "4px 8px", fontWeight: "800" }}>
                    {coordinators.examCoordinator || "Mrs.M.Logapriya, AP/CSE"}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ border: "1px solid #000000", textAlign: "right", padding: "4px 12px", fontWeight: "900" }}>Placement Coordinator</td>
                  <td style={{ border: "1px solid #000000", padding: "4px 8px", fontWeight: "800" }}>
                    {coordinators.placementCoordinator || "Mrs.M.Buvaneswari, AP/CSE"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "35px", padding: "0 10px", fontWeight: "900", fontSize: "9.5pt", color: "#000000", fontFamily: "Arial, sans-serif" }}>
              <div>{coordinators.timetableIncharge || "TIME TABLE INCHARGE"}</div>
              <div>{coordinators.hod || "HOD"}</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PRINT MODAL 2: OFFICIAL FACULTY ROUTINE (IMAGE 2 FORMAT)       */}
      {/* ============================================================== */}
      {showFacultyPrintModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 15, 29, 0.88)",
          backdropFilter: "blur(8px)",
          zIndex: 10000,
          overflowY: "auto",
          padding: "1.5rem 1rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          {/* Top Control Bar (Hidden during print) */}
          <div className="no-print" style={{
            width: "100%",
            maxWidth: "850px",
            background: "rgba(30, 41, 59, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: "12px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)"
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🖨️</span>
                <span>Official Faculty Timetable Print Preview</span>
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Staff: <strong style={{ color: "#34d399" }}>{selectedFacultyView}</strong> | IQAC: {iqacNumber}
              </span>
            </div>

            {/* Quick IQAC & Academic Year Editor */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#cbd5e1" }}>IQAC NO:</span>
                <input 
                  type="text"
                  className="select-input"
                  value={iqacNumber}
                  onChange={e => {
                    setIqacNumber(e.target.value);
                    localStorage.setItem("timetable_iqac_number", e.target.value);
                  }}
                  placeholder="MEC/IQAC/..."
                  style={{ width: "210px", padding: "4px 8px", fontSize: "0.8rem", fontWeight: "700" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#cbd5e1" }}>ACAD YEAR:</span>
                <input 
                  type="text"
                  className="select-input"
                  value={printAcademicYear}
                  onChange={e => {
                    setPrintAcademicYear(e.target.value);
                    try {
                      localStorage.setItem("timetable_print_academic_year", e.target.value);
                    } catch (err) {}
                  }}
                  placeholder="e.g. 2026-2027"
                  style={{ width: "125px", padding: "4px 8px", fontSize: "0.8rem", fontWeight: "700" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowFacultyPrintModal(false)}
                style={{ fontSize: "0.8rem", padding: "0.5rem 0.9rem", display: "flex", alignItems: "center", gap: "5px" }}
              >
                <X size={15} />
                <span>Close</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.5rem 1.25rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #059669, #10b981)",
                  color: "#ffffff"
                }}
              >
                <Printer size={16} />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Printable White Sheet (Exact Image 2 Layout) */}
          <div 
            id="official-faculty-print-area"
            style={{
              width: "100%",
              maxWidth: "850px",
              background: "#ffffff",
              color: "#000000",
              padding: "24px 30px",
              borderRadius: "4px",
              boxShadow: "0 12px 35px rgba(0,0,0,0.6)",
              fontFamily: "Arial, sans-serif",
              boxSizing: "border-box"
            }}
          >
            {/* Top Right IQAC Number */}
            <div style={{ textAlign: "right", fontSize: "9.5pt", fontWeight: "800", color: "#000000", marginBottom: "4px", fontFamily: "Arial, sans-serif" }}>
              {iqacNumber || "MEC/IQAC/2026 - 27/CSE/006"}
            </div>

            {/* Full-Width Letterhead Header Banner (Exact ParentLetter Style) */}
            <div style={{ width: "100%", marginBottom: "6px" }}>
              <img 
                src={letterTemplateData?.headerLogo || headerLogo} 
                alt="College Header" 
                style={{ width: "100%", height: "auto", display: "block" }} 
                onError={e => { e.target.src = headerLogo; }}
              />
            </div>
            <div style={{ textAlign: "center", fontSize: "11pt", fontWeight: "900", color: "#000000", fontFamily: "Arial, sans-serif", letterSpacing: "0.4px", margin: "4px 0 2px" }}>
              DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
            </div>
            <div style={{ textAlign: "center", fontSize: "12pt", fontWeight: "900", color: "#000000", textDecoration: "underline", fontFamily: "Arial, sans-serif", margin: "2px 0" }}>
              FACULTY ROUTINE / INDIVIDUAL TIME TABLE
            </div>
            <div style={{ textAlign: "center", fontSize: "10pt", fontWeight: "800", fontStyle: "italic", textDecoration: "underline", color: "#000000", marginBottom: "14px", fontFamily: "Arial, sans-serif" }}>
              {semesterType.toUpperCase()} SEMESTER - Academic Year [{printAcademicYear || academicYear}]
            </div>

            {/* Staff Workload Summary Table */}
            {(() => {
              const facAllocs = allocations.filter(a => a.facultyNames && a.facultyNames.includes(selectedFacultyView));
              const theoryList = facAllocs.filter(a => !(a.type || "").toLowerCase().includes("lab"));
              const labList = facAllocs.filter(a => (a.type || "").toLowerCase().includes("lab"));
              const rowCount = Math.max(theoryList.length, labList.length, 1);
              const totalTheoryH = theoryList.reduce((s, a) => s + (Number(a.hoursPerWeek) || 0), 0);
              const totalLabH = labList.reduce((s, a) => s + (Number(a.hoursPerWeek) || 0), 0);
              const totalH = totalTheoryH + totalLabH;

              const rows = [];
              for (let i = 0; i < rowCount; i++) {
                const t = theoryList[i];
                const l = labList[i];
                rows.push({
                  theoryBranch: t ? `B.E/${t.year}/${getRomanSem(t.year, semesterType)}/CSE-${t.section}` : "-",
                  theoryCourse: t ? `${t.subjectCode} - ${t.subjectName}` : "-",
                  labBranch: l ? `B.E/${l.year}/${getRomanSem(l.year, semesterType)}/CSE-${l.section}` : "-",
                  labCourse: l ? `${l.subjectCode} - ${l.subjectName}` : "-"
                });
              }

              return (
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontSize: "8.5pt", color: "#000000", fontFamily: "Arial, sans-serif", marginBottom: "20px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th rowSpan={2} style={{ border: "1.5px solid #000000", padding: "6px 4px", width: "17%", fontWeight: "900" }}>Name of the Staff</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000000", padding: "6px 4px", width: "14%", fontWeight: "900" }}>Year/Sem/Branch</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000000", padding: "6px 4px", width: "22%", fontWeight: "900" }}>Theory / Training</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000000", padding: "6px 4px", width: "13%", fontWeight: "900" }}>Year/Sem/Branch</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000000", padding: "6px 4px", width: "13%", fontWeight: "900" }}>Lab</th>
                      <th colSpan={3} style={{ border: "1.5px solid #000000", padding: "4px 4px", textAlign: "center", fontWeight: "900" }}>Workload</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000000", padding: "6px 4px", width: "10%", fontWeight: "900" }}>Signature</th>
                    </tr>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ border: "1.5px solid #000000", padding: "4px 2px", textAlign: "center", fontSize: "7.5pt", fontWeight: "900" }}>Theory/Tr</th>
                      <th style={{ border: "1.5px solid #000000", padding: "4px 2px", textAlign: "center", fontSize: "7pt", fontWeight: "900" }}>Lab/Sem/Tut/Lib/Pro</th>
                      <th style={{ border: "1.5px solid #000000", padding: "4px 2px", textAlign: "center", fontSize: "7.5pt", fontWeight: "900" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ minHeight: "32px" }}>
                        {idx === 0 && (
                          <td rowSpan={rowCount} style={{ border: "1.5px solid #000000", padding: "6px 5px", fontWeight: "900", verticalAlign: "middle" }}>
                            {selectedFacultyView}
                          </td>
                        )}
                        <td style={{ border: "1.5px solid #000000", padding: "5px 4px", textAlign: "center", fontWeight: "800" }}>{row.theoryBranch}</td>
                        <td style={{ border: "1.5px solid #000000", padding: "5px 6px", fontWeight: "800" }}>{row.theoryCourse}</td>
                        <td style={{ border: "1.5px solid #000000", padding: "5px 4px", textAlign: "center", fontWeight: "800" }}>{row.labBranch}</td>
                        <td style={{ border: "1.5px solid #000000", padding: "5px 6px", fontWeight: "800" }}>{row.labCourse}</td>
                        {idx === 0 && (
                          <>
                            <td rowSpan={rowCount} style={{ border: "1.5px solid #000000", padding: "5px 4px", textAlign: "center", fontWeight: "900", verticalAlign: "middle" }}>
                              {totalTheoryH || "-"}
                            </td>
                            <td rowSpan={rowCount} style={{ border: "1.5px solid #000000", padding: "5px 4px", textAlign: "center", fontWeight: "900", verticalAlign: "middle" }}>
                              {totalLabH > 0 ? totalLabH : "-"}
                            </td>
                            <td rowSpan={rowCount} style={{ border: "1.5px solid #000000", padding: "5px 4px", textAlign: "center", fontWeight: "900", verticalAlign: "middle" }}>
                              {totalH}
                            </td>
                            <td rowSpan={rowCount} style={{ border: "1.5px solid #000000", padding: "5px 4px", verticalAlign: "middle" }}></td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}

            {/* 7-Period Faculty Routine Grid */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000000", fontSize: "9pt", color: "#000000", fontFamily: "Arial, sans-serif" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ border: "1.5px solid #000000", width: "65px", padding: "7px 4px", textAlign: "center", fontSize: "11pt", fontWeight: "900" }}>↓→</th>
                  {[1, 2, 3, 4, 5, 6, 7].map(pr => (
                    <th key={pr} style={{ border: "1.5px solid #000000", padding: "5px 2px", textAlign: "center", fontWeight: "900" }}>
                      {pr}<br/>
                      <span style={{ fontSize: "7pt", fontWeight: "800" }}>({periodTimings[pr] || DEFAULT_PERIOD_TIMINGS[pr]})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day, dIdx) => {
                  const shortDay = ["MON", "TUE", "WED", "THU", "FRI"][dIdx];
                  const daySlots = facultySchedules[selectedFacultyView]?.days?.[day] || [];
                  return (
                    <tr key={day} style={{ height: "42px" }}>
                      <td style={{ border: "1.5px solid #000000", background: "#f8fafc", fontWeight: "900", textAlign: "center", padding: "4px", fontSize: "9.5pt" }}>
                        {shortDay}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map(period => {
                        const slot = daySlots.find(s => s.period === period);
                        const isOccupied = slot && slot.occupied;
                        const formattedClass = isOccupied ? (slot.classKey ? slot.classKey.replace("-", " – ") : "") : "";
                        return (
                          <td key={period} style={{ border: "1.5px solid #000000", textAlign: "center", padding: "4px", fontWeight: "900", fontSize: "9pt" }}>
                            {isOccupied ? (
                              <div>
                                <div style={{ fontWeight: "900", fontSize: "9.5pt", color: "#000000", lineHeight: 1.2 }}>
                                  {formattedClass}
                                </div>
                                {(slot.shortName || slot.subjectCode) && (
                                  <div style={{ fontWeight: "800", fontSize: "8pt", color: "#000000", marginTop: "2px" }}>
                                    {slot.shortName || slot.subjectCode}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#000000", fontWeight: "700" }}>-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bottom Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", padding: "0 10px", fontWeight: "900", fontSize: "10pt", color: "#000000", fontFamily: "Arial, sans-serif" }}>
              <div>{coordinators.timetableIncharge || "TIME TABLE INCHARGE"}</div>
              <div>{coordinators.hod || "HOD"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Print Optimization */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #official-class-print-area, #official-class-print-area *,
          #official-faculty-print-area, #official-faculty-print-area * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #000000 !important;
          }
          #official-class-print-area, #official-faculty-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            box-shadow: none !important;
            border: none !important;
          }
          #official-class-print-area table, #official-class-print-area th, #official-class-print-area td,
          #official-faculty-print-area table, #official-faculty-print-area th, #official-faculty-print-area td {
            border: 1.5px solid #000000 !important;
            border-color: #000000 !important;
            color: #000000 !important;
            font-weight: 800 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
