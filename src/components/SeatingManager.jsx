import React, { useState, useEffect } from "react";
import API from "../api";
import { Printer, Save, Trash2, Plus, LayoutGrid, RotateCcw } from "lucide-react";

export default function SeatingManager() {
  const [activeTab, setActiveTab] = useState("generator"); // generator, halls, plans
  
  // Master Halls State
  const [halls, setHalls] = useState([]);
  const [hallForm, setHallForm] = useState({ hallNumber: "", totalCapacity: "40", columns: "8" });

  // Master Rosters (for selection)
  const [rosters, setRosters] = useState([]);
  
  // Generator State
  const [examDate, setExamDate] = useState(new Date().toLocaleDateString('en-GB').replace(/\//g, '.'));
  const [iqacNumber, setIqacNumber] = useState("MEC/IQAC/2026-27/COE/73");
  const [selectedRosters, setSelectedRosters] = useState([]);
  const [shuffleClasses, setShuffleClasses] = useState(false);
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

  // Handle Hall actions
  const handleAddHall = async () => {
    if (!hallForm.hallNumber) return;
    try {
      await API.post("/api/seating/halls", hallForm);
      setHallForm({ hallNumber: "", totalCapacity: "40", columns: "8" });
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

  // Handle Generator
  const handleGenerate = async () => {
    if (selectedRosters.length === 0) {
      alert("Please select at least one cohort.");
      return;
    }
    try {
      const res = await API.post("/api/seating/generate", {
        date: examDate,
        iqacNumber,
        rosterIds: selectedRosters,
        shuffleClasses
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

  const handlePrint = () => {
    window.print();
  };

  const getSelectedRostersInfo = () => {
    const selected = rosters.filter(r => selectedRosters.includes(r._id));
    const uniqueYears = [...new Set(selected.map(r => r.year))];
    const totalStudents = selected.reduce((sum, r) => sum + r.students.length, 0);
    return { selected, uniqueYears, totalStudents };
  };

  const { uniqueYears, totalStudents, selected } = getSelectedRostersInfo();
  const showShuffleToggle = uniqueYears.length === 1 && selectedRosters.length > 1;

  return (
    <div className="seating-manager print:m-0 print:p-0">
      
      {/* Top Navbar */}
      <div className="flex items-center justify-between mb-6 bg-gray-800 p-4 rounded-lg shadow print:hidden">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <LayoutGrid /> Exam Seating Arranger
        </h2>
        <div className="flex gap-4">
          <button 
            className={`px-4 py-2 rounded font-semibold ${activeTab === 'generator' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('generator')}
          >
            Seating Generator
          </button>
          <button 
            className={`px-4 py-2 rounded font-semibold ${activeTab === 'halls' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('halls')}
          >
            Master Halls
          </button>
          <button 
            className={`px-4 py-2 rounded font-semibold ${activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('plans')}
          >
            Saved Plans
          </button>
        </div>
        {activeTab === 'generator' && (
          <div className="flex gap-2">
             <button onClick={() => setGeneratedPlan(null)} className="px-3 py-2 bg-gray-700 text-white rounded flex items-center gap-1 hover:bg-gray-600">
               <RotateCcw size={16} /> Reset
             </button>
             <button onClick={handleGenerate} className="px-3 py-2 bg-purple-600 text-white rounded flex items-center gap-1 hover:bg-purple-500 font-bold">
               Generate Plan
             </button>
             {generatedPlan && (
               <>
                 <button onClick={handleSavePlan} className="px-3 py-2 bg-emerald-600 text-white rounded flex items-center gap-1 hover:bg-emerald-500 font-bold">
                   <Save size={16} /> Save Plan
                 </button>
                 <button onClick={handlePrint} className="px-3 py-2 bg-teal-500 text-white rounded flex items-center gap-1 hover:bg-teal-400 font-bold">
                   <Printer size={16} /> Print All
                 </button>
               </>
             )}
          </div>
        )}
      </div>

      {/* Tabs Content */}
      <div className="tab-content">
        
        {/* MASTER HALLS TAB */}
        {activeTab === 'halls' && (
          <div className="print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Add Hall Card */}
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                   Add New Hall
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400">Hall Name / Number</label>
                    <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={hallForm.hallNumber} onChange={e => setHallForm({...hallForm, hallNumber: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Total Capacity</label>
                      <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={hallForm.totalCapacity} onChange={e => setHallForm({...hallForm, totalCapacity: e.target.value})} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-400">Columns</label>
                      <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={hallForm.columns} onChange={e => setHallForm({...hallForm, columns: e.target.value})} />
                    </div>
                  </div>
                  <button onClick={handleAddHall} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded font-bold flex justify-center items-center gap-2">
                    <Plus size={18} /> Add Hall
                  </button>
                </div>
              </div>

              {/* List existing halls */}
              {halls.map(hall => (
                <div key={hall._id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg relative group">
                  <button onClick={() => handleDeleteHall(hall._id)} className="absolute top-3 right-3 text-red-400 hover:text-red-300 bg-red-900/30 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-4">Hall Data</h3>
                  <div className="space-y-3 pointer-events-none">
                    <div>
                      <label className="text-xs text-gray-400">Hall Name / Number</label>
                      <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-gray-300" value={hall.hallNumber} readOnly />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-400">Total Capacity</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-gray-300" value={hall.totalCapacity} readOnly />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-400">Columns</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-gray-300" value={hall.columns} readOnly />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        )}

        {/* GENERATOR TAB */}
        {activeTab === 'generator' && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar configurations */}
            <div className="w-full md:w-80 space-y-4 print:hidden">
              <div className="bg-gray-800 p-4 rounded-xl shadow border border-gray-700">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Date</label>
                    <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={examDate} onChange={e => setExamDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">IQAC Number (Optional)</label>
                    <input type="text" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white" value={iqacNumber} onChange={e => setIqacNumber(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded-xl shadow border border-gray-700">
                 <h3 className="text-white font-bold mb-3">Student Batches</h3>
                 
                 <div className="mb-3">
                   <label className="text-xs text-emerald-400 font-semibold block mb-1">Fetch from Master Roaster</label>
                   <select 
                      multiple 
                      className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white h-32 text-sm"
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
                   <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                 </div>

                 {totalStudents > 0 && (
                   <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
                     <p className="text-sm text-gray-300">Total Valid Numbers: <span className="font-bold text-emerald-400">{totalStudents}</span></p>
                     <p className="text-sm text-gray-300 mt-1">Years Selected: <span className="font-bold text-emerald-400">{uniqueYears.join(", ")}</span></p>
                   </div>
                 )}

                 {showShuffleToggle && (
                   <div className="mt-4 flex items-center gap-2 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded">
                     <input type="checkbox" id="shuffle" checked={shuffleClasses} onChange={e => setShuffleClasses(e.target.checked)} className="w-4 h-4" />
                     <label htmlFor="shuffle" className="text-sm text-yellow-200">Shuffle Classes? (Admin Opt)</label>
                   </div>
                 )}
                 {uniqueYears.length > 1 && (
                   <div className="mt-4 p-2 bg-blue-900/20 border border-blue-700/50 rounded">
                     <p className="text-sm text-blue-200">Years will be automatically interleaved.</p>
                   </div>
                 )}

              </div>
            </div>

            {/* Preview Section */}
            <div className="flex-1 bg-gray-800 p-4 rounded-xl shadow border border-gray-700 overflow-auto print:border-none print:shadow-none print:bg-white print:p-0">
               <h3 className="text-white font-bold mb-4 print:hidden">Preview (Will match print output)</h3>
               
               {generatedPlan ? (
                 <div className="print-container">
                   {generatedPlan.allocations.map((alloc, idx) => {
                      // Generate columns for the table
                      const maxRows = Math.max(...alloc.columnsData.map(c => c.length), 0);
                      
                      return (
                        <div key={idx} className="bg-white p-8 mb-8 text-black print:mb-0" style={{ minHeight: '297mm', width: '210mm', margin: '0 auto', boxSizing: 'border-box', pageBreakAfter: 'always' }}>
                          <div className="text-right text-sm font-bold mb-2">
                             {generatedPlan.iqacNumber}
                          </div>
                          <div className="text-center mb-6">
                            <h2 className="font-bold text-lg">MUTHAYAMMAL ENGINEERING COLLEGE, RASIPURAM - 637408</h2>
                            <h3 className="font-bold text-md">OFFICE OF THE CONTROLLER OF THE EXAMINATION</h3>
                            <h4 className="font-bold text-sm">ACADEMIC YEAR 2026-27</h4>
                            <h4 className="font-bold text-sm">SEATING ARRANGEMENT</h4>
                            {/* <h4 className="font-bold text-sm">UNIT TEST I</h4> */}
                          </div>

                          <div className="flex justify-between items-end mb-4 font-bold">
                            <div>HALL NO : <span className="text-xl">{alloc.hallNumber}</span></div>
                            <div className="text-right">
                              <div>Branch : {alloc.summaryInfo.split("/")[0] || "Multiple"}</div>
                              <div>Date : {generatedPlan.examDate}</div>
                            </div>
                          </div>

                          <h3 className="text-center font-bold text-lg mb-2">REGISTER NO. OF THE CANDIDATES</h3>

                          <table className="w-full border-collapse border border-black text-center text-sm mb-6">
                            <thead>
                              <tr>
                                {alloc.columnsData.map((_, cIndex) => (
                                  <th key={cIndex} className="border border-black p-2 bg-gray-100">
                                    {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][cIndex] || (cIndex+1)} ROW
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: maxRows }).map((_, rIndex) => (
                                <tr key={rIndex}>
                                  {alloc.columnsData.map((col, cIndex) => (
                                    <td key={cIndex} className="border border-black p-2 h-8">
                                      {col[rIndex] || ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <table className="w-full border-collapse border border-black text-center text-sm font-bold">
                            <thead>
                              <tr>
                                <th className="border border-black p-2 bg-gray-100 w-1/2">BRANCH / YEAR / SEM / SEC</th>
                                <th className="border border-black p-2 bg-gray-100 w-1/2">Allotted</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="border border-black p-2">{alloc.summaryInfo}</td>
                                <td className="border border-black p-2">
                                  {/* Just a summary, could be first and last reg no */}
                                  Total: {alloc.columnsData.flat().length}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          
                        </div>
                      )
                   })}
                 </div>
               ) : (
                 <div className="h-64 flex items-center justify-center text-gray-500 print:hidden">
                   Select cohorts and generate a plan to see preview.
                 </div>
               )}
            </div>
          </div>
        )}

        {/* SAVED PLANS TAB */}
        {activeTab === 'plans' && (
          <div className="print:hidden bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
             <h3 className="text-white font-bold mb-4">Saved Seating Plans</h3>
             <div className="space-y-4">
               {savedPlans.length === 0 && <p className="text-gray-400">No saved plans found.</p>}
               {savedPlans.map(plan => (
                 <div key={plan._id} className="bg-gray-900 p-4 rounded border border-gray-700 flex justify-between items-center">
                   <div>
                     <p className="text-white font-bold">{plan.examDate}</p>
                     <p className="text-sm text-gray-400">{plan.iqacNumber}</p>
                     <p className="text-xs text-indigo-400 mt-1">{plan.allocations.length} Halls Allocated</p>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => {
                        setGeneratedPlan(plan);
                        setActiveTab('generator');
                     }} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 text-sm">
                       View / Print
                     </button>
                     <button onClick={() => handleDeletePlan(plan._id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-sm">
                       Delete
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

    </div>
  );
}
