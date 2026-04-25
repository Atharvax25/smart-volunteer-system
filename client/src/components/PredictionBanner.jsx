import { motion } from "framer-motion";

function PredictionBanner({ predictions = [] }) {
  if (!predictions.length) {
    return null;
  }

  const [primaryPrediction, ...secondaryPredictions] = predictions;

  return (
    <motion.section
      className="prediction-banner glass-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="prediction-banner-main">
        <span className="task-badge">AI-Based Need Prediction</span>
        <h3>{primaryPrediction.message}</h3>
        <p>
          <strong>{primaryPrediction.confidence}% confidence</strong>
          {" · "}
          {primaryPrediction.signal}
        </p>
      </div>

      {secondaryPredictions.length ? (
        <div className="prediction-banner-list">
          {secondaryPredictions.slice(0, 2).map((prediction) => (
            <div key={`${prediction.category}-${prediction.message}`} className="prediction-pill">
              <strong>{prediction.category}</strong>
              <span>{prediction.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </motion.section>
  );
}

export default PredictionBanner;
