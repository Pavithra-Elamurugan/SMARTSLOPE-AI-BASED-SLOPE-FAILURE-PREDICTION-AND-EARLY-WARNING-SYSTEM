import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    alert("Password reset instructions have been dispatched. Please contact system administrator if assistance is required.");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-symbol">S</div>
          <div>
            <strong>
              SMART<span>SLOPE</span>
            </strong>
            <small>AI LANDSLIDE MONITORING & EARLY WARNING SYSTEM</small>
          </div>
        </div>

        <div className="login-intro">
          <h2>Sign In</h2>
          <p>Enter your credentials to access SmartSlope geotechnical operations.</p>
        </div>

        {error && <div className="login-error-alert">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="name@smartslope.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password" style={{ margin: 0 }}>Password</label>
              <a
                href="#forgot"
                onClick={handleForgotPassword}
                style={{ fontSize: "11px", color: "var(--cyan)", textDecoration: "none" }}
              >
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Command Center →"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <span style={{ fontSize: "12px", color: "#aebfca" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--cyan)", fontWeight: "600" }}>
              Create an account
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
