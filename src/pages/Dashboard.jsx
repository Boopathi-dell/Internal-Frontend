import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Settings, FileEdit, BarChart, Trophy, ArrowRight } from "lucide-react";
import API from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [examName, setExamName] = useState("CIA - III");
  const [loadingStats, setLoadingStats] = useState(false);

  const examNameOptions = [
    "Model Exam", "Model Practical Exam", "Unit Test - I", "Unit Test - II", 
    "Unit Test - III", "Unit Test - IV", "Unit Test - V", "CIA - I", "CIA - II", 
    "CIA - III", "MKC", "ESE"
  ];

  const cards = [
    { name: "Admin Setup", path: "/admin", icon: <Settings size={28} />, desc: "Configure classes, manage student rosters, and upload excel data.", color: "#4f46e5" },
    { name: "Mark Entry", path: "/entry", icon: <FileEdit size={28} />, desc: "Securely input student marks with real-time validation and autosave.", color: "#10b981" },
    { name: "Class Analysis", path: "/analysis", icon: <BarChart size={28} />, desc: "Generate statistical reports, overall pass rates, and performance trends.", color: "#0ea5e9" },
    { name: "Rank List", path: "/rank", icon: <Trophy size={28} />, desc: "View automatically calculated student rankings based on weighted scores.", color: "#f59e0b" },
  ];

  useEffect(() => {
    fetchQuickStats();
  }, [examName]);

  const fetchQuickStats = async () => {
    setLoadingStats(true);
    try {
      const res = await API.get("/api/analysis/quick", { params: { exam: examName } });
      if (res.data.stats) {
        setStats(res.data.stats);
      }
      if (res.data.examName && !examName) {
        setExamName(res.data.examName);
      }
    } catch (err) {
      console.error("Failed to fetch quick stats", err);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <>
    <style>{`
      .admin-dash-bg {
        min-height: 100vh;
        background: radial-gradient(circle at 50% 0%, #38bdf8 0%, #2563eb 60%, #1e3a8a 100%);
        margin: -2.5rem;
        padding: 3rem 2.5rem;
        font-family: 'Outfit', 'Inter', sans-serif;
        position: relative;
        overflow: hidden;
      }
      @media (max-width: 768px) {
        .admin-dash-bg {
          margin: -5.5rem -1rem -1.5rem -1rem;
          padding: 6rem 1rem 2rem 1rem;
        }
      }
      .admin-dash-bg::before {
        content: '';
        position: absolute;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
        top: -50px;
        left: -50px;
        pointer-events: none;
        z-index: 0;
      }
      .admin-dash-bg::after {
        content: '';
        position: absolute;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%);
        bottom: -100px;
        right: -100px;
        pointer-events: none;
        z-index: 0;
      }
      
      .admin-header-card {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 24px;
        padding: 1.5rem 2rem;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        margin-bottom: 2.5rem;
        position: relative;
        z-index: 10;
      }
      .admin-header-title {
        background: linear-gradient(90deg, #ffffff, #e0f2fe);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 1.85rem;
        font-weight: 800;
        margin: 0 0 0.4rem 0;
      }
      .admin-header-subtext {
        color: rgba(255, 255, 255, 0.85);
        font-size: 1.05rem;
        margin: 0;
        font-weight: 500;
      }

      .admin-glass-card {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 24px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.4);
        padding: 1.75rem;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        z-index: 10;
      }
      .admin-glass-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 35px 65px -12px rgba(0, 0, 0, 0.3);
      }
      
      .admin-select-input {
        padding: 0.625rem 2rem 0.625rem 0.875rem;
        border-radius: 12px;
        border: 1.5px solid #e2e8f0;
        background: #f8fafc;
        color: var(--text-main);
        font-family: inherit;
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        width: auto;
        min-width: 170px;
        cursor: pointer;
      }
      .admin-select-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        background: #ffffff;
      }

      .admin-stat-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem;
        box-shadow: var(--shadow-sm);
        transition: all 0.3s ease;
      }
      .admin-stat-card:hover {
        background: #ffffff;
        box-shadow: var(--shadow-md);
      }
    `}</style>
    <div className="admin-dash-bg fade-in">
      <div className="admin-header-card">
        <div>
          <h1 className="admin-header-title">Welcome, Administrator</h1>
          <p className="admin-header-subtext">Monitor academic performance and manage institutional data.</p>
        </div>
      </div>

      <div className="card-grid">
        {cards.map((card) => (
          <Link to={card.path} key={card.path} style={{ textDecoration: "none" }}>
            <div className="admin-glass-card" style={{ height: "100%", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: `${card.color}15`,
                  color: card.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                  boxShadow: `0 4px 12px ${card.color}10`
                }}>
                  {card.icon}
                </div>
                <h3 style={{ marginBottom: "0.75rem", fontSize: "1.25rem", color: "var(--text-main)", fontWeight: "700" }}>{card.name}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>{card.desc}</p>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: card.color,
                fontWeight: "800",
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Launch Module <ArrowRight size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="admin-glass-card" style={{ marginTop: "2.5rem", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "15px" }}>
          <h3 style={{ margin: 0, fontWeight: "800", fontSize: "1.25rem", color: "var(--text-main)" }}>Quick Statistics</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: "600" }}>Select Exam:</span>
            <select 
              className="admin-select-input" 
              value={examName} 
              onChange={(e) => setExamName(e.target.value)}
            >
              <option value="">Latest Exam</option>
              {examNameOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>
        
        {loadingStats ? (
          <p style={{ color: "var(--text-muted)", fontWeight: "500" }}>Loading statistics...</p>
        ) : (
          <div className="card-grid">
            {stats.map((s, idx) => (
              <div className="admin-stat-card" key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                  <div className="stat-label" style={{ fontSize: "1.1rem", color: "var(--text-main)", fontWeight: "700" }}>{s.year}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Total Students:</span>
                    <span style={{ fontWeight: "800", fontSize: "1.1rem", color: "var(--text-main)" }}>{s.totalStudents}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontWeight: "500" }}>Pass Rate:</span>
                    <span style={{ 
                      fontWeight: "800", 
                      fontSize: "1.1rem",
                      color: s.passPercentage >= 80 ? "var(--success)" : s.passPercentage >= 50 ? "var(--warning)" : "var(--danger)" 
                    }}>
                      {s.passPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {stats.length === 0 && <p style={{ color: "var(--text-muted)", fontWeight: "500" }}>No data found for the selected exam.</p>}
          </div>
        )}
      </div>
    </div>
    </>
  );
}


