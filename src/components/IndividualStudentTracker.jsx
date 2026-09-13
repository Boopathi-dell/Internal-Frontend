import { useState } from "react";
import API from "../api";
import { Search, Save, Edit2, X } from "lucide-react";

export default function IndividualStudentTracker() {
  const [regNo, setRegNo] = useState("");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [editingDate, setEditingDate] = useState(null);
  const [editForm, setEditForm] = useState({ morning: "", afternoon: "", cohortName: "" });
  const [saving, setSaving] = useState(false);

  const fetchStudentHistory = async (e) => {
    if (e) e.preventDefault();
    if (!regNo) return;
    
    setLoading(true);
    setError("");
    
    try {
      const res = await API.get(`/api/attendance/student/${regNo}`, {
        params: { startDate: fromDate, endDate: toDate }
      });
      
      setAttendanceHistory(res.data);
      if (res.data.length === 0) {
        setError("No attendance records found for this student in the given date range.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch student history.");
    }
    setLoading(false);
  };

  const handleEditClick = (record) => {
    setEditingDate(record.date);
    setEditForm({
      morning: record.morning,
      afternoon: record.afternoon,
      cohortName: record.cohortName
    });
  };

  const handleCancelEdit = () => {
    setEditingDate(null);
  };

  const handleSaveEdit = async (date) => {
    setSaving(true);
    try {
      await API.put(`/api/attendance/student/${regNo}/date/${date}`, {
        morningStatus: editForm.morning,
        afternoonStatus: editForm.afternoon,
        cohortName: editForm.cohortName
      });
      
      // Update local state
      setAttendanceHistory(prev => prev.map(record => 
        record.date === date 
          ? { ...record, morning: editForm.morning, afternoon: editForm.afternoon } 
          : record
      ));
      
      setEditingDate(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update attendance.");
    }
    setSaving(false);
  };

  const getStatusColor = (status) => {
    if (status === "Present" || status === "OD") return "var(--success)";
    if (status === "Absent" || status === "Leave") return "var(--danger)";
    return "var(--text-muted)";
  };

  return (
    <div className="glass-card" style={{ padding: "2rem" }}>
      <h2 className="section-title">Individual Student Tracker</h2>
      
      <form onSubmit={fetchStudentHistory} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div className="input-group" style={{ flex: 1, minWidth: "200px" }}>
          <label className="input-label">Roll Number</label>
          <input 
            type="text" 
            className="text-input" 
            value={regNo} 
            onChange={(e) => setRegNo(e.target.value.toUpperCase())} 
            placeholder="e.g. 25CS127"
            required
          />
        </div>
        <div className="input-group">
          <label className="input-label">From Date</label>
          <input 
            type="date" 
            className="text-input" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)} 
          />
        </div>
        <div className="input-group">
          <label className="input-label">To Date</label>
          <input 
            type="date" 
            className="text-input" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)} 
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: "42px" }}>
          <Search size={18} style={{ marginRight: "8px" }} />
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <div className="error-message" style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</div>}

      {attendanceHistory.length > 0 && (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Class (Cohort)</th>
                <th>Morning Status</th>
                <th>Afternoon Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.map((record) => (
                <tr key={record.date}>
                  <td>{record.date}</td>
                  <td>{record.cohortName}</td>
                  
                  {editingDate === record.date ? (
                    <>
                      <td>
                        <select 
                          className="select-input" 
                          value={editForm.morning}
                          onChange={(e) => setEditForm({...editForm, morning: e.target.value})}
                          style={{ padding: "4px" }}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="OD">OD</option>
                          <option value="Leave">Leave</option>
                          <option value="-">-</option>
                        </select>
                      </td>
                      <td>
                        <select 
                          className="select-input" 
                          value={editForm.afternoon}
                          onChange={(e) => setEditForm({...editForm, afternoon: e.target.value})}
                          style={{ padding: "4px" }}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="OD">OD</option>
                          <option value="Leave">Leave</option>
                          <option value="-">-</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: "4px 8px", background: "var(--success)", borderColor: "var(--success)" }}
                            onClick={() => handleSaveEdit(record.date)}
                            disabled={saving}
                          >
                            <Save size={16} />
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "4px 8px" }}
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ color: getStatusColor(record.morning), fontWeight: "bold" }}>
                        {record.morning}
                      </td>
                      <td style={{ color: getStatusColor(record.afternoon), fontWeight: "bold" }}>
                        {record.afternoon}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}
                          onClick={() => handleEditClick(record)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
