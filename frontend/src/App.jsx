import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppHeader from "./components/layout/AppHeader";
import Dashboard from "./pages/Dashboard";
import Squad from "./pages/Squad";
import Matches from "./pages/Matches";
import PointTable from "./pages/PointTable";

function App() {
  return (
    <Router>
      <div className="app">
        <AppHeader />
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/squads" element={<Squad />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/points-table" element={<PointTable />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

// Made with Bob
