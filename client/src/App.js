import "./App.css";
import Navbar from "./Navbar";

import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
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
  const [showIntro, setShowIntro] = useState(true);
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowIntro(false);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, []);

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
