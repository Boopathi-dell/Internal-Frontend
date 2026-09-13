import { useState } from "react";
import API from "../api";

export default function ConsolidatedAttendanceReport() {
  const [filters, setFilters] = useState({
    programme: "B.E",
    department: "CSE",
    year: "II",
    semester: "III",
    section: "C",
    batch: "2025-29",
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
  });

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      const sems = getSemOptionsForYear(value);
      setFilters(prev => ({ ...prev, year: value, semester: sems[0] }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const getCohortName = () => {
    return `${filters.programme}-${filters.department} - ${filters.year}/${filters.semester}/${filters.section}`;
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setReportData(null);

    try {
      const cohortName = getCohortName();
      const res = await API.get("/api/attendance/summary", {
        params: {
          cohortName,
          startDate: filters.fromDate,
          endDate: filters.toDate
        }
      });

      if (res.data.summary && res.data.summary.length > 0) {
        setReportData(res.data);
      } else {
        setError("No attendance records found for the selected period.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch report data. " + (err.response?.data?.error || ""));
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const isOddSemester = ["I", "III", "V", "VII"].includes(filters.semester);
  const semesterTypeStr = isOddSemester ? "odd semester" : "even semester";
  
  // Format date to DD.MM.YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  const totalWorkingDays = reportData ? reportData.totalWorkingSessions / 2 : 0;

  return (
    <div className="consolidated-report-container">
      <style>{`
        .consolidated-report-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .print-area {
          display: none;
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            font-family: 'Times New Roman', Times, serif;
          }
          .no-print {
            display: none !important;
          }
          
          .report-header {
            text-align: center;
            margin-bottom: 20px;
          }
          
          .report-header h2, .report-header h3, .report-header h4 {
            margin: 5px 0;
            font-weight: bold;
          }
          
          .report-header h2 {
            font-size: 20px;
            text-transform: uppercase;
          }
          .report-header h3 {
            font-size: 16px;
          }
          .report-header h4 {
            font-size: 14px;
          }
          
          .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-weight: bold;
            font-size: 14px;
          }
          
          .center-info {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
          }
          
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          
          table.report-table th, table.report-table td {
            border: 1px solid black;
            padding: 8px 4px;
            text-align: center;
          }
          
          table.report-table th {
            font-weight: bold;
            vertical-align: middle;
          }
          
          table.report-table td:nth-child(3) {
            text-align: left;
            padding-left: 8px;
          }
        }
        
        .report-preview {
          background: white;
          color: black;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          overflow-x: auto;
          font-family: 'Times New Roman', Times, serif;
        }
      `}</style>

      <div className="glass-card no-print" style={{ padding: "2rem" }}>
        <h2 className="section-title">Consolidated Attendance Report</h2>
        <form onSubmit={handleGenerateReport} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
          
          <div className="input-group">
            <label className="input-label">Programme</label>
            <select className="select-input" name="programme" value={filters.programme} onChange={handleFilterChange}>
              <option value="B.E">B.E</option>
              <option value="B.Tech">B.Tech</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Department</label>
            <select className="select-input" name="department" value={filters.department} onChange={handleFilterChange}>
              <option value="CSE">CSE</option>
              <option value="IT">IT</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="BME">BME</option>
              <option value="AIDS">AIDS</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Year</label>
            <select className="select-input" name="year" value={filters.year} onChange={handleFilterChange}>
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Semester</label>
            <select className="select-input" name="semester" value={filters.semester} onChange={handleFilterChange}>
              {getSemOptionsForYear(filters.year).map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Section</label>
            <select className="select-input" name="section" value={filters.section} onChange={handleFilterChange}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Batch</label>
            <input 
              type="text" 
              className="text-input" 
              name="batch" 
              value={filters.batch} 
              onChange={handleFilterChange} 
              placeholder="e.g. 2025-29"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">From Date</label>
            <input type="date" className="text-input" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} required />
          </div>

          <div className="input-group">
            <label className="input-label">To Date</label>
            <input type="date" className="text-input" name="toDate" value={filters.toDate} onChange={handleFilterChange} required />
          </div>

          <div className="input-group" style={{ display: "flex", alignItems: "flex-end", gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "200px" }}>
              {loading ? "Generating..." : "Generate Report"}
            </button>
            {reportData && (
              <button type="button" className="btn btn-secondary" onClick={handlePrint} style={{ marginLeft: "1rem" }}>
                Print Report
              </button>
            )}
          </div>
        </form>

        {error && <div className="error-message" style={{ color: "var(--danger)", marginTop: "1rem" }}>{error}</div>}
      </div>

      {/* Render the printable report if data exists */}
      {reportData && (
        <div className="report-preview no-print" style={{ display: 'none' /* We only want to show this when printing actually, wait, users probably want to preview it! Let's show it in standard view too */ }}>
          <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "10px" }}>
            Click "Print Report" to save as PDF or print this report.
          </p>
        </div>
      )}
      
      {reportData && (
        <div className="print-area" style={{ display: 'block' }}> {/* Will be hidden by default using external css, but print media unhides */}
          {/* Header matching the college format */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "10px", borderBottom: "1px solid black", paddingBottom: "10px" }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "22px", margin: "0", fontWeight: "bold", fontFamily: "Arial, sans-serif" }}>MUTHAYAMMAL ENGINEERING COLLEGE</h1>
              <h4 style={{ fontSize: "14px", margin: "2px 0", fontWeight: "normal" }}>(Autonomous)</h4>
              <h4 style={{ fontSize: "12px", margin: "0", fontWeight: "normal" }}>Rasipuram - 637 408, Namakkal Dist., Tamil Nadu, India.</h4>
            </div>
          </div>
          
          <div className="report-header">
            <h3 style={{ textTransform: "uppercase" }}>DEPARTMENT OF {filters.department === "CSE" ? "COMPUTER SCIENCE AND ENGINEERING" : filters.department}</h3>
            <h4>Consolidated Attendance details for UG {semesterTypeStr}</h4>
            <h4>(Period – {formatDate(filters.fromDate)} - {formatDate(filters.toDate)})</h4>
          </div>
          
          <div className="meta-info">
            <span>Branch:{filters.programme}-{filters.department}</span>
          </div>
          
          <div className="center-info">
            {filters.year} / {filters.semester} / {filters.department} - {filters.section}
          </div>
          
          <div className="meta-info">
            <span>Total No. of Working Days: {totalWorkingDays}</span>
            <span>Batch : {filters.batch}</span>
          </div>
          
          <table className="report-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>*</th>
                <th style={{ width: "15%" }}>Roll.no</th>
                <th style={{ width: "50%" }}>Name of the Student</th>
                <th style={{ width: "15%" }}>No of<br/>Days<br/>Present</th>
                <th style={{ width: "15%" }}>% of<br/>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {reportData.summary.map((student, index) => {
                const daysPresent = (student.present + student.od) / 2;
                
                return (
                  <tr key={student.regNo}>
                    <td>{index + 1}</td>
                    <td>{student.regNo}</td>
                    <td>{student.name}</td>
                    <td>{daysPresent}</td>
                    <td>{student.percentage}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
