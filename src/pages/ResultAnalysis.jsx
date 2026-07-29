import { useState, useEffect } from "react";
import API from "../api";
import * as XLSX from "xlsx";
import headerLogo from "../assets/logo image.jpg";



export default function ResultAnalysis() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classData, setClassData] = useState(null);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [progressData, setProgressData] = useState({});
  const [filters, setFilters] = useState({ year: "I", semester: "I", section: "A", exam: "Unit Test - I" });
  const [filteredClasses, setFilteredClasses] = useState([]);

  const examNameOptions = [
    "Model Exam",
    "Model Practical Exam",
    "Unit Test - I", "Unit Test - II", "Unit Test - III", "Unit Test - IV", "Unit Test - V",
    "CIA - I", "CIA - II", "CIA - III",
    "MKC", "ESE"
  ];

  const progressKeys = ["U1", "U2", "CIA-1", "U3", "U4", "CIA-II", "U5", "CIA-III", "MKC", "Seminar", "ESE"];

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

  const applyFilters = (allClasses, f) => {
    const targetYSS = `${f.year}/${f.semester}/${f.section}`;
    const filtered = allClasses.filter(c => c.yearSemSec === targetYSS && c.examName === f.exam);
    setFilteredClasses(filtered);
    if (filtered.length === 1) {
      const firstClassName = filtered[0].className;
      setSelectedClassId(firstClassName);
      loadSpecificClassData(firstClassName);
    } else {
      setSelectedClassId("");
      setClassData(null);
    }
  };

  const handleFilterChange = (field, val) => {
    let newFilters = { ...filters, [field]: val };
    if (field === 'year') {
      const year = val;
      const sem = filters.semester;
      let validatedSem = sem;
      if (year === "I" && !["I", "II"].includes(sem)) validatedSem = "I";
      else if (year === "II" && !["III", "IV"].includes(sem)) validatedSem = "III";
      else if (year === "III" && !["V", "VI"].includes(sem)) validatedSem = "V";
      else if (year === "IV" && !["VII", "VIII"].includes(sem)) validatedSem = "VII";
      newFilters.semester = validatedSem;
    }
    setFilters(newFilters);
    applyFilters(classes, newFilters);
  };

  const loadSpecificClassData = async (name) => {
    if (!name) { setClassData(null); return; }
    try {
      const res = await API.get(`/api/classes/${encodeURIComponent(name)}`);
      let loadedClassData = res.data;
      if (loadedClassData && loadedClassData.students) {
        const getGradePoint = (grade, system) => {
          const g = String(grade).toUpperCase().trim();
          if (system === "System 1") {
            const map = { "S": 10, "A+": 9, "A": 8, "B+": 7, "B": 6.5, "C+": 6, "C": 5, "U": 0, "U*": 0 };
            return map[g] !== undefined ? map[g] : 0;
          } else {
            const map = { "O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "U": 0, "U*": 0 };
            return map[g] !== undefined ? map[g] : 0;
          }
        };

        loadedClassData.students = loadedClassData.students.map(s => {
          let total = 0;
          let totalGradePoints = 0;
          let totalCredits = 0;
          let fail = false;
          const isESE = loadedClassData.examName === "ESE";

          (s.marks || []).forEach((val, idx) => {
            const markStr = String(val || "").toUpperCase().trim();
            if (isESE) {
              if (markStr === "AB" || markStr === "U" || markStr === "U*" || markStr === "FAIL") fail = true;
              const gp = getGradePoint(markStr, loadedClassData.eseGradingSystem || "System 2");
              const credits = (loadedClassData.courseDetails && loadedClassData.courseDetails[idx] && loadedClassData.courseDetails[idx].credits !== undefined) ? Number(loadedClassData.courseDetails[idx].credits) : 3;
              totalGradePoints += (gp * credits);
              totalCredits += credits;
            } else {
              if (markStr === "AB" || markStr === "A") fail = true;
              else {
                const numVal = Number(markStr || 0);
                total += (isNaN(numVal) ? 0 : numVal);
                if (numVal < loadedClassData.passMark) fail = true;
              }
            }
          });

          const maxTotal = isESE ? loadedClassData.subjects.length * 10 : loadedClassData.subjects.length * loadedClassData.markPerSubject;
          let percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

          if (isESE) {
            total = totalCredits > 0 ? Number((totalGradePoints / totalCredits).toFixed(2)) : 0;
            percentage = Math.round(total * 10);
          }

          return { ...s, total, percentage: Math.round(percentage), result: fail ? "Fail" : "Pass" };
        });
      }
      setClassData(loadedClassData);
      setProgressData(loadedClassData.semesterProgress || {});
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await API.get("/api/classes");
        setClasses(res.data);
        applyFilters(res.data, filters);
      } catch (err) { console.error(err); }
    };
    loadClasses();
  }, []);

  const handleClassSelect = (e) => {
    const name = e.target.value;
    setSelectedClassId(name);
    loadSpecificClassData(name);
  };

  const renderFilterRow = () => (
    <div className="filter-row no-print" style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap", alignItems: "center" }}>
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold" }}>Year</label>
        <select value={filters.year} onChange={e => handleFilterChange('year', e.target.value)} style={{ padding: "8px" }}>
          {["I", "II", "III", "IV"].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold" }}>Semester</label>
        <select value={filters.semester} onChange={e => handleFilterChange('semester', e.target.value)} style={{ padding: "8px" }}>
          {getSemOptionsForYear(filters.year).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold" }}>Section</label>
        <select value={filters.section} onChange={e => handleFilterChange('section', e.target.value)} style={{ padding: "8px" }}>
          {["A", "B", "C", "D", "E"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold" }}>Evaluation Module</label>
        <select value={filters.exam} onChange={e => handleFilterChange('exam', e.target.value)} style={{ padding: "8px" }}>
          {examNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    </div>
  );

  const renderClassSelector = () => {
    if (filteredClasses.length > 1) {
      return (
        <div className="no-print" style={{ marginTop: "10px", marginBottom: "20px" }}>
          <label style={{ fontWeight: "bold", marginRight: "10px" }}>Select Class:</label>
          <select
            value={selectedClassId}
            onChange={handleClassSelect}
            style={{ padding: "8px", minWidth: "250px" }}
          >
            <option value="">-- Select a Class --</option>
            {filteredClasses.map(c => (
              <option key={c._id} value={c.className}>{c.className}</option>
            ))}
          </select>
        </div>
      );
    }
    return null;
  };

  const handleProgressChange = (key, field, value) => {
    setProgressData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { total: "", pass: "", percentage: "" }),
        [field]: value
      }
    }));
  };

  const saveProgress = async () => {
    try {
      await API.post(`/api/classes/${encodeURIComponent(classData.className)}/progress`, {
        semesterProgress: progressData
      });
      alert("Semester progress saved successfully!");
      setIsEditingProgress(false);
      // Refresh data
      const res = await API.get(`/api/classes/${encodeURIComponent(classData.className)}`);
      setClassData(res.data);
    } catch (err) {
      alert("Failed to save progress: " + err.message);
    }
  };

  const autoFillCurrentExam = () => {
    const currentExam = classData.examName;
    // Map current exam to the appropriate column if applicable
    let targetKey = currentExam;
    if (currentExam === "CIA - I") targetKey = "CIA-1";
    if (currentExam === "CIA - II") targetKey = "CIA-II";
    if (currentExam === "CIA - III") targetKey = "CIA-III";
    if (currentExam === "Model Exam") targetKey = "MKC";
    if (currentExam === "Unit Test - I") targetKey = "A1";
    if (currentExam === "Unit Test - II") targetKey = "A2";
    if (currentExam === "Unit Test - III") targetKey = "A3";
    if (currentExam === "Unit Test - IV") targetKey = "A4";
    if (currentExam === "Unit Test - V") targetKey = "A5";

    if (progressKeys.includes(targetKey)) {
      handleProgressChange(targetKey, "total", (students.length || 0).toString());
      handleProgressChange(targetKey, "pass", (passStudents.length || 0).toString());
      handleProgressChange(targetKey, "percentage", (overallPassPercent || 0).toString());
    }
  };

  if (!classData) {
    return (
      <div className="page-layout">
        <h1>Result Analysis</h1>
        {renderFilterRow()}
        {renderClassSelector()}
        {filteredClasses.length === 0 && (
          <div className="no-data-card" style={{ padding: "20px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid var(--danger)", marginTop: "20px" }}>
            <p style={{ color: "var(--danger)", margin: 0 }}>
              No class matches this criteria. Please ensure you have created a class for this Year/Sem/Sec/<strong>{filters.exam}</strong> in the <strong>Admin Panel</strong> first.
            </p>
          </div>
        )}
      </div>
    );
  }

  const students = classData.students || [];
  const totalStudents = students.length;
  const cd = classData.courseDetails && classData.courseDetails.length > 0
    ? classData.courseDetails
    : classData.subjects.map(s => ({ courseCode: s, courseName: "", facultyName: "" }));

  const isESE = classData.examName === "ESE";

  const isAbsent = (val) => {
    const v = (val || "").toUpperCase().trim();
    if (isESE) return v === "AB";
    return v === "AB" || v === "A";
  };

  const isFail = (val) => {
    const v = (val || "").toUpperCase().trim();
    if (isESE) {
      return v === "U" || v === "U*" || v === "FAIL";
    } else {
      if (v === "AB" || v === "A") return false; 
      const mark = Number(v);
      return !isNaN(mark) && mark < classData.passMark;
    }
  };

  // Helper: Get subject stats
  const getSubjectStats = (subIdx) => {
    let total = 0, pass = 0, fail = 0, ab = 0;
    students.forEach(s => {
      total++;
      const val = (s.marks[subIdx] || "").toUpperCase();
      if (isAbsent(val)) { ab++; }
      else if (isFail(val)) { fail++; }
      else { pass++; }
    });
    return { total, pass, fail, ab, passPercent: total > 0 ? Math.round((pass / total) * 100) : 0 };
  };

  // Overall pass/fail
  const passStudents = students.filter(s => s.result === "Pass");
  const failStudents = students.filter(s => s.result === "Fail");
  const overallPassPercent = totalStudents > 0 ? Math.round((passStudents.length / totalStudents) * 100) : 0;

  // Day Scholar / Hosteller breakdown
  const dsB = students.filter(s => s.studentType === "Day Scholar" && s.gender === "Boy");
  const dsG = students.filter(s => s.studentType === "Day Scholar" && s.gender === "Girl");
  const hB = students.filter(s => s.studentType === "Hosteller" && s.gender === "Boy");
  const hG = students.filter(s => s.studentType === "Hosteller" && s.gender === "Girl");

  const catPass = (arr) => arr.filter(s => s.result === "Pass").length;
  const catFail = (arr) => arr.filter(s => s.result === "Fail").length;
  const catAb = (arr) => arr.filter(s => s.result === "-").length;
  const catPassPct = (arr) => arr.length > 0 ? Math.round((catPass(arr) / arr.length) * 100) : 0;

  // Toppers and slow learners
  const validStudents = students.filter(s => s.result !== "-");
  const sortedDesc = [...validStudents].sort((a, b) => b.percentage - a.percentage);
  const toppers = sortedDesc.slice(0, 5);
  const sortedAsc = [...validStudents].sort((a, b) => a.percentage - b.percentage);
  const slowLearners = sortedAsc.slice(0, 5);

  // Course-wise absentees
  const getAbsenteesForSubject = (subIdx) => {
    return students.filter(s => isAbsent(s.marks[subIdx]));
  };

  // Students absent grouped by number of courses
  const getAbsentCounts = () => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, all: 0 };
    students.forEach(s => {
      let abCount = 0;
      s.marks.forEach(m => { if (isAbsent(m)) abCount++; });
      if (abCount >= classData.subjects.length) counts.all++;
      else if (abCount >= 5) counts[5]++;
      else if (abCount >= 4) counts[4]++;
      else if (abCount >= 3) counts[3]++;
      else if (abCount >= 2) counts[2]++;
      else if (abCount >= 1) counts[1]++;
    });
    return counts;
  };

  // Students failed grouped by number of courses
  const getFailCounts = () => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    students.forEach(s => {
      let failCount = 0;
      s.marks.forEach((m, idx) => {
        if (isFail(m)) failCount++;
      });
      if (failCount >= 6) counts[6]++;
      else if (failCount >= 5) counts[5]++;
      else if (failCount >= 4) counts[4]++;
      else if (failCount >= 3) counts[3]++;
      else if (failCount >= 2) counts[2]++;
      else if (failCount >= 1) counts[1]++;
    });
    return counts;
  };

  // List of absentees (students who were absent in at least 1 subject)
  const absenteeList = students.filter(s => {
    return s.marks.some(m => isAbsent(m));
  }).map(s => {
    let abCount = 0;
    s.marks.forEach(m => { if (isAbsent(m)) abCount++; });
    return { ...s, absentCount: abCount };
  });

  // List of failed students (due to marks, not absence)
  const failedDueToMarks = students.filter(s => {
    let failCount = 0;
    s.marks.forEach(m => { if (isFail(m)) failCount++; });
    return failCount > 0;
  }).map(s => {
    let failCount = 0;
    s.marks.forEach(m => { if (isFail(m)) failCount++; });
    return { ...s, failCount };
  });

  const absentCounts = getAbsentCounts();
  const failCounts = getFailCounts();

  const handleExportExcel = () => {
    if (!classData) return;
    try {
      console.log("Excel export started...");
      const wb = XLSX.utils.book_new();

      // 1. Course Wise Results
      const courseWiseData = cd.map((c, i) => {
        const stats = getSubjectStats(i);
        return {
          "S.No": i + 1,
          "Course Code": c.courseCode,
          "Course Name": c.courseName,
          "Faculty": c.facultyName,
          "Total": stats.total,
          "Pass": stats.pass,
          "Fail": stats.fail,
          "AB": stats.ab,
          "Pass %": stats.passPercent
        };
      });
      const ws1 = XLSX.utils.json_to_sheet(courseWiseData);
      XLSX.utils.book_append_sheet(wb, ws1, "Course Wise Results");

      // 2. Toppers
      const toppersData = toppers.map((s, i) => ({ "Rank": i + 1, "Reg No": s.regNo, "Name": s.name, "Percentage": s.percentage }));
      const ws2 = XLSX.utils.json_to_sheet(toppersData);
      XLSX.utils.book_append_sheet(wb, ws2, "Toppers");

      // 3. Slow Learners
      const slowLearnersData = slowLearners.map((s, i) => ({ "S.No": i + 1, "Reg No": s.regNo, "Name": s.name, "Percentage": s.percentage }));
      const ws3 = XLSX.utils.json_to_sheet(slowLearnersData);
      XLSX.utils.book_append_sheet(wb, ws3, "Slow Learners");

      // 4. Absentees
      const absenteesData = absenteeList.map((s, i) => ({
        "S.No": i + 1,
        "Reg No": s.regNo,
        "Name": s.name,
        "Courses Absent": s.absentCount
      }));
      const ws4 = XLSX.utils.json_to_sheet(absenteesData);
      XLSX.utils.book_append_sheet(wb, ws4, "Absentees");

      // 5. Failed Students
      const failedData = failedDueToMarks.map((s, i) => ({
        "S.No": i + 1,
        "Reg No": s.regNo,
        "Name": s.name,
        "Courses Failed": s.failCount
      }));
      const ws5 = XLSX.utils.json_to_sheet(failedData);
      XLSX.utils.book_append_sheet(wb, ws5, "Failed Students");

      XLSX.writeFile(wb, `${classData.className}_Result_Analysis.xlsx`);
      console.log("Excel export completed.");
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("Failed to download excel: " + err.message);
    }
  };

  const getDisplayDate = () => {
    if (classData && classData.date) return classData.date;
    return new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
  };


  const tblStyle = { width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "12px", borderColor: "black", color: "black" };
  const thStyle = { padding: "6px", background: "#f2f2f2", border: "1px solid black" };
  const tdStyle = { padding: "5px", border: "1px solid black" };

  return (
    <div className="page-layout">
      <h1>Result Analysis</h1>
      {renderFilterRow()}
      {renderClassSelector()}

      <style>{`
              @media print {
                @page { 
                  margin: 1cm; 
                  margin-bottom: 2cm; 
                  @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10px;
                    font-family: "Times New Roman", Times, serif;
                    color: black;
                  }
                }
                body { 
                  margin: 0 !important;
                  padding: 0 !important;
                }
                .no-print, select, button, h1 {
                  display: none !important;
                }
                .page-layout {
                  padding: 0 !important;
                  margin: 0 !important;
                  border: none !important;
                }
                .printable-analysis { 
                  display: block !important;
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .no-print { display: none !important; }
              }
      `}</style>

      <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", cursor: "pointer", borderRadius: "6px" }}>
          🖨 Print
        </button>
        <button onClick={handleExportExcel} style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", cursor: "pointer", borderRadius: "6px" }}>
          📊 Download Excel
        </button>
        <button 
          onClick={() => {
            if (isEditingProgress) {
              saveProgress();
            } else {
              setIsEditingProgress(true);
            }
          }} 
          style={{ 
            padding: "10px 20px", 
            background: isEditingProgress ? "#4CAF50" : "#ff9800", 
            color: "white", 
            border: "none", 
            cursor: "pointer", 
            borderRadius: "6px" 
          }}
        >
          {isEditingProgress ? "💾 Save Progress" : "✏️ Edit Semester Progress"}
        </button>
        {isEditingProgress && (
          <button 
            onClick={autoFillCurrentExam}
            style={{ padding: "10px 20px", background: "#17a2b8", color: "white", border: "none", cursor: "pointer", borderRadius: "6px" }}
          >
            🔄 Auto-fill {classData.examName}
          </button>
        )}
      </div>


      <div className="printable-analysis" style={{ background: "white", color: "black", padding: "30px", fontFamily: '"Times New Roman", Times, serif', minWidth: "800px" }}>
        {/* Header Section - Banner Update */}
        <div style={{ position: "relative", marginBottom: "10px", width: "100%" }}>
          <div style={{ textAlign: "right", fontSize: "10px", fontWeight: "bold", color: "black", marginBottom: "2px" }}>
            {classData.iqacPrefix || "MEC/IQAC/2026-27/COE/"}003
          </div>
          <img src={headerLogo} alt="MEC Header" style={{ width: "100%", height: "85px", display: "block" }} />

          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <h2 style={{ margin: "5px 0 2px", fontSize: "14px", fontWeight: "bold", color: "black" }}>OFFICE OF THE CONTROLLER OF EXAMINATIONS</h2>
            <h3 style={{ margin: "0 0 2px", fontSize: "14px", color: "black" }}>RESULT ANALYSIS{classData.academicYearText || ""}</h3>
            <h3 style={{ margin: "0", fontSize: "14px", color: "black" }}>{classData.examName}</h3>
          </div>
        </div>


        <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0", fontSize: "14px", fontWeight: "bold", color: "black" }}>
          <div>Prgm./Dept.: {classData.programme || "B.E"}/{classData.department || "CSE"}</div>
          <div>Year/Sem./Sec.: {classData.yearSemSec || "II/IV/A"}</div>
          <div>DATE: {getDisplayDate()}</div>
        </div>

        {/* A. SEMESTER PROGRESS */}
        <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "15px 0 8px", color: "black" }}>A. SEMESTER PROGRESS</h3>
        <table border="1" style={{ ...tblStyle, fontSize: "14px", fontWeight: "bold" }}>
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th style={thStyle}>S. No.</th>
              <th style={thStyle}>Description</th>
              {progressKeys.map(k => (
                <th key={k} style={thStyle}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>1</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>Total No. of Students (A)</td>
              {progressKeys.map(k => (
                <td key={k} style={tdStyle}>
                  {isEditingProgress ? (
                    <input 
                      type="text" 
                      value={progressData[k]?.total || ""} 
                      onChange={e => handleProgressChange(k, "total", e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "center", background: "#fff9c4" }}
                    />
                  ) : (
                    progressData[k]?.total || ""
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td style={tdStyle}>2</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>No. of Students Pass (B)</td>
              {progressKeys.map(k => (
                <td key={k} style={tdStyle}>
                  {isEditingProgress ? (
                    <input 
                      type="text" 
                      value={progressData[k]?.pass || ""} 
                      onChange={e => handleProgressChange(k, "pass", e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "center", background: "#fff9c4" }}
                    />
                  ) : (
                    progressData[k]?.pass || ""
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td style={tdStyle}>3</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>Pass % (B/A) × 100</td>
              {progressKeys.map(k => (
                <td key={k} style={tdStyle}>
                  {isEditingProgress ? (
                    <input 
                      type="text" 
                      value={progressData[k]?.percentage || ""} 
                      onChange={e => handleProgressChange(k, "percentage", e.target.value)}
                      style={{ width: "100%", border: "none", textAlign: "center", background: "#fff9c4" }}
                    />
                  ) : (
                    progressData[k]?.percentage || ""
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* B. COURSE WISE RESULTS */}
        <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "20px 0 8px", color: "black" }}>B. COURSE WISE RESULTS</h3>

        <table border="1" style={{ ...tblStyle, fontSize: "14px", fontWeight: "bold" }}>
          <thead>
            <tr>
              <th rowSpan="2" style={thStyle}>S.No</th>
              <th rowSpan="2" style={thStyle}>COURSE<br />CODE</th>
              <th rowSpan="2" style={thStyle}>COURSE NAME</th>
              <th rowSpan="2" style={thStyle}>NAME OF THE FACULTY</th>
              <th colSpan="3" style={thStyle}>No.of Students</th>
              <th rowSpan="2" style={thStyle}>PASS<br />%</th>
            </tr>
            <tr>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>PASS</th>
              <th style={thStyle}>FAIL</th>
            </tr>
          </thead>
          <tbody>
            {cd.map((c, i) => {
              const stats = getSubjectStats(i);
              return (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{c.courseCode}</td>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>{c.courseName}</td>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>{c.facultyName}</td>
                  <td style={tdStyle}>{stats.total}</td>
                  <td style={tdStyle}>{stats.pass}</td>
                  <td style={tdStyle}>{stats.fail}</td>
                  <td style={tdStyle}>{stats.passPercent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* C. PASS % TARGET */}
        <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: "20px 0 5px", color: "black" }}>C. PASS % : TARGET : {classData.targetPassPercentage || 85} %</h3>
        <p style={{ fontSize: "16px", fontWeight: "bold", color: "black" }}>Over all Pass %: (No. of students Pass /Total No. of students)*100 = <span style={{ fontSize: "18px" }}>{overallPassPercent} %</span></p>

        {/* D. FAST LEARNERS AND SLOW LEARNERS */}
        <h3 style={{ fontSize: "13px", margin: "20px 0 8px", color: "black" }}>D. FAST LEARNERS (TOPPERS) AND SLOW LEARNERS</h3>
        <div style={{ display: "flex", gap: "20px" }}>
          <div style={{ flex: 1 }}>
            <table border="1" style={{ ...tblStyle, width: "100%" }}>
              <thead>
                <tr style={{ fontSize: "12px" }}><th colSpan="4" style={thStyle}>Toppers</th></tr>
                <tr style={{ fontSize: "12px" }}>
                  <th style={thStyle}>S.No</th>
                  <th style={thStyle}>Reg.No.</th>
                  <th style={thStyle}>Name of the Student</th>
                  <th style={thStyle}>Percentage %</th>
                </tr>
              </thead>
              <tbody>
                {toppers.map((s, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{s.regNo}</td>
                    <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>{s.name}</td>
                    <td style={tdStyle}>{s.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1 }}>
            <table border="1" style={{ ...tblStyle, width: "100%" }}>
              <thead>
                <tr style={{ fontSize: "12px" }}><th colSpan="4" style={thStyle}>Slow Learners</th></tr>
                <tr style={{ fontSize: "12px" }}>
                  <th style={thStyle}>S.No</th>
                  <th style={thStyle}>Reg.No.</th>
                  <th style={thStyle}>Name of the Student</th>
                  <th style={thStyle}>Percentage %</th>
                </tr>
              </thead>
              <tbody>
                {slowLearners.map((s, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{s.regNo}</td>
                    <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>{s.name}</td>
                    <td style={tdStyle}>{s.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
 
        {/* Page Break after Section D */}
        <div style={{ pageBreakAfter: "always" }}></div>


        {/* E. DAY SCHOLARS AND HOSTELLERS */}
        <h3 style={{ fontSize: "13px", margin: "20px 0 8px", color: "black" }}>E. DAY SCHOLARS AND HOSTELLERS</h3>
        <table border="1" style={tblStyle}>
          <thead>
            <tr>
              <th rowSpan="2" style={thStyle}></th>
              <th rowSpan="2" style={thStyle}>Details</th>
              <th colSpan="2" style={thStyle}>Day Scholar</th>
              <th colSpan="2" style={thStyle}>Hosteller</th>
            </tr>
            <tr>
              <th style={thStyle}>Boys</th>
              <th style={thStyle}>Girls</th>
              <th style={thStyle}>Boys</th>
              <th style={thStyle}>Girls</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>1</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>Total No. of Students (A=B+C+D)</td>
              <td style={tdStyle}>{dsB.length}</td>
              <td style={tdStyle}>{dsG.length}</td>
              <td style={tdStyle}>{hB.length}</td>
              <td style={tdStyle}>{hG.length}</td>
            </tr>
            <tr>
              <td style={tdStyle}>2</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>No. of Students Pass (B)</td>
              <td style={tdStyle}>{catPass(dsB)}</td>
              <td style={tdStyle}>{catPass(dsG)}</td>
              <td style={tdStyle}>{catPass(hB)}</td>
              <td style={tdStyle}>{catPass(hG)}</td>
            </tr>
            <tr>
              <td style={tdStyle}>3</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>No. of Students Fail (C)</td>
              <td style={tdStyle}>{catFail(dsB)}</td>
              <td style={tdStyle}>{catFail(dsG)}</td>
              <td style={tdStyle}>{catFail(hB)}</td>
              <td style={tdStyle}>{catFail(hG)}</td>
            </tr>
            <tr>
              <td style={tdStyle}>4</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>No. of Students Absent (D)</td>
              <td style={tdStyle}>{catAb(dsB)}</td>
              <td style={tdStyle}>{catAb(dsG)}</td>
              <td style={tdStyle}>{catAb(hB)}</td>
              <td style={tdStyle}>{catAb(hG)}</td>
            </tr>
            <tr>
              <td style={tdStyle}>5</td>
              <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>Pass % (B/A) × 100</td>
              <td style={tdStyle}>{catPassPct(dsB)}</td>
              <td style={tdStyle}>{catPassPct(dsG)}</td>
              <td style={tdStyle}>{catPassPct(hB)}</td>
              <td style={tdStyle}>{catPassPct(hG)}</td>
            </tr>
          </tbody>
        </table>

        {/* F. COURSE WISE ABSENTEES */}
        <h3 style={{ fontSize: "13px", margin: "20px 0 8px", color: "black" }}>F. COURSE WISE ABSENTEES (Mention in Red Color)</h3>
        <table border="1" style={tblStyle}>
          <thead>
            <tr>
              <th style={thStyle}></th>
              {cd.map((c, i) => <th key={i} style={thStyle}>{c.shortName || c.courseCode}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, fontWeight: "bold" }}>No. of Absent</td>
              {cd.map((_, i) => <td key={i} style={{ ...tdStyle, color: "red" }}>{getAbsenteesForSubject(i).length}</td>)}
            </tr>
          </tbody>
        </table>

        {/* F.1 NO. OF STUDENTS ABSENT */}
        <h3 style={{ fontSize: "13px", margin: "16px 0 8px", color: "black" }}>F.1 NO. OF STUDENTS ABSENT (Mention in Red Color)</h3>
        <table border="1" style={tblStyle}>
          <thead>
            <tr>
              <th style={thStyle}>One Course</th>
              <th style={thStyle}>Two Courses</th>
              <th style={thStyle}>Three Courses</th>
              <th style={thStyle}>Four Courses</th>
              <th style={thStyle}>Five Courses</th>
              <th style={thStyle}>All the Courses</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, color: "red" }}>{absentCounts[1]}</td>
              <td style={{ ...tdStyle, color: "red" }}>{absentCounts[2]}</td>
              <td style={{ ...tdStyle, color: "red" }}>{absentCounts[3]}</td>
              <td style={{ ...tdStyle, color: "red" }}>{absentCounts[4]}</td>
              <td style={{ ...tdStyle, color: "red" }}>{absentCounts[5]}</td>
              <td style={{ ...tdStyle, color: "red" }}>{absentCounts.all}</td>
            </tr>
          </tbody>
        </table>

        {/* F.2 LIST OF STUDENTS FAIL DUE TO ABSENT */}
        <h3 style={{ fontSize: "13px", margin: "16px 0 8px", color: "black" }}>F.2. List of Students Fail due to Absent (Mention in Red Color)</h3>
        <table border="1" style={tblStyle}>
          <thead>
            <tr>
              <th style={thStyle}>S.No.</th>
              <th style={thStyle}>Reg. No.</th>
              <th style={thStyle}>Name of the Student</th>
              <th style={thStyle}>No. of Courses<br />Absent</th>
              <th style={thStyle}>Reason for Absent</th>
              <th style={thStyle}>Signature of<br />Student with Date</th>
            </tr>
          </thead>
          <tbody>
            {absenteeList.length === 0 && <tr><td colSpan="6" style={tdStyle}>Nil</td></tr>}
            {absenteeList.map((s, i) => (
              <tr key={i} style={{ color: "red" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{s.regNo}</td>
                <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>{s.name}</td>
                <td style={tdStyle}>{s.absentCount}</td>
                <td style={{ ...tdStyle, minWidth: "100px" }}></td>
                <td style={{ ...tdStyle, minWidth: "100px" }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* G. DETAILS OF FAIL DUE TO MARK */}
        <h3 style={{ fontSize: "13px", margin: "20px 0 8px", color: "black" }}>G. DETAILS OF FAIL DUE TO MARK</h3>
        <p style={{ fontSize: "12px", fontWeight: "bold", color: "black", margin: "0 0 8px" }}>Total No. of Students fail in</p>
        <table border="1" style={tblStyle}>
          <thead>
            <tr>
              <th style={thStyle}>One Course</th>
              <th style={thStyle}>Two Courses</th>
              <th style={thStyle}>Three Courses</th>
              <th style={thStyle}>Four Courses</th>
              <th style={thStyle}>Five Courses</th>
              <th style={thStyle}>Six Courses</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>{failCounts[1]}</td>
              <td style={tdStyle}>{failCounts[2]}</td>
              <td style={tdStyle}>{failCounts[3]}</td>
              <td style={tdStyle}>{failCounts[4]}</td>
              <td style={tdStyle}>{failCounts[5]}</td>
              <td style={tdStyle}>{failCounts[6]}</td>
            </tr>
          </tbody>
        </table>

        {/* G.1 LIST OF STUDENTS FAIL DUE TO MARK */}
        <h3 style={{ fontSize: "13px", margin: "16px 0 8px", color: "black" }}>G.1. List of Students Fail due to Mark (Mention in Red Color)</h3>
        <table border="1" style={tblStyle}>
          <thead>
            <tr>
              <th style={thStyle}>S.No.</th>
              <th style={thStyle}>Reg. No.</th>
              <th style={thStyle}>Name of the Student</th>
              <th style={thStyle}>No. of Courses<br />Fail</th>
              <th style={thStyle}>Reason for Fail</th>
              <th style={thStyle}>Signature of Student<br />with Date</th>
            </tr>
          </thead>
          <tbody>
            {failedDueToMarks.length === 0 && <tr><td colSpan="6" style={tdStyle}>Nil</td></tr>}
            {failedDueToMarks.map((s, i) => (
              <tr key={i} style={{ color: "red" }}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>{s.regNo}</td>
                <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px" }}>{s.name}</td>
                <td style={tdStyle}>{s.failCount}</td>
                <td style={{ ...tdStyle, minWidth: "100px" }}></td>
                <td style={{ ...tdStyle, minWidth: "100px" }}></td>
              </tr>
            ))}
          </tbody>
        </table>
          
        {/* H. ACTION TAKEN REPORT and subsequent sections start on a new page */}
        <div style={{ pageBreakBefore: "always", minHeight: "280mm", display: "flex", flexDirection: "column", padding: "10px 0", fontWeight: "bold" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "10px 0", color: "black" }}>H. ACTION TAKEN REPORT</h3>

          <div style={{ flex: 1 }}>
            {cd.map((c, i) => {
              if (classData.actionTakenSubjects && classData.actionTakenSubjects.length > 0 && !classData.actionTakenSubjects.includes(c.courseCode)) {
                return null;
              }
              return (
              <div key={i} style={{ border: "1px solid black", padding: "10px", marginBottom: "12px", fontSize: "12px", color: "black", minHeight: "90px", fontWeight: "bold" }}>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "0 0 5px" }}>
                  <strong>Course {i + 1}: {c.courseCode} - {c.courseName}</strong>
                  <span>Pass %: <strong>{getSubjectStats(i).passPercent}%</strong></span>
                </div>
                <p style={{ margin: "10px 0 5px", minHeight: "45px", borderBottom: "1px dotted gray" }}></p>
                <div style={{ display: "flex", justifyContent: "space-between", margin: "5px 0 0", fontSize: "11px" }}>
                  <span>Faculty Name: {c.facultyName}</span>
                  <strong>Faculty Signature</strong>
                </div>
              </div>
              );
            })}

          </div>

          <div style={{ marginTop: "auto" }}>
            {/* I. REMARKS */}
            <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "20px 0 10px", color: "black" }}>I. REMARKS</h3>
            <table border="1" style={tblStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Coordinators</th>
                  <th style={thStyle}>Name and Designation</th>
                  <th style={thStyle}>Remarks</th>
                  <th style={thStyle}>Signature with Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px", height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}>Mentor 2 (Exam Coordinator)</td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px", height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}>Mentor 1 (Class Adviser)</td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: "8px", height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}>Dept. Exam Coordinator (PAC)</td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                  <td style={{ ...tdStyle, height: "80px", verticalAlign: "bottom", fontWeight: "bold" }}></td>
                </tr>
              </tbody>
            </table>

            <table style={{ width: "100%", marginTop: "80px", borderCollapse: "collapse", color: "black" }}>
              <tbody>
                <tr style={{ fontWeight: "bold", fontSize: "14px" }}>
                  <td style={{ textAlign: "left", width: "25%" }}>DATE: {getDisplayDate()}</td>
                  <td style={{ textAlign: "center", width: "25%" }}>HOD</td>
                  <td style={{ textAlign: "center", width: "25%" }}>COE</td>
                  <td style={{ textAlign: "right", width: "25%" }}>PRINCIPAL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
