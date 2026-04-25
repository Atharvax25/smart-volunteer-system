import "./App.css";
import { Bar, Doughnut } from "react-chartjs-2";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "framer-motion";
import Loader from "./Loader";
import LeaderboardPanel from "./components/LeaderboardPanel";
import PredictionBanner from "./components/PredictionBanner";
import TaskHeatmap from "./components/TaskHeatmap";
import { API_BASE_URL, getAssetUrl, getStoredSession } from "./utils/sevalink";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  Title,
  Tooltip
);

const sectionReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function formatAvailability(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return "Distance unknown";
  }

  return `${distanceKm} km away`;
}

function AnimatedPercent({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let animationFrameId = 0;
    const startTime = performance.now();
    const duration = 650;

    const animate = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(animate);
      }
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{displayValue}%</>;
}

function Admin() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [dashboard, setDashboard] = useState({
    openTasks: [],
    pendingConfirmationTasks: [],
    assignedTasks: [],
    completedTasks: [],
    volunteers: [],
    sharedTasks: [],
    leaderboard: [],
    heatmapPoints: [],
    severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
    categoryBreakdown: {},
    predictions: [],
    recentNotifications: [],
  });
  const [predictionReport, setPredictionReport] = useState({ predictions: [] });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [selectedVolunteerByTask, setSelectedVolunteerByTask] = useState({});
  const [matchModal, setMatchModal] = useState({
    open: false,
    task: null,
    matches: [],
    bestMatch: null,
  });
  const [matchLoadingTaskId, setMatchLoadingTaskId] = useState("");

  const fetchDashboard = useCallback(
    async (token = session?.token) => {
      setLoading(true);

      try {
        const [dashboardResponse, predictionResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/tasks/admin/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/analytics/predict-needs`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const dashboardData = await dashboardResponse.json();
        const predictionData = await predictionResponse.json();

        if (!dashboardResponse.ok) {
          throw new Error(dashboardData.message || "Unable to load admin dashboard");
        }

        setDashboard({
          openTasks: dashboardData.openTasks || [],
          pendingConfirmationTasks: dashboardData.pendingConfirmationTasks || [],
          assignedTasks: dashboardData.assignedTasks || [],
          completedTasks: dashboardData.completedTasks || [],
          volunteers: dashboardData.volunteers || [],
          sharedTasks: dashboardData.sharedTasks || [],
          leaderboard: dashboardData.leaderboard || [],
          heatmapPoints: dashboardData.heatmapPoints || [],
          severityBreakdown:
            dashboardData.severityBreakdown || { low: 0, medium: 0, high: 0, critical: 0 },
          categoryBreakdown: dashboardData.categoryBreakdown || {},
          predictions: dashboardData.predictions || [],
          recentNotifications: dashboardData.recentNotifications || [],
        });

        if (predictionResponse.ok) {
          setPredictionReport(predictionData);
        } else {
          setPredictionReport({ predictions: dashboardData.predictions || [] });
        }
      } catch (error) {
        toast.error(error.message || "Unable to load admin dashboard");
      } finally {
        setLoading(false);
      }
    },
    [session?.token]
  );

  useEffect(() => {
    const storedSession = getStoredSession();
    if (!storedSession) {
      setLoading(false);
      return;
    }

    setSession(storedSession);

    if (storedSession.user.role === "NGO") {
      fetchDashboard(storedSession.token);
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
        .filter((task) =>
          [task.title, task.description, task.category, task.location]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        )
        .filter((task) => (filter === "" ? true : task.severity === filter)),
    [dashboard.openTasks, filter, search]
  );

  const ownedTaskCount =
    dashboard.openTasks.length +
    dashboard.pendingConfirmationTasks.length +
    dashboard.assignedTasks.length +
    dashboard.completedTasks.length;

  const volunteerStats = useMemo(() => {
    const total = dashboard.volunteers.length;
    const availableVolunteers = dashboard.volunteers.filter(
      (volunteer) => volunteer.availability !== false
    ).length;
    const averageAvailability =
      total > 0
        ? dashboard.volunteers.reduce(
            (sum, volunteer) => sum + (volunteer.availabilityScore || 0),
            0
          ) / total
        : 0;
    const totalPoints = dashboard.volunteers.reduce(
      (sum, volunteer) => sum + (volunteer.points || 0),
      0
    );
    const totalTasksCompleted = dashboard.volunteers.reduce(
      (sum, volunteer) => sum + (volunteer.tasksCompleted || 0),
      0
    );

    return {
      total,
      availableVolunteers,
      averageAvailability,
      totalPoints,
      totalTasksCompleted,
    };
  }, [dashboard.volunteers]);

  const completionRate = ownedTaskCount
    ? Math.round((dashboard.completedTasks.length / ownedTaskCount) * 100)
    : 0;

  const highestPressureCategory = useMemo(() => {
    const entries = Object.entries(dashboard.categoryBreakdown || {});
    if (!entries.length) {
      return "General support";
    }

    return entries.sort((left, right) => right[1] - left[1])[0][0];
  }, [dashboard.categoryBreakdown]);

  const insightCards = [
    {
      label: "Total tasks",
      value: ownedTaskCount,
      detail: `${dashboard.openTasks.length} open and ${dashboard.assignedTasks.length} active`,
      accent: "teal",
    },
    {
      label: "High severity",
      value:
        (dashboard.severityBreakdown.high || 0) + (dashboard.severityBreakdown.critical || 0),
      detail: `${dashboard.severityBreakdown.critical || 0} critical tasks need fast response`,
      accent: "blue",
    },
    {
      label: "Available volunteers",
      value: volunteerStats.availableVolunteers,
      detail: `${dashboard.volunteers.length} total volunteers in the network`,
      accent: "gold",
    },
    {
      label: "Completion rate",
      value: `${completionRate}%`,
      detail: `${highestPressureCategory} is the busiest category`,
      accent: "rose",
    },
  ];

  const severityData = useMemo(
    () => ({
      labels: ["Low", "Medium", "High", "Critical"],
      datasets: [
        {
          label: "Task severity",
          data: [
            dashboard.severityBreakdown.low || 0,
            dashboard.severityBreakdown.medium || 0,
            dashboard.severityBreakdown.high || 0,
            dashboard.severityBreakdown.critical || 0,
          ],
          backgroundColor: ["#4ade80", "#facc15", "#fb923c", "#fb7185"],
          borderRadius: 14,
          borderSkipped: false,
        },
      ],
    }),
    [dashboard.severityBreakdown]
  );

  const categoryData = useMemo(() => {
    const labels = Object.keys(dashboard.categoryBreakdown || {});

    return {
      labels,
      datasets: [
        {
          label: "Task categories",
          data: labels.map((label) => dashboard.categoryBreakdown[label]),
          backgroundColor: [
            "#7dd3fc",
            "#67e8f9",
            "#5eead4",
            "#c4b5fd",
            "#f9a8d4",
            "#fcd34d",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [dashboard.categoryBreakdown]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#d8e8f6",
            font: {
              family: "Segoe UI",
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#b8c7d9" },
          grid: { color: "rgba(150, 180, 210, 0.08)" },
        },
        y: {
          ticks: { color: "#b8c7d9" },
          grid: { color: "rgba(150, 180, 210, 0.08)" },
        },
      },
    }),
    []
  );

  const operationsColumns = [
    {
      title: "Awaiting confirmation",
      subtitle: "Assignments sent to volunteers",
      items: dashboard.pendingConfirmationTasks,
      empty: "No tasks are waiting for volunteer confirmation.",
    },
    {
      title: "In progress",
      subtitle: "Tasks that are actively assigned",
      items: dashboard.assignedTasks,
      empty: "No active assigned tasks right now.",
    },
    {
      title: "Completed",
      subtitle: "Finished work across your network",
      items: dashboard.completedTasks,
      empty: "No completed tasks yet.",
    },
  ];

  const getSelectedVolunteerId = (task) => {
    if (selectedVolunteerByTask[task._id]) {
      return selectedVolunteerByTask[task._id];
    }

    if (task.matchedVolunteers?.length) {
      return task.matchedVolunteers[0].volunteer;
    }

    if (task.applications?.length) {
      return task.applications[0].volunteer;
    }

    return "";
  };

  const getVolunteerById = (volunteerId) =>
    dashboard.volunteers.find((volunteer) => String(volunteer._id) === String(volunteerId)) || null;

  const openMatchModal = async (task) => {
    if (!session?.token) {
      return;
    }

    setMatchLoadingTaskId(task._id);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/match/${task._id}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to fetch matches");
      }

      setMatchModal({
        open: true,
        task: data.task || task,
        matches: data.matches || [],
        bestMatch: data.bestMatch || null,
      });
    } catch (error) {
      toast.error(error.message || "Unable to fetch matches");
    } finally {
      setMatchLoadingTaskId("");
    }
  };

  const closeMatchModal = () => {
    setMatchModal({
      open: false,
      task: null,
      matches: [],
      bestMatch: null,
    });
  };

  const assignTaskToVolunteer = async (taskId, volunteer, score, successMessage, actionId) => {
    if (!session?.token) {
      return;
    }

    setActionKey(actionId);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/assign/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          volunteerId: volunteer._id || volunteer.volunteer,
          score,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to assign task");
      }

      toast.success(successMessage || data.message);
      closeMatchModal();
      await fetchDashboard();
    } catch (error) {
      toast.error(error.message || "Unable to assign task");
    } finally {
      setActionKey("");
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!session) {
    return (
      <div className="admin-empty-state">
        <h2>Admin login required</h2>
        <p>
          Please <Link to="/auth">login</Link> with an NGO account to manage predictions,
          heatmaps, and assignments.
        </p>
      </div>
    );
  }

  if (session.user.role !== "NGO") {
    return (
      <div className="admin-empty-state">
        <h2>Admin access only</h2>
        <p>This page is reserved for NGO or organizer accounts.</p>
      </div>
    );
  }

  return (
    <div className="admin-page-shell">
      <div className="admin-stage-glow admin-stage-glow-left" aria-hidden="true" />
      <div className="admin-stage-glow admin-stage-glow-right" aria-hidden="true" />
      <div className="admin-grid-noise" aria-hidden="true" />

      <motion.section
        className="admin-hero-surface"
        initial="hidden"
        animate="visible"
        variants={sectionReveal}
      >
        <div className="admin-hero-copy">
          <span className="task-badge">NGO Mission Control</span>
          <h1 className="admin-hero-title">A calmer, sharper dashboard for live response operations.</h1>
          <p className="admin-hero-subtitle">
            Track pressure areas, assign volunteers faster, and review task flow in a clean
            spatial layout built to stay readable under load.
          </p>

          <div className="admin-hero-meta">
            <div className="admin-meta-card">
              <span>Organization</span>
              <strong>{session.user.organizationName || session.user.name}</strong>
            </div>
            <div className="admin-meta-card">
              <span>Response focus</span>
              <strong>{highestPressureCategory}</strong>
            </div>
            <div className="admin-meta-card">
              <span>Volunteer points</span>
              <strong>{volunteerStats.totalPoints}</strong>
            </div>
          </div>
        </div>

        <div className="admin-hero-spotlight">
          <motion.div
            className="admin-command-orb"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="admin-command-card"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <span>Live command layer</span>
            <strong>{dashboard.openTasks.length + dashboard.assignedTasks.length}</strong>
            <p>tasks currently needing direct attention across your NGO workspace</p>
          </motion.div>
        </div>
      </motion.section>

      <div className="admin-kpi-grid">
        {insightCards.map((card, index) => (
          <motion.article
            key={card.label}
            className={`admin-kpi-card admin-kpi-${card.accent}`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            variants={sectionReveal}
            custom={index * 0.06}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </motion.article>
        ))}
      </div>

      <PredictionBanner predictions={predictionReport.predictions} />

      <div className="admin-main-grid">
        <motion.section
          className="admin-panel admin-panel-wide"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionReveal}
        >
          <div className="admin-panel-head">
            <div>
              <span className="admin-eyebrow">Operations</span>
              <h3>Task pressure overview</h3>
            </div>
            <p>See where urgency is building and which task categories are driving demand.</p>
          </div>

          <div className="admin-chart-grid">
            <div className="admin-chart-card">
              <h4>Severity mix</h4>
              <div className="chart-container">
                <Bar data={severityData} options={chartOptions} />
              </div>
            </div>

            <div className="admin-chart-card">
              <h4>Category spread</h4>
              <div className="chart-container chart-container-small">
                {categoryData.labels.length ? (
                  <Doughnut data={categoryData} options={chartOptions} />
                ) : (
                  <p className="admin-empty-copy">Category data will appear after tasks are created.</p>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          className="admin-panel admin-panel-stack"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionReveal}
          custom={0.08}
        >
          <div className="admin-panel-head">
            <div>
              <span className="admin-eyebrow">Workforce</span>
              <h3>Volunteer pulse</h3>
            </div>
          </div>

          <div className="admin-pulse-list">
            <div className="admin-pulse-item">
              <span>Total volunteers</span>
              <strong>{volunteerStats.total}</strong>
            </div>
            <div className="admin-pulse-item">
              <span>Average availability</span>
              <strong>{formatAvailability(volunteerStats.averageAvailability)}</strong>
            </div>
            <div className="admin-pulse-item">
              <span>Completed by volunteers</span>
              <strong>{volunteerStats.totalTasksCompleted}</strong>
            </div>
            <div className="admin-pulse-item">
              <span>Recent notifications</span>
              <strong>{dashboard.recentNotifications.length}</strong>
            </div>
          </div>

          <div className="admin-network-card">
            <span>Shared network visibility</span>
            <strong>{dashboard.sharedTasks.length} partner tasks visible</strong>
            <p>Keep an eye on neighboring NGO demand without leaving your own dashboard.</p>
          </div>
        </motion.section>
      </div>

      <TaskHeatmap points={dashboard.heatmapPoints} />

      <div className="admin-main-grid">
        <LeaderboardPanel leaderboard={dashboard.leaderboard} />

        <div className="admin-sidebar-stack">
          <motion.section
            className="admin-panel"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
            custom={0.1}
          >
            <div className="admin-panel-head">
              <div>
                <span className="admin-eyebrow">Signals</span>
                <h3>Recent notifications</h3>
              </div>
            </div>

            {dashboard.recentNotifications.length ? (
              <div className="admin-notification-stream">
                {dashboard.recentNotifications.map((notification) => (
                  <article key={notification._id} className="admin-notification-card">
                    <div>
                      <strong>{notification.subject}</strong>
                      <p>{notification.recipientEmail}</p>
                    </div>
                    <span className={`admin-status-pill admin-status-${notification.status}`}>
                      {notification.status}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty-copy">No notifications have been logged yet.</p>
            )}
          </motion.section>

          <motion.section
            className="admin-panel"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
            custom={0.14}
          >
            <div className="admin-panel-head">
              <div>
                <span className="admin-eyebrow">Network view</span>
                <h3>Shared NGO tasks</h3>
              </div>
            </div>

            {dashboard.sharedTasks.length ? (
              <div className="admin-simple-stack">
                {dashboard.sharedTasks.map((task) => (
                  <article key={task._id} className="admin-simple-card">
                    <div>
                      <strong>{task.title}</strong>
                      <p>
                        {task.location} | {task.category}
                      </p>
                    </div>
                    <span className={`task-severity severity-${task.severity}`}>{task.severity}</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty-copy">No shared tasks from partner NGOs right now.</p>
            )}
          </motion.section>
        </div>
      </div>

      <motion.section
        className="admin-panel"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
      >
        <div className="admin-panel-head admin-panel-head-inline">
          <div>
            <span className="admin-eyebrow">Action board</span>
            <h3>Open tasks ready for action</h3>
          </div>

          <div className="admin-controls admin-controls-modern">
            <input
              type="text"
              value={search}
              placeholder="Search tasks, descriptions, categories, or locations"
              onChange={(event) => setSearch(event.target.value)}
            />

            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {filteredOpenTasks.length ? (
          <div className="admin-task-grid">
            {filteredOpenTasks.map((task) => (
              <article key={task._id} className="admin-task-surface">
                <div className="admin-task-topline">
                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {task.location} | {task.category}
                    </p>
                  </div>
                  <span className={`task-severity severity-${task.severity}`}>{task.severity}</span>
                </div>

                <p className="admin-task-description">{task.description}</p>

                <div className="admin-task-chip-row">
                  <span className="admin-task-chip">Urgency {task.urgencyScore || 0}/100</span>
                  <span className="admin-task-chip">
                    {task.skills?.length ? task.skills.join(", ") : "No specific skills"}
                  </span>
                  {task.geoLocation?.lat !== null && task.geoLocation?.lng !== null ? (
                    <span className="admin-task-chip">
                      {task.geoLocation.lat}, {task.geoLocation.lng}
                    </span>
                  ) : null}
                </div>

                {task.imageUrl ? (
                  <img
                    src={getAssetUrl(task.imageUrl)}
                    alt={task.title}
                    className="task-image-preview"
                  />
                ) : null}

                {task.escalationReason ? (
                  <p className="task-escalation-note">{task.escalationReason}</p>
                ) : null}

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
                        "Smart matching completed",
                        `${task._id}-run-matching`
                      )
                    }
                  >
                    {actionKey === `${task._id}-run-matching` ? "Matching..." : "Run Smart Match"}
                  </button>

                  <button
                    type="button"
                    className="task-action-btn"
                    disabled={matchLoadingTaskId === task._id}
                    onClick={() => openMatchModal(task)}
                  >
                    {matchLoadingTaskId === task._id ? "Loading..." : "View Matches"}
                  </button>
                </div>

                {task.matchedVolunteers?.[0] ? (
                  <p className="admin-top-match-note">
                    Top match: {task.matchedVolunteers[0].volunteerName} (
                    {task.matchedVolunteers[0].matchScore}%)
                  </p>
                ) : null}

                <div className="admin-manual-assign-card">
                  <div className="admin-manual-assign-head">
                    <div>
                      <h4>Assign task manually</h4>
                      <p>Choose a volunteer and allocate this task directly.</p>
                    </div>
                  </div>

                  <div className="admin-manual-assign-controls">
                    <select
                      value={getSelectedVolunteerId(task)}
                      onChange={(event) =>
                        setSelectedVolunteerByTask((current) => ({
                          ...current,
                          [task._id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select volunteer</option>
                      {dashboard.volunteers.map((volunteer) => (
                        <option key={`${task._id}-${volunteer._id}`} value={volunteer._id}>
                          {volunteer.name} |{" "}
                          {volunteer.availability !== false ? "Available" : "Busy"} |{" "}
                          {(volunteer.skills || []).slice(0, 2).join(", ") || "No skills"}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="task-action-btn task-complete-btn"
                      disabled={
                        !getSelectedVolunteerId(task) ||
                        getVolunteerById(getSelectedVolunteerId(task))?.availability === false ||
                        actionKey === `${task._id}-assign-manual`
                      }
                      onClick={() =>
                        assignTaskToVolunteer(
                          task._id,
                          getVolunteerById(getSelectedVolunteerId(task)),
                          task.matchedVolunteers?.find(
                            (volunteer) =>
                              String(volunteer.volunteer) ===
                              String(getSelectedVolunteerId(task))
                          )?.matchScore || 0,
                          "Task assigned to selected volunteer",
                          `${task._id}-assign-manual`
                        )
                      }
                    >
                      {actionKey === `${task._id}-assign-manual`
                        ? "Assigning..."
                        : "Assign Task"}
                    </button>
                  </div>
                </div>

                <div className="admin-task-columns">
                  <div className="admin-subpanel">
                    <h4>Applications</h4>
                    {task.applications?.length ? (
                      task.applications.slice(0, 3).map((application) => (
                        <div
                          key={`${task._id}-${application.volunteer}`}
                          className="admin-mini-card"
                        >
                          <strong>{application.volunteerName}</strong>
                          <p>{application.volunteerEmail}</p>
                          <p>{application.volunteerSkills?.join(", ") || "None listed"}</p>
                          <button
                            type="button"
                            className="task-action-btn"
                            disabled={actionKey === `${task._id}-assign-${application.volunteer}`}
                            onClick={() =>
                              assignTaskToVolunteer(
                                task._id,
                                { _id: application.volunteer },
                                0,
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

                  <div className="admin-subpanel">
                    <h4>Recommended volunteers</h4>
                    {task.matchedVolunteers?.length ? (
                      task.matchedVolunteers.slice(0, 3).map((volunteer) => (
                        <div
                          key={`${task._id}-match-${volunteer.volunteer}`}
                          className="admin-mini-card"
                        >
                          <strong>{volunteer.volunteerName}</strong>
                          <p>{volunteer.volunteerEmail}</p>
                          <p>{volunteer.volunteerSkills?.join(", ") || "None listed"}</p>
                          <p>
                            Score {volunteer.matchScore} | {formatDistance(volunteer.distanceKm)}
                          </p>
                          <p>
                            {volunteer.availabilityLabel || (volunteer.availability ? "Available" : "Busy")}
                          </p>
                          <p>
                            Suggested by matching only. Admin must choose whether to assign.
                          </p>
                          <button
                            type="button"
                            className="task-action-btn"
                            disabled={
                              actionKey === `${task._id}-assign-${volunteer.volunteer}` ||
                              !volunteer.availability
                            }
                            onClick={() =>
                              assignTaskToVolunteer(
                                task._id,
                                volunteer,
                                volunteer.matchScore,
                                `Assignment sent to ${volunteer.volunteerName}`,
                                `${task._id}-assign-${volunteer.volunteer}`
                              )
                            }
                          >
                            {actionKey === `${task._id}-assign-${volunteer.volunteer}`
                              ? "Assigning..."
                              : volunteer.availability
                                ? "Assign Volunteer"
                                : "Busy"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="admin-empty-copy">
                        Run the smart matching tool to get ranked volunteer recommendations.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty-copy">No open tasks match the current filter.</p>
        )}
      </motion.section>

      <div className="admin-operations-grid">
        {operationsColumns.map((column, index) => (
          <motion.section
            key={column.title}
            className="admin-panel"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionReveal}
            custom={index * 0.06}
          >
            <div className="admin-panel-head">
              <div>
                <span className="admin-eyebrow">Pipeline</span>
                <h3>{column.title}</h3>
              </div>
              <p>{column.subtitle}</p>
            </div>

            {column.items.length ? (
              <div className="admin-simple-stack">
                {column.items.map((task) => (
                  <article key={task._id} className="admin-simple-card">
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.assignedVolunteer?.volunteerName || task.location}</p>
                    </div>
                    {column.title === "In progress" ? (
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
                    ) : (
                      <span className={`task-severity severity-${task.severity || "medium"}`}>
                        {task.status}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-empty-copy">{column.empty}</p>
            )}
          </motion.section>
        ))}
      </div>

      <motion.section
        className="admin-panel"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionReveal}
      >
        <div className="admin-panel-head">
          <div>
            <span className="admin-eyebrow">Volunteer directory</span>
            <h3>Ready-to-mobilize volunteer network</h3>
          </div>
        </div>

        <div className="admin-volunteer-grid">
          {dashboard.volunteers.map((volunteer) => (
            <article key={volunteer._id} className="admin-volunteer-card">
              <div className="admin-volunteer-topline">
                <strong>{volunteer.name}</strong>
                <span>{volunteer.availability !== false ? "Available" : "Busy"}</span>
              </div>
              <p>{volunteer.email}</p>
              <p>{volunteer.location || "Location not added"}</p>
              <p>{volunteer.skills?.join(", ") || "No skills listed"}</p>
              <div className="admin-volunteer-meta">
                <span>Points {volunteer.points || 0}</span>
                <span>Completed {volunteer.tasksCompleted || 0}</span>
                <span>Rating {volunteer.rating || 0}/5</span>
              </div>
              <div className="leaderboard-badges">
                {(volunteer.badges || []).length ? (
                  volunteer.badges.map((badge) => (
                    <span key={`${volunteer._id}-${badge}`} className="leaderboard-badge">
                      {badge}
                    </span>
                  ))
                ) : (
                  <span className="leaderboard-badge muted">Active helper</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </motion.section>

      <AnimatePresence>
        {matchModal.open ? (
          <motion.div
            className="admin-match-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMatchModal}
          >
            <motion.div
              className="admin-match-modal"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-match-modal-head">
                <div>
                  <span className="admin-eyebrow">Smart assignment</span>
                  <h3>{matchModal.task?.title}</h3>
                  <p>
                    Our system doesn’t just assign tasks — it calculates the best possible
                    match using multiple factors like skills, availability, and performance.
                  </p>
                </div>
                <button type="button" className="admin-modal-close" onClick={closeMatchModal}>
                  Close
                </button>
              </div>

              <div className="admin-match-list">
                {matchModal.matches.map((volunteer, index) => (
                  <article
                    key={`${matchModal.task?._id}-${volunteer.volunteer}`}
                    className={`admin-match-row ${index === 0 ? "best-match" : ""}`}
                  >
                    <div className="admin-match-main">
                      <div className="admin-match-titleline">
                        <strong>{volunteer.volunteerName}</strong>
                        {index === 0 ? <span className="admin-best-badge">Best Match</span> : null}
                      </div>
                      <p>{volunteer.location || "Location not added"}</p>
                      <p>{volunteer.volunteerSkills?.join(", ") || "No skills listed"}</p>
                    </div>

                    <div className="admin-match-meta">
                      <span
                        className={`admin-availability-pill ${
                          volunteer.availability ? "available" : "busy"
                        }`}
                      >
                        {volunteer.availability ? "Available" : "Busy"}
                      </span>
                      <strong className="admin-match-percent">
                        <AnimatedPercent value={volunteer.matchScore} />
                      </strong>
                      <small>Rating {volunteer.rating || 0}/5</small>
                    </div>

                    <button
                      type="button"
                      className="task-action-btn task-complete-btn"
                      disabled={
                        !volunteer.availability ||
                        actionKey === `${matchModal.task?._id}-modal-${volunteer.volunteer}`
                      }
                      onClick={() =>
                        assignTaskToVolunteer(
                          matchModal.task?._id,
                          volunteer,
                          volunteer.matchScore,
                          `Assigned to ${volunteer.volunteerName} (${volunteer.matchScore}%)`,
                          `${matchModal.task?._id}-modal-${volunteer.volunteer}`
                        )
                      }
                    >
                      {actionKey === `${matchModal.task?._id}-modal-${volunteer.volunteer}`
                        ? "Assigning..."
                        : volunteer.availability
                          ? "Assign"
                          : "Busy"}
                    </button>
                  </article>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default Admin;
