import { useState } from "react";
import API from "../api";

export default function StudentLogin({ onLogin, onSwitch }) {
  const [regNo, setRegNo] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/api/auth/student/login", { regNo, dob });
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("role", "student");
      sessionStorage.setItem("userName", res.data.name);
      sessionStorage.setItem("userId", res.data.regNo);
      onLogin("student");
    } catch (err) {
      setError(err.response?.data?.error || "Incorrect credentials or DOB not registered.");
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "radial-gradient(circle at bottom right, #0284c7 0%, #0c4a6e 100%)",
      padding: "1rem"
    }}>
      <div className="glass-card" style={{ 
        width: "100%",
        maxWidth: "420px", 
        padding: "3rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(14, 165, 233, 0.2)",
        background: "linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url('/login-bg.jpg') no-repeat center center",
        backgroundSize: "cover",
        border: "1px solid rgba(14, 165, 233, 0.4)",
        color: "#ffffff"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ 
            width: "64px", 
            height: "64px", 
            background: "rgba(14, 165, 233, 0.2)", 
            borderRadius: "16px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "32px", 
            margin: "0 auto 1.5rem",
            boxShadow: "0 0 15px rgba(14, 165, 233, 0.3)"
          }}>🎓</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.5rem", textShadow: "0 0 10px rgba(14, 165, 233, 0.4)" }}>Student Portal</h2>
          <p style={{ color: "#93c5fd", fontSize: "0.95rem" }}>View your academic grades & result analysis.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" style={{ color: "#e2e8f0" }}>Registration / Roll Number</label>
            <input 
              type="text" 
              value={regNo} 
              onChange={e => setRegNo(e.target.value)} 
              required
              className="text-input"
              placeholder="e.g. 21CS072"
              disabled={loading}
              style={{ 
                textTransform: "uppercase",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                color: "#ffffff"
              }}
            />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ color: "#e2e8f0" }}>Date of Birth</label>
            <input 
              type="date" 
              value={dob} 
              onChange={e => setDob(e.target.value)} 
              required
              className="text-input"
              disabled={loading}
              style={{ 
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(14, 165, 233, 0.3)",
                color: "#ffffff",
                colorScheme: "dark"
              }}
            />
          </div>
          
          {error && (
            <div style={{ 
              padding: "0.75rem", 
              background: "rgba(239, 68, 68, 0.15)", 
              border: "1px solid var(--danger)", 
              borderRadius: "8px", 
              color: "#fca5a5", 
              fontSize: "0.85rem", 
              marginBottom: "1.5rem",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ border: "none", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", width: "100%", padding: "1rem", justifyContent: "center", fontSize: "1rem", boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)" }}>
            {loading ? "Verifying student profile..." : "Access Results"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ border: "none", background: "transparent", fontSize: "0.85rem", padding: "0.5rem", color: "#38bdf8" }}
            onClick={() => onSwitch("userLogin")}
          >
            Faculty Portal →
          </button>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ border: "none", background: "transparent", fontSize: "0.85rem", padding: "0.5rem", color: "#38bdf8" }}
            onClick={() => onSwitch("adminLogin")}
          >
            Admin Portal →
          </button>
        </div>
      </div>
    </div>
  );
}
