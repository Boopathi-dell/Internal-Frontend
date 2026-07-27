import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import API from "../api";

export default function DepartmentAnalysis() {
  const [filters, setFilters] = useState({ year: "I", semester: "I", exam: "CIA - I", department: "CSE" });
  const [analysisData, setAnalysisData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

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

  // Calculate totals
  const totalStudentsAll = analysisData.reduce((sum, item) => sum + item.totalStudents, 0);
  const totalPassedAll = analysisData.reduce((sum, item) => sum + item.passedStudents, 0);
  const totalFailedAll = analysisData.reduce((sum, item) => sum + item.failedStudents, 0);
  const deptPassPercentage = totalStudentsAll > 0 ? ((totalPassedAll / totalStudentsAll) * 100).toFixed(2) : 0;

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
          <button 
            className="primary-btn no-print" 
            onClick={handlePrint}
            style={{ marginBottom: "20px", background: "#3b82f6" }}
          >
            🖨️ Print Report
          </button>

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
                {analysisData.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ border: "2px solid black", padding: "20px" }}>No data available for the selected criteria.</td>
                  </tr>
                ) : (
                  analysisData.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{index + 1}</td>
                      <td style={{ border: "2px solid black", padding: "10px", fontWeight: "bold" }}>{item.section}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.totalStudents}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.passedStudents}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.failedStudents}</td>
                      <td style={{ border: "2px solid black", padding: "10px" }}>{item.passPercentage}</td>
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
