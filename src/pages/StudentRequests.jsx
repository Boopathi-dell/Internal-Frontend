import { useState, useEffect } from "react";
import API from "../api";
import { MessageSquareWarning, Clock, CheckCircle2, XCircle, RefreshCw, AlertCircle } from "lucide-react";

export default function StudentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const studentRegNo = sessionStorage.getItem("userId"); // userId is actually regNo for students

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/api/corrections/student/${studentRegNo}`);
      setRequests(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load your requests.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    // Mark all unread notifications as read when opening this page
    if (studentRegNo) {
      API.put(`/api/corrections/student/${studentRegNo}/mark-read`).catch(console.error);
    }
  }, [studentRegNo]);

  return (
    <div className="page-layout">
      <div className="header-flex">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MessageSquareWarning className="icon-primary" />
            My Requests & Grievances
          </h1>
          <p className="text-muted">Track the status of your mark correction requests.</p>
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

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <RefreshCw className="animate-spin" size={32} />
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          <MessageSquareWarning size={48} style={{ opacity: 0.5, marginBottom: "1rem" }} />
          <h3>No Requests Found</h3>
          <p>You haven't submitted any mark correction requests yet.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {requests.map((req) => (
            <div key={req._id} style={{ 
              background: "#ffffff", 
              borderRadius: "16px", 
              padding: "1.5rem", 
              display: "flex", 
              flexDirection: "column", 
              gap: "1.25rem",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
              border: "1px solid rgba(0,0,0,0.05)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease"
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.01)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.75rem 0", color: "#1e293b", fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {req.subjectName} 
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", background: "#f1f5f9", padding: "0.2rem 0.6rem", borderRadius: "6px" }}>{req.subjectCode}</span>
                  </h3>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <div style={{ background: "#f8fafc", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontWeight: "800", textTransform: "uppercase", fontSize: "0.7rem", color: "#94a3b8", marginRight: "0.4rem" }}>Exam</span> 
                      <strong style={{ color: "#334155" }}>{req.examName}</strong>
                    </div>
                    <div style={{ background: "#fff1f2", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #ffe4e6" }}>
                      <span style={{ fontWeight: "800", textTransform: "uppercase", fontSize: "0.7rem", color: "#fb7185", marginRight: "0.4rem" }}>Current Mark</span> 
                      <strong style={{ color: "#e11d48", fontSize: "0.95rem" }}>{req.currentMark}</strong>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontWeight: "800", textTransform: "uppercase", fontSize: "0.7rem", color: "#94a3b8", marginRight: "0.4rem" }}>Submitted</span> 
                      <strong style={{ color: "#334155" }}>{new Date(req.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</strong>
                    </div>
                  </div>
                </div>
                
                <div>
                  {req.status === "Pending" && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "linear-gradient(to right, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))", border: "1px solid rgba(245, 158, 11, 0.2)", color: "#d97706", padding: "0.5rem 1.25rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "700" }}><Clock size={16} /> Pending Evaluation</span>}
                  {req.status === "Approved" && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "linear-gradient(to right, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#059669", padding: "0.5rem 1.25rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "700" }}><CheckCircle2 size={16} /> Request Approved</span>}
                  {req.status === "Rejected" && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "linear-gradient(to right, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05))", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#dc2626", padding: "0.5rem 1.25rem", borderRadius: "20px", fontSize: "0.85rem", fontWeight: "700" }}><XCircle size={16} /> Request Rejected</span>}
                </div>
              </div>

              <div style={{ background: "linear-gradient(to right, #f8fafc, #ffffff)", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e2e8f0", borderLeft: "4px solid #3b82f6" }}>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <MessageSquareWarning size={14} /> Your Grievance / Reason
                </div>
                <div style={{ color: "#334155", lineHeight: "1.6", fontSize: "0.95rem" }}>{req.reason}</div>
              </div>

              {req.status !== "Pending" && (
                <div style={{ 
                  background: req.status === "Approved" ? "linear-gradient(to right, #ecfdf5, #ffffff)" : "linear-gradient(to right, #fef2f2, #ffffff)", 
                  padding: "1.25rem", 
                  borderRadius: "12px", 
                  border: `1px solid ${req.status === "Approved" ? "#d1fae5" : "#fee2e2"}`,
                  borderLeft: `4px solid ${req.status === "Approved" ? "#10b981" : "#ef4444"}` 
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <div style={{ fontSize: "0.75rem", color: req.status === "Approved" ? "#059669" : "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "800", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {req.status === "Approved" ? <CheckCircle2 size={14} /> : <XCircle size={14} />} Admin Remarks / Reply
                    </div>
                    {req.updatedAt && (
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={12} /> {new Date(req.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                  </div>
                  <div style={{ color: "#334155", lineHeight: "1.6", fontSize: "0.95rem", fontStyle: req.adminRemarks ? "normal" : "italic" }}>
                    {req.adminRemarks ? req.adminRemarks : "No remarks provided."}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
