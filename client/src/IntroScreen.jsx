import { motion } from "framer-motion";
import introImage from "./assets/sevalink-intro-bg.png";
import sevalinkLogo from "./assets/sevalink-logo-3d.png";

const particles = [
  { left: "16%", top: "18%", duration: 5.4, delay: 0.2 },
  { left: "27%", top: "28%", duration: 6, delay: 0.8 },
  { left: "38%", top: "15%", duration: 5.8, delay: 0.45 },
  { left: "50%", top: "24%", duration: 6.2, delay: 1 },
  { left: "62%", top: "16%", duration: 5.6, delay: 0.6 },
  { left: "74%", top: "27%", duration: 6.1, delay: 1.1 },
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
        duration: 6,
        times: [0, 0.16, 0.82, 1],
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
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="intro-content">
        <motion.div
          className="intro-logo-wrap"
          initial={{ opacity: 0, y: -24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <img src={sevalinkLogo} alt="SevaLink logo" className="intro-logo" />
        </motion.div>

        <motion.div
          className="intro-image-shell"
          initial={{ opacity: 0, scale: 0.8, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1.05, filter: "blur(0px)" }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          <motion.div
            className="intro-image-float"
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="intro-handshake-pulse"
              animate={{
                scale: [1, 1.03, 1],
                boxShadow: [
                  "0 0 0 rgba(100, 255, 218, 0)",
                  "0 0 48px rgba(100, 255, 218, 0.42)",
                  "0 0 12px rgba(100, 255, 218, 0.12)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src={introImage}
                alt="Linking Hands, Changing Lives"
                className="intro-image"
              />
            </motion.div>

            <motion.div
              className="intro-hand-glow"
              animate={{
                scale: [1, 1.06, 1],
                opacity: [0.24, 0.78, 0.28],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>

        <motion.h1
          className="intro-tagline"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 2, ease: "easeInOut" }}
        >
          Linking Hands, Changing Lives
        </motion.h1>
      </div>
    </motion.div>
  );
}

export default IntroScreen;
