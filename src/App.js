import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Booking from "./Booking";
import Staff from "./Staff"; // New Staff component
import Admin from "./Admin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Booking />} />        {/* Customer Page */}
        <Route path="/staff" element={<Staff />} />     {/* Staff/User Page */}
        <Route path="/admin" element={<Admin />} />     {/* Owner/Admin Page */}
      </Routes>
    </Router>
  );
}

export default App;
