import { useState, useEffect } from "react";
import { Save, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import API from "../api";

export default function DailyAttendance() {
  const [filters, setFilters] = useState({
    programme: "B.E",
    department: "CSE",
    year: "I",
    semester: "I",
    section: "A",
    date: new Date().toISOString().slice(0, 10)
  });
  
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

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
    // Auto-load is handled by useEffect
  };

  const getCohortName = () => {
    return `${filters.programme}-${filters.department} - ${filters.year}/${filters.semester}/${filters.section}`;
  };

  useEffect(() => {
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.programme, filters.department, filters.year, filters.semester, filters.section, filters.date]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const cohortName = getCohortName();
      const res = await API.get("/api/attendance", {
        params: { cohortName, date: filters.date }
      });
      setAttendanceData(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        showToast("Roster not found for this class. Add students in Admin Setup.", "error");
      } else {
        showToast("Failed to load attendance", "error");
      }
    }
    setLoading(false);
  };

  const handleStatusChange = (index, newStatus, sessionType) => {
    if (!attendanceData || attendanceData.isHoliday) return;
    const newRecords = [...attendanceData.records];
    
    // index here is the index in the filtered list, we need to find the real index
    const realIndex = attendanceData.records.findIndex(r => r.regNo === filteredRecords[index].regNo);
    if (realIndex === -1) return;
    
    newRecords[realIndex][sessionType] = newStatus;
    setAttendanceData({ ...attendanceData, records: newRecords });
  };

  const filteredRecords = attendanceData?.records.filter(r => 
    r.regNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(filteredRecords.map(r => r.regNo));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (regNo) => {
    if (selectedStudents.includes(regNo)) {
      setSelectedStudents(selectedStudents.filter(id => id !== regNo));
    } else {
      setSelectedStudents([...selectedStudents, regNo]);
    }
  };

  const handleBulkMark = (sessionType, status) => {
    if (!attendanceData || attendanceData.isHoliday) return;
    const newRecords = [...attendanceData.records];
    
    newRecords.forEach((record, idx) => {
      if (selectedStudents.includes(record.regNo)) {
        newRecords[idx][sessionType] = status;
      }
    });
    
    setAttendanceData({ ...attendanceData, records: newRecords });
    setSelectedStudents([]); // Clear selection after bulk mark
  };

  const handleHolidayToggle = (e) => {
    if (!attendanceData) return;
    setAttendanceData({ 
      ...attendanceData, 
      isHoliday: e.target.checked,
      holidayReason: e.target.checked ? attendanceData.holidayReason : ""
    });
  };

  const handleReasonChange = (e) => {
    if (!attendanceData) return;
    setAttendanceData({ ...attendanceData, holidayReason: e.target.value });
  };

  const saveAttendance = async () => {
    if (!attendanceData) return;
    setSaving(true);
    try {
      const cohortName = getCohortName();
      await API.post("/api/attendance", {
        cohortName,
        date: filters.date,
        isHoliday: attendanceData.isHoliday,
        holidayReason: attendanceData.holidayReason,
        records: attendanceData.records
      });
      
      // Update state to remove 'isNew' flag
      setAttendanceData({ ...attendanceData, isNew: false });
      showToast("Attendance saved successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save attendance", "error");
    }
    setSaving(false);
  };

  const showToast = (msg, type = "success") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const renderStatusButton = (record, index, type, label, sessionType, activeClass) => {
    const isSelected = record[sessionType] === type;
    return (
      <button
        onClick={() => handleStatusChange(index, type, sessionType)}
        className="btn"
        style={{
          padding: '4px 12px',
          fontSize: '0.85rem',
          backgroundColor: isSelected ? 'transparent' : 'var(--bg-main)',
          color: isSelected ? 'inherit' : 'var(--text-muted)',
          border: `1px solid ${isSelected ? 'transparent' : 'var(--border-color)'}`,
          boxShadow: 'none',
          ...(isSelected ? activeClass : {})
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="page-layout">
      {/* Header */}
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>
            <Calendar size={32} style={{ color: 'var(--primary)', marginRight: '10px' }} /> Daily Smart Attendance
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Mark daily attendance and manage session holidays.</p>
        </div>
        {attendanceData && (
          <button 
            onClick={saveAttendance}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' }}
          >
            {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="input-label">Programme</label>
          <select name="programme" value={filters.programme} onChange={handleFilterChange} className="select-input">
            <option value="B.E">B.E</option>
            <option value="B.Tech">B.Tech</option>
            <option value="M.E">M.E</option>
            <option value="MBA">MBA</option>
            <option value="MCA">MCA</option>
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
          <label className="input-label">Year</label>
          <select name="year" value={filters.year} onChange={handleFilterChange} className="select-input">
            <option value="I">I Year</option>
            <option value="II">II Year</option>
            <option value="III">III Year</option>
            <option value="IV">IV Year</option>
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 120px', marginBottom: 0 }}>
          <label className="input-label">Semester</label>
          <select name="semester" value={filters.semester} onChange={handleFilterChange} className="select-input">
            {getSemOptionsForYear(filters.year).map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 100px', marginBottom: 0 }}>
          <label className="input-label">Section</label>
          <select name="section" value={filters.section} onChange={handleFilterChange} className="select-input">
            <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            <option value="D">D</option><option value="E">E</option><option value="F">F</option>
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="input-label">Department</label>
          <select name="department" value={filters.department} onChange={handleFilterChange} className="select-input">
            <option value="CSE">CSE</option><option value="IT">IT</option>
            <option value="ECE">ECE</option><option value="EEE">EEE</option>
            <option value="MECH">MECH</option><option value="CIVIL">CIVIL</option>
            <option value="AI&DS">AI&DS</option>
          </select>
        </div>
        <div className="input-group" style={{ flex: '1 1 150px', marginBottom: 0 }}>
          <label className="input-label">Date</label>
          <input type="date" name="date" value={filters.date} onChange={handleFilterChange} className="text-input" />
        </div>
      </div>

      {/* Main Content Area */}
      {attendanceData && (
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          
          {/* Header Row: Holiday Toggle & Status */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', background: 'var(--bg-main)' }}>
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                {filters.date}
                {attendanceData.isNew && <span className="status-badge pending" style={{ marginLeft: '10px' }}>Unsaved</span>}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>{getCohortName()} • {attendanceData.records.length} Students</p>
            </div>
            
            {/* Holiday Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-card)', padding: '10px 15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                <div style={{ position: 'relative', width: '48px', height: '24px' }}>
                  <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} checked={attendanceData.isHoliday} onChange={handleHolidayToggle} />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: attendanceData.isHoliday ? 'var(--danger)' : 'var(--border-color)', borderRadius: '24px', transition: '0.4s' }}></div>
                  <div style={{ position: 'absolute', height: '18px', width: '18px', left: '3px', bottom: '3px', background: 'white', borderRadius: '50%', transition: '0.4s', transform: attendanceData.isHoliday ? 'translateX(24px)' : 'none' }}></div>
                </div>
                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: attendanceData.isHoliday ? 'var(--danger)' : 'var(--text-main)' }}>
                  Mark as Holiday <AlertCircle size={18} />
                </div>
              </label>

              {attendanceData.isHoliday && (
                <input 
                  type="text" 
                  placeholder="Reason (e.g. Heavy Rain)" 
                  value={attendanceData.holidayReason}
                  onChange={handleReasonChange}
                  className="text-input"
                  style={{ width: '200px', padding: '6px 12px', fontSize: '0.9rem' }}
                />
              )}
            </div>
          </div>

          {/* Student Grid (Only if not a holiday) */}
          {!attendanceData.isHoliday ? (
            <div className="table-container" style={{ margin: '0', borderRadius: '0' }}>
              
              <div style={{ padding: '1rem 1.5rem', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input 
                      type="text" 
                      placeholder="Search Roll No or Name..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-input"
                      style={{ maxWidth: '300px' }}
                    />
                    {selectedStudents.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                          {selectedStudents.length} selected
                        </span>
                        <button 
                          onClick={() => setSelectedStudents([])}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Clear All
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {selectedStudents.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedStudents.map(regNo => (
                        <div key={regNo} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                          {regNo}
                          <button 
                            onClick={() => handleSelectStudent(regNo)}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' }}
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedStudents.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Morning:</span>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#10b981', color: 'white' }} onClick={() => handleBulkMark('morningStatus', 'Present')}>P</button>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#ef4444', color: 'white' }} onClick={() => handleBulkMark('morningStatus', 'Absent')}>A</button>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#0ea5e9', color: 'white' }} onClick={() => handleBulkMark('morningStatus', 'OD')}>OD</button>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#f59e0b', color: 'white' }} onClick={() => handleBulkMark('morningStatus', 'Leave')}>L</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Afternoon:</span>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#10b981', color: 'white' }} onClick={() => handleBulkMark('afternoonStatus', 'Present')}>P</button>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#ef4444', color: 'white' }} onClick={() => handleBulkMark('afternoonStatus', 'Absent')}>A</button>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#0ea5e9', color: 'white' }} onClick={() => handleBulkMark('afternoonStatus', 'OD')}>OD</button>
                      <button className="btn" style={{ padding: '2px 8px', fontSize: '0.8rem', background: '#f59e0b', color: 'white' }} onClick={() => handleBulkMark('afternoonStatus', 'Leave')}>L</button>
                    </div>
                  </div>
                )}
              </div>

              <table className="admin-table" style={{ marginTop: '0', borderSpacing: '0' }}>
                <thead style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll} 
                        checked={filteredRecords.length > 0 && selectedStudents.length === filteredRecords.length}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: '60px' }}>#</th>
                    <th style={{ width: '150px' }}>Reg No</th>
                    <th>Student Name</th>
                    <th style={{ textAlign: 'center' }}>Morning Session</th>
                    <th style={{ textAlign: 'center' }}>Afternoon Session</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, idx) => (
                    <tr key={record.regNo} style={{ borderBottom: '1px solid var(--border-color)', boxShadow: 'none', background: selectedStudents.includes(record.regNo) ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.includes(record.regNo)} 
                          onChange={() => handleSelectStudent(record.regNo)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: '600' }}>{record.regNo}</td>
                      <td>{record.name}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          {renderStatusButton(record, idx, "Present", "P", "morningStatus", { backgroundColor: '#10b981', color: '#ffffff', border: '1px solid #10b981' })}
                          {renderStatusButton(record, idx, "Absent", "A", "morningStatus", { backgroundColor: '#ef4444', color: '#ffffff', border: '1px solid #ef4444' })}
                          {renderStatusButton(record, idx, "OD", "OD", "morningStatus", { backgroundColor: '#0ea5e9', color: '#ffffff', border: '1px solid #0ea5e9' })}
                          {renderStatusButton(record, idx, "Leave", "L", "morningStatus", { backgroundColor: '#f59e0b', color: '#ffffff', border: '1px solid #f59e0b' })}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          {renderStatusButton(record, idx, "Present", "P", "afternoonStatus", { backgroundColor: '#10b981', color: '#ffffff', border: '1px solid #10b981' })}
                          {renderStatusButton(record, idx, "Absent", "A", "afternoonStatus", { backgroundColor: '#ef4444', color: '#ffffff', border: '1px solid #ef4444' })}
                          {renderStatusButton(record, idx, "OD", "OD", "afternoonStatus", { backgroundColor: '#0ea5e9', color: '#ffffff', border: '1px solid #0ea5e9' })}
                          {renderStatusButton(record, idx, "Leave", "L", "afternoonStatus", { backgroundColor: '#f59e0b', color: '#ffffff', border: '1px solid #f59e0b' })}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attendanceData.records.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students found for this class roster.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <AlertCircle size={40} color="var(--danger)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>Holiday Declared</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '500px' }}>
                This session has been marked as a holiday. No student attendance will be recorded, and this session will be excluded from percentage calculations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem', padding: '1rem 1.5rem', borderRadius: 'var(--radius)',
          background: toast.type === "success" ? 'var(--success)' : 'var(--danger)',
          color: 'white', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out'
        }}>
          {toast.type === "success" ? <CheckCircle size={24} /> : <XCircle size={24} />}
          <span style={{ fontWeight: '600' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
