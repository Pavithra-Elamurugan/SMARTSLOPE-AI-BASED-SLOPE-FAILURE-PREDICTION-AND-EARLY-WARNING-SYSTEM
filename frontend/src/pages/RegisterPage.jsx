import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, error: authError, loading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState("PUBLIC_USER");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (!name.trim()) {
      setLocalError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        requestedRole,
      });

      // New user registered with default role PENDING -> Redirect to /dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-symbol">S</div>
          <div>
            <strong>SMART<span>SLOPE</span></strong>
            <small>AI LANDSLIDE MONITORING & EARLY WARNING SYSTEM</small>
          </div>
        </div>

        <div className="login-intro">
          <h2>Create Account</h2>
          <p>Register a new account to access slope telemetry & hazard monitoring.</p>
        </div>

        {displayError && (
          <div className="login-error-alert">
            {displayError}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              placeholder="name@smartslope.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-role">Requested Role (Subject to Admin Approval)</label>
            <select
              id="reg-role"
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "#0d1b2a",
                border: "1px solid var(--line)",
                color: "#fff",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            >
              <option value="PUBLIC_USER">Normal User / Resident (PUBLIC_USER)</option>
              <option value="ENGINEER">Field Engineer (ENGINEER)</option>
              <option value="SAFETY_OFFICER">Safety Officer (SAFETY_OFFICER)</option>
            </select>
            <small style={{ display: "block", marginTop: "4px", color: "var(--muted)", fontSize: "11px" }}>
              Note: Account will remain PENDING until approved by an Administrator.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <span style={{ fontSize: "12px", color: "#aebfca" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--cyan)", fontWeight: "600" }}>
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
