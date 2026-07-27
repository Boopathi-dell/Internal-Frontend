import { useState } from "react";
import API from "../api";
import { Eye, EyeOff, ShieldAlert, KeyRound } from "lucide-react";

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Security State
  const [step, setStep] = useState(1); // 1: normal, 2: security code, 3: security question
  const [securityCode, setSecurityCode] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (step === 1) {
        // Normal Login
        const res = await API.post("/api/auth/admin/login", { email, password });
        if (res.data.requireSecurityCode) {
          setStep(2); // Move to security code step
        } else {
          loginSuccess(res.data);
        }
      } else if (step === 2) {
        // Verify Security Code
        const res = await API.post("/api/auth/admin/login", { email, password, securityCode });
        loginSuccess(res.data);
      } else if (step === 3) {
        // Verify Security Answer
        const res = await API.post("/api/auth/admin/verify-security-answer", { email, password, securityAnswer });
        loginSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid credentials");
    }
    setLoading(false);
  };

  const handleForgotCode = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await API.post("/api/auth/admin/get-security-question", { email, password });
      setSecurityQuestion(res.data.question);
      setStep(3); // Move to security question step
    } catch (err) {
      setError(err.response?.data?.error || "Error fetching security question");
    }
    setLoading(false);
  };

  const loginSuccess = (data) => {
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("role", data.role);
    onLogin(data.role);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "radial-gradient(circle at top right, #4f46e5 0%, #0f172a 100%)",
      padding: "1rem"
    }}>
      <div className="glass-card login-card-mobile" style={{ 
        width: "100%",
        maxWidth: "420px", 
        padding: "3rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.2)",
        background: "linear-gradient(rgba(79, 70, 229, 0.35), rgba(15, 23, 42, 0.85)), url('/login-bg.jpg') no-repeat center center",
        backgroundSize: "cover",
        border: "1px solid rgba(99, 102, 241, 0.4)",
        color: "#ffffff"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="login-icon-mobile" style={{ 
            width: "64px", 
            height: "64px", 
            background: "rgba(99, 102, 241, 0.2)", 
            borderRadius: "16px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "32px", 
            margin: "0 auto 1.5rem",
            boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)",
            color: "#818cf8"
          }}>
            {step === 1 ? '🔐' : step === 2 ? <KeyRound size={32} /> : <ShieldAlert size={32} />}
          </div>
          <h2 className="login-title-mobile" style={{ fontSize: "1.75rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.5rem", textShadow: "0 0 10px rgba(99, 102, 241, 0.4)" }}>
            {step === 1 ? "Administrative Access" : step === 2 ? "Security Code Required" : "Identity Verification"}
          </h2>
          <p className="login-subtitle-mobile" style={{ color: "#c7d2fe", fontSize: "0.95rem" }}>
            {step === 1 ? "Result Management Framework" : step === 2 ? "Enter your admin security code" : "Answer your security question"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <div className="input-group">
                <label className="input-label" style={{ color: "#e2e8f0" }}>Identity / Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required
                  className="text-input"
                  placeholder="admin@institution.edu"
                  disabled={loading}
                  style={{ 
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
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
                      border: "1px solid rgba(99, 102, 241, 0.3)",
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
                      color: "#c7d2fe",
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
            </>
          )}

          {step === 2 && (
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0" }}>Security Code</label>
              <input 
                type="password" 
                value={securityCode} 
                onChange={e => setSecurityCode(e.target.value)} 
                required
                className="text-input"
                placeholder="Enter your security code"
                disabled={loading}
                style={{ 
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "#ffffff",
                  letterSpacing: "4px",
                  textAlign: "center",
                  fontSize: "1.2rem",
                  fontWeight: "bold"
                }}
              />
            </div>
          )}

          {step === 3 && (
            <div className="input-group">
              <label className="input-label" style={{ color: "#e2e8f0", fontSize: "1rem", marginBottom: "1rem", lineHeight: "1.5" }}>
                <span style={{color: "#818cf8"}}>Question:</span> {securityQuestion}
              </label>
              <input 
                type="text" 
                value={securityAnswer} 
                onChange={e => setSecurityAnswer(e.target.value)} 
                required
                className="text-input"
                placeholder="Your Answer"
                disabled={loading}
                style={{ 
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "#ffffff"
                }}
              />
            </div>
          )}
          
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

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%", padding: "1rem", justifyContent: "center", fontSize: "1rem", border: "none", background: "linear-gradient(135deg, #4f46e5, #4338ca)", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)" }}>
            {loading ? "Verifying..." : step === 1 ? "Authorize Entrance" : "Verify Identity"}
          </button>
        </form>

        {step === 2 && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button 
              type="button"
              onClick={handleForgotCode}
              disabled={loading}
              style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer", fontSize: "0.9rem", textDecoration: "underline" }}
            >
              Forgot Code?
            </button>
          </div>
        )}
        
        {step > 1 && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button 
              type="button"
              onClick={() => { setStep(1); setError(""); }}
              disabled={loading}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}
            >
              ← Back to Login
            </button>
          </div>
        )}

        {step === 1 && (
          <div style={{ textAlign: "center", marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ border: "none", background: "transparent", fontSize: "0.9rem", color: "#a5b4fc" }}
              onClick={() => onLogin("showUserLogin")}
            >
              Switch to Faculty Portal →
            </button>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ border: "none", background: "rgba(79, 70, 229, 0.15)", color: "#a5b4fc", fontSize: "0.9rem", padding: "0.75rem", borderRadius: "10px", fontWeight: "600" }}
              onClick={() => onLogin("showStudentLogin")}
            >
              Switch to Student Portal 🎓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
