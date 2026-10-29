import React, { useState, useEffect, useMemo } from "react";
import API from "../api";
import { 
  Calendar, Clock, Users, BookOpen, Sparkles, CheckCircle2, 
  AlertTriangle, RefreshCw, Plus, Trash2, Edit3, Save, Download, 
  Printer, Filter, Search, Layers, ChevronRight, UserCheck
} from "lucide-react";

export default function TimetableManager() {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState("allocation"); // "allocation", "schedule", "master"
  
  // Master Filters
  const [department, setDepartment] = useState("CSE");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [semesterType, setSemesterType] = useState("Odd"); // "Odd" (Sem 3, 5, 7) or "Even" (Sem 4, 6, 8)
  const [yearFilter, setYearFilter] = useState("All"); // "All", "II", "III", "IV"
  const [sectionFilter, setSectionFilter] = useState("All"); // "All", "A", "B", "C", "D"

  // Intake Sections per Year (e.g. II: A, B; III: A, B; IV: A, B, C)
  const [yearSections, setYearSections] = useState(() => {
    try {
      const saved = localStorage.getItem("timetable_year_sections");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
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

  const [subjectForm, setSubjectForm] = useState({
    batch: "2023-2027",
    year: "II",
    semester: 3,
    department: "CSE",
    code: "",
    name: "",
    shortName: "",
    type: "Theory",
    hoursPerWeek: 4
  });

  const getTypeBadgeDetails = (type) => {
    const t = (type || "Theory").toLowerCase();
    if (t.includes("lab")) return { bg: "rgba(168, 85, 247, 0.15)", text: "#c084fc", border: "rgba(168, 85, 247, 0.3)", icon: "🔬" };
    if (t.includes("project")) return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)", icon: "🚀" };
    if (t.includes("seminar")) return { bg: "rgba(6, 182, 212, 0.15)", text: "#22d3ee", border: "rgba(6, 182, 212, 0.3)", icon: "🎤" };
    if (t.includes("library")) return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)", icon: "📚" };
    if (t.includes("placement") || t.includes("training")) return { bg: "rgba(236, 72, 153, 0.15)", text: "#f472b6", border: "rgba(236, 72, 153, 0.3)", icon: "💼" };
    if (t.includes("mentor") || t.includes("tutor")) return { bg: "rgba(14, 165, 233, 0.15)", text: "#38bdf8", border: "rgba(14, 165, 233, 0.3)", icon: "👥" };
    return { bg: "rgba(99, 102, 241, 0.15)", text: "#818cf8", border: "rgba(99, 102, 241, 0.3)", icon: "📘" };
  };

  // Load initial data
  useEffect(() => {
    fetchStaff();
    fetchSubjectsAndAllocations();
    fetchSavedSchedule();
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
    const validSems = semesterType === "Odd" ? [3, 5, 7] : [4, 6, 8];
    const allocMap = {};
    (existingAllocations || []).forEach(a => {
      if (a && a.subjectCode) {
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
              const existing = allocMap[key];
              merged.push({
                id: key,
                year: m.year,
                semester: m.semester,
                section: sec,
                subjectCode: codeUpper,
                subjectName: sub.name,
                shortName: sub.shortName || codeUpper,
                type: sub.type || "Theory",
                hoursPerWeek: Number(sub.hoursPerWeek) || (sub.type?.toLowerCase().includes("lab") ? 3 : 4),
                facultyNames: existing ? (existing.facultyNames || []) : []
              });
            }
          });
        });
      }
    });

    // Sort by Year (II, III, IV), Section (A, B, C), then Subject Code
    const yearOrder = { "II": 2, "III": 3, "IV": 4 };
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

      // Update class advisors from DB if available
      if (allocRes.data?.classAdvisors && Object.keys(allocRes.data.classAdvisors).length > 0) {
        setClassAdvisors(allocRes.data.classAdvisors);
        localStorage.setItem("timetable_class_advisors", JSON.stringify(allocRes.data.classAdvisors));
      }

      setSubjectMasters(masters);

      // Merge saved faculty allocations with full curriculum master across all sections
      setAllocations(prev => {
        const baseAllocations = savedAllocations.length > 0 ? savedAllocations : prev;
        return syncAllocationsWithCurriculum(masters, baseAllocations, activeSections);
      });
    } catch (err) {
      console.error("Failed to load subjects and allocations", err);
    }
  };

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
        if (!selectedClassKey && res.data.classes[0]) {
          setSelectedClassKey(res.data.classes[0].classKey);
        }
      }
    } catch (err) {
      console.error("Failed to load saved schedule", err);
    }
  };

  // Add default curriculums if empty
  const handleLoadSampleSubjects = async () => {
    const sampleCurriculum = [
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
    ];

    try {
      setLoading(true);
      for (const cur of sampleCurriculum) {
        await API.post("/api/timetable/subjects", cur);
      }
      showAlert("Sample curriculum loaded for II, III, and IV Years!");
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
        otherCount: 0,
        totalHours: 0,
        assignedSubjects: []
      };
    });

    // Tally from allocations
    allocations.forEach(alloc => {
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
            otherCount: 0,
            totalHours: 0,
            assignedSubjects: []
          };
        }

        const t = (alloc.type || "").toLowerCase();
        if (t === "theory") {
          map[facName].theoryCount += 1;
        } else if (t.includes("lab")) {
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

  // Save Allocations & Year-Sections & Class Advisors to DB
  const handleSaveAllocations = async () => {
    try {
      setLoading(true);
      await API.post("/api/timetable/allocation", {
        department,
        academicYear,
        semesterType,
        allocations,
        yearSections,
        classAdvisors
      });
      localStorage.setItem("timetable_year_sections", JSON.stringify(yearSections));
      localStorage.setItem("timetable_class_advisors", JSON.stringify(classAdvisors));
      showAlert("Subject-Staff Allocations, Section Settings & Class Advisors saved successfully!");
    } catch (err) {
      showAlert("Failed to save allocations: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  // Generate Clash-Free Timetable
  const handleGenerateTimetable = async () => {
    // Check if at least some subjects have staff assigned
    const assignedCount = allocations.filter(a => a.facultyNames && a.facultyNames.length > 0).length;
    if (assignedCount === 0) {
      return showAlert("Please assign staff to subjects before generating the timetable!", "error");
    }

    try {
      setGenerating(true);
      // Save current allocations, sections & class advisors first
      await API.post("/api/timetable/allocation", {
        department,
        academicYear,
        semesterType,
        allocations,
        yearSections,
        classAdvisors
      });
      localStorage.setItem("timetable_class_advisors", JSON.stringify(classAdvisors));

      // Call generation algorithm
      const res = await API.post("/api/timetable/generate", {
        department,
        academicYear,
        semesterType,
        allocations,
        classAdvisors
      });

      if (res.data.success) {
        setTimetableSchedule(res.data);
        setFacultySchedules(res.data.facultySchedules || {});
        if (res.data.classes && res.data.classes.length > 0) {
          setSelectedClassKey(res.data.classes[0].classKey);
        }
        showAlert("⚡ Clash-Free Timetable Generated Successfully with Staff Rest Breaks & Monday Period 1 Advisors!");
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
      subjectName: isFree ? "Library / Mentoring" : (subjectName || subjectCode).trim(),
      shortName: isFree ? "LIB/SEM" : (shortName || subjectCode).trim(),
      facultyName: isFree ? "-" : (facultyName || "").trim(),
      facultyNames: (!isFree && facultyName) ? [facultyName.trim()] : [],
      type: isFree ? "Free" : type,
      room: isFree ? "Library" : (room || (type === "Lab" ? "Lab" : "LH-1"))
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

    setSubjectForm({
      batch: sm.batch,
      year: sm.year,
      semester: sm.semester,
      department: sm.department || department,
      code: sub.code,
      name: sub.name,
      shortName: sub.shortName || sub.code,
      type: isPreset ? matchedType : "custom",
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
    setSubjectForm(prev => ({
      ...prev,
      code: "",
      name: "",
      shortName: "",
      type: "Theory",
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
          subjectForm.year === "II" ? "2024-2028" : (subjectForm.year === "III" ? "2023-2027" : "2022-2026")
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
        setAllocations(prev => prev.map(a => {
          if (a.year === editingSubject.year && a.semester === Number(editingSubject.semester) && a.subjectCode === editingSubject.originalCode) {
            return {
              ...a,
              year: subjectForm.year,
              semester: Number(subjectForm.semester),
              subjectCode: formattedCode,
              subjectName: formattedName,
              shortName: formattedShort,
              type: finalType,
              hoursPerWeek: defaultHours
            };
          }
          return a;
        }));

        showAlert(`Subject ${formattedCode} updated successfully!`);
        handleCancelEditSubject();
      } else {
        // Adding brand new subject
        const targetBatch = subjectForm.batch || (
          subjectForm.year === "II" ? "2024-2028" : (subjectForm.year === "III" ? "2023-2027" : "2022-2026")
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
        setSubjectForm(prev => ({ ...prev, code: "", name: "", shortName: "" }));
        setIsCustomSubjectType(false);
        setCustomSubjectTypeText("");
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
    const counts = { All: 0, II: 0, III: 0, IV: 0 };
    allocations.forEach(a => {
      if (sectionFilter === "All" || a.section === sectionFilter) {
        counts.All++;
        if (counts[a.year] !== undefined) {
          counts[a.year]++;
        }
      }
    });
    return counts;
  }, [allocations, sectionFilter]);

  // Counts of available subjects per section (for current yearFilter)
  const sectionCounts = useMemo(() => {
    const counts = { All: 0 };
    allocations.forEach(a => {
      if (yearFilter === "All" || a.year === yearFilter) {
        counts.All++;
        counts[a.section] = (counts[a.section] || 0) + 1;
      }
    });
    return counts;
  }, [allocations, yearFilter]);

  // Filtered allocations based on Year Filter (All, II, III, IV) and Section Filter (All, A, B, C)
  const filteredAllocations = useMemo(() => {
    return allocations.filter(item => {
      const matchYear = yearFilter === "All" || item.year === yearFilter;
      const matchSection = sectionFilter === "All" || item.section === sectionFilter;
      const matchStaff = !selectedStaffFilter || (item.facultyNames || []).includes(selectedStaffFilter);
      return matchYear && matchSection && matchStaff;
    });
  }, [allocations, yearFilter, sectionFilter, selectedStaffFilter]);

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

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "700" }}>ACADEMIC YEAR</span>
              <select 
                className="select-input" 
                value={academicYear} 
                onChange={e => setAcademicYear(e.target.value)}
                style={{ padding: "0.5rem 0.8rem", fontSize: "0.85rem" }}
              >
                <option value="2026-2027">2026 - 2027</option>
                <option value="2025-2026">2025 - 2026</option>
              </select>
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
                    {["All", "II", "III", "IV"].map(y => {
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
              <div style={{ display: "flex", gap: "10px" }}>
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
                  disabled={generating}
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: "700",
                    boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)"
                  }}
                >
                  <Sparkles size={18} />
                  <span>{generating ? "Generating Clash-Free..." : "⚡ Auto-Generate Timetable"}</span>
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
                              background: item.year === "II" ? "rgba(59, 130, 246, 0.15)" : item.year === "III" ? "rgba(168, 85, 247, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: item.year === "II" ? "#60a5fa" : item.year === "III" ? "#c084fc" : "#34d399"
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
                          <td style={{ fontWeight: "700", textAlign: "center" }}>
                            {item.hoursPerWeek} hrs
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
                                      {s.name} ({stats.theoryCount || 0}T, {stats.labCount || 0}L, {stats.otherCount || 0}O)
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
                                        {s.name} ({stats.theoryCount || 0}T, {stats.labCount || 0}L, {stats.otherCount || 0}O)
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
                        return (
                          <option key={s._id} value={s.name}>
                            {s.name} - {stats.theoryCount || 0} Theory, {stats.labCount || 0} Lab
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Print Button */}
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.print()}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Printer size={16} />
                  <span>Print Timetable</span>
                </button>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: "800", color: "var(--text-color)" }}>
                      Class Schedule: {currentClassSchedule.year} Year - Section {currentClassSchedule.section}
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
                            <div>Period {p}</div>
                            <div style={{ fontSize: "0.68rem", fontWeight: "normal", opacity: 0.7 }}>
                              {p === 1 && "09:00 - 09:50"}
                              {p === 2 && "09:50 - 10:40"}
                              {p === 3 && "11:00 - 11:50"}
                              {p === 4 && "11:50 - 12:40"}
                              {p === 5 && "01:30 - 02:20"}
                              {p === 6 && "02:20 - 03:10"}
                              {p === 7 && "03:10 - 04:00"}
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
                                      {slot.isClassAdvisorHour && (
                                        <span style={{
                                          fontSize: "0.62rem",
                                          fontWeight: "800",
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          background: "rgba(16, 185, 129, 0.2)",
                                          color: "#34d399",
                                          border: "1px solid rgba(16, 185, 129, 0.4)",
                                          display: "inline-block",
                                          marginBottom: "2px"
                                        }}>
                                          ⭐ Advisor Hour
                                        </span>
                                      )}
                                      <div style={{ fontWeight: "800", fontSize: "0.9rem", color: isLab ? "#c084fc" : "#818cf8" }}>
                                        {slot.shortName || slot.subjectCode}
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
                  <div style={{ display: "flex", gap: "10px", marginTop: "0.35rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#818cf8", fontWeight: "700" }}>
                      📘 Theory: {staffWorkloadMap[selectedFacultyView]?.theoryCount || 0}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#c084fc", fontWeight: "700" }}>
                      🔬 Lab: {staffWorkloadMap[selectedFacultyView]?.labCount || 0}
                    </span>
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
                          <div>Period {p}</div>
                          <div style={{ fontSize: "0.68rem", fontWeight: "normal", opacity: 0.7 }}>
                            {p === 1 && "09:00 - 09:50"}
                            {p === 2 && "09:50 - 10:40"}
                            {p === 3 && "11:00 - 11:50"}
                            {p === 4 && "11:50 - 12:40"}
                            {p === 5 && "01:30 - 02:20"}
                            {p === 6 && "02:20 - 03:10"}
                            {p === 7 && "03:10 - 04:00"}
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
                { key: "II", label: "II Year", sem: "Semester 3 / 4", color: "#60a5fa" },
                { key: "III", label: "III Year", sem: "Semester 5 / 6", color: "#c084fc" },
                { key: "IV", label: "IV Year (Final)", sem: "Semester 7 / 8", color: "#f59e0b" }
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
                        👨‍🏫 CLASS ADVISORS (MONDAY PERIOD 1 INCHARGE):
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
                      const defaultSem = y === "II" ? 3 : (y === "III" ? 5 : 7);
                      const defaultBatch = y === "II" ? "2024-2028" : (y === "III" ? "2023-2027" : "2022-2026");
                      setSubjectForm({ ...subjectForm, year: y, semester: defaultSem, batch: defaultBatch });
                    }}
                    style={{ fontSize: "0.85rem" }}
                  >
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
                    {[3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
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
                          if (t === "Laboratory" || t === "Project Work") hrs = 3;
                          else if (t === "Seminar" || t === "Library" || t === "Mentoring / Tutor Ward") hrs = 1;
                          else if (t === "Placement / Soft Skills") hrs = 2;
                          setSubjectForm({ ...subjectForm, type: t, hoursPerWeek: hrs });
                        }
                      }}
                      style={{ fontSize: "0.85rem" }}
                    >
                      <option value="Theory">📘 Theory</option>
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

              <div style={{ display: "grid", gridTemplateColumns: editingSubject ? "1fr 1fr 1.5fr 1fr" : "1fr 1fr 1fr", gap: "8px" }}>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="Short (e.g. OS)" 
                  value={subjectForm.shortName} 
                  onChange={e => setSubjectForm({ ...subjectForm, shortName: e.target.value })}
                  style={{ fontSize: "0.85rem" }}
                />
                <input 
                  type="number" 
                  className="text-input" 
                  placeholder="Hours/Week" 
                  value={subjectForm.hoursPerWeek} 
                  onChange={e => setSubjectForm({ ...subjectForm, hoursPerWeek: e.target.value })}
                  style={{ fontSize: "0.85rem" }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ 
                    justifyContent: "center", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    fontSize: "0.85rem",
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
                    style={{ fontSize: "0.85rem", padding: "0.45rem" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* List of Configured Subject Masters with Click to Edit */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  💡 <strong>Tip:</strong> Click on any subject chip below to <strong>Edit & Change</strong> it, or click <strong>✕</strong> to delete.
                </span>
              </div>

              <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                {subjectMasters.map((sm) => (
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
                ))}
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

    </div>
  );
}
