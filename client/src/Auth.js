import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    skills: "",
    availabilityScore: "0.75",
    latitude: "",
    longitude: "",
  },
};

function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (storedSession) {
      setSession(storedSession);
    }
  }, []);

  const content = useMemo(
    () => ({
      login: {
        badge: "Welcome back",
        title: "Log in to continue your impact journey",
        subtitle:
          "Volunteers can apply for matching tasks while NGOs can report, predict, match, assign, and track impact in one flow.",
        buttonText: "Login",
        endpoint: "login",
      },
      register: {
        badge: "Join SevaLink",
        title: "Create your account and start contributing",
        subtitle:
          "Profiles now capture availability, geo-coordinates, organization details, and volunteer skills for smarter matching and multi-NGO coordination.",
        buttonText: "Register",
        endpoint: "register",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = formData[activeTab];

    try {
      const response = await fetch(`${API_BASE_URL}/auth/${content[activeTab].endpoint}`, {
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
      } else if (responseText.trim().startsWith("<!DOCTYPE") || responseText.trim().startsWith("<html")) {
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
      toast.success(data.message || `${content[activeTab].buttonText} successful`);
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

  const handleLogout = () => {
    clearStoredSession();
    setSession(null);
    toast.success("Logged out successfully");
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <span className="auth-badge">{content[activeTab].badge}</span>
          <h1>{content[activeTab].title}</h1>
          <p>{content[activeTab].subtitle}</p>

          <div className="auth-highlights">
            <div className="auth-highlight-card">
              <strong>Geo-aware matching</strong>
              <span>Volunteer availability, performance, skills, and distance all feed into smarter assignments.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Multi-NGO readiness</strong>
              <span>Organizations can publish visible tasks while still keeping their own admin dashboard scoped and clean.</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          {session ? (
            <div className="auth-session-card">
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
                <button
                  type="button"
                  className="auth-submit"
                  onClick={() => goToRoleHome(session.user)}
                >
                  Open dashboard
                </button>
                <button type="button" className="auth-secondary-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-tabs">
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
              </div>

              {activeTab === "login" ? (
                <form className="auth-form" onSubmit={handleSubmit}>
                  <label>
                    Email Address
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

                  <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting ? "Please wait..." : content.login.buttonText}
                  </button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={handleSubmit}>
                  <label>
                    Full Name
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={formData.register.name}
                      onChange={(event) => handleChange("register", "name", event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Email Address
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
                    Join As
                    <select
                      value={formData.register.role}
                      onChange={(event) => handleChange("register", "role", event.target.value)}
                    >
                      <option value="Volunteer">Volunteer</option>
                      <option value="NGO">NGO / Organizer</option>
                    </select>
                  </label>

                  <label>
                    Organization Name
                    <input
                      type="text"
                      placeholder="Seva foundation, local NGO, mutual aid group..."
                      value={formData.register.organizationName}
                      onChange={(event) =>
                        handleChange("register", "organizationName", event.target.value)
                      }
                    />
                  </label>

                  {formData.register.role === "Volunteer" ? (
                    <>
                      <label>
                        Volunteer Skills
                        <textarea
                          className="auth-skills-input"
                          placeholder="Example: medical, teaching, logistics"
                          value={formData.register.skills}
                          onChange={(event) => handleChange("register", "skills", event.target.value)}
                          required
                        ></textarea>
                      </label>

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

                      <div className="auth-coordinates-grid">
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
                    {submitting ? "Please wait..." : content.register.buttonText}
                  </button>
                </form>
              )}
            </>
          )}

          <p className="auth-footnote">
            SevaLink now supports smarter matching, leaderboard points, need prediction, and multi-NGO task visibility.
          </p>

          <Link to="/" className="auth-back-link">
            Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Auth;
