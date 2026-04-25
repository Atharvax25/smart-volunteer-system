import "./App.css";
import Navbar from "./Navbar";

import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Home from "./Home";
import Tasks from "./Tasks";
import Admin from "./Admin";
import Auth from "./Auth";
import IntroScreen from "./IntroScreen";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(() => location.pathname === "/");
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    if (location.pathname !== "/") {
      setShowIntro(false);
      return undefined;
    }

    setShowIntro(true);
    const timer = window.setTimeout(() => {
      setShowIntro(false);
      navigate("/home", { replace: true });
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (showIntro) {
      setScroll(0);
      return undefined;
    }

    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPosition = window.scrollY;
      const progress =
        totalHeight > 0 ? (scrollPosition / totalHeight) * 100 : 0;

      setScroll(progress);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showIntro]);

  if (showIntro) {
    return <IntroScreen />;
  }

  return (
    <>
      <div className="scroll-bar" style={{ width: `${scroll}%` }}></div>

      <Navbar />
      <ToastContainer />

      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
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
