import { motion } from "framer-motion";
import sevalinkLogo from "./assets/sevalink-logo-3d.png";

const particles = [
  { left: "16%", top: "18%", duration: 5.4, delay: 0.2 },
  { left: "38%", top: "15%", duration: 5.8, delay: 0.45 },
  { left: "62%", top: "16%", duration: 5.6, delay: 0.6 },
  { left: "84%", top: "19%", duration: 5.2, delay: 0.35 },
];

function IntroScreen() {
  return (
    <motion.div
      className="intro-screen"
      initial={{ opacity: 0, scale: 1.02, filter: "blur(16px)" }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [1.02, 1, 1, 0.985],
        filter: ["blur(16px)", "blur(0px)", "blur(0px)", "blur(8px)"],
      }}
      transition={{
        duration: 1.2,
        times: [0, 0.22, 0.78, 1],
        ease: "easeInOut",
      }}
    >
      <div className="intro-background" aria-hidden="true" />
      <div className="intro-overlay" aria-hidden="true" />

      <div className="intro-particles" aria-hidden="true">
        {particles.map((particle) => (
          <motion.span
            key={`${particle.left}-${particle.top}`}
            className="intro-particle"
            style={{ left: particle.left, top: particle.top }}
            animate={{
              y: [0, -18, 0],
              opacity: [0.18, 0.7, 0.2],
              scale: [0.8, 1.2, 0.9],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: 1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="intro-content">
        <motion.span
          className="intro-kicker"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: "easeInOut" }}
        >
          Smart Volunteer Coordination Platform
        </motion.span>

        <motion.div
          className="intro-logo-wrap"
          initial={{ opacity: 0, y: -24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          <img src={sevalinkLogo} alt="SevaLink logo" className="intro-logo" />
        </motion.div>

        <motion.h1
          className="intro-wordmark"
          initial={{ opacity: 0, y: 22, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.06em" }}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
        >
          SevaLink
        </motion.h1>

        <motion.h1
          className="intro-tagline"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: "easeInOut" }}
        >
          Connecting community needs with the right volunteers, faster.
        </motion.h1>

        <motion.p
          className="intro-subtitle"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24, ease: "easeInOut" }}
        >
          A calm operational workspace for NGOs, organizers, and response teams.
        </motion.p>
      </div>
    </motion.div>
  );
}

export default IntroScreen;
