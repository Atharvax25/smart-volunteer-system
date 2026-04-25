import "./App.css";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { createSpeechRecognition } from "./utils/speech";
import {
  API_BASE_URL,
  getAssetUrl,
  getStoredSession,
  readJsonStorage,
  writeJsonStorage,
} from "./utils/sevalink";

const PUBLIC_TASK_CACHE_KEY = "sevalink-public-task-cache";
const VOLUNTEER_TASK_CACHE_KEY = "sevalink-volunteer-task-cache";
const OFFLINE_TASK_QUEUE_KEY = "sevalink-offline-task-queue";

function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [skills, setSkills] = useState("");
  const [imageLabel, setImageLabel] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [sharedVisibility, setSharedVisibility] = useState(true);
  const [openTasks, setOpenTasks] = useState([]);
  const [pendingConfirmationTasks, setPendingConfirmationTasks] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [actionTaskId, setActionTaskId] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(
    readJsonStorage(OFFLINE_TASK_QUEUE_KEY, []).length
  );
  const [listeningField, setListeningField] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const storedSession = getStoredSession();
    if (storedSession) {
      setSession(storedSession);
    }
  }, []);

  const persistQueue = useCallback((queue) => {
    writeJsonStorage(OFFLINE_TASK_QUEUE_KEY, queue);
    setQueuedCount(queue.length);
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setSeverity("medium");
    setSkills("");
    setImageLabel("");
    setImageFile(null);
    setSharedVisibility(true);
  };

  const buildTaskPayload = useCallback(
    (includeImage = true) => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("location", location);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("severity", severity);
      formData.append("skills", skills);
      formData.append("imageLabel", imageLabel);
      formData.append("sharedVisibility", String(sharedVisibility));

      if (includeImage && imageFile) {
        formData.append("image", imageFile);
      }

      return formData;
    },
    [
      description,
      imageFile,
      imageLabel,
      latitude,
      location,
      longitude,
      severity,
      sharedVisibility,
      skills,
      title,
    ]
  );

  const submitTask = useCallback(
    async (token, formData) => {
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to create task");
      }

      return data;
    },
    []
  );

  const fetchPublicTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tasks?status=open`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load tasks");
      }

      setOpenTasks(Array.isArray(data) ? data : []);
      setPendingConfirmationTasks([]);
      setAssignedTasks([]);
      setCompletedTasks([]);
      writeJsonStorage(PUBLIC_TASK_CACHE_KEY, data);
    } catch (error) {
      const cachedTasks = readJsonStorage(PUBLIC_TASK_CACHE_KEY, []);
      setOpenTasks(cachedTasks);
      setPendingConfirmationTasks([]);
      setAssignedTasks([]);
      setCompletedTasks([]);

      if (cachedTasks.length) {
        toast.info("Showing cached open tasks while offline");
      } else {
        toast.error(error.message || "Unable to load current tasks");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVolunteerDashboard = useCallback(async (token) => {
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
      writeJsonStorage(VOLUNTEER_TASK_CACHE_KEY, data);
    } catch (error) {
      const cachedDashboard = readJsonStorage(VOLUNTEER_TASK_CACHE_KEY, {
        openTasks: [],
        pendingConfirmationTasks: [],
        assignedTasks: [],
        completedTasks: [],
      });

      setOpenTasks(cachedDashboard.openTasks || []);
      setPendingConfirmationTasks(cachedDashboard.pendingConfirmationTasks || []);
      setAssignedTasks(cachedDashboard.assignedTasks || []);
      setCompletedTasks(cachedDashboard.completedTasks || []);

      if ((cachedDashboard.openTasks || []).length) {
        toast.info("Showing cached volunteer dashboard while offline");
      } else {
        toast.error(error.message || "Unable to load volunteer dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCurrentView = useCallback(async () => {
    if (session?.user.role === "Volunteer") {
      await fetchVolunteerDashboard(session.token);
      return;
    }

    await fetchPublicTasks();
  }, [fetchPublicTasks, fetchVolunteerDashboard, session]);

  const syncQueuedTasks = useCallback(async () => {
    if (!session?.token || session.user.role !== "NGO") {
      return;
    }

    const queuedTasks = readJsonStorage(OFFLINE_TASK_QUEUE_KEY, []);
    if (!queuedTasks.length || !navigator.onLine) {
      return;
    }

    const remainingQueue = [];
    let syncedCount = 0;

    for (const queuedTask of queuedTasks) {
      const formData = new FormData();
      Object.entries(queuedTask).forEach(([key, value]) => {
        formData.append(key, value);
      });

      try {
        await submitTask(session.token, formData);
        syncedCount += 1;
      } catch (error) {
        remainingQueue.push(queuedTask);
      }
    }

    persistQueue(remainingQueue);

    if (syncedCount) {
      toast.success(`${syncedCount} offline task${syncedCount === 1 ? "" : "s"} synced`);
      await fetchPublicTasks();
    }
  }, [fetchPublicTasks, persistQueue, session, submitTask]);

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
  }, [fetchPublicTasks, fetchVolunteerDashboard, session]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncQueuedTasks();
      refreshCurrentView();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCurrentView, syncQueuedTasks]);

  useEffect(() => {
    if (session?.user.role === "NGO" && navigator.onLine) {
      syncQueuedTasks();
    }
  }, [session, syncQueuedTasks]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const openCountLabel = useMemo(() => {
    if (loading) {
      return "Loading open tasks...";
    }

    return `${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} right now`;
  }, [loading, openTasks.length]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!session?.token || session.user.role !== "NGO") {
      toast.info("Only NGO accounts can create new tasks");
      return;
    }

    if (!navigator.onLine) {
      const queue = readJsonStorage(OFFLINE_TASK_QUEUE_KEY, []);
      queue.push({
        title,
        description,
        location,
        latitude,
        longitude,
        severity,
        skills,
        imageLabel,
        sharedVisibility: String(sharedVisibility),
      });

      persistQueue(queue);
      resetForm();

      if (imageFile) {
        toast.info("Task queued offline. The image file itself will need to be reattached when back online.");
      } else {
        toast.success("Task queued offline and will sync when connection returns.");
      }

      return;
    }

    setSubmitting(true);

    try {
      await submitTask(session.token, buildTaskPayload(true));
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

    if (!navigator.onLine) {
      toast.info("Task actions need an internet connection right now.");
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

  const startVoiceCapture = (field) => {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      toast.info("Voice input is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setListeningField(field);
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      if (!transcript) {
        return;
      }

      const updateWithTranscript = (setter) => {
        setter((currentValue) => (currentValue ? `${currentValue} ${transcript}` : transcript));
      };

      if (field === "title") {
        updateWithTranscript(setTitle);
      } else if (field === "description") {
        updateWithTranscript(setDescription);
      } else if (field === "location") {
        updateWithTranscript(setLocation);
      }
    };

    recognition.onerror = () => {
      setListeningField("");
      toast.error("Voice input could not capture that clearly.");
    };

    recognition.onend = () => {
      setListeningField("");
    };

    recognition.start();
  };

  const renderTaskList = (tasks, emptyMessage, options = {}) => {
    if (tasks.length === 0) {
      return <p className="task-empty">{emptyMessage}</p>;
    }

    return (
      <div className="task-list">
        {tasks.map((task) => (
          <motion.div
            key={task._id}
            className="task-item"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.35 }}
          >
            <div className="task-item-top">
              <h3>{task.title}</h3>
              <span className={`task-severity severity-${task.severity}`}>
                {task.severity}
              </span>
            </div>

            <div className="task-intel-row">
              <span className="task-category-pill">{task.category || "General support"}</span>
              <span>Urgency {task.urgencyScore || 0}/100</span>
              {task.sharedVisibility ? <span>Shared network</span> : <span>Private NGO task</span>}
            </div>

            <p>{task.description}</p>

            {task.imageUrl ? (
              <img
                src={getAssetUrl(task.imageUrl)}
                alt={task.title}
                className="task-image-preview"
              />
            ) : null}

            <div className="task-meta-row">
              <span>{task.location}</span>
              <span>Reporter: {task.reporterName}</span>
            </div>

            {task.geoLocation?.lat !== null && task.geoLocation?.lng !== null ? (
              <p className="task-geo-note">
                Coordinates: {task.geoLocation.lat}, {task.geoLocation.lng}
              </p>
            ) : null}

            {task.skills?.length ? (
              <p className="task-skills">Skills needed: {task.skills.join(", ")}</p>
            ) : null}

            {task.imageTag ? <p className="task-image-tags">Detected tags: {task.imageTag}</p> : null}

            {task.escalationReason ? (
              <p className="task-escalation-note">{task.escalationReason}</p>
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
          </motion.div>
        ))}
      </div>
    );
  };

  const isVolunteer = session?.user.role === "Volunteer";
  const isAdmin = session?.user.role === "NGO";

  return (
    <div className="task-page">
      <div className="task-layout">
        <motion.div
          className="task-card task-form-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="task-header-block">
            <span className="task-badge">{isVolunteer ? "Volunteer Workspace" : "Task Reporting"}</span>
            <h2>{isVolunteer ? "Volunteer dashboard" : "Report a new community issue"}</h2>
            <p className="task-desc">
              {isVolunteer
                ? "Review open community needs, confirm admin assignments, and track the work that has been assigned to you."
                : "Create geo-tagged tasks, attach an image, use voice input, and manage volunteer assignments from the admin dashboard."}
            </p>
          </div>

          {isOffline || queuedCount ? (
            <div className="offline-banner">
              <strong>{isOffline ? "Offline mode active" : "Offline queue ready"}</strong>
              <span>{queuedCount} queued task{queuedCount === 1 ? "" : "s"} waiting to sync</span>
            </div>
          ) : null}

          {session?.user ? (
            <p className="task-session-note">
              Signed in as <strong>{session.user.name}</strong> ({session.user.role})
              {isVolunteer && session.user.skills?.length
                ? ` · Skills: ${session.user.skills.join(", ")}`
                : ""}
              {isVolunteer
                ? ` · ${session.user.points || 0} pts · ${session.user.tasksCompleted || 0} completed`
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
                <div className="voice-field">
                  <input
                    type="text"
                    placeholder="Task Title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="voice-btn"
                    onClick={() => startVoiceCapture("title")}
                  >
                    {listeningField === "title" ? "Listening..." : "Voice"}
                  </button>
                </div>

                <div className="voice-field voice-field-textarea">
                  <textarea
                    placeholder="Describe the problem and what help is needed"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    required
                  ></textarea>
                  <button
                    type="button"
                    className="voice-btn"
                    onClick={() => startVoiceCapture("description")}
                  >
                    {listeningField === "description" ? "Listening..." : "Voice"}
                  </button>
                </div>

                <div className="voice-field">
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="voice-btn"
                    onClick={() => startVoiceCapture("location")}
                  >
                    {listeningField === "location" ? "Listening..." : "Voice"}
                  </button>
                </div>

                <div className="task-coordinate-grid">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                  />

                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Skills Required (comma separated)"
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                />

                <input
                  type="text"
                  placeholder="Image label or hint (example: flood street damage)"
                  value={imageLabel}
                  onChange={(event) => setImageLabel(event.target.value)}
                />

                <label className="task-upload-label">
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                  />
                </label>

                <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
                  <option value="low">Low urgency</option>
                  <option value="medium">Medium urgency</option>
                  <option value="high">High urgency</option>
                  <option value="critical">Critical emergency</option>
                </select>

                <label className="task-checkbox">
                  <input
                    type="checkbox"
                    checked={sharedVisibility}
                    onChange={(event) => setSharedVisibility(event.target.checked)}
                  />
                  Share with the wider NGO network
                </label>

                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Task"}
                </button>
              </form>

              <Link to="/admin" className="task-admin-link">
                Open admin dashboard for predictions, heatmap, matching, and assignment
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
            <p className="task-empty">
              Login as a volunteer to review assignments or as an NGO to create, match, and assign tasks.
            </p>
          )}
        </motion.div>

        <motion.div
          className="task-card task-list-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <div className="task-list-header">
            <div>
              <span className="task-badge task-badge-light">Open Tasks</span>
              <h2>{isVolunteer ? "Tasks available for you" : "Current network needs"}</h2>
            </div>
            <p className="task-count">{openCountLabel}</p>
          </div>

          {loading ? (
            <p className="task-empty">Loading tasks...</p>
          ) : (
            renderTaskList(openTasks, "No open tasks available right now.", {
            })
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
              {renderTaskList(assignedTasks, "No tasks have been assigned to you yet.", {
                showComplete: true,
              })}
            </div>
          ) : null}

          {isVolunteer ? (
            <div className="task-subsection">
              <h3>Your completed tasks</h3>
              {renderTaskList(completedTasks, "No completed tasks yet.")}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

export default Tasks;
