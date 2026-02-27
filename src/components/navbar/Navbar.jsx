import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAppContext } from "../../context/AppContext.jsx";

const Navbar = () => {
  const { isDesktop, sidebarOpen, toggleSidebar } = useAppContext();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-5 shadow-sm">
      <div className="flex items-center gap-3">
        {/* Hamburger / Close — only visible on mobile */}
        {!isDesktop && (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-slate-800 lg:hidden"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            onClick={toggleSidebar}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        <div className="text-lg font-bold tracking-wide text-slate-900">
          Foodbnb Super Admin
        </div>
      </div>
    </header>
  );
};

export default Navbar;
