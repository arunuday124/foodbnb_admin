import { memo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Firebase";
import "./App.css";

// ── Context Providers ────────────────────────────────────────────
import { AppProvider, useAppContext } from "./context/AppContext";

import { DeliveryProvider } from "./context/Deliverycontext.jsx";

// ── Page Components ──────────────────────────────────────────────
import Navbar from "./components/navbar/Navbar.jsx";
import Side_bar from "./components/Side_bar/Side_bar.jsx";
import Setting_page from "./components/setting_page/Setting_page.jsx";
import Charts from "./components/charts/Charts.jsx";
import Analytics from "./components/analytics/Analytics.jsx";
import Orders from "./components/orders/Orders.jsx";
import Customer from "./components/customers/Customer.jsx";
import Delivery from "./components/delivery/Delivery.jsx";
import Login_Auth from "./components/Login/AdminLogin.jsx";
import Restaurant from "./components/restaurant/Restaurant.jsx";
import Support from "./components/Support/Support.jsx";

// Memoize pages — they only re-render when THEIR context changes
const MemoCharts = memo(Charts);
const MemoAnalytics = memo(Analytics);
const MemoOrders = memo(Orders);
const MemoCustomer = memo(Customer);
const MemoDelivery = memo(Delivery);
const MemoSettings = memo(Setting_page);
const MemoRestaurant = memo(Restaurant);
const MemoSupport = memo(Support);

// ── Loading Screen ───────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

// ── Back-button blocker (authenticated routes only) ──────────────
function BackButtonBlocker() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/login") return;
    history.pushState(null, "", location.pathname);
    const block = () => history.pushState(null, "", location.pathname);
    addEventListener("popstate", block);
    return () => removeEventListener("popstate", block);
  }, [location.pathname]);

  return null;
}

// ── Auth guard ───────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) =>
      setIsAuthenticated(!!user),
    );
    return () => unsub();
  }, []);

  if (isAuthenticated === null) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// ── Shared layout shell ──────────────────────────────────────────
function DashboardShell({ children }) {
  const { sidebarOpen, isDesktop, toggleSidebar, closeSidebar } =
    useAppContext();

  return (
    <>
      <Navbar showMenuButton={!isDesktop} onMenuClick={toggleSidebar} />
      <Side_bar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="fixed top-16 left-0 right-0 bottom-0 lg:left-64 overflow-y-auto">
        {children}
      </main>
    </>
  );
}

// Convenience wrapper: auth guard + layout shell
function ProtectedPage({ children }) {
  return (
    <ProtectedRoute>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedRoute>
  );
}

// ── Routes ───────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <BackButtonBlocker />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login_Auth />} />
        <Route
          path="/charts"
          element={
            <ProtectedPage>
              <MemoCharts />
            </ProtectedPage>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedPage>
              <MemoSettings />
            </ProtectedPage>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedPage>
              <MemoAnalytics />
            </ProtectedPage>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedPage>
              <MemoOrders />
            </ProtectedPage>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedPage>
              <MemoCustomer />
            </ProtectedPage>
          }
        />
        <Route
          path="/delivery"
          element={
            <ProtectedPage>
              <MemoDelivery />
            </ProtectedPage>
          }
        />
        <Route
          path="/restaurant"
          element={
            <ProtectedPage>
              <MemoRestaurant />
            </ProtectedPage>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedPage>
              <MemoSupport />
            </ProtectedPage>
          }
        />
      </Routes>
    </>
  );
}

// ── Root App ─────────────────────────────────────────────────────
// All feature providers live above <AppRoutes />.
// This means every Firestore subscription starts once when App
// mounts and survives route changes — no re-fetching on navigation.
// Each provider is independent: Orders updating won't re-render
// the Customers page because they consume different contexts.
function App() {
  return (
    <Router>
      <AppProvider>
        <DeliveryProvider>
          <AppRoutes />
        </DeliveryProvider>
      </AppProvider>
    </Router>
  );
}

export default App;
