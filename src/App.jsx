import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./components/navbar/Navbar.jsx";
import Side_bar from "./components/Side_bar/Side_bar.jsx";
import Info from "./components/info/Info.jsx";
import Setting_page from "./components/setting_page/Setting_page.jsx";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateScreen = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(true);
      }
    };

    updateScreen();
    window.addEventListener("resize", updateScreen);
    return () => window.removeEventListener("resize", updateScreen);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <Router>
        <div className="flex min-h-screen bg-slate-50">
          <Side_bar isOpen={sidebarOpen} onClose={closeSidebar} />

          <div className="flex min-h-screen flex-1 flex-col">
            <Navbar showMenuButton={!isDesktop} onMenuClick={toggleSidebar} />
            <Routes>
              <Route path="/info" element={<Info />} />
              <Route path="/settings" element={<Setting_page />} />
            </Routes>
          </div>
        </div>
      </Router>
    </>
  );
}

export default App;
