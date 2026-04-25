import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import "./App.css";
import {
  API_BASE_URL,
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "./utils/sevalink";

const initialState = {
  login: {
    email: "",
    password: "",
  },
  register: {
    name: "",
    email: "",
    password: "",
    role: "Volunteer",
    organizationName: "",
    location: "",
    skills: "",
    availabilityScore: "0.75",
    latitude: "",
    longitude: "",
  },
  forgot: {
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  },
};

const authHighlights = [
  {
    title: "Smart volunteer routing",
    body: "Skills, availability, and location signals come together in a calmer assignment flow.",
  },
  {
    title: "Secure recovery",
    body: "Forgot password now supports an OTP-based reset journey so people can get back in quickly.",
  },
  {
    title: "Operational clarity",
    body: "Volunteers and NGOs land in focused workspaces that surface the next best action fast.",
  },
];

const authStats = [
  { value: "24/7", label: "Response-ready platform" },
  { value: "1", label: "Unified help network" },
  { value: "OTP", label: "Secure recovery flow" },
];

function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [forgotStep, setForgotStep] = useState("request");
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (storedSession) {
      setSession(storedSession);
    }
  }, []);

  const panelCopy = useMemo(
    () => ({
      login: {
        badge: "Welcome back",
        title: "Sign in and get straight to the work that matters.",
        subtitle:
          "Designed for fast access, cleaner task coordination, and a more professional volunteer experience.",
        buttonText: "Login",
        endpoint: "login",
      },
      register: {
        badge: "Join SevaLink",
        title: "Create a polished profile and start helping with confidence.",
        subtitle:
          "Volunteers can highlight skills and availability while NGOs can onboard into a more structured command workspace.",
        buttonText: "Register",
        endpoint: "register",
      },
      forgot: {
        badge: "Account recovery",
        title: "Reset your password with a one-time code.",
        subtitle:
          "Request an OTP by email, then set a new password securely without leaving the app flow.",
      },
    }),
    []
  );

  const handleChange = (mode, field, value) => {
    setFormData((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [field]: value,
      },
    }));
  };

  const goToRoleHome = (user) => {
    navigate(user.role === "NGO" ? "/admin" : "/tasks");
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = formData[activeTab];

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${panelCopy[activeTab].endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const contentType = response.headers.get("content-type") || "";
      let data = null;

      if (contentType.includes("application/json")) {
        data = responseText ? JSON.parse(responseText) : {};
      } else if (
        responseText.trim().startsWith("<!DOCTYPE") ||
        responseText.trim().startsWith("<html")
      ) {
        throw new Error(
          "The frontend received an HTML page instead of the API response. Restart both the client and server, then try again."
        );
      } else if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(responseText);
        }
      } else {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      const nextSession = {
        token: data.token,
        user: data.user,
      };

      setStoredSession(nextSession);
      setSession(nextSession);
      toast.success(data.message || `${panelCopy[activeTab].buttonText} successful`);
      goToRoleHome(data.user);
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Unable to reach the server. Start the backend on port 5000 and try again."
          : error.message || "Something went wrong";

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordRequest = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.forgot.email }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reset code");
      }

      toast.success(data.message);
      setForgotStep("reset");
    } catch (error) {
      toast.error(error.message || "Unable to send reset code");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();

    if (formData.forgot.password !== formData.forgot.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.forgot.email,
          otp: formData.forgot.otp,
          password: formData.forgot.password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password");
      }

      toast.success(data.message);
      setForgotStep("request");
      setActiveTab("login");
      setFormData((current) => ({
        ...current,
        login: {
          ...current.login,
          email: current.forgot.email,
        },
        forgot: initialState.forgot,
      }));
    } catch (error) {
      toast.error(error.message || "Unable to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    toast.success("Logged out successfully");
  };

  const isForgotPassword = activeTab === "forgot";
  const currentPanel = panelCopy[activeTab];

  return (
    <div className="auth-page auth-page-premium">
      <div className="auth-ambient auth-ambient-one" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-two" aria-hidden="true" />

      <div className="auth-shell auth-shell-premium">
        <motion.div
          className="auth-hero auth-hero-premium"
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="auth-badge">{currentPanel.badge}</span>
          <h1>{currentPanel.title}</h1>
          <p>{currentPanel.subtitle}</p>

          <div className="auth-stats-grid">
            {authStats.map((item) => (
              <div key={item.label} className="auth-stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="auth-highlights auth-highlights-premium">
            {authHighlights.map((item, index) => (
              <motion.div
                key={item.title}
                className="auth-highlight-card auth-highlight-card-premium"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 * index }}
                whileHover={{ y: -8, rotateX: 4, rotateY: -4 }}
              >
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="auth-card auth-card-premium"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          {session ? (
            <div className="auth-session-card auth-session-card-premium">
              <h3>You are signed in</h3>
              <p>
                <strong>{session.user.name}</strong>
              </p>
              <p>{session.user.email}</p>
              <p>Role: {session.user.role}</p>
              {session.user.organizationName ? (
                <p>Organization: {session.user.organizationName}</p>
              ) : null}
              {session.user.role === "Volunteer" ? (
                <>
                  <p>Skills: {(session.user.skills || []).join(", ") || "Not added yet"}</p>
                  <p>
                    Points: {session.user.points || 0} · Completed: {session.user.tasksCompleted || 0}
                  </p>
                  <p>Badges: {(session.user.badges || []).join(", ") || "No badges yet"}</p>
                </>
              ) : null}
              <div className="auth-session-actions">
                <button type="button" className="auth-submit" onClick={() => goToRoleHome(session.user)}>
                  Open dashboard
                </button>
                <button type="button" className="auth-secondary-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-tabs auth-tabs-premium">
                <button
                  type="button"
                  className={activeTab === "login" ? "active" : ""}
                  onClick={() => setActiveTab("login")}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={activeTab === "register" ? "active" : ""}
                  onClick={() => setActiveTab("register")}
                >
                  Register
                </button>
                <button
                  type="button"
                  className={activeTab === "forgot" ? "active" : ""}
                  onClick={() => setActiveTab("forgot")}
                >
                  Forgot Password
                </button>
              </div>

              {activeTab === "login" ? (
                <form className="auth-form auth-form-premium" onSubmit={handleAuthSubmit}>
                  <div className="auth-form-grid">
                    <label>
                      Email address
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.login.email}
                        onChange={(event) => handleChange("login", "email", event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="password"
                        placeholder="Enter your password"
                        value={formData.login.password}
                        onChange={(event) => handleChange("login", "password", event.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <div className="auth-inline-links">
                    <button type="button" className="auth-text-link" onClick={() => setActiveTab("forgot")}>
                      Forgot password?
                    </button>
                  </div>

                  <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting ? "Please wait..." : panelCopy.login.buttonText}
                  </button>
                </form>
              ) : null}

              {activeTab === "register" ? (
                <form className="auth-form auth-form-premium" onSubmit={handleAuthSubmit}>
                  <div className="auth-form-grid auth-form-grid-two">
                    <label>
                      Full name
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={formData.register.name}
                        onChange={(event) => handleChange("register", "name", event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Email address
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.register.email}
                        onChange={(event) => handleChange("register", "email", event.target.value)}
                        required
                      />
                    </label>

                    <label>
                      Password
                      <input
                        type="password"
                        placeholder="Create a password"
                        value={formData.register.password}
                        onChange={(event) => handleChange("register", "password", event.target.value)}
                        minLength={6}
                        required
                      />
                    </label>

                    <label>
                      Join as
                      <select
                        value={formData.register.role}
                        onChange={(event) => handleChange("register", "role", event.target.value)}
                      >
                        <option value="Volunteer">Volunteer</option>
                        <option value="NGO">NGO / Organizer</option>
                      </select>
                    </label>

                    <label>
                      Organization name
                      <input
                        type="text"
                        placeholder="Seva foundation, local NGO, mutual aid group"
                        value={formData.register.organizationName}
                        onChange={(event) =>
                          handleChange("register", "organizationName", event.target.value)
                        }
                      />
                    </label>

                    <label>
                      City or base location
                      <input
                        type="text"
                        placeholder="Mumbai, Delhi, Pune..."
                        value={formData.register.location}
                        onChange={(event) => handleChange("register", "location", event.target.value)}
                      />
                    </label>
                  </div>

                  {formData.register.role === "Volunteer" ? (
                    <>
                      <label>
                        Volunteer skills
                        <textarea
                          className="auth-skills-input"
                          placeholder="Example: medical, teaching, logistics"
                          value={formData.register.skills}
                          onChange={(event) => handleChange("register", "skills", event.target.value)}
                          required
                        ></textarea>
                      </label>

                      <div className="auth-form-grid auth-form-grid-two">
                        <label>
                          Availability
                          <select
                            value={formData.register.availabilityScore}
                            onChange={(event) =>
                              handleChange("register", "availabilityScore", event.target.value)
                            }
                          >
                            <option value="0.35">Occasional</option>
                            <option value="0.65">Moderate</option>
                            <option value="0.95">Highly available</option>
                          </select>
                        </label>

                        <label>
                          Latitude
                          <input
                            type="number"
                            step="any"
                            placeholder="19.0760"
                            value={formData.register.latitude}
                            onChange={(event) =>
                              handleChange("register", "latitude", event.target.value)
                            }
                          />
                        </label>

                        <label>
                          Longitude
                          <input
                            type="number"
                            step="any"
                            placeholder="72.8777"
                            value={formData.register.longitude}
                            onChange={(event) =>
                              handleChange("register", "longitude", event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </>
                  ) : null}

                  <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting ? "Please wait..." : panelCopy.register.buttonText}
                  </button>
                </form>
              ) : null}

              {isForgotPassword ? (
                forgotStep === "request" ? (
                  <form className="auth-form auth-form-premium" onSubmit={handleForgotPasswordRequest}>
                    <label>
                      Email address
                      <input
                        type="email"
                        placeholder="Enter the email linked to your account"
                        value={formData.forgot.email}
                        onChange={(event) => handleChange("forgot", "email", event.target.value)}
                        required
                      />
                    </label>

                    <button type="submit" className="auth-submit" disabled={submitting}>
                      {submitting ? "Sending code..." : "Send OTP"}
                    </button>
                  </form>
                ) : (
                  <form className="auth-form auth-form-premium" onSubmit={handlePasswordReset}>
                    <div className="auth-form-grid">
                      <label>
                        Email address
                        <input
                          type="email"
                          placeholder="Enter the email linked to your account"
                          value={formData.forgot.email}
                          onChange={(event) => handleChange("forgot", "email", event.target.value)}
                          required
                        />
                      </label>

                      <label>
                        OTP code
                        <input
                          type="text"
                          placeholder="Enter the 6-digit code"
                          value={formData.forgot.otp}
                          onChange={(event) => handleChange("forgot", "otp", event.target.value)}
                          required
                        />
                      </label>

                      <label>
                        New password
                        <input
                          type="password"
                          placeholder="Create a new password"
                          value={formData.forgot.password}
                          onChange={(event) => handleChange("forgot", "password", event.target.value)}
                          minLength={6}
                          required
                        />
                      </label>

                      <label>
                        Confirm password
                        <input
                          type="password"
                          placeholder="Re-enter the new password"
                          value={formData.forgot.confirmPassword}
                          onChange={(event) =>
                            handleChange("forgot", "confirmPassword", event.target.value)
                          }
                          minLength={6}
                          required
                        />
                      </label>
                    </div>

                    <div className="auth-inline-links">
                      <button type="button" className="auth-text-link" onClick={() => setForgotStep("request")}>
                        Send a fresh code
                      </button>
                    </div>

                    <button type="submit" className="auth-submit" disabled={submitting}>
                      {submitting ? "Resetting..." : "Create new password"}
                    </button>
                  </form>
                )
              ) : null}
            </>
          )}

          <p className="auth-footnote">
            SevaLink supports smarter matching, volunteer recognition, and recovery tools that are easier to use under pressure.
          </p>

          <Link to="/" className="auth-back-link">
            Back to homepage
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default Auth;
