import "leaflet/dist/leaflet.css";
import { motion } from "framer-motion";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

const fallbackCenter = [20.5937, 78.9629];

function getSeverityColor(severity) {
  if (severity === "critical") {
    return "#ff4d6d";
  }

  if (severity === "high") {
    return "#f97316";
  }

  if (severity === "medium") {
    return "#facc15";
  }

  return "#22c55e";
}

function TaskHeatmap({ points = [] }) {
  const center = points.length
    ? [
        points.reduce((sum, point) => sum + point.lat, 0) / points.length,
        points.reduce((sum, point) => sum + point.lng, 0) / points.length,
      ]
    : fallbackCenter;

  return (
    <motion.section
      className="admin-panel"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Map view</span>
          <h3>Geo Heatmap Dashboard</h3>
        </div>
      </div>

      {points.length ? (
        <div className="heatmap-shell glass-panel">
          <MapContainer center={center} zoom={5} scrollWheelZoom className="heatmap-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {points.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lng]}
                radius={Math.max(10, point.urgencyScore / 7)}
                pathOptions={{
                  color: getSeverityColor(point.severity),
                  fillColor: getSeverityColor(point.severity),
                  fillOpacity: 0.45,
                  weight: 2,
                }}
              >
                <Popup>
                  <strong>{point.title}</strong>
                  <br />
                  {point.location}
                  <br />
                  {point.category}
                  <br />
                  {point.severity} · {point.status}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="heatmap-legend">
            <span className="heatmap-legend-item critical">Critical</span>
            <span className="heatmap-legend-item high">High</span>
            <span className="heatmap-legend-item medium">Medium</span>
            <span className="heatmap-legend-item low">Low</span>
          </div>
        </div>
      ) : (
        <p className="admin-empty-copy">
          Add a direct map link while creating tasks to populate the heatmap automatically.
        </p>
      )}
    </motion.section>
  );
}

export default TaskHeatmap;
