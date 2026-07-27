import { useState } from "react";
import API from "../api";
import { Eye, EyeOff } from "lucide-react";

export default function UserLogin({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/api/auth/user/login", { email, password });
      sessionStorage.setItem("token", res.data.token);
      sessionStorage.setItem("role", "user");
      sessionStorage.setItem("userName", res.data.name);
      sessionStorage.setItem("userId", res.data.userId);
      onLogin("user");
    } catch (err) {
      setError(err.response?.data?.error || "Faculty credentials rejected");
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "radial-gradient(circle at bottom right, #10b981 0%, #064e3b 100%)",
      padding: "1rem"
    }}>
      <div className="glass-card" style={{ 
        width: "100%",
        maxWidth: "420px", 
        padding: "3rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(16, 185, 129, 0.2)",
        background: "linear-gradient(rgba(6, 78, 59, 0.75), rgba(15, 23, 42, 0.85)), url('/login-bg.jpg') no-repeat center center",
        backgroundSize: "cover",
        border: "1px solid rgba(16, 185, 129, 0.4)",
        color: "#ffffff"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ 
            width: "64px", 
            height: "64px", 
            background: "rgba(16, 185, 129, 0.2)", 
            borderRadius: "16px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "32px", 
            margin: "0 auto 1.5rem",
            boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)"
          }}>👥</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.5rem", textShadow: "0 0 10px rgba(16, 185, 129, 0.4)" }}>Faculty Portal</h2>
          <p style={{ color: "#a7f3d0", fontSize: "0.95rem" }}>Enter evaluation data for assigned modules.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" style={{ color: "#e2e8f0" }}>Academic Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              className="text-input"
              placeholder="faculty@institution.edu"
              disabled={loading}
              style={{ 
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#ffffff"
              }}
            />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ color: "#e2e8f0" }}>Security Key / Password</label>
            <div style={{ position: "relative" }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
                className="text-input"
                placeholder="••••••••"
                disabled={loading}
                style={{ 
                  paddingRight: "40px",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#ffffff"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#a7f3d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ border: "none", background: "linear-gradient(135deg, #10b981, #059669)", width: "100%", padding: "1rem", justifyContent: "center", fontSize: "1rem", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>
            {loading ? "Verifying Credentials..." : "Access Portal"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button 
              className="btn btn-secondary" 
              style={{ border: "none", background: "transparent", fontSize: "0.85rem", padding: "0.5rem", color: "#34d399" }}
              onClick={() => onSwitch("register")}
            >
              Create Identity
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ border: "none", background: "transparent", fontSize: "0.85rem", padding: "0.5rem", color: "#34d399" }}
              onClick={() => onSwitch("adminLogin")}
            >
              Go to Admin →
            </button>
          </div>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ border: "none", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.9rem", padding: "0.75rem", borderRadius: "10px", fontWeight: "600" }}
            onClick={() => onSwitch("studentLogin")}
          >
            Switch to Student Portal 🎓
          </button>
        </div>
      </div>
    </div>
  );
}
