import { useState, useEffect } from "react";
import API from "../api";
import { MessageSquareWarning, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle, CheckSquare } from "lucide-react";

export default function CorrectionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [newMark, setNewMark] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    setSelectedIds([]);
    try {
      const res = await API.get("/api/corrections");
      setRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load requests.");
    }
    setLoading(false);
  };

  const getDaysLeft = (createdAt) => {
    if (!createdAt) return "?";
    const created = new Date(createdAt).getTime();
    const expiresAt = created + (30 * 24 * 60 * 60 * 1000);
    const now = new Date().getTime();
    const diffMs = expiresAt - now;
    if (diffMs <= 0) return "0";
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingIds = requests.filter(r => r.status === "Pending").map(r => r._id);
      setSelectedIds(pendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(reqId => reqId !== id) : [...prev, id]);
  };

  const openStatusModal = (id, action) => {
    let initialRemarks = "";
    let initialMark = "";
    if (id === "BULK") {
      if (selectedIds.length === 1) {
        const studentReq = requests.find(r => r._id === selectedIds[0]);
        setIsBulkMode(false);
        setSelectedReqId(selectedIds[0]);
        if (studentReq) {
          initialRemarks = `Hi ${studentReq.studentName} (${studentReq.studentRegNo}), `;
          const match = studentReq.reason?.match(/\b\d{2,3}\b/);
          initialMark = studentReq.expectedMark || (match ? match[0] : "");
        }
      } else {
        setIsBulkMode(true);
        setSelectedReqId(null);
        initialRemarks = "Hi {name} ({regNo}), ";
      }
    } else {
      const studentReq = requests.find(r => r._id === id);
      setIsBulkMode(false);
      setSelectedReqId(id);
      if (studentReq) {
        initialRemarks = `Hi ${studentReq.studentName} (${studentReq.studentRegNo}), `;
        const match = studentReq.reason?.match(/\b\d{2,3}\b/);
        initialMark = studentReq.expectedMark || (match ? match[0] : "");
      }
    }
    setSelectedAction(action);
    setAdminRemarks(initialRemarks);
    setNewMark(action === "Approved" ? initialMark : "");
    setShowModal(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleConfirmStatus();
    }
  };

  const handleConfirmStatus = async () => {
    if (!adminRemarks.trim()) {
      alert("Please provide remarks/reason for this action.");
      return;
    }
    try {
      if (isBulkMode) {
        await API.put("/api/corrections/bulk-status", {
          requestIds: selectedIds,
          status: selectedAction,
          adminRemarks
        });
        setRequests(prev => prev.map(req => selectedIds.includes(req._id) ? { ...req, status: selectedAction, adminRemarks } : req));
        setSelectedIds([]);
      } else {
        const payload = { status: selectedAction, adminRemarks };
        if (selectedAction === "Approved" && newMark.trim() !== "") {
          payload.newMark = newMark.trim();
        }
        
        const res = await API.put(`/api/corrections/${selectedReqId}/status`, payload);
        const updatedReq = res.data;
        setRequests((prev) =>
          prev.map((req) => (req._id === selectedReqId ? { ...req, status: selectedAction, adminRemarks, currentMark: updatedReq.currentMark || req.currentMark } : req))
        );
        setSelectedIds(prev => prev.filter(id => id !== selectedReqId));
      }
      setShowModal(false);
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.error || err.message));
    }
  };

  const quickReplies = [
    "Verified and Mark Updated",
    "Paper Re-evaluated, No Change",
    "Come and meet me with your paper/proof",
    "Invalid Request"
  ];

  const pendingRequestsCount = requests.filter(r => r.status === "Pending").length;

  return (
    <div className="page-layout">
      <div className="header-flex">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageSquareWarning className="icon-primary" />
            Mark Correction Requests
          </h1>
          <p className="text-muted">Review and manage student requests for mark evaluation.</p>
        </div>
        <button onClick={fetchRequests} className="btn btn-secondary">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "1rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div style={{ background: "var(--primary)", color: "white", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600" }}>
            <CheckSquare size={20} />
            {selectedIds.length} Requests Selected
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            {selectedIds.length === 1 && (
              <button onClick={() => openStatusModal("BULK", "Approved")} className="btn" style={{ background: "white", color: "var(--success)" }}>
                <CheckCircle2 size={18} /> Approve Selected
              </button>
            )}
            <button onClick={() => openStatusModal("BULK", "Rejected")} className="btn" style={{ background: "white", color: "var(--danger)" }}>
              <XCircle size={18} /> Reject Selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <RefreshCw className="animate-spin" size={32} />
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <MessageSquareWarning size={48} style={{ opacity: 0.5, marginBottom: "1rem" }} />
          <h3>No Requests Found</h3>
          <p>There are currently no mark correction requests from students.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "1rem", textAlign: "center", width: "50px" }}>
                  <input 
                    type="checkbox" 
                    onChange={toggleSelectAll} 
                    checked={pendingRequestsCount > 0 && selectedIds.length === pendingRequestsCount}
                    disabled={pendingRequestsCount === 0}
                    style={{ transform: "scale(1.2)", cursor: "pointer" }}
                  />
                </th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Student</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Exam & Class</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Subject</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Mark</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Reason</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Status & Date</th>
                <th style={{ padding: "1rem", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id} style={{ borderBottom: "1px solid var(--border-color)", background: selectedIds.includes(req._id) ? "rgba(99,102,241,0.05)" : "transparent" }}>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(req._id)}
                      onChange={() => toggleSelect(req._id)}
                      disabled={req.status !== "Pending"}
                      style={{ transform: "scale(1.2)", cursor: req.status === "Pending" ? "pointer" : "not-allowed" }}
                    />
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{req.studentName}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{req.studentRegNo}</div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ fontWeight: "500", color: "var(--text-main)" }}>{req.examName}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{req.className}</div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ fontWeight: "500", color: "var(--text-main)" }}>{req.subjectCode}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{req.subjectName}</div>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center", fontWeight: "700" }}>
                    <div style={{ color: "var(--danger)" }}>{req.currentMark}</div>
                    {req.expectedMark && (
                      <div style={{ fontSize: "0.8rem", color: "var(--success)", marginTop: "0.25rem" }}>
                        Exp: {req.expectedMark}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "1rem", maxWidth: "250px" }}>
                    <div style={{
                      background: "rgba(255,255,255,0.05)",
                      padding: "0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      lineHeight: "1.4",
                      color: "var(--text-main)",
                      fontStyle: "italic",
                      borderLeft: "3px solid var(--primary)"
                    }}>
                      "{req.reason}"
                    </div>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    {req.status === "Pending" && <span className="status-badge" style={{ background: "rgba(234, 179, 8, 0.15)", color: "var(--warning)" }}><Clock size={14} /> Pending</span>}
                    {req.status === "Approved" && <span className="status-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--success)" }}><CheckCircle2 size={14} /> Approved</span>}
                    {req.status === "Rejected" && <span className="status-badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "var(--danger)" }}><XCircle size={14} /> Rejected</span>}
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                      <strong>Req:</strong> {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    {req.status !== "Pending" && req.updatedAt && (
                      <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "0.2rem" }}>
                        <strong>Res:</strong> {new Date(req.updatedAt).toLocaleDateString()} {new Date(req.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    )}
                    <div style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "0.25rem", fontWeight: "600" }}>
                      Deletes in {getDaysLeft(req.createdAt)} days
                    </div>
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    {req.status === "Pending" ? (
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                        <button
                          onClick={() => openStatusModal(req._id, "Approved")}
                          className="btn"
                          style={{ padding: "0.4rem 0.6rem", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)", border: "1px solid rgba(16, 185, 129, 0.2)" }}
                          title="Approve"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                        <button
                          onClick={() => openStatusModal(req._id, "Rejected")}
                          className="btn"
                          style={{ padding: "0.4rem 0.6rem", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "left" }}>
                        <strong>Remarks:</strong> {req.adminRemarks || "N/A"}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Remarks Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: selectedAction === "Approved" ? "var(--success)" : "var(--danger)" }}>
              {selectedAction === "Approved" ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              {isBulkMode ? `Bulk ${selectedAction} (${selectedIds.length} requests)` : `${selectedAction} Request`}
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Please provide remarks or a reason for your decision. This will be visible to the student{isBulkMode ? "s. Note: {name} and {regNo} will be replaced with actual details." : ""}.
            </p>
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Quick Replies</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {quickReplies.map(msg => (
                  <span 
                    key={msg} 
                    onClick={() => setAdminRemarks(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + msg)} 
                    style={{ 
                      cursor: "pointer", 
                      background: "rgba(99,102,241,0.1)", 
                      color: "var(--primary)", 
                      padding: "0.4rem 0.8rem", 
                      borderRadius: "20px", 
                      fontSize: "0.85rem", 
                      border: "1px solid rgba(99,102,241,0.2)",
                      transition: "all 0.2s"
                    }}
                    onMouseOver={(e) => { e.target.style.background = "var(--primary)"; e.target.style.color = "white"; }}
                    onMouseOut={(e) => { e.target.style.background = "rgba(99,102,241,0.1)"; e.target.style.color = "var(--primary)"; }}
                  >
                    {msg}
                  </span>
                ))}
              </div>

              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Remarks / Reply <span style={{color: "var(--danger)"}}>*</span></label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="E.g., Marks verified and updated to 85."
                className="input-field"
                rows="4"
                style={{ width: "100%", resize: "vertical" }}
              ></textarea>
            </div>

            {selectedAction === "Approved" && !isBulkMode && (
              <div style={{ marginBottom: "1.5rem", background: "rgba(16, 185, 129, 0.05)", padding: "1rem", borderRadius: "8px", borderLeft: "3px solid var(--success)" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "var(--success)" }}>Update Mark (Optional)</label>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  If you want to correct the student's mark immediately, enter the new mark below. It will automatically update their dashboard and result analysis.
                </p>
                <input
                  type="text"
                  value={newMark}
                  onChange={(e) => setNewMark(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. 85"
                  className="input-field"
                  style={{ width: "100px" }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={handleConfirmStatus} 
                className="btn"
                style={{ background: selectedAction === "Approved" ? "var(--success)" : "var(--danger)", color: "#fff" }}
              >
                Confirm {selectedAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
