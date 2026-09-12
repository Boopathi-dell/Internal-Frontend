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
    date: new Date().toISOString().slice(0, 10),
    session: "Morning"
  });
  
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

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
    setAttendanceData(null); // Clear data when filters change
  };

  const getCohortName = () => {
    return `${filters.programme}-${filters.department} - ${filters.year}/${filters.semester}/${filters.section}`;
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const cohortName = getCohortName();
      const res = await API.get("/api/attendance", {
        params: { cohortName, date: filters.date, session: filters.session }
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

  const handleStatusChange = (index, newStatus) => {
    if (!attendanceData || attendanceData.isHoliday) return;
    const newRecords = [...attendanceData.records];
    newRecords[index].status = newStatus;
    setAttendanceData({ ...attendanceData, records: newRecords });
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
        session: filters.session,
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

  const renderStatusButton = (record, index, type, label, colorClass) => {
    const isSelected = record.status === type;
    return (
      <button
        onClick={() => handleStatusChange(index, type)}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          isSelected 
            ? colorClass 
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500 flex items-center gap-2">
            <Calendar size={32} className="text-teal-400" /> Daily Smart Attendance
          </h1>
          <p className="text-gray-400 mt-1">Mark daily attendance and manage session holidays.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111111] p-6 rounded-2xl border border-white/5 shadow-xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Programme</label>
            <select name="programme" value={filters.programme} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors">
              <option value="B.E">B.E</option>
              <option value="B.Tech">B.Tech</option>
              <option value="M.E">M.E</option>
              <option value="MBA">MBA</option>
              <option value="MCA">MCA</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Year</label>
            <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors">
              <option value="I">I Year</option>
              <option value="II">II Year</option>
              <option value="III">III Year</option>
              <option value="IV">IV Year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Semester</label>
            <select name="semester" value={filters.semester} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors">
              {getSemOptionsForYear(filters.year).map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Section</label>
            <select name="section" value={filters.section} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors">
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Department</label>
            <select name="department" value={filters.department} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors">
              <option value="CSE">CSE</option><option value="IT">IT</option>
              <option value="ECE">ECE</option><option value="EEE">EEE</option>
              <option value="MECH">MECH</option><option value="CIVIL">CIVIL</option>
              <option value="AI&DS">AI&DS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
            <input type="date" name="date" value={filters.date} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Session</label>
            <select name="session" value={filters.session} onChange={handleFilterChange} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2.5 text-white outline-none focus:border-teal-500 transition-colors">
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button onClick={fetchAttendance} disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2">
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={20} />}
            Load Attendance
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {attendanceData && (
        <div className="bg-[#111111] rounded-2xl border border-white/5 shadow-xl overflow-hidden mb-8">
          
          {/* Header Row: Holiday Toggle & Status */}
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a1a1a]">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {filters.date} - {filters.session} Session
                {attendanceData.isNew && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30 ml-2">Unsaved</span>}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{getCohortName()} • {attendanceData.records.length} Students</p>
            </div>
            
            {/* Holiday Toggle */}
            <div className="flex items-center gap-4 bg-black/40 p-3 rounded-lg border border-white/10">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={attendanceData.isHoliday} onChange={handleHolidayToggle} />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${attendanceData.isHoliday ? "bg-red-500" : "bg-gray-700"}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${attendanceData.isHoliday ? "transform translate-x-6" : ""}`}></div>
                </div>
                <div className="ml-3 font-medium text-white flex items-center gap-2">
                  Mark as Holiday <AlertCircle size={16} className={attendanceData.isHoliday ? "text-red-400" : "text-gray-500"} />
                </div>
              </label>

              {attendanceData.isHoliday && (
                <input 
                  type="text" 
                  placeholder="Reason (e.g. Heavy Rain)" 
                  value={attendanceData.holidayReason}
                  onChange={handleReasonChange}
                  className="bg-[#222] border border-white/20 rounded-md px-3 py-1.5 text-sm text-white w-48 outline-none focus:border-red-500"
                />
              )}
            </div>
          </div>

          {/* Student Grid (Only if not a holiday) */}
          {!attendanceData.isHoliday ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1a1a1a] text-gray-400 text-sm border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-medium w-16">#</th>
                    <th className="px-6 py-4 font-medium w-32">Reg No</th>
                    <th className="px-6 py-4 font-medium">Student Name</th>
                    <th className="px-6 py-4 font-medium text-right pr-12">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attendanceData.records.map((record, idx) => (
                    <tr key={record.regNo} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-300">{record.regNo}</td>
                      <td className="px-6 py-4 text-white">{record.name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {renderStatusButton(record, idx, "Present", "P", "bg-green-500/20 text-green-400 border border-green-500/30")}
                          {renderStatusButton(record, idx, "Absent", "A", "bg-red-500/20 text-red-400 border border-red-500/30")}
                          {renderStatusButton(record, idx, "OD", "OD", "bg-blue-500/20 text-blue-400 border border-blue-500/30")}
                          {renderStatusButton(record, idx, "Leave", "L", "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30")}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attendanceData.records.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                        No students found for this class roster.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={40} className="text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Holiday Declared</h3>
              <p className="text-gray-400 max-w-md">
                This session has been marked as a holiday. No student attendance will be recorded, and this session will be excluded from percentage calculations.
              </p>
            </div>
          )}

          {/* Action Bar */}
          <div className="p-6 border-t border-white/5 bg-[#1a1a1a] flex justify-end">
            <button 
              onClick={saveAttendance}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-teal-500/25 transition-all flex items-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 text-white ${toast.type === "success" ? "bg-teal-500" : "bg-red-500"}`}>
          {toast.type === "success" ? <CheckCircle size={24} /> : <XCircle size={24} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
