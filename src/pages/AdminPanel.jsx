import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import API from "../api";
import { Eye, EyeOff } from "lucide-react";
import SeatingManager from "../components/SeatingManager";
import AttendanceReportsContainer from "../components/AttendanceReportsContainer";
import InternalMarkTemplateSetup from "../components/InternalMarkTemplateSetup";
import TimetableManager from "../components/TimetableManager";
import SubjectClearModal from "../components/SubjectClearModal";
import { getSubjectLabel } from "../utils/subjectClearUtils";

export default function AdminPanel() {
  const role = sessionStorage.getItem("role");
  const isStrictAdmin = (role || "").toLowerCase() === "admin";
  let myAdminTabs = [];
  try {
    myAdminTabs = JSON.parse(sessionStorage.getItem("adminTabs") || "[]");
  } catch(e) {}
  
  const hasAccessTo = (tab) => {
    if (role === "admin" || role === "printAdmin") return true;
    return myAdminTabs.includes(tab);
  };

  const [activeTab, setActiveTab] = useState(() => {
    if (role === "admin" || role === "printAdmin") return "classes";
    if (myAdminTabs.length > 0) return myAdminTabs[0];
    return "";
  });

  const [editingTabsUserId, setEditingTabsUserId] = useState(null);
  const [selectedAdminTabs, setSelectedAdminTabs] = useState([]);
  const [selectedDashboardTabs, setSelectedDashboardTabs] = useState([]);

  const AVAILABLE_ADMIN_TABS = [
    { id: "classes", label: "Class Setup" },
    { id: "roster", label: "Roster, Subjects & Staff" },
    { id: "access", label: "Mark Entry Access" },
    { id: "reports", label: "Mark Entry Reports" },
    { id: "users", label: "User Access" },
    { id: "activity", label: "Activity Logs" },
    { id: "recycle", label: "Recycle Bin" },
    { id: "eseList", label: "Uploaded Classes" },
    { id: "approvals", label: "Result Approvals" },
    { id: "extensions", label: "Extension Requests" },
    { id: "advisors", label: "Class Advisors" },
    { id: "announcements", label: "Notices" },
    { id: "security", label: "Security" },
    { id: "lettertemplate", label: "Letter Template" },
    { id: "reportsettings", label: "Report Settings" },
    { id: "seating", label: "Seating" },
    { id: "attendance-tracker", label: "Attendance Tracker" },
    { id: "internal-marks", label: "Internal Mark Templates" },
    { id: "timetable", label: "Time Table & Workload" }
  ];

  const AVAILABLE_DASHBOARD_PAGES = [
    { id: "daily-attendance", label: "Daily Attendance" },
    { id: "attendance", label: "Attendance Entry" },
    { id: "entry", label: "Mark Statement" },
    { id: "analysis", label: "Class Analysis" },
    { id: "department-analysis", label: "Dept. Analysis" },
    { id: "rank", label: "Rank List" },
    { id: "parent-letters", label: "Parent Letters" },
    { id: "requests", label: "Mark Requests" },
  ];

  const [classes, setClasses] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [selectedRostersForDelete, setSelectedRostersForDelete] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [showAllClassesDropdown, setShowAllClassesDropdown] = useState(false);
  
  const [promoteSourceCohort, setPromoteSourceCohort] = useState("");
  const [promoteTargetYear, setPromoteTargetYear] = useState("II");
  const [promoteTargetSemester, setPromoteTargetSemester] = useState("III");
  const [isPromoting, setIsPromoting] = useState(false);

  const [formData, setFormData] = useState({
    className: "",
    passMark: "25",
    examName: "CIA - I",
    markPerSubject: "50",
    date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    department: "CSE",
    year: "II",
    semester: "IV",
    section: "A",
    programme: "B.E",
    allowEditing: true,
    editingStartDate: "",
    editingEndDate: "",
    editingStartTime: "",
    editingEndTime: "",
    eseGradingSystem: "System 2"
  });
  const [showCustomExamInput, setShowCustomExamInput] = useState(false);
  const [courseDetails, setCourseDetails] = useState([]);
  const [targetPassPercentage, setTargetPassPercentage] = useState("85");
  const [students, setStudents] = useState([]);
  const [autoLoadedFrom, setAutoLoadedFrom] = useState("");
  const [courseAutoLoadedFrom, setCourseAutoLoadedFrom] = useState("");
  const [propagateRoster, setPropagateRoster] = useState(false);
  const [propagateToYearSem, setPropagateToYearSem] = useState(true);
  const [selectedClassesForAccess, setSelectedClassesForAccess] = useState([]);
  const [accessFilterYear, setAccessFilterYear] = useState("All");
  const [accessFilterSem, setAccessFilterSem] = useState("All");
  const [accessFilterSec, setAccessFilterSec] = useState("All");
  const [accessFilterExam, setAccessFilterExam] = useState("All");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkStartTime, setBulkStartTime] = useState("");
  const [bulkEndTime, setBulkEndTime] = useState("");

  // Persistent refs to eliminate stale closure bugs during async network calls
  const formDataRef = useRef(formData);
  const classesRef = useRef(classes);
  const rostersRef = useRef(rosters);
  const masterSubjectsRef = useRef([]);
  const sectionStaffRef = useRef([]);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);

  useEffect(() => {
    rostersRef.current = rosters;
  }, [rosters]);

  // Master Subjects & Section Staff Mapping states (Roster Hub sub-tabs)
  const [rosterSubTab, setRosterSubTab] = useState("students"); // "students" | "subjects" | "staff"
  const [masterSubjectsList, setMasterSubjectsList] = useState([]);
  const [sectionStaffList, setSectionStaffList] = useState([]);
  const [masterStaffOptions, setMasterStaffOptions] = useState([]);
  const [currForm, setCurrForm] = useState({ programme: "B.E", department: "CSE", year: "III", semester: "V", section: "A" });
  const [editingMasterSubjects, setEditingMasterSubjects] = useState([]);
  const [syncMasterSubjectsToExams, setSyncMasterSubjectsToExams] = useState(true);
  const [savingMasterSubjects, setSavingMasterSubjects] = useState(false);
  const [importingFromTimetable, setImportingFromTimetable] = useState(false);
  const [editingStaffMap, setEditingStaffMap] = useState({});
  const [syncStaffToExams, setSyncStaffToExams] = useState(true);
  const [savingSectionStaff, setSavingSectionStaff] = useState(false);
  const [autoFillingStaff, setAutoFillingStaff] = useState(false);

  // Recycle bin states
  const [recycleClasses, setRecycleClasses] = useState([]);
  const [selectedRecycleClasses, setSelectedRecycleClasses] = useState([]);
  const [recycleSearchQuery, setRecycleSearchQuery] = useState("");
  const [loadingRecycle, setLoadingRecycle] = useState(false);

  // Bulk Clone Modal states (Option 1)
  const [showBulkCloneModal, setShowBulkCloneModal] = useState(false);
  const [cloneIncludeSourceCurrentExam, setCloneIncludeSourceCurrentExam] = useState(true);
  const [cloneTargetExamsForSource, setCloneTargetExamsForSource] = useState([]);
  const [cloneTargetSections, setCloneTargetSections] = useState(["B", "C"]);
  const [cloneSectionExams, setCloneSectionExams] = useState(["CIA - I", "CIA - II", "CIA - III"]);
  const [cloneCustomExamText, setCloneCustomExamText] = useState("");
  const [cloneCustomExamList, setCloneCustomExamList] = useState([]);
  const [alsoCreateSections, setAlsoCreateSections] = useState([]);
  const [cloneFacultyMaps, setCloneFacultyMaps] = useState({});
  const [cloneLoading, setCloneLoading] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [savingRoster, setSavingRoster] = useState(false);
  const [cloneStaffList, setCloneStaffList] = useState([]);
  const [cloneTimetableAllocations, setCloneTimetableAllocations] = useState([]);

  // Security settings states
  const [securityForm, setSecurityForm] = useState({ code: "", question: "", answer: "" });
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState("");
  const [showSecurityCode, setShowSecurityCode] = useState(false);
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);

  // Letter template states
  const [letterTemplate, setLetterTemplate] = useState({
    iqacNo: "MEC/IQAC/2026-27/COE/",
    examDescription: "End Semester Examination - April/May-2026",
    collegeTamilName: "முத்தாயம்மால் பொறியியல் கல்லூரி, இராசிபுரம் – 637 408",
    letterTitle: "STATEMENT OF GRADES",
    englishGreeting: "Marks secured by your son / daughter in the {examDescription} are given below,",
    tamilGreeting: "தேர்வில் தங்கள் மகன் / மகள் பெற்ற மதிப்பெண்கள் கீழே\nகொடுக்கப்பட்டுள்ள அட்டவணையில் குறிப்பிடப்பட்டுள்ளன.",
    noteTitleEnglish: "Note:",
    noteEnglish: "Candidates who secure less than 80 % of overall attendance in a semester will not be Permitted to write the End Semester Examinations.",
    noteTitleTamil: "குறிப்பு:",
    noteTamil: "கல்வியாண்டில் (ஒவ்வொரு செமஸ்டரிலும்) 80 சதவீதத்திற்கு குறைவாக வருகைப்பதிவு இருந்தால் அம்மாணவ, மாணவியர் இறுதி செமஸ்டர் தேர்வு எழுத அனுமதிக்கப்படமாட்டார்,",
    signatureLeft: "MENTOR /\nCLASS ADVISOR",
    signatureMiddle: "HOD",
    signatureRight: "PRINCIPAL",
    columns: []
  });
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterMessage, setLetterMessage] = useState("");



  // ESE List & Edit States
  const [eseListEditClass, setEseListEditClass] = useState(null);
  const [eseListAttendance, setEseListAttendance] = useState({});
  const [eseListMarks, setEseListMarks] = useState({});
  const [eseListSaving, setEseListSaving] = useState(false);
  const [eseListSearch, setEseListSearch] = useState("");
  const [eseListExamFilter, setEseListExamFilter] = useState("");
  const [eseClearModalOpen, setEseClearModalOpen] = useState(false);
  const [eseClearSubjectIdx, setEseClearSubjectIdx] = useState(0);
  const [eseIsClearing, setEseIsClearing] = useState(false);
  const [eseLastClearBackup, setEseLastClearBackup] = useState(null);

  // User management states
  const [users, setUsers] = useState([]);
  const [printEditAccess, setPrintEditAccess] = useState(false);
  const [activities, setActivities] = useState([]);
  const [yearApprovals, setYearApprovals] = useState([]);

  // Extension requests
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [approvalDates, setApprovalDates] = useState({});

  // Class Advisor States
  const [advisors, setAdvisors] = useState([]);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorFormData, setAdvisorFormData] = useState({
    programme: "B.E",
    department: "CSE",
    year: "II",
    section: "A",
    advisorName: ""
  });
  const [editingAdvisorId, setEditingAdvisorId] = useState(null);

  // Announcement States
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcementFormData, setAnnouncementFormData] = useState({
    title: "",
    content: "",
    category: "General",
    targetProgramme: "All",
    targetDepartment: "CSE",
    targetYear: ["All"],
    targetSection: ["All"],
    image: null
  });

  // Report Settings States
  const [reportSettingsFilter, setReportSettingsFilter] = useState({
    year: "II", semester: "IV", section: "A", examName: "CIA - I"
  });
  const [reportSettingsData, setReportSettingsData] = useState({
    iqacPrefix: "MEC/IQAC/2026-27/COE/",
    academicYearText: " (2026-27)",
    actionTakenSubjects: []
  });
  const [reportSettingsClassId, setReportSettingsClassId] = useState(null);
  const [reportSettingsClassSubjects, setReportSettingsClassSubjects] = useState([]);
  const [reportSettingsLoading, setReportSettingsLoading] = useState(false);
  const [reportSettingsMessage, setReportSettingsMessage] = useState("");

  // Report State
  const [reportExamModel, setReportExamModel] = useState("");
  const [reportYears, setReportYears] = useState(["All"]);
  const [reportSections, setReportSections] = useState(["All"]);
  const [selectedPendingData, setSelectedPendingData] = useState(null);
  const [selectedPendingStudents, setSelectedPendingStudents] = useState([]);
  const [pendingModalLoading, setPendingModalLoading] = useState(false);

  // Attendance Setup & Missing Attendance States
  const [workingDays, setWorkingDays] = useState([]);
  const [workingDaysLoading, setWorkingDaysLoading] = useState(false);
  const [wdFormData, setWdFormData] = useState({ year: "I", startDate: "", endDate: "" });
  
  const [missingAttendance, setMissingAttendance] = useState([]);
  const [missingLoading, setMissingLoading] = useState(false);
  const [missingSearchQuery, setMissingSearchQuery] = useState("");
  const [missingReportYear, setMissingReportYear] = useState("");

  const [reportYear, setReportYear] = useState("II");
  const [reportSem, setReportSem] = useState("III");
  const [reportAsOfDate, setReportAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceReportData, setAttendanceReportData] = useState(null);
  const [attendanceReportLoading, setAttendanceReportLoading] = useState(false);

  const handleReportCheckboxChange = (option, selectedList, setter) => {
    if (option === "All") {
      setter(selectedList.includes("All") ? [] : ["All"]);
      return;
    }
    
    let newList = selectedList.filter(i => i !== "All");
    if (newList.includes(option)) {
      newList = newList.filter(i => i !== option);
    } else {
      newList.push(option);
    }
    
    if (newList.length === 0) {
      setter(["All"]);
    } else {
      setter(newList);
    }
  };
  // Exam name options
  const examNameOptions = [
    "Model Exam",
    "Model Practical Exam",
    "Unit Test - I", "Unit Test - II", "Unit Test - III", "Unit Test - IV", "Unit Test - V",
    "CIA - I", "CIA - II", "CIA - III",
    "SEMINAR", "MKC", "ESE"
  ];

  const dynamicExamNameOptions = Array.from(new Set([
    ...examNameOptions,
    ...(classes ? classes.map(c => c.examName) : []),
    ...cloneCustomExamList
  ])).filter(Boolean);

  const getDefaultMarks = (examName) => {
    const lower = String(examName || "").toLowerCase();
    if (lower.includes("unit test")) {
      return { passMark: "15", markPerSubject: "30" };
    } else if (lower === "cia - i" || lower === "cia - ii" || lower === "cia i" || lower === "cia ii") {
      return { passMark: "25", markPerSubject: "50" };
    } else if (lower === "mkc") {
      return { passMark: "3", markPerSubject: "5" };
    } else if (lower === "cia - iii" || lower === "cia iii" || lower === "ese" || lower.includes("model")) {
      return { passMark: "50", markPerSubject: "100" };
    }
    return { passMark: "50", markPerSubject: "100" };
  };

  // Detect all sections belonging to a cohort across Master Rosters, existing classes, and defaults A-E
  const getSectionsForCohort = (yr, sem, dept, prog) => {
    const rosterSecs = (rosters || [])
      .filter(r => r.year === yr && String(r.semester) === String(sem) && (r.department || "CSE") === (dept || "CSE") && (!prog || !r.programme || r.programme === prog))
      .map(r => r.section);
    const classSecs = (classes || [])
      .filter(c => c.yearSemSec && c.yearSemSec.startsWith(`${yr}/${sem}/`) && (c.department || "CSE") === (dept || "CSE") && (!prog || !c.programme || c.programme === prog))
      .map(c => c.yearSemSec.split("/")[2]);
    return Array.from(new Set([...rosterSecs, ...classSecs, "A", "B", "C", "D", "E"]))
      .filter(Boolean)
      .sort();
  };

  const getRosterCountForSection = (yr, sem, sec, dept, prog) => {
    const r = (rosters || []).find(item =>
      item.year === yr &&
      String(item.semester) === String(sem) &&
      item.section === sec &&
      (item.department || "CSE") === (dept || "CSE") &&
      (!prog || !item.programme || item.programme === prog)
    );
    if (r?.students?.length > 0) return r.students.length;
    const peer = (classes || []).find(c =>
      c.yearSemSec === `${yr}/${sem}/${sec}` &&
      (c.department || "CSE") === (dept || "CSE") &&
      (!prog || !c.programme || c.programme === prog) &&
      c.students?.length > 0
    );
    return peer?.students?.length || 0;
  };

  useEffect(() => {
    loadClasses(true);
    loadRosters();
    loadUsers();
    loadActivities();
    loadMasterStaffOptions();
  }, []);

  const ROMAN_TO_SEM_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

  const loadMasterStaffOptions = async () => {
    try {
      const res = await API.get("/api/timetable/staff");
      setMasterStaffOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMasterStaffOptions([]);
    }
  };

  useEffect(() => {
    const prog = String(currForm.programme || "B.E").trim();
    const dept = String(currForm.department || "CSE").trim();
    const yr = String(currForm.year || "").trim();
    const sem = String(currForm.semester || "").trim();
    const sec = String(currForm.section || "").trim();

    const subjDoc = masterSubjectsList.find(m =>
      m.programme === prog && m.department === dept && m.year === yr && m.semester === sem
    );
    setEditingMasterSubjects(
      subjDoc && Array.isArray(subjDoc.subjects)
        ? subjDoc.subjects.map(s => ({ ...s }))
        : []
    );

    const staffDoc = sectionStaffList.find(m =>
      m.programme === prog && m.department === dept && m.year === yr && m.semester === sem && m.section === sec
    );
    const nextMap = {};
    (staffDoc?.staffAssignments || []).forEach(sa => {
      const codeKey = String(sa.courseCode || "").trim().toUpperCase();
      if (codeKey) nextMap[codeKey] = sa.facultyName || "";
    });
    setEditingStaffMap(nextMap);
  }, [currForm, masterSubjectsList, sectionStaffList]);

  const loadCurriculumData = async () => {
    try {
      const [subjRes, staffRes] = await Promise.all([
        API.get("/api/curriculum/subjects").catch(() => ({ data: [] })),
        API.get("/api/curriculum/staff-mappings").catch(() => ({ data: [] }))
      ]);
      const subjData = Array.isArray(subjRes.data) ? subjRes.data : [];
      const staffData = Array.isArray(staffRes.data) ? staffRes.data : [];
      masterSubjectsRef.current = subjData;
      sectionStaffRef.current = staffData;
      setMasterSubjectsList(subjData);
      setSectionStaffList(staffData);
      return { subjData, staffData };
    } catch {
      return { subjData: [], staffData: [] };
    }
  };

  const loadClasses = async (shouldSyncForm = false) => {
    try {
      const [rostersRes, res, currData] = await Promise.all([
        API.get("/api/rosters"),
        API.get("/api/classes"),
        loadCurriculumData()
      ]);
      setRosters(rostersRes.data);
      rostersRef.current = rostersRes.data;

      setClasses(res.data);
      classesRef.current = res.data;

      // Only sync the form on initial mount or when explicitly requested,
      // using the latest active formDataRef so background refetches never revert user selections!
      if (shouldSyncForm) {
        const cur = formDataRef.current || formData;
        checkAndLoadExistingLocal(
          cur.year,
          cur.semester,
          cur.section,
          cur.examName,
          res.data,
          cur.programme,
          cur.department,
          rostersRes.data,
          currData.subjData,
          currData.staffData
        );
      }
    } catch (err) { console.error(err); }
  };

  const loadRosters = async () => {
    try {
      const res = await API.get("/api/rosters");
      setRosters(res.data);
    } catch (err) { console.error(err); }
  };

  const loadRecycleClasses = async () => {
    setLoadingRecycle(true);
    try {
      const res = await API.get("/api/classes?deletedOnly=true");
      setRecycleClasses(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoadingRecycle(false);
  };

  useEffect(() => {
    setSelectedClassesForAccess([]);
    setSelectedRecycleClasses([]);
    setAccessFilterYear("All");
    setAccessFilterSem("All");
    setAccessFilterSec("All");
    setAccessFilterExam("All");
    if (activeTab === "recycle") {
      loadRecycleClasses();
    } else if (activeTab === "approvals") {
      loadYearApprovals();
    } else if (activeTab === "extensions") {
      loadExtensionRequests();
    } else if (activeTab === "advisors") {
      loadAdvisors();
    } else if (activeTab === "announcements") {
      loadAnnouncements();
    } else if (activeTab === "lettertemplate") {
      loadLetterTemplate();
    } else if (activeTab === "security") {
      loadSecuritySettings();
    } else if (activeTab === "attendance-tracker") {
      loadWorkingDays();
      loadMissingAttendance();
    } else if (activeTab === "attendance-report") {
      loadAttendanceReport();
    }
  }, [activeTab]);

  const loadWorkingDays = async () => {
    setWorkingDaysLoading(true);
    try {
      const res = await API.get("/api/working-days", { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
      setWorkingDays(res.data);
    } catch (err) { console.error(err); }
    setWorkingDaysLoading(false);
  };

  const loadMissingAttendance = async () => {
    setMissingLoading(true);
    try {
      const res = await API.get("/api/attendance/missing", { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
      setMissingAttendance(res.data);
    } catch (err) { console.error(err); }
    setMissingLoading(false);
  };

  const handleSaveWorkingDays = async (e) => {
    e.preventDefault();
    try {
      await API.post("/api/working-days", wdFormData, { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } });
      alert("Working days saved successfully!");
      loadWorkingDays();
    } catch (err) {
      alert("Failed to save working days: " + err.message);
    }
  };

  const loadAttendanceReport = async () => {
    setAttendanceReportLoading(true);
    try {
      const res = await API.get("/api/attendance-report", { 
        params: { year: reportYear, semester: reportSem, asOfDate: reportAsOfDate },
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } 
      });
      setAttendanceReportData(res.data);
    } catch (err) { console.error(err); }
    setAttendanceReportLoading(false);
  };

  useEffect(() => {
    if (activeTab === "reportsettings") {
      loadReportSettings();
    }
  }, [reportSettingsFilter, activeTab]);

  const loadReportSettings = async () => {
    setReportSettingsLoading(true);
    setReportSettingsMessage("");
    try {
      const yearSemSec = `${reportSettingsFilter.year}/${reportSettingsFilter.semester}/${reportSettingsFilter.section}`;
      // Find the class matching the filter
      const cls = classes.find(c => c.yearSemSec === yearSemSec && c.examName === reportSettingsFilter.examName);
      if (cls) {
        setReportSettingsClassId(cls._id);
        setReportSettingsClassSubjects(cls.courseDetails.map(c => c.courseCode));
        setReportSettingsData({
          iqacPrefix: cls.iqacPrefix || "MEC/IQAC/2026-27/COE/",
          academicYearText: cls.academicYearText || " (2026-27)",
          actionTakenSubjects: cls.actionTakenSubjects || []
        });
      } else {
        setReportSettingsClassId(null);
        setReportSettingsClassSubjects([]);
        setReportSettingsData({
          iqacPrefix: "MEC/IQAC/2026-27/COE/",
          academicYearText: " (2026-27)",
          actionTakenSubjects: []
        });
      }
    } catch (err) {
      console.error(err);
    }
    setReportSettingsLoading(false);
  };

  const handleSaveReportSettings = async () => {
    if (!reportSettingsClassId) {
      setReportSettingsMessage("Error: Class not found for the selected criteria. Please create it first.");
      return;
    }
    setReportSettingsLoading(true);
    try {
      await API.put(`/api/classes/${reportSettingsClassId}/report-settings`, reportSettingsData);
      setReportSettingsMessage("Report settings saved successfully!");
      // Reload classes to update local state
      loadClasses();
    } catch (err) {
      console.error(err);
      setReportSettingsMessage("Failed to save report settings.");
    }
    setReportSettingsLoading(false);
  };

  const loadExtensionRequests = async () => {
    try {
      const res = await API.get("/api/extensions");
      setExtensionRequests(res.data);
    } catch (err) {
      console.error("Failed to load extension requests", err);
    }
  };

  const loadYearApprovals = async () => {
    try {
      const res = await API.get("/api/auth/admin/year-approvals", { 
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } 
      });
      setYearApprovals(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdvisors = async () => {
    setAdvisorLoading(true);
    try {
      const res = await API.get("/api/advisors", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setAdvisors(res.data);
    } catch (err) {
      console.error("Failed to load advisors", err);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleSaveAdvisor = async (e) => {
    e.preventDefault();
    if (!advisorFormData.advisorName.trim()) {
      alert("Please enter the Advisor's Name.");
      return;
    }
    try {
      await API.post("/api/advisors", advisorFormData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      alert(editingAdvisorId ? "Advisor updated successfully!" : "Advisor added successfully!");
      setAdvisorFormData(prev => ({ ...prev, advisorName: "" }));
      setEditingAdvisorId(null);
      loadAdvisors();
    } catch (err) {
      alert("Failed to save advisor: " + (err.response?.data?.error || err.message));
    }
  };

  const handleEditAdvisorClick = (adv) => {
    setAdvisorFormData({
      programme: adv.programme,
      department: adv.department,
      year: adv.year,
      section: adv.section,
      advisorName: adv.advisorName
    });
    setEditingAdvisorId(adv._id);
  };

  const handleDeleteAdvisor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this class advisor mapping?")) return;
    try {
      await API.delete(`/api/advisors/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      loadAdvisors();
    } catch (err) {
      alert("Failed to delete advisor: " + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelAdvisorEdit = () => {
    setAdvisorFormData({
      programme: "B.E",
      department: "CSE",
      year: "II",
      section: "A",
      advisorName: ""
    });
    setEditingAdvisorId(null);
  };

  const loadAnnouncements = async () => {
    setAnnouncementLoading(true);
    try {
      const res = await API.get("/api/announcements", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setAnnouncements(res.data);
    } catch (err) {
      console.error("Failed to load announcements", err);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const handleYearCheckboxChange = (year) => {
    setAnnouncementFormData(prev => {
      let newYears = [...prev.targetYear];
      if (year === "All") {
        newYears = newYears.includes("All") ? [] : ["All"];
      } else {
        newYears = newYears.filter(y => y !== "All");
        if (newYears.includes(year)) {
          newYears = newYears.filter(y => y !== year);
        } else {
          newYears.push(year);
        }
        if (newYears.length === 0) {
          newYears = ["All"];
        }
      }
      return { ...prev, targetYear: newYears };
    });
  };

  const handleSectionCheckboxChange = (section) => {
    setAnnouncementFormData(prev => {
      let newSections = [...prev.targetSection];
      if (section === "All") {
        newSections = newSections.includes("All") ? [] : ["All"];
      } else {
        newSections = newSections.filter(s => s !== "All");
        if (newSections.includes(section)) {
          newSections = newSections.filter(s => s !== section);
        } else {
          newSections.push(section);
        }
        if (newSections.length === 0) {
          newSections = ["All"];
        }
      }
      return { ...prev, targetSection: newSections };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller image.");
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAnnouncementFormData(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementFormData.title.trim() || !announcementFormData.content.trim()) {
      alert("Please enter title and content.");
      return;
    }
    try {
      await API.post("/api/announcements", announcementFormData, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      alert("Announcement published successfully!");
      setAnnouncementFormData({
        title: "",
        content: "",
        category: "General",
        targetProgramme: "All",
        targetDepartment: "CSE",
        targetYear: ["All"],
        targetSection: ["All"],
        image: null
      });
      loadAnnouncements();
    } catch (err) {
      alert("Failed to save announcement: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await API.delete(`/api/announcements/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      loadAnnouncements();
    } catch (err) {
      alert("Failed to delete announcement: " + (err.response?.data?.error || err.message));
    }
  };

  const generateClassWorksheet = (classData) => {
    const courseDetails = classData.courseDetails || [];

    const getDisplayDate = () => {
      if (!classData.date) return "";
      const parts = classData.date.split(".");
      if (parts.length !== 3) return classData.date;
      const [day, month, year] = parts;
      return `${day}-${month}-${year}`;
    };

    const calculateClassSubjectStats = (cls, j) => {
      let total = 0;
      let pass = 0;
      let fail = 0;
      cls.students.forEach(s => {
        const m = s.marks[j];
        if (m !== undefined && m !== "") {
          total++;
          const isAbsent = String(m).toUpperCase() === "AB" || String(m).toUpperCase() === "A";
          const markNum = Number(m);
          if (!isAbsent && !isNaN(markNum) && markNum >= cls.passMark) {
            pass++;
          } else {
            fail++;
          }
        }
      });
      const passPercent = total > 0 ? ((pass / total) * 100).toFixed(2) : "0.00";
      return { total, pass, fail, passPercent };
    };

    const getOverallPassPercent = (cls) => {
      const totalStudents = cls.students.length;
      if (totalStudents === 0) return "0.00%";
      const passCount = cls.students.filter(s => s.result === "Pass").length;
      return ((passCount / totalStudents) * 100).toFixed(2) + "%";
    };

    const aoa = [
      ["MUTHAYAMMAL ENGINEERING COLLEGE"],
      ["(Autonomous)"],
      ["OFFICE OF THE CONTROLLER OF EXAMINATIONS"],
      [`${classData.examName} MARK STATEMENT`],
      [`Department : ${classData.department || "CSE"}`, "", `Class : ${classData.className.trim()}`, "", `Date: ${getDisplayDate()}`],
      []
    ];

    const headerRow = ["S.No.", "Register Number", "Name of the Student"];
    classData.subjects.forEach((sub) => {
      const cd = courseDetails.find(d => d.courseCode === sub);
      headerRow.push(cd?.courseCode || sub);
    });
    headerRow.push(classData.examName === "ESE" ? "SGPA" : "Total Marks", "Pass %", "Pass/Fail");
    aoa.push(headerRow);

    classData.students.forEach((s, i) => {
      const row = [i + 1, s.regNo, s.name];
      classData.subjects.forEach((sub, j) => {
        row.push(s.marks ? s.marks[j] : "-");
      });
      row.push(s.total, s.percentage, s.result === "Pass" ? "P" : "F");
      aoa.push(row);
    });

    const totalRow = ["", "", "Total"];
    const passRow = ["", "", "Pass"];
    const failRow = ["", "", "Fail"];
    const passPctRow = ["", "", "Pass %"];

    classData.subjects.forEach((_, j) => {
      const stats = calculateClassSubjectStats(classData, j);
      totalRow.push(stats.total);
      passRow.push(stats.pass);
      failRow.push(stats.fail);
      passPctRow.push(stats.passPercent);
    });

    aoa.push(totalRow, passRow, failRow, passPctRow);
    aoa.push([]);

    aoa.push(["PASS % : TARGET", classData.targetPassPercentage || 85]);
    aoa.push(["Overall Pass %", getOverallPassPercent(classData)]);
    aoa.push([]);

    aoa.push(["S.No.", "COURSE CODE", "COURSE NAME", "NAME OF THE FACULTY", "PASS %", "SIGNATURE"]);
    classData.subjects.forEach((sub, i) => {
      const cd = courseDetails.find(c => c.courseCode === sub) || { courseCode: sub, courseName: "", facultyName: "" };
      const stats = calculateClassSubjectStats(classData, i);
      aoa.push([i + 1, cd.courseCode, cd.courseName, cd.facultyName, stats.passPercent, ""]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 25 },
      ...classData.subjects.map(() => ({ wch: 10 })),
      { wch: 10 },
      { wch: 8 },
      { wch: 8 }
    ];

    return ws;
  };

  const handleDownloadBulkExcel = () => {
    if (selectedClassesForAccess.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();

      selectedClassesForAccess.forEach(cName => {
        const classObj = classes.find(c => c.className === cName);
        if (!classObj) return;

        const ws = generateClassWorksheet(classObj);

        let sheetName = `${classObj.department}-${classObj.yearSemSec}-${classObj.examName}`
          .replace(/[/\s:]/g, "-")
          .replace(/-+/g, "-");
        
        if (sheetName.startsWith("-")) sheetName = sheetName.substring(1);
        if (sheetName.endsWith("-")) sheetName = sheetName.substring(0, sheetName.length - 1);
        
        sheetName = sheetName.substring(0, 30);

        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${sheetName.substring(0, 26)} (${counter})`;
          counter++;
        }

        XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
      });

      if (wb.SheetNames.length === 0) {
        alert("No valid class data found to export.");
        return;
      }

      XLSX.writeFile(wb, `Bulk_Mark_Statements_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert("Failed to export Excel: " + err.message);
    }
  };

  const handleDownloadRecycleExcel = () => {
    if (selectedRecycleClasses.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();

      selectedRecycleClasses.forEach(cName => {
        const classObj = recycleClasses.find(c => c.className === cName);
        if (!classObj) return;

        const ws = generateClassWorksheet(classObj);

        let sheetName = `${classObj.department}-${classObj.yearSemSec}-${classObj.examName}`
          .replace(/[/\s:]/g, "-")
          .replace(/-+/g, "-");
        
        if (sheetName.startsWith("-")) sheetName = sheetName.substring(1);
        if (sheetName.endsWith("-")) sheetName = sheetName.substring(0, sheetName.length - 1);
        
        sheetName = sheetName.substring(0, 30);

        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
          finalSheetName = `${sheetName.substring(0, 26)} (${counter})`;
          counter++;
        }

        XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
      });

      if (wb.SheetNames.length === 0) {
        alert("No valid class data found to export.");
        return;
      }

      XLSX.writeFile(wb, `Recycled_Mark_Statements_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert("Failed to export Excel: " + err.message);
    }
  };

  const toggleYearApproval = async (year, currentStatus) => {
    try {
      const res = await API.post("/api/auth/admin/year-approvals", 
        { year, isApproved: !currentStatus }, 
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );
      setYearApprovals(prev => {
        const exists = prev.find(a => a.year === year);
        if (exists) return prev.map(a => a.year === year ? res.data : a);
        return [...prev, res.data];
      });
    } catch (err) {
      alert("Failed to update approval");
    }
  };

  const filteredAccessClasses = classes.filter(c => {
    const yssParts = (c.yearSemSec || "").split("/");
    const y = yssParts[0] || "";
    const s = yssParts[1] || "";
    const sec = yssParts[2] || "";
    
    const matchesYear = accessFilterYear === "All" || y === accessFilterYear;
    const matchesSem = accessFilterSem === "All" || s === accessFilterSem;
    const matchesSec = accessFilterSec === "All" || sec === accessFilterSec;
    const matchesExam = accessFilterExam === "All" || c.examName === accessFilterExam;
    
    return matchesYear && matchesSem && matchesSec && matchesExam;
  });

  const handleYearFilterChange = (val) => {
    setAccessFilterYear(val);
    if (val === "I" && !["I", "II"].includes(accessFilterSem)) {
      setAccessFilterSem("All");
    } else if (val === "II" && !["III", "IV"].includes(accessFilterSem)) {
      setAccessFilterSem("All");
    } else if (val === "III" && !["V", "VI"].includes(accessFilterSem)) {
      setAccessFilterSem("All");
    } else if (val === "IV" && !["VII", "VIII"].includes(accessFilterSem)) {
      setAccessFilterSem("All");
    }
  };

  const getSemOptionsForYear = (year) => {
    switch (year) {
      case "I":
        return ["I", "II"];
      case "II":
        return ["III", "IV"];
      case "III":
        return ["V", "VI"];
      case "IV":
        return ["VII", "VIII"];
      default:
        return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    }
  };

  const handleBulkAccessUpdate = async (allowEditing) => {
    try {
      if (selectedClassesForAccess.length === 0) return;
      await API.post("/api/classes/bulk-access", {
        classNames: selectedClassesForAccess,
        allowEditing,
        editingStartDate: allowEditing ? bulkStartDate : "",
        editingEndDate: allowEditing ? bulkEndDate : "",
        editingStartTime: allowEditing ? bulkStartTime : "",
        editingEndTime: allowEditing ? bulkEndTime : ""
      });
      setClasses(prev => prev.map(c => 
        selectedClassesForAccess.includes(c.className) 
          ? { 
              ...c, 
              allowEditing, 
              editingStartDate: allowEditing ? bulkStartDate : "", 
              editingEndDate: allowEditing ? bulkEndDate : "",
              editingStartTime: allowEditing ? bulkStartTime : "",
              editingEndTime: allowEditing ? bulkEndTime : ""
            } 
          : c
      ));
      if (selectedClassesForAccess.includes(selectedClassId)) {
        setFormData(prev => ({ 
          ...prev, 
          allowEditing, 
          editingStartDate: allowEditing ? bulkStartDate : "", 
          editingEndDate: allowEditing ? bulkEndDate : "",
          editingStartTime: allowEditing ? bulkStartTime : "",
          editingEndTime: allowEditing ? bulkEndTime : ""
        }));
      }
      setSelectedClassesForAccess([]);
      setBulkStartDate("");
      setBulkEndDate("");
      setBulkStartTime("");
      setBulkEndTime("");
    } catch (err) {
      alert("Failed bulk update: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClassesForAccess.length === 0) return;
    if (!window.confirm(`Are you sure you want to move ${selectedClassesForAccess.length} class(es) to the Recycle Bin? They will be permanently deleted after 30 days.`)) return;
    try {
      await API.post("/api/classes/bulk-delete", { classNames: selectedClassesForAccess });
      alert("Selected class(es) moved to Recycle Bin.");
      setSelectedClassesForAccess([]);
      loadClasses();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedRecycleClasses.length === 0) return;
    try {
      await API.post("/api/classes/bulk-restore", { classNames: selectedRecycleClasses });
      alert("Selected class(es) restored successfully.");
      setSelectedRecycleClasses([]);
      loadRecycleClasses();
      loadClasses();
    } catch (err) {
      alert("Failed to restore: " + err.message);
    }
  };

  const handleBulkPurge = async () => {
    if (selectedRecycleClasses.length === 0) return;
    if (!window.confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${selectedRecycleClasses.length} class(es)? This action cannot be undone.`)) return;
    try {
      await API.post("/api/classes/bulk-purge", { classNames: selectedRecycleClasses });
      alert("Selected class(es) permanently deleted.");
      setSelectedRecycleClasses([]);
      loadRecycleClasses();
    } catch (err) {
      alert("Failed to purge: " + err.message);
    }
  };

  const handleToggleSingleAccess = async (className, currentAllowEditing) => {
    try {
      const nextAllowEditing = !currentAllowEditing;
      await API.post("/api/classes/bulk-access", {
        classNames: [className],
        allowEditing: nextAllowEditing,
        editingStartDate: "",
        editingEndDate: "",
        editingStartTime: "",
        editingEndTime: ""
      });
      setClasses(prev => prev.map(c => 
        c.className === className 
          ? { 
              ...c, 
              allowEditing: nextAllowEditing,
              editingStartDate: "",
              editingEndDate: "",
              editingStartTime: "",
              editingEndTime: ""
            } 
          : c
      ));
      if (className === selectedClassId) {
        setFormData(prev => ({ 
          ...prev, 
          allowEditing: nextAllowEditing,
          editingStartDate: "",
          editingEndDate: "",
          editingStartTime: "",
          editingEndTime: ""
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to toggle access control.");
    }
  };

  const formatLimitDate = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  const isClassAccessActive = (c) => {
    if (c.allowEditing === false) return false;
    if (!c.editingStartDate && !c.editingEndDate) return true;
    
    const now = new Date();
    const istDate = new Date(now.getTime() + 19800000); // UTC + 5.5 hours
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    const hours = String(istDate.getUTCHours()).padStart(2, '0');
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    if (c.editingStartDate) {
      const startLimit = c.editingStartDate + "T" + (c.editingStartTime || "00:00");
      if (todayStr < startLimit) return false;
    }
    if (c.editingEndDate) {
      const endLimit = c.editingEndDate + "T" + (c.editingEndTime || "23:59");
      if (todayStr > endLimit) return false;
    }
    
    return true;
  };




  const stripMarksFromStudents = (list = []) => (list || []).map(std => ({
    regNo: std.regNo || "",
    name: std.name || "",
    dob: std.dob || "",
    gender: std.gender || "Boy",
    studentType: std.studentType || "Day Scholar"
  }));

  const isSpecialOrLabExam = (examName = "") =>
    /lab|practical|observation|seminar|project|mkc/i.test(String(examName || ""));

  // Build the unique key for a class: yearSemSec + examName
  const buildClassName = (year, semester, section, examName, programme, department) => {
    return `${programme || formData.programme}-${department || formData.department} - ${year}/${semester}/${section} - ${examName}`;
  };

  const getMasterSubjectDoc = (prog, dept, yr, sem, providedSubjs) => {
    const list = providedSubjs || (masterSubjectsRef?.current ? masterSubjectsRef.current : masterSubjectsList) || [];
    const p = String(prog || "B.E").trim();
    const d = String(dept || "CSE").trim();
    return list.find(m => m.programme === p && m.department === d && m.year === yr && m.semester === sem) || null;
  };

  const getSectionStaffDoc = (prog, dept, yr, sem, sec, providedStaff) => {
    const list = providedStaff || (sectionStaffRef?.current ? sectionStaffRef.current : sectionStaffList) || [];
    const p = String(prog || "B.E").trim();
    const d = String(dept || "CSE").trim();
    return list.find(m => m.programme === p && m.department === d && m.year === yr && m.semester === sem && m.section === sec) || null;
  };

  const buildMasterStaffMap = (prog, dept, yr, sem, sec, providedStaff) => {
    const doc = getSectionStaffDoc(prog, dept, yr, sem, sec, providedStaff);
    const map = new Map();
    (doc?.staffAssignments || []).forEach(sa => {
      const codeUp = String(sa.courseCode || "").trim().toUpperCase();
      if (codeUp) map.set(codeUp, String(sa.facultyName || "").trim());
    });
    return map;
  };

  const overlayMasterCoursesAndStaff = (courseList = [], prog, dept, yr, sem, sec, keepUnmappedFaculty = false, providedSubjs, providedStaff) => {
    const masterDoc = getMasterSubjectDoc(prog, dept, yr, sem, providedSubjs);
    const staffMap = buildMasterStaffMap(prog, dept, yr, sem, sec, providedStaff);
    const masterByCode = new Map();
    (masterDoc?.subjects || []).forEach(s => {
      const key = String(s.courseCode || "").trim().toUpperCase();
      if (key) masterByCode.set(key, s);
    });

    return (courseList || []).map(cd => {
      let code = cd.courseCode || "";
      let name = cd.courseName || "";
      if (code.includes(" & ")) {
        const parts = code.split(" & ");
        code = parts[0].trim();
        name = name || parts[1]?.trim() || "";
      }
      const codeUp = code.trim().toUpperCase();
      const masterItem = masterByCode.get(codeUp);
      const mappedFaculty = staffMap.has(codeUp) ? staffMap.get(codeUp) : undefined;
      return {
        courseCode: code.trim(),
        courseName: masterItem?.courseName || name,
        shortName: masterItem?.shortName !== undefined ? masterItem.shortName : (cd.shortName || ""),
        facultyName: mappedFaculty !== undefined && mappedFaculty !== "" ? mappedFaculty : (keepUnmappedFaculty ? (cd.facultyName || "") : ""),
        credits: masterItem?.credits !== undefined ? Number(masterItem.credits) : (cd.credits !== undefined ? cd.credits : 3),
        category: masterItem?.category || cd.category || "Theory"
      };
    });
  };

  const buildCoursesFromMaster = (prog, dept, yr, sem, sec, categoryFilter = "All", providedSubjs, providedStaff) => {
    const masterDoc = getMasterSubjectDoc(prog, dept, yr, sem, providedSubjs);
    if (!masterDoc || !Array.isArray(masterDoc.subjects) || masterDoc.subjects.length === 0) return [];
    const staffMap = buildMasterStaffMap(prog, dept, yr, sem, sec, providedStaff);
    return masterDoc.subjects
      .filter(s => categoryFilter === "All" || (s.category || "Theory") === categoryFilter)
      .map(s => {
        const codeUp = String(s.courseCode || "").trim().toUpperCase();
        return {
          courseCode: String(s.courseCode || "").trim(),
          courseName: String(s.courseName || "").trim(),
          shortName: String(s.shortName || "").trim(),
          facultyName: staffMap.get(codeUp) || "",
          credits: s.credits !== undefined ? Number(s.credits) : 3,
          category: s.category || "Theory"
        };
      });
  };

  const checkAndLoadExistingLocal = (y, s, sec, exam, allClasses, prog, dept, providedRosters, providedSubjs, providedStaff) => {
    let validatedSem = s;
    if (y === "I" && !["I", "II"].includes(s)) validatedSem = "I";
    else if (y === "II" && !["III", "IV"].includes(s)) validatedSem = "III";
    else if (y === "III" && !["V", "VI"].includes(s)) validatedSem = "V";
    else if (y === "IV" && !["VII", "VIII"].includes(s)) validatedSem = "VII";

    const list = allClasses || (classesRef && classesRef.current ? classesRef.current : classes);
    const currentRosters = providedRosters || (rostersRef && rostersRef.current ? rostersRef.current : rosters);
    const curForm = (formDataRef && formDataRef.current) || formData;
    const currentProg = prog !== undefined ? prog : curForm.programme;
    const currentDept = dept !== undefined ? dept : curForm.department;
    const targetName = buildClassName(y, validatedSem, sec, exam, currentProg, currentDept);
    const found = list.find(c => c.className === targetName);
    if (found) {
      setShowCustomExamInput(false);
      handleManualClassSelectLocal(found.className, list);
      setAutoLoadedFrom("");
    } else {
      // Also try matching by yearSemSec only (old format compatibility)
      const targetYSS = `${y}/${validatedSem}/${sec}`;
      const foundByYSS = list.find(c => c.yearSemSec === targetYSS && c.examName === exam && c.programme === currentProg && c.department === currentDept);
      if (foundByYSS) {
        setShowCustomExamInput(false);
        handleManualClassSelectLocal(foundByYSS.className, list);
        setAutoLoadedFrom("");
      } else {
        setSelectedClassId("");

        // Ensure the dropdowns reflect the user's selection even if the class is new
        setFormData(prev => ({
          ...prev,
          year: y,
          semester: validatedSem,
          section: sec,
          examName: exam,
          programme: currentProg,
          department: currentDept
        }));

        // Search for existing cohort match (same programme, department, yearSemSec)
        const targetIsSpecial = isSpecialOrLabExam(exam);
        const cohortMatch = list.find(c =>
          c.programme === currentProg &&
          c.department === currentDept &&
          c.yearSemSec === targetYSS &&
          isSpecialOrLabExam(c.examName) === targetIsSpecial
        ) || list.find(c =>
          c.programme === currentProg &&
          c.department === currentDept &&
          c.yearSemSec === targetYSS
        );

        // Auto-load student roster ONLY (never carry marks from another exam)
        const rosterMatch = currentRosters.find(r => r.cohortName === `${currentProg}-${currentDept} - ${targetYSS}`);
        if (rosterMatch && rosterMatch.students && rosterMatch.students.length > 0) {
          setStudents(stripMarksFromStudents(rosterMatch.students));
          setAutoLoadedFrom("Master Roster");
        } else if (cohortMatch && cohortMatch.students && cohortMatch.students.length > 0) {
          setStudents(stripMarksFromStudents(cohortMatch.students));
          setAutoLoadedFrom(cohortMatch.className);
        } else {
          setStudents([]);
          setAutoLoadedFrom("");
        }

        // 1. Exact same examName in the same year/sem across sections (e.g. III/V/B - CIA - I -> III/V/A - CIA - I)
        const exactExamYearSemMatch = list.find(c =>
          c.programme === currentProg &&
          c.department === currentDept &&
          c.examName === exam &&
          c.yearSemSec && c.yearSemSec.startsWith(`${y}/${validatedSem}/`) &&
          c.courseDetails && c.courseDetails.length > 0
        );

        // 2. Master Subjects + Section Staff Mapping (Priority source for all exams!)
        const masterCourses = buildCoursesFromMaster(currentProg, currentDept, y, validatedSem, sec, "All", providedSubjs, providedStaff);

        // 3. Fallback from compatible exam category if Master Subjects isn't configured yet
        const cohortSameCategoryCourseMatch = list.find(c =>
          c.programme === currentProg &&
          c.department === currentDept &&
          c.yearSemSec === targetYSS &&
          isSpecialOrLabExam(c.examName) === targetIsSpecial &&
          c.courseDetails && c.courseDetails.length > 0
        );

        const yearSemSameCategoryMatch = list.find(c =>
          c.programme === currentProg &&
          c.department === currentDept &&
          c.yearSemSec && c.yearSemSec.startsWith(`${y}/${validatedSem}/`) &&
          isSpecialOrLabExam(c.examName) === targetIsSpecial &&
          c.courseDetails && c.courseDetails.length > 0
        );

        if (exactExamYearSemMatch) {
          const isSameSection = exactExamYearSemMatch.yearSemSec === `${y}/${validatedSem}/${sec}`;
          const overlaid = overlayMasterCoursesAndStaff(
            exactExamYearSemMatch.courseDetails,
            currentProg,
            currentDept,
            y,
            validatedSem,
            sec,
            isSameSection,
            providedSubjs,
            providedStaff
          );
          setCourseDetails(overlaid);
          setCourseAutoLoadedFrom(
            masterCourses.length > 0
              ? `Master Subjects & Sec ${sec} Staff (${exactExamYearSemMatch.examName} subset)`
              : exactExamYearSemMatch.className
          );
        } else if (masterCourses.length > 0) {
          setCourseDetails(masterCourses);
          setCourseAutoLoadedFrom(`Master Subjects & Sec ${sec} Staff (${currentProg}-${currentDept} ${y}/${validatedSem})`);
        } else {
          const bestCourseMatch = cohortSameCategoryCourseMatch || yearSemSameCategoryMatch;
          if (bestCourseMatch) {
            const isSameSection = bestCourseMatch.yearSemSec === `${y}/${validatedSem}/${sec}`;
            const overlaid = overlayMasterCoursesAndStaff(
              bestCourseMatch.courseDetails,
              currentProg,
              currentDept,
              y,
              validatedSem,
              sec,
              isSameSection,
              providedSubjs,
              providedStaff
            );
            setCourseDetails(overlaid);
            setCourseAutoLoadedFrom(bestCourseMatch.className);
          } else if (cohortMatch && isSpecialOrLabExam(cohortMatch.examName) === targetIsSpecial && cohortMatch.subjects && cohortMatch.subjects.length > 0) {
            const rawCourses = cohortMatch.subjects.map(subStr => ({ courseCode: subStr, courseName: "", shortName: "", facultyName: "", credits: 3 }));
            const overlaid = overlayMasterCoursesAndStaff(rawCourses, currentProg, currentDept, y, validatedSem, sec, false, providedSubjs, providedStaff);
            setCourseDetails(overlaid);
            setCourseAutoLoadedFrom(cohortMatch.className);
          } else {
            setCourseDetails([]);
            setCourseAutoLoadedFrom("");
          }
        }

        const bestDateMatch = exactExamYearSemMatch || cohortSameCategoryCourseMatch || yearSemSameCategoryMatch || cohortMatch;
        
        const defaults = getDefaultMarks(exam);
        setFormData(prev => ({
          ...prev,
          year: y,
          semester: validatedSem,
          section: sec,
          examName: exam,
          programme: currentProg,
          department: currentDept,
          passMark: defaults.passMark,
          markPerSubject: defaults.markPerSubject,
          date: (bestDateMatch && bestDateMatch.date) ? bestDateMatch.date : prev.date,
          allowEditing: true,
          editingStartDate: "",
          editingEndDate: ""
        }));
      }
    }
  };

  const handleManualClassSelectLocal = (name, allClasses) => {
    if (!name) return;
    const list = allClasses || (classesRef && classesRef.current ? classesRef.current : classes);
    const cls = list.find(c => c.className === name);
    if (cls) {
      setFormData({
        year: (cls.yearSemSec || "II/IV/A").split('/')[0] || "II",
        semester: (cls.yearSemSec || "II/IV/A").split('/')[1] || "IV",
        section: (cls.yearSemSec || "II/IV/A").split('/')[2] || "A",
        passMark: String(cls.passMark),
        examName: cls.examName,
        markPerSubject: String(cls.markPerSubject),
        date: cls.date || new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
        department: cls.department || "CSE",
        programme: cls.programme || "B.E",
        allowEditing: cls.allowEditing !== undefined ? cls.allowEditing : true,
        editingStartDate: cls.editingStartDate || "",
        editingEndDate: cls.editingEndDate || "",
        editingStartTime: cls.editingStartTime || "",
        editingEndTime: cls.editingEndTime || "",
        eseGradingSystem: cls.eseGradingSystem || "System 2"
      });
      let loadedCourseDetails = [];
      if (cls.courseDetails && cls.courseDetails.length > 0) {
        loadedCourseDetails = cls.courseDetails.map(cd => {
          if (cd.courseCode && cd.courseCode.includes(' & ')) {
            const parts = cd.courseCode.split(' & ');
            return { 
              courseCode: parts[0].trim(), 
              courseName: cd.courseName || parts[1]?.trim() || "", 
              shortName: cd.shortName || "",
              facultyName: cd.facultyName || "",
              credits: cd.credits !== undefined ? cd.credits : 3
            };
          }
          return { 
            courseCode: cd.courseCode || "", 
            courseName: cd.courseName || "", 
            shortName: cd.shortName || "",
            facultyName: cd.facultyName || "",
            credits: cd.credits !== undefined ? cd.credits : 3
          };
        });
      } else {
        loadedCourseDetails = (cls.subjects || []).map(s => {
          if (s.includes(' & ')) {
            const parts = s.split(' & ');
            return { courseCode: parts[0].trim(), courseName: parts[1]?.trim() || "", shortName: "", facultyName: "" };
          }
          return { courseCode: s, courseName: "", shortName: "", facultyName: "" };
        });
      }
      setCourseDetails(loadedCourseDetails);
      setTargetPassPercentage(String(cls.targetPassPercentage || 85));
      setStudents(stripMarksFromStudents(cls.students || []));
      setSelectedClassId(cls.className);
      setShowCustomExamInput(false);
      setShowAllClassesDropdown(false);
      setAutoLoadedFrom("");
      setCourseAutoLoadedFrom(""); // Clear auto-load banners when explicitly selecting a saved configuration
    }
  };

  const loadUsers = async () => {
    try {
      const res = await API.get("/api/auth/users");
      setUsers(res.data);
      const printRes = await API.get("/api/auth/admin/print-access", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setPrintEditAccess(printRes.data.printEditAccess);
    } catch (err) { console.error(err); }
  };

  const loadActivities = async () => {
    try {
      const res = await API.get("/api/auth/activities");
      setActivities(res.data);
    } catch (err) { console.error(err); }
  };

  const handleManualClassSelect = (name) => {
    if (!name) {
      setSelectedClassId("");
      setShowCustomExamInput(false);
      setAutoLoadedFrom("");
      setCourseAutoLoadedFrom("");
      setStudents(prev => stripMarksFromStudents(prev));
      return;
    }
    handleManualClassSelectLocal(name, classes);
  };

  const handleManualRosterSelect = (cohortName) => {
    if (!cohortName) return;
    const r = rosters.find(x => x.cohortName === cohortName);
    if (r) {
      setFormData(prev => ({
        ...prev,
        year: r.year,
        semester: r.semester,
        section: r.section,
        department: r.department,
        programme: r.programme
      }));
      setStudents(r.students || []);
      setSelectedClassId(r.cohortName);
    }
  };

  const handleFileUpload = (e) => {
    if (!formData.year || !formData.semester || !formData.section) {
       alert("Please select Year, Semester, and Section FIRST before uploading student data.");
       e.target.value = null;
       return;
    }
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerRow = json[0] || [];
      const headerLower = headerRow.map(h => (h || "").toString().toLowerCase().trim());

      let regIdx = 0, nameIdx = 1, genderIdx = -1, typeIdx = -1, dobIdx = -1;
      headerLower.forEach((h, i) => {
        if (h.includes("reg") || h.includes("roll") || h.includes("register")) regIdx = i;
        if (h.includes("name") && !h.includes("course")) nameIdx = i;
        if (h.includes("gender") || h.includes("sex")) genderIdx = i;
        if (h.includes("type") || h.includes("scholar") || h.includes("hostell") || h.includes("day")) typeIdx = i;
        if (h.includes("dob") || h.includes("birth") || h.includes("date of birth") || h.includes("d.o.b")) dobIdx = i;
      });

      const newStudents = json.slice(1)
        .filter(r => r[regIdx] && r[nameIdx])
        .map(r => {
          let gender = "Boy";
          if (genderIdx >= 0 && r[genderIdx]) {
            const gVal = r[genderIdx].toString().toLowerCase().trim();
            if (gVal === "girl" || gVal === "female" || gVal === "f" || gVal === "g") gender = "Girl";
          }

          let studentType = "Day Scholar";
          if (typeIdx >= 0 && r[typeIdx]) {
            const tVal = r[typeIdx].toString().toLowerCase().trim();
            if (tVal.includes("hostell") || tVal === "h" || tVal === "hostler" || tVal === "hostel") studentType = "Hosteller";
          }

          let dob = "";
          if (dobIdx >= 0 && r[dobIdx]) {
            const rawDob = r[dobIdx];
            if (rawDob instanceof Date) {
              const y = rawDob.getFullYear();
              const m = String(rawDob.getMonth() + 1).padStart(2, '0');
              const d = String(rawDob.getDate()).padStart(2, '0');
              dob = `${y}-${m}-${d}`;
            } else if (typeof rawDob === 'number') {
              const dateObj = new Date((rawDob - 25569) * 86400 * 1000);
              const y = dateObj.getFullYear();
              const m = String(dateObj.getMonth() + 1).padStart(2, '0');
              const d = String(dateObj.getDate()).padStart(2, '0');
              dob = `${y}-${m}-${d}`;
            } else {
              const str = rawDob.toString().trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
                dob = str;
              } else if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
                const parts = str.split("-");
                dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
              } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
                const parts = str.split("/");
                dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
              } else {
                dob = str;
              }
            }
          }

          return {
            regNo: r[regIdx].toString(),
            name: r[nameIdx].toString(),
            dob,
            gender,
            studentType
          };
        });
      setStudents(newStudents);
      setAutoLoadedFrom("");
      alert(`${newStudents.length} Students Uploaded! Gender & Type auto-detected from Excel.`);
    };
    reader.readAsArrayBuffer(file);
  };

  const parseCourseExcelFile = (file, onParsed) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerRow = json[0] || [];
      const headerLower = headerRow.map(h => (h || "").toString().toLowerCase().trim());

      let codeIdx = -1, nameIdx = -1, shortIdx = -1, facultyIdx = -1, creditsIdx = -1, categoryIdx = -1;
      headerLower.forEach((h, i) => {
        const val = (h || "").toString().toLowerCase().trim();
        if (val.includes("code") || val.includes("subject code") || val.includes("course code")) codeIdx = i;
        if ((val.includes("name") || val.includes("title") || val.includes("subject name") || val.includes("course name")) && !val.includes("faculty") && !val.includes("short")) nameIdx = i;
        if (val.includes("short") || val.includes("acronym") || val.includes("abbreviation") || val.includes("alias")) shortIdx = i;
        if (val.includes("faculty") || val.includes("staff") || val.includes("teacher")) facultyIdx = i;
        if (val.includes("credit")) creditsIdx = i;
        if (val.includes("type") || val.includes("category")) categoryIdx = i;
      });

      if (codeIdx === -1) codeIdx = 0;
      if (nameIdx === -1) nameIdx = 1;

      const parsed = json.slice(1)
        .filter(r => r[codeIdx] || r[nameIdx])
        .map(r => {
          const rawCat = categoryIdx !== -1 ? String(r[categoryIdx] || "").trim().toLowerCase() : "";
          const rawName = String(r[nameIdx] || "").trim();
          const category = rawCat.includes("lab") || (!rawCat && /\blab\b|laboratory|practical/i.test(rawName))
            ? "Lab"
            : (rawCat.includes("other") || rawCat.includes("seminar") || rawCat.includes("project") ? "Other" : "Theory");
          const parsedCredits = creditsIdx !== -1 && !isNaN(Number(r[creditsIdx])) && r[creditsIdx] !== ""
            ? Number(r[creditsIdx])
            : 3;
          return {
            courseCode: String(r[codeIdx] || "").trim(),
            courseName: rawName,
            shortName: shortIdx !== -1 ? String(r[shortIdx] || "").trim() : "",
            facultyName: facultyIdx !== -1 ? String(r[facultyIdx] || "").trim() : "",
            credits: parsedCredits,
            category
          };
        });

      onParsed(parsed);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCourseFileUpload = (e) => {
    const file = e.target.files[0];
    parseCourseExcelFile(file, (newCourses) => {
      if (newCourses.length > 0) {
        const overlaid = overlayMasterCoursesAndStaff(
          newCourses,
          formData.programme,
          formData.department,
          formData.year,
          formData.semester,
          formData.section,
          true
        );
        setCourseDetails(overlaid);
        setCourseAutoLoadedFrom(""); // Manual upload clears the auto-load banner
        alert(`${newCourses.length} Courses Uploaded Successfully!`);
      } else {
        alert("No valid course data found. Ensure your Excel has columns like 'Course Code', 'Course Name', and 'Faculty Name'.");
      }
    });
    e.target.value = null;
  };

  const handleUploadMasterSubjectsExcel = (e) => {
    const file = e.target.files[0];
    parseCourseExcelFile(file, (newCourses) => {
      if (newCourses.length > 0) {
        setEditingMasterSubjects(newCourses.map(({ courseCode, courseName, shortName, credits, category }) => ({
          courseCode,
          courseName,
          shortName,
          credits,
          category
        })));
        alert(`${newCourses.length} Subject(s) loaded into Master editor! Click Save to publish.`);
      } else {
        alert("No valid subjects found. Ensure your Excel has 'Course Code' and 'Course Name' columns.");
      }
    });
    e.target.value = null;
  };

  const handleCurrFilterChange = (field, val) => {
    setCurrForm(prev => {
      const next = { ...prev, [field]: val };
      if (field === "year") {
        const validSems = getSemOptionsForYear(val);
        if (!validSems.includes(next.semester)) next.semester = validSems[0];
      }
      return next;
    });
  };

  const handleImportTimetableSubjects = async () => {
    setImportingFromTimetable(true);
    try {
      const semNum = ROMAN_TO_SEM_NUM[currForm.semester] || 5;
      const semesterType = ["I", "III", "V", "VII"].includes(currForm.semester) ? "Odd" : "Even";
      const [smRes, allocRes] = await Promise.all([
        API.get(`/api/timetable/subjects?department=${encodeURIComponent(currForm.department || "CSE")}&year=${encodeURIComponent(currForm.year)}&semester=${semNum}`).catch(() => ({ data: [] })),
        API.get(`/api/timetable/allocation?department=${encodeURIComponent(currForm.department || "CSE")}&semesterType=${semesterType}`).catch(() => ({ data: { allocations: [] } }))
      ]);

      const importedByCode = new Map();
      const mapCat = (typeStr = "", nameStr = "") => {
        const t = String(typeStr || "").toLowerCase();
        const n = String(nameStr || "").toLowerCase();
        if (t.includes("lab") || /\blab\b|laboratory|practical/.test(n)) return "Lab";
        if (t.includes("library") || t.includes("seminar") || t.includes("project") || t.includes("custom")) return "Other";
        return "Theory";
      };

      (smRes.data || []).forEach(doc => {
        (doc.subjects || []).forEach(s => {
          const code = String(s.code || "").trim();
          if (!code || importedByCode.has(code.toUpperCase())) return;
          importedByCode.set(code.toUpperCase(), {
            courseCode: code,
            courseName: String(s.name || "").trim(),
            shortName: String(s.shortName || "").trim(),
            credits: s.credits !== undefined ? Number(s.credits) : 3,
            category: mapCat(s.type, s.name)
          });
        });
      });

      if (importedByCode.size === 0) {
        (allocRes.data?.allocations || []).forEach(a => {
          if (String(a.year).toUpperCase() !== String(currForm.year).toUpperCase() || Number(a.semester) !== Number(semNum)) return;
          const code = String(a.subjectCode || "").trim();
          if (!code || importedByCode.has(code.toUpperCase())) return;
          importedByCode.set(code.toUpperCase(), {
            courseCode: code,
            courseName: String(a.subjectName || "").trim(),
            shortName: String(a.shortName || "").trim(),
            credits: 3,
            category: mapCat(a.type, a.subjectName)
          });
        });
      }

      if (importedByCode.size === 0) {
        alert(`No subjects found in Timetable for ${currForm.department} Year ${currForm.year} Sem ${currForm.semester}. You can add them manually or via Excel.`);
        return;
      }

      const importedList = Array.from(importedByCode.values());
      setEditingMasterSubjects(importedList);
      alert(`Imported ${importedList.length} subject(s) from Timetable! Review and click Save.`);
    } catch (err) {
      alert("Failed to import from Timetable: " + (err.response?.data?.error || err.message));
    } finally {
      setImportingFromTimetable(false);
    }
  };

  const handleSaveMasterSubjects = async () => {
    if (savingMasterSubjects) return;
    setSavingMasterSubjects(true);
    try {
      const cleaned = (editingMasterSubjects || [])
        .map(s => ({
          courseCode: String(s.courseCode || "").trim(),
          courseName: String(s.courseName || "").trim(),
          shortName: String(s.shortName || "").trim(),
          credits: s.credits !== undefined && s.credits !== "" ? Number(s.credits) : 3,
          category: ["Theory", "Lab", "Other"].includes(s.category) ? s.category : "Theory"
        }))
        .filter(s => s.courseCode || s.courseName);

      if (cleaned.length === 0) {
        alert("Please add at least 1 subject with Course Code and Name before saving.");
        return;
      }

      const res = await API.post("/api/curriculum/subjects", {
        programme: currForm.programme,
        department: currForm.department,
        year: currForm.year,
        semester: currForm.semester,
        subjects: cleaned,
        syncToExistingClasses: syncMasterSubjectsToExams
      });

      await loadClasses(false);
      if (formData.programme === currForm.programme && formData.department === currForm.department && formData.year === currForm.year && formData.semester === currForm.semester) {
        setCourseDetails(prev => overlayMasterCoursesAndStaff(prev, formData.programme, formData.department, formData.year, formData.semester, formData.section, true));
      }
      alert(res.data?.message || "Year/Sem subjects saved!");
    } catch (err) {
      alert("Failed to save subjects: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingMasterSubjects(false);
    }
  };

  const handleAutoFillStaffFromTimetable = async () => {
    setAutoFillingStaff(true);
    try {
      const semesterType = ["I", "III", "V", "VII"].includes(currForm.semester) ? "Odd" : "Even";
      const allocRes = await API.get(`/api/timetable/allocation?department=${encodeURIComponent(currForm.department || "CSE")}&semesterType=${semesterType}`);
      const allocs = allocRes.data?.allocations || [];
      if (allocs.length === 0) {
        alert("No Timetable Workload Allocations found for this department & semester.");
        return;
      }

      const nextMap = { ...editingStaffMap };
      let filledCount = 0;
      editingMasterSubjects.forEach(subj => {
        const codeUp = String(subj.courseCode || "").trim().toUpperCase();
        if (!codeUp) return;
        const matchedAlloc = allocs.find(a =>
          a.section === currForm.section &&
          String(a.year).toUpperCase() === String(currForm.year).toUpperCase() &&
          (
            String(a.subjectCode || "").trim().toUpperCase() === codeUp ||
            (subj.shortName && a.shortName && a.shortName.trim().toLowerCase() === subj.shortName.trim().toLowerCase()) ||
            (a.subjectName && subj.courseName && a.subjectName.trim().toLowerCase() === subj.courseName.trim().toLowerCase())
          )
        );
        if (matchedAlloc && Array.isArray(matchedAlloc.facultyNames) && matchedAlloc.facultyNames.length > 0) {
          const facStr = matchedAlloc.facultyNames.filter(f => f && f !== "-").join(", ");
          if (facStr) {
            nextMap[codeUp] = facStr;
            filledCount++;
          }
        }
      });

      setEditingStaffMap(nextMap);
      alert(filledCount > 0 ? `Auto-filled ${filledCount} staff assignment(s) from Timetable for Sec ${currForm.section}! Click Save to apply.` : `No matching Timetable allocations found for Year ${currForm.year} Sec ${currForm.section}.`);
    } catch (err) {
      alert("Failed to load Timetable allocations: " + (err.response?.data?.error || err.message));
    } finally {
      setAutoFillingStaff(false);
    }
  };

  const handleSaveSectionStaff = async () => {
    if (savingSectionStaff) return;
    setSavingSectionStaff(true);
    try {
      if (editingMasterSubjects.length === 0) {
        alert("No subjects found for this Year & Semester. Please save subjects in 'Subjects (Year & Sem)' first.");
        return;
      }

      const staffAssignments = editingMasterSubjects
        .filter(s => String(s.courseCode || "").trim())
        .map(s => {
          const code = String(s.courseCode || "").trim();
          return {
            courseCode: code,
            facultyName: String(editingStaffMap[code.toUpperCase()] || "").trim()
          };
        });

      const res = await API.post("/api/curriculum/staff-mappings", {
        programme: currForm.programme,
        department: currForm.department,
        year: currForm.year,
        semester: currForm.semester,
        section: currForm.section,
        staffAssignments,
        syncToExistingClasses: syncStaffToExams
      });

      await loadClasses(false);
      if (
        formData.programme === currForm.programme &&
        formData.department === currForm.department &&
        formData.year === currForm.year &&
        formData.semester === currForm.semester &&
        formData.section === currForm.section
      ) {
        setCourseDetails(prev => overlayMasterCoursesAndStaff(prev, formData.programme, formData.department, formData.year, formData.semester, formData.section, true));
      }
      alert(res.data?.message || `Section ${currForm.section} staff mapping saved!`);
    } catch (err) {
      alert("Failed to save section staff mapping: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingSectionStaff(false);
    }
  };

  const handlePullMasterIntoClassSetup = (categoryFilter = "All") => {
    const courses = buildCoursesFromMaster(formData.programme, formData.department, formData.year, formData.semester, formData.section, categoryFilter);
    if (courses.length === 0) {
      alert(`No saved Master Subjects (${categoryFilter}) found for ${formData.programme}-${formData.department} ${formData.year}/${formData.semester}. Please configure them in 'Roster, Subjects & Staff'.`);
      return;
    }
    setCourseDetails(courses);
    setCourseAutoLoadedFrom(`Master Subjects (${categoryFilter}) & Sec ${formData.section} Staff`);
  };

  const handleSyncOpenClassStaffAndNames = () => {
    if (courseDetails.length === 0) return;
    const synced = overlayMasterCoursesAndStaff(courseDetails, formData.programme, formData.department, formData.year, formData.semester, formData.section, true);
    setCourseDetails(synced);
    setCourseAutoLoadedFrom(`Synced Names & Sec ${formData.section} Staff from Master`);
  };

  const updateStudent = (index, field, val) => {
    const newS = [...students];
    newS[index][field] = val;
    setStudents(newS);
  };

  const updateCourseDetail = (index, field, val) => {
    const newC = [...courseDetails];
    newC[index][field] = val;
    setCourseDetails(newC);
  };

  // Resolve smart faculty assignments per target section:
  // Priority 1) Master Section Staff Mapping (CohortCourse collection)
  // Priority 2) Existing saved ClassData in same prog/dept/year/sem/sec
  // Priority 3) Timetable Workload Allocation matching (department, year, semesterType, section)
  // Priority 4) Optional fallback to source faculty (when fallbackToSource = true)
  const buildSectionFacultyMap = (targetSec, targetExam, allocs, prog, dept, yr, sem, fallbackToSource = true) => {
    const targetYSS = `${yr}/${sem}/${targetSec}`;
    const sectionStaffMap = buildMasterStaffMap(prog, dept, yr, sem, targetSec);
    const sectionClasses = (classesRef?.current || classes || []).filter(c =>
      c.yearSemSec === targetYSS &&
      (c.department || "CSE") === (dept || "CSE") &&
      (!prog || !c.programme || c.programme === prog) &&
      c.courseDetails && c.courseDetails.length > 0
    );
    const exactExamClass = sectionClasses.find(c => c.examName === targetExam);
    const anySectionClass = exactExamClass || sectionClasses[0];

    const facMap = {};
    courseDetails.forEach(cd => {
      const codeUp = String(cd.courseCode || "").trim().toUpperCase();
      let resolved = "";

      if (codeUp && sectionStaffMap.has(codeUp) && sectionStaffMap.get(codeUp)) {
        resolved = sectionStaffMap.get(codeUp);
      }

      if (!resolved && anySectionClass) {
        const peerCd = anySectionClass.courseDetails.find(pc =>
          (codeUp && String(pc.courseCode || "").trim().toUpperCase() === codeUp) ||
          (cd.courseName && pc.courseName && pc.courseName.trim().toLowerCase() === cd.courseName.trim().toLowerCase())
        );
        if (peerCd && peerCd.facultyName && peerCd.facultyName.trim()) {
          resolved = peerCd.facultyName.trim();
        }
      }

      if (!resolved && Array.isArray(allocs) && allocs.length > 0) {
        const matchedAlloc = allocs.find(a =>
          a.section === targetSec &&
          String(a.year).toUpperCase() === String(yr).toUpperCase() &&
          (
            (codeUp && String(a.subjectCode || "").trim().toUpperCase() === codeUp) ||
            (cd.shortName && a.shortName && a.shortName.trim().toLowerCase() === cd.shortName.trim().toLowerCase()) ||
            (a.subjectName && cd.courseName && a.subjectName.trim().toLowerCase() === cd.courseName.trim().toLowerCase())
          )
        );
        if (matchedAlloc && Array.isArray(matchedAlloc.facultyNames) && matchedAlloc.facultyNames.length > 0) {
          resolved = matchedAlloc.facultyNames.filter(f => f && f !== "-").join(", ");
        }
      }

      if (!resolved && fallbackToSource) {
        resolved = String(cd.facultyName || "").trim();
      }

      facMap[cd.courseCode] = resolved;
    });
    return facMap;
  };

  const handleSave = async () => {
    if (savingClass) return;
    setSavingClass(true);
    try {
      const trimmedExam = String(formData.examName || "").trim();
      const trimmedProg = String(formData.programme || "B.E").trim();
      const trimmedDept = String(formData.department || "CSE").trim();
      if (!trimmedExam) {
        alert("Please select or enter an Evaluation Type / Exam Name.");
        return;
      }

      const normalizedCourses = courseDetails.map(c => ({
        ...c,
        courseCode: String(c.courseCode || "").trim(),
        courseName: String(c.courseName || "").trim(),
        shortName: String(c.shortName || "").trim(),
        facultyName: String(c.facultyName || "").trim(),
        credits: c.credits !== undefined ? Number(c.credits) : 3
      }));

      const generatedName = buildClassName(formData.year, formData.semester, formData.section, trimmedExam, trimmedProg, trimmedDept);
      const payload = {
        className: generatedName,
        subjects: normalizedCourses.map(c => c.courseCode || ""),
        courseDetails: normalizedCourses,
        targetPassPercentage: Number(targetPassPercentage),
        passMark: Number(formData.passMark),
        examName: trimmedExam,
        markPerSubject: Number(formData.markPerSubject),
        students: stripMarksFromStudents(students),
        date: formData.date,
        department: trimmedDept,
        yearSemSec: `${formData.year}/${formData.semester}/${formData.section}`,
        programme: trimmedProg,
        allowEditing: formData.allowEditing,
        editingStartDate: formData.editingStartDate,
        editingEndDate: formData.editingEndDate,
        editingStartTime: formData.editingStartTime || "",
        editingEndTime: formData.editingEndTime || "",
        propagateRoster: propagateRoster,
        propagateToYearSem: propagateToYearSem,
        eseGradingSystem: formData.eseGradingSystem
      };
      await API.post("/api/classes", payload);
      setSelectedClassId(generatedName);
      setAutoLoadedFrom("");
      setCourseAutoLoadedFrom("");

      const extraSecs = alsoCreateSections.filter(s => s && s !== formData.section);
      let multiCloneSummary = "";

      if (extraSecs.length > 0) {
        let allocs = [];
        try {
          const semesterType = ["I", "III", "V", "VII"].includes(formData.semester) ? "Odd" : "Even";
          const allocRes = await API.get(`/api/timetable/allocation?department=${trimmedDept}&semesterType=${semesterType}`);
          allocs = allocRes.data?.allocations || [];
        } catch {
          allocs = [];
        }

        const cloneRes = await API.post("/api/classes/bulk-clone", {
          source: {
            programme: trimmedProg,
            department: trimmedDept,
            year: formData.year,
            semester: formData.semester,
            section: formData.section,
            examName: trimmedExam,
            passMark: Number(formData.passMark),
            markPerSubject: Number(formData.markPerSubject),
            courseDetails: normalizedCourses,
            students,
            targetPassPercentage,
            date: formData.date,
            eseGradingSystem: formData.eseGradingSystem
          },
          includeSourceCurrentExam: false,
          targetExamsForSource: [],
          targetSections: extraSecs.map(sec => ({
            section: sec,
            exams: [trimmedExam],
            facultyMap: buildSectionFacultyMap(sec, trimmedExam, allocs, trimmedProg, trimmedDept, formData.year, formData.semester, false),
            preserveExistingSectionFaculty: true
          }))
        });
        const details = (cloneRes.data?.results || [])
          .map(r => `Sec ${r.section}: ${r.action} (${r.studentCount} students)`)
          .join("\n• ");
        multiCloneSummary = `\n\nAlso created/updated ${trimmedExam} for ${extraSecs.length} more section(s):\n• ${details}`;
        setAlsoCreateSections([]);
      }

      await loadClasses(false);
      alert(`Class saved successfully!${multiCloneSummary}`);
    } catch (err) {
      alert("Failed to save: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingClass(false);
    }
  };

  // ── OPTION 1: BULK CLONE & GENERATE ACROSS SECTIONS & EXAMS ──
  const openBulkCloneModal = async () => {
    if (courseDetails.length === 0) {
      alert("Please add at least 1 course entry to this class before cloning.");
      return;
    }

    const curYear = formData.year;
    const curSem = formData.semester;
    const curSec = formData.section;
    const curDept = String(formData.department || "CSE").trim();
    const curProg = String(formData.programme || "B.E").trim();
    const curExam = String(formData.examName || "").trim();
    if (!curExam) {
      alert("Please select or enter an Evaluation Type / Exam Name first.");
      return;
    }

    const semesterType = ["I", "III", "V", "VII"].includes(curSem) ? "Odd" : "Even";
    setCloneIncludeSourceCurrentExam(true);
    setCloneTargetExamsForSource([]);

    const candidateSections = getSectionsForCohort(curYear, curSem, curDept, curProg).filter(s => s !== curSec);

    // Default target sections to whatever sections already have Master Roster (or ["B", "C"])
    const rosteredCandidates = candidateSections.filter(sec => getRosterCountForSection(curYear, curSem, sec, curDept, curProg) > 0);
    const defaultSections = rosteredCandidates.length > 0 ? rosteredCandidates : candidateSections.slice(0, 2);
    setCloneTargetSections(defaultSections);
    // Pre-select the active exam (e.g. SEMINAR, MKC, CIA - I, etc.) so user can clone it to other sections in 1 click!
    setCloneSectionExams([curExam]);
    setCloneCustomExamText("");

    // Fetch staff and semester-matched timetable allocations in parallel
    let loadedAllocs = [];
    try {
      const [staffRes, allocRes] = await Promise.all([
        API.get(`/api/timetable/staff?department=${curDept}`),
        API.get(`/api/timetable/allocation?department=${curDept}&semesterType=${semesterType}`)
      ]);
      setCloneStaffList(staffRes.data || []);
      loadedAllocs = allocRes.data?.allocations || [];
      setCloneTimetableAllocations(loadedAllocs);
    } catch (err) {
      console.warn("Could not load timetable staff/allocations:", err);
      loadedAllocs = [];
    }

    // Priority: Existing saved section faculty -> Timetable allocation -> Source faculty
    const initialFacultyMaps = {};
    candidateSections.forEach(sec => {
      initialFacultyMaps[sec] = buildSectionFacultyMap(sec, curExam, loadedAllocs, curProg, curDept, curYear, curSem, true);
    });
    setCloneFacultyMaps(initialFacultyMaps);

    setShowBulkCloneModal(true);
  };

  const handleAutoFillFromTimetable = () => {
    if (!cloneTimetableAllocations || cloneTimetableAllocations.length === 0) {
      alert("No timetable allocations found for this department & semester.");
      return;
    }
    const updated = { ...cloneFacultyMaps };
    let matchCount = 0;
    cloneTargetSections.forEach(sec => {
      if (!updated[sec]) updated[sec] = {};
      courseDetails.forEach(cd => {
        const matchedAlloc = cloneTimetableAllocations.find(a => 
          a.section === sec &&
          String(a.year).toUpperCase() === String(formData.year).toUpperCase() &&
          (a.subjectCode === cd.courseCode || a.shortName === cd.shortName || (a.subjectName && cd.courseName && a.subjectName.toLowerCase() === cd.courseName.toLowerCase()))
        );
        if (matchedAlloc && matchedAlloc.facultyNames && matchedAlloc.facultyNames.length > 0) {
          updated[sec][cd.courseCode] = matchedAlloc.facultyNames.filter(f => f && f !== "-").join(", ");
          matchCount++;
        }
      });
    });
    setCloneFacultyMaps(updated);
    alert(`⚡ Auto-filled ${matchCount} faculty assignment(s) from Timetable Allocator!`);
  };

  const handleCopySourceFacultyToAll = () => {
    const updated = { ...cloneFacultyMaps };
    cloneTargetSections.forEach(sec => {
      if (!updated[sec]) updated[sec] = {};
      courseDetails.forEach(cd => {
        updated[sec][cd.courseCode] = cd.facultyName || "";
      });
    });
    setCloneFacultyMaps(updated);
  };

  const handleClearAllFaculty = () => {
    const updated = { ...cloneFacultyMaps };
    cloneTargetSections.forEach(sec => {
      if (!updated[sec]) updated[sec] = {};
      courseDetails.forEach(cd => {
        updated[sec][cd.courseCode] = "";
      });
    });
    setCloneFacultyMaps(updated);
  };

  const handleExecuteBulkClone = async () => {
    const trimmedExam = String(formData.examName || "").trim();
    if (!trimmedExam) {
      alert("Please select or enter an Evaluation Type / Exam Name first.");
      return;
    }
    setCloneLoading(true);
    try {
      const payload = {
        source: {
          programme: String(formData.programme || "B.E").trim(),
          department: String(formData.department || "CSE").trim(),
          year: formData.year,
          semester: formData.semester,
          section: formData.section,
          examName: trimmedExam,
          passMark: Number(formData.passMark),
          markPerSubject: Number(formData.markPerSubject),
          courseDetails,
          students,
          targetPassPercentage: targetPassPercentage,
          date: formData.date,
          eseGradingSystem: formData.eseGradingSystem
        },
        includeSourceCurrentExam: cloneIncludeSourceCurrentExam,
        targetExamsForSource: cloneTargetExamsForSource,
        targetSections: cloneTargetSections.map(sec => ({
          section: sec,
          exams: cloneSectionExams,
          facultyMap: cloneFacultyMaps[sec] || {}
        }))
      };

      const res = await API.post("/api/classes/bulk-clone", payload);
      const breakdown = (res.data.results || [])
        .map(r => `${r.section} - ${r.examName}: ${r.action} (${r.studentCount} students)`)
        .join("\n• ");
      alert(`🎉 ${res.data.message || "Bulk clone completed successfully!"}${breakdown ? `\n\n• ${breakdown}` : ""}`);
      setShowBulkCloneModal(false);
      await loadClasses(false);
    } catch (err) {
      console.error(err);
      alert("Failed to clone classes: " + (err.response?.data?.error || err.message));
    } finally {
      setCloneLoading(false);
    }
  };

  const handleSaveRoster = async () => {
    if (savingRoster) return;
    setSavingRoster(true);
    try {
      const cohortName = `${formData.programme}-${formData.department} - ${formData.year}/${formData.semester}/${formData.section}`;
      const payload = {
        cohortName,
        students,
        department: formData.department,
        year: formData.year,
        semester: formData.semester,
        section: formData.section,
        programme: formData.programme
      };
      await API.post("/api/rosters", payload);
      alert("Roster saved successfully!");
      loadRosters();
      loadClasses();
    } catch (err) {
      alert("Failed to save roster: " + (err.response?.data?.error || err.message));
    } finally {
      setSavingRoster(false);
    }
  };  const handleDeleteSelectedRosters = async () => {
    if (selectedRostersForDelete.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedRostersForDelete.length} roster(s)?`)) return;

    try {
      for (const cohortName of selectedRostersForDelete) {
        await API.delete(`/api/rosters/${encodeURIComponent(cohortName)}`);
      }
      alert("Selected rosters deleted successfully.");
      setSelectedRostersForDelete([]);
      loadRosters();
    } catch (err) {
      alert("Failed to delete some rosters: " + err.message);
      loadRosters();
    }
  };

  const handlePromoteRoster = async () => {
    if (!promoteSourceCohort) return alert("Please select a source class to promote.");
    if (!promoteTargetYear || !promoteTargetSemester) return alert("Please select target year and semester.");
    
    if (!window.confirm(`Are you sure you want to promote ${promoteSourceCohort} to ${promoteTargetYear} Year, ${promoteTargetSemester} Semester?`)) return;

    setIsPromoting(true);
    try {
      await API.post("/api/rosters/promote", {
        sourceCohortName: promoteSourceCohort,
        targetYear: promoteTargetYear,
        targetSemester: promoteTargetSemester
      });
      alert("Class successfully promoted!");
      loadRosters();
      setPromoteSourceCohort("");
    } catch (err) {
      alert("Failed to promote class: " + (err.response?.data?.error || err.message));
    } finally {
      setIsPromoting(false);
    }
  };  const handleDeleteClass = async () => {
    if (!selectedClassId) return alert("Select a class to delete");
    if (!window.confirm("Are you sure?")) return;
    try {
      await API.delete(`/api/classes/${encodeURIComponent(selectedClassId)}`);
      alert("Deleted successfully");
      setSelectedClassId("");
      setFormData({ passMark: "25", examName: "CIA - I", markPerSubject: "50", date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), department: "CSE", year: "II", semester: "IV", section: "A", programme: "B.E", allowEditing: true, editingStartDate: "", editingEndDate: "", editingStartTime: "", editingEndTime: "" });
      setCourseDetails([]);
      setTargetPassPercentage("85");
      setStudents([]);
      loadClasses();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  const handleApproveUser = async (userId, approved, adminTabs = undefined, dashboardTabs = undefined) => {
    try {
      const payload = { approved };
      if (adminTabs !== undefined) payload.adminTabs = adminTabs;
      if (dashboardTabs !== undefined) payload.dashboardTabs = dashboardTabs;
      await API.post(`/api/auth/users/${userId}/approve`, payload, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      loadUsers();
      if (editingTabsUserId === userId) setEditingTabsUserId(null);
    } catch (err) { alert("Failed to update user"); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await API.delete(`/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      loadUsers();
    } catch (err) { alert("Failed to delete user"); }
  };

  const handleTogglePrintAccess = async () => {
    try {
      const newVal = !printEditAccess;
      await API.post("/api/auth/admin/print-access", { printEditAccess: newVal }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setPrintEditAccess(newVal);
      alert("Print user edit access updated.");
    } catch (err) { alert("Failed to update print user access"); }
  };

  const loadSecuritySettings = async () => {
    try {
      const res = await API.get("/api/auth/admin/get-security", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setSecurityForm({
        code: res.data.securityCode || "",
        question: res.data.securityQuestion || "",
        answer: res.data.securityAnswer || ""
      });
    } catch (err) {
      console.error("Failed to load security settings:", err);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    setSecurityMessage("");
    setSecurityLoading(true);
    try {
      await API.post("/api/auth/admin/set-security", {
        securityCode: securityForm.code,
        securityQuestion: securityForm.question,
        securityAnswer: securityForm.answer
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setSecurityMessage("Security settings updated successfully!");
    } catch (err) {
      setSecurityMessage("Failed to update security settings.");
    }
    setSecurityLoading(false);
  };

  const handleRevokeOthers = async () => {
    if (!window.confirm("Are you sure you want to log out all other active sessions? They will be immediately disconnected.")) return;
    try {
      const res = await API.post("/api/auth/admin/revoke-others", {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      sessionStorage.setItem("token", res.data.token);
      alert(res.data.message);
    } catch (err) {
      alert("Failed to revoke other sessions: " + (err.response?.data?.error || err.message));
    }
  };

  const loadLetterTemplate = async () => {
    try {
      const res = await API.get("/api/letter-template");
      if (res.data) {
        setLetterTemplate(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLetterTemplate = async (e) => {
    e.preventDefault();
    setLetterMessage("");
    setLetterLoading(true);
    try {
      await API.post("/api/letter-template", letterTemplate, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });
      setLetterMessage("Letter template saved successfully!");
    } catch (err) {
      setLetterMessage("Failed to save: " + (err.response?.data?.error || err.message));
    }
    setLetterLoading(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLetterTemplate(prev => ({ ...prev, headerLogo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddColumn = () => {
    const newCol = { id: Date.now().toString(), header: "New Column", type: "mark", examName: "" };
    setLetterTemplate(prev => ({ ...prev, columns: [...(prev.columns || []), newCol] }));
  };

  const handleRemoveColumn = (idx) => {
    setLetterTemplate(prev => {
      const cols = [...(prev.columns || [])];
      cols.splice(idx, 1);
      return { ...prev, columns: cols };
    });
  };

  const handleUpdateColumn = (idx, field, val) => {
    setLetterTemplate(prev => {
      const cols = [...(prev.columns || [])];
      cols[idx] = { ...cols[idx], [field]: val };
      return { ...prev, columns: cols };
    });
  };

  const openEseListEdit = (cls) => {
    setEseListEditClass(cls);
    setEseClearSubjectIdx(0);
    const attMap = {};
    const marksMap = {};
    if (cls.students) {
      cls.students.forEach(s => {
        attMap[s.regNo] = s.attendance || "";
        marksMap[s.regNo] = s.marks || [];
      });
    }
    setEseListAttendance(attMap);
    setEseListMarks(marksMap);
  };

  const syncEseEditedClassFromServer = (updatedCls) => {
    setEseListEditClass(updatedCls);
    const marksMap = {};
    (updatedCls.students || []).forEach(s => {
      marksMap[s.regNo] = s.marks || [];
    });
    setEseListMarks(marksMap);
    loadClasses();
  };

  const handleConfirmEseSubjectClear = async (subjectIndex, mode) => {
    if (!isStrictAdmin || !eseListEditClass) return;
    setEseIsClearing(true);
    try {
      const studentsMarksPayload = (eseListEditClass.students || []).map(s => ({
        regNo: s.regNo,
        name: s.name,
        marks: eseListMarks[s.regNo] || s.marks || []
      }));
      await API.post(`/api/classes/${encodeURIComponent(eseListEditClass.className)}/marks`, {
        students: studentsMarksPayload,
        isAdmin: true
      });

      const res = await API.post(
        `/api/classes/${encodeURIComponent(eseListEditClass.className)}/clear-subject-marks`,
        { subjectIndex, mode },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );

      syncEseEditedClassFromServer(res.data.classData);
      setEseLastClearBackup({
        className: eseListEditClass.className,
        subjectIndex,
        subjectCode: res.data.subjectCode,
        marksByRegNo: res.data.backupMarksByRegNo,
        count: res.data.clearedCount
      });
      setEseClearModalOpen(false);
      alert(`Cleared ${res.data.clearedCount} mark(s) for ${res.data.subjectCode}.`);
    } catch (err) {
      alert("Failed to clear subject marks: " + (err.response?.data?.error || err.message));
    } finally {
      setEseIsClearing(false);
    }
  };

  const handleUndoEseSubjectClear = async () => {
    if (!isStrictAdmin || !eseListEditClass || !eseLastClearBackup || eseLastClearBackup.className !== eseListEditClass.className) return;
    setEseIsClearing(true);
    try {
      const res = await API.post(
        `/api/classes/${encodeURIComponent(eseListEditClass.className)}/restore-subject-marks`,
        {
          subjectIndex: eseLastClearBackup.subjectIndex,
          marksByRegNo: eseLastClearBackup.marksByRegNo
        },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
      );

      syncEseEditedClassFromServer(res.data.classData);
      const restoredCode = eseLastClearBackup.subjectCode;
      setEseLastClearBackup(null);
      alert(`Restored ${res.data.restoredCount} mark(s) for ${restoredCode}.`);
    } catch (err) {
      alert("Failed to undo clear: " + (err.response?.data?.error || err.message));
    } finally {
      setEseIsClearing(false);
    }
  };

  const handleEseListSave = async () => {
    if (!eseListEditClass) return;
    setEseListSaving(true);
    try {
      // Prepare students array for marks payload
      const studentsMarksPayload = eseListEditClass.students.map(s => ({
        regNo: s.regNo,
        name: s.name,
        marks: eseListMarks[s.regNo] || []
      }));

      // 1. Save Marks
      await API.post(`/api/classes/${encodeURIComponent(eseListEditClass.className)}/marks`, {
        students: studentsMarksPayload
      });

      // 2. Save Attendance
      await API.post(`/api/classes/${encodeURIComponent(eseListEditClass.className)}/attendance`, {
        attendanceMap: eseListAttendance
      });

      alert("Changes saved successfully!");
      setEseListEditClass(null);
      loadClasses();
    } catch (err) {
      alert("Failed to save changes: " + (err.response?.data?.error || err.message));
    } finally {
      setEseListSaving(false);
    }
  };

  const handleEseListDelete = async (className) => {
    if (!window.confirm(`Are you sure you want to delete ${className}?`)) return;
    try {
      await API.delete(`/api/classes/${encodeURIComponent(className)}`);
      alert("Deleted successfully");
      if (eseListEditClass && eseListEditClass.className === className) {
        setEseListEditClass(null);
      }
      loadClasses();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const tabStyle = (tab) => ({
    padding: "10px 20px", cursor: "pointer", border: "none", fontSize: "14px", fontWeight: "600",
    borderRadius: "8px 8px 0 0", marginRight: "4px",
    background: activeTab === tab ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
    color: activeTab === tab ? "#818cf8" : "#9ca3af",
    borderBottom: activeTab === tab ? "2px solid #818cf8" : "2px solid transparent"
  });
  const tabsRef = useRef(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e) => {
    isDown.current = true;
    if (tabsRef.current) {
      tabsRef.current.style.cursor = "grabbing";
      startX.current = e.pageX - tabsRef.current.offsetLeft;
      scrollLeft.current = tabsRef.current.scrollLeft;
    }
  };
  const handleMouseLeave = () => {
    isDown.current = false;
    if (tabsRef.current) tabsRef.current.style.cursor = "grab";
  };
  const handleMouseUp = () => {
    isDown.current = false;
    if (tabsRef.current) tabsRef.current.style.cursor = "grab";
  };
  const handleMouseMove = (e) => {
    if (!isDown.current || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - tabsRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    tabsRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const generateReportData = () => {
    if (!reportExamModel) return [];
    
    let reportRows = [];
    let sno = 1;
    
    classes.forEach(cls => {
      if (cls.examName === reportExamModel && !cls.isDeleted) {
        // Evaluate Year
        let yearMatch = false;
        if (reportYears.includes("All")) {
          yearMatch = true;
        } else if (cls.yearSemSec) {
          yearMatch = reportYears.some(y => cls.yearSemSec.startsWith(`${y}/`));
        }

        // Evaluate Section
        let secMatch = false;
        if (reportSections.includes("All")) {
          secMatch = true;
        } else if (cls.yearSemSec) {
          secMatch = reportSections.some(s => cls.yearSemSec.endsWith(`/${s}`));
        }

        if (yearMatch && secMatch) {
        (cls.courseDetails || []).forEach((cd, j) => {
          let enteredCount = 0;
          let totalCount = cls.students ? cls.students.length : 0;
          
          if (cls.students) {
            cls.students.forEach(s => {
              if (s.marks && s.marks[j] !== undefined && s.marks[j] !== null && s.marks[j] !== "") {
                enteredCount++;
              }
            });
          }
          
          let pendingCount = totalCount - enteredCount;
          reportRows.push({
            sno: sno++,
            facultyName: cd.facultyName || "Not Assigned",
            courseCode: cd.courseCode || "-",
            courseName: cd.courseName || "-",
            className: cls.className,
            subjectIndex: j,
            totalStudents: totalCount,
            enteredMarks: enteredCount,
            pendingMarks: pendingCount,
            status: pendingCount > 0 ? "Pending" : "Completed"
          });
        });
        }
      }
    });
    
    return reportRows;
  };

  const handleExportReportExcel = () => {
    const data = generateReportData();
    if (data.length === 0) {
      alert("No data available for the selected Exam Model.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      "S.No": r.sno,
      "Faculty Name": r.facultyName,
      "Class & Section": r.className.split(" - ")[1] || r.className,
      "Course Code": r.courseCode,
      "Course Name": r.courseName,
      "Total Students": r.totalStudents,
      "Entered": r.enteredMarks,
      "Pending": r.pendingMarks,
      "Status": r.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mark Entry Report");
    XLSX.writeFile(wb, `Mark_Entry_Report_${reportExamModel}.xlsx`);
  };

  const reportData = activeTab === "reports" ? generateReportData() : [];

  const handlePendingClick = (row) => {
    const cls = classes.find(c => c.className === row.className);
    if (!cls) return;
    const pendingStudents = cls.students.filter(s => s.marks[row.subjectIndex] === undefined || s.marks[row.subjectIndex] === null || s.marks[row.subjectIndex] === "");
    setSelectedPendingData({
      ...row,
      pendingStudents
    });
    setSelectedPendingStudents([]);
  };

  const handlePendingStudentCheckboxChange = (regNo) => {
    setSelectedPendingStudents(prev => 
      prev.includes(regNo) ? prev.filter(id => id !== regNo) : [...prev, regNo]
    );
  };

  const handlePendingStudentSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPendingStudents(selectedPendingData.pendingStudents.map(s => s.regNo));
    } else {
      setSelectedPendingStudents([]);
    }
  };

  const handleMarkSelectedPendingAsAB = async () => {
    if (!selectedPendingData || selectedPendingStudents.length === 0) return;
    setPendingModalLoading(true);
    try {
      const cls = classes.find(c => c.className === selectedPendingData.className);
      if (!cls) throw new Error("Class not found");

      const updatedStudents = JSON.parse(JSON.stringify(cls.students));
      
      updatedStudents.forEach(s => {
        if (selectedPendingStudents.includes(s.regNo)) {
          if (s.marks[selectedPendingData.subjectIndex] === undefined || s.marks[selectedPendingData.subjectIndex] === null || s.marks[selectedPendingData.subjectIndex] === "") {
            s.marks[selectedPendingData.subjectIndex] = "AB";
          }
        }
      });

      await API.post(`/api/classes/${encodeURIComponent(cls.className)}/marks`, { students: updatedStudents }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      });

      alert("Successfully marked selected pending students as AB.");
      setSelectedPendingData(null);
      setSelectedPendingStudents([]);
      loadClasses();
    } catch (err) {
      alert("Failed to update marks: " + (err.response?.data?.error || err.message));
    } finally {
      setPendingModalLoading(false);
    }
  };

  return (
    <>
    <style>{`
      .admin-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 2rem;
        border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        padding-bottom: 1px;
        overflow-x: auto;
        white-space: nowrap;
        -webkit-overflow-scrolling: touch;
      }
      .admin-tabs::-webkit-scrollbar {
        height: 6px;
      }
      .admin-tabs::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.2);
        border-radius: 3px;
      }
      .admin-grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
      }
      .admin-grid-2col > div {
        min-width: 0;
      }
      .admin-grid-3col {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1.5rem;
      }
      .admin-grid-3col > div {
        min-width: 0;
      }
      .admin-grid-4col {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 1rem;
      }
      .admin-grid-4col > div {
        min-width: 0;
      }
      .input-row-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .input-row-3col {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1rem;
      }
      
      @media (max-width: 768px) {
        .admin-grid-2col {
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        .admin-grid-3col {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .admin-grid-4col {
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .input-row-2col {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        .input-row-3col {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        /* Mobile Admin Panel Layout */
        .admin-panel-container {
          padding: 0 !important;
        }
        .admin-panel-container h1 {
          font-size: 1.3rem !important;
        }
        .admin-panel-container p {
          font-size: 0.8rem !important;
        }
        .admin-tabs {
          gap: 0.35rem !important;
          padding: 0.5rem 0.5rem 0 !important;
          margin-bottom: 1rem !important;
        }
        .admin-tabs .btn {
          padding: 0.5rem 0.8rem !important;
          font-size: 0.72rem !important;
          white-space: nowrap;
          border-radius: 8px 8px 0 0 !important;
          flex-shrink: 0;
        }
        .glass-card {
          padding: 1rem !important;
          border-radius: 10px !important;
        }
        .admin-table {
          font-size: 0.75rem !important;
        }
        .admin-table th, .admin-table td {
          padding: 0.5rem 0.4rem !important;
        }
        .header-flex {
          flex-direction: column;
          gap: 0.75rem;
          align-items: flex-start !important;
        }
        .header-flex button {
          width: 100%;
          justify-content: center;
        }
        .input-label {
          font-size: 0.8rem !important;
        }
        .text-input, select {
          font-size: 0.85rem !important;
        }
        .btn {
          font-size: 0.8rem !important;
        }
        .status-badge {
          font-size: 0.68rem !important;
          padding: 3px 6px !important;
        }
        /* Module allocation popup mobile fix */
        div[style*="position: absolute"] {
          position: fixed !important;
          right: 1rem !important;
          left: 1rem !important;
          min-width: unset !important;
          max-height: 80vh;
          overflow-y: auto;
        }
        .table-container {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
      }
      @media (max-width: 480px) {
        .admin-grid-4col {
          grid-template-columns: 1fr;
        }
      }
    `}</style>

    <div className="page-layout fade-in admin-panel-container">
      <div className="header-flex no-print" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1>Admin Control Center</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Configure student groups, manage user permissions, and track system logs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="admin-tabs no-print" 
        ref={tabsRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{ cursor: "grab" }}
      >
        {hasAccessTo("classes") && (
        <button 
          className={`btn ${activeTab === "classes" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("classes")}
        >
          📚 Class Setup
        </button>
        )}
        {hasAccessTo("roster") && (
        <button 
          className={`btn ${activeTab === "roster" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("roster")}
        >
          👥 Roster Upload
        </button>
        )}
        {hasAccessTo("access") && (
        <button 
          className={`btn ${activeTab === "access" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("access")}
        >
          🔑 Mark Entry Access
        </button>
        )}
        {hasAccessTo("reports") && (
        <button 
          className={`btn ${activeTab === "reports" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("reports")}
        >
          📊 Mark Entry Reports
        </button>
        )}
        {hasAccessTo("users") && (
        <button 
          className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("users")}
        >
          👥 User Access
        </button>
        )}
        {hasAccessTo("activity") && (
        <button 
          className={`btn ${activeTab === "activity" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("activity")}
        >
          📊 Activity Logs
        </button>
        )}
        {hasAccessTo("recycle") && (
        <button 
          className={`btn ${activeTab === "recycle" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("recycle")}
        >
          🗑️ Recycle Bin
        </button>
        )}

        {hasAccessTo("eseList") && (
        <button 
          className={`btn ${activeTab === "eseList" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("eseList")}
        >
          📋 Uploaded Classes
        </button>
        )}
        {hasAccessTo("approvals") && (
        <button 
          className={`btn ${activeTab === "approvals" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("approvals")}
        >
          ✅ Result Approvals
        </button>
        )}
        {hasAccessTo("extensions") && (
        <button 
          className={`btn ${activeTab === "extensions" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("extensions")}
        >
          ⏱️ Extension Requests
        </button>
        )}
        {hasAccessTo("advisors") && (
        <button 
          className={`btn ${activeTab === "advisors" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("advisors")}
        >
          🎓 Class Advisors
        </button>
        )}
        {hasAccessTo("announcements") && (
        <button 
          className={`btn ${activeTab === "announcements" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("announcements")}
        >
          📢 Announcements
        </button>
        )}
        {hasAccessTo("security") && (
        <button 
          className={`btn ${activeTab === "security" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("security")}
        >
          🔒 Security
        </button>
        )}
        {hasAccessTo("lettertemplate") && (
        <button 
          className={`btn ${activeTab === "lettertemplate" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("lettertemplate")}
        >
          📝 Letter Template
        </button>
        )}
        {hasAccessTo("reportsettings") && (
        <button 
          className={`btn ${activeTab === "reportsettings" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("reportsettings")}
        >
          ⚙️ Report Settings
        </button>
        )}
        {hasAccessTo("seating") && (
        <button 
          className={`btn ${activeTab === "seating" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("seating")}
        >
          🪑 Seating
        </button>
        )}
        {hasAccessTo("attendance-tracker") && (
        <button 
          className={`btn ${activeTab === "attendance-tracker" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("attendance-tracker")}
        >
          📅 Attendance Tracker
        </button>
        )}
        {hasAccessTo("internal-marks") && (
        <button 
          className={`btn ${activeTab === "internal-marks" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("internal-marks")}
        >
          📊 Internal Mark Templates
        </button>
        )}
        {hasAccessTo("timetable") && (
        <button 
          className={`btn ${activeTab === "timetable" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("timetable")}
        >
          🗓️ Time Table
        </button>
        )}
      </div>

      <datalist id="master-staff-datalist">
        {masterStaffOptions.map((st, idx) => (
          <option key={st._id || idx} value={st.name} />
        ))}
      </datalist>

      {/* CLASS SETUP TAB */}
      {activeTab === "classes" && (
        <div className="admin-grid-2col">
          <div className="glass-card" style={{ padding: "2rem" }}>
            
            {/* ── QUICK LOAD CONFIGURATION ── */}
            <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border-color)" }}>
              <label className="input-label" style={{ fontWeight: "600" }}>Quick Load Saved Configuration</label>
              <select
                className="select-input"
                value={selectedClassId}
                onChange={e => handleManualClassSelect(e.target.value)}
              >
                <option value="">-- Start Fresh or Choose Class --</option>
                {classes.map(c => (
                  <option key={c.className} value={c.className}>{c.className}</option>
                ))}
              </select>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", marginBottom: 0 }}>
                Total {classes.length} class(es) saved in system.
              </p>
            </div>

            <h3 style={{ marginBottom: "1.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>Group Configuration</h3>
            
            <div className="input-row-3col" style={{ marginBottom: "1.5rem" }}>
              <div className="input-group">
                <label className="input-label">Year</label>
                <select value={formData.year} onChange={e => checkAndLoadExistingLocal(e.target.value, formData.semester, formData.section, formData.examName, classes)} className="select-input">
                  {["I","II","III","IV"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Semester</label>
                <select value={formData.semester} onChange={e => checkAndLoadExistingLocal(formData.year, e.target.value, formData.section, formData.examName, classes)} className="select-input">
                  {getSemOptionsForYear(formData.year).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Section</label>
                <select value={formData.section} onChange={e => {
                  const nextSec = e.target.value;
                  setAlsoCreateSections(prev => prev.filter(x => x !== nextSec));
                  checkAndLoadExistingLocal(formData.year, formData.semester, nextSec, formData.examName, classes);
                }} className="select-input">
                  {getSectionsForCohort(formData.year, formData.semester, formData.department, formData.programme).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="input-row-2col" style={{ marginBottom: "1.5rem" }}>
              <div className="input-group">
                <label className="input-label">Programme</label>
                <input value={formData.programme} onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, programme: val }));
                  checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, formData.examName, classes, val, formData.department);
                }} placeholder="e.g. B.E" className="text-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Department</label>
                <input list="dept-options" value={formData.department} onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, department: val }));
                  checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, formData.examName, classes, formData.programme, val);
                }} placeholder="e.g. CSE" className="text-input" />
                <datalist id="dept-options">
                  <option value="CSE" />
                  <option value="AIDS" />
                  <option value="AIML" />
                  <option value="ECE" />
                  <option value="EEE" />
                  <option value="MECH" />
                  <option value="CIVIL" />
                  <option value="IT" />
                  <option value="CSBS" />
                  <option value="BME" />
                  <option value="MCT" />
                  <option value="CYS" />
                </datalist>
              </div>
            </div>

            {selectedClassId && (
              <div style={{ shadow: "var(--shadow-sm)", marginBottom: "1.5rem", padding: "1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "12px", border: "1px solid var(--success)" }}>
                <p style={{ color: "var(--success)", fontWeight: "600", fontSize: "0.85rem", margin: "0" }}>⚡ ACTIVE CONFIGURATION: <strong>{selectedClassId}</strong></p>
                <button className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem", marginTop: "0.5rem" }} onClick={handleDeleteClass}>Delete Configuration</button>
              </div>
            )}

            <h3 style={{ margin: "2rem 0 1.5rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>Exam Parameters</h3>
            <div className="input-group">
              <label className="input-label">Evaluation Type / Exam Name</label>
              {!showCustomExamInput ? (
                <div style={{ display: "flex", gap: "10px" }}>
                  <select 
                    value={formData.examName} 
                    onChange={e => {
                      if (e.target.value === "CREATE_CUSTOM") {
                        setShowCustomExamInput(true);
                        setSelectedClassId("");
                        setAutoLoadedFrom("");
                        setCourseAutoLoadedFrom("");
                        setStudents(prev => stripMarksFromStudents(prev));
                        setFormData({ ...formData, examName: "" });
                      } else {
                        checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, e.target.value, classes);
                      }
                    }} 
                    className="select-input"
                    style={{ flex: 1 }}
                  >
                    {dynamicExamNameOptions.map(opt => (
                      <option key={opt} value={opt}>{opt === "ESE" ? "End Semester Examination" : opt}</option>
                    ))}
                    <option value="CREATE_CUSTOM" style={{ fontWeight: "bold", background: "#f0fdf4", color: "#166534" }}>+ Create Custom Exam...</option>
                  </select>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      type="text"
                      value={formData.examName}
                      onChange={e => {
                        setSelectedClassId("");
                        setStudents(prev => stripMarksFromStudents(prev));
                        setFormData({ ...formData, examName: e.target.value });
                      }}
                      className="text-input"
                      placeholder="Enter Custom Exam Name (e.g. Seminar 1)"
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setShowCustomExamInput(false)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Back to List
                    </button>
                  </div>
                  {(() => {
                    const trimmed = String(formData.examName || "").trim();
                    if (!trimmed) return null;
                    const candidate = buildClassName(formData.year, formData.semester, formData.section, trimmed, formData.programme, formData.department);
                    const matchCls = classes.find(c => c.className.toLowerCase() === candidate.toLowerCase());
                    if (!matchCls) return null;
                    return (
                      <div style={{ marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid #f59e0b", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", fontSize: "0.78rem", color: "#b45309" }}>
                        <span>⚠️ <strong>"{matchCls.className}"</strong> already exists! Saving will overwrite its courses.</span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "3px 8px", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                          onClick={() => handleManualClassSelect(matchCls.className)}
                        >
                          Load Existing
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {formData.examName === "ESE" && (
              <div className="input-group" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                <label className="input-label" style={{ color: "#f59e0b" }}>ESE Grading System (Important!)</label>
                <select value={formData.eseGradingSystem} onChange={e => setFormData({ ...formData, eseGradingSystem: e.target.value })} className="select-input" style={{ border: "1px solid #f59e0b" }}>
                  <option value="System 1">System 1 (S:10, A+:9, A:8, B+:7, B:6.5, C+:6, C:5, U:0, U*:0)</option>
                  <option value="System 2">System 2 (O:10, A+:9, A:8, B+:7, B:6, C:5, U:0, U*:0)</option>
                </select>
              </div>
            )}
            
            <div className="input-row-2col">
              <div className="input-group">
                <label className="input-label">Target Pass Rate (%)</label>
                <input type="number" value={targetPassPercentage} onChange={e => setTargetPassPercentage(e.target.value)} className="text-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Report Date</label>
                <input value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="text-input" />
              </div>
            </div>

            <div className="input-row-2col">
              <div className="input-group">
                <label className="input-label">Standard Pass Mark</label>
                <input type="number" value={formData.passMark} onChange={e => setFormData({ ...formData, passMark: e.target.value })} className="text-input" />
              </div>
              <div className="input-group">
                <label className="input-label">Maximum Mark / Subj.</label>
                <input type="number" value={formData.markPerSubject} onChange={e => setFormData({ ...formData, markPerSubject: e.target.value })} className="text-input" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", margin: "2rem 0 1rem" }}>
              <h3 style={{ margin: 0 }}>Course Details</h3>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.42rem 0.7rem", fontSize: "0.78rem" }}
                  onClick={() => handlePullMasterIntoClassSetup("All")}
                  title="Load all courses & Sec staff from Master Subjects & Staff Setup"
                >
                  📚 All Master
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.42rem 0.7rem", fontSize: "0.78rem" }}
                  onClick={() => handlePullMasterIntoClassSetup("Theory")}
                  title="Load only Theory subjects & Sec staff from Master Setup"
                >
                  Theory Only
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.42rem 0.7rem", fontSize: "0.78rem" }}
                  onClick={() => handlePullMasterIntoClassSetup("Lab")}
                  title="Load only Lab subjects & Sec staff from Master Setup"
                >
                  Lab Only
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.42rem 0.7rem", fontSize: "0.78rem" }}
                  onClick={handleSyncOpenClassStaffAndNames}
                  title="Keep current subject list and update Staff Names & Subject metadata from Master Setup"
                >
                  🔄 Sync Staff
                </button>
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <button type="button" className="btn btn-primary" style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem" }}>📂 Upload Course Data</button>
                  <input type="file" onChange={handleCourseFileUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </div>
              </div>
            </div>

            {courseAutoLoadedFrom && (
              <div style={{
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid var(--primary)",
                borderRadius: "12px",
                padding: "0.85rem 1rem",
                marginBottom: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                animation: "fadeIn 0.3s ease"
              }}>
                <span style={{ fontWeight: "600", color: "var(--primary)", fontSize: "0.85rem" }}>
                  📚 Course Details Loaded Automatically
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Imported {courseDetails.length} course(s) from <strong>"{courseAutoLoadedFrom}"</strong>. Save to approve and publish to Mark Entry.
                </span>
              </div>
            )}
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "150px" }}>Code</th>
                    <th style={{ minWidth: "250px" }}>Full Course Title</th>
                    <th style={{ minWidth: "120px" }}>Short Form</th>
                    <th style={{ minWidth: "180px" }}>Assign Faculty</th>
                    {formData.examName === "ESE" && <th style={{ minWidth: "80px" }}>Credits</th>}
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {courseDetails.map((c, i) => (
                    <tr key={i}>
                      <td><input value={c.courseCode} onChange={e => updateCourseDetail(i, 'courseCode', e.target.value)} className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} /></td>
                      <td><input value={c.courseName} onChange={e => updateCourseDetail(i, 'courseName', e.target.value)} className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} /></td>
                      <td><input value={c.shortName || ""} onChange={e => updateCourseDetail(i, 'shortName', e.target.value)} placeholder="e.g. OS, DM" className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} /></td>
                      <td><input list="master-staff-datalist" value={c.facultyName} onChange={e => updateCourseDetail(i, 'facultyName', e.target.value)} className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} /></td>
                      {formData.examName === "ESE" && (
                        <td><input type="number" min="0" step="0.5" value={c.credits !== undefined ? c.credits : 3} onChange={e => updateCourseDetail(i, 'credits', Number(e.target.value))} className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} /></td>
                      )}
                      <td><button className="btn-icon" onClick={() => setCourseDetails(courseDetails.filter((_, idx) => idx !== i))}>❌</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-secondary mt-2" style={{ width: "100%", marginTop: "1rem" }} onClick={() => setCourseDetails([...courseDetails, { courseCode: "", courseName: "", shortName: "", facultyName: "", credits: 3 }])}>➕ Add Course Entry</button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
              <input 
                type="checkbox" 
                id="propagateRoster" 
                checked={propagateRoster} 
                onChange={e => setPropagateRoster(e.target.checked)} 
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="propagateRoster" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-muted)", userSelect: "none" }}>
                Apply this student roster only to all other exams of this section (keeps each exam&apos;s own subjects &amp; marks)
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input 
                type="checkbox" 
                id="propagateToYearSem" 
                checked={propagateToYearSem} 
                onChange={e => setPropagateToYearSem(e.target.checked)} 
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label htmlFor="propagateToYearSem" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-muted)", userSelect: "none" }}>
                Auto-sync Course Details &amp; Report Date to all other sections in this Year &amp; Sem
              </label>
            </div>
            <div style={{ marginTop: "1.25rem", padding: "1rem", borderRadius: "12px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "0.65rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)" }}>
                  📑 Also Create / Update "{formData.examName || "Exam"}" for Other Sections:
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                    onClick={() => {
                      const others = getSectionsForCohort(formData.year, formData.semester, formData.department, formData.programme)
                        .filter(sec => sec !== formData.section);
                      setAlsoCreateSections(others);
                    }}
                  >
                    Select All
                  </button>
                  {alsoCreateSections.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "2px 8px", fontSize: "0.72rem" }}
                      onClick={() => setAlsoCreateSections([])}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {getSectionsForCohort(formData.year, formData.semester, formData.department, formData.programme).map(sec => {
                  const isCurrent = sec === formData.section;
                  const exists = classes.some(c =>
                    c.yearSemSec === `${formData.year}/${formData.semester}/${sec}` &&
                    (c.examName || "").trim().toLowerCase() === (formData.examName || "").trim().toLowerCase() &&
                    (c.department || "CSE") === (formData.department || "CSE") &&
                    (!formData.programme || !c.programme || c.programme === formData.programme)
                  );
                  const rCount = getRosterCountForSection(formData.year, formData.semester, sec, formData.department, formData.programme);
                  const isChecked = isCurrent || alsoCreateSections.includes(sec);

                  return (
                    <label
                      key={sec}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 11px",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: isCurrent ? "default" : "pointer",
                        userSelect: "none",
                        background: isCurrent
                          ? "rgba(99, 102, 241, 0.16)"
                          : (isChecked ? "rgba(16, 185, 129, 0.14)" : "rgba(255, 255, 255, 0.03)"),
                        border: `1px solid ${isCurrent ? "var(--primary)" : (isChecked ? "var(--success)" : "var(--border-color)")}`,
                        color: "var(--text-primary)"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isCurrent}
                        onChange={e => {
                          if (isCurrent) return;
                          setAlsoCreateSections(prev =>
                            e.target.checked ? [...prev, sec].sort() : prev.filter(x => x !== sec)
                          );
                        }}
                      />
                      <span>Sec {sec}</span>
                      <span style={{ fontSize: "0.7rem", color: exists ? "var(--success)" : "var(--text-muted)" }}>
                        {isCurrent ? "• Active" : (exists ? `✓ Saved (${rCount})` : `(${rCount > 0 ? `${rCount} st` : "No roster"})`)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", margin: "0.55rem 0 0 0" }}>
                Automatically pulls each selected section's own Master Roster and preserves existing/Timetable faculty when saved.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "1rem", flexWrap: "wrap" }}>
              <button 
                className="btn btn-primary" 
                style={{
                  flex: 1,
                  minWidth: "220px",
                  padding: "0.9rem 1.25rem",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  opacity: savingClass || cloneLoading ? 0.7 : 1,
                  cursor: savingClass || cloneLoading ? "not-allowed" : "pointer"
                }} 
                onClick={handleSave}
                disabled={savingClass || cloneLoading}
              >
                {savingClass
                  ? "⏳ Saving Class Setup..."
                  : alsoCreateSections.length > 0
                    ? `🚀 Save Class Setup (Sec ${formData.section} + ${alsoCreateSections.join(", ")})`
                    : "🚀 Save Class Setup"}
              </button>
              <button 
                type="button"
                className="btn" 
                style={{ 
                  padding: "0.9rem 1.25rem", 
                  fontSize: "0.95rem", 
                  fontWeight: "700",
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: savingClass || cloneLoading ? "not-allowed" : "pointer",
                  opacity: savingClass || cloneLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 15px rgba(124, 58, 237, 0.35)",
                  transition: "all 0.2s ease"
                }} 
                onClick={openBulkCloneModal}
                disabled={savingClass || cloneLoading}
                title="Replicate this setup across any Exams (SEMINAR, MKC, CIA, ESE, etc.) and other Sections with custom faculty mapping"
              >
                ⚡ Bulk Clone to Other Sections &amp; Exams
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0 }}>Enrollment Roster View</h3>
            </div>

            {autoLoadedFrom && (
              <div style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid var(--success)",
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
                animation: "fadeIn 0.3s ease"
              }}>
                <span style={{ fontWeight: "600", color: "var(--success)", fontSize: "0.85rem" }}>
                  💡 Roster Loaded Automatically
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Imported {students.length} students from the roster of <strong>"{autoLoadedFrom}"</strong>. Save this configuration to approve and publish to Mark Entry.
                </span>
              </div>
            )}
            
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "1.5rem", background: "var(--bg-main)", padding: "1rem", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
               Roster Synchronization: Reg No, Name, Gender, and Cohort Type are auto-detected from bulk imports.
            </p>

            <div className="table-container" style={{ maxHeight: "700px" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Identifier (Roll/Reg No)</th>
                    <th>Candidate Name</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                    <th>Cohort</th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td><input value={s.regNo || ""} onChange={e => updateStudent(i, 'regNo', e.target.value)} className="text-input" style={{ padding: "0.4rem" }} /></td>
                      <td><input value={s.name || ""} onChange={e => updateStudent(i, 'name', e.target.value)} className="text-input" style={{ padding: "0.4rem" }} /></td>
                      <td><input type="date" value={s.dob || ""} onChange={e => updateStudent(i, 'dob', e.target.value)} className="text-input" style={{ padding: "0.4rem", width: "140px" }} /></td>
                      <td>
                        <select value={s.gender || "Boy"} onChange={e => updateStudent(i, 'gender', e.target.value)} className="select-input" style={{ padding: "0.4rem" }}>
                          <option value="Boy">Male</option>
                          <option value="Girl">Female</option>
                        </select>
                      </td>
                      <td>
                        <select value={s.studentType || "Day Scholar"} onChange={e => updateStudent(i, 'studentType', e.target.value)} className="select-input" style={{ padding: "0.4rem" }}>
                          <option value="Day Scholar">Local</option>
                          <option value="Hosteller">Resident</option>
                        </select>
                      </td>
                      <td><button className="btn-icon" onClick={() => setStudents(students.filter((_, idx) => idx !== i))}>❌</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-secondary" style={{ width: "100%", marginTop: "1rem" }} onClick={() => setStudents([...students, { regNo: "", name: "", dob: "", gender: "Boy", studentType: "Day Scholar" }])}>➕ Add New Candidate</button>
          </div>
        </div>
      )}

      {/* ROSTER, SUBJECTS & STAFF MASTER HUB */}
      {activeTab === "roster" && (
        <div className="glass-card" style={{ padding: "2.5rem", maxWidth: "1050px", margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            <button
              type="button"
              className={`btn ${rosterSubTab === "students" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.65rem 1.2rem", fontSize: "0.9rem", fontWeight: "600" }}
              onClick={() => setRosterSubTab("students")}
            >
              👥 1. Student Roster
            </button>
            <button
              type="button"
              className={`btn ${rosterSubTab === "subjects" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.65rem 1.2rem", fontSize: "0.9rem", fontWeight: "600" }}
              onClick={() => setRosterSubTab("subjects")}
            >
              📚 2. Subjects (Year &amp; Sem)
            </button>
            <button
              type="button"
              className={`btn ${rosterSubTab === "staff" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "0.65rem 1.2rem", fontSize: "0.9rem", fontWeight: "600" }}
              onClick={() => setRosterSubTab("staff")}
            >
              👩‍🏫 3. Section Staff Mapping
            </button>
          </div>

          {rosterSubTab === "students" && (
            <>
              <h2 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                👥 Bulk Roster Upload
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>
                Select a class configuration below to upload or update its student roster via an Excel/CSV file.
              </p>

          <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed var(--border-color)" }}>
            <label className="input-label" style={{ fontWeight: "600" }}>Quick Load Saved Configuration</label>
            <select
              className="select-input"
              value={selectedClassId}
              onChange={e => handleManualRosterSelect(e.target.value)}
            >
              <option value="">-- Choose Class to Update Roster --</option>
              {rosters.map(r => (
                <option key={r.cohortName} value={r.cohortName}>{r.cohortName}</option>
              ))}
            </select>
          </div>

          <div className="input-row-3col" style={{ marginBottom: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label">Year</label>
              <select value={formData.year} onChange={e => checkAndLoadExistingLocal(e.target.value, formData.semester, formData.section, formData.examName, classes)} className="select-input">
                {["I","II","III","IV"].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Semester</label>
              <select value={formData.semester} onChange={e => checkAndLoadExistingLocal(formData.year, e.target.value, formData.section, formData.examName, classes)} className="select-input">
                {getSemOptionsForYear(formData.year).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Section</label>
              <select value={formData.section} onChange={e => checkAndLoadExistingLocal(formData.year, formData.semester, e.target.value, formData.examName, classes)} className="select-input">
                {["A","B","C","D","E"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="input-row-2col" style={{ marginBottom: "2rem" }}>
            <div className="input-group">
              <label className="input-label">Programme</label>
              <input value={formData.programme} onChange={e => {
                const val = e.target.value;
                setFormData(prev => ({ ...prev, programme: val }));
                checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, formData.examName, classes, val, formData.department);
              }} placeholder="e.g. B.E" className="text-input" />
            </div>
            <div className="input-group">
              <label className="input-label">Department</label>
              <input list="dept-options" value={formData.department} onChange={e => {
                const val = e.target.value;
                setFormData(prev => ({ ...prev, department: val }));
                checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, formData.examName, classes, formData.programme, val);
              }} placeholder="e.g. CSE" className="text-input" />
            </div>
          </div>

          <div style={{ position: "relative", overflow: "hidden", display: "inline-block", marginBottom: "1rem" }}>
            <button className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", fontSize: "1rem" }}>📂 Upload Participant Data (Excel)</button>
            <input type="file" onChange={handleFileUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
          </div>

          {students.length > 0 && (
            <>
              <div style={{ marginTop: "1rem", marginBottom: "1.5rem", padding: "1rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid var(--success)" }}>
                <p style={{ margin: 0, color: "var(--success)", fontWeight: "600" }}>✅ {students.length} students loaded in memory for the selected class.</p>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  You can manually edit the details below. Click <strong>Save & Synchronize</strong> to save the roster permanently.
                </p>
              </div>

              <div className="table-container" style={{ maxHeight: "500px", marginBottom: "1.5rem" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Identifier (Roll/Reg No)</th>
                      <th>Candidate Name</th>
                      <th>Date of Birth</th>
                      <th>Gender</th>
                      <th>Cohort</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><input value={s.regNo || ""} onChange={e => updateStudent(i, 'regNo', e.target.value)} className="text-input" style={{ padding: "0.4rem" }} /></td>
                        <td><input value={s.name || ""} onChange={e => updateStudent(i, 'name', e.target.value)} className="text-input" style={{ padding: "0.4rem" }} /></td>
                        <td><input type="date" value={s.dob || ""} onChange={e => updateStudent(i, 'dob', e.target.value)} className="text-input" style={{ padding: "0.4rem", width: "140px" }} /></td>
                        <td>
                          <select value={s.gender || "Boy"} onChange={e => updateStudent(i, 'gender', e.target.value)} className="select-input" style={{ padding: "0.4rem" }}>
                            <option value="Boy">Male</option>
                            <option value="Girl">Female</option>
                          </select>
                        </td>
                        <td>
                          <select value={s.studentType || "Day Scholar"} onChange={e => updateStudent(i, 'studentType', e.target.value)} className="select-input" style={{ padding: "0.4rem" }}>
                            <option value="Day Scholar">Local</option>
                            <option value="Hosteller">Resident</option>
                          </select>
                        </td>
                        <td><button className="btn-icon" onClick={() => setStudents(students.filter((_, idx) => idx !== i))}>❌</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-secondary" style={{ width: "100%", marginBottom: "1rem" }} onClick={() => setStudents([...students, { regNo: "", name: "", dob: "", gender: "Boy", studentType: "Day Scholar" }])}>➕ Add New Candidate</button>
            </>
          )}

          <button
            className="btn btn-secondary"
            style={{
              width: "100%",
              marginTop: "2rem",
              padding: "1rem",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              opacity: savingRoster || savingClass ? 0.7 : 1,
              cursor: savingRoster || savingClass ? "not-allowed" : "pointer"
            }}
            onClick={handleSaveRoster}
            disabled={savingRoster || savingClass}
          >
            {savingRoster ? "⏳ Saving & Synchronizing Roster..." : "🚀 Save & Synchronize Roster"}
          </button>

          <div style={{ marginTop: "3rem", borderTop: "1px solid var(--border-color)", paddingTop: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Manage Saved Rosters</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>Select rosters to delete. This will permanently remove them from the database.</p>
            {rosters.length === 0 ? (
              <p>No saved rosters found.</p>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <button className="btn btn-danger" onClick={handleDeleteSelectedRosters} disabled={selectedRostersForDelete.length === 0}>
                    🗑️ Delete Selected Rosters
                  </button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>
                        <input 
                          type="checkbox" 
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRostersForDelete(rosters.map(r => r.cohortName));
                            else setSelectedRostersForDelete([]);
                          }} 
                          checked={selectedRostersForDelete.length === rosters.length && rosters.length > 0}
                        />
                      </th>
                      <th>Cohort Name</th>
                      <th>Students Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosters.map(r => (
                      <tr key={r.cohortName}>
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedRostersForDelete.includes(r.cohortName)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRostersForDelete([...selectedRostersForDelete, r.cohortName]);
                              else setSelectedRostersForDelete(selectedRostersForDelete.filter(name => name !== r.cohortName));
                            }}
                          />
                        </td>
                        <td>{r.cohortName}</td>
                        <td>{r.students?.length || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── BATCH PROMOTION TOOL ── */}
          <div style={{ marginTop: "3rem", borderTop: "1px solid var(--border-color)", paddingTop: "2rem" }}>
            <h3 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🎓 Promote Class (Batch Migration)
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Easily migrate students from an older year/semester to a new one without re-uploading the Excel sheet.
            </p>

            <div className="input-row-3col" style={{ marginBottom: "1.5rem" }}>
              <div className="input-group">
                <label className="input-label" style={{ fontWeight: "600", color: "var(--primary)" }}>1. Select Class to Promote</label>
                <select
                  className="select-input"
                  value={promoteSourceCohort}
                  onChange={(e) => setPromoteSourceCohort(e.target.value)}
                >
                  <option value="">-- Select Existing Class --</option>
                  {rosters.map(r => (
                    <option key={r.cohortName} value={r.cohortName}>{r.cohortName}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">2. Target Year</label>
                <select 
                  className="select-input"
                  value={promoteTargetYear}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    setPromoteTargetYear(newYear);
                    setPromoteTargetSemester(getSemOptionsForYear(newYear)[0]);
                  }}
                >
                  {["I","II","III","IV"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">3. Target Semester</label>
                <select 
                  className="select-input"
                  value={promoteTargetSemester}
                  onChange={(e) => setPromoteTargetSemester(e.target.value)}
                >
                  {getSemOptionsForYear(promoteTargetYear).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: "100%", padding: "1rem", fontSize: "1.1rem" }}
              onClick={handlePromoteRoster}
              disabled={isPromoting}
            >
              {isPromoting ? "Promoting Class..." : "Migrate / Promote Students"}
            </button>
          </div>
            </>
          )}

          {rosterSubTab !== "students" && (
            <div>
              <h2 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {rosterSubTab === "subjects" ? "📚 Subjects Master (Year & Semester)" : "👩‍🏫 Section-Wise Staff Mapping"}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                {rosterSubTab === "subjects"
                  ? "Configure all Subject Codes, Names, Short Forms, Types, and Credits once per Year & Semester. Class Setup will auto-load these across all exams."
                  : "Assign faculty members per Section for the configured subjects. Saving automatically updates Staff Name across all existing & new Exam Models of this section."}
              </p>

              {/* Quick Saved Master Cohorts */}
              {masterSubjectsList.length > 0 && (
                <div style={{ marginBottom: "1.25rem", padding: "0.9rem 1rem", background: "rgba(99, 102, 241, 0.05)", borderRadius: "10px", border: "1px dashed rgba(99, 102, 241, 0.35)" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--primary)", marginBottom: "0.5rem" }}>
                    ⚡ Saved Subject Master Sets:
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {masterSubjectsList.map(m => {
                      const active = m.programme === currForm.programme && m.department === currForm.department && m.year === currForm.year && m.semester === currForm.semester;
                      return (
                        <button
                          key={m.cohortKey}
                          type="button"
                          className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                          onClick={() => setCurrForm(prev => ({
                            ...prev,
                            programme: m.programme || "B.E",
                            department: m.department || "CSE",
                            year: m.year,
                            semester: m.semester
                          }))}
                        >
                          {m.programme}-{m.department} {m.year}/{m.semester} ({m.subjects?.length || 0})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shared Cohort Filter */}
              <div className="input-row-3col" style={{ marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Year</label>
                  <select value={currForm.year} onChange={e => handleCurrFilterChange("year", e.target.value)} className="select-input">
                    {["I", "II", "III", "IV"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Semester</label>
                  <select value={currForm.semester} onChange={e => handleCurrFilterChange("semester", e.target.value)} className="select-input">
                    {getSemOptionsForYear(currForm.year).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {rosterSubTab === "staff" ? (
                  <div className="input-group">
                    <label className="input-label">Section</label>
                    <select value={currForm.section} onChange={e => handleCurrFilterChange("section", e.target.value)} className="select-input">
                      {getSectionsForCohort(currForm.year, currForm.semester, currForm.department, currForm.programme).map(sec => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="input-group">
                    <label className="input-label">Total Subjects</label>
                    <input readOnly value={`${editingMasterSubjects.length} subject(s)`} className="text-input" style={{ opacity: 0.8 }} />
                  </div>
                )}
              </div>

              <div className="input-row-2col" style={{ marginBottom: "1.5rem" }}>
                <div className="input-group">
                  <label className="input-label">Programme</label>
                  <input value={currForm.programme} onChange={e => handleCurrFilterChange("programme", e.target.value)} placeholder="e.g. B.E" className="text-input" />
                </div>
                <div className="input-group">
                  <label className="input-label">Department</label>
                  <input value={currForm.department} onChange={e => handleCurrFilterChange("department", e.target.value)} placeholder="e.g. CSE" className="text-input" />
                </div>
              </div>

              {rosterSubTab === "subjects" && (
                <div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleImportTimetableSubjects}
                      disabled={importingFromTimetable}
                    >
                      {importingFromTimetable ? "⏳ Importing..." : "⚡ Import from Timetable"}
                    </button>
                    <div style={{ position: "relative", overflow: "hidden", display: "inline-block" }}>
                      <button type="button" className="btn btn-primary">📂 Upload Subjects Excel</button>
                      <input type="file" onChange={handleUploadMasterSubjectsExcel} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}>#</th>
                          <th style={{ minWidth: "130px" }}>Course Code</th>
                          <th style={{ minWidth: "240px" }}>Subject Name</th>
                          <th style={{ minWidth: "110px" }}>Short Form</th>
                          <th style={{ minWidth: "110px" }}>Type</th>
                          <th style={{ width: "85px" }}>Credits</th>
                          <th style={{ width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingMasterSubjects.map((sub, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>
                              <input
                                value={sub.courseCode || ""}
                                onChange={e => {
                                  const next = [...editingMasterSubjects];
                                  next[idx] = { ...next[idx], courseCode: e.target.value };
                                  setEditingMasterSubjects(next);
                                }}
                                placeholder="e.g. 23CSE01"
                                className="text-input"
                                style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                              />
                            </td>
                            <td>
                              <input
                                value={sub.courseName || ""}
                                onChange={e => {
                                  const next = [...editingMasterSubjects];
                                  next[idx] = { ...next[idx], courseName: e.target.value };
                                  setEditingMasterSubjects(next);
                                }}
                                placeholder="e.g. Internet of Things"
                                className="text-input"
                                style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                              />
                            </td>
                            <td>
                              <input
                                value={sub.shortName || ""}
                                onChange={e => {
                                  const next = [...editingMasterSubjects];
                                  next[idx] = { ...next[idx], shortName: e.target.value };
                                  setEditingMasterSubjects(next);
                                }}
                                placeholder="IoT"
                                className="text-input"
                                style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                              />
                            </td>
                            <td>
                              <select
                                value={sub.category || "Theory"}
                                onChange={e => {
                                  const next = [...editingMasterSubjects];
                                  next[idx] = { ...next[idx], category: e.target.value };
                                  setEditingMasterSubjects(next);
                                }}
                                className="select-input"
                                style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                              >
                                <option value="Theory">Theory</option>
                                <option value="Lab">Lab</option>
                                <option value="Other">Other</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={sub.credits !== undefined ? sub.credits : 3}
                                onChange={e => {
                                  const next = [...editingMasterSubjects];
                                  next[idx] = { ...next[idx], credits: Number(e.target.value) };
                                  setEditingMasterSubjects(next);
                                }}
                                className="text-input"
                                style={{ padding: "0.4rem", fontSize: "0.85rem" }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => setEditingMasterSubjects(editingMasterSubjects.filter((_, i) => i !== idx))}
                              >
                                ❌
                              </button>
                            </td>
                          </tr>
                        ))}
                        {editingMasterSubjects.length === 0 && (
                          <tr>
                            <td colSpan="7" style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)" }}>
                              No subjects configured for {currForm.programme}-{currForm.department} {currForm.year}/{currForm.semester}. Click <strong>Import from Timetable</strong>, <strong>Upload Subjects Excel</strong>, or <strong>Add Subject</strong>.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: "100%", marginTop: "1rem" }}
                    onClick={() => setEditingMasterSubjects([
                      ...editingMasterSubjects,
                      { courseCode: "", courseName: "", shortName: "", credits: 3, category: "Theory" }
                    ])}
                  >
                    ➕ Add Subject
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
                    <input
                      type="checkbox"
                      id="syncMasterSubjectsToExams"
                      checked={syncMasterSubjectsToExams}
                      onChange={e => setSyncMasterSubjectsToExams(e.target.checked)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <label htmlFor="syncMasterSubjectsToExams" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-muted)", userSelect: "none" }}>
                      Automatically update Subject Name, Short Form &amp; Credits in existing Exam Models of Year {currForm.year} Sem {currForm.semester}
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%", marginTop: "1.25rem", padding: "1rem", fontSize: "1rem", fontWeight: "700", opacity: savingMasterSubjects ? 0.7 : 1 }}
                    onClick={handleSaveMasterSubjects}
                    disabled={savingMasterSubjects}
                  >
                    {savingMasterSubjects ? "⏳ Saving Master Subjects..." : `💾 Save Subjects for ${currForm.programme}-${currForm.department} ${currForm.year}/${currForm.semester}`}
                  </button>
                </div>
              )}

              {rosterSubTab === "staff" && (
                <div>
                  {editingMasterSubjects.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", background: "rgba(245, 158, 11, 0.08)", borderRadius: "12px", border: "1px dashed #f59e0b" }}>
                      <p style={{ margin: "0 0 1rem 0", fontWeight: "600", color: "#b45309" }}>
                        No subjects found for {currForm.programme}-{currForm.department} Year {currForm.year} Sem {currForm.semester}.
                      </p>
                      <button type="button" className="btn btn-primary" onClick={() => setRosterSubTab("subjects")}>
                        📚 Go to Subjects (Year &amp; Sem) Tab
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "1rem" }}>
                        <span style={{ fontWeight: "700", color: "var(--primary)", fontSize: "0.95rem" }}>
                          Section {currForm.section} — {editingMasterSubjects.length} Subject(s)
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleAutoFillStaffFromTimetable}
                          disabled={autoFillingStaff}
                        >
                          {autoFillingStaff ? "⏳ Filling..." : `⚡ Auto-Fill Sec ${currForm.section} Staff from Timetable`}
                        </button>
                      </div>

                      <div className="table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th style={{ width: "40px" }}>#</th>
                              <th style={{ minWidth: "130px" }}>Course Code</th>
                              <th style={{ minWidth: "220px" }}>Subject Name</th>
                              <th style={{ minWidth: "90px" }}>Type</th>
                              <th style={{ minWidth: "240px" }}>Assigned Staff Name (Sec {currForm.section})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {editingMasterSubjects.map((sub, idx) => {
                              const codeUp = String(sub.courseCode || "").trim().toUpperCase();
                              const currentFac = editingStaffMap[codeUp] || "";
                              return (
                                <tr key={`${codeUp}_${idx}`}>
                                  <td>{idx + 1}</td>
                                  <td><strong>{sub.courseCode}</strong></td>
                                  <td>
                                    {sub.courseName}
                                    {sub.shortName ? <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginLeft: "6px" }}>({sub.shortName})</span> : null}
                                  </td>
                                  <td>
                                    <span className="badge" style={{ padding: "2px 8px", borderRadius: "8px", fontSize: "0.72rem", fontWeight: "700", background: sub.category === "Lab" ? "rgba(236, 72, 153, 0.12)" : "rgba(99, 102, 241, 0.12)", color: sub.category === "Lab" ? "#db2777" : "#4f46e5" }}>
                                      {sub.category || "Theory"}
                                    </span>
                                  </td>
                                  <td>
                                    <input
                                      list="master-staff-datalist"
                                      value={currentFac}
                                      onChange={e => setEditingStaffMap(prev => ({ ...prev, [codeUp]: e.target.value }))}
                                      placeholder={`Select or type Sec ${currForm.section} Staff...`}
                                      className="text-input"
                                      style={{ padding: "0.45rem", fontSize: "0.85rem" }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
                        <input
                          type="checkbox"
                          id="syncStaffToExams"
                          checked={syncStaffToExams}
                          onChange={e => setSyncStaffToExams(e.target.checked)}
                          style={{ width: "18px", height: "18px", cursor: "pointer" }}
                        />
                        <label htmlFor="syncStaffToExams" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-muted)", userSelect: "none" }}>
                          Automatically update Staff Name across ALL Exam Models of {currForm.programme}-{currForm.department} {currForm.year}/{currForm.semester}/{currForm.section} (CIA, Lab, Model, Seminar, ESE...)
                        </label>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: "100%", marginTop: "1.25rem", padding: "1rem", fontSize: "1rem", fontWeight: "700", opacity: savingSectionStaff ? 0.7 : 1 }}
                        onClick={handleSaveSectionStaff}
                        disabled={savingSectionStaff}
                      >
                        {savingSectionStaff ? "⏳ Saving & Syncing Exam Models..." : `💾 Save Sec ${currForm.section} Staff Mapping & Sync Exams`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MARK ENTRY ACCESS CONTROL TAB */}
      {activeTab === "access" && (
        <div className="glass-card" style={{ padding: "2.5rem", maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🔑 Mark Entry Access Management
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Enable or disable faculty access to enter/edit marks for any cohort class in the system.
          </p>

          {/* Summary counters */}
          {(() => {
            const totalCount = classes.length;
            const enabledCount = classes.filter(c => isClassAccessActive(c)).length;
            const disabledCount = totalCount - enabledCount;
            return (
              <div className="admin-grid-3col" style={{ 
                marginBottom: "2rem",
                textAlign: "center"
              }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-main)" }}>{totalCount}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "0.25rem" }}>Total Classes</div>
                </div>
                <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#10b981" }}>{enabledCount}</div>
                  <div style={{ fontSize: "0.75rem", color: "#10b981", textTransform: "uppercase", marginTop: "0.25rem" }}>🔓 Enabled (Active)</div>
                </div>
                <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ef4444" }}>{disabledCount}</div>
                  <div style={{ fontSize: "0.75rem", color: "#ef4444", textTransform: "uppercase", marginTop: "0.25rem" }}>🔒 Disabled (Locked/Expired)</div>
                </div>
              </div>
            );
          })()}

          {/* Permitted Date/Time Range Box */}
          <div style={{ 
            background: "rgba(255,255,255,0.02)", 
            padding: "1.25rem", 
            borderRadius: "12px", 
            border: "1px dashed var(--border-color)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "1.5rem"
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", display: "flex", gap: "0.25rem", alignItems: "center" }}>
              📅 Permitted Date & Time Range (Optional for Enable action)
            </span>
            <div className="input-row-2col">
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Start Date</span>
                <input 
                  type="date" 
                  value={bulkStartDate} 
                  onChange={e => setBulkStartDate(e.target.value)} 
                  className="text-input" 
                  style={{ padding: "0.5rem" }}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>End Date</span>
                <input 
                  type="date" 
                  value={bulkEndDate} 
                  onChange={e => setBulkEndDate(e.target.value)} 
                  className="text-input" 
                  style={{ padding: "0.5rem" }}
                />
              </div>
            </div>
            <div className="input-row-2col">
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Start Time (Optional)</span>
                <input 
                  type="time" 
                  value={bulkStartTime} 
                  onChange={e => setBulkStartTime(e.target.value)} 
                  className="text-input" 
                  style={{ padding: "0.5rem" }}
                />
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>End Time (Optional)</span>
                <input 
                  type="time" 
                  value={bulkEndTime} 
                  onChange={e => setBulkEndTime(e.target.value)} 
                  className="text-input" 
                  style={{ padding: "0.5rem" }}
                />
              </div>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", marginBottom: 0 }}>
              Leave blank to allow access indefinitely. If dates are set, access will be revoked automatically after the end date/time.
            </p>
          </div>

          {/* Filter dropdowns and Bulk Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="admin-grid-4col">
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Year</span>
                <select value={accessFilterYear} onChange={e => handleYearFilterChange(e.target.value)} className="select-input" style={{ padding: "0.55rem" }}>
                  <option value="All">All Years</option>
                  <option value="I">I</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Semester</span>
                <select value={accessFilterSem} onChange={e => setAccessFilterSem(e.target.value)} className="select-input" style={{ padding: "0.55rem" }}>
                  <option value="All">All Semesters</option>
                  {getSemOptionsForYear(accessFilterYear).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Section</span>
                <select value={accessFilterSec} onChange={e => setAccessFilterSec(e.target.value)} className="select-input" style={{ padding: "0.55rem" }}>
                  <option value="All">All Sections</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Exam Model</span>
                <select value={accessFilterExam} onChange={e => setAccessFilterExam(e.target.value)} className="select-input" style={{ padding: "0.55rem" }}>
                  <option value="All">All Exams</option>
                  {Array.from(new Set(classes.map(c => c.examName))).filter(Boolean).sort().map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn"
                style={{ 
                  padding: "0.5rem 1rem", 
                  fontSize: "0.8rem", 
                  background: "rgba(255,255,255,0.05)", 
                  color: "white", 
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem", 
                  cursor: "pointer" 
                }}
                onClick={() => {
                  const filtered = filteredAccessClasses;
                  const allSelected = filtered.every(c => selectedClassesForAccess.includes(c.className));
                  if (allSelected) {
                    setSelectedClassesForAccess(prev => prev.filter(name => !filtered.some(f => f.className === name)));
                  } else {
                    const newSelects = [...selectedClassesForAccess];
                    filtered.forEach(c => {
                      if (!newSelects.includes(c.className)) newSelects.push(c.className);
                    });
                    setSelectedClassesForAccess(newSelects);
                  }
                }}
              >
                {filteredAccessClasses.every(c => selectedClassesForAccess.includes(c.className)) && filteredAccessClasses.length > 0 ? "🔲 Deselect All" : "☑️ Select All"}
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "var(--success)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                onClick={() => handleBulkAccessUpdate(true)}
                disabled={selectedClassesForAccess.length === 0}
              >
                🔓 Enable Selected ({selectedClassesForAccess.length})
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "var(--danger)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                onClick={() => handleBulkAccessUpdate(false)}
                disabled={selectedClassesForAccess.length === 0}
              >
                🔒 Disable Selected ({selectedClassesForAccess.length})
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "#991b1b", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                onClick={handleBulkDelete}
                disabled={selectedClassesForAccess.length === 0}
              >
                🗑️ Delete Selected ({selectedClassesForAccess.length})
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "linear-gradient(135deg, #107c41, #0b5930)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                onClick={handleDownloadBulkExcel}
                disabled={selectedClassesForAccess.length === 0}
              >
                📊 Export to Excel ({selectedClassesForAccess.length})
              </button>
            </div>
          </div>

          {/* Classes Access Control List */}
          <div style={{ 
            maxHeight: "350px", 
            overflowY: "auto", 
            border: "1px solid var(--border-color)", 
            borderRadius: "0.5rem",
            background: "rgba(255,255,255,0.02)",
            padding: "0.75rem"
          }}>
            {filteredAccessClasses.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem", fontSize: "0.85rem", margin: 0 }}>
                No classes match the selected filter criteria.
              </p>
            ) : (
              filteredAccessClasses.map(c => {
                const isSelected = selectedClassesForAccess.includes(c.className);
                const isAllowed = isClassAccessActive(c);
                return (
                  <div 
                    key={c.className}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between", 
                      padding: "0.6rem 0.8rem", 
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      background: isSelected ? "rgba(99, 102, 241, 0.05)" : "transparent",
                      borderRadius: "0.25rem",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedClassesForAccess(prev => prev.filter(name => name !== c.className));
                          } else {
                            setSelectedClassesForAccess(prev => [...prev, c.className]);
                          }
                        }}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <span 
                          style={{ 
                            fontSize: "0.85rem", 
                            fontWeight: "500", 
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {c.className}
                        </span>
                        {(c.editingStartDate || c.editingEndDate) ? (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                            📅 {c.editingStartDate ? formatLimitDate(c.editingStartDate) : "Any"} {c.editingStartTime || "00:00"} to {c.editingEndDate ? formatLimitDate(c.editingEndDate) : "Any"} {c.editingEndTime || "23:59"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span 
                        onClick={() => handleToggleSingleAccess(c.className, isAllowed)}
                        style={{ 
                          fontSize: "0.75rem", 
                          fontWeight: "bold", 
                          padding: "0.2rem 0.5rem", 
                          borderRadius: "4px", 
                          cursor: "pointer",
                          background: isAllowed ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)", 
                          color: isAllowed ? "#10b981" : "#ef4444",
                          border: `1px solid ${isAllowed ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                        }}
                        title="Click to toggle status"
                      >
                        {isAllowed ? "🔓 Enabled" : "🔒 Disabled"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MARK ENTRY REPORTS TAB */}
      {activeTab === "reports" && (
        <div className="glass-card fade-in printable-area">
          <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ marginBottom: "0.5rem" }}>📊 Mark Entry Status Report</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Track which faculty members have pending marks to enter.</p>
              </div>
              
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => window.print()}
                  disabled={!reportExamModel || reportData.length === 0}
                >
                  🖨️ Print
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleExportReportExcel}
                  disabled={!reportExamModel || reportData.length === 0}
                >
                  📥 Export Excel
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", background: "rgba(0,0,0,0.02)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
              <div className="input-group" style={{ margin: 0, minWidth: "250px" }}>
                <label>Select Exam Model</label>
                <select 
                  className="input-field" 
                  value={reportExamModel} 
                  onChange={(e) => setReportExamModel(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">-- Select Exam Model --</option>
                  {[...new Set(classes.filter(c => !c.isDeleted).map(c => c.examName))].map(exam => (
                    <option key={exam} value={exam}>{exam}</option>
                  ))}
                </select>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label>Filter by Year</label>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={reportYears.includes("All")} onChange={() => handleReportCheckboxChange("All", reportYears, setReportYears)} /> All
                  </label>
                  {["I", "II", "III", "IV"].map(y => (
                    <label key={y} style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={reportYears.includes(y)} onChange={() => handleReportCheckboxChange(y, reportYears, setReportYears)} /> {y}
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label>Filter by Section</label>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={reportSections.includes("All")} onChange={() => handleReportCheckboxChange("All", reportSections, setReportSections)} /> All
                  </label>
                  {["A", "B", "C", "D", "E"].map(s => (
                    <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={reportSections.includes(s)} onChange={() => handleReportCheckboxChange(s, reportSections, setReportSections)} /> {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!reportExamModel ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.02)", borderRadius: "12px" }}>
              <p>Please select an Exam Model from the dropdown to generate the report.</p>
            </div>
          ) : reportData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.02)", borderRadius: "12px" }}>
              <p>No classes found for the selected Exam Model.</p>
            </div>
          ) : (
            <div>
              <div className="print-only" style={{ textAlign: "center", marginBottom: "20px" }}>
                <h2>MUTHAYAMMAL ENGINEERING COLLEGE (Autonomous)</h2>
                <h3>MARK ENTRY REPORT FOR {reportExamModel}</h3>
              </div>
              <div className="table-container">
                <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Faculty Name</th>
                      <th>Class & Section</th>
                      <th>Course Code</th>
                      <th>Course Name</th>
                      <th style={{ textAlign: "center" }}>Total Students</th>
                      <th style={{ textAlign: "center" }}>Entered</th>
                      <th style={{ textAlign: "center" }}>Pending</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx} style={{ background: row.pendingMarks > 0 ? "rgba(239, 68, 68, 0.05)" : "transparent" }}>
                        <td>{row.sno}</td>
                        <td style={{ fontWeight: "600" }}>{row.facultyName}</td>
                        <td>{row.className.split(" - ")[1] || row.className}</td>
                        <td>{row.courseCode}</td>
                        <td>{row.courseName}</td>
                        <td style={{ textAlign: "center" }}>{row.totalStudents}</td>
                        <td style={{ textAlign: "center", color: "var(--success)", fontWeight: "bold" }}>{row.enteredMarks}</td>
                        <td style={{ textAlign: "center", color: row.pendingMarks > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: "bold" }}>
                          {row.pendingMarks > 0 ? (
                            <span 
                              style={{ cursor: "pointer", textDecoration: "underline", color: "var(--danger)" }}
                              onClick={() => handlePendingClick(row)}
                              title="Click to view and mark pending students"
                            >
                              {row.pendingMarks}
                            </span>
                          ) : (
                            row.pendingMarks
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`status-badge ${row.pendingMarks === 0 ? 'success' : 'danger'}`}>
                            {row.pendingMarks === 0 ? "Completed" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* USER MANAGEMENT TAB */}
      {activeTab === "users" && (
        <div className="glass-card fade-in">
          <h3 style={{ marginBottom: "1.5rem" }}>System Access Management</h3>
          
          {/* Print User Access Control */}
          <div style={{
            background: "rgba(15, 23, 42, 0.4)", border: "1px solid rgba(14, 165, 233, 0.3)",
            padding: "1.5rem", borderRadius: "12px", marginBottom: "2rem", display: "flex", 
            justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem"
          }}>
            <div>
              <h4 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                🖨️ Print User Edit Access
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Allow the print admin account to edit marks and attendance. If disabled, they can only view and print.
              </p>
            </div>
            <label className="toggle-switch" style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={printEditAccess} 
                onChange={handleTogglePrintAccess} 
                style={{ display: "none" }}
              />
              <div style={{
                width: "48px", height: "24px", 
                background: printEditAccess ? "#10b981" : "rgba(255,255,255,0.1)", 
                borderRadius: "12px", position: "relative",
                transition: "all 0.3s ease",
                border: `1px solid ${printEditAccess ? "#10b981" : "rgba(255,255,255,0.2)"}`
              }}>
                <div style={{
                  position: "absolute", top: "2px", left: printEditAccess ? "26px" : "2px",
                  width: "18px", height: "18px", background: "#fff", borderRadius: "50%",
                  transition: "all 0.3s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                }} />
              </div>
              <span style={{ marginLeft: "10px", fontSize: "0.9rem", fontWeight: "bold", color: printEditAccess ? "#10b981" : "var(--text-muted)" }}>
                {printEditAccess ? "Edit Enabled" : "View & Print Only"}
              </span>
            </label>
          </div>

          <h4 style={{ marginBottom: "1rem", color: "var(--text-main)" }}>👨‍🏫 Faculty Approvals</h4>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Communication</th>
                  <th>Security (Password)</th>
                  <th>Department / Focus</th>
                  <th>Designation</th>
                  <th>Current Status</th>
                  <th>Operational Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>Integrity Check: No faculty registrations found.</td></tr>}
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: "600" }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: "4px" }}>{u.plainPassword || "Not available"}</span></td>
                    <td><span className="status-badge" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)" }}>{u.department}</span></td>
                    <td>{u.designation}</td>
                    <td>
                      <span className={`status-badge ${u.approved ? 'success' : 'danger'}`}>
                        {u.approved ? "Verified" : "Pending Approval"}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        {!u.approved ? (
                          <button onClick={() => handleApproveUser(u._id, true)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>Grant Access</button>
                        ) : (
                          <button onClick={() => handleApproveUser(u._id, false)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>Restrict Access</button>
                        )}
                        <button onClick={() => { setEditingTabsUserId(u._id); setSelectedAdminTabs(u.adminTabs || []); setSelectedDashboardTabs(u.dashboardTabs || []); }} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>⚙️ Modules</button>
                        <button onClick={() => handleDeleteUser(u._id)} className="btn btn-danger btn-icon" style={{ padding: "0.4rem", width: "auto", height: "auto" }}>🗑</button>
                      </div>

                      {editingTabsUserId === u._id && (
                        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "1.2rem", borderRadius: "10px", marginTop: "0.5rem", position: "absolute", right: "2rem", zIndex: 10, minWidth: "350px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
                          
                          {/* Section 1: Admin Panel Tabs */}
                          <div style={{ marginBottom: "0.75rem", fontWeight: "bold", fontSize: "0.9rem", color: "#333", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                            🔧 Admin Panel Modules
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
                            {AVAILABLE_ADMIN_TABS.map(tab => (
                              <label key={tab.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer", color: "#000" }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedAdminTabs.includes(tab.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedAdminTabs([...selectedAdminTabs, tab.id]);
                                    else setSelectedAdminTabs(selectedAdminTabs.filter(id => id !== tab.id));
                                  }}
                                />
                                {tab.label}
                              </label>
                            ))}
                          </div>

                          {/* Section 2: Dashboard Pages */}
                          <div style={{ marginBottom: "0.75rem", fontWeight: "bold", fontSize: "0.9rem", color: "#333", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                            📊 Result Hub Pages
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1.5rem" }}>
                            {AVAILABLE_DASHBOARD_PAGES.map(page => (
                              <label key={page.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", cursor: "pointer", color: "#000" }}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedDashboardTabs.includes(page.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedDashboardTabs([...selectedDashboardTabs, page.id]);
                                    else setSelectedDashboardTabs(selectedDashboardTabs.filter(id => id !== page.id));
                                  }}
                                />
                                {page.label}
                              </label>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button onClick={() => setEditingTabsUserId(null)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", color: "#333", background: "#f1f5f9", border: "1px solid #cbd5e1" }}>Cancel</button>
                            <button onClick={() => handleApproveUser(u._id, u.approved, selectedAdminTabs, selectedDashboardTabs)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", background: "#3b82f6", color: "#fff", border: "none" }}>Save</button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACTIVITY LOG TAB */}
      {activeTab === "activity" && (
        <div className="glass-card fade-in">
          <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0 }}>System Activity Audit</h3>
            <button className="btn btn-secondary btn-icon" onClick={loadActivities}>🔄 Sync Logs</button>
          </div>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Event Type</th>
                  <th>Transaction Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 && <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>Anomaly: No recent system events detected.</td></tr>}
                {activities.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: "600" }}>{a.userName}</td>
                    <td>
                      <span className={`status-badge ${a.action === 'login' ? 'pending' : 'success'}`}>
                        {a.action === "login" ? "🔒 SESSION_START" : "📤 DATA_COMMIT"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{a.details}</td>
                    <td style={{ fontSize: "0.8rem", opacity: 0.8 }}>{new Date(a.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECYCLE BIN TAB */}
      {activeTab === "recycle" && (
        <div className="glass-card fade-in">
          <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              🗑️ Recycle Bin Management
            </h3>
            <button className="btn btn-secondary btn-icon" onClick={loadRecycleClasses}>🔄 Sync Recycle Bin</button>
          </div>
          
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            Deleted classes are temporarily stored here. They will be <strong>permanently deleted after 30 days</strong> from the deletion date.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
            <input
              type="text"
              placeholder="🔍 Search recycled classes..."
              value={recycleSearchQuery}
              onChange={e => setRecycleSearchQuery(e.target.value)}
              className="text-input"
              style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}
            />

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                style={{ 
                  padding: "0.5rem 1rem", 
                  fontSize: "0.8rem", 
                  background: "rgba(255,255,255,0.05)", 
                  color: "white", 
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.5rem", 
                  cursor: "pointer" 
                }}
                onClick={() => {
                  const filtered = recycleClasses.filter(c => 
                    c.className.toLowerCase().includes(recycleSearchQuery.toLowerCase())
                  );
                  const allSelected = filtered.every(c => selectedRecycleClasses.includes(c.className));
                  if (allSelected) {
                    setSelectedRecycleClasses(prev => prev.filter(name => !filtered.some(f => f.className === name)));
                  } else {
                    const newSelects = [...selectedRecycleClasses];
                    filtered.forEach(c => {
                      if (!newSelects.includes(c.className)) newSelects.push(c.className);
                    });
                    setSelectedRecycleClasses(newSelects);
                  }
                }}
              >
                {recycleClasses.filter(c => c.className.toLowerCase().includes(recycleSearchQuery.toLowerCase())).every(c => selectedRecycleClasses.includes(c.className)) ? "🔲 Deselect All" : "☑️ Select All"}
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "var(--success)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                onClick={handleBulkRestore}
                disabled={selectedRecycleClasses.length === 0}
              >
                🔓 Restore Selected ({selectedRecycleClasses.length})
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "var(--danger)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
                onClick={handleBulkPurge}
                disabled={selectedRecycleClasses.length === 0}
              >
                🔥 Permanently Delete ({selectedRecycleClasses.length})
              </button>

              <button
                type="button"
                className="btn"
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.8rem", background: "linear-gradient(135deg, #107c41, #0b5930)", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                onClick={handleDownloadRecycleExcel}
                disabled={selectedRecycleClasses.length === 0}
              >
                📊 Export to Excel ({selectedRecycleClasses.length})
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}></th>
                  <th>Class Name</th>
                  <th>Deleted At</th>
                  <th>Retention Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecycle ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>Loading Recycle Bin...</td></tr>
                ) : recycleClasses.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>Recycle Bin is empty. No deleted classes found.</td></tr>
                ) : (
                  recycleClasses.filter(c => c.className.toLowerCase().includes(recycleSearchQuery.toLowerCase())).map(c => {
                    const isSelected = selectedRecycleClasses.includes(c.className);
                    const daysRemaining = (() => {
                      if (!c.deletedAt) return "N/A";
                      const deletedAt = new Date(c.deletedAt);
                      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
                      const expiryDate = new Date(deletedAt.getTime() + thirtyDaysInMs);
                      const diffMs = expiryDate - new Date();
                      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      if (diffDays <= 0) return "Expiring soon";
                      return `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
                    })();
                    
                    return (
                      <tr key={c._id}>
                        <td style={{ textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedRecycleClasses(prev => prev.filter(name => name !== c.className));
                              } else {
                                setSelectedRecycleClasses(prev => [...prev, c.className]);
                              }
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: "600" }}>{c.className}</td>
                        <td>{c.deletedAt ? new Date(c.deletedAt).toLocaleString() : "N/A"}</td>
                        <td>
                          <span className="status-badge pending" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)" }}>
                            ⏳ {daysRemaining}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RESULT APPROVALS TAB */}
      {activeTab === "approvals" && (
        <div className="glass-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Year-wise Result Approvals</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            Toggle whether students in each academic year can view their results on their dashboard.
          </p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "500px" }}>
            {["I", "II", "III", "IV"].map(year => {
              const approvalDoc = yearApprovals.find(a => a.year === year);
              const isApproved = approvalDoc ? approvalDoc.isApproved : true;
              
              return (
                <div key={year} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div>
                    <h3 style={{ fontSize: "1.25rem", margin: 0 }}>Year {year}</h3>
                    <div style={{ fontSize: "0.9rem", color: isApproved ? "var(--success)" : "var(--danger)", fontWeight: "bold", marginTop: "6px" }}>
                      {isApproved ? "✅ Published to Students" : "❌ Hidden from Students"}
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleYearApproval(year, isApproved)}
                    className={`btn ${isApproved ? "btn-danger" : "btn-primary"}`}
                    style={{ minWidth: "140px", padding: "0.6rem 1rem", fontSize: "0.9rem" }}
                  >
                    {isApproved ? "Revoke Access" : "Approve Access"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EXTENSION REQUESTS TAB */}
      {activeTab === "extensions" && (
        <div className="glass-card" style={{ padding: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Extension Requests</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            Review and approve requests from faculty to extend the mark entry deadline.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {extensionRequests.length === 0 ? (
              <p>No extension requests found.</p>
            ) : (
              extensionRequests.map(req => (
                <div key={req._id} style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", margin: "0 0 8px 0" }}>{req.className}</h3>
                    <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem" }}><strong>Requested By:</strong> {req.facultyName || "Unknown"} {req.facultyId ? `(ID: ${req.facultyId})` : ""}</p>
                    <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem" }}><strong>Requested At:</strong> {new Date(req.requestedAt).toLocaleString()}</p>
                    <p style={{ margin: "0", fontSize: "0.9rem" }}>
                      <strong>Status:</strong> 
                      <span style={{ 
                        marginLeft: "8px", 
                        padding: "2px 8px", 
                        borderRadius: "4px",
                        background: req.status === "Pending" ? "rgba(245, 158, 11, 0.2)" : req.status === "Approved" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        color: req.status === "Pending" ? "var(--warning)" : req.status === "Approved" ? "var(--success)" : "var(--danger)"
                      }}>
                        {req.status}
                      </span>
                    </p>
                  </div>
                  
                  {req.status === "Pending" && (
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                      <div className="input-group" style={{ width: "auto" }}>
                        <label className="input-label">New End Date</label>
                        <input 
                          type="date" 
                          className="text-input" 
                          value={approvalDates[req._id]?.date || ""} 
                          onChange={(e) => setApprovalDates(prev => ({ ...prev, [req._id]: { ...prev[req._id], date: e.target.value } }))}
                        />
                      </div>
                      <div className="input-group" style={{ width: "auto" }}>
                        <label className="input-label">New End Time</label>
                        <input 
                          type="time" 
                          className="text-input" 
                          value={approvalDates[req._id]?.time || ""} 
                          onChange={(e) => setApprovalDates(prev => ({ ...prev, [req._id]: { ...prev[req._id], time: e.target.value } }))}
                        />
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button 
                          className="btn btn-primary"
                          onClick={async () => {
                            const date = approvalDates[req._id]?.date;
                            const time = approvalDates[req._id]?.time;
                            if (!date || !time) {
                              alert("Please select a new end date and time before approving.");
                              return;
                            }
                            try {
                              await API.put(`/api/extensions/${req._id}/approve`, {
                                editingEndDate: date,
                                editingEndTime: time
                              });
                              alert("Request approved successfully.");
                              loadExtensionRequests();
                            } catch (err) {
                              alert("Failed to approve: " + err.message);
                            }
                          }}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={async () => {
                            try {
                              await API.put(`/api/extensions/${req._id}/reject`);
                              alert("Request rejected.");
                              loadExtensionRequests();
                            } catch (err) {
                              alert("Failed to reject: " + err.message);
                            }
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CLASS ADVISORS TAB */}
      {activeTab === "advisors" && (
        <div className="admin-grid-2col">
          <div className="glass-card" style={{ padding: "2rem", height: "fit-content" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              {editingAdvisorId ? "📝 Edit Class Advisor" : "➕ Setup Class Advisor"}
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Map a Class Advisor to a specific Programme, Department, Year, and Section.
            </p>

            <form onSubmit={handleSaveAdvisor}>
              <div className="input-row-2col" style={{ marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Programme</label>
                  <input 
                    type="text" 
                    value={advisorFormData.programme} 
                    onChange={e => setAdvisorFormData(prev => ({ ...prev, programme: e.target.value }))}
                    placeholder="e.g. B.E" 
                    className="text-input" 
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Department</label>
                  <input 
                    list="dept-options"
                    type="text" 
                    value={advisorFormData.department} 
                    onChange={e => setAdvisorFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g. CSE" 
                    className="text-input" 
                    required
                  />
                </div>
              </div>

              <div className="input-row-2col" style={{ marginBottom: "1.5rem" }}>
                <div className="input-group">
                  <label className="input-label">Year</label>
                  <select 
                    value={advisorFormData.year} 
                    onChange={e => setAdvisorFormData(prev => ({ ...prev, year: e.target.value }))}
                    className="select-input"
                  >
                    {["I","II","III","IV"].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Section</label>
                  <select 
                    value={advisorFormData.section} 
                    onChange={e => setAdvisorFormData(prev => ({ ...prev, section: e.target.value }))}
                    className="select-input"
                  >
                    {["A","B","C","D","E"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: "2rem" }}>
                <label className="input-label">Class Advisor Name</label>
                <input 
                  type="text" 
                  value={advisorFormData.advisorName} 
                  onChange={e => setAdvisorFormData(prev => ({ ...prev, advisorName: e.target.value }))}
                  placeholder="Enter Advisor's Name (e.g. Dr. A. Suresh)" 
                  className="text-input" 
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingAdvisorId ? "Update Advisor" : "Save Advisor"}
                </button>
                {editingAdvisorId && (
                  <button 
                    type="button" 
                    onClick={handleCancelAdvisorEdit} 
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card" style={{ padding: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Assigned Class Advisors</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Currently assigned advisors for each group.
            </p>

            {advisorLoading ? (
              <p>Loading class advisors...</p>
            ) : advisors.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No class advisors assigned yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "700" }}>Group</th>
                      <th style={{ textAlign: "left", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "700" }}>Advisor Name</th>
                      <th style={{ textAlign: "center", padding: "0.75rem 0.5rem", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "700" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advisors.map(adv => (
                      <tr key={adv._id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.75rem 0.5rem", fontWeight: "600" }}>
                          {adv.programme} - {adv.department} ({adv.year}/{adv.section})
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem" }}>
                          {adv.advisorName}
                        </td>
                        <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                            <button 
                              onClick={() => handleEditAdvisorClick(adv)} 
                              className="btn btn-secondary" 
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteAdvisor(adv._id)} 
                              className="btn btn-danger" 
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "announcements" && (
        <div className="admin-grid-2col">
          <div className="glass-card" style={{ padding: "2rem", height: "fit-content" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>📢 Publish Announcement</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Publish a notice for all students or target specific classes.
            </p>

            <form onSubmit={handleSaveAnnouncement}>
              <div className="input-group" style={{ marginBottom: "1rem" }}>
                <label className="input-label">Announcement Title</label>
                <input 
                  type="text" 
                  value={announcementFormData.title} 
                  onChange={e => setAnnouncementFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. CIA-I Exam Dates rescheduled" 
                  className="text-input" 
                  required
                />
              </div>

              <div className="input-row-2col" style={{ marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Category</label>
                  <select 
                    value={announcementFormData.category} 
                    onChange={e => setAnnouncementFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="select-input"
                  >
                    <option value="General">General</option>
                    <option value="Exam">Exam</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Fee">Fee</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Target Programme</label>
                  <select 
                    value={announcementFormData.targetProgramme} 
                    onChange={e => setAnnouncementFormData(prev => ({ ...prev, targetProgramme: e.target.value }))}
                    className="select-input"
                  >
                    <option value="All">All Programmes</option>
                    <option value="B.E">B.E</option>
                    <option value="B.Tech">B.Tech</option>
                  </select>
                </div>
              </div>

              <div className="input-row-2col" style={{ marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Target Department</label>
                  <input 
                    type="text" 
                    value={announcementFormData.targetDepartment} 
                    onChange={e => setAnnouncementFormData(prev => ({ ...prev, targetDepartment: e.target.value }))}
                    placeholder="e.g. CSE" 
                    className="text-input" 
                    required
                  />
                </div>
              </div>

              <div className="input-row-2col" style={{ marginBottom: "1.5rem" }}>
                <div className="input-group" style={{ display: "flex", flexDirection: "column" }}>
                  <label className="input-label">Target Year</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "0.5rem 0" }}>
                    {["All", "I", "II", "III", "IV"].map(year => (
                      <label key={year} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", fontSize: "0.9rem" }}>
                        <input 
                          type="checkbox" 
                          checked={announcementFormData.targetYear.includes(year)}
                          onChange={() => handleYearCheckboxChange(year)}
                          style={{ cursor: "pointer" }}
                        />
                        {year}
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="input-group" style={{ display: "flex", flexDirection: "column" }}>
                  <label className="input-label">Target Section</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", padding: "0.5rem 0" }}>
                    {["All", "A", "B", "C", "D", "E"].map(sec => (
                      <label key={sec} style={{ display: "flex", alignItems: "center", gap: "0.3rem", cursor: "pointer", fontSize: "0.9rem" }}>
                        <input 
                          type="checkbox" 
                          checked={announcementFormData.targetSection.includes(sec)}
                          onChange={() => handleSectionCheckboxChange(sec)}
                          style={{ cursor: "pointer" }}
                        />
                        {sec}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Circular Image (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  key={announcementFormData.image ? 'has-image' : 'no-image'}
                  onChange={handleImageChange}
                  className="text-input" 
                  style={{ padding: "0.5rem", background: "rgba(255,255,255,0.02)" }}
                />
                {announcementFormData.image && (
                  <div style={{ marginTop: "1rem", position: "relative", width: "fit-content" }}>
                    <img 
                      src={announcementFormData.image} 
                      alt="Preview" 
                      style={{ maxHeight: "150px", borderRadius: "12px", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-md)" }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setAnnouncementFormData(prev => ({ ...prev, image: null }))}
                      style={{ 
                        position: "absolute", 
                        top: "-8px", 
                        right: "-8px", 
                        background: "var(--danger)", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "50%", 
                        width: "20px", 
                        height: "20px", 
                        cursor: "pointer", 
                        display: "flex", 
                        alignItems: "center", 
                        justify: "center",
                        fontWeight: "bold",
                        fontSize: "14px",
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Announcement Content</label>
                <textarea 
                  value={announcementFormData.content} 
                  onChange={e => setAnnouncementFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter detailed announcement message..." 
                  className="text-input" 
                  rows="4"
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Publish Notice
              </button>
            </form>
          </div>

          <div className="glass-card" style={{ padding: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>📌 Published Notices</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              List of active notices on student bulletin boards.
            </p>

            {announcementLoading ? (
              <p>Loading notices...</p>
            ) : announcements.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No announcements published yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {announcements.map(ann => {
                  let badgeColor = "#9ca3af";
                  let badgeBg = "rgba(255, 255, 255, 0.05)";
                  if (ann.category === "Exam") {
                    badgeColor = "#f87171";
                    badgeBg = "rgba(239, 68, 68, 0.15)";
                  } else if (ann.category === "Holiday") {
                    badgeColor = "#34d399";
                    badgeBg = "rgba(16, 185, 129, 0.15)";
                  } else if (ann.category === "Fee") {
                    badgeColor = "#60a5fa";
                    badgeBg = "rgba(59, 130, 246, 0.15)";
                  }
                  return (
                    <div key={ann._id} style={{ 
                      padding: "1.25rem", 
                      borderRadius: "12px", 
                      background: "rgba(255,255,255,0.02)", 
                      border: "1px solid var(--border-color)",
                      position: "relative"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ 
                            fontSize: "0.75rem", 
                            fontWeight: "bold", 
                            color: badgeColor, 
                            background: badgeBg, 
                            padding: "0.2rem 0.5rem", 
                            borderRadius: "6px", 
                            textTransform: "uppercase" 
                          }}>
                            {ann.category}
                          </span>
                          <strong style={{ fontSize: "1.1rem" }}>{ann.title}</strong>
                        </div>
                        <button 
                          onClick={() => handleDeleteAnnouncement(ann._id)}
                          className="btn btn-danger"
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          Delete
                        </button>
                      </div>
                      <p style={{ fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "0.75rem", whiteSpace: "pre-line" }}>
                        {ann.content}
                      </p>
                      {ann.image && (
                        <div style={{ marginBottom: "0.75rem" }}>
                          <img 
                            src={ann.image} 
                            alt="Circular attachment" 
                            style={{ 
                              width: "50px", 
                              height: "50px", 
                              borderRadius: "50%", 
                              objectFit: "cover", 
                              border: "2px solid var(--border-color)",
                              cursor: "zoom-in"
                            }} 
                            onClick={() => {
                              const w = window.open();
                              w.document.write(`<img src="${ann.image}" style="max-width:100%; max-height:100vh; display:block; margin:auto; padding:20px;" />`);
                              w.document.title = ann.title;
                            }}
                          />
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "0.5rem" }}>
                        <span>
                          Target: <strong>
                            {(() => {
                              const prog = ann.targetProgramme || "All";
                              const dept = ann.targetDepartment || "All";
                              const years = Array.isArray(ann.targetYear) ? ann.targetYear.join(",") : (ann.targetYear || "All");
                              const secs = Array.isArray(ann.targetSection) ? ann.targetSection.join(",") : (ann.targetSection || "All");
                              if (prog === "All" && dept === "All" && years === "All" && secs === "All") {
                                return "Everyone";
                              }
                              return `${prog}/${dept}/Year: ${years}/Sec: ${secs}`;
                            })()}
                          </strong>
                        </span>
                        <span>By: {ann.createdBy} on {new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECURITY SETTINGS TAB */}
      {activeTab === "security" && (
        <div className="glass-card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-main)", marginBottom: "1.5rem" }}>Security Settings</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem", lineHeight: "1.6" }}>
            Set a custom security code for your admin account. You will need to enter this code during login. If you forget it, you can recover access by answering the security question below.
          </p>
          <form onSubmit={handleSaveSecurity} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="input-group">
              <label className="input-label">Security Code (PIN / Password)</label>
              <div style={{ position: "relative" }}>
                <input 
                  type={showSecurityCode ? "text" : "password"} 
                  value={securityForm.code}
                  onChange={e => setSecurityForm({...securityForm, code: e.target.value})}
                  className="text-input"
                  placeholder="Leave blank to disable"
                  disabled={securityLoading}
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecurityCode(!showSecurityCode)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", padding: "4px" }}
                  title={showSecurityCode ? "Hide code" : "Show code"}
                >
                  {showSecurityCode ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Recovery Security Question</label>
              <input 
                type="text" 
                value={securityForm.question}
                onChange={e => setSecurityForm({...securityForm, question: e.target.value})}
                className="text-input"
                placeholder="e.g. What is your pet's name?"
                disabled={securityLoading}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Security Answer</label>
              <div style={{ position: "relative" }}>
                <input 
                  type={showSecurityAnswer ? "text" : "password"} 
                  value={securityForm.answer}
                  onChange={e => setSecurityForm({...securityForm, answer: e.target.value})}
                  className="text-input"
                  placeholder="Your Answer"
                  disabled={securityLoading}
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--primary)", display: "flex", alignItems: "center", padding: "4px" }}
                  title={showSecurityAnswer ? "Hide answer" : "Show answer"}
                >
                  {showSecurityAnswer ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {securityMessage && (
              <div style={{ padding: "1rem", borderRadius: "8px", background: securityMessage.includes("success") ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: securityMessage.includes("success") ? "#34d399" : "#f87171" }}>
                {securityMessage}
              </div>
            )}
            <button type="submit" disabled={securityLoading} className="btn btn-primary" style={{ padding: "1rem", justifyContent: "center" }}>
              {securityLoading ? "Saving..." : "Save Security Settings"}
            </button>
          </form>

          <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px dashed rgba(239, 68, 68, 0.3)" }}>
            <h3 style={{ color: "var(--danger)", fontSize: "1.2rem", marginBottom: "0.5rem" }}>⚠️ Danger Zone</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Clicking this button will instantly revoke all active administrative sessions across all other devices. Your current session will remain active.
            </p>
            <button onClick={handleRevokeOthers} className="btn" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid var(--danger)", padding: "0.8rem 1.5rem", width: "100%", justifyContent: "center" }}>
              🔒 Logout Every Other System
            </button>
          </div>
        </div>
      )}
      {/* LETTER TEMPLATE TAB */}
      {activeTab === "lettertemplate" && (
        <div style={{ maxWidth: 850 }}>
          <div className="glass-card" style={{ padding: "2rem" }}>
            <h3 style={{ marginBottom: "0.25rem", fontWeight: 700 }}>📝 Parent Letter Template Builder</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", marginBottom: "1.5rem" }}>
              Configure the text and table columns for the printed Parent Letters. You can dynamically build the marks table to include multiple exams (like CIA I and CIA II) in a single letter.
            </p>
            <form onSubmit={handleSaveLetterTemplate}>
              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Header Logo (Upload Image)</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ marginBottom: "10px" }} />
                {letterTemplate.headerLogo && (
                  <div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "4px" }}>Current Logo Preview:</p>
                    <img src={letterTemplate.headerLogo} alt="Header Logo Preview" style={{ maxHeight: "80px", objectFit: "contain", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "4px", background: "white" }} />
                  </div>
                )}
              </div>

              <div className="admin-grid-2col" style={{ gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { label: "IQAC / Reference Prefix", key: "iqacNo", placeholder: "e.g. MEC/IQAC/2026-27/COE/", hint: "Prints exactly as typed" },
                  { label: "Exam Description (English)", key: "examDescription", placeholder: "End Semester Examination..." },
                  { label: "Letter Title", key: "letterTitle", placeholder: "STATEMENT OF GRADES" },
                  { label: "College Tamil Name", key: "collegeTamilName", placeholder: "முத்தாயம்மால்..." },
                  { label: "Manual Date (Optional)", key: "letterDate", placeholder: "e.g. 29.04.2026", hint: "Leave empty for auto-date" },
                ].map(({ label, key, placeholder, hint }) => (
                  <div className="input-group" key={key}>
                    <label className="input-label">{label}</label>
                    <input type="text" className="text-input" placeholder={placeholder}
                      value={letterTemplate[key] || ""}
                      onChange={e => setLetterTemplate(t => ({ ...t, [key]: e.target.value }))} />
                    {hint && <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>💡 {hint}</p>}
                  </div>
                ))}
              </div>

              <div className="input-group">
                <label className="input-label">English Greeting (use {`{examDescription}`} as placeholder)</label>
                <textarea className="text-input" rows={2}
                  value={letterTemplate.englishGreeting || ""}
                  onChange={e => setLetterTemplate(t => ({ ...t, englishGreeting: e.target.value }))}
                  style={{ resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div className="input-group">
                <label className="input-label">Tamil Greeting (2 lines)</label>
                <textarea className="text-input" rows={3}
                  value={letterTemplate.tamilGreeting || ""}
                  onChange={e => setLetterTemplate(t => ({ ...t, tamilGreeting: e.target.value }))}
                  style={{ resize: "vertical", fontFamily: "inherit" }} />
              </div>

              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Attendance Source Exam</label>
                <select className="text-input" 
                  value={letterTemplate.attendanceSourceExam || "[Selected Exam]"}
                  onChange={e => setLetterTemplate(t => ({ ...t, attendanceSourceExam: e.target.value }))}
                  style={{ cursor: "pointer" }}>
                  <option value="[Selected Exam]">[Selected Exam] (Dynamic based on Parent Letter filter)</option>
                  {dynamicExamNameOptions.map(opt => <option key={opt} value={opt}>{opt === "ESE" ? "End Semester Examination" : opt}</option>)}
                </select>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>💡 Choose which exam's attendance should be printed on the letter.</p>
              </div>

              <div className="admin-grid-2col" style={{ gap: "1rem", marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Note Title (English)</label>
                  <input type="text" className="text-input" placeholder="e.g. Note:"
                    value={letterTemplate.noteTitleEnglish || ""}
                    onChange={e => setLetterTemplate(t => ({ ...t, noteTitleEnglish: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Note Title (Tamil)</label>
                  <input type="text" className="text-input" placeholder="e.g. குறிப்பு:"
                    value={letterTemplate.noteTitleTamil || ""}
                    onChange={e => setLetterTemplate(t => ({ ...t, noteTitleTamil: e.target.value }))} />
                </div>
              </div>

              <div className="admin-grid-2col" style={{ gap: "1rem", marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Note (English) - Use {`{passMark}`} or {`{maxMark}`}</label>
                  <textarea className="text-input" rows={3}
                    value={letterTemplate.noteEnglish || ""}
                    onChange={e => setLetterTemplate(t => ({ ...t, noteEnglish: e.target.value }))}
                    style={{ resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div className="input-group">
                  <label className="input-label">குறிப்பு (Tamil Note) - Use {`{passMark}`} or {`{maxMark}`}</label>
                  <textarea className="text-input" rows={3}
                    value={letterTemplate.noteTamil || ""}
                    onChange={e => setLetterTemplate(t => ({ ...t, noteTamil: e.target.value }))}
                    style={{ resize: "vertical", fontFamily: "inherit" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                {[
                  { label: "Signature Left (e.g. MENTOR)", key: "signatureLeft" },
                  { label: "Signature Middle (e.g. HOD)", key: "signatureMiddle" },
                  { label: "Signature Right (e.g. PRINCIPAL)", key: "signatureRight" },
                ].map(({ label, key }) => (
                  <div className="input-group" key={key}>
                    <label className="input-label">{label}</label>
                    <textarea className="text-input" rows={2}
                      value={letterTemplate[key] || ""}
                      onChange={e => setLetterTemplate(t => ({ ...t, [key]: e.target.value }))}
                      style={{ resize: "vertical", fontFamily: "inherit", textAlign: "center" }} />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(99,102,241,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0, color: "var(--text-muted)" }}>📊 Dynamic Table Builder</h4>
                  <button type="button" onClick={handleAddColumn} style={{ padding: "6px 12px", background: "rgba(99,102,241,0.1)", color: "var(--primary)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>
                    + Add Column
                  </button>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  Configure the columns that will appear in the printed marks table. To combine multiple exams (like CIA I & II), add multiple columns and set their Target Exam.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(letterTemplate.columns || []).map((col, idx) => (
                    <div key={col.id || idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "rgba(15,23,42,0.5)", padding: "0.5rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ width: "24px", color: "#64748b", fontWeight: "bold", textAlign: "center" }}>{idx + 1}.</div>
                      
                      <div style={{ flex: 1 }}>
                        <input type="text" className="text-input" placeholder="Column Header (e.g. CIA 1 Marks)"
                          value={col.header} onChange={e => handleUpdateColumn(idx, "header", e.target.value)}
                          style={{ padding: "0.5rem", fontSize: "0.85rem" }} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <select className="select-input" value={col.type} onChange={e => handleUpdateColumn(idx, "type", e.target.value)}
                          style={{ padding: "0.5rem", fontSize: "0.85rem", height: "auto" }}>
                          <option value="sno">Serial Number (S.No)</option>
                          <option value="courseName">Course Name</option>
                          <option value="courseCode">Course Code</option>
                          <option value="mark">Exam Mark</option>
                          <option value="grade">Letter Grade</option>
                          <option value="result">Pass/Fail Result</option>
                        </select>
                      </div>

                      {["mark", "grade", "result"].includes(col.type) ? (
                        <div style={{ flex: 1 }}>
                          <select className="select-input" value={col.examName || ""} onChange={e => handleUpdateColumn(idx, "examName", e.target.value)}
                            style={{ padding: "0.5rem", fontSize: "0.85rem", height: "auto" }}>
                            <option value="">-- Target Exam --</option>
                            <option value="[Selected Exam]" style={{ fontWeight: "bold", color: "#6366f1" }}>⭐ [Selected in Parent Letter Tab]</option>
                            <option value="Model Exam">Model Exam</option>
                            <option value="Model Practical Exam">Model Practical Exam</option>
                            <option value="Unit Test - I">Unit Test - I</option>
                            <option value="Unit Test - II">Unit Test - II</option>
                            <option value="Unit Test - III">Unit Test - III</option>
                            <option value="Unit Test - IV">Unit Test - IV</option>
                            <option value="Unit Test - V">Unit Test - V</option>
                            <option value="CIA - I">CIA - I</option>
                            <option value="CIA - II">CIA - II</option>
                            <option value="CIA - III">CIA - III</option>
                            <option value="MKC">MKC</option>
                            <option value="ESE">End Semester Examination</option>
                          </select>
                        </div>
                      ) : (
                        <div style={{ flex: 1, opacity: 0.3, fontSize: "0.8rem", paddingLeft: "0.5rem" }}>N/A (Auto-filled)</div>
                      )}

                      <button type="button" onClick={() => handleRemoveColumn(idx)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.5rem" }} title="Remove Column">
                        ✕
                      </button>
                    </div>
                  ))}
                  {(letterTemplate.columns || []).length === 0 && (
                    <div style={{ textAlign: "center", padding: "1rem", color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                      No columns defined. The table will be empty! Add columns above.
                    </div>
                  )}
                </div>
              </div>

              {letterMessage && (
                <div style={{ padding: "0.9rem", borderRadius: 8, marginTop: "1.5rem",
                  background: letterMessage.includes("success") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  color: letterMessage.includes("success") ? "#34d399" : "#f87171" }}>
                  {letterMessage}
                </div>
              )}
              <button type="submit" disabled={letterLoading} className="btn btn-primary" style={{ marginTop: "1.5rem", padding: "1rem", justifyContent: "center", width: "100%" }}>
                {letterLoading ? "Saving Template..." : "💾 Save Letter Template & Table Structure"}
              </button>
            </form>
          </div>
        </div>
      )}



      {activeTab === "eseList" && (
        <div className="fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ color: "var(--text-primary)", margin: 0 }}>Uploaded Classes</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <input 
                type="text" 
                placeholder="Search class name..." 
                value={eseListSearch} 
                onChange={e => setEseListSearch(e.target.value)} 
                className="text-input" 
                style={{ width: "250px", padding: "0.5rem" }} 
              />
              <select
                value={eseListExamFilter}
                onChange={e => setEseListExamFilter(e.target.value)}
                className="text-input"
                style={{ width: "200px", padding: "0.5rem" }}
              >
                <option value="">All Exams</option>
                {Array.from(new Set(classes.map(c => c.examName))).filter(Boolean).map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>
          </div>

          {!eseListEditClass ? (
            <div className="table-container" style={{ background: "var(--surface)", borderRadius: "16px", padding: "1rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Class Name</th>
                    <th>Exam Name</th>
                    <th>Total Students</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes
                    .filter(c => c.className.toLowerCase().includes(eseListSearch.toLowerCase()) && (eseListExamFilter === "" || c.examName === eseListExamFilter))
                    .map((c, i) => (
                    <tr key={i}>
                      <td>{c.className}</td>
                      <td>
                        <span className="badge" style={{ background: c.examName === "ESE" ? "rgba(16, 185, 129, 0.1)" : "rgba(99, 102, 241, 0.1)", color: c.examName === "ESE" ? "#10b981" : "#6366f1", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "bold" }}>
                          {c.examName === "ESE" ? "End Semester Examination" : c.examName}
                        </span>
                      </td>
                      <td>{c.students?.length || 0}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }} onClick={() => openEseListEdit(c)}>Edit</button>
                          <button className="btn btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }} onClick={() => handleEseListDelete(c.className)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classes.filter(c => c.className.toLowerCase().includes(eseListSearch.toLowerCase()) && (eseListExamFilter === "" || c.examName === eseListExamFilter)).length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>No classes found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="fade-in" style={{ background: "var(--surface)", borderRadius: "16px", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Editing: {eseListEditClass.className}</h3>
                <button className="btn btn-secondary" onClick={() => setEseListEditClass(null)}>Back to List</button>
              </div>

              {isStrictAdmin && (eseListEditClass.subjects || []).length > 0 && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px",
                  padding: "0.85rem 1rem",
                  marginBottom: "1rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  background: "rgba(239, 68, 68, 0.06)"
                }}>
                  <span style={{ fontWeight: "700", color: "#ef4444", fontSize: "0.88rem" }}>
                    🛡️ Clear Subject Marks:
                  </span>
                  <select
                    className="select-input"
                    value={eseClearSubjectIdx}
                    onChange={(e) => setEseClearSubjectIdx(Number(e.target.value))}
                    style={{ minWidth: "220px", maxWidth: "340px", padding: "0.4rem 0.6rem" }}
                  >
                    {(eseListEditClass.subjects || []).map((_, idx) => (
                      <option key={idx} value={idx}>
                        {getSubjectLabel(eseListEditClass, idx)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={eseIsClearing}
                    onClick={() => setEseClearModalOpen(true)}
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderRadius: "8px",
                      border: "none",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontWeight: "700",
                      cursor: eseIsClearing ? "not-allowed" : "pointer",
                      fontSize: "0.85rem"
                    }}
                  >
                    🧹 Clear
                  </button>
                  {eseLastClearBackup && eseLastClearBackup.className === eseListEditClass.className && (
                    <button
                      type="button"
                      disabled={eseIsClearing}
                      onClick={handleUndoEseSubjectClear}
                      style={{
                        padding: "0.45rem 0.9rem",
                        borderRadius: "8px",
                        border: "1px solid #f59e0b",
                        background: "rgba(245, 158, 11, 0.14)",
                        color: "#d97706",
                        fontWeight: "700",
                        cursor: eseIsClearing ? "not-allowed" : "pointer",
                        fontSize: "0.85rem"
                      }}
                    >
                      ↩️ Undo Clear ({eseLastClearBackup.subjectCode} - {eseLastClearBackup.count})
                    </button>
                  )}
                </div>
              )}

              <SubjectClearModal
                isOpen={isStrictAdmin && eseClearModalOpen}
                onClose={() => setEseClearModalOpen(false)}
                classData={eseListEditClass ? {
                  ...eseListEditClass,
                  students: (eseListEditClass.students || []).map(s => ({
                    ...s,
                    marks: eseListMarks[s.regNo] || s.marks || []
                  }))
                } : null}
                selectedSubjectIdx={eseClearSubjectIdx}
                onSelectSubjectIdx={setEseClearSubjectIdx}
                onConfirmClear={handleConfirmEseSubjectClear}
                isClearing={eseIsClearing}
              />

              <div className="table-container" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                <table className="admin-table">
                  <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--surface)" }}>
                    <tr>
                      <th>Reg No</th>
                      <th>Name</th>
                      <th>Attendance %</th>
                      {eseListEditClass.subjects?.map((sub, i) => (
                        <th key={i}>{sub}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eseListEditClass.students.map((s, idx) => (
                      <tr key={idx}>
                        <td>{s.regNo}</td>
                        <td>{s.name}</td>
                        <td>
                          <input 
                            type="text" 
                            className="text-input" 
                            style={{ width: "70px", padding: "0.3rem" }} 
                            value={eseListAttendance[s.regNo] || ""}
                            onChange={(e) => setEseListAttendance(prev => ({ ...prev, [s.regNo]: e.target.value }))}
                          />
                        </td>
                        {eseListEditClass.subjects?.map((sub, sIdx) => (
                          <td key={sIdx}>
                            <input 
                              type="text" 
                              className="text-input" 
                              style={{ width: "60px", padding: "0.3rem" }} 
                              value={eseListMarks[s.regNo]?.[sIdx] !== undefined ? eseListMarks[s.regNo][sIdx] : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEseListMarks(prev => {
                                  const arr = [...(prev[s.regNo] || [])];
                                  arr[sIdx] = val;
                                  return { ...prev, [s.regNo]: arr };
                                });
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button className="btn btn-primary" onClick={handleEseListSave} disabled={eseListSaving}>
                  {eseListSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT SETTINGS TAB */}
      {activeTab === "reportsettings" && (
        <div className="admin-grid-1col fade-in">
          <div className="glass-card" style={{ padding: "2rem" }}>
            <h2 className="section-title">Report Settings</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "0.95rem" }}>
              Configure the IQAC Prefix, Academic Year headings, and Action Taken Report subjects per specific Class and Exam combination.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div className="form-group">
                <label className="input-label">Year</label>
                <select className="select-input" value={reportSettingsFilter.year} onChange={e => setReportSettingsFilter({...reportSettingsFilter, year: e.target.value})}>
                  {["I", "II", "III", "IV"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Semester</label>
                <select className="select-input" value={reportSettingsFilter.semester} onChange={e => setReportSettingsFilter({...reportSettingsFilter, semester: e.target.value})}>
                  {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Section</label>
                <select className="select-input" value={reportSettingsFilter.section} onChange={e => setReportSettingsFilter({...reportSettingsFilter, section: e.target.value})}>
                  {["A", "B", "C", "D", "E"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Exam Name</label>
                <select className="select-input" value={reportSettingsFilter.examName} onChange={e => setReportSettingsFilter({...reportSettingsFilter, examName: e.target.value})}>
                  {dynamicExamNameOptions.map(ex => <option key={ex} value={ex}>{ex === "ESE" ? "End Semester Examination" : ex}</option>)}
                </select>
              </div>
            </div>

            {reportSettingsLoading ? (
              <p>Loading...</p>
            ) : !reportSettingsClassId ? (
              <p style={{ color: "#ef4444", fontWeight: "bold" }}>Class not found for the selected criteria. Please create it first in the Class Setup tab.</p>
            ) : (
              <div style={{ background: "rgba(255,255,255,0.02)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="input-label">IQAC / Reference Prefix</label>
                  <input
                    type="text"
                    className="text-input"
                    value={reportSettingsData.iqacPrefix}
                    onChange={e => setReportSettingsData({ ...reportSettingsData, iqacPrefix: e.target.value })}
                    placeholder="e.g., MEC/IQAC/2026-27/COE/"
                  />
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Prefix used for reports like Result Analysis and Mark Statement.</p>
                </div>
                
                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="input-label">Academic Year Text</label>
                  <input
                    type="text"
                    className="text-input"
                    value={reportSettingsData.academicYearText}
                    onChange={e => setReportSettingsData({ ...reportSettingsData, academicYearText: e.target.value })}
                    placeholder="e.g.,  (2026-27)"
                  />
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>Text appended to the heading below OFFICE OF CONTROLLER OF EXAMINATIONS (e.g., "MARK STATEMENT (2026-27)").</p>
                </div>

                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="input-label">Subjects for Action Taken Report (Result Analysis)</label>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px" }}>Select the subjects to display in the Action Taken Report. If none are selected, all subjects will be displayed by default.</p>
                  
                  {reportSettingsClassSubjects.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
                      {reportSettingsClassSubjects.map(sub => (
                        <label key={sub} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px" }}>
                          <input 
                            type="checkbox"
                            checked={reportSettingsData.actionTakenSubjects.includes(sub)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setReportSettingsData(prev => {
                                const newSubjects = checked 
                                  ? [...prev.actionTakenSubjects, sub]
                                  : prev.actionTakenSubjects.filter(s => s !== sub);
                                return { ...prev, actionTakenSubjects: newSubjects };
                              });
                            }}
                          />
                          <span style={{ fontSize: "0.9rem" }}>{sub}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.9rem", color: "#ef4444" }}>No subjects found for this class.</p>
                  )}
                </div>

                {reportSettingsMessage && (
                  <p style={{ color: reportSettingsMessage.includes("Error") || reportSettingsMessage.includes("Failed") ? "#ef4444" : "#10b981", marginBottom: "1rem", fontWeight: "bold" }}>
                    {reportSettingsMessage}
                  </p>
                )}

                <button className="btn btn-primary" onClick={handleSaveReportSettings} disabled={reportSettingsLoading}>
                  {reportSettingsLoading ? "Saving..." : "Save Report Settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEATING ARRANGEMENT TAB */}
      {activeTab === "seating" && (
        <div className="admin-grid-1col fade-in">
           <SeatingManager />
        </div>
      )}

      {/* ATTENDANCE TRACKER TAB */}
      {activeTab === "attendance-tracker" && (
        <div className="admin-grid-1col fade-in">
           <AttendanceReportsContainer />
        </div>
      )}

      {/* INTERNAL MARKS TEMPLATE TAB */}
      {activeTab === "internal-marks" && (
        <div className="admin-grid-1col fade-in">
           <InternalMarkTemplateSetup />
        </div>
      )}

      {/* TIMETABLE & WORKLOAD ALLOCATION TAB */}
      {activeTab === "timetable" && (
        <div className="admin-grid-1col fade-in">
           <TimetableManager />
        </div>
      )}


      {/* Pending Students Modal */}
      {selectedPendingData && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: "90%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto", position: "relative" }}>
            <button 
              onClick={() => setSelectedPendingData(null)}
              style={{ position: "absolute", top: "10px", right: "15px", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}
            >&times;</button>
            <h3 style={{ marginBottom: "0.5rem" }}>Pending Students</h3>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
              Course: <strong>{selectedPendingData.courseName} ({selectedPendingData.courseCode})</strong> <br/>
              Class: <strong>{selectedPendingData.className}</strong>
            </p>
            
            <div className="table-container" style={{ marginBottom: "1.5rem" }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        checked={selectedPendingStudents.length === selectedPendingData.pendingStudents.length && selectedPendingData.pendingStudents.length > 0}
                        onChange={handlePendingStudentSelectAll}
                      />
                    </th>
                    <th>S.No</th>
                    <th>Register Number</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPendingData.pendingStudents.map((s, idx) => (
                    <tr key={idx}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedPendingStudents.includes(s.regNo)}
                          onChange={() => handlePendingStudentCheckboxChange(s.regNo)}
                        />
                      </td>
                      <td>{idx + 1}</td>
                      <td>{s.regNo}</td>
                      <td>{s.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setSelectedPendingData(null)}
                disabled={pendingModalLoading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleMarkSelectedPendingAsAB}
                disabled={pendingModalLoading || selectedPendingStudents.length === 0}
                style={{ background: "var(--danger)", borderColor: "var(--danger)", opacity: selectedPendingStudents.length === 0 ? 0.5 : 1 }}
              >
                {pendingModalLoading ? "Marking..." : "Mark Selected as Absent (AB)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TRACKER TAB */}
      {activeTab === "attendance-tracker" && (
        <>
          <div className="glass-card" style={{ padding: "2rem", marginTop: "2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Attendance Report</h2>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Year</label>
                <select 
                  className="select-input" 
                  value={reportYear}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    setReportYear(newYear);
                    setReportSem(getSemOptionsForYear(newYear)[0]);
                  }}
                  style={{ minWidth: "100px", padding: "6px 12px" }}
                >
                  <option value="I">I Year</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                  <option value="IV">IV Year</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>Semester</label>
                <select 
                  className="select-input" 
                  value={reportSem}
                  onChange={(e) => setReportSem(e.target.value)}
                  style={{ minWidth: "100px", padding: "6px 12px" }}
                >
                  {getSemOptionsForYear(reportYear).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label" style={{ fontSize: "0.8rem", marginBottom: "4px" }}>As of Date</label>
                <input 
                  type="date" 
                  className="text-input"
                  value={reportAsOfDate}
                  onChange={(e) => setReportAsOfDate(e.target.value)}
                  style={{ padding: "6px 12px" }}
                />
              </div>
              <button 
                className="btn btn-primary" 
                onClick={loadAttendanceReport}
                disabled={attendanceReportLoading}
                style={{ height: "40px" }}
              >
                {attendanceReportLoading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {!attendanceReportData && !attendanceReportLoading && (
            <div className="empty-state">
              <p>Select Year, Semester, and Date to generate the report.</p>
            </div>
          )}

          {attendanceReportLoading && <div className="loading-spinner"></div>}

          {attendanceReportData && attendanceReportData.sections.length === 0 && (
            <div className="empty-state">
              <p>No data found for this selection.</p>
            </div>
          )}

          {attendanceReportData && attendanceReportData.sections.length > 0 && (
            <>
              <div className="table-container" style={{ marginBottom: "2rem" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th rowSpan="2">Section</th>
                      <th rowSpan="2" style={{ textAlign: "right" }}>Strength</th>
                      <th colSpan="4" style={{ textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Morning Session</th>
                      <th colSpan="4" style={{ textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>Afternoon Session</th>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--primary)" }}>Pre</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--danger)" }}>Abs</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--warning)" }}>OD</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem" }}>%</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--primary)", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>Pre</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--danger)" }}>Abs</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem", color: "var(--warning)" }}>OD</th>
                      <th style={{ textAlign: "right", fontSize: "0.8rem" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReportData.sections.map(sec => (
                      <tr key={sec.section}>
                        <td style={{ fontWeight: "600", fontSize: "1.1rem" }}>{sec.section}</td>
                        {!sec.isMarked ? (
                          <td colSpan="9" style={{ textAlign: "center", color: "var(--danger)", fontWeight: "600", background: "rgba(239, 68, 68, 0.05)" }}>
                            Attendance Not Marked
                          </td>
                        ) : (
                          <>
                            <td style={{ textAlign: "right", fontWeight: "600" }}>{sec.totalStrength}</td>
                            
                            {/* Morning Session */}
                            {!(sec.mrg && sec.mrg.isMarked) ? (
                                <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>Not Marked</td>
                            ) : (
                                <>
                                  <td style={{ textAlign: "right", color: "var(--primary)", fontWeight: "600" }}>{sec.mrg?.totalPresent}</td>
                                  <td style={{ textAlign: "right", color: "var(--danger)" }}>{sec.mrg?.totalAbsent}</td>
                                  <td style={{ textAlign: "right", color: "var(--warning)" }}>{sec.mrg?.totalOD}</td>
                                  <td style={{ textAlign: "right", fontWeight: "bold" }}>
                                    <span style={{ 
                                      padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem",
                                      background: parseFloat(sec.mrg?.percentage || 0) < 75 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                      color: parseFloat(sec.mrg?.percentage || 0) < 75 ? "var(--danger)" : "#10b981"
                                    }}>{sec.mrg?.percentage || "0.00"}%</span>
                                  </td>
                                </>
                            )}

                            {/* Afternoon Session */}
                            {!(sec.aft && sec.aft.isMarked) ? (
                                <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>Not Marked</td>
                            ) : (
                                <>
                                  <td style={{ textAlign: "right", color: "var(--primary)", fontWeight: "600", borderLeft: "1px solid rgba(255,255,255,0.05)" }}>{sec.aft?.totalPresent}</td>
                                  <td style={{ textAlign: "right", color: "var(--danger)" }}>{sec.aft?.totalAbsent}</td>
                                  <td style={{ textAlign: "right", color: "var(--warning)" }}>{sec.aft?.totalOD}</td>
                                  <td style={{ textAlign: "right", fontWeight: "bold" }}>
                                    <span style={{ 
                                      padding: "2px 6px", borderRadius: "4px", fontSize: "0.8rem",
                                      background: parseFloat(sec.aft?.percentage || 0) < 75 ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                      color: parseFloat(sec.aft?.percentage || 0) < 75 ? "var(--danger)" : "#10b981"
                                    }}>{sec.aft?.percentage || "0.00"}%</span>
                                  </td>
                                </>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Summary Card */}
              <div style={{ 
                background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)", 
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: "var(--radius-lg)",
                padding: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-main)", fontSize: "1.5rem" }}>
                      Year Overall Summary
                    </h3>
                    <p style={{ margin: 0, color: "var(--text-muted)" }}>
                      Cumulative statistics for Year {reportYear}, Semester {reportSem}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Overall Combined Percentage</div>
                    <div style={{ 
                      fontSize: "2rem", 
                      fontWeight: "bold", 
                      color: parseFloat(attendanceReportData.total.percentage) < 75 ? "var(--danger)" : "#10b981" 
                    }}>
                      {attendanceReportData.total.percentage}%
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  
                  {/* Total Strength Box */}
                  <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Total Strength</div>
                    <div style={{ fontSize: "2.5rem", fontWeight: "bold" }}>{attendanceReportData.total.totalStrength}</div>
                  </div>

                  {/* Morning Session Box */}
                  <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", fontWeight: "600" }}>Morning Session</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Present</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary)" }}>{attendanceReportData.total.mrg?.totalPresent || 0}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Absent</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--danger)" }}>{attendanceReportData.total.mrg?.totalAbsent || 0}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Percentage</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: parseFloat(attendanceReportData.total.mrg?.percentage || 0) < 75 ? "var(--danger)" : "#10b981" }}>{attendanceReportData.total.mrg?.percentage || "0.00"}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Afternoon Session Box */}
                  <div style={{ background: "var(--bg-card)", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "1px", textAlign: "center", fontWeight: "600" }}>Afternoon Session</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Present</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--primary)" }}>{attendanceReportData.total.aft?.totalPresent || 0}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Absent</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--danger)" }}>{attendanceReportData.total.aft?.totalAbsent || 0}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Percentage</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: parseFloat(attendanceReportData.total.aft?.percentage || 0) < 75 ? "var(--danger)" : "#10b981" }}>{attendanceReportData.total.aft?.percentage || "0.00"}%</div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          <AttendanceReportsContainer />

          <div className="admin-grid-2col" style={{ gridTemplateColumns: "1fr 2fr" }}>
            <div className="glass-card" style={{ padding: "2rem", height: "fit-content" }}>
              <h2 className="section-title">Configure Working Days</h2>
              <form onSubmit={handleSaveWorkingDays}>
                <div className="input-group">
                  <label className="input-label">Year</label>
                  <select 
                    className="select-input" 
                    value={wdFormData.year} 
                    onChange={(e) => setWdFormData({...wdFormData, year: e.target.value})}
                  >
                    <option value="I">I Year</option>
                    <option value="II">II Year</option>
                    <option value="III">III Year</option>
                    <option value="IV">IV Year</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Start Date</label>
                  <input 
                    type="date" 
                    className="text-input"
                    required 
                    value={wdFormData.startDate} 
                    onChange={(e) => setWdFormData({...wdFormData, startDate: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">End Date</label>
                  <input 
                    type="date" 
                    className="text-input" 
                    required
                    value={wdFormData.endDate} 
                    onChange={(e) => setWdFormData({...wdFormData, endDate: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Save Configuration</button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: "2rem" }}>
              <h2 className="section-title">Current Configurations</h2>
              {workingDaysLoading ? (
                <p>Loading...</p>
              ) : workingDays.length === 0 ? (
                <p className="empty-state">No configurations found.</p>
              ) : (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workingDays.map(wd => (
                        <tr key={wd._id}>
                          <td style={{ fontWeight: "600" }}>{wd.year} Year</td>
                          <td>{wd.startDate}</td>
                          <td>{wd.endDate}</td>
                          <td>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                              onClick={() => setWdFormData({ year: wd.year, startDate: wd.startDate, endDate: wd.endDate })}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 className="section-title" style={{ margin: 0 }}>Missing Attendance Report</h2>
              <button className="btn btn-primary" onClick={loadMissingAttendance} disabled={missingLoading}>
                {missingLoading ? "Refreshing..." : "Refresh Report"}
              </button>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <select 
                  className="select-input" 
                  value={missingReportYear}
                  onChange={(e) => setMissingReportYear(e.target.value)}
                  style={{ minWidth: "150px", padding: "8px 12px" }}
                >
                  <option value="">-- Select Year --</option>
                  <option value="I">I Year</option>
                  <option value="II">II Year</option>
                  <option value="III">III Year</option>
                  <option value="IV">IV Year</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Filter by Date or Class..." 
                  className="text-input" 
                  value={missingSearchQuery}
                  onChange={(e) => setMissingSearchQuery(e.target.value)}
                  style={{ width: "250px", padding: "8px 12px" }}
                />
              </div>
            </div>

            {missingLoading ? (
              <div className="loading-spinner"></div>
            ) : !missingReportYear ? (
              <div className="empty-state">
                <p>Please select a Year to view missing attendance.</p>
              </div>
            ) : missingAttendance.length === 0 ? (
              <div className="empty-state">
                <EyeOff size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <h3>All caught up!</h3>
                <p>No missing attendance records found.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Class (Cohort)</th>
                      <th>Missing Session</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingAttendance
                      .filter(item => item.cohortName.includes(`- ${missingReportYear}/`))
                      .filter(item => 
                        item.date.includes(missingSearchQuery) || 
                        item.cohortName.toLowerCase().includes(missingSearchQuery.toLowerCase())
                      )
                      .map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: "600", color: "var(--danger)" }}>{item.date}</td>
                        <td>{item.cohortName}</td>
                        <td>
                          <span className="status-badge pending" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
                            {item.missingSession}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: "var(--danger)", fontWeight: "600" }}>Not Submitted</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
        </>
      )}

      {/* ── BULK CLONE & GENERATE MODAL (OPTION 1) ── */}
      {showBulkCloneModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "960px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.75rem",
              borderBottom: "1px solid var(--border-color)",
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(219, 39, 119, 0.12) 100%)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.5rem" }}>⚡</span>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-primary)", fontWeight: "700" }}>
                    Bulk Clone &amp; Multi-Class Generator
                  </h2>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Source: <strong style={{ color: "var(--primary)" }}>{formData.programme}-{formData.department} • {formData.year} Year / Sem {formData.semester} / Sec {formData.section} ({formData.examName})</strong>
                  &nbsp;•&nbsp; <span>{courseDetails.length} Courses</span>
                  &nbsp;•&nbsp; <span>{students.length} Students</span>
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowBulkCloneModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* STEP 1: Current Exam & Other exams for Source Section */}
              <div style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "1.25rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "6px" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>1️⃣</span> Exams to Save / Generate for Section <strong>{formData.section}</strong>
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Same Students &amp; Faculty • Preserves Current Pass/Max Marks</span>
                </div>

                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: cloneIncludeSourceCurrentExam ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
                    border: `1px solid ${cloneIncludeSourceCurrentExam ? "var(--success)" : "var(--border-color)"}`,
                    cursor: "pointer",
                    fontSize: "0.85rem"
                  }}>
                    <input
                      type="checkbox"
                      checked={cloneIncludeSourceCurrentExam}
                      onChange={e => setCloneIncludeSourceCurrentExam(e.target.checked)}
                    />
                    <strong>Include Active Exam: {formData.examName}</strong>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      (Pass {formData.passMark} / Max {formData.markPerSubject})
                    </span>
                  </label>
                </div>

                <p style={{ margin: "0 0 0.65rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Optionally also generate additional evaluation models for Section {formData.section}:
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {dynamicExamNameOptions.filter(ex => ex !== formData.examName).map(ex => {
                    const isChecked = cloneTargetExamsForSource.includes(ex);
                    const def = getDefaultMarks(ex);
                    return (
                      <label 
                        key={ex} 
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "7px",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          background: isChecked ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${isChecked ? "var(--primary)" : "var(--border-color)"}`,
                          cursor: "pointer",
                          userSelect: "none",
                          fontSize: "0.82rem"
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setCloneTargetExamsForSource([...cloneTargetExamsForSource, ex]);
                            else setCloneTargetExamsForSource(cloneTargetExamsForSource.filter(x => x !== ex));
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        <strong>{ex}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>({def.passMark}/{def.markPerSubject})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: Replicate to Other Sections */}
              <div style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                padding: "1.25rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "6px" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>2️⃣</span> Replicate to Other Sections
                  </h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Auto-Loads Each Section's Master Roster</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Target Sections:</span>
                  {getSectionsForCohort(formData.year, formData.semester, formData.department, formData.programme).filter(s => s !== formData.section).map(sec => {
                    const isChecked = cloneTargetSections.includes(sec);
                    const studentCount = getRosterCountForSection(formData.year, formData.semester, sec, formData.department, formData.programme);
                    return (
                      <label 
                        key={sec}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: isChecked ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${isChecked ? "var(--success)" : "var(--border-color)"}`,
                          cursor: "pointer",
                          userSelect: "none",
                          fontSize: "0.85rem"
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setCloneTargetSections([...cloneTargetSections, sec].sort());
                            else setCloneTargetSections(cloneTargetSections.filter(x => x !== sec));
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        <strong>Section {sec}</strong>
                        <span style={{ fontSize: "0.75rem", color: studentCount > 0 ? "var(--success)" : "var(--text-muted)" }}>
                          ({studentCount > 0 ? `${studentCount} students` : "No roster"})
                        </span>
                      </label>
                    );
                  })}
                </div>

                {cloneTargetSections.length > 0 && (
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "0.65rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>Exams to generate for selected sections:</span>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "3px 9px", fontSize: "0.75rem" }}
                          onClick={() => setCloneSectionExams([formData.examName])}
                        >
                          Current Only ({formData.examName})
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: "3px 9px", fontSize: "0.75rem" }}
                          onClick={() => setCloneSectionExams(["CIA - I", "CIA - II", "CIA - III"])}
                        >
                          CIA I, II, III
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {Array.from(new Set([formData.examName, ...dynamicExamNameOptions])).filter(Boolean).map(ex => {
                        const isChecked = cloneSectionExams.includes(ex);
                        return (
                          <label 
                            key={ex}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              background: isChecked ? "rgba(99, 102, 241, 0.14)" : "transparent",
                              border: `1px solid ${isChecked ? "var(--primary)" : "var(--border-color)"}`,
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: isChecked ? "700" : "500"
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) setCloneSectionExams([...cloneSectionExams, ex]);
                                else setCloneSectionExams(cloneSectionExams.filter(x => x !== ex));
                              }}
                            />
                            <span>{ex}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "0.75rem", alignItems: "center" }}>
                      <input
                        type="text"
                        value={cloneCustomExamText}
                        onChange={e => setCloneCustomExamText(e.target.value)}
                        placeholder="+ Add another custom exam name (e.g. SEMINAR 2)"
                        className="text-input"
                        style={{ maxWidth: "300px", padding: "5px 10px", fontSize: "0.8rem" }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                        onClick={() => {
                          const trimmed = cloneCustomExamText.trim();
                          if (!trimmed) return;
                          if (!cloneCustomExamList.includes(trimmed)) {
                            setCloneCustomExamList(prev => [...prev, trimmed]);
                          }
                          if (!cloneSectionExams.includes(trimmed)) {
                            setCloneSectionExams(prev => [...prev, trimmed]);
                          }
                          setCloneCustomExamText("");
                        }}
                      >
                        + Add Exam
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: Faculty Assignment per Section */}
              {cloneTargetSections.length > 0 && (
                <div style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "1.25rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>3️⃣</span> Faculty Assignments for Target Sections
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Subjects and credits are copied automatically. Specify the faculty handling each subject for each section below:
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                        onClick={handleAutoFillFromTimetable}
                        title="Auto-fill faculty names already mapped in Timetable & Workload Allocator"
                      >
                        <span>📥</span> Auto-Fill from Timetable
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        onClick={handleCopySourceFacultyToAll}
                      >
                        📋 Copy Sec {formData.section} Faculty
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--danger)" }}
                        onClick={handleClearAllFaculty}
                      >
                        🧹 Clear
                      </button>
                    </div>
                  </div>

                  {/* Matrix of Sections */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                    {cloneTargetSections.map(sec => (
                      <div 
                        key={sec}
                        style={{
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          overflow: "hidden",
                          background: "rgba(0, 0, 0, 0.15)"
                        }}
                      >
                        <div style={{
                          padding: "8px 14px",
                          background: "rgba(255, 255, 255, 0.04)",
                          borderBottom: "1px solid var(--border-color)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>
                            📌 Section {sec} Faculty Assignment
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {courseDetails.length} Courses to map
                          </span>
                        </div>
                        <div style={{ padding: "8px 12px", overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                            <thead>
                              <tr style={{ color: "var(--text-muted)", textAlign: "left", borderBottom: "1px solid var(--border-color)" }}>
                                <th style={{ padding: "6px 8px", width: "120px" }}>Course Code</th>
                                <th style={{ padding: "6px 8px" }}>Course Name</th>
                                <th style={{ padding: "6px 8px", width: "160px" }}>Sec {formData.section} (Source)</th>
                                <th style={{ padding: "6px 8px", width: "240px", color: "var(--primary)" }}>Sec {sec} Faculty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseDetails.map((cd, cdIdx) => {
                                const currentVal = cloneFacultyMaps[sec]?.[cd.courseCode] || "";
                                return (
                                  <tr key={cdIdx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    <td style={{ padding: "6px 8px", fontWeight: "600" }}>{cd.courseCode || "-"}</td>
                                    <td style={{ padding: "6px 8px" }}>{cd.courseName || cd.shortName || "-"}</td>
                                    <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{cd.facultyName || "-"}</td>
                                    <td style={{ padding: "6px 8px" }}>
                                      <input
                                        list="clone-staff-datalist"
                                        value={currentVal}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setCloneFacultyMaps(prev => ({
                                            ...prev,
                                            [sec]: {
                                              ...(prev[sec] || {}),
                                              [cd.courseCode]: val
                                            }
                                          }));
                                        }}
                                        placeholder="Select or type faculty..."
                                        className="text-input"
                                        style={{ padding: "4px 8px", fontSize: "0.8rem", width: "100%" }}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Datalist for Staff Dropdown Autocomplete */}
                  <datalist id="clone-staff-datalist">
                    {Array.from(new Set([
                      ...(cloneStaffList || []).map(s => s.name),
                      ...(users || []).map(u => u.name)
                    ])).filter(Boolean).sort().map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1rem 1.75rem",
              borderTop: "1px solid var(--border-color)",
              background: "rgba(0, 0, 0, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total to generate: </span>
                <strong style={{ fontSize: "1rem", color: "var(--primary)" }}>
                  {(cloneIncludeSourceCurrentExam ? 1 : 0) + cloneTargetExamsForSource.length + (cloneTargetSections.length * cloneSectionExams.length)} Classes
                </strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                  ({(cloneIncludeSourceCurrentExam ? 1 : 0) + cloneTargetExamsForSource.length} for Sec {formData.section} + {cloneTargetSections.length * cloneSectionExams.length} across {cloneTargetSections.join(", ") || "none"})
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowBulkCloneModal(false)}
                  disabled={cloneLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  style={{
                    padding: "0.75rem 1.5rem",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                    border: "none",
                    borderRadius: "8px",
                    cursor: cloneLoading ? "not-allowed" : "pointer"
                  }}
                  onClick={handleExecuteBulkClone}
                  disabled={cloneLoading || (!cloneIncludeSourceCurrentExam && cloneTargetExamsForSource.length === 0 && (cloneTargetSections.length === 0 || cloneSectionExams.length === 0))}
                >
                  {cloneLoading ? "⏳ Generating Classes..." : `🚀 Generate All (${(cloneIncludeSourceCurrentExam ? 1 : 0) + cloneTargetExamsForSource.length + (cloneTargetSections.length * cloneSectionExams.length)}) Classes Now`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
