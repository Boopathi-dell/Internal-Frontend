import React, { useState } from 'react';
import axios from 'axios';
import { Save, X } from 'lucide-react';

const API = axios.create({ baseURL: "http://localhost:5000" });

export default function ManualSeatEditor({ plan, onSave, onCancel }) {
  const [editedPlan, setEditedPlan] = useState(JSON.parse(JSON.stringify(plan)));
  const [selectedSeat, setSelectedSeat] = useState(null);

  const getSeatValue = (alloc, seat) => {
    if (seat.type === 'standard') {
      return alloc.columnsData[seat.cIndex][seat.rIndex] || "";
    } else if (seat.type === 'library_computer') {
      return alloc.libraryData.computerTables[seat.t][seat.c][seat.r] || "";
    } else if (seat.type === 'library_reading') {
      return alloc.libraryData.readingTables[seat.t][seat.c][seat.r] || "";
    }
  };

  const setSeatValue = (alloc, seat, val) => {
    if (seat.type === 'standard') {
      // Ensure array exists
      if (!alloc.columnsData[seat.cIndex]) alloc.columnsData[seat.cIndex] = [];
      alloc.columnsData[seat.cIndex][seat.rIndex] = val;
    } else if (seat.type === 'library_computer') {
      alloc.libraryData.computerTables[seat.t][seat.c][seat.r] = val;
    } else if (seat.type === 'library_reading') {
      alloc.libraryData.readingTables[seat.t][seat.c][seat.r] = val;
    }
  };

  const handleSeatClick = (aIdx, seatDetails) => {
    if (!selectedSeat) {
      setSelectedSeat({ aIdx, ...seatDetails });
    } else {
      const newPlan = { ...editedPlan };
      const alloc1 = newPlan.allocations[selectedSeat.aIdx];
      const alloc2 = newPlan.allocations[aIdx];
      
      const val1 = getSeatValue(alloc1, selectedSeat);
      const val2 = getSeatValue(alloc2, seatDetails);
      
      setSeatValue(alloc1, selectedSeat, val2);
      setSeatValue(alloc2, seatDetails, val1);
      
      setEditedPlan(newPlan);
      setSelectedSeat(null);
    }
  };

  const handleSeatDoubleClick = (aIdx, seatDetails) => {
    const alloc = editedPlan.allocations[aIdx];
    const currentVal = getSeatValue(alloc, seatDetails);
    const newVal = window.prompt("Edit Roll Number (Clear the text to empty the seat):", currentVal);
    
    if (newVal !== null) {
      const newPlan = { ...editedPlan };
      const newAlloc = newPlan.allocations[aIdx];
      setSeatValue(newAlloc, seatDetails, newVal.trim());
      setEditedPlan(newPlan);
      setSelectedSeat(null);
    }
  };

  const handleSave = async () => {
    try {
      await API.put(`/api/seating/plans/${editedPlan._id}`, { allocations: editedPlan.allocations });
      onSave();
    } catch (err) {
      alert("Error updating plan: " + err.message);
    }
  };

  const isSelected = (aIdx, seatDetails) => {
    if (!selectedSeat) return false;
    if (selectedSeat.aIdx !== aIdx || selectedSeat.type !== seatDetails.type) return false;
    if (seatDetails.type === 'standard') {
      return selectedSeat.cIndex === seatDetails.cIndex && selectedSeat.rIndex === seatDetails.rIndex;
    } else {
      return selectedSeat.t === seatDetails.t && selectedSeat.c === seatDetails.c && selectedSeat.r === seatDetails.r;
    }
  };

  const SeatBox = ({ val, selected, onClick, onDoubleClick, width = '70px', height = '30px', fontSize = '11px' }) => (
    <div 
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        width, height,
        border: `2px solid ${selected ? 'var(--primary)' : '#cbd5e1'}`,
        backgroundColor: selected ? '#e0f2fe' : val ? 'white' : '#f8fafc',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize,
        borderRadius: '4px',
        boxShadow: selected ? '0 0 0 2px var(--primary-light)' : 'none',
        transition: 'all 0.2s',
        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '2px'
      }}
      title={val || "Empty Seat"}
    >
      {val || "-"}
    </div>
  );

  return (
    <div className="glass-card" style={{ maxWidth: '1000px', margin: '0 auto', marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Manual Seat Editor</h2>
          <p style={{ color: 'var(--text-muted)', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
            {selectedSeat 
              ? "Select another seat to swap with..." 
              : "Click two seats to swap. Double-click a seat to manually edit the text."}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onCancel}><X size={16} /> Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> Save Changes</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {editedPlan.allocations.map((alloc, aIdx) => (
          <div key={aIdx} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-dark)', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              Hall {alloc.hallNumber} ({alloc.layoutType})
            </h3>
            
            {alloc.layoutType === 'Standard' ? (
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '10px' }}>
                {alloc.columnsData.map((col, cIndex) => {
                  // Ensure we show up to the max rows across all columns, at least 5
                  const maxRows = Math.max(5, ...alloc.columnsData.map(c => c.length));
                  return (
                    <div key={cIndex} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>C{cIndex+1}</div>
                      {Array.from({length: maxRows}).map((_, rIndex) => (
                        <SeatBox 
                          key={rIndex}
                          val={col[rIndex]}
                          selected={isSelected(aIdx, { type: 'standard', cIndex, rIndex })}
                          onClick={() => handleSeatClick(aIdx, { type: 'standard', cIndex, rIndex })}
                          onDoubleClick={() => handleSeatDoubleClick(aIdx, { type: 'standard', cIndex, rIndex })}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '20px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px' }}>Computer Tables</h4>
                  {alloc.libraryData.computerTables.map((table, tIdx) => (
                    <div key={tIdx} style={{ display: 'flex', gap: '5px', backgroundColor: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      {Array.from({length: 6}).map((_, c) => (
                         <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                           {Array.from({length: 2}).map((_, r) => (
                              <SeatBox 
                                key={r}
                                val={table[c][r]}
                                selected={isSelected(aIdx, { type: 'library_computer', t: tIdx, c, r })}
                                onClick={() => handleSeatClick(aIdx, { type: 'library_computer', t: tIdx, c, r })}
                                onDoubleClick={() => handleSeatDoubleClick(aIdx, { type: 'library_computer', t: tIdx, c, r })}
                                width="60px" height="25px" fontSize="9px"
                              />
                           ))}
                         </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px' }}>Reading Tables</h4>
                  {alloc.libraryData.readingTables.map((table, tIdx) => (
                    <div key={tIdx} style={{ display: 'flex', gap: '5px', backgroundColor: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      {Array.from({length: 2}).map((_, c) => (
                         <div key={c} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                           {Array.from({length: 2}).map((_, r) => (
                              <SeatBox 
                                key={r}
                                val={table[c][r]}
                                selected={isSelected(aIdx, { type: 'library_reading', t: tIdx, c, r })}
                                onClick={() => handleSeatClick(aIdx, { type: 'library_reading', t: tIdx, c, r })}
                                onDoubleClick={() => handleSeatDoubleClick(aIdx, { type: 'library_reading', t: tIdx, c, r })}
                                width="60px" height="25px" fontSize="9px"
                              />
                           ))}
                         </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
