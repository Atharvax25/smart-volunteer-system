import "./App.css";
import Navbar from "./Navbar";
import Chatbot from "./components/Chatbot";
import BackToTop from "./components/BackToTop";

import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import IntroScreen from "./IntroScreen";
import Loader from "./Loader";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Home = lazy(() => import("./Home"));
const Tasks = lazy(() => import("./Tasks"));
const Admin = lazy(() => import("./Admin"));
const Auth = lazy(() => import("./Auth"));
const INTRO_SEEN_KEY = "sevalink-intro-seen";

function AppShell() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return sessionStorage.getItem(INTRO_SEEN_KEY) !== "true";
  });
  const scrollBarRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!showIntro) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_SEEN_KEY, "true");
      setShowIntro(false);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    if (showIntro) {
      if (scrollBarRef.current) {
        scrollBarRef.current.style.width = "0%";
      }
      return undefined;
    }

    let ticking = false;
    const handleScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        const totalHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const scrollPosition = window.scrollY;
        const progress =
          totalHeight > 0 ? (scrollPosition / totalHeight) * 100 : 0;

        if (scrollBarRef.current) {
          scrollBarRef.current.style.width = `${progress}%`;
        }

        ticking = false;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showIntro]);

  if (showIntro) {
    return <IntroScreen />;
  }

  const showChatbot = location.pathname !== "/auth";

  return (
    <>
      <div className="scroll-bar" ref={scrollBarRef}></div>

      <Navbar />
      <ToastContainer />

      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/tasks/*" element={<Tasks />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </Suspense>

      <BackToTop />
      {showChatbot ? <Chatbot /> : null}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
