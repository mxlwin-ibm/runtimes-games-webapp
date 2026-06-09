import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppHeader from "./components/layout/AppHeader";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
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
            <Route path="/teams" element={<Teams />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/point-table" element={<PointTable />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

// Made with Bob
