import "./App.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const API_BASE_URL = "http://localhost:5000/api";
const STORAGE_KEY = "sevalink-auth";

function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [skills, setSkills] = useState("");
  const [openTasks, setOpenTasks] = useState([]);
  const [pendingConfirmationTasks, setPendingConfirmationTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [actionTaskId, setActionTaskId] = useState("");

  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
  }, []);

  useEffect(() => {
    if (session === null) {
      fetchPublicTasks();
      return;
    }

    if (session.user.role === "Volunteer") {
      fetchVolunteerDashboard(session.token);
      return;
    }

    fetchPublicTasks();
  }, [session]);

  const openCountLabel = useMemo(() => {
    if (loading) {
      return "Loading open tasks...";
    }

    return `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} right now`;
  }, [loading, openTasks.length]);

  const fetchPublicTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks?status=open`);
      const data = await response.json();
      setOpenTasks(Array.isArray(data) ? data : []);
      setPendingConfirmationTasks([]);
      setAssignedTasks([]);
      setCompletedTasks([]);
    } catch (error) {
      toast.error("Unable to load current tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchVolunteerDashboard = async (token) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/volunteer/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load volunteer dashboard");
      }

      setOpenTasks(data.openTasks || []);
      setPendingConfirmationTasks(data.pendingConfirmationTasks || []);
      setAssignedTasks(data.assignedTasks || []);
      setCompletedTasks(data.completedTasks || []);
    } catch (error) {
      toast.error(error.message || "Unable to load volunteer dashboard");
    } finally {
      setLoading(false);
    }
  };

  const refreshCurrentView = async () => {
    if (session?.user.role === "Volunteer") {
      await fetchVolunteerDashboard(session.token);
    } else {
      await fetchPublicTasks();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setSeverity("medium");
    setSkills("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!session?.token || session.user.role !== "NGO") {
      toast.info("Only admin or NGO accounts can create new tasks");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          title,
          description,
          location,
          severity,
          skills,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to create task");
      }

      resetForm();
      await fetchPublicTasks();
      toast.success("Task submitted successfully");
    } catch (error) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVolunteerAction = async (taskId, endpoint, method, successMessage) => {
    if (!session?.token) {
      toast.error("Please login first");
      return;
    }

    setActionTaskId(taskId);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Action failed");
      }

      toast.success(successMessage || data.message);
      await refreshCurrentView();
    } catch (error) {
      toast.error(error.message || "Action failed");
    } finally {
      setActionTaskId("");
    }
  };

  const renderTaskList = (tasks, emptyMessage, options = {}) => {
    if (tasks.length === 0) {
      return <p className="task-empty">{emptyMessage}</p>;
    }

    return (
      <div className="task-list">
        {tasks.map((task) => (
          <div key={task._id} className="task-item">
            <div className="task-item-top">
              <h3>{task.title}</h3>
              <span className={`task-severity severity-${task.severity}`}>
                {task.severity}
              </span>
            </div>
            <p>{task.description}</p>
            <div className="task-meta-row">
              <span>{task.location}</span>
              <span>Reporter: {task.reporterName}</span>
            </div>
            {task.skills?.length ? (
              <p className="task-skills">Skills needed: {task.skills.join(", ")}</p>
            ) : null}
            {task.currentUserApplicationStatus ? (
              <p className={`task-application-status status-${task.currentUserApplicationStatus}`}>
                Application: {task.currentUserApplicationStatus}
              </p>
            ) : null}
            {task.assignedVolunteer?.volunteerName ? (
              <p className="task-assigned-note">
                Assigned volunteer: {task.assignedVolunteer.volunteerName}
              </p>
            ) : null}
            {options.showApply && !task.hasApplied ? (
              <button
                type="button"
                className="task-action-btn"
                disabled={actionTaskId === task._id}
                onClick={() =>
                  handleVolunteerAction(task._id, "apply", "POST", "Application sent to admin")
                }
              >
                {actionTaskId === task._id ? "Sending..." : "Apply for Task"}
              </button>
            ) : null}
            {options.showConfirm ? (
              <button
                type="button"
                className="task-action-btn"
                disabled={actionTaskId === task._id}
                onClick={() =>
                  handleVolunteerAction(task._id, "confirm", "PATCH", "Task assignment confirmed")
                }
              >
                {actionTaskId === task._id ? "Confirming..." : "Confirm Assignment"}
              </button>
            ) : null}
            {options.showComplete ? (
              <button
                type="button"
                className="task-action-btn task-complete-btn"
                disabled={actionTaskId === task._id}
                onClick={() =>
                  handleVolunteerAction(task._id, "complete", "PATCH", "Task marked as completed")
                }
              >
                {actionTaskId === task._id ? "Updating..." : "Mark Completed"}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const isVolunteer = session?.user.role === "Volunteer";
  const isAdmin = session?.user.role === "NGO";

  return (
    <div className="task-page">
      <div className="task-layout">
        <div className="task-card task-form-card">
          <div className="task-header-block">
            <span className="task-badge">{isVolunteer ? "Volunteer Workspace" : "Task Reporting"}</span>
            <h2>
              {isVolunteer ? "Volunteer dashboard" : "Report a new community issue"}
            </h2>
            <p className="task-desc">
              {isVolunteer
                ? "Browse open tasks, apply for them, confirm admin assignments, and track your assigned and completed work."
                : "Admin and NGO users can create tasks here, then use the admin dashboard to run skill matching and assign volunteers."}
            </p>
          </div>

          {session?.user ? (
            <p className="task-session-note">
              Signed in as <strong>{session.user.name}</strong> ({session.user.role})
              {isVolunteer && session.user.skills?.length
                ? ` - Skills: ${session.user.skills.join(", ")}`
                : ""}
            </p>
          ) : (
            <p className="task-session-note">
              You can view open tasks now. <Link to="/auth">Login or register</Link> to take action.
            </p>
          )}

          {isAdmin ? (
            <>
              <form className="task-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Task Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />

                <textarea
                  placeholder="Describe the problem and what help is needed"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  required
                ></textarea>

                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="Skills Required (comma separated)"
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                />

                <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                  <option value="low">Low urgency</option>
                  <option value="medium">Medium urgency</option>
                  <option value="high">High urgency</option>
                </select>

                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Task"}
                </button>
              </form>

              <Link to="/admin" className="task-admin-link">
                Open admin dashboard for matching and assignment
              </Link>
            </>
          ) : isVolunteer ? (
            <div className="volunteer-summary-grid">
              <div className="task-summary-card">
                <strong>{openTasks.length}</strong>
                <span>Open tasks</span>
              </div>
              <div className="task-summary-card">
                <strong>{pendingConfirmationTasks.length}</strong>
                <span>Waiting confirmation</span>
              </div>
              <div className="task-summary-card">
                <strong>{assignedTasks.length}</strong>
                <span>Assigned to you</span>
              </div>
              <div className="task-summary-card">
                <strong>{completedTasks.length}</strong>
                <span>Completed</span>
              </div>
            </div>
          ) : (
            <p className="task-empty">Login as a volunteer to apply or as an admin to create and assign tasks.</p>
          )}
        </div>

        <div className="task-card task-list-card">
          <div className="task-list-header">
            <div>
              <span className="task-badge task-badge-light">Open Tasks</span>
              <h2>{isVolunteer ? "Tasks available for you" : "Present unsolved tasks"}</h2>
            </div>
            <p className="task-count">{openCountLabel}</p>
          </div>

          {loading ? (
            <p className="task-empty">Loading tasks...</p>
          ) : (
            renderTaskList(
              openTasks,
              "No open tasks available right now.",
              { showApply: isVolunteer }
            )
          )}

          {isVolunteer ? (
            <div className="task-subsection">
              <h3>Admin assignment requests</h3>
              {renderTaskList(
                pendingConfirmationTasks,
                "No assignments are waiting for your confirmation.",
                { showConfirm: true }
              )}
            </div>
          ) : null}

          {isVolunteer ? (
            <div className="task-subsection">
              <h3>Your assigned tasks</h3>
              {renderTaskList(
                assignedTasks,
                "No tasks have been assigned to you yet.",
                { showComplete: true }
              )}
            </div>
          ) : null}

          {isVolunteer ? (
            <div className="task-subsection">
              <h3>Your completed tasks</h3>
              {renderTaskList(completedTasks, "No completed tasks yet.")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Tasks;
