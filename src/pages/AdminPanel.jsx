import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import API from "../api";
import { Eye, EyeOff } from "lucide-react";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [showAllClassesDropdown, setShowAllClassesDropdown] = useState(false);
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
  const [courseDetails, setCourseDetails] = useState([]);
  const [targetPassPercentage, setTargetPassPercentage] = useState("85");
  const [students, setStudents] = useState([]);
  const [autoLoadedFrom, setAutoLoadedFrom] = useState("");
  const [courseAutoLoadedFrom, setCourseAutoLoadedFrom] = useState("");
  const [propagateRoster, setPropagateRoster] = useState(true);
  const [selectedClassesForAccess, setSelectedClassesForAccess] = useState([]);
  const [accessFilterYear, setAccessFilterYear] = useState("All");
  const [accessFilterSem, setAccessFilterSem] = useState("All");
  const [accessFilterSec, setAccessFilterSec] = useState("All");
  const [accessFilterExam, setAccessFilterExam] = useState("All");
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");
  const [bulkStartTime, setBulkStartTime] = useState("");
  const [bulkEndTime, setBulkEndTime] = useState("");

  // Recycle bin states
  const [recycleClasses, setRecycleClasses] = useState([]);
  const [selectedRecycleClasses, setSelectedRecycleClasses] = useState([]);
  const [recycleSearchQuery, setRecycleSearchQuery] = useState("");
  const [loadingRecycle, setLoadingRecycle] = useState(false);

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

  // ESE Upload states
  const [eseFormData, setEseFormData] = useState({
    programme: "B.E",
    department: "CSE",
    year: "II",
    semester: "IV",
    section: "A",
    examName: "ESE",
    passMark: "50",
    markPerSubject: "100",
    date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
    eseGradingSystem: "System 2"
  });
  const [eseUploading, setEseUploading] = useState(false);
  const [eseMessage, setEseMessage] = useState("");
  const [eseParsedData, setEseParsedData] = useState(null);
  const [eseCourseDetails, setEseCourseDetails] = useState([]);

  // ESE List & Edit States
  const [eseListEditClass, setEseListEditClass] = useState(null);
  const [eseListAttendance, setEseListAttendance] = useState({});
  const [eseListMarks, setEseListMarks] = useState({});
  const [eseListSaving, setEseListSaving] = useState(false);
  const [eseListSearch, setEseListSearch] = useState("");
  const [eseListExamFilter, setEseListExamFilter] = useState("");

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

  // Exam name options
  const examNameOptions = [
    "Model Exam",
    "Model Practical Exam",
    "Unit Test - I", "Unit Test - II", "Unit Test - III", "Unit Test - IV", "Unit Test - V",
    "CIA - I", "CIA - II", "CIA - III",
    "MKC", "ESE"
  ];

  const getDefaultMarks = (examName) => {
    if (examName.toLowerCase().includes("unit test")) {
      return { passMark: "15", markPerSubject: "30" };
    } else if (examName === "CIA - I" || examName === "CIA - II") {
      return { passMark: "25", markPerSubject: "50" };
    } else if (examName === "CIA - III") {
      return { passMark: "50", markPerSubject: "100" };
    }
    return { passMark: "35", markPerSubject: "100" };
  };

  useEffect(() => {
    loadClasses();
    loadRosters();
    loadUsers();
    loadActivities();
  }, []);

  const loadClasses = async () => {
    try {
      const rostersRes = await API.get("/api/rosters");
      setRosters(rostersRes.data);
      
      const res = await API.get("/api/classes");
      setClasses(res.data);
      // Pass rostersRes.data to checkAndLoadExistingLocal since state might not have updated yet
      checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, formData.examName, res.data, undefined, undefined, rostersRes.data);
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
    }
  }, [activeTab]);

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
          .replace(/[\/\s:]/g, "-")
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
          .replace(/[\/\s:]/g, "-")
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




  // Build the unique key for a class: yearSemSec + examName
  const buildClassName = (year, semester, section, examName, programme, department) => {
    return `${programme || formData.programme}-${department || formData.department} - ${year}/${semester}/${section} - ${examName}`;
  };

  const checkAndLoadExistingLocal = (y, s, sec, exam, allClasses, prog, dept, providedRosters) => {
    let validatedSem = s;
    if (y === "I" && !["I", "II"].includes(s)) validatedSem = "I";
    else if (y === "II" && !["III", "IV"].includes(s)) validatedSem = "III";
    else if (y === "III" && !["V", "VI"].includes(s)) validatedSem = "V";
    else if (y === "IV" && !["VII", "VIII"].includes(s)) validatedSem = "VII";

    const list = allClasses || classes;
    const currentRosters = providedRosters || rosters;
    const currentProg = prog !== undefined ? prog : formData.programme;
    const currentDept = dept !== undefined ? dept : formData.department;
    const targetName = buildClassName(y, validatedSem, sec, exam, currentProg, currentDept);
    const found = list.find(c => c.className === targetName);
    if (found) {
      handleManualClassSelectLocal(found.className, list);
      setAutoLoadedFrom("");
    } else {
      // Also try matching by yearSemSec only (old format compatibility)
      const targetYSS = `${y}/${validatedSem}/${sec}`;
      const foundByYSS = list.find(c => c.yearSemSec === targetYSS && c.examName === exam && c.programme === currentProg && c.department === currentDept);
      if (foundByYSS) {
        handleManualClassSelectLocal(foundByYSS.className, list);
        setAutoLoadedFrom("");
      } else {
        setSelectedClassId("");

        // Search for existing cohort match (same programme, department, yearSemSec)
        const cohortMatch = list.find(c =>
          c.programme === currentProg &&
          c.department === currentDept &&
          c.yearSemSec === targetYSS
        );

        // Auto-load student roster from Master Roster or fallback to cohort
        const rosterMatch = currentRosters.find(r => r.cohortName === `${currentProg}-${currentDept} - ${targetYSS}`);
        if (rosterMatch && rosterMatch.students && rosterMatch.students.length > 0) {
          setStudents(rosterMatch.students.map(std => ({
            regNo: std.regNo,
            name: std.name,
            dob: std.dob || "",
            gender: std.gender || "Boy",
            studentType: std.studentType || "Day Scholar"
          })));
          setAutoLoadedFrom("Master Roster");
        } else if (cohortMatch && cohortMatch.students && cohortMatch.students.length > 0) {
          setStudents(cohortMatch.students.map(std => ({
            regNo: std.regNo,
            name: std.name,
            dob: std.dob || "",
            gender: std.gender || "Boy",
            studentType: std.studentType || "Day Scholar"
          })));
          setAutoLoadedFrom(cohortMatch.className);
        } else {
          setStudents([]);
          setAutoLoadedFrom("");
        }

        // Auto-load course details from cohort
        if (cohortMatch && cohortMatch.courseDetails && cohortMatch.courseDetails.length > 0) {
          const loadedCourses = cohortMatch.courseDetails.map(cd => {
            if (cd.courseCode && cd.courseCode.includes(' & ')) {
              const parts = cd.courseCode.split(' & ');
              return { courseCode: parts[0].trim(), courseName: cd.courseName || parts[1]?.trim() || "", shortName: cd.shortName || "", facultyName: cd.facultyName || "" };
            }
            return { courseCode: cd.courseCode || "", courseName: cd.courseName || "", shortName: cd.shortName || "", facultyName: cd.facultyName || "" };
          });
          setCourseDetails(loadedCourses);
          setCourseAutoLoadedFrom(cohortMatch.className);
        } else if (cohortMatch && cohortMatch.subjects && cohortMatch.subjects.length > 0) {
          // Fallback: load from subjects array
          const loadedCourses = cohortMatch.subjects.map(s => {
            if (s.includes(' & ')) {
              const parts = s.split(' & ');
              return { courseCode: parts[0].trim(), courseName: parts[1]?.trim() || "", shortName: "", facultyName: "" };
            }
            return { courseCode: s, courseName: "", shortName: "", facultyName: "" };
          });
          setCourseDetails(loadedCourses);
          setCourseAutoLoadedFrom(cohortMatch.className);
        } else {
          setCourseDetails([]);
          setCourseAutoLoadedFrom("");
        }

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
          allowEditing: true,
          editingStartDate: "",
          editingEndDate: ""
        }));
      }
    }
  };

  const handleManualClassSelectLocal = (name, allClasses) => {
    if (!name) return;
    const list = allClasses || classes;
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
              facultyName: cd.facultyName || "" 
            };
          }
          return { 
            courseCode: cd.courseCode || "", 
            courseName: cd.courseName || "", 
            shortName: cd.shortName || "",
            facultyName: cd.facultyName || "" 
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
      setStudents(cls.students || []);
      setSelectedClassId(cls.className);
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

  const handleCourseFileUpload = (e) => {
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

      let codeIdx = -1, nameIdx = -1, shortIdx = -1, facultyIdx = -1;
      headerLower.forEach((h, i) => {
        const val = (h || "").toString().toLowerCase().trim();
        if (val.includes("code") || val.includes("subject code") || val.includes("course code")) codeIdx = i;
        if ((val.includes("name") || val.includes("title") || val.includes("subject name") || val.includes("course name")) && !val.includes("faculty") && !val.includes("short")) nameIdx = i;
        if (val.includes("short") || val.includes("acronym") || val.includes("abbreviation") || val.includes("alias")) shortIdx = i;
        if (val.includes("faculty") || val.includes("staff") || val.includes("teacher")) facultyIdx = i;
      });

      // Positional fallbacks if not found
      if (codeIdx === -1) codeIdx = 0;
      if (nameIdx === -1) nameIdx = 1;
      
      const newCourses = json.slice(1)
        .filter(r => r[codeIdx] || r[nameIdx])
        .map(r => ({
          courseCode: (r[codeIdx] || "").toString().trim(),
          courseName: (r[nameIdx] || "").toString().trim(),
          shortName: shortIdx !== -1 ? (r[shortIdx] || "").toString().trim() : "",
          facultyName: facultyIdx !== -1 ? (r[facultyIdx] || "").toString().trim() : ""
        }));
      
      if (newCourses.length > 0) {
        setCourseDetails(newCourses);
        setCourseAutoLoadedFrom(""); // Manual upload clears the auto-load banner
        alert(`${newCourses.length} Courses Uploaded Successfully!`);
      } else {
        alert("No valid course data found. Ensure your Excel has columns like 'Course Code', 'Course Name', and 'Faculty Name'.");
      }
    };
    reader.readAsArrayBuffer(file);
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

  const handleSave = async () => {
    try {
      const generatedName = buildClassName(formData.year, formData.semester, formData.section, formData.examName, formData.programme, formData.department);
      const payload = {
        className: generatedName,
        subjects: courseDetails.map(c => c.courseCode || ""),
        courseDetails,
        targetPassPercentage: Number(targetPassPercentage),
        passMark: Number(formData.passMark),
        examName: formData.examName,
        markPerSubject: Number(formData.markPerSubject),
        students,
        date: formData.date,
        department: formData.department,
        yearSemSec: `${formData.year}/${formData.semester}/${formData.section}`,
        programme: formData.programme,
        allowEditing: formData.allowEditing,
        editingStartDate: formData.editingStartDate,
        editingEndDate: formData.editingEndDate,
        editingStartTime: formData.editingStartTime || "",
        editingEndTime: formData.editingEndTime || "",
        propagateRoster: propagateRoster,
        eseGradingSystem: formData.eseGradingSystem
      };
      await API.post("/api/classes", payload);
      alert("Class saved successfully!");
      setSelectedClassId(generatedName);
      setAutoLoadedFrom("");
      setCourseAutoLoadedFrom("");
      loadClasses();
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  };

  const handleSaveRoster = async () => {
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
    } catch (err) {
      alert("Failed to save roster: " + err.message);
    }
  };

  const handleEseUploadSubmit = async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("eseFileInput");
    const file = fileInput?.files[0];
    if (!file) {
      setEseMessage("Please select an Excel file.");
      return;
    }

    setEseUploading(true);
    setEseMessage("");

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const headerRow = json[0] || [];
          
          // Identify columns
          let regNoIdx = -1, nameIdx = -1, yssIdx = -1;
          const subjectCols = []; // array of { idx, code }

          headerRow.forEach((h, i) => {
            const val = (h || "").toString().toUpperCase().trim();
            if (val.includes("REGISTER NO") || val.includes("REG NO")) regNoIdx = i;
            else if (val.includes("STUDENT NAME") || val.includes("NAME")) nameIdx = i;
            else if (val.includes("YEAR /SEM/SECTION") || val.includes("YEAR/SEM/SEC")) yssIdx = i;
            else {
              const codeStr = val.replace(/[^A-Z0-9]/g, '');
              if (codeStr.length >= 4 && codeStr.match(/^[0-9]+[A-Z0-9]+$/)) {
                // Looks like a course code (e.g., 23CSF07)
                subjectCols.push({ idx: i, code: codeStr });
              }
            }
          });

          if (regNoIdx === -1 || nameIdx === -1 || subjectCols.length === 0) {
            setEseMessage("Invalid Excel format. Make sure you have 'REGISTER NO', 'STUDENT NAME', and at least one Course Code column.");
            setEseUploading(false);
            return;
          }

          const studentsData = [];
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row[regNoIdx]) continue;
            
            const marks = subjectCols.map(col => (row[col.idx] || "").toString().trim());
            
            studentsData.push({
              regNo: (row[regNoIdx] || "").toString().trim(),
              name: (row[nameIdx] || "").toString().trim(),
              marks: marks
            });
          }

          const generatedName = buildClassName(
            eseFormData.year, eseFormData.semester, eseFormData.section, 
            eseFormData.examName, eseFormData.programme, eseFormData.department
          );

          const minimalCourseDetails = subjectCols.map(c => {
            let foundName = "";
            let foundShortName = "";
            // Search existing classes for matching course code to auto-fill details
            for (const existingCls of classes) {
              if (existingCls.courseDetails) {
                const matched = existingCls.courseDetails.find(cd => cd.courseCode === c.code);
                if (matched && matched.courseName) {
                  foundName = matched.courseName;
                  foundShortName = matched.shortName || "";
                  break;
                }
              }
            }
            return {
              courseCode: c.code,
              courseName: foundName,
              shortName: foundShortName,
              facultyName: ""
            };
          });

          setEseParsedData({
            className: generatedName,
            subjects: subjectCols.map(c => c.code),
            targetPassPercentage: 85,
            passMark: Number(eseFormData.passMark),
            examName: eseFormData.examName,
            markPerSubject: Number(eseFormData.markPerSubject),
            students: studentsData,
            date: eseFormData.date,
            department: eseFormData.department,
            yearSemSec: `${eseFormData.year}/${eseFormData.semester}/${eseFormData.section}`,
            programme: eseFormData.programme,
            eseGradingSystem: eseFormData.eseGradingSystem
          });
          setEseCourseDetails(minimalCourseDetails);
          setEseUploading(false);
          setEseMessage("File processed successfully. Please fill the course details below and click Save.");
        } catch (err) {
          setEseMessage("Failed to process Excel: " + (err.response?.data?.error || err.message));
        } finally {
          setEseUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      setEseMessage("Failed to read file.");
      setEseUploading(false);
    }
  };

  const handleEseSave = async () => {
    if (!eseParsedData) return;
    setEseUploading(true);
    try {
      const payload = {
        ...eseParsedData,
        courseDetails: eseCourseDetails
      };

      await API.post("/api/classes", payload);
      setEseMessage("Success! ESE Grades have been published.");
      setEseParsedData(null);
      setEseCourseDetails([]);
    } catch (err) {
      setEseMessage(err.response?.data?.error || "Error saving ESE data.");
    } finally {
      setEseUploading(false);
      loadClasses();
    }
  };

  const handleDeleteClass = async () => {
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

  const handleApproveUser = async (userId, approved) => {
    try {
      await API.post(`/api/auth/users/${userId}/approve`, { approved });
      loadUsers();
    } catch (err) { alert("Failed to update user"); }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await API.delete(`/api/auth/users/${userId}`);
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
      }

      /* 🪐 Cyber Overrides for Admin Panel */
      .admin-panel-container .glass-card {
        background: rgba(15, 23, 42, 0.65) !important;
        border: 1px solid rgba(99, 102, 241, 0.35) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
        color: #ffffff !important;
      }
      .admin-panel-container h1, 
      .admin-panel-container h2, 
      .admin-panel-container h3, 
      .admin-panel-container h4 {
        color: #ffffff !important;
        text-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
      }
      .admin-panel-container p {
        color: #a5b4fc !important;
      }
      .admin-panel-container .input-label {
        color: #a5b4fc !important;
      }
      .admin-panel-container .text-input,
      .admin-panel-container .select-input {
        background: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid rgba(99, 102, 241, 0.3) !important;
        color: #ffffff !important;
      }
      .admin-panel-container .text-input:focus,
      .admin-panel-container .select-input:focus {
        border-color: #818cf8 !important;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
      }
      .admin-panel-container select.select-input option {
        background: #0f172a !important;
        color: #ffffff !important;
      }
      .admin-panel-container .btn-secondary {
        background: rgba(255, 255, 255, 0.05) !important;
        color: #e2e8f0 !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      .admin-panel-container .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1) !important;
      }
      .admin-panel-container .admin-table th {
        background: rgba(15, 23, 42, 0.8) !important;
        color: #818cf8 !important;
        border-bottom: 1px solid rgba(99, 102, 241, 0.3) !important;
      }
      .admin-panel-container .admin-table td {
        color: #ffffff !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      .admin-panel-container .admin-table tr:hover {
        background: rgba(99, 102, 241, 0.1) !important;
      }
      .admin-panel-container .table-container {
        background: rgba(15, 23, 42, 0.4) !important;
        border: 1px solid rgba(99, 102, 241, 0.2) !important;
      }
    `}</style>
    <div className="page-layout fade-in admin-panel-container" style={{
      background: "linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('/admin-dashboard-bg.jpg') no-repeat center right fixed",
      backgroundSize: "cover",
      padding: "2.5rem",
      borderRadius: "16px",
      border: "1px solid rgba(99, 102, 241, 0.3)",
      boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
      color: "#ffffff"
    }}>
      <div className="header-flex" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1>Admin Control Center</h1>
          <p style={{ color: "#a5b4fc", fontSize: "1rem" }}>Configure student groups, manage user permissions, and track system logs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="admin-tabs" 
        ref={tabsRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        style={{ cursor: "grab" }}
      >
        <button 
          className={`btn ${activeTab === "classes" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("classes")}
        >
          📚 Class Setup
        </button>
        <button 
          className={`btn ${activeTab === "roster" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("roster")}
        >
          👥 Roster Upload
        </button>
        <button 
          className={`btn ${activeTab === "access" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("access")}
        >
          🔑 Mark Entry Access
        </button>
        <button 
          className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("users")}
        >
          👥 User Access
        </button>
        <button 
          className={`btn ${activeTab === "activity" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("activity")}
        >
          📊 Activity Logs
        </button>
        <button 
          className={`btn ${activeTab === "recycle" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("recycle")}
        >
          🗑️ Recycle Bin
        </button>
        <button 
          className={`btn ${activeTab === "eseUpload" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem", background: activeTab === "eseUpload" ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" : "" }}
          onClick={() => setActiveTab("eseUpload")}
        >
          📤 ESE Upload
        </button>
        <button 
          className={`btn ${activeTab === "eseList" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("eseList")}
        >
          📋 Uploaded Classes
        </button>
        <button 
          className={`btn ${activeTab === "approvals" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("approvals")}
        >
          ✅ Result Approvals
        </button>
        <button 
          className={`btn ${activeTab === "extensions" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("extensions")}
        >
          ⏱️ Extension Requests
        </button>
        <button 
          className={`btn ${activeTab === "advisors" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("advisors")}
        >
          🎓 Class Advisors
        </button>
        <button 
          className={`btn ${activeTab === "announcements" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("announcements")}
        >
          📢 Announcements
        </button>
        <button 
          className={`btn ${activeTab === "security" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("security")}
        >
          🔒 Security
        </button>
        <button 
          className={`btn ${activeTab === "lettertemplate" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("lettertemplate")}
        >
          📝 Letter Template
        </button>
        <button 
          className={`btn ${activeTab === "reportsettings" ? "btn-primary" : "btn-secondary"}`} 
          style={{ borderRadius: "12px 12px 0 0", padding: "0.75rem 1.5rem" }}
          onClick={() => setActiveTab("reportsettings")}
        >
          ⚙️ Report Settings
        </button>
      </div>

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
                <select value={formData.section} onChange={e => checkAndLoadExistingLocal(formData.year, formData.semester, e.target.value, formData.examName, classes)} className="select-input">
                  {["A","B","C","D","E"].map(s => <option key={s} value={s}>{s}</option>)}
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
                <input value={formData.department} onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, department: val }));
                  checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, formData.examName, classes, formData.programme, val);
                }} placeholder="e.g. CSE" className="text-input" />
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
              <select value={formData.examName} onChange={e => checkAndLoadExistingLocal(formData.year, formData.semester, formData.section, e.target.value, classes)} className="select-input">
                {examNameOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
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

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "2rem 0 1rem" }}>
              <h3 style={{ margin: 0 }}>Course Details</h3>
              <div style={{ position: "relative", overflow: "hidden" }}>
                <button className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>📂 Upload Course Data</button>
                <input type="file" onChange={handleCourseFileUpload} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
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
                      <td><input value={c.facultyName} onChange={e => updateCourseDetail(i, 'facultyName', e.target.value)} className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} /></td>
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
                Apply this student roster &amp; course details to all other exams of this cohort
              </label>
            </div>
            <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem", padding: "1rem" }} onClick={handleSave}>🚀 Save & Synchronize Class Setup</button>
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

      {/* ROSTER UPLOAD TAB */}
      {activeTab === "roster" && (
        <div className="glass-card" style={{ padding: "2.5rem", maxWidth: "1000px", margin: "0 auto" }}>
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
              <input value={formData.department} onChange={e => {
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

          <button className="btn btn-secondary" style={{ width: "100%", marginTop: "2rem", padding: "1rem", background: "var(--primary)", color: "#fff", border: "none" }} onClick={handleSaveRoster}>
            🚀 Save & Synchronize Roster
          </button>
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

          <h4 style={{ marginBottom: "1rem", color: "#e2e8f0" }}>👨‍🏫 Faculty Approvals</h4>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Communication</th>
                  <th>Department / Focus</th>
                  <th>Designation</th>
                  <th>Current Status</th>
                  <th>Operational Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>Integrity Check: No faculty registrations found.</td></tr>}
                {users.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: "600" }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="status-badge" style={{ background: "rgba(99,102,241,0.1)", color: "var(--primary)" }}>{u.department}</span></td>
                    <td>{u.designation}</td>
                    <td>
                      <span className={`status-badge ${u.approved ? 'success' : 'danger'}`}>
                        {u.approved ? "Verified" : "Pending Approval"}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: "0.5rem" }}>
                      {!u.approved ? (
                        <button onClick={() => handleApproveUser(u._id, true)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>Grant Access</button>
                      ) : (
                        <button onClick={() => handleApproveUser(u._id, false)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>Restrict Access</button>
                      )}
                      <button onClick={() => handleDeleteUser(u._id)} className="btn btn-danger btn-icon">🗑</button>
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
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#e2e8f0", marginBottom: "1.5rem" }}>Security Settings</h2>
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
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#818cf8", display: "flex", alignItems: "center", padding: "4px" }}
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
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#818cf8", display: "flex", alignItems: "center", padding: "4px" }}
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
                  {examNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                  <h4 style={{ margin: 0, color: "#a5b4fc" }}>📊 Dynamic Table Builder</h4>
                  <button type="button" onClick={handleAddColumn} style={{ padding: "6px 12px", background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "bold" }}>
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
                            <option value="ESE">ESE</option>
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

      {/* ESE UPLOAD TAB */}
      {activeTab === "eseUpload" && (
        <div style={{ maxWidth: 800 }}>
          <div className="glass-card" style={{ padding: "2rem" }}>
            <h3 style={{ marginBottom: "0.25rem", fontWeight: "600", fontSize: "1.5rem" }}>Upload ESE Grades Excel</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              Upload the University ESE Result Excel sheet. This will automatically create a Class and Mark Entry containing the grades for the selected Year/Sem/Sec.
            </p>

            <form onSubmit={handleEseUploadSubmit}>
              <div className="admin-grid-2col" style={{ gap: "1rem", marginBottom: "1rem" }}>
                <div className="input-group">
                  <label className="input-label">Year</label>
                  <select className="select-input" value={eseFormData.year} onChange={e => setEseFormData({ ...eseFormData, year: e.target.value })}>
                    <option value="I">I Year</option>
                    <option value="II">II Year</option>
                    <option value="III">III Year</option>
                    <option value="IV">IV Year</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Semester</label>
                  <select className="select-input" value={eseFormData.semester} onChange={e => setEseFormData({ ...eseFormData, semester: e.target.value })}>
                    {eseFormData.year === "I" && <><option>I</option><option>II</option></>}
                    {eseFormData.year === "II" && <><option>III</option><option>IV</option></>}
                    {eseFormData.year === "III" && <><option>V</option><option>VI</option></>}
                    {eseFormData.year === "IV" && <><option>VII</option><option>VIII</option></>}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Section</label>
                  <select className="select-input" value={eseFormData.section} onChange={e => setEseFormData({ ...eseFormData, section: e.target.value })}>
                    <option>A</option><option>B</option><option>C</option><option>D</option><option>E</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Exam Name</label>
                  <input type="text" className="text-input" value={eseFormData.examName} onChange={e => setEseFormData({ ...eseFormData, examName: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ color: "#f59e0b" }}>Grading System</label>
                  <select className="select-input" value={eseFormData.eseGradingSystem} onChange={e => setEseFormData({ ...eseFormData, eseGradingSystem: e.target.value })} style={{ border: "1px solid #f59e0b" }}>
                    <option value="System 1">System 1 (S:10, A+:9, A:8, B+:7, B:6.5, C+:6, C:5, U:0, U*:0)</option>
                    <option value="System 2">System 2 (O:10, A+:9, A:8, B+:7, B:6, C:5, U:0, U*:0)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Programme</label>
                  <select className="select-input" value={eseFormData.programme} onChange={e => setEseFormData({ ...eseFormData, programme: e.target.value })}>
                    <option>B.E</option><option>B.Tech</option><option>M.E</option><option>MBA</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Department</label>
                  <select className="select-input" value={eseFormData.department} onChange={e => setEseFormData({ ...eseFormData, department: e.target.value })}>
                    <option>CSE</option><option>AI&DS</option><option>ECE</option><option>EEE</option>
                  </select>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: "1.5rem" }}>
                <label className="input-label">Select Excel File</label>
                <input type="file" id="eseFileInput" accept=".xlsx, .xls" className="text-input" style={{ padding: "0.75rem" }} required />
              </div>

              {eseMessage && (
                <div style={{ padding: "0.9rem", borderRadius: 8, marginBottom: "1.5rem",
                  background: eseMessage.includes("Success") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  color: eseMessage.includes("Success") ? "#34d399" : "#f87171" }}>
                  {eseMessage}
                </div>
              )}

              <button type="submit" disabled={eseUploading || eseParsedData} className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "1rem" }}>
                {eseUploading && !eseParsedData ? "Processing..." : "📤 Process File"}
              </button>
            </form>

            {eseParsedData && (
              <div className="fade-in" style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>Fill Course Details for {eseParsedData.className}</h4>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: "150px" }}>Code</th>
                        <th style={{ minWidth: "250px" }}>Full Course Title</th>
                        <th style={{ minWidth: "120px" }}>Short Form</th>
                        <th style={{ minWidth: "80px" }}>Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eseCourseDetails.map((c, i) => (
                        <tr key={i}>
                          <td>
                            <input value={c.courseCode} disabled className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem", opacity: 0.7 }} />
                          </td>
                          <td>
                            <input value={c.courseName} onChange={e => {
                              const newDetails = [...eseCourseDetails];
                              newDetails[i].courseName = e.target.value;
                              setEseCourseDetails(newDetails);
                            }} placeholder="Enter full subject name..." className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} />
                          </td>
                          <td>
                            <input value={c.shortName} onChange={e => {
                              const newDetails = [...eseCourseDetails];
                              newDetails[i].shortName = e.target.value;
                              setEseCourseDetails(newDetails);
                            }} placeholder="Optional" className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.5" value={c.credits !== undefined ? c.credits : 3} onChange={e => {
                              const newDetails = [...eseCourseDetails];
                              newDetails[i].credits = Number(e.target.value);
                              setEseCourseDetails(newDetails);
                            }} className="text-input" style={{ padding: "0.4rem", fontSize: "0.85rem" }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                  <button onClick={() => { setEseParsedData(null); setEseCourseDetails([]); setEseMessage(""); }} className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                    Cancel
                  </button>
                  <button onClick={handleEseSave} disabled={eseUploading} className="btn btn-primary" style={{ flex: 2, justifyContent: "center" }}>
                    {eseUploading ? "Saving..." : "💾 Save ESE Result & Courses"}
                  </button>
                </div>
              </div>
            )}
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
                          {c.examName}
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Editing: {eseListEditClass.className}</h3>
                <button className="btn btn-secondary" onClick={() => setEseListEditClass(null)}>Back to List</button>
              </div>

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
                  {examNameOptions.map(ex => <option key={ex} value={ex}>{ex}</option>)}
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

    </div>
    </>
  );
}
