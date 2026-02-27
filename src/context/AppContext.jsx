import { createContext, useContext, useState, useEffect } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = matchMedia("(min-width: 1024px)");

    const updateScreen = () => {
      const desktop = mediaQuery.matches;
      setIsDesktop(desktop);
      setSidebarOpen(desktop); // auto-open on desktop, close on mobile
    };

    updateScreen();
    mediaQuery.addEventListener("change", updateScreen);
    return () => mediaQuery.removeEventListener("change", updateScreen);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <AppContext.Provider
      value={{ sidebarOpen, isDesktop, toggleSidebar, closeSidebar }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}
