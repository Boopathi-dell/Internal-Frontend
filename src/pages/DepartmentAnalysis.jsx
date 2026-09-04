import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import API from "../api";

export default function DepartmentAnalysis() {
  const [filters, setFilters] = useState({ year: "I", semester: "I", exam: "CIA - I", department: "CSE" });
  const [analysisData, setAnalysisData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [focusedSubjectIndices, setFocusedSubjectIndices] = useState([]);
  const [focusDropdownOpen, setFocusDropdownOpen] = useState(false);

  const toggleSubjectFocus = (idx) => {
    setFocusedSubjectIndices(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      return [...prev, idx];
    });
  };

  const examNameOptions = [
    "Model Exam", "Model Practical Exam", "Unit Test - I", "Unit Test - II", 
    "Unit Test - III", "Unit Test - IV", "Unit Test - V", "CIA - I", "CIA - II", 
    "CIA - III", "MKC", "ESE"
  ];

  const getSemOptionsForYear = (year) => {
    switch (year) {
      case "I": return ["I", "II"];
      case "II": return ["III", "IV"];
      case "III": return ["V", "VI"];
      case "IV": return ["VII", "VIII"];
      default: return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === "year") {
      const semOptions = getSemOptionsForYear(value);
      setFilters({
        ...filters,
        year: value,
        semester: semOptions[0]
      });
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setFetched(false);
    try {
      const res = await API.get("/api/analysis/department", {
        params: {
          year: filters.year,
          semester: filters.semester,
          exam: filters.exam,
          department: filters.department
        }
      });
      setAnalysisData(res.data);
      setFetched(true);
    } catch (err) {
      console.error("Failed to fetch department analysis", err);
      alert("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const handlePrint = () => {
    window.print();
  };

  const getSectionFocusedStats = (item) => {
    if (!item.students || item.students.length === 0) {
      return { totalStudents: item.totalStudents, passedStudents: item.passedStudents, failedStudents: item.failedStudents, passPercentage: item.passPercentage };
    }
    
    const activeIndices = focusedSubjectIndices.length > 0 ? focusedSubjectIndices : (item.subjects || []).map((_, i) => i);
    const isESE = item.examName === "ESE";
    let passed = 0;
    
    item.students.forEach(s => {
      let fail = false;
      let hasAbsent = false;
      
      (s.marks || []).forEach((val, idx) => {
        if (!activeIndices.includes(idx)) return;
        
        const markStr = String(val || "").toUpperCase().trim();
        if (isESE) {
          if (markStr === "AB" || markStr === "U*") hasAbsent = true;
          if (markStr === "AB" || markStr === "U" || markStr === "U*" || markStr === "FAIL" || markStr === "RA" || markStr === "SA" || markStr === "W" || markStr === "") fail = true;
        } else {
          if (markStr === "AB" || markStr === "A") {
            fail = true;
            hasAbsent = true;
          } else {
            const numVal = Number(markStr || 0);
            if (numVal < item.passMark) fail = true;
          }
        }
      });
      
      let res = "Pass";
      if (hasAbsent) res = "-";
      else if (fail) res = "Fail";
      
      if (res === "Pass") passed++;
    });
    
    const total = item.students.length;
    const failed = total - passed;
    const pct = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    
    return {
      totalStudents: total,
      passedStudents: passed,
      failedStudents: failed,
      passPercentage: pct
    };
  };

  const processedData = analysisData.map(item => ({
    ...item,
    focused: getSectionFocusedStats(item)
  }));

  // Calculate totals
  const totalStudentsAll = processedData.reduce((sum, item) => sum + item.focused.totalStudents, 0);
  const totalPassedAll = processedData.reduce((sum, item) => sum + item.focused.passedStudents, 0);
  const totalFailedAll = processedData.reduce((sum, item) => sum + item.focused.failedStudents, 0);
  const deptPassPercentage = totalStudentsAll > 0 ? ((totalPassedAll / totalStudentsAll) * 100).toFixed(2) : 0;

  const commonSubjects = analysisData.length > 0 ? (analysisData[0].subjects || []) : [];
  const commonCourseDetails = analysisData.length > 0 ? (analysisData[0].courseDetails || []) : [];

  return (
    <div className="fade-in">
      <div className="header-flex no-print">
        <div>
          <h1>Department Result Analysis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
            Generate and print overall result analysis across sections.
          </p>
        </div>
      </div>

      <div className="glass-card no-print" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="input-group" style={{ flex: 1, minWidth: "120px" }}>
            <label className="input-label">Year</label>
            <select className="text-input" name="year" value={filters.year} onChange={handleFilterChange}>
              <option value="I">I Year</option>
              <option value="II">II Year</option>
              <option value="III">III Year</option>
              <option value="IV">IV Year</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: "120px" }}>
            <label className="input-label">Semester</label>
            <select className="text-input" name="semester" value={filters.semester} onChange={handleFilterChange}>
              {getSemOptionsForYear(filters.year).map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: "150px" }}>
            <label className="input-label">Department</label>
            <select className="text-input" name="department" value={filters.department} onChange={handleFilterChange}>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="AI&DS">AI&DS</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, minWidth: "150px" }}>
            <label className="input-label">Evaluation Module</label>
            <select className="text-input" name="exam" value={filters.exam} onChange={handleFilterChange}>
              {examNameOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "300px", color: "var(--text-muted)" }}>
          <RefreshCw className="animate-spin" size={36} style={{ marginBottom: "1rem", color: "var(--primary)" }} />
          <p>Loading result analysis...</p>
        </div>
      ) : fetched && (
        <>
          {/* Focus Mode Subject Selector */}
          {analysisData.length > 0 && commonSubjects.length > 0 && (
            <div className="no-print" style={{ 
              marginBottom: "20px", 
              padding: "15px", 
              background: "var(--bg-card)", 
              borderRadius: "12px", 
              border: "1px solid var(--border-color)",
              display: "inline-flex",
              alignItems: "center",
              gap: "15px",
              boxShadow: "var(--shadow-sm)"
            }}>
              <label style={{ fontWeight: "bold", color: "var(--primary)" }}>Focus Mode:</label>
              <div style={{ position: "relative" }}>
                <button 
                  className="select-input"
                  style={{ background: "white", cursor: "pointer", textAlign: "left", minWidth: "250px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px" }}
                  onClick={() => setFocusDropdownOpen(!focusDropdownOpen)}
                >
                  {focusedSubjectIndices.length === 0 ? "Show All Subjects" : `${focusedSubjectIndices.length} Subject(s) Selected`}
                  <span>▼</span>
                </button>
                {focusDropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #ccc", borderRadius: "4px", marginTop: "4px", zIndex: 100, maxHeight: "250px", overflowY: "auto", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", textAlign: "left" }}>
                    <div 
                      style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #eee", background: "#f8f9fa", fontWeight: "bold", color: "black" }}
                      onClick={() => { setFocusedSubjectIndices([]); setFocusDropdownOpen(false); }}
                    >
                      Show All Subjects
                    </div>
                    {commonSubjects.map((sub, idx) => {
                      const cd = commonCourseDetails[idx] || {};
                      return (
                        <label key={idx} style={{ display: "flex", alignItems: "center", padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #eee", color: "black", margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={focusedSubjectIndices.includes(idx)} 
                            onChange={() => toggleSubjectFocus(idx)} 
                            style={{ marginRight: "10px", width: "16px", height: "16px" }}
                          />
                          <span style={{ fontSize: "12px" }}>{cd.courseName || sub} ({cd.courseCode || sub})</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: "block" }}>
            <button 
              className="primary-btn no-print" 
              onClick={handlePrint}
              style={{ marginBottom: "20px", background: "#3b82f6" }}
            >
              🖨️ Print Report
            </button>
          </div>

          <div className="printable-area" style={{ background: "white", color: "black", padding: "40px", fontFamily: '"Times New Roman", Times, serif', fontSize: "14px", border: "1px solid #ccc" }}>
            
            {/* Header section matching user screenshot */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ border: "2px solid black", padding: "5px 15px", fontWeight: "bold", minWidth: "150px" }}>
                Year/Sem : {filters.year} / {filters.semester}
              </div>
              <h2 style={{ margin: "0", fontSize: "18px", fontWeight: "bold" }}>
                Department - Result Analysis ({new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(-2)})
              </h2>
              <div style={{ border: "2px solid black", padding: "5px 15px", fontWeight: "bold", minWidth: "150px" }}>
                Exam: {filters.exam}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", fontWeight: "bold" }}>
              <div>Name of the Department: {filters.department}</div>
              <div>Date: {new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}</div>
            </div>

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid black", textAlign: "center", marginBottom: "30px" }}>
              <thead>
                <tr>
                  <th rowSpan="2" style={{ border: "2px solid black", padding: "10px" }}>S. No.</th>
                  <th rowSpan="2" style={{ border: "2px solid black", padding: "10px" }}>Section</th>
                  <th rowSpan="2" style={{ border: "2px solid black", padding: "10px" }}>Total no. of<br/>Students</th>
                  <th rowSpan="2" style={{ border: "2px solid black", padding: "10px" }}>No. of<br/>Students Pass</th>
                  <th rowSpan="2" style={{ border: "2px solid black", padding: "10px" }}>No. of<br/>Students Fail</th>
                  <th rowSpan="2" style={{ border: "2px solid black", padding: "10px" }}>Pass %</th>
                  <th colSpan="2" style={{ border: "2px solid black", padding: "5px" }}>Class Advisor</th>
                </tr>
                <tr>
                  <th style={{ border: "2px solid black", padding: "5px" }}>Name</th>
                  <th style={{ border: "2px solid black", padding: "5px" }}>Sign & Date</th>
                </tr>
              </thead>
              <tbody>
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ border: "2px solid black", padding: "20px" }}>No data available for the selected criteria.</td>
                  </tr>
                ) : (
                  processedData.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{index + 1}</td>
                      <td style={{ border: "2px solid black", padding: "10px", fontWeight: "bold" }}>{item.section}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.focused.totalStudents}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.focused.passedStudents}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.focused.failedStudents}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.focused.passPercentage}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}></td>
                      <td style={{ border: "2px solid black", padding: "10px" }}></td>
                    </tr>
                  ))
                )}
                
                {/* Total Row */}
                {analysisData.length > 0 && (
                  <tr style={{ fontWeight: "bold" }}>
                    <td colSpan="2" style={{ border: "2px solid black", padding: "10px", textAlign: "center" }}>Total</td>
                    <td style={{ border: "2px solid black", padding: "10px" }}>{totalStudentsAll}</td>
                    <td style={{ border: "2px solid black", padding: "10px" }}>{totalPassedAll}</td>
                    <td style={{ border: "2px solid black", padding: "10px" }}>{totalFailedAll}</td>
                    <td colSpan="3" style={{ border: "2px solid black", padding: "10px", textAlign: "left" }}>
                      Department Pass %: <span style={{ marginLeft: "10px" }}>{deptPassPercentage}%</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Formula section at the bottom */}
            <div style={{ marginLeft: "40px", marginTop: "40px", fontSize: "16px", fontWeight: "bold", lineHeight: "2" }}>
              <p style={{ margin: "5px 0" }}>Total No. of Students : <span style={{ marginLeft: "15px", fontWeight: "normal" }}>{totalStudentsAll}</span></p>
              <p style={{ margin: "5px 0" }}>No. of Students Pass : <span style={{ marginLeft: "15px", fontWeight: "normal" }}>{totalPassedAll}</span></p>
              
              <div style={{ display: "flex", alignItems: "center", marginTop: "30px", gap: "10px" }}>
                <span>Department Pass % = </span>
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  <span style={{ borderBottom: "2px solid black", padding: "0 15px", paddingBottom: "2px" }}>No. of Students Pass</span>
                  <span style={{ paddingTop: "2px" }}>Total No. of Students</span>
                </div>
                <span> X 100 = <span style={{ marginLeft: "10px", fontWeight: "normal" }}>{deptPassPercentage}%</span></span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
