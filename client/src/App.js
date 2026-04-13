import "./App.css";
import Navbar from "./Navbar";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import Home from "./Home";
import Tasks from "./Tasks";
import Volunteer from "./Volunteer";
import Admin from "./Admin";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPosition = window.scrollY;
      setScroll((scrollPosition / totalHeight) * 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Router>

      {/* 🔥 SCROLL PROGRESS BAR */}
      <div
        className="scroll-bar"
        style={{ width: `${scroll}%` }}
      ></div>

      {/* NAVBAR */}
      <Navbar />
      <ToastContainer />

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      

    </Router>
  );
}

export default App;