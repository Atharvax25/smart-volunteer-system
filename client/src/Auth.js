import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./App.css";

const API_BASE_URL = "http://localhost:5000/api";
const STORAGE_KEY = "sevalink-auth";

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
    skills: "",
  },
};

function Auth() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("login");
  const [formData, setFormData] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

  const content = useMemo(
    () => ({
      login: {
        badge: "Welcome back",
        title: "Log in to continue your impact journey",
        subtitle:
          "Volunteers can apply for matching tasks while admins can report, match, and assign work.",
        buttonText: "Login",
        endpoint: "login",
      },
      register: {
        badge: "Join SevaLink",
        title: "Create your account and start contributing",
        subtitle:
          "Volunteer skills are now captured during registration so future task matching can work accurately.",
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      const nextSession = {
        token: data.token,
        user: data.user,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      toast.success(data.message || `${content[activeTab].buttonText} successful`);
      goToRoleHome(data.user);
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
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
              <strong>Volunteer-ready matching</strong>
              <span>Store volunteer skills once and reuse them for task recommendations and assignments.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Admin review flow</strong>
              <span>Volunteers can apply first, and admins still control the final assignment decision.</span>
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
              {session.user.role === "Volunteer" ? (
                <p>Skills: {(session.user.skills || []).join(", ") || "Not added yet"}</p>
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

                  {formData.register.role === "Volunteer" ? (
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
                  ) : null}

                  <button type="submit" className="auth-submit" disabled={submitting}>
                    {submitting ? "Please wait..." : content.register.buttonText}
                  </button>
                </form>
              )}
            </>
          )}

          <p className="auth-footnote">
            Volunteers now register with skills, and those skills feed the admin matching flow for open tasks.
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
