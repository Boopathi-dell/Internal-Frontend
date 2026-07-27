import { useState, useEffect, useRef } from "react";
import API from "../api";
import * as XLSX from "xlsx";

export default function AttendanceEntry() {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classData, setClassData] = useState(null);
  const [filters, setFilters] = useState({ year: "I", semester: "I", section: "A", exam: "Unit Test - I" });
  const examNameOptions = [
    "Model Exam", "Model Practical Exam",
    "Unit Test - I", "Unit Test - II", "Unit Test - III", "Unit Test - IV", "Unit Test - V",
    "CIA - I", "CIA - II", "CIA - III",
    "MKC", "ESE"
  ];
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "loading" });
  const [printEditAccess, setPrintEditAccess] = useState(true);
  const fileInputRef = useRef(null);

  const getSemOptionsForYear = (year) => {
    switch (year) {
      case "I": return ["I", "II"];
      case "II": return ["III", "IV"];
      case "III": return ["V", "VI"];
      case "IV": return ["VII", "VIII"];
      default: return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    }
  };

  useEffect(() => {
    loadClasses();
    if (sessionStorage.getItem("role") === "printAdmin") {
      API.get("/api/auth/admin/print-access", {
        headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
      })
      .then(res => setPrintEditAccess(res.data.printEditAccess))
      .catch(err => console.error(err));
    }
  }, []);

  async function loadClasses() {
    try {
      const res = await API.get("/api/classes");
      setClasses(res.data);
      applyFilters(res.data, filters);
    } catch (err) {
      console.error(err);
    }
  }

  const applyFilters = (allClasses, f) => {
    const targetYSS = `${f.year}/${f.semester}/${f.section}`;
    const filtered = allClasses.filter(c => {
      const yssMatch = c.yearSemSec === targetYSS;
      const examMatch = !f.exam || c.examName === f.exam;
      return yssMatch && examMatch;
    });
    setFilteredClasses(filtered);

    if (filtered.length === 1) {
      const firstClassName = filtered[0].className;
      setSelectedClassId(firstClassName);
      loadSpecificClassData(firstClassName, allClasses);
    } else {
      setSelectedClassId("");
      setClassData(null);
    }
  };

  const handleFilterChange = (field, val) => {
    let newFilters = { ...filters, [field]: val };
    if (field === 'year') {
      const sem = filters.semester;
      let validatedSem = sem;
      if (val === "I" && !["I", "II"].includes(sem)) validatedSem = "I";
      else if (val === "II" && !["III", "IV"].includes(sem)) validatedSem = "III";
      else if (val === "III" && !["V", "VI"].includes(sem)) validatedSem = "V";
      else if (val === "IV" && !["VII", "VIII"].includes(sem)) validatedSem = "VII";
      newFilters.semester = validatedSem;
    }
    setFilters(newFilters);
    applyFilters(classes, newFilters);
  };

  const loadSpecificClassData = async (name) => {
    if (!name) return;
    try {
      const res = await API.get(`/api/classes/${encodeURIComponent(name)}`);
      let updatedStudents = res.data.students;
      updatedStudents.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true, sensitivity: 'base' }));
      setClassData({ ...res.data, students: updatedStudents });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAttendanceChange = (studentIndex, value) => {
    if (!classData || classData.allowEditing === false || !printEditAccess) return;
    const newStudents = [...classData.students];
    newStudents[studentIndex].attendance = value;
    setClassData({ ...classData, students: newStudents });
  };

  const handleSave = async () => {
    if (!classData || classData.allowEditing === false || !printEditAccess) return;
    setIsSaving(true);
    setToast({ show: true, message: "Saving attendance... 🚀", type: "loading" });
    try {
      const attendanceMap = {};
      classData.students.forEach(s => {
        if (s.attendance !== undefined) attendanceMap[s.regNo] = s.attendance;
      });
      await API.post(`/api/classes/${encodeURIComponent(classData.className)}/attendance`, { attendanceMap });
      
      const userId = sessionStorage.getItem("userId");
      const userName = sessionStorage.getItem("userName") || "Faculty";
      if (userId) {
        try {
          await API.post("/api/auth/activity", { userId, userName, action: "submit", details: `Submitted attendance for ${classData.className}` });
        } catch (e) { }
      }
      
      setToast({ show: true, message: "Attendance saved successfully! 🎉", type: "success" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
    } catch (err) {
      setToast({ show: true, message: "Failed to save: " + err.message, type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "" }), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSample = () => {
    if (!classData) return;
    const aoa = [
      ["Register Number", "Attendance %"],
      ...classData.students.map(s => [s.regNo, s.attendance || ""])
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${classData.className}_Attendance_Template.xlsx`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const headers = data[0];
        const regNoIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes("reg"));
        const attIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes("att"));
        
        if (regNoIdx === -1 || attIdx === -1) {
          alert("Could not find 'Register Number' or 'Attendance %' columns in Excel. Please use the Sample Excel format.");
          return;
        }

        const newStudents = [...classData.students];
        let updateCount = 0;

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[regNoIdx]) continue;
          
          const regNo = String(row[regNoIdx]).trim();
          const att = row[attIdx] !== undefined ? String(row[attIdx]).trim() : "";
          
          const studentIndex = newStudents.findIndex(s => s.regNo === regNo);
          if (studentIndex !== -1 && att !== "") {
            newStudents[studentIndex].attendance = att;
            updateCount++;
          }
        }
        
        setClassData({ ...classData, students: newStudents });
        alert(`Successfully imported attendance for ${updateCount} students! Click Save to apply changes.`);
      } catch (err) {
        alert("Failed to parse Excel file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="page-layout" style={{
      background: "linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.95)), url('/mark-entry-bg.jpg') no-repeat center center fixed",
      backgroundSize: "cover", padding: "2.5rem", borderRadius: "16px", border: "1px solid rgba(14, 165, 233, 0.3)",
      boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)", color: "#ffffff", minHeight: "85vh"
    }}>
      <h1 style={{ marginBottom: "1.5rem", color: "#ffffff" }}>Attendance Entry</h1>
      
      <div style={{ 
        display: "flex", gap: "20px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center",
        background: "rgba(15, 23, 42, 0.55)", padding: "20px 25px", borderRadius: "14px",
        border: "1px solid rgba(14, 165, 233, 0.25)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)"
      }}>
        {[
          { label: "Year", field: "year", opts: ["I", "II", "III", "IV"] },
          { label: "Semester", field: "semester", opts: getSemOptionsForYear(filters.year) },
          { label: "Section", field: "section", opts: ["A", "B", "C", "D", "E"] },
          { label: "Exam Module", field: "exam", opts: examNameOptions }
        ].map(({ label, field, opts }) => (
          <div key={field}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#38bdf8", marginBottom: "6px", textTransform: "uppercase" }}>{label}</label>
            <select value={filters[field]} onChange={e => handleFilterChange(field, e.target.value)} style={{ 
              padding: "10px 14px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(14, 165, 233, 0.3)", 
              color: "#ffffff", borderRadius: "10px", outline: "none", minWidth: "120px", cursor: "pointer"
            }}>
              {opts.map(o => <option key={o} value={o} style={{ background: "#0f172a" }}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {filteredClasses.length > 1 && (
        <div style={{ marginTop: "15px", padding: "15px 20px", background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(14, 165, 233, 0.3)", borderRadius: "12px", display: "flex", alignItems: "center", gap: "15px" }}>
          <label style={{ fontWeight: "bold", color: "#38bdf8" }}>Select Class:</label>
          <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); loadSpecificClassData(e.target.value); }} style={{ padding: "10px 14px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(14, 165, 233, 0.3)", color: "#ffffff", borderRadius: "10px", outline: "none", minWidth: "250px", cursor: "pointer" }}>
            <option value="" style={{ background: "#0f172a" }}>-- Select a Class --</option>
            {filteredClasses.map(c => <option key={c._id} value={c.className} style={{ background: "#0f172a" }}>{c.className}</option>)}
          </select>
        </div>
      )}

      {filteredClasses.length === 0 && (
        <div style={{ padding: "20px", background: "rgba(239, 68, 68, 0.08)", color: "#fca5a5", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.3)", marginTop: "15px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div>
            <strong style={{ display: "block", marginBottom: "4px", color: "#ef4444" }}>No class setup found!</strong>
            <span style={{ fontSize: "0.9rem" }}>Please ensure you have created a class for this target in Admin Panel.</span>
          </div>
        </div>
      )}

      {classData && (
        <>
          {toast.show && (
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999, background: toast.type === "success" ? "#4caf50" : toast.type === "error" ? "#f44336" : "#007bff", color: "white", padding: "15px 30px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", alignItems: "center", gap: "12px", fontWeight: "bold", fontSize: "16px" }}>
              {toast.message}
            </div>
          )}

          <div style={{ marginTop: "20px", display: "flex", gap: "15px", flexWrap: "wrap", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "12px" }}>
            <button onClick={handleDownloadSample} style={{ padding: "10px 20px", background: "#f59e0b", color: "white", cursor: "pointer", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
              📥 Download Sample Excel
            </button>
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={classData.allowEditing === false || !printEditAccess} style={{ padding: "10px 20px", background: (classData.allowEditing === false || !printEditAccess) ? "#9ca3af" : "#8b5cf6", color: "white", cursor: (classData.allowEditing === false || !printEditAccess) ? "not-allowed" : "pointer", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
              📤 Upload Excel Data
            </button>
            <div style={{ flex: 1 }}></div>
            <button onClick={handleSave} disabled={classData.allowEditing === false || isSaving || !printEditAccess} style={{ padding: "10px 30px", background: (classData.allowEditing === false || isSaving || !printEditAccess) ? "#9ca3af" : "#10b981", color: "white", cursor: (classData.allowEditing === false || isSaving || !printEditAccess) ? "not-allowed" : "pointer", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1.1rem" }}>
              {isSaving ? "Saving..." : classData.allowEditing === false ? "🔒 Locked" : !printEditAccess ? "🔒 Read-only" : "💾 Save Attendance"}
            </button>
          </div>

          {!printEditAccess && (
            <div style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "12px", textAlign: "center", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.3)", marginTop: "15px", fontWeight: "bold" }}>
              🖨️ View & Print Only Mode (Edit Access Disabled by Admin)
            </div>
          )}

          <div style={{ marginTop: "20px", overflowX: "auto", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", color: "white" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.3)" }}>
                  <th style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", width: "60px" }}>S.No.</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Register Number</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Name of the Student</th>
                  <th style={{ padding: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", width: "120px", textAlign: "center" }}>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {classData.students.map((s, i) => (
                  <tr key={s._id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px" }}>{i + 1}</td>
                    <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "1.1rem" }}>{s.regNo}</td>
                    <td style={{ padding: "12px", fontWeight: "500" }}>{s.name}</td>
                    <td style={{ padding: "8px", textAlign: "center" }}>
                      <input
                        type="text"
                        value={s.attendance || ""}
                        readOnly={classData.allowEditing === false || !printEditAccess}
                        onChange={(e) => handleAttendanceChange(i, e.target.value)}
                        placeholder="e.g. 85"
                        style={{
                          width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.2)",
                          background: "rgba(0,0,0,0.2)", color: "white", textAlign: "center", outline: "none",
                          fontWeight: "bold"
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
