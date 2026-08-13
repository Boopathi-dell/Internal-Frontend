import React, { useState, useEffect } from "react";
import API from "../api";
import { Printer, Save, Trash2, Plus, LayoutGrid, RotateCcw } from "lucide-react";

export default function SeatingManager() {
  const [activeTab, setActiveTab] = useState("generator"); 
  
  // Master Halls State
  const [halls, setHalls] = useState([]);
  const [hallForm, setHallForm] = useState({ hallNumber: "", totalCapacity: "40", columns: "8", layoutType: "Standard" });

  // Master Rosters 
  const [rosters, setRosters] = useState([]);
  
  // Generator State
  const [examDate, setExamDate] = useState(new Date().toLocaleDateString('en-GB').replace(/\//g, '.'));
  const [examName, setExamName] = useState("CIA I");
  const [academicYear, setAcademicYear] = useState("2025-26(ODD SEMESTER)");
  const [iqacNumber, setIqacNumber] = useState("");
  const [selectedRosters, setSelectedRosters] = useState([]);
  const [shuffleClasses, setShuffleClasses] = useState(false);
  const [libraryFillPreference, setLibraryFillPreference] = useState("Computer First");
  const [generatedPlan, setGeneratedPlan] = useState(null);

  // Saved Plans State
  const [savedPlans, setSavedPlans] = useState([]);

  useEffect(() => {
    fetchHalls();
    fetchRosters();
  }, []);

  const fetchHalls = async () => {
    try {
      const res = await API.get("/api/seating/halls");
      setHalls(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRosters = async () => {
    try {
      const res = await API.get("/api/rosters");
      setRosters(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPlans = async () => {
    try {
      const res = await API.get("/api/seating/plans");
      setSavedPlans(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === "plans") fetchPlans();
  }, [activeTab]);

  const handleAddHall = async () => {
    if (!hallForm.hallNumber) return;
    try {
      await API.post("/api/seating/halls", hallForm);
      setHallForm({ hallNumber: "", totalCapacity: "40", columns: "8", layoutType: "Standard" });
      fetchHalls();
    } catch (err) {
      alert("Error adding hall: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteHall = async (id) => {
    if (!window.confirm("Delete this hall?")) return;
    try {
      await API.delete(`/api/seating/halls/${id}`);
      fetchHalls();
    } catch (err) { console.error(err); }
  };

  const handleGenerate = async () => {
    if (selectedRosters.length === 0) {
      alert("Please select at least one cohort.");
      return;
    }
    try {
      const res = await API.post("/api/seating/generate", {
        date: examDate,
        examName,
        academicYear,
        iqacNumber,
        rosterIds: selectedRosters,
        shuffleClasses,
        libraryFillPreference
      });
      setGeneratedPlan(res.data);
    } catch (err) {
      alert("Error generating plan: " + (err.response?.data?.error || err.message));
    }
  };

  const handleSavePlan = async () => {
    if (!generatedPlan) return;
    try {
      await API.post("/api/seating/plans", generatedPlan);
      alert("Plan saved successfully!");
      setActiveTab("plans");
    } catch (err) {
      alert("Error saving plan: " + err.message);
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm("Delete this plan?")) return;
    try {
      await API.delete(`/api/seating/plans/${id}`);
      fetchPlans();
    } catch (err) { console.error(err); }
  };

  const getSelectedRostersInfo = () => {
    const selected = rosters.filter(r => selectedRosters.includes(r._id));
    const uniqueYears = [...new Set(selected.map(r => r.year))];
    const totalStudents = selected.reduce((sum, r) => sum + r.students.length, 0);
    return { selected, uniqueYears, totalStudents };
  };

  const { uniqueYears, totalStudents } = getSelectedRostersInfo();
  const showShuffleToggle = uniqueYears.length === 1 && selectedRosters.length > 1;

  // Custom styling for tables in print layout to match screenshot
  const tableStyles = { borderCollapse: 'collapse', border: '2px solid black', width: '100%', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' };
  const thStyles = { border: '1px solid black', padding: '4px', backgroundColor: '#f0f0f0' };
  const tdStyles = { border: '1px solid black', padding: '2px', height: '24px' };

  return (
    <div className="fade-in">
      
      {/* Header controls (Hidden in Print) */}
      <div className="glass-card mb-6 header-flex print:hidden" style={{ padding: "1.5rem" }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--primary)' }}>
            <LayoutGrid size={24} /> Exam Seating Arranger
          </h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
             <button className={`btn ${activeTab === 'generator' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('generator')}>Seating Generator</button>
             <button className={`btn ${activeTab === 'halls' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('halls')}>Master Halls</button>
             <button className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('plans')}>Saved Plans</button>
          </div>
        </div>
        
        {activeTab === 'generator' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn btn-secondary" onClick={() => setGeneratedPlan(null)}>
               <RotateCcw size={16} /> Reset
             </button>
             <button className="btn btn-primary" onClick={handleGenerate}>
               Generate Plan
             </button>
             {generatedPlan && (
               <>
                 <button className="btn btn-primary" style={{ background: 'var(--success)' }} onClick={handleSavePlan}>
                   <Save size={16} /> Save Plan
                 </button>
                 <button className="btn btn-primary" style={{ background: 'var(--accent)' }} onClick={() => window.print()}>
                   <Printer size={16} /> Print All
                 </button>
               </>
             )}
          </div>
        )}
      </div>

      {/* TABS CONTENT */}
      <div>
        
        {/* === MASTER HALLS === */}
        {activeTab === 'halls' && (
          <div className="admin-grid print:hidden">
            {/* Add Hall Card */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.5rem' }}>Add New Hall</h3>
              <div className="form-group">
                <label className="input-label">Hall Name / Number</label>
                <input type="text" className="text-input" value={hallForm.hallNumber} onChange={e => setHallForm({...hallForm, hallNumber: e.target.value})} />
              </div>
              
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="input-label">Layout Type</label>
                <select className="select-input" value={hallForm.layoutType} onChange={e => setHallForm({...hallForm, layoutType: e.target.value})}>
                  <option value="Standard">Standard (Columns)</option>
                  <option value="Library">Library (Custom)</option>
                </select>
              </div>

              {hallForm.layoutType === 'Standard' && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Total Capacity</label>
                    <input type="number" className="text-input" value={hallForm.totalCapacity} onChange={e => setHallForm({...hallForm, totalCapacity: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Columns</label>
                    <input type="number" className="text-input" value={hallForm.columns} onChange={e => setHallForm({...hallForm, columns: e.target.value})} />
                  </div>
                </div>
              )}
              {hallForm.layoutType === 'Library' && (
                <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                   * Library Layout has a fixed capacity of 84 seats (60 Computer, 24 Reading).
                </div>
              )}
              
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} onClick={handleAddHall}>
                <Plus size={18} /> Add Hall
              </button>
            </div>

            {/* Existing Halls */}
            {halls.map(hall => (
              <div key={hall._id} className="glass-card" style={{ position: 'relative' }}>
                <button 
                  onClick={() => handleDeleteHall(hall._id)} 
                  className="btn-icon" 
                  style={{ position: 'absolute', top: '15px', right: '15px', color: 'var(--danger)' }}
                >
                  <Trash2 size={16} />
                </button>
                <h3 style={{ marginBottom: '1rem' }}>Hall Data</h3>
                <div className="form-group" style={{ pointerEvents: 'none', marginBottom: '1rem' }}>
                  <label className="input-label">Hall Name</label>
                  <input type="text" className="text-input" value={hall.hallNumber} readOnly />
                </div>
                <div style={{ display: 'flex', gap: '1rem', pointerEvents: 'none' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="input-label">Layout</label>
                    <input type="text" className="text-input" value={hall.layoutType} readOnly />
                  </div>
                  {hall.layoutType === 'Standard' && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="input-label">Capacity</label>
                      <input type="text" className="text-input" value={`${hall.totalCapacity} (${hall.columns} Col)`} readOnly />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}


        {/* === GENERATOR === */}
        {activeTab === 'generator' && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            
            {/* Sidebar configurations */}
            <div className="print:hidden" style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-card">
                 <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="input-label">Date</label>
                    <input type="text" className="text-input" value={examDate} onChange={e => setExamDate(e.target.value)} />
                 </div>
                 <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="input-label">Exam Name</label>
                    <input type="text" className="text-input" value={examName} onChange={e => setExamName(e.target.value)} />
                 </div>
                 <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="input-label">Academic Year</label>
                    <input type="text" className="text-input" value={academicYear} onChange={e => setAcademicYear(e.target.value)} />
                 </div>
                 <div className="form-group">
                    <label className="input-label">IQAC Number (Optional)</label>
                    <input type="text" className="text-input" value={iqacNumber} onChange={e => setIqacNumber(e.target.value)} />
                 </div>
              </div>

              <div className="glass-card">
                 <h3 style={{ marginBottom: '1rem' }}>Student Batches</h3>
                 
                 <div className="form-group">
                   <label className="input-label" style={{ color: 'var(--primary)' }}>Fetch from Master Roaster</label>
                   <select 
                      multiple 
                      className="select-input"
                      style={{ height: '150px' }}
                      value={selectedRosters}
                      onChange={e => {
                        const vals = Array.from(e.target.selectedOptions, option => option.value);
                        setSelectedRosters(vals);
                      }}
                   >
                     {rosters.map(r => (
                       <option key={r._id} value={r._id}>{r.cohortName}</option>
                     ))}
                   </select>
                   <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>Hold Ctrl/Cmd to select multiple</p>
                 </div>

                 {totalStudents > 0 && (
                   <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                     <p style={{ fontSize: '0.9rem', marginBottom: '5px' }}>Total Valid Numbers: <strong>{totalStudents}</strong></p>
                     <p style={{ fontSize: '0.9rem' }}>Years Selected: <strong>{uniqueYears.join(", ")}</strong></p>
                   </div>
                 )}

                 {showShuffleToggle && (
                   <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <input type="checkbox" id="shuffle" checked={shuffleClasses} onChange={e => setShuffleClasses(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                     <label htmlFor="shuffle" className="input-label" style={{ margin: 0 }}>Shuffle Classes? (Admin Opt)</label>
                   </div>
                 )}

                 <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label className="input-label">Library Fill Preference</label>
                    <select className="select-input" value={libraryFillPreference} onChange={e => setLibraryFillPreference(e.target.value)}>
                      <option value="Computer First">Computer Tables First</option>
                      <option value="Reading First">Reading Tables First</option>
                    </select>
                 </div>
              </div>
            </div>

            {/* Preview Section */}
            <div style={{ flex: 1 }} className="print:m-0 print:p-0">
               {!generatedPlan && (
                 <div className="glass-card print:hidden" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                   Select cohorts and generate a plan to see preview.
                 </div>
               )}
               
               {generatedPlan && (
                 <div className="print-container">
                   {generatedPlan.allocations.map((alloc, idx) => {
                      
                      return (
                        <div key={idx} className="bg-white text-black print:mb-0" style={{ minHeight: '297mm', width: '210mm', margin: '0 auto', boxSizing: 'border-box', pageBreakAfter: 'always', padding: '20mm', backgroundColor: 'white', position: 'relative' }}>
                          {generatedPlan.iqacNumber && (
                            <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>
                               {generatedPlan.iqacNumber}
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', borderBottom: '1px solid black', paddingBottom: '10px', marginBottom: '15px' }}>
                            <div style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <img src="/logo1.png" alt="Logo" style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                               <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'Times New Roman, serif' }}>MUTHAYAMMAL ENGINEERING COLLEGE , RASIPURAM &ndash; 637408</h2>
                               <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'Times New Roman, serif' }}>OFFICE OF THE CONTROLLER OF THE EXAMINATION</h3>
                               <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'Times New Roman, serif' }}>ACADEMIC YEAR {generatedPlan.academicYear}</h4>
                               <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'Times New Roman, serif' }}>SEATING ARRANGEMENT</h4>
                               <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', fontFamily: 'Times New Roman, serif' }}>{generatedPlan.examName}</h4>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid black', paddingBottom: '5px', marginBottom: '15px', fontFamily: 'Times New Roman, serif', fontSize: '13px' }}>
                            <div>HALL NO : <span style={{ fontSize: '14px' }}>{alloc.hallNumber}</span></div>
                            <div>Branch : {alloc.summaryInfo.split("/")[0] || "Multiple"}</div>
                          </div>

                          <h3 style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '15px', fontFamily: 'Times New Roman, serif' }}>REGISTER NO. OF THE CANDIDATES</h3>

                          {/* STANDARD LAYOUT RENDER */}
                          {alloc.layoutType === 'Standard' && (
                            <table style={tableStyles}>
                              <thead>
                                <tr>
                                  {alloc.columnsData.map((_, cIndex) => (
                                    <th key={cIndex} style={thStyles}>
                                      {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][cIndex] || (cIndex+1)} ROW
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: Math.max(...alloc.columnsData.map(c => c.length), 0) }).map((_, rIndex) => (
                                  <tr key={rIndex}>
                                    {alloc.columnsData.map((col, cIndex) => (
                                      <td key={cIndex} style={tdStyles}>
                                        {col[rIndex] || ""}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {/* LIBRARY LAYOUT RENDER */}
                          {alloc.layoutType === 'Library' && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                               
                               {/* COMPUTER TABLES (Left) */}
                               <div style={{ width: '68%' }}>
                                  {alloc.libraryData.computerTables.map((table, tIdx) => (
                                     <div key={tIdx} style={{ display: 'flex', border: '2px solid black', marginBottom: '15px' }}>
                                        <div style={{ width: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid black', fontWeight: 'bold', fontSize: '10px', textAlign: 'center', padding: '2px' }}>
                                           COMPUT<br/>ER<br/>TABLE {tIdx + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                              <tbody>
                                                 {/* Row 1 */}
                                                 <tr>
                                                   {Array.from({length: 6}).map((_, c) => (
                                                      <td key={`r0-c${c}`} style={{ border: '1px solid black', height: '22px', borderTop: 'none', borderRight: c===5?'none':'1px solid black' }}>
                                                        {table[c][0]}
                                                      </td>
                                                   ))}
                                                 </tr>
                                                 {/* Row 2 */}
                                                 <tr>
                                                   {Array.from({length: 6}).map((_, c) => (
                                                      <td key={`r1-c${c}`} style={{ border: '1px solid black', height: '22px', borderBottom: 'none', borderRight: c===5?'none':'1px solid black' }}>
                                                        {table[c][1]}
                                                      </td>
                                                   ))}
                                                 </tr>
                                              </tbody>
                                           </table>
                                        </div>
                                     </div>
                                  ))}
                               </div>

                               {/* READING TABLES (Right) */}
                               <div style={{ width: '28%' }}>
                                  {alloc.libraryData.readingTables.map((table, tIdx) => (
                                     <div key={tIdx} style={{ display: 'flex', border: '2px solid black', marginBottom: '15px' }}>
                                        <div style={{ width: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid black', fontWeight: 'bold', fontSize: '9px', textAlign: 'center', padding: '2px' }}>
                                           READI<br/>NG<br/>TABLE<br/>{tIdx + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                              <tbody>
                                                 {/* Row 1 */}
                                                 <tr>
                                                   {Array.from({length: 2}).map((_, c) => (
                                                      <td key={`r0-c${c}`} style={{ border: '1px solid black', height: '22px', borderTop: 'none', borderRight: c===1?'none':'1px solid black' }}>
                                                        {table[c][0]}
                                                      </td>
                                                   ))}
                                                 </tr>
                                                 {/* Row 2 */}
                                                 <tr>
                                                   {Array.from({length: 2}).map((_, c) => (
                                                      <td key={`r1-c${c}`} style={{ border: '1px solid black', height: '22px', borderBottom: 'none', borderRight: c===1?'none':'1px solid black' }}>
                                                        {table[c][1]}
                                                      </td>
                                                   ))}
                                                 </tr>
                                              </tbody>
                                           </table>
                                        </div>
                                     </div>
                                  ))}
                               </div>

                            </div>
                          )}

                          <table style={{ ...tableStyles, marginTop: '20px' }}>
                            <thead>
                              <tr>
                                <th style={{ ...thStyles, width: '50%' }}>BRANCH / YEAR / SEM / SEC</th>
                                <th style={{ ...thStyles, width: '50%' }}>Allotted</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td style={tdStyles}>{alloc.summaryInfo.split(" - Total:")[0]}</td>
                                <td style={tdStyles}>
                                  {alloc.summaryInfo.split("- ")[1]}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                        </div>
                      )
                   })}
                 </div>
               )}
            </div>
          </div>
        )}

        {/* === SAVED PLANS === */}
        {activeTab === 'plans' && (
          <div className="glass-card print:hidden">
             <h3 style={{ marginBottom: '1.5rem' }}>Saved Seating Plans</h3>
             <div className="admin-table-container">
               <table className="admin-table">
                 <thead>
                   <tr>
                     <th>Date</th>
                     <th>Exam Name</th>
                     <th>Halls</th>
                     <th>Actions</th>
                   </tr>
                 </thead>
                 <tbody>
                   {savedPlans.length === 0 && (
                     <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No saved plans.</td></tr>
                   )}
                   {savedPlans.map(plan => (
                     <tr key={plan._id}>
                       <td><strong>{plan.examDate}</strong></td>
                       <td>{plan.examName}</td>
                       <td><span className="status-badge success">{plan.allocations.length} Halls Allocated</span></td>
                       <td style={{ display: 'flex', gap: '10px' }}>
                         <button className="btn btn-secondary" onClick={() => { setGeneratedPlan(plan); setActiveTab('generator'); }}>View</button>
                         <button className="btn btn-danger" onClick={() => handleDeletePlan(plan._id)}>Delete</button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
