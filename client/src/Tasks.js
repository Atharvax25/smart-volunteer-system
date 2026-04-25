import "./App.css";
import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
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
const MAP_FALLBACK_CENTER = [20.5937, 78.9629];

const severityCopy = {
  low: {
    label: "Low urgency",
    accent: "Calm window",
  },
  medium: {
    label: "Medium urgency",
    accent: "Planned response",
  },
  high: {
    label: "High urgency",
    accent: "Fast action needed",
  },
  critical: {
    label: "Critical emergency",
    accent: "Immediate escalation",
  },
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeSkillList(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills.map((skill) => normalizeText(skill)).filter(Boolean);
}

function getTaskAgeLabel(value) {
  if (!value) {
    return "Recently added";
  }

  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) {
    return "Recently added";
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - createdAt.getTime()) / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function getTaskMatchCount(task, volunteerSkills) {
  if (!task?.skills?.length || !volunteerSkills.length) {
    return 0;
  }

  const taskSkills = normalizeSkillList(task.skills);
  return taskSkills.filter((skill) => volunteerSkills.includes(skill)).length;
}

function buildTaskSearchText(task) {
  return normalizeText(
    [
      task.title,
      task.description,
      task.location,
      task.category,
      task.reporterName,
      (task.skills || []).join(" "),
      task.imageTag,
      task.escalationReason,
    ].join(" ")
  );
}

function sortTasksByPriority(tasks, volunteerSkills) {
  return [...tasks].sort((left, right) => {
    const rightMatch = getTaskMatchCount(right, volunteerSkills);
    const leftMatch = getTaskMatchCount(left, volunteerSkills);

    if (rightMatch !== leftMatch) {
      return rightMatch - leftMatch;
    }

    if ((right.urgencyScore || 0) !== (left.urgencyScore || 0)) {
      return (right.urgencyScore || 0) - (left.urgencyScore || 0);
    }

    return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
  });
}

function filterTasks(tasks, filters) {
  const { searchText, severity, mode, volunteerSkills } = filters;

  return tasks.filter((task) => {
    if (severity !== "all" && task.severity !== severity) {
      return false;
    }

    if (searchText && !buildTaskSearchText(task).includes(searchText)) {
      return false;
    }

    if (mode === "priority" && (task.urgencyScore || 0) < 70 && task.severity !== "critical") {
      return false;
    }

    if (mode === "matched" && getTaskMatchCount(task, volunteerSkills) === 0) {
      return false;
    }

    return true;
  });
}

function buildMapLink(latitude, longitude) {
  if (!latitude || !longitude) {
    return "";
  }

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function TaskLocationPicker({ latitude, longitude, onPick }) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const selectedPosition =
    latitude && longitude ? [Number(latitude), Number(longitude)] : null;
  const mapCenter = selectedPosition || MAP_FALLBACK_CENTER;

  function MapViewportController({ center }) {
    const map = useMap();

    useEffect(() => {
      if (center) {
        map.setView(center, selectedPosition ? 13 : 5);
      }
    }, [center, map]);

    return null;
  }

  function MapClickHandler() {
    useMapEvents({
      click(event) {
        onPick({
          latitude: String(Number(event.latlng.lat.toFixed(6))),
          longitude: String(Number(event.latlng.lng.toFixed(6))),
        });
      },
    });

    return null;
  }

  const handleSearch = async (event) => {
    event.preventDefault();

    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
          searchText.trim()
        )}`
      );
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Location search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="task-map-picker-shell">
      <div className="task-map-search" role="search">
        <input
          type="text"
          placeholder="Search city, area, or local address"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSearch(event);
            }
          }}
        />
        <button
          type="button"
          className="task-map-search-btn"
          disabled={searching}
          onClick={handleSearch}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {searchResults.length ? (
        <div className="task-map-results">
          {searchResults.map((result) => (
            <button
              key={`${result.place_id}`}
              type="button"
              className="task-map-result-btn"
              onClick={() =>
                onPick({
                  latitude: String(Number(Number(result.lat).toFixed(6))),
                  longitude: String(Number(Number(result.lon).toFixed(6))),
                })
              }
            >
              {result.display_name}
            </button>
          ))}
        </div>
      ) : null}

      <MapContainer
        center={mapCenter}
        zoom={selectedPosition ? 13 : 5}
        scrollWheelZoom
        className="task-map-picker"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportController center={mapCenter} />
        <MapClickHandler />
        {selectedPosition ? (
          <CircleMarker
            center={selectedPosition}
            radius={12}
            pathOptions={{
              color: "#26c6da",
              fillColor: "#26c6da",
              fillOpacity: 0.55,
              weight: 2,
            }}
          />
        ) : null}
      </MapContainer>

      <div className="task-map-picker-meta">
        <span>Click on the map to place the exact task marker.</span>
        <strong>
          {selectedPosition
            ? `Selected: ${selectedPosition[0]}, ${selectedPosition[1]}`
            : "No map point selected yet"}
        </strong>
      </div>
    </div>
  );
}

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
  const [completionRequestedTasks, setCompletionRequestedTasks] = useState([]);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [boardMode, setBoardMode] = useState("all");
  const recognitionRef = useRef(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

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
      formData.append("mapLink", buildMapLink(latitude, longitude));
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

  const submitTask = useCallback(async (token, formData) => {
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
  }, []);

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
      setCompletionRequestedTasks([]);
      setCompletedTasks([]);
      writeJsonStorage(PUBLIC_TASK_CACHE_KEY, data);
    } catch (error) {
      const cachedTasks = readJsonStorage(PUBLIC_TASK_CACHE_KEY, []);
      setOpenTasks(cachedTasks);
      setPendingConfirmationTasks([]);
      setAssignedTasks([]);
      setCompletionRequestedTasks([]);
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
      setCompletionRequestedTasks(data.completionRequestedTasks || []);
      setCompletedTasks(data.completedTasks || []);
      writeJsonStorage(VOLUNTEER_TASK_CACHE_KEY, data);
    } catch (error) {
      const cachedDashboard = readJsonStorage(VOLUNTEER_TASK_CACHE_KEY, {
        openTasks: [],
        pendingConfirmationTasks: [],
        assignedTasks: [],
        completionRequestedTasks: [],
        completedTasks: [],
      });

      setOpenTasks(cachedDashboard.openTasks || []);
      setPendingConfirmationTasks(cachedDashboard.pendingConfirmationTasks || []);
      setAssignedTasks(cachedDashboard.assignedTasks || []);
      setCompletionRequestedTasks(cachedDashboard.completionRequestedTasks || []);
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
        toast.info(
          "Task queued offline. The image file itself will need to be reattached when back online."
        );
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

  const isVolunteer = session?.user.role === "Volunteer";
  const isAdmin = session?.user.role === "NGO";
  const volunteerSkills = useMemo(
    () => normalizeSkillList(session?.user?.skills || []),
    [session?.user?.skills]
  );
  const normalizedSearch = normalizeText(deferredSearchQuery);

  const filteredOpenTasks = useMemo(
    () =>
      sortTasksByPriority(
        filterTasks(openTasks, {
          searchText: normalizedSearch,
          severity: severityFilter,
          mode: boardMode,
          volunteerSkills,
        }),
        volunteerSkills
      ),
    [boardMode, normalizedSearch, openTasks, severityFilter, volunteerSkills]
  );

  const filteredPendingTasks = useMemo(
    () =>
      filterTasks(pendingConfirmationTasks, {
        searchText: normalizedSearch,
        severity: severityFilter,
        mode: "all",
        volunteerSkills,
      }),
    [normalizedSearch, pendingConfirmationTasks, severityFilter, volunteerSkills]
  );

  const filteredAssignedTasks = useMemo(
    () =>
      filterTasks(assignedTasks, {
        searchText: normalizedSearch,
        severity: severityFilter,
        mode: "all",
        volunteerSkills,
      }),
    [assignedTasks, normalizedSearch, severityFilter, volunteerSkills]
  );

  const filteredCompletedTasks = useMemo(
    () =>
      filterTasks(completedTasks, {
        searchText: normalizedSearch,
        severity: severityFilter,
        mode: "all",
        volunteerSkills,
      }),
    [completedTasks, normalizedSearch, severityFilter, volunteerSkills]
  );

  const filteredCompletionRequestedTasks = useMemo(
    () =>
      filterTasks(completionRequestedTasks, {
        searchText: normalizedSearch,
        severity: severityFilter,
        mode: "all",
        volunteerSkills,
      }),
    [completionRequestedTasks, normalizedSearch, severityFilter, volunteerSkills]
  );

  const highlightedTask = filteredOpenTasks[0] || openTasks[0] || null;
  const matchedOpenTasksCount = useMemo(
    () => openTasks.filter((task) => getTaskMatchCount(task, volunteerSkills) > 0).length,
    [openTasks, volunteerSkills]
  );
  const urgentOpenTasksCount = useMemo(
    () => openTasks.filter((task) => task.severity === "critical" || (task.urgencyScore || 0) >= 80).length,
    [openTasks]
  );
  const completionRate = useMemo(() => {
    const total = assignedTasks.length + completedTasks.length;
    if (!total) {
      return 0;
    }

    return Math.round((completedTasks.length / total) * 100);
  }, [assignedTasks.length, completedTasks.length]);

  const heroMetrics = useMemo(() => {
    if (isVolunteer) {
      return [
        {
          value: matchedOpenTasksCount,
          label: "Best-fit opportunities",
          detail: "Tasks aligned with your listed skills",
        },
        {
          value: pendingConfirmationTasks.length + assignedTasks.length,
          label: "Actions in flight",
          detail: "Assignments waiting on you, active tasks, and submitted completion checks",
        },
        {
          value: completionRequestedTasks.length,
          label: "Awaiting admin review",
          detail: "Tasks you submitted for completion verification",
        },
        {
          value: `${completionRate}%`,
          label: "Completion rhythm",
          detail: "Based on your active and completed assignments",
        },
      ];
    }

    return [
      {
        value: openTasks.length,
        label: "Open task pipeline",
        detail: "Visible community requests needing coordination",
      },
      {
        value: queuedCount,
        label: "Offline-safe queue",
        detail: "Reports ready to sync when connection returns",
      },
      {
        value: urgentOpenTasksCount,
        label: "Priority watchlist",
        detail: "Critical or high-urgency requests requiring attention",
      },
    ];
  }, [
    assignedTasks.length,
    completionRequestedTasks.length,
    completionRate,
    isVolunteer,
    matchedOpenTasksCount,
    openTasks.length,
    pendingConfirmationTasks.length,
    queuedCount,
    urgentOpenTasksCount,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSeverityFilter("all");
    setBoardMode("all");
  };

  const renderTaskList = (tasks, emptyMessage, options = {}) => {
    if (tasks.length === 0) {
      return <p className="task-empty">{emptyMessage}</p>;
    }

    return (
      <div className="task-list">
        {tasks.map((task, index) => {
          const matchCount = getTaskMatchCount(task, volunteerSkills);
          const severityMeta = severityCopy[task.severity] || severityCopy.medium;
          const isRecommended = isVolunteer && matchCount > 0;
          const ageLabel = getTaskAgeLabel(task.createdAt || task.assignedAt || task.completedAt);

          return (
            <motion.article
              key={task._id}
              className={`task-item ${isRecommended ? "task-item-recommended" : ""}`}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35, delay: index * 0.03 }}
              whileHover={{ y: -10, rotateX: 2.5, rotateY: -2.5 }}
            >
              <div className="task-item-glow" aria-hidden="true" />

              <div className="task-item-top">
                <div className="task-title-stack">
                  <div className="task-card-topline">
                    <span className="task-age-chip">{ageLabel}</span>
                    {isRecommended ? <span className="task-recommend-pill">Skill match</span> : null}
                    {task.status ? (
                      <span className={`task-status-chip status-${task.status}`}>{task.status.replace("_", " ")}</span>
                    ) : null}
                  </div>
                  <h3>{task.title}</h3>
                </div>

                <span className={`task-severity severity-${task.severity}`}>
                  {severityMeta.label}
                </span>
              </div>

              <div className="task-intel-row">
                <span className="task-category-pill">{task.category || "General support"}</span>
                <span>Urgency {(task.urgencyScore || 0)}/100</span>
                <span>{task.sharedVisibility ? "Shared network" : "Private NGO task"}</span>
              </div>

              <p>{task.description}</p>

              {task.imageUrl ? (
                <div className="task-image-shell">
                  <img
                    src={getAssetUrl(task.imageUrl)}
                    alt={task.title}
                    className="task-image-preview"
                  />
                </div>
              ) : null}

              <div className="task-detail-grid">
              <div className="task-detail-card">
                <span>Location</span>
                <strong>{task.location}</strong>
              </div>
              <div className="task-detail-card">
                <span>Map access</span>
                <strong>
                  {task.mapLink ? (
                    <a href={task.mapLink} target="_blank" rel="noreferrer" className="task-map-link">
                      Open in Maps
                    </a>
                  ) : (
                    "Location details only"
                  )}
                </strong>
              </div>
              <div className="task-detail-card">
                <span>Reporter</span>
                <strong>{task.reporterName || "Community desk"}</strong>
              </div>
                <div className="task-detail-card">
                  <span>Priority note</span>
                  <strong>{severityMeta.accent}</strong>
                </div>
                <div className="task-detail-card">
                  <span>Skill fit</span>
                  <strong>
                    {matchCount
                      ? `${matchCount} matching skill${matchCount === 1 ? "" : "s"}`
                      : "Open to general support"}
                  </strong>
                </div>
              </div>

              {task.skills?.length ? (
                <div className="task-chip-row">
                  {task.skills.map((skill) => (
                    <span
                      key={`${task._id}-${skill}`}
                      className={
                        volunteerSkills.includes(normalizeText(skill))
                          ? "task-skill-chip task-skill-chip-match"
                          : "task-skill-chip"
                      }
                    >
                      {skill}
                    </span>
                  ))}
                </div>
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

              {task.status === "completion_requested" ? (
                <p className="task-application-status">
                  Completion review requested. Waiting for admin verification.
                </p>
              ) : null}

              {task.assignedVolunteer?.volunteerName ? (
                <p className="task-assigned-note">
                  Assigned volunteer: {task.assignedVolunteer.volunteerName}
                </p>
              ) : null}

              {options.showApply && !task.currentUserApplicationStatus ? (
                <button
                  type="button"
                  className="task-action-btn"
                  disabled={actionTaskId === task._id}
                  onClick={() =>
                    handleVolunteerAction(
                      task._id,
                      "apply",
                      "POST",
                      "Task accepted. The NGO can now review your request."
                    )
                  }
                >
                  {actionTaskId === task._id ? "Sending..." : "Accept Task"}
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
                    handleVolunteerAction(
                      task._id,
                      "request-complete",
                      "PATCH",
                      "Completion request sent to the admin for verification."
                    )
                  }
                >
                  {actionTaskId === task._id ? "Submitting..." : "Request Completion Review"}
                </button>
              ) : null}
            </motion.article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="task-page">
      <div className="task-ambient task-ambient-one" aria-hidden="true" />
      <div className="task-ambient task-ambient-two" aria-hidden="true" />

      <div className="task-shell">
        <motion.section
          className="task-hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="task-hero-copy">
            <span className="task-badge">
              {isVolunteer ? "Volunteer Command Deck" : "Task Intelligence Workspace"}
            </span>
            <h1>{isVolunteer ? "Move faster on the work that fits you best." : "Create clearer tasks and keep response teams in sync."}</h1>
            <p className="task-desc">
              {isVolunteer
                ? "Your dashboard now surfaces high-fit opportunities, pending confirmations, and active work in one easier flow."
                : "Capture richer task details, use voice input, stay safe offline, and keep every report structured for better volunteer coordination."}
            </p>
          </div>

          <div className="task-hero-metrics">
            {heroMetrics.map((metric, index) => (
              <motion.article
                key={metric.label}
                className="task-hero-metric"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.06 * index }}
                whileHover={{ y: -6, scale: 1.01 }}
              >
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
                <small>{metric.detail}</small>
              </motion.article>
            ))}
          </div>
        </motion.section>

        <div className="task-layout">
          <motion.aside
            className="task-card task-form-card"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="task-header-block">
              <span className="task-badge task-badge-soft">
                {isVolunteer ? "Profile snapshot" : "Structured intake"}
              </span>
              <h2>{isVolunteer ? "Volunteer dashboard" : "Report a new community issue"}</h2>
              <p className="task-desc">
                {isVolunteer
                  ? "Review open needs, track assignments, and spot the tasks that line up with your strengths."
                  : "Clean inputs lead to faster triage. Add skills, urgency, image hints, and pin the issue directly on the map."}
              </p>
            </div>

            {isOffline || queuedCount ? (
              <div className="offline-banner">
                <strong>{isOffline ? "Offline mode active" : "Offline queue ready"}</strong>
                <span>{queuedCount} queued task{queuedCount === 1 ? "" : "s"} waiting to sync</span>
              </div>
            ) : null}

            {session?.user ? (
              <div className="task-session-panel">
                <p className="task-session-note">
                  Signed in as <strong>{session.user.name}</strong> ({session.user.role})
                  {isVolunteer && session.user.skills?.length
                    ? ` · Skills: ${session.user.skills.join(", ")}`
                    : ""}
                  {isVolunteer
                    ? ` · ${session.user.points || 0} pts · ${session.user.tasksCompleted || 0} completed`
                    : ""}
                </p>

                {isVolunteer ? (
                  <div className="volunteer-summary-grid">
                    <div className="task-summary-card">
                      <strong>{openTasks.length}</strong>
                      <span>Open tasks</span>
                    </div>
                    <div className="task-summary-card">
                      <strong>{matchedOpenTasksCount}</strong>
                      <span>Matched to your skills</span>
                    </div>
                    <div className="task-summary-card">
                      <strong>{pendingConfirmationTasks.length}</strong>
                      <span>Waiting confirmation</span>
                    </div>
                    <div className="task-summary-card">
                      <strong>{assignedTasks.length}</strong>
                      <span>In progress</span>
                    </div>
                    <div className="task-summary-card">
                      <strong>{completionRequestedTasks.length}</strong>
                      <span>Waiting admin review</span>
                    </div>
                    <div className="task-summary-card">
                      <strong>{completedTasks.length}</strong>
                      <span>Completed</span>
                    </div>
                    <div className="task-summary-card">
                      <strong>{urgentOpenTasksCount}</strong>
                      <span>Urgent openings</span>
                    </div>
                  </div>
                ) : (
                  <div className="task-insight-stack">
                    <div className="task-insight-card">
                      <span>Current queue</span>
                      <strong>{openTasks.length} open tasks</strong>
                      <small>{urgentOpenTasksCount} priority items need faster attention</small>
                    </div>
                    <div className="task-insight-card">
                      <span>Submission readiness</span>
                      <strong>{queuedCount} offline-safe drafts</strong>
                      <small>Reports can be captured now and synced later</small>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="task-session-note">
                You can view open tasks now. <Link to="/auth">Login or register</Link> to take action.
              </p>
            )}

            {isVolunteer && highlightedTask ? (
              <motion.div
                className="volunteer-focus-card"
                whileHover={{ y: -6, rotateX: 2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="volunteer-focus-topline">
                  <span>Recommended next move</span>
                  <span>{getTaskAgeLabel(highlightedTask.createdAt)}</span>
                </div>
                <h3>{highlightedTask.title}</h3>
                <p>{highlightedTask.location}</p>
                <div className="volunteer-focus-meta">
                  <span>{highlightedTask.category || "General support"}</span>
                  <span>Urgency {(highlightedTask.urgencyScore || 0)}/100</span>
                </div>
              </motion.div>
            ) : null}

            {isAdmin ? (
              <>
                <form className="task-form" onSubmit={handleSubmit}>
                  <div className="task-form-section">
                    <div className="task-form-section-head">
                      <h3>Core details</h3>
                      <p>Start with the problem statement and location.</p>
                    </div>

                    <div className="voice-field">
                      <input
                        type="text"
                        placeholder="Task title"
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
                  </div>

                  <div className="task-form-section">
                    <div className="task-form-section-head">
                      <h3>Routing signals</h3>
                      <p>Add the data that helps volunteers get matched faster.</p>
                    </div>

                    <TaskLocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      onPick={({ latitude: nextLatitude, longitude: nextLongitude }) => {
                        setLatitude(nextLatitude);
                        setLongitude(nextLongitude);
                      }}
                    />

                    <input
                      type="text"
                      placeholder="Skills required (comma separated)"
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
                  </div>

                  <div className="task-form-footer">
                    <div className="task-form-tip">
                      <strong>Quick tip</strong>
                      <span>
                        Tasks with clear location, skills, and severity details are easier to route and assign.
                      </span>
                    </div>

                    <button className="btn task-submit-btn" type="submit" disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit Task"}
                    </button>
                  </div>
                </form>

                <Link to="/admin" className="task-admin-link">
                  Open admin dashboard for predictions, heatmap, matching, and assignment
                </Link>
              </>
            ) : !isVolunteer ? (
              <p className="task-empty">
                Login as a volunteer to review assignments or as an NGO to create, match, and assign tasks.
              </p>
            ) : null}
          </motion.aside>

          <motion.section
            className="task-card task-list-card"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="task-list-header">
              <div>
                <span className="task-badge task-badge-light">Live task board</span>
                <h2>{isVolunteer ? "Tasks available for you" : "Current network needs"}</h2>
              </div>
              <p className="task-count">{openCountLabel}</p>
            </div>

            <div className="task-toolbar">
              <div className="task-search-shell">
                <input
                  type="text"
                  className="task-search-input"
                  placeholder="Search tasks, locations, categories, or skills"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>

              <div className="task-toolbar-actions">
                <select
                  className="task-filter-select"
                  value={severityFilter}
                  onChange={(event) => setSeverityFilter(event.target.value)}
                >
                  <option value="all">All severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>

                <button
                  type="button"
                  className={boardMode === "all" ? "task-mode-chip active" : "task-mode-chip"}
                  onClick={() => setBoardMode("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={boardMode === "priority" ? "task-mode-chip active" : "task-mode-chip"}
                  onClick={() => setBoardMode("priority")}
                >
                  Priority
                </button>
                {isVolunteer ? (
                  <button
                    type="button"
                    className={boardMode === "matched" ? "task-mode-chip active" : "task-mode-chip"}
                    onClick={() => setBoardMode("matched")}
                  >
                    Skill matched
                  </button>
                ) : null}
                <button type="button" className="task-reset-btn" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>

            {loading ? (
              <p className="task-empty">Loading tasks...</p>
            ) : (
              renderTaskList(filteredOpenTasks, "No open tasks match the current filters.", {
                showApply: isVolunteer,
              })
            )}

            {isVolunteer ? (
              <div className="task-subsection">
                <div className="task-subsection-header">
                  <div>
                    <h3>Admin assignment requests</h3>
                    <p>Confirm new assignments so they move into your active queue.</p>
                  </div>
                  <span className="task-subsection-count">{filteredPendingTasks.length}</span>
                </div>
                {renderTaskList(
                  filteredPendingTasks,
                  "No assignments are waiting for your confirmation.",
                  { showConfirm: true }
                )}
              </div>
            ) : null}

            {isVolunteer ? (
              <div className="task-subsection">
                <div className="task-subsection-header">
                  <div>
                    <h3>Your assigned tasks</h3>
                    <p>Keep momentum visible and close tasks once the work is done.</p>
                  </div>
                  <span className="task-subsection-count">{filteredAssignedTasks.length}</span>
                </div>
                {renderTaskList(filteredAssignedTasks, "No tasks have been assigned to you yet.", {
                  showComplete: true,
                })}
              </div>
            ) : null}

            {isVolunteer ? (
              <div className="task-subsection">
                <div className="task-subsection-header">
                  <div>
                    <h3>Waiting for admin verification</h3>
                    <p>Tasks you completed from your side and sent for admin cross-check.</p>
                  </div>
                  <span className="task-subsection-count">{filteredCompletionRequestedTasks.length}</span>
                </div>
                {renderTaskList(
                  filteredCompletionRequestedTasks,
                  "No task is currently waiting for admin verification."
                )}
              </div>
            ) : null}

            {isVolunteer ? (
              <div className="task-subsection">
                <div className="task-subsection-header">
                  <div>
                    <h3>Your completed tasks</h3>
                    <p>A running record of work you have already closed out.</p>
                  </div>
                  <span className="task-subsection-count">{filteredCompletedTasks.length}</span>
                </div>
                {renderTaskList(filteredCompletedTasks, "No completed tasks yet.")}
              </div>
            ) : null}
          </motion.section>
        </div>
      </div>
    </div>
  );
}

export default Tasks;
