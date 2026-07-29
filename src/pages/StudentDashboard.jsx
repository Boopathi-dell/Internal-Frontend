import { useState, useEffect } from "react";
import API from "../api";
import { Printer, RefreshCw, Trophy, BookOpen, AlertCircle, CheckCircle2, XCircle, MessageSquareWarning, Bell } from "lucide-react";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Mark correction state
  const [showModal, setShowModal] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [reason, setReason] = useState("");
  const [expectedMark, setExpectedMark] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Class Advisor state
  const [advisorName, setAdvisorName] = useState("");

  // Notice popup states
  const [unreadNotices, setUnreadNotices] = useState([]);
  const [selectedLightboxPopupImg, setSelectedLightboxPopupImg] = useState(null);

  // Push Notification state
  const [pushPermission, setPushPermission] = useState("default");
  const [pushMessage, setPushMessage] = useState('');
  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const enablePush = async () => {
    setPushMessage('');
    if (!('serviceWorker' in navigator)) {
      setPushMessage('Service Workers are not supported in this browser.');
      return;
    }
    if (!('PushManager' in window)) {
      setPushMessage('Push Notifications are not supported in this browser.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        setPushMessage('Notification permission denied. Please allow it in your browser settings.');
        return;
      }

      // Register service worker explicitly (works better on mobile)
      let registration;
      try {
        registration = await navigator.serviceWorker.register('/sw.js');
      } catch (regErr) {
        registration = await navigator.serviceWorker.ready;
      }

      // Wait for the service worker to be active
      if (registration.installing) {
        await new Promise((resolve) => {
          registration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') resolve();
          });
          setTimeout(resolve, 3000); // fallback after 3s
        });
      }

      const vapidRes = await API.get('/api/announcements/vapid-public-key');
      const publicKey = vapidRes.data.publicKey;
      
      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
        return outputArray;
      };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const token = sessionStorage.getItem('token');
      await API.post('/api/announcements/subscribe', { subscription }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPushMessage('success');
    } catch (err) {
      console.error(err);
      setPushMessage('Failed to enable notifications: ' + (err.message || 'Unknown error'));
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("token");
      const res = await API.get("/api/auth/student/results", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Sort results by predefined exam order (Unit Tests -> CIAs -> Models -> ESE)
      if (res.data && res.data.results) {
        const examOrder = [
          "Unit Test - I",
          "Unit Test - II",
          "Unit Test - III",
          "Unit Test - IV",
          "Unit Test - V",
          "CIA - I",
          "CIA - II",
          "CIA - III",
          "Model Exam",
          "Model Practical Exam",
          "MKC",
          "ESE"
        ];
        res.data.results.sort((a, b) => {
          const indexA = examOrder.indexOf(a.examName);
          const indexB = examOrder.indexOf(b.examName);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.examName.localeCompare(b.examName);
        });
      }
      
      setData(res.data);

      // Fetch Advisor Name and cache class details for notices
      if (res.data && res.data.results && res.data.results.length > 0) {
        const firstResult = res.data.results[0];
        const programme = firstResult.programme || "B.E";
        const department = firstResult.department || "CSE";
        const yss = firstResult.yearSemSec || "";
        const parts = yss.split("/");
        const year = parts[0] || "II";
        const section = parts[2] || "A";

        // Cache class details for the notices page
        sessionStorage.setItem("studentProgramme", programme);
        sessionStorage.setItem("studentDepartment", department);
        sessionStorage.setItem("studentYear", year);
        sessionStorage.setItem("studentSection", section);

        try {
          const advRes = await API.get(`/api/advisors/lookup?programme=${programme}&department=${department}&year=${year}&section=${section}`);
          setAdvisorName(advRes.data.advisorName);
        } catch (err) {
          console.log("No advisor mapping found for student class group:", err.message);
          setAdvisorName("");
        }

        // Fetch announcements for login popup notification
        try {
          const noticesRes = await API.get(
            `/api/announcements/student?programme=${programme}&department=${department}&year=${year}&section=${section}`
          );
          const readIds = JSON.parse(localStorage.getItem("readNotices") || "[]");
          const unread = noticesRes.data.filter(n => !readIds.includes(n._id));
          setUnreadNotices(unread);
        } catch (err) {
          console.error("Failed to load announcements for popup:", err);
        }
      }
      
      // Fetch existing requests for this student
      if (res.data && res.data.regNo) {
        try {
          const reqRes = await API.get(`/api/corrections/student/${res.data.regNo}`);
          setPendingRequests(reqRes.data);
        } catch (err) {
          console.error("Failed to load requests", err);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load results. Please try again later.");
    }
    setLoading(false);
  };

  const handleRequestCorrection = (examResult, subj) => {
    setRequestData({
      studentRegNo: data.regNo,
      studentName: data.name,
      className: examResult.className || examResult.programme + " - " + examResult.department + " " + examResult.yearSemSec,
      examName: examResult.examName,
      subjectCode: subj.courseCode,
      subjectName: subj.courseName || "Unknown Subject",
      currentMark: subj.mark
    });
    setReason("");
    setExpectedMark("");
    setShowModal(true);
  };

  const submitCorrectionRequest = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for the mark correction request.");
      return;
    }
    setSubmittingRequest(true);
    try {
      await API.post("/api/corrections", {
        ...requestData,
        expectedMark,
        reason
      });
      alert("Request submitted successfully. An administrator will review it.");
      setShowModal(false);
      // Optimistically add to pending requests
      setPendingRequests(prev => [...prev, { ...requestData, expectedMark, reason, status: "Pending" }]);
    } catch (err) {
      alert("Failed to submit request: " + (err.response?.data?.error || err.message));
    }
    setSubmittingRequest(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitCorrectionRequest();
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--text-muted)" }}>
        <RefreshCw className="animate-spin" size={36} style={{ marginBottom: "1rem", color: "var(--primary)" }} />
        <p>Loading your academic records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "2rem", textAlign: "center" }} className="glass-card">
        <AlertCircle size={48} style={{ color: "var(--danger)", marginBottom: "1rem" }} />
        <h3 style={{ marginBottom: "0.5rem" }}>Unable to Retrieve Results</h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{error}</p>
        <button onClick={fetchResults} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  if (!data || !data.results || data.results.length === 0) {
    return (
      <div style={{ maxWidth: "600px", margin: "4rem auto", padding: "2rem", textAlign: "center" }} className="glass-card">
        <Trophy size={48} style={{ color: "var(--warning)", marginBottom: "1rem" }} />
        <h3 style={{ marginBottom: "0.5rem" }}>No Results Available</h3>
        <p style={{ color: "var(--text-muted)" }}>You are registered in the system, but no mark entries have been recorded for you yet.</p>
      </div>
    );
  }

  return (
    <>
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
      .student-dash-bg {
        min-height: 100vh;
        background: #f3f0fa;
        padding: 3rem 1.5rem;
        font-family: 'Outfit', 'Inter', sans-serif;
        position: relative;
        overflow: hidden;
      }
      /* Luminous purple floating backdrops */
      .student-dash-bg::before {
        content: '';
        position: absolute;
        width: 350px;
        height: 350px;
        background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0) 70%);
        top: -50px;
        left: -50px;
        pointer-events: none;
        z-index: 0;
      }
      .student-dash-bg::after {
        content: '';
        position: absolute;
        width: 450px;
        height: 450px;
        background: radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, rgba(124, 58, 237, 0) 70%);
        bottom: -100px;
        right: -100px;
        pointer-events: none;
        z-index: 0;
      }
      
      .student-header-card {
        background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
        border: 1px solid rgba(124, 58, 237, 0.2);
        border-radius: 24px;
        padding: 2rem;
        box-shadow: 0 20px 40px -15px rgba(124, 58, 237, 0.35);
        margin-bottom: 2.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #ffffff;
        position: relative;
        z-index: 10;
        animation: slideDown 0.5s ease-out;
      }
      
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes toastFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .student-name-gradient {
        color: #ffffff;
      }

      .btn-reload {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.25);
        padding: 0.6rem 1.2rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        backdrop-filter: blur(4px);
      }
      .btn-reload:hover {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.35);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
      }
      .btn-reload:active {
        transform: translateY(0);
      }

      .btn-print {
        background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
        color: #ffffff;
        border: none;
        padding: 0.6rem 1.4rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 700;
        font-size: 0.9rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(124, 58, 237, 0.25);
      }
      .btn-print:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 25px rgba(124, 58, 237, 0.35);
      }
      .btn-print:active {
        transform: translateY(0);
      }

      
      .exam-glass-card {
        background: #ffffff;
        border-radius: 24px;
        box-shadow: 0 15px 35px rgba(124, 58, 237, 0.08);
        border: 1px solid #eae6f5;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10;
        position: relative;
      }
      .exam-glass-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 25px 50px rgba(124, 58, 237, 0.15);
      }

      .exam-header-gradient {
        background: #ffffff;
        border-bottom: 1px solid #f3f0fa;
        padding: 1.5rem 2rem;
      }

      .modern-table {
        width: 100%;
        border-collapse: collapse;
      }
      .modern-table th {
        color: #6d28d9;
        font-weight: 800;
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 0.06em;
        border-bottom: 2px solid #ddd6fe;
        padding: 1.1rem 1rem;
        text-align: left;
        background: #fbfaff;
      }
      .modern-table td {
        background: #ffffff;
        padding: 1.1rem 1rem;
        border-bottom: 1px solid #f5f3ff;
        transition: all 0.25s ease;
      }
      .modern-table tbody tr:hover td {
        background: #fbfaff;
      }

      .stats-badge {
        background: #f5f3ff;
        padding: 0.8rem 1.2rem;
        border-radius: 16px;
        border: 1px solid #ddd6fe;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-width: 140px;
        box-shadow: 0 4px 10px rgba(124, 58, 237, 0.03);
      }

      .score-capsule {
        display: inline-block;
        padding: 0.35rem 0.75rem;
        border-radius: 10px;
        font-weight: 800;
        font-size: 1.05rem;
      }
      .score-capsule.pass {
        background: rgba(16, 185, 129, 0.08);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.15);
      }
      .score-capsule.fail {
        background: rgba(239, 68, 68, 0.08);
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.15);
      }

      .btn-review {
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0 auto;
        box-shadow: 0 4px 10px rgba(124, 58, 237, 0.25);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
      }
      .btn-review:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 14px rgba(124, 58, 237, 0.35);
      }
      .btn-review:active {
        transform: translateY(0);
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.35rem 0.75rem;
        border-radius: 10px;
        font-size: 0.8rem;
        font-weight: 800;
        margin: 0 auto;
      }
      .status-pill.pending {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.2);
        color: #d97706;
      }
      .status-pill.approved {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: #059669;
      }
      .status-pill.rejected {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #dc2626;
      }

      /* Premium Overlay & Notice Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.25s ease-out;
      }
      
      .modal-content-premium {
        background: #ffffff; 
        border-radius: 28px; 
        padding: 2.5rem; 
        max-width: 500px; 
        width: 90%;
        box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        animation: toastFadeIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 1px solid rgba(255, 255, 255, 0.5);
      }

      .modal-content-notice {
        background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%);
        border: 2px solid #fed7aa;
        border-radius: 28px;
        padding: 2.5rem;
        max-width: 550px;
        width: 90%;
        box-shadow: 0 30px 60px -15px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        animation: toastFadeIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
      }

      .modal-input {
        width: 100%; 
        margin-bottom: 1.25rem;
        padding: 0.85rem 1.1rem;
        border-radius: 12px;
        border: 1.5px solid #e2e8f0;
        background: #f8fafc;
        font-size: 1rem;
        outline: none;
        transition: all 0.3s ease;
        font-family: inherit;
      }
      .modal-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        background: #ffffff;
      }

      @media screen {
        .print-only { display: none !important; }
      }
      @media print {
        .student-dash-bg { padding: 0; background: none !important; }
        .student-dash-bg::before, .student-dash-bg::after { display: none !important; }
        .exam-glass-card { box-shadow: none !important; border: 1px solid #ccc !important; transform: none !important; background: white !important; }
        .colorful-watermark { display: none !important; }
        .exam-header-gradient { background: none !important; border-bottom: 1px solid #ccc !important; }
        .no-print { display: none !important; }
        .modern-table { border-collapse: collapse; border-spacing: 0; }
        .modern-table td, .modern-table th { border: 1px solid #ccc !important; border-radius: 0 !important; background: none !important; }
        .print-only { display: block !important; }
      }
    `}</style>
    <div className="student-dash-bg">
    <div className="page-layout" style={{ maxWidth: "1000px", margin: "0 auto", position: "relative" }}>

      {/* Header Summary */}
      <div className="student-header-card no-print">
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", margin: "0 0 0.4rem 0", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span className="student-name-gradient">Academic Performance</span>
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem", margin: 0, fontWeight: "500", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span>Real-time evaluation sheet for <strong style={{ color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>{data.name}</strong> ({data.regNo})</span>
            {advisorName && (
              <span style={{ 
                marginLeft: "0.5rem", 
                padding: "0.25rem 0.75rem", 
                background: "rgba(255, 255, 255, 0.12)", 
                color: "#ffffff", 
                borderRadius: "14px", 
                fontSize: "0.85rem", 
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(4px)"
              }}>
                🎓 Class Advisor: {advisorName}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={fetchResults} className="btn-reload">
            <RefreshCw size={16} /> Reload
          </button>
          <button onClick={handlePrint} className="btn-print">
            <Printer size={16} /> Print Statement
          </button>
        </div>
      </div>

      {/* Enable Push Notifications Banner */}
      {pushPermission === 'granted' ? (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "16px", padding: "1.25rem 1.5rem", marginBottom: "2.5rem", display: "flex", alignItems: "center", gap: "1rem" }} className="glass-card no-print">
          <div style={{ background: "#10b981", color: "white", padding: "0.5rem", borderRadius: "50%", display: "flex" }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.15rem 0", color: "#064e3b" }}>Notifications Enabled</h3>
            <p style={{ margin: 0, color: "#047857", fontSize: "0.9rem" }}>You will receive instant alerts for new announcements.</p>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(124, 58, 237, 0.1)", border: "1px solid rgba(124, 58, 237, 0.3)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }} className="glass-card no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "#7c3aed", color: "white", padding: "0.75rem", borderRadius: "12px" }}>
              <Bell size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 0.25rem 0", color: "#1e293b" }}>Get Instant Announcements</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Enable push notifications to be instantly notified when your department posts a new circular or announcement.</p>
            </div>
          </div>
          <button onClick={enablePush} className="btn btn-primary" style={{ background: "#7c3aed", border: "none", whiteSpace: "nowrap" }}>
            Enable Notifications
          </button>
          {pushMessage && pushMessage !== 'success' && (
            <div style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
              {pushMessage}
            </div>
          )}
        </div>
      )}

      {/* Print only header */}
      <div className="print-only" style={{ textAlign: "center", marginBottom: "2rem", borderBottom: "2px solid #333", paddingBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", letterSpacing: "0.05em", color: "#000" }}>CONTROLLER OF CSE DEPARTMENT</h2>
        <h3 style={{ fontSize: "1.1rem", color: "#444", marginTop: "0.25rem" }}>STUDENT EVALUATION REPORT</h3>
        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem", textAlign: "left", maxWidth: "600px", margin: "1.5rem auto 0 auto" }}>
          <div><strong>Student Name:</strong> {data.name}</div>
          <div><strong>Roll / Registration No:</strong> {data.regNo}</div>
          <div><strong>Department:</strong> {data.results[0]?.department || "N/A"}</div>
          <div><strong>Class Details:</strong> {data.results[0]?.programme || "N/A"} - {data.results[0]?.yearSemSec || "N/A"}</div>
          {advisorName && <div style={{ gridColumn: "span 2" }}><strong>Class Advisor:</strong> {advisorName}</div>}
        </div>
      </div>

      {/* Results grouped by Exam */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        {data.results.map((examResult, index) => {
          const isPass = examResult.result === "Pass";
          return (
            <div key={index} className="exam-glass-card" style={{ borderLeft: `6px solid ${isPass ? "#10b981" : "#ef4444"}` }}>
              {/* Exam Card Title & Overview */}
              <div className="exam-header-gradient" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.45rem", fontWeight: "800", margin: "0 0 0.4rem 0", display: "flex", alignItems: "center", gap: "0.6rem", color: "#0f172a" }}>
                    <div style={{ background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", padding: "0.45rem", borderRadius: "10px", color: "white", display: "flex", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)" }}>
                      <BookOpen size={18} />
                    </div>
                    {examResult.examName === "ESE" ? "End Semester Examination" : examResult.examName}
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", background: "#f1f5f9", padding: "0.25rem 0.65rem", borderRadius: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.03em", display: "inline-block", border: "1px solid #e2e8f0" }}>
                    Cohort: {examResult.programme} - {examResult.department} Sem {examResult.yearSemSec}
                  </span>
                </div>
                
                {/* Result Badges */}
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <div className="stats-badge">
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "0.15rem" }}>{examResult.examName === "ESE" ? "SGPA" : "Total Marks"}</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0f172a" }}>
                      {examResult.total} {examResult.examName !== "ESE" && <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "600" }}>/ {examResult.marks.length * examResult.markPerSubject}</span>}
                    </div>
                  </div>
                  <div className="stats-badge">
                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em", marginBottom: "0.15rem" }}>Percentage</div>
                    <div style={{ fontSize: "1.15rem", fontWeight: "800", color: isPass ? "#059669" : "#dc2626" }}>
                      {examResult.percentage.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.4rem", 
                    padding: "0.6rem 1.2rem", 
                    borderRadius: "14px", 
                    fontWeight: "800",
                    fontSize: "0.95rem",
                    background: isPass ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    boxShadow: isPass ? "0 4px 14px rgba(16, 185, 129, 0.35)" : "0 4px 14px rgba(239, 68, 68, 0.35)"
                  }}>
                    {isPass ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    {examResult.result}
                  </div>
                </div>
              </div>

              {/* Detailed Subject Table */}
              <div style={{ padding: "0 2rem 2rem 2rem", overflowX: "auto" }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: "15%" }}>Subject Code</th>
                      <th style={{ width: "40%" }}>Subject Name</th>
                      <th style={{ width: "20%" }}>Faculty</th>
                      <th style={{ textAlign: "center", width: "15%" }}>Marks Scored</th>
                      <th className="no-print" style={{ textAlign: "center", width: "10%" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResult.marks.map((subj, sIdx) => {
                      const isAbsent = String(subj.mark).toUpperCase() === "AB" || String(subj.mark).toUpperCase() === "A";
                      const markNum = Number(subj.mark);
                      const isSubjPass = !isAbsent && !isNaN(markNum) && markNum >= subj.passMark;
                      return (
                        <tr key={sIdx}>
                          <td style={{ fontWeight: "600", color: "#334155" }}>{subj.courseCode}</td>
                          <td style={{ color: "#0f172a", fontWeight: "700", fontSize: "0.95rem" }}>
                            {subj.courseName || <span style={{ color: "#94a3b8", fontStyle: "italic", fontWeight: "500" }}>No Name Configured</span>}
                          </td>
                          <td style={{ color: "#475569", fontSize: "0.9rem", fontWeight: "600" }}>{subj.facultyName || "N/A"}</td>
                          <td style={{ textAlign: "center" }}>
                            <div className={`score-capsule ${isSubjPass ? "pass" : "fail"}`}>
                              {subj.mark} <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>/ {subj.markPerSubject}</span>
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.3rem", fontWeight: "600" }}>
                              (Min Pass: {subj.passMark})
                            </div>
                          </td>
                          <td className="no-print" style={{ textAlign: "center" }}>
                            {(() => {
                              if (!subj.mark || subj.mark === "") {
                                return <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontWeight: "600" }}>-</span>;
                              }
                              const existingReq = pendingRequests.find(r => r.subjectCode === subj.courseCode && r.examName === examResult.examName && r.status === "Pending");
                              if (existingReq) {
                                return (
                                  <div className={`status-pill ${existingReq.status.toLowerCase()}`}>
                                    {existingReq.status === "Pending" && <RefreshCw size={12} className="animate-spin" />}
                                    {existingReq.status === "Approved" && <CheckCircle2 size={12} />}
                                    {existingReq.status === "Rejected" && <XCircle size={12} />}
                                    {existingReq.status}
                                  </div>
                                );
                              }
                              return (
                                <button
                                  onClick={() => handleRequestCorrection(examResult, subj)}
                                  className="btn-review"
                                  title="Request Mark Correction"
                                >
                                  <MessageSquareWarning size={14} />
                                  <span className="hide-mobile">Review</span>
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mark Correction Modal */}
      {showModal && requestData && (
        <div className="modal-overlay">
          <div className="modal-content-premium">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ 
                background: "linear-gradient(135deg, #f59e0b, #d97706)", 
                padding: "0.6rem", 
                borderRadius: "14px", 
                color: "white",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                display: "flex"
              }}>
                <MessageSquareWarning size={22} />
              </div>
              <h2 style={{ color: "#0f172a", fontSize: "1.5rem", fontWeight: "800", margin: 0 }}>
                Request Mark Review
              </h2>
            </div>
            
            <p style={{ color: "#475569", marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: "1.6" }}>
              If you believe there is an error in your mark for <strong style={{ color: "#0f172a" }}>{requestData.subjectName} ({requestData.subjectCode})</strong>, please provide a detailed reason below.
            </p>
            
            <div style={{ 
              background: "linear-gradient(to right, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))", 
              borderLeft: "4px solid #f59e0b",
              padding: "1.25rem", 
              borderRadius: "12px", 
              marginBottom: "1.5rem", 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "1rem", 
              fontSize: "0.95rem",
              color: "#334155"
            }}>
              <div><span style={{ color: "#64748b", fontSize: "0.825rem", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "0.2rem" }}>Exam</span> <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{requestData.examName === "ESE" ? "End Semester Examination" : requestData.examName}</strong></div>
              <div><span style={{ color: "#64748b", fontSize: "0.825rem", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "0.2rem" }}>Current Mark</span> <strong style={{ fontSize: "1.2rem", color: "#dc2626" }}>{requestData.currentMark}</strong></div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "700", color: "#334155", fontSize: "0.9rem" }}>Expected Mark</label>
              <input
                type="text"
                value={expectedMark}
                onChange={(e) => setExpectedMark(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="E.g., 85"
                className="modal-input"
              />

              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "700", color: "#334155", fontSize: "0.9rem" }}>Reason for Request <span style={{color: "#ef4444"}}>*</span></label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="E.g., Sir, in this subject my mark is low. I have verified with my answers and expect a higher mark..."
                rows="4"
                className="modal-input"
                style={{ resize: "vertical" }}
              ></textarea>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button 
                onClick={() => setShowModal(false)} 
                disabled={submittingRequest}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  border: "none",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  cursor: submittingRequest ? "not-allowed" : "pointer",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => !submittingRequest && (e.target.style.background = "#e2e8f0")}
                onMouseOut={(e) => !submittingRequest && (e.target.style.background = "#f1f5f9")}
              >
                Cancel
              </button>
              <button 
                onClick={submitCorrectionRequest} 
                disabled={submittingRequest}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "12px",
                  border: "none",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#fff",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  cursor: submittingRequest ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
                onMouseOver={(e) => !submittingRequest && (e.target.style.transform = "translateY(-2px)", e.target.style.boxShadow = "0 6px 15px rgba(245, 158, 11, 0.4)")}
                onMouseOut={(e) => !submittingRequest && (e.target.style.transform = "translateY(0)", e.target.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.3)")}
              >
                {submittingRequest ? (
                  <><RefreshCw size={18} className="animate-spin" /> Submitting...</>
                ) : (
                  "Submit Request"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Important Campus Notices Login Popup */}
      {unreadNotices.length > 0 && (() => {
        const activeNotice = unreadNotices[0];
        return (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content-notice">
              {/* Header: Announcement/Megaphone & Category Tag */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "2rem" }}>📢</span>
                  <div>
                    <h3 style={{ margin: 0, color: "#78350f", fontSize: "1.3rem", fontWeight: "800" }}>Important Notice</h3>
                    {unreadNotices.length > 1 && (
                      <span style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: "600" }}>
                        ({unreadNotices.length} unread notices remaining)
                      </span>
                    )}
                  </div>
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  ...(activeNotice.category === "Exam" ? { color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca" } :
                     activeNotice.category === "Holiday" ? { color: "#047857", background: "#d1fae5", border: "1px solid #a7f3d0" } :
                     activeNotice.category === "Fee" ? { color: "#1d4ed8", background: "#dbeafe", border: "1px solid #bfdbfe" } :
                     { color: "#78350f", background: "#fef3c7", border: "1px solid #fde68a" })
                }}>
                  {activeNotice.category}
                </span>
              </div>

              {/* Title */}
              <h2 style={{ color: "#78350f", fontSize: "1.6rem", fontWeight: "900", marginBottom: "1rem", lineHeight: 1.3 }}>
                {activeNotice.title}
              </h2>

              {/* Content */}
              <div style={{
                background: "#ffffff",
                border: "1px solid #fef3c7",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "inset 0 2px 4px rgba(245,158,11,0.02)",
                color: "#451a03",
                fontSize: "1rem",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
                maxHeight: "220px",
                overflowY: "auto",
                marginBottom: "1.5rem"
              }}>
                {activeNotice.content}
              </div>

              {/* Circular Attachment Thumbnail (If present) */}
              {activeNotice.image && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "#b45309", fontWeight: "600" }}>
                    Attached Circular (Click to zoom)
                  </span>
                  <div style={{ position: "relative", width: "100px", height: "100px", cursor: "zoom-in" }}>
                    <img
                      src={activeNotice.image}
                      alt="Circular attachment"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid #fed7aa",
                        boxShadow: "0 4px 10px rgba(245, 158, 11, 0.15)",
                        transition: "transform 0.2s ease"
                      }}
                      onMouseOver={e => e.target.style.transform = "scale(1.05)"}
                      onMouseOut={e => e.target.style.transform = "scale(1)"}
                      onClick={() => setSelectedLightboxPopupImg(activeNotice.image)}
                    />
                  </div>
                </div>
              )}

              {/* Footer / Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: "600" }}>
                  Published: {new Date(activeNotice.createdAt).toLocaleDateString([], { dateStyle: "medium" })}
                </span>
                
                <button
                  onClick={() => {
                    const readIds = JSON.parse(localStorage.getItem("readNotices") || "[]");
                    if (!readIds.includes(activeNotice._id)) {
                      readIds.push(activeNotice._id);
                      localStorage.setItem("readNotices", JSON.stringify(readIds));
                    }
                    setUnreadNotices(prev => prev.filter(n => n._id !== activeNotice._id));
                  }}
                  style={{
                    padding: "0.85rem 1.75rem",
                    borderRadius: "14px",
                    border: "none",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#fff",
                    fontWeight: "800",
                    fontSize: "1rem",
                    cursor: "pointer",
                    boxShadow: "0 6px 15px rgba(245, 158, 11, 0.3)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseOver={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 8px 20px rgba(245, 158, 11, 0.4)"; }}
                  onMouseOut={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 6px 15px rgba(245, 158, 11, 0.3)"; }}
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lightbox for Popup Circular Image */}
      {selectedLightboxPopupImg && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          backdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease"
        }} onClick={() => setSelectedLightboxPopupImg(null)}>
          <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedLightboxPopupImg(null)}
              style={{
                position: "absolute",
                top: "-45px",
                right: 0,
                background: "none",
                border: "none",
                color: "white",
                fontSize: "2.5rem",
                cursor: "pointer"
              }}
            >
              &times;
            </button>
            <img 
              src={selectedLightboxPopupImg} 
              alt="Expanded Circular" 
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "12px",
                border: "3px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
              }} 
            />
          </div>
        </div>
      )}
    </div>
    </div>
    </>
  );
}
