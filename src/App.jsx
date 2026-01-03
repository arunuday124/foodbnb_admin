import { useEffect, useState, memo } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./components/navbar/Navbar.jsx";
import Side_bar from "./components/Side_bar/Side_bar.jsx";
import Setting_page from "./components/setting_page/Setting_page.jsx";
import Charts from "./components/charts/Charts.jsx";
import Analytics from "./components/analytics/Analytics.jsx";
import Orders from "./components/orders/Orders.jsx";
import Customer from "./components/customers/Customer.jsx";
import Delivery from "./components/delivery/Delivery.jsx";
import Login_Auth from "./components/Login/Login_Auth.jsx";
import Restaurant from "./components/restaurant/Restaurant.jsx";

// Memoize page components to prevent re-renders when parent state changes
const MemoCharts = memo(Charts);
const MemoAnalytics = memo(Analytics);
const MemoOrders = memo(Orders);
const MemoCustomer = memo(Customer);
const MemoDelivery = memo(Delivery);
const MemoSettings = memo(Setting_page);
const MemoRestaurant = memo(Restaurant);

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
        <Routes>
          {/* Login Route - No navbar or sidebar */}
          <Route path="/login" element={<Login_Auth />} />

          {/* Dashboard Routes - With navbar and sidebar */}
          <Route
            path="/*"
            element={
              <>
                <Navbar
                  showMenuButton={!isDesktop}
                  onMenuClick={toggleSidebar}
                  sidebarOpen={sidebarOpen}
                />

                <Side_bar isOpen={sidebarOpen} onClose={closeSidebar} />

                <main className="fixed top-16 left-0 right-0 bottom-0 lg:left-64 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<MemoCharts />} />
                    <Route path="/charts" element={<MemoCharts />} />
                    <Route path="/settings" element={<MemoSettings />} />
                    <Route path="/analytics" element={<MemoAnalytics />} />
                    <Route path="/orders" element={<MemoOrders />} />
                    <Route path="/customers" element={<MemoCustomer />} />
                    <Route path="/delivery" element={<MemoDelivery />} />
                    <Route path="/restaurant" element={<Restaurant />} />
                  </Routes>
                </main>
              </>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
