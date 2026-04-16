import "./App.css";
import adminBg from "./assets/admin-bg.png";
import { Bar } from "react-chartjs-2";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "./Loader";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title);

const API_BASE_URL = "http://localhost:5000/api";
const STORAGE_KEY = "sevalink-auth";

function Admin() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState({
    openTasks: [],
    pendingConfirmationTasks: [],
    assignedTasks: [],
    completedTasks: [],
    volunteers: [],
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [actionKey, setActionKey] = useState("");

  const fetchDashboard = useCallback(async (token = session?.token) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load admin dashboard");
      }

      setDashboard({
        openTasks: data.openTasks || [],
        pendingConfirmationTasks: data.pendingConfirmationTasks || [],
        assignedTasks: data.assignedTasks || [],
        completedTasks: data.completedTasks || [],
        volunteers: data.volunteers || [],
      });
    } catch (error) {
      toast.error(error.message || "Unable to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY);
    if (!storedSession) {
      setLoading(false);
      return;
    }

    const parsedSession = JSON.parse(storedSession);
    setSession(parsedSession);

    if (parsedSession.user.role === "NGO") {
      fetchDashboard(parsedSession.token);
    } else {
      setLoading(false);
    }
  }, [fetchDashboard]);

  const handleAdminAction = async (taskId, urlSuffix, method, body, successMessage, actionId) => {
    if (!session?.token) {
      return;
    }

    const nextActionKey = actionId || `${taskId}-${urlSuffix}`;
    setActionKey(nextActionKey);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/${urlSuffix}`, {
        method,
        headers: {
          Authorization: `Bearer ${session.token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Action failed");
      }

      toast.success(successMessage || data.message);
      await fetchDashboard();
    } catch (error) {
      toast.error(error.message || "Action failed");
    } finally {
      setActionKey("");
    }
  };

  const filteredOpenTasks = useMemo(
    () =>
      dashboard.openTasks
        .filter((task) => task.title?.toLowerCase().includes(search.toLowerCase()))
        .filter((task) => (filter === "" ? true : task.severity === filter)),
    [dashboard.openTasks, filter, search]
  );

  const severityCounts = useMemo(
    () =>
      dashboard.openTasks.reduce(
        (counts, task) => {
          counts[task.severity] = (counts[task.severity] || 0) + 1;
          return counts;
        },
        { low: 0, medium: 0, high: 0 }
      ),
    [dashboard.openTasks]
  );

  const chartData = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        label: "Open Tasks by Severity",
        data: [severityCounts.low, severityCounts.medium, severityCounts.high],
        backgroundColor: ["#4caf50", "#ff9800", "#f44336"],
        borderRadius: 8,
      },
    ],
  };

  if (loading) return <Loader />;

  if (!session) {
    return (
      <div className="admin-empty-state">
        <h2>Admin login required</h2>
        <p>Please <Link to="/auth">login</Link> with an NGO account to manage assignments.</p>
      </div>
    );
  }

  if (session.user.role !== "NGO") {
    return (
      <div className="admin-empty-state">
        <h2>Admin access only</h2>
        <p>This page is reserved for NGO or admin accounts.</p>
      </div>
    );
  }

  return (
    <div
      className="admin-container"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${adminBg})`,
      }}
    >
      <h2 className="admin-title">Admin Dashboard</h2>

      <div className="admin-section">
        <h3>Task Overview</h3>
        <div className="chart-container">
          <Bar data={chartData} />
        </div>
      </div>

      <div className="admin-summary-grid">
        <div className="admin-summary-card">
          <strong>{dashboard.openTasks.length}</strong>
          <span>Open tasks</span>
        </div>
        <div className="admin-summary-card">
          <strong>{dashboard.pendingConfirmationTasks.length}</strong>
          <span>Waiting confirmation</span>
        </div>
        <div className="admin-summary-card">
          <strong>{dashboard.assignedTasks.length}</strong>
          <span>Assigned tasks</span>
        </div>
        <div className="admin-summary-card">
          <strong>{dashboard.completedTasks.length}</strong>
          <span>Completed tasks</span>
        </div>
      </div>

      <div className="admin-controls">
        <input
          type="text"
          placeholder="Search tasks..."
          onChange={(event) => setSearch(event.target.value)}
        />

        <select onChange={(event) => setFilter(event.target.value)}>
          <option value="">All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="admin-section">
        <h3>Open Tasks</h3>

        {filteredOpenTasks.length === 0 ? (
          <p className="admin-empty-copy">No open tasks match the current filter.</p>
        ) : (
          filteredOpenTasks.map((task) => (
            <div key={task._id} className="list-card admin-task-card">
              <strong>
                {task.title} - {task.location} ({task.severity})
              </strong>
              <p>{task.description}</p>
              <p>Reported by: {task.reporterName}</p>
              <p>Required skills: {task.skills?.length ? task.skills.join(", ") : "No specific skills"}</p>

              <div className="admin-inline-actions">
                <button
                  type="button"
                  className="task-action-btn"
                  disabled={actionKey === `${task._id}-run-matching`}
                  onClick={() =>
                    handleAdminAction(
                      task._id,
                      "run-matching",
                      "POST",
                      null,
                      "Skill matching completed",
                      `${task._id}-run-matching`
                    )
                  }
                >
                  {actionKey === `${task._id}-run-matching` ? "Matching..." : "Run Skill Match"}
                </button>
              </div>

              <div className="admin-match-grid">
                <div>
                  <h4>Volunteer Applications</h4>
                  {task.applications?.length ? (
                    task.applications.map((application) => (
                      <div key={`${task._id}-${application.volunteer}`} className="admin-mini-card">
                        <strong>{application.volunteerName}</strong>
                        <p>{application.volunteerEmail}</p>
                        <p>Skills: {application.volunteerSkills?.join(", ") || "None listed"}</p>
                        <p>Status: {application.status}</p>
                        <button
                          type="button"
                          className="task-action-btn"
                          disabled={actionKey === `${task._id}-assign-${application.volunteer}`}
                          onClick={() =>
                            handleAdminAction(
                              task._id,
                              "assign",
                              "PATCH",
                              { volunteerId: application.volunteer },
                              `Assignment sent to ${application.volunteerName}`,
                              `${task._id}-assign-${application.volunteer}`
                            )
                          }
                        >
                          {actionKey === `${task._id}-assign-${application.volunteer}`
                            ? "Assigning..."
                            : "Assign Applicant"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty-copy">No volunteer applications yet.</p>
                  )}
                </div>

                <div>
                  <h4>Matched Volunteers</h4>
                  {task.matchedVolunteers?.length ? (
                    task.matchedVolunteers.map((volunteer) => (
                      <div key={`${task._id}-match-${volunteer.volunteer}`} className="admin-mini-card">
                        <strong>{volunteer.volunteerName}</strong>
                        <p>{volunteer.volunteerEmail}</p>
                        <p>Skills: {volunteer.volunteerSkills?.join(", ") || "None listed"}</p>
                        <p>
                          Match score: {volunteer.matchScore}
                          {volunteer.matchedSkills?.length
                            ? ` (${volunteer.matchedSkills.join(", ")})`
                            : ""
                          }
                        </p>
                        <button
                          type="button"
                          className="task-action-btn"
                          disabled={actionKey === `${task._id}-assign-${volunteer.volunteer}`}
                          onClick={() =>
                            handleAdminAction(
                              task._id,
                              "assign",
                              "PATCH",
                              { volunteerId: volunteer.volunteer },
                              `Assignment sent to ${volunteer.volunteerName}`,
                              `${task._id}-assign-${volunteer.volunteer}`
                            )
                          }
                        >
                          {actionKey === `${task._id}-assign-${volunteer.volunteer}`
                            ? "Assigning..."
                            : "Assign Volunteer"}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="admin-empty-copy">Run the matching tool to see suggested volunteers.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="admin-section">
        <h3>Waiting for Volunteer Confirmation</h3>
        {dashboard.pendingConfirmationTasks.length ? (
          dashboard.pendingConfirmationTasks.map((task) => (
            <div key={task._id} className="list-card">
              <strong>{task.title}</strong>
              <p>Assigned volunteer: {task.assignedVolunteer?.volunteerName}</p>
              <p>Waiting for the volunteer to confirm this assignment.</p>
            </div>
          ))
        ) : (
          <p className="admin-empty-copy">No tasks are waiting for volunteer confirmation.</p>
        )}
      </div>

      <div className="admin-section">
        <h3>Assigned Tasks</h3>
        {dashboard.assignedTasks.length ? (
          dashboard.assignedTasks.map((task) => (
            <div key={task._id} className="list-card">
              <strong>{task.title}</strong>
              <p>Assigned volunteer: {task.assignedVolunteer?.volunteerName}</p>
              <p>{task.description}</p>
              <button
                type="button"
                className="task-action-btn task-complete-btn"
                disabled={actionKey === `${task._id}-complete`}
                onClick={() =>
                  handleAdminAction(
                    task._id,
                    "complete",
                    "PATCH",
                    null,
                    "Task marked as completed",
                    `${task._id}-complete`
                  )
                }
              >
                {actionKey === `${task._id}-complete` ? "Updating..." : "Mark Completed"}
              </button>
            </div>
          ))
        ) : (
          <p className="admin-empty-copy">No active assigned tasks right now.</p>
        )}
      </div>

      <div className="admin-section">
        <h3>Completed Tasks</h3>
        {dashboard.completedTasks.length ? (
          dashboard.completedTasks.map((task) => (
            <div key={task._id} className="list-card">
              <strong>{task.title}</strong>
              <p>Completed by: {task.assignedVolunteer?.volunteerName || "Unknown volunteer"}</p>
            </div>
          ))
        ) : (
          <p className="admin-empty-copy">No completed tasks yet.</p>
        )}
      </div>

      <div className="admin-section">
        <h3>Volunteer Directory</h3>
        <div className="admin-match-grid">
          {dashboard.volunteers.map((volunteer) => (
            <div key={volunteer._id} className="admin-mini-card">
              <strong>{volunteer.name}</strong>
              <p>{volunteer.email}</p>
              <p>Skills: {volunteer.skills?.join(", ") || "None listed"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Admin;
