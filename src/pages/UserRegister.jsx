import { useState } from "react";
import API from "../api";
import { Eye, EyeOff } from "lucide-react";

export default function UserRegister({ onSwitch }) {
  const [form, setForm] = useState({ name: "", email: "", department: "", designation: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    
    if (form.password !== form.confirmPassword) {
      setError("Security breach: Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      setError("Constraint error: Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/api/auth/user/register", {
        name: form.name, email: form.email, department: form.department,
        designation: form.designation, password: form.password
      });
      setSuccess("Account transmission successful. Awaiting administrator verification.");
      setForm({ name: "", email: "", department: "", designation: "", password: "", confirmPassword: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Registration sequence failed");
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "radial-gradient(circle at bottom right, #f59e0b 0%, #0f172a 100%)",
      padding: "1rem"
    }}>
      <div className="glass-card" style={{ 
        width: "100%",
        maxWidth: "460px", 
        padding: "3rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(245, 158, 11, 0.2)",
        background: "linear-gradient(rgba(217, 119, 6, 0.3), rgba(15, 23, 42, 0.85)), url('/login-bg.jpg') no-repeat center center",
        backgroundSize: "cover",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        color: "#ffffff"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ 
            width: "64px", 
            height: "64px", 
            background: "rgba(245, 158, 11, 0.2)", 
            borderRadius: "16px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "32px", 
            margin: "0 auto 1.5rem",
            boxShadow: "0 0 15px rgba(245, 158, 11, 0.3)"
          }}>🎓</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.5rem", textShadow: "0 0 10px rgba(245, 158, 11, 0.4)" }}>Create Faculty Account</h2>
          <p style={{ color: "#fde68a", fontSize: "0.95rem" }}>Register for institutional data access.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Full Name</label>
              <input 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                required 
                className="text-input" 
                placeholder="P BOOPATHI" 
                disabled={loading}
                style={{ 
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Academic Email</label>
              <input 
                type="email" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})} 
                required 
                className="text-input" 
                placeholder="boopathi@gmail.com" 
                disabled={loading}
                style={{ 
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Department</label>
              <input 
                value={form.department} 
                onChange={e => setForm({...form, department: e.target.value})} 
                required 
                className="text-input" 
                placeholder="CSE" 
                disabled={loading}
                style={{ 
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Designation</label>
              <input 
                value={form.designation} 
                onChange={e => setForm({...form, designation: e.target.value})} 
                required 
                className="text-input" 
                placeholder="TA/CSE" 
                disabled={loading}
                style={{ 
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Portal Password</label>
              <div style={{ position: "relative" }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                  required 
                  className="text-input" 
                  disabled={loading} 
                  style={{ 
                    paddingRight: "40px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
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
                    color: "#fde68a",
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
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Confirm Key</label>
              <div style={{ position: "relative" }}>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={form.confirmPassword} 
                  onChange={e => setForm({...form, confirmPassword: e.target.value})} 
                  required 
                  className="text-input" 
                  disabled={loading} 
                  style={{ 
                    paddingRight: "40px",
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#ffffff"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#fde68a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px"
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
            }}>{error}</div>
          )}

          {success && (
            <div style={{ 
              padding: "0.75rem", 
              background: "rgba(16, 185, 129, 0.15)", 
              border: "1px solid var(--success)", 
              borderRadius: "8px", 
              color: "#a7f3d0", 
              fontSize: "0.85rem", 
              marginBottom: "1.5rem",
              textAlign: "center"
            }}>{success}</div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "1rem", justifyContent: "center", fontSize: "1rem", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)" }}>
            {loading ? "Transmitting Account..." : "Initiate Registration"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            style={{ border: "none", background: "transparent", fontSize: "0.9rem", color: "#fcd34d" }}
            onClick={() => onSwitch("userLogin")}
          >
            ← Back to Authorization
          </button>
        </div>
      </div>
    </div>
  );
}
