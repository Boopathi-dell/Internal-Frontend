import { useState, useEffect } from "react";
import API from "../api";
import { Bell, Search, RefreshCw, AlertCircle, Calendar, User, CheckCircle2 } from "lucide-react";

export default function StudentNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedImage, setSelectedImage] = useState(null);

  const [studentInfo, setStudentInfo] = useState({
    programme: sessionStorage.getItem("studentProgramme") || "",
    department: sessionStorage.getItem("studentDepartment") || "",
    year: sessionStorage.getItem("studentYear") || "",
    section: sessionStorage.getItem("studentSection") || ""
  });

  // Push Notification state
  const [pushPermission, setPushPermission] = useState("default");
  useEffect(() => {
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const vapidRes = await API.get('/api/announcements/vapid-public-key');
        const publicKey = vapidRes.data.publicKey;
        
        const urlBase64ToUint8Array = (base64String) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
          return outputArray;
        };

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        const token = sessionStorage.getItem("token");
        await API.post('/api/announcements/subscribe', { subscription }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Notifications Enabled successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to enable notifications. Try again or check browser settings.");
    }
  };

  const fetchStudentProfileAndNotices = async () => {
    setLoading(true);
    setError("");
    try {
      let currentInfo = { ...studentInfo };
      
      // If we don't have student class info in session storage, fetch it
      if (!currentInfo.programme || !currentInfo.department || !currentInfo.year || !currentInfo.section) {
        const token = sessionStorage.getItem("token");
        const res = await API.get("/api/auth/student/results", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && res.data.results && res.data.results.length > 0) {
          const firstResult = res.data.results[0];
          const yss = firstResult.yearSemSec || "";
          const parts = yss.split("/");
          
          currentInfo = {
            programme: firstResult.programme || "B.E",
            department: firstResult.department || "CSE",
            year: parts[0] || "II",
            section: parts[2] || "A"
          };
          
          // Cache in session storage
          sessionStorage.setItem("studentProgramme", currentInfo.programme);
          sessionStorage.setItem("studentDepartment", currentInfo.department);
          sessionStorage.setItem("studentYear", currentInfo.year);
          sessionStorage.setItem("studentSection", currentInfo.section);
          setStudentInfo(currentInfo);
        } else {
          throw new Error("Student class information could not be determined.");
        }
      }

      // Fetch announcements filtered by class details
      const noticesRes = await API.get(
        `/api/announcements/student?programme=${currentInfo.programme}&department=${currentInfo.department}&year=${currentInfo.year}&section=${currentInfo.section}`
      );
      setNotices(noticesRes.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentProfileAndNotices();
  }, []);

  // Filter and search notices
  const filteredNotices = notices.filter(notice => {
    const matchesCategory = activeCategory === "All" || notice.category === activeCategory;
    const matchesSearch = 
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
    <style>{`
      .bulletin-board-card {
        background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%);
        border: 2px dashed #f59e0b;
        border-radius: 24px;
        padding: 2rem;
        box-shadow: 0 20px 40px -15px rgba(245, 158, 11, 0.12);
        margin-bottom: 2.5rem;
      }
      .bulletin-header-badge {
        background: rgba(245, 158, 11, 0.1);
        color: #d97706;
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.25rem 0.6rem;
        border-radius: 20px;
        text-transform: uppercase;
      }
      .filter-pill {
        padding: 0.5rem 1.25rem;
        border-radius: 20px;
        border: 1px solid #fed7aa;
        background: #ffffff;
        color: #b45309;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .filter-pill.active {
        background: #f59e0b;
        color: #ffffff;
        border-color: #f59e0b;
        box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
      }
      .filter-pill:hover:not(.active) {
        background: #ffedd5;
      }
      .search-box {
        position: relative;
        flex-grow: 1;
        max-width: 400px;
      }
      .search-input {
        width: 100%;
        padding: 0.65rem 1rem 0.65rem 2.5rem;
        border-radius: 12px;
        border: 1px solid #fed7aa;
        background: #ffffff;
        outline: none;
        font-size: 0.95rem;
        color: #78350f;
        transition: all 0.2s;
      }
      .search-input:focus {
        border-color: #f59e0b;
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
      }
      .memo-card {
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid #fef3c7;
        padding: 1.5rem;
        box-shadow: 0 4px 10px -1px rgba(245, 158, 11, 0.04), 0 2px 4px -1px rgba(245, 158, 11, 0.02);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .memo-card:hover {
        transform: translateY(-3px) scale(1.01);
        box-shadow: 0 20px 25px -5px rgba(245, 158, 11, 0.1), 0 10px 10px -5px rgba(245, 158, 11, 0.04);
      }
      .category-tag {
        font-size: 0.7rem;
        font-weight: 800;
        padding: 0.2rem 0.5rem;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
      }
      .tag-general { color: #78350f; background: #fef3c7; border: 1px solid #fde68a; }
      .tag-exam { color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; }
      .tag-holiday { color: #047857; background: #d1fae5; border: 1px solid #a7f3d0; }
      .tag-fee { color: #1d4ed8; background: #dbeafe; border: 1px solid #bfdbfe; }
      .circular-img {
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .circular-img:hover {
        transform: scale(1.08);
        border-color: #f59e0b !important;
      }
      .lightbox-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.25s ease;
      }
      .lightbox-container {
        position: relative;
        max-width: 90%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: zoomIn 0.25s ease;
      }
      .lightbox-img {
        max-width: 100%;
        max-height: 80vh;
        border-radius: 8px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 3px solid rgba(255, 255, 255, 0.1);
      }
      .lightbox-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.2s;
      }
      .lightbox-close:hover {
        opacity: 1;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes zoomIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `}</style>

    <div className="page-layout">
      <div className="header-flex">
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Bell className="icon-primary" />
            Campus Notices
          </h1>
          <p className="text-muted">Important notices and updates for your class.</p>
        </div>
        <button onClick={fetchStudentProfileAndNotices} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", padding: "1rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Enable Push Notifications Banner */}
      {pushPermission === 'granted' ? (
        <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "16px", padding: "1.25rem 1.5rem", marginBottom: "2.5rem", display: "flex", alignItems: "center", gap: "1rem" }} className="glass-card">
          <div style={{ background: "#10b981", color: "white", padding: "0.5rem", borderRadius: "50%", display: "flex" }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 0.15rem 0", color: "#064e3b" }}>Notifications Enabled</h3>
            <p style={{ margin: 0, color: "#047857", fontSize: "0.9rem" }}>You will receive instant alerts for new announcements.</p>
          </div>
        </div>
      ) : (
        <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }} className="glass-card">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ background: "#f59e0b", color: "white", padding: "0.75rem", borderRadius: "12px" }}>
              <Bell size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 0.25rem 0", color: "#78350f" }}>Get Instant Announcements</h3>
              <p style={{ margin: 0, color: "#92400e", fontSize: "0.9rem" }}>Enable push notifications to be instantly notified when your department posts a new circular or announcement.</p>
            </div>
          </div>
          <button onClick={enablePush} className="btn btn-primary" style={{ background: "#f59e0b", border: "none", color: "white", whiteSpace: "nowrap" }}>
            Enable Notifications
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <RefreshCw className="animate-spin" size={36} style={{ color: "var(--primary)" }} />
        </div>
      ) : notices.length === 0 ? (
        <div className="glass-card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Bell size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
          <h3>No Announcements Found</h3>
          <p>There are no active notices published for your class group at the moment.</p>
        </div>
      ) : (
        <div className="bulletin-board-card">
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", borderBottom: "1px solid #fed7aa", paddingBottom: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.75rem" }}>📢</span>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#78350f", margin: 0 }}>Bulletin Board</h2>
              <span style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: "600" }}>
                Class: {studentInfo.programme} {studentInfo.department} - Year {studentInfo.year} Sec {studentInfo.section}
              </span>
            </div>
            <span style={{ marginLeft: "auto" }} className="bulletin-header-badge">
              {filteredNotices.length} {filteredNotices.length === 1 ? "Notice" : "Notices"}
            </span>
          </div>

          {/* Search and Filters */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["All", "Exam", "Holiday", "Fee", "General"].map(cat => (
                <button 
                  key={cat} 
                  className={`filter-pill ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="search-box">
              <Search size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#b45309" }} />
              <input 
                type="text" 
                placeholder="Search notices..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Grid of notices */}
          {filteredNotices.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#b45309", background: "rgba(255,255,255,0.4)", borderRadius: "16px", border: "1px dashed #fed7aa" }}>
              <p style={{ fontWeight: "600", margin: 0 }}>No notices match your filter or search query.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
              {filteredNotices.map((ann) => {
                const isNew = (new Date() - new Date(ann.createdAt)) < 24 * 60 * 60 * 1000;
                let tagClass = "tag-general";
                if (ann.category === "Exam") tagClass = "tag-exam";
                else if (ann.category === "Holiday") tagClass = "tag-holiday";
                else if (ann.category === "Fee") tagClass = "tag-fee";

                return (
                  <div key={ann._id} className="memo-card">
                    {/* Top Row: Category and New Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={`category-tag ${tagClass}`}>
                        {ann.category}
                      </span>
                      {isNew && (
                        <span style={{
                          background: "#ef4444",
                          color: "white",
                          fontSize: "0.65rem",
                          fontWeight: "900",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "10px",
                          letterSpacing: "0.05em",
                          animation: "pulseBlink 1.5s infinite"
                        }} className="badge-blink">
                          NEW
                        </span>
                      )}
                    </div>

                    {/* Notice Title */}
                    <strong style={{ fontSize: "1.1rem", color: "#78350f" }}>{ann.title}</strong>

                    {/* Notice Content */}
                    <p style={{ fontSize: "0.92rem", color: "#451a03", lineHeight: "1.6", margin: "0 0 0.5rem 0", whiteSpace: "pre-line", flexGrow: 1 }}>
                      {ann.content}
                    </p>

                    {ann.image && (
                      <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0" }}>
                        <div style={{ position: "relative", width: "80px", height: "80px", cursor: "zoom-in" }}>
                          <img 
                            src={ann.image} 
                            alt="Circular Notice"
                            style={{ 
                              width: "100%", 
                              height: "100%", 
                              borderRadius: "50%", 
                              objectFit: "cover", 
                              border: "3px solid #fed7aa",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
                            }}
                            className="circular-img"
                            onClick={() => setSelectedImage(ann.image)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Footer Row */}
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      fontSize: "0.75rem", 
                      color: "#b45309", 
                      fontWeight: "600",
                      borderTop: "1px dashed #fed7aa",
                      paddingTop: "0.75rem",
                      marginTop: "auto"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <User size={12} /> {ann.createdBy}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Calendar size={12} /> {new Date(ann.createdAt).toLocaleDateString([], { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="lightbox-overlay" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-container" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedImage(null)}>&times;</button>
            <img src={selectedImage} alt="Expanded Notice" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
    </>
  );
}
