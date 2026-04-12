import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Task from "./Task";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/task" element={<Task />} />
      </Routes>
    </Router>
  );
}

export default App;