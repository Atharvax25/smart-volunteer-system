import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import heroImg from "./assets/hero.png";
import sevalinkLogo from "./assets/sevalink-logo-3d.png";
import impactStoryImage from "./assets/21.png";
import "./App.css";
import Footer from "./Footer";

const featureCards = [
  {
    title: "Need Matching",
    description:
      "Link urgent requests with the volunteers, partners, and skills best suited to respond fast.",
    icon: MatchIcon,
  },
  {
    title: "Live Coordination",
    description:
      "Track requests, assignments, and team availability through one calm operational surface.",
    icon: NetworkIcon,
  },
  {
    title: "Impact Signals",
    description:
      "Understand response speed, task coverage, and community reach with clear visual insight.",
    icon: PulseIcon,
  },
  {
    title: "Trusted Network",
    description:
      "Bring helpers, organizers, and communities into one secure network built for action.",
    icon: ShieldIcon,
  },
];

const heroStats = [
  { value: "120+", label: "Active helpers" },
  { value: "48hr", label: "Average response time" },
  { value: "35+", label: "Connected partners" },
];

const liveStats = [
  {
    value: 500,
    suffix: "+",
    label: "Tasks Solved",
    icon: "\u2714",
  },
  {
    value: 120,
    suffix: "+",
    label: "Active Volunteers",
    icon: "\uD83D\uDC65",
  },
  {
    value: 50,
    suffix: "+",
    label: "Communities Helped",
    icon: "\uD83C\uDF0D",
  },
];

const testimonials = [
  {
    quote: "SevaLink helped us find volunteers instantly.",
    author: "NGO Team",
  },
  {
    quote: "I was able to help people using my skills easily.",
    author: "Volunteer",
  },
  {
    quote: "My problem was solved quickly.",
    author: "User",
  },
];

const impactStory = {
  title: "Real Impact in Action",
  subtitle:
    "See how SevaLink connects people and changes lives through real help and community support.",
  caption: "Every action creates impact",
};

const impactAreas = [
  {
    title: "Disaster Relief Coordination",
    description:
      "Mobilize volunteers, supplies, and verified responders quickly during emergencies and recovery efforts.",
    icon: ReliefIcon,
    highlight: "rapid response",
  },
  {
    title: "Education Support",
    description:
      "Connect mentors, tutors, and local groups to students who need extra support and opportunity.",
    icon: EducationIcon,
    highlight: "future-ready access",
  },
  {
    title: "Medical Assistance",
    description:
      "Route health camps, medicine drives, and skilled volunteers toward urgent community needs.",
    icon: MedicalIcon,
    highlight: "timely care",
  },
  {
    title: "Community Development",
    description:
      "Strengthen neighborhoods through clean-up drives, food networks, and long-term local collaboration.",
    icon: GrowthIcon,
    highlight: "shared progress",
  },
];

const revealUp = {
  hidden: { opacity: 0, y: 48 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function TiltCard({ feature, index }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const glowX = useSpring(50, { stiffness: 160, damping: 20 });
  const glowY = useSpring(50, { stiffness: 160, damping: 20 });
  const Icon = feature.icon;

  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - bounds.left) / bounds.width) * 100;
    const py = ((event.clientY - bounds.top) / bounds.height) * 100;

    glowX.set(px);
    glowY.set(py);

    const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16;
    const rotateX = (((event.clientY - bounds.top) / bounds.height) - 0.5) * -16;
    setRotation({ x: rotateX, y: rotateY });
  };

  const resetCard = () => {
    setRotation({ x: 0, y: 0 });
    glowX.set(50);
    glowY.set(50);
  };

  const glow = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(100, 255, 218, 0.26), transparent 45%)`;

  return (
    <motion.article
      className="feature-card"
      custom={0.1 * index}
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      whileHover={{ y: -10, scale: 1.02 }}
      onMouseMove={handleMove}
      onMouseLeave={resetCard}
      style={{
        transform: `perspective(1200px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
      }}
    >
      <motion.span className="feature-card-glow" style={{ background: glow }} />
      <div className="feature-icon-wrap">
        <Icon />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </motion.article>
  );
}

function CountUpStat({ item, index }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const statRef = useRef(null);
  const motionValue = useMotionValue(0);
  const smoothValue = useSpring(motionValue, {
    stiffness: 90,
    damping: 22,
  });
  const inView = useInView(statRef, { once: true, amount: 0.45 });

  useEffect(() => {
    if (inView && !hasAnimated) {
      setHasAnimated(true);
      motionValue.set(item.value);
    }
  }, [hasAnimated, inView, item.value, motionValue]);

  useEffect(() => {
    const unsubscribe = smoothValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest));
    });

    return () => unsubscribe();
  }, [smoothValue]);

  return (
    <motion.div
      ref={statRef}
      className="live-stat-card glass-panel"
      custom={0.08 * index}
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.45 }}
      whileHover={{ y: -10, scale: 1.03 }}
    >
      <span className="live-stat-icon" aria-hidden="true">
        {item.icon}
      </span>
      <strong>
        {displayValue}
        {item.suffix}
      </strong>
      <span>{item.label}</span>
    </motion.div>
  );
}

function ImpactCard({ item, index }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const Icon = item.icon;

  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const rotateY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 14;
    const rotateX = (((event.clientY - bounds.top) / bounds.height) - 0.5) * -14;
    setRotation({ x: rotateX, y: rotateY });
  };

  return (
    <motion.article
      className="impact-card glass-panel"
      custom={0.1 * index}
      variants={revealUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -12, scale: 1.02 }}
      onMouseMove={handleMove}
      onMouseLeave={() => setRotation({ x: 0, y: 0 })}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
      }}
    >
      <div className="impact-icon-wrap">
        <Icon />
      </div>
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      <span className="impact-highlight">{item.highlight}</span>
    </motion.article>
  );
}

function Home() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const orbitY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="home-page">
      <motion.section
        id="home"
        className="hero-section"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(10, 25, 47, 0.84), rgba(10, 25, 47, 0.55)), url(${heroImg})`,
          backgroundPositionY: heroY,
        }}
      >
        <div className="hero-noise" />

        <motion.div
          className="floating-orb orb-left"
          animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ y: orbitY }}
        />
        <motion.div
          className="floating-orb orb-right"
          animate={{ y: [0, 22, 0], x: [0, -12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="hero-inner">
          <motion.div
            className="hero-copy"
            variants={revealUp}
            initial="hidden"
            animate="visible"
          >
            <motion.span className="eyebrow" custom={0.05} variants={revealUp}>
              Connecting Help to Those Who Need It Most
            </motion.span>

            <motion.div
              className="hero-brand-lockup"
              custom={0.08}
              variants={revealUp}
            >
              <motion.div
                className="hero-logo-shell"
                animate={{ y: [0, -8, 0], rotateZ: [0, 1.5, 0] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <img src={sevalinkLogo} alt="SevaLink logo" className="hero-logo-image" />
              </motion.div>
            </motion.div>

            <motion.h1
              className="hero-title"
              custom={0.12}
              variants={revealUp}
            >
              SevaLink
            </motion.h1>

            <motion.p className="hero-subtitle" custom={0.18} variants={revealUp}>
              Connecting Problems to the Right People
            </motion.p>

            <motion.p className="hero-supporting-copy" custom={0.21} variants={revealUp}>
              A minimal, modern coordination layer for community response,
              built to connect requests, helpers, and trusted networks with
              clarity, speed, and calm.
            </motion.p>

            <motion.div
              className="hero-buttons"
              custom={0.24}
              variants={revealUp}
            >
              <Link to="/auth" className="btn btn-primary hero-link-btn">
                Get Started
              </Link>
              <a href="#features" className="btn btn-secondary hero-link-btn">
                See How It Works
              </a>
            </motion.div>

            <motion.div
              className="hero-stats-grid"
              custom={0.32}
              variants={revealUp}
            >
              {heroStats.map((item) => (
                <div key={item.label} className="hero-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="hero-dashboard-card glass-panel"
              animate={{ y: [0, -10, 0], rotateZ: [0, 1.2, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="dashboard-topline">
                <span>Live Help Network</span>
                <span className="status-dot">Active</span>
              </div>

              <div className="dashboard-main-metric">
                <strong>87%</strong>
                <p>Requests linked to the right responders within the first hour</p>
              </div>

              <div className="dashboard-mini-grid">
                <div className="dashboard-mini-card">
                  <span>Urgent requests</span>
                  <strong>14</strong>
                </div>
                <div className="dashboard-mini-card">
                  <span>Helpers ready</span>
                  <strong>53</strong>
                </div>
              </div>

              <div className="dashboard-progress">
                <div className="dashboard-progress-track">
                  <motion.span
                    className="dashboard-progress-bar"
                    initial={{ width: 0 }}
                    animate={{ width: "78%" }}
                    transition={{ duration: 1.4, delay: 0.5 }}
                  />
                </div>
                <small>Response momentum this week</small>
              </div>
            </motion.div>

            <motion.div
              className="hero-floating-chip chip-top glass-chip"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="chip-icon">
                <PulseIcon />
              </span>
              Real-time routing
            </motion.div>

            <motion.div
              className="hero-floating-chip chip-bottom glass-chip"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="chip-icon">
                <ShieldIcon />
              </span>
              Trusted community links
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="live-stats"
        className="live-stats-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        <motion.div className="section-heading" custom={0} variants={revealUp}>
          <span className="eyebrow">Live Stats</span>
          <h2>Visible momentum that makes SevaLink feel alive.</h2>
          <p>
            A quick pulse check on how the platform is helping people, solving
            problems, and building trust across communities.
          </p>
        </motion.div>

        <div className="live-stats-grid">
          {liveStats.map((item, index) => (
            <CountUpStat key={item.label} item={item} index={index + 1} />
          ))}
        </div>
      </motion.section>

      <motion.section
        id="features"
        className="features-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div className="section-heading" custom={0} variants={revealUp}>
          <span className="eyebrow">Why SevaLink works</span>
          <h2>Helping hands, strong links, and a network that feels immediate.</h2>
          <p>
            The interface is designed to feel minimal and premium while giving
            teams the depth they need to respond with speed and confidence.
          </p>
        </motion.div>

        <div className="features-grid">
          {featureCards.map((feature, index) => (
            <TiltCard key={feature.title} feature={feature} index={index + 1} />
          ))}
        </div>
      </motion.section>

      <motion.section
        id="impact-video"
        className="impact-video-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div className="section-heading impact-video-heading" custom={0} variants={revealUp}>
          <span className="eyebrow">Real Stories</span>
          <h2>{impactStory.title}</h2>
          <p>{impactStory.subtitle}</p>
        </motion.div>

        <div className="impact-video-shell">
          <motion.div
            className="floating-orb orb-video-left"
            animate={{ y: [0, -18, 0], x: [0, 14, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="floating-orb orb-video-right"
            animate={{ y: [0, 20, 0], x: [0, -12, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="impact-video-frame glass-panel"
            initial={{ opacity: 0, scale: 0.92, y: 36 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.015, y: -6 }}
          >
            <div className="impact-video-topline">
              <span className="impact-video-badge">Community Impact Story</span>
              <span className="impact-video-toggle impact-video-toggle-static">
                SevaLink in the field
              </span>
            </div>

            <div className="impact-video-wrapper">
              <img
                className="impact-video-player impact-story-image"
                src={impactStoryImage}
                alt="SevaLink volunteers supporting food distribution, education, medical aid, flood relief, and elderly care"
              />

              <div className="impact-video-overlay" aria-hidden="true">
                <motion.span
                  className="impact-video-play"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.92, 1, 0.92] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="impact-video-play-icon impact-story-heart" />
                </motion.span>
              </div>
            </div>

            <p className="impact-video-caption">{impactStory.caption}</p>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        id="testimonials"
        className="testimonials-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        <motion.div className="section-heading" custom={0} variants={revealUp}>
          <span className="eyebrow">Real Voices</span>
          <h2>Proof that the platform creates real-world trust.</h2>
          <p>
            Stories from teams, volunteers, and people who received help when
            they needed it most.
          </p>
        </motion.div>

        <div className="testimonials-shell">
          <motion.div
            className="floating-orb orb-testimonial"
            animate={{ y: [0, -16, 0], x: [0, 10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <AnimatePresence mode="wait">
            <motion.article
              key={activeTestimonial}
              className="testimonial-card glass-panel"
              initial={{ opacity: 0, scale: 0.94, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -18 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="quote-mark" aria-hidden="true">
                "
              </span>
              <p>{testimonials[activeTestimonial].quote}</p>
              <strong>{testimonials[activeTestimonial].author}</strong>
            </motion.article>
          </AnimatePresence>

          <div className="testimonial-dots">
            {testimonials.map((testimonial, index) => (
              <button
                key={testimonial.author}
                type="button"
                className={index === activeTestimonial ? "active" : ""}
                onClick={() => setActiveTestimonial(index)}
                aria-label={`Show testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        id="impact"
        className="impact-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.div className="section-heading" custom={0} variants={revealUp}>
          <span className="eyebrow">Real-World Impact</span>
          <h2>Built for missions where human support meets meaningful action.</h2>
          <p>
            SevaLink strengthens <span className="gradient-text">rapid response</span>,{" "}
            <span className="gradient-text">community resilience</span>, and{" "}
            <span className="gradient-text">practical help</span> across the moments that matter.
          </p>
        </motion.div>

        <div className="impact-grid">
          {impactAreas.map((item, index) => (
            <ImpactCard key={item.title} item={item} index={index + 1} />
          ))}
        </div>
      </motion.section>

      <motion.section
        id="about"
        className="about-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div className="about-copy glass-panel" custom={0.05} variants={revealUp}>
          <span className="eyebrow">About SevaLink</span>
          <h2>A clean system for turning community problems into coordinated action.</h2>
          <p>
            SevaLink blends helping hands, human connection, and a responsive
            network into one focused product experience for organizers and volunteers.
          </p>
          <p>
            From the first request to the final resolution, the product is built
            to keep momentum visible and make support feel intentional instead
            of chaotic.
          </p>
        </motion.div>

        <motion.div
          className="about-visual glass-panel"
          custom={0.16}
          variants={revealUp}
          whileHover={{ rotateY: -6, rotateX: 4, scale: 1.01 }}
        >
          <div className="about-visual-image" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="about-overlay-card">
            <span>Connected Reach</span>
            <strong>12 Cities</strong>
            <p>Coordinating requests, response teams, and trusted partners across campaigns and urgent needs.</p>
          </div>
        </motion.div>
      </motion.section>

      <Footer />
    </div>
  );
}

function MatchIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 30c3.4-5.6 7.8-8.4 13-8.4S31.6 24.4 35 30" />
      <path d="M16 19l8 8 8-8" />
      <circle cx="24" cy="24" r="18" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="12" cy="14" r="5" />
      <circle cx="36" cy="14" r="5" />
      <circle cx="24" cy="34" r="5" />
      <path d="M16 16l16 0M14.5 18.5l7 10M33.5 18.5l-7 10" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 24h8l4-8 6 16 5-10 3 2h10" />
      <rect x="8" y="10" width="32" height="28" rx="8" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 7l13 5v10c0 8.5-5.1 14.7-13 18-7.9-3.3-13-9.5-13-18V12l13-5Z" />
      <path d="m18 24 4 4 8-9" />
    </svg>
  );
}

function ReliefIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 7v34M7 24h34" />
      <circle cx="24" cy="24" r="17" />
    </svg>
  );
}

function EducationIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 18 24 10l16 8-16 8-16-8Z" />
      <path d="M14 22v8c0 3 5 6 10 6s10-3 10-6v-8" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="12" width="28" height="24" rx="8" />
      <path d="M24 18v12M18 24h12" />
    </svg>
  );
}

function GrowthIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M10 34h28" />
      <path d="M16 34V22M24 34V16M32 34V12" />
      <path d="m14 20 10-8 10 4" />
    </svg>
  );
}

export default Home;

