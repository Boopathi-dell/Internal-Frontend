import { useState, useEffect } from "react";
import API from "../api";
import * as XLSX from "xlsx";
import headerLogo from "../assets/logo image.jpg";



export default function RankList() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classData, setClassData] = useState(null);
  const [filters, setFilters] = useState({ year: "I", semester: "I", section: "A", exam: "Unit Test - I" });
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [printBold, setPrintBold] = useState(false);

  const examNameOptions = [
    "Model Exam",
    "Model Practical Exam",
    "Unit Test - I", "Unit Test - II", "Unit Test - III", "Unit Test - IV", "Unit Test - V",
    "CIA - I", "CIA - II", "CIA - III",
    "MKC", "ESE"
  ];

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
              if (markStr === "AB" || markStr === "U" || markStr === "U*" || markStr === "FAIL" || markStr === "") fail = true;
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

      const sortedStudents = (loadedClassData.students || []).sort((a, b) => b.total - a.total);
      let cleanedCourseDetails = (loadedClassData.courseDetails || []).map(cd => {
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
          ...cd,
          shortName: cd.shortName || ""
        };
      });
      setClassData({ ...loadedClassData, students: sortedStudents, courseDetails: cleanedCourseDetails });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await API.get("/api/classes");
        setClasses(res.data);
        applyFilters(res.data, filters);
      } catch (err) {
        console.error(err);
      }
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
          {examNameOptions.map(opt => <option key={opt} value={opt}>{opt === "ESE" ? "End Semester Examination" : opt}</option>)}
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

  const getCourseDetails = () => {
    if (!classData) return [];
    if (classData.courseDetails && classData.courseDetails.length > 0) return classData.courseDetails;
    return (classData.subjects || []).map(s => ({ courseCode: s, courseName: "", facultyName: "" }));
  };

  const calculateSubjectStats = (subjectIndex) => {
    if (!classData || !classData.students || classData.students.length === 0) return { total: 0, pass: 0, fail: 0, passPercent: 0 };
    const students = classData.students;
    const total = students.length;
    let pass = 0;
    students.forEach(s => {
      const marks = s.marks || [];
      const strVal = String(marks[subjectIndex] || "").toUpperCase().trim();
      if (classData.examName === "ESE") {
        if (strVal !== "AB" && strVal !== "U" && strVal !== "U*" && strVal !== "FAIL" && strVal !== "") {
          pass++;
        }
      } else {
        if (strVal !== "A" && strVal !== "AB" && strVal !== "") {
          const mark = Number(strVal);
          if (!isNaN(mark) && mark >= (classData.passMark || 50)) pass++;
        }
      }
    });
    return { total, pass, fail: total - pass, passPercent: total === 0 ? 0 : Math.round((pass / total) * 100) };
  };

  const getOverallPassPercent = () => {
    if (!classData || !classData.students || classData.students.length === 0) return 0;
    const total = classData.students.length;
    let pass = 0;
    classData.students.forEach(s => {
      if (s.result === "Pass") pass++;
    });
    return total === 0 ? 0 : Math.round((pass / total) * 100);
  };

  const getDisplayDate = () => {
    if (classData && classData.date) return classData.date;
    return new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
  };

  const handleExportExcel = () => {
    if (!classData) return;
    try {
      console.log("Structured Rank List export started...");
      const wb = XLSX.utils.book_new();
      const courseDetails = getCourseDetails();
      
      // Build 2D array for structured layout
      const aoa = [
        ["MUTHAYAMMAL ENGINEERING COLLEGE"],
        ["(Autonomous)"],
        ["OFFICE OF THE CONTROLLER OF EXAMINATIONS"],
        [`${classData.examName === "ESE" ? "End Semester Examination" : classData.examName} - RANK LIST`],
        [`Department : ${classData.department || "CSE"}`, "", `Class : ${classData.className.trim()}`, "", `Date: ${getDisplayDate()}`],
        [] // empty row
      ];

      // Header Row
      const headerRow = ["R. No", "Register Number", "Name of the Student"];
      classData.subjects.forEach((sub, j) => {
        headerRow.push(courseDetails[j]?.courseCode || sub);
      });
      headerRow.push(classData.examName === "ESE" ? "SGPA" : "Total Marks", "Pass %", "Pass/Fail");
      aoa.push(headerRow);

      // Student Data Rows
      classData.students.forEach((s, i) => {
        const row = [i + 1, s.regNo, s.name];
        classData.subjects.forEach((sub, j) => {
          row.push(s.marks ? s.marks[j] : "-");
        });
        row.push(s.total, s.percentage, s.result === "Pass" ? "P" : "F");
        aoa.push(row);
      });

      // Summary Rows for Excel
      const totalRow = ["", "", "Total"];
      const passRow = ["", "", "Pass"];
      const failRow = ["", "", "Fail"];
      const passPctRow = ["", "", "Pass %"];

      classData.subjects.forEach((_, j) => {
        const stats = calculateSubjectStats(j);
        totalRow.push(stats.total);
        passRow.push(stats.pass);
        failRow.push(stats.fail);
        passPctRow.push(stats.passPercent);
      });

      aoa.push(totalRow, passRow, failRow, passPctRow);

      aoa.push([]); // spacer row

      // Course Wise Statistics
      aoa.push(["S.No.", "COURSE CODE", "COURSE NAME", "NAME OF THE FACULTY", "PASS %", "SIGNATURE"]);
      courseDetails.forEach((c, i) => {
        const stats = calculateSubjectStats(i);
        aoa.push([i + 1, c.courseCode, c.courseName, c.facultyName, stats.passPercent, ""]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      
      // Basic Column Widths
      ws["!cols"] = [
        { wch: 6 },  // Rank
        { wch: 15 }, // RegNo
        { wch: 25 }, // Name
        ...(classData.subjects || []).map(() => ({ wch: 10 })), // Subjects
        { wch: 10 }, // Total
        { wch: 8 },  // %
        { wch: 8 }   // P/F
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Rank List");
      XLSX.writeFile(wb, `${classData.className}_Rank_List.xlsx`);
      console.log("Structured Rank List export completed.");
    } catch (err) {
      console.error("Structured Rank List Export Error:", err);
      alert("Failed to download structured rank list excel: " + err.message);
    }
  };




  return (
    <div className="page-layout">
      <h1>Rank List</h1>
      {renderFilterRow()}
      {renderClassSelector()}

      {filteredClasses.length === 0 && (
        <div className="no-data-card" style={{ padding: "20px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", border: "1px solid var(--danger)", marginTop: "20px" }}>
          <p style={{ color: "var(--danger)", margin: 0 }}>
            No class matches this criteria. Please ensure you have created a class for this Year/Sem/Sec/<strong>{filters.exam}</strong> in the <strong>Admin Panel</strong> first.
          </p>
        </div>
      )}

      {classData && classData.students.length > 0 && (
        <div>
          <style>{`
            @media print {
              @page { 
                margin: 0.5cm;
                margin-top: 0cm; 
                margin-bottom: 1cm;
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
              .no-print, select, h1, button {
                display: none !important;
              }
              .page-layout {
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
              }
              .printable-rank { 
                display: block !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              .print-bold-text, .print-bold-text th, .print-bold-text td, .print-bold-text span, .print-bold-text div, .print-bold-text p, .print-bold-text h3 {
                font-weight: bold !important;
              }
              .no-print { display: none !important; }
              h1, h2, h3, p { margin: 2px 0 !important; padding: 0 !important; }
              table { border-collapse: collapse !important; width: 100% !important; margin: 5px 0 !important; }
              td, th { padding: 2px 4px !important; font-size: 12px !important; }
              .main-report-table { width: 100% !important; margin: 5px 0 !important; }
              .main-report-table th { width: auto !important; min-width: 0 !important; max-width: none !important; }
              .sig-cell { height: 75px !important; }
            }


          `}</style>


          <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "center" }}>
            <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#007bff", color: "white", border: "none", cursor: "pointer", borderRadius: "6px" }}>
              🖨 Print
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontWeight: "bold" }}>
              <input type="checkbox" checked={printBold} onChange={(e) => setPrintBold(e.target.checked)} style={{ width: "16px", height: "16px" }} />
              Print in Bold
            </label>
            <button onClick={handleExportExcel} style={{ padding: "10px 20px", background: "#28a745", color: "white", border: "none", cursor: "pointer", borderRadius: "6px" }}>
              📊 Download Excel
            </button>
          </div>


          <div className={`printable-rank ${printBold ? 'print-bold-text' : ''}`} style={{ background: "white", color: "black", padding: "30px", fontFamily: '"Times New Roman", Times, serif', minWidth: "800px" }}>




            {/* College Header */}
            <div style={{ position: "relative", marginBottom: "10px", width: "100%" }}>
              <div style={{ textAlign: "right", fontSize: "9px", fontWeight: "bold", color: "black", marginBottom: "2px" }}>
                {classData.iqacPrefix || "MEC/IQAC/2026-27/COE/"}002
              </div>
              <img src={headerLogo} alt="MEC Header" style={{ width: "100%", height: "85px", display: "block" }} />
              
              <div style={{ textAlign: "center", marginTop: "8px" }}>
                <h2 style={{ margin: "5px 0 2px", fontSize: "14px", fontWeight: "bold", color: "black" }}>OFFICE OF THE CONTROLLER OF EXAMINATIONS</h2>
                <h3 style={{ margin: "0", fontSize: "14px", color: "black" }}>{classData.examName === "ESE" ? "End Semester Examination" : classData.examName} - RANK LIST{classData.academicYearText || ""}</h3>
              </div>
            </div>





            <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0", fontSize: "14px", fontWeight: "bold", color: "black" }}>
              <div>Prgm./Dept.: {classData.programme || "B.E"}/{classData.department || "CSE"}</div>
              <div>Year/Sem./Sec.: {classData.yearSemSec || "II/IV/A"}</div>
              <div>Date: {getDisplayDate()}</div>
            </div>





            <table className="main-report-table" border="1" style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "12px", borderColor: "black", color: "black" }}>





              <thead>
                <tr style={{ background: "#f2f2f2", fontSize: "12px" }}>
                  <th rowSpan="2" style={{ padding: "3px", width: "40px" }}>R. No</th>
                  <th rowSpan="2" style={{ padding: "3px", width: "100px" }}>Register<br />Number</th>
                  <th rowSpan="2" style={{ padding: "3px", minWidth: "200px" }}>Name of the<br />Student</th>
                  {getCourseDetails().map((cd, idx) => (
                    <th key={idx} style={{ padding: "2px", width: "65px", wordWrap: "break-word", fontSize: "10px" }}>{cd.courseCode}</th>
                  ))}
                  <th rowSpan="2" style={{ padding: "3px", width: "60px" }}>{classData.examName === "ESE" ? "SGPA" : <>Total<br />Marks</>}</th>
                  <th rowSpan="2" style={{ padding: "3px", width: "55px" }}>Pass %</th>
                  <th rowSpan="2" style={{ padding: "3px", width: "50px" }}>Pass/<br />Fail</th>
                </tr>

                <tr style={{ background: "#f2f2f2", fontSize: "12px" }}>
                  {getCourseDetails().map((cd, idx) => (
                    <th key={`cn-${idx}`} style={{ padding: "4px", width: "65px", wordWrap: "break-word", fontSize: "10px", fontWeight: "bold" }}>{cd.shortName || cd.courseName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(classData.students || []).map((s, i) => (
                  <tr key={s._id || i}>
                    <td style={{ padding: "4px" }}>{i + 1}</td>
                    <td style={{ padding: "4px" }}>{s.regNo}</td>
                    <td style={{ padding: "4px", textAlign: "left", paddingLeft: "10px", fontSize: "12px" }}>{s.name}</td>
                    {(classData.subjects || []).map((sub, j) => {
                      const m = s.marks ? String(s.marks[j]).toUpperCase().trim() : "";
                      const isESE = classData.examName === "ESE";
                      let isFail = false;
                      if (isESE) {
                        isFail = (m === "AB" || m === "U" || m === "U*" || m === "FAIL" || m === "RA" || m === "SA" || m === "W" || m === "");
                      } else {
                        isFail = (m === "AB" || m === "A" || (m !== "" && !isNaN(Number(m)) && Number(m) < classData.passMark));
                      }
                      return (
                      <td 
                        key={j} 
                        style={{ 
                          padding: "4px",
                          backgroundColor: isFail ? "rgba(239, 68, 68, 0.45)" : "transparent",
                          color: "black",
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                          fontWeight: isFail ? "bold" : "normal"
                        }}
                      >
                        {m || "-"}
                      </td>
                    )})}
                    <td style={{ padding: "4px", fontWeight: "bold" }}>{s.total}</td>
                    <td style={{ padding: "4px" }}>{s.percentage}</td>
                    <td style={{ padding: "4px", fontWeight: "bold" }}>
                      {s.result === "Fail" ? "F" : s.result === "Pass" ? "P" : "-"}
                    </td>
                  </tr>
                ))}

                {/* Summary rows restored */}
                <tr style={{ fontWeight: "bold", background: "#f2f2f2" }}>
                  <td colSpan="3" style={{ textAlign: "right", padding: "4px" }}>Total</td>
                  {(classData.subjects || []).map((_, idx) => (
                    <td key={`total-${idx}`} style={{ padding: "4px" }}>{calculateSubjectStats(idx).total}</td>
                  ))}
                  <td colSpan="3" style={{ border: "none" }}></td>
                </tr>
                <tr style={{ fontWeight: "bold", background: "#f2f2f2" }}>
                  <td colSpan="3" style={{ textAlign: "right", padding: "4px" }}>Pass</td>
                  {(classData.subjects || []).map((_, idx) => (
                    <td key={`pass-${idx}`} style={{ padding: "4px" }}>{calculateSubjectStats(idx).pass}</td>
                  ))}
                  <td colSpan="3" style={{ border: "none" }}></td>
                </tr>
                <tr style={{ fontWeight: "bold", background: "#f2f2f2" }}>
                  <td colSpan="3" style={{ textAlign: "right", padding: "4px" }}>Fail</td>
                  {(classData.subjects || []).map((_, idx) => (
                    <td key={`fail-${idx}`} style={{ padding: "4px" }}>{calculateSubjectStats(idx).fail}</td>
                  ))}
                  <td colSpan="3" style={{ border: "none" }}></td>
                </tr>
                <tr style={{ fontWeight: "bold", background: "#f2f2f2" }}>
                  <td colSpan="3" style={{ textAlign: "right", padding: "4px" }}>Pass %</td>
                  {(classData.subjects || []).map((_, idx) => (
                    <td key={`passpct-${idx}`} style={{ padding: "4px" }}>{calculateSubjectStats(idx).passPercent}</td>
                  ))}
                  <td colSpan="3" style={{ border: "none" }}></td>
                </tr>
              </tbody>
            </table>

            {/* Target & Overall Pass % */}
            <div style={{ textAlign: "left", marginTop: "15px", color: "black" }}>
              <p style={{ margin: "5px 0", fontSize: "16px", fontWeight: "bold" }}>C. PASS % : TARGET : {classData.targetPassPercentage || 85} %</p>
              <p style={{ margin: "5px 0", fontSize: "16px", fontWeight: "bold" }}>Over all Pass %: (No. of students Pass /Total No. of students)*100 = <span style={{ fontSize: "18px" }}>{getOverallPassPercent()} %</span></p>
            </div>





            {/* Course & Faculty Table */}
            <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px", textAlign: "center", fontSize: "14px", fontWeight: "bold", borderColor: "black", color: "black" }}>
              <thead>
                <tr style={{ background: "#f2f2f2", fontSize: "14px" }}>
                  <th style={{ padding: "2px" }}>S.No.</th>
                  <th style={{ padding: "2px" }}>COURSE CODE</th>
                  <th style={{ padding: "2px" }}>COURSE NAME</th>
                  <th style={{ padding: "2px" }}>NAME OF THE FACULTY</th>
                  <th style={{ padding: "2px" }}>PASS %</th>
                  <th style={{ padding: "2px" }}>SIGNATURE</th>
                </tr>
              </thead>
              <tbody>
                {getCourseDetails().map((c, i) => (
                  <tr key={i}>
                    <td style={{ padding: "4px" }}>{i + 1}</td>
                    <td style={{ padding: "4px" }}>{c.courseCode}</td>
                    <td style={{ padding: "4px", textAlign: "left", paddingLeft: "10px" }}>{c.courseName}</td>
                    <td style={{ padding: "4px", textAlign: "left", paddingLeft: "10px" }}>{c.facultyName}</td>
                    <td style={{ padding: "4px" }}>{calculateSubjectStats(i).passPercent}</td>
                    <td style={{ padding: "4px", minWidth: "100px" }}></td>
                  </tr>
                ))}


              </tbody>
            </table>



            {/* Signatures in bordered table */}
            <table border="1" style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px", textAlign: "center", fontWeight: "bold", fontSize: "14px", color: "black", borderColor: "black" }}>


              <tbody>
                <tr>
                  <td className="sig-cell" style={{ padding: "5px", border: "1px solid black", height: "110px", verticalAlign: "bottom", fontWeight: "bold" }}>
                    Exam Coordinator<br />(Mentor 2)
                  </td>
                  <td className="sig-cell" style={{ padding: "5px", border: "1px solid black", height: "110px", verticalAlign: "bottom", fontWeight: "bold" }}>
                    Class Advisor<br />(Mentor 1)
                  </td>
                  <td className="sig-cell" style={{ padding: "5px", border: "1px solid black", height: "110px", verticalAlign: "bottom", fontWeight: "bold" }}>
                    Year Coordinator
                  </td>
                </tr>
                <tr>
                  <td className="sig-cell" style={{ padding: "5px", border: "1px solid black", height: "110px", verticalAlign: "bottom", fontWeight: "bold" }}>
                    HOD
                  </td>
                  <td className="sig-cell" style={{ padding: "5px", border: "1px solid black", height: "110px", verticalAlign: "bottom", fontWeight: "bold" }}>
                    COE
                  </td>
                  <td className="sig-cell" style={{ padding: "5px", border: "1px solid black", height: "110px", verticalAlign: "bottom", fontWeight: "bold" }}>
                    PRINCIPAL
                  </td>
                </tr>


              </tbody>
            </table>
            
            <p style={{ textAlign: "left", fontSize: "12px", marginTop: "15px", fontStyle: "normal", color: "black", fontFamily: '"Times New Roman", Times, serif' }}>
              NOTE : Last date for submission: Three (3) working days from the last exam.
            </p>

          </div>
        </div>
      )}

      {classData && classData.students.length === 0 && (
        <p>No students found in this class.</p>
      )}
    </div>
  );
}
