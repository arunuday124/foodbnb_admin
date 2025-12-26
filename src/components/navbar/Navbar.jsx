import React, { useState } from "react";
import { Menu, Search, User, X } from "lucide-react";

const Navbar = ({ showMenuButton, onMenuClick }) => {
  const [showSearch, setShowSearch] = useState(false);
  const toggleSearch = () => setShowSearch((prev) => !prev);

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-5 shadow-sm">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-slate-800 lg:hidden"
            aria-label="Open sidebar"
            onClick={onMenuClick}>
            <Menu size={18} />
          </button>
        )}
        <div
          className={`text-lg font-bold tracking-wide text-slate-900 ${
            showSearch ? "hidden sm:block" : ""
          }`}>
          Foodbnb
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-base font-semibold text-slate-800 hidden sm:block">
        Admin panel
      </div>

      <div className="flex items-center gap-3.5">
        <div className="relative flex h-10 items-center min-w-0">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-700"
            aria-label={showSearch ? "Close search" : "Open search"}
            onClick={toggleSearch}>
            {showSearch ? <X size={18} /> : <Search size={18} />}
          </button>

          <div
            className="overflow-hidden transition-all duration-200 ease-in-out"
            style={{
              width: showSearch ? "min(240px, calc(100vw - 150px))" : "0px",
              opacity: showSearch ? 1 : 0,
              marginLeft: showSearch ? "10px" : "0px",
            }}>
            <div className="relative">
              <Search
                size={22}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                className="h-10 w-60 max-w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-3 text-sm text-slate-900 outline-none shadow-inner shadow-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                type="search"
                placeholder="Search..."
                aria-label="Search"
                autoFocus={showSearch}
              />
            </div>
          </div>
        </div>

        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-600 bg-linear-to-br from-blue-600 to-blue-700 text-white shadow-md"
          aria-label="Profile">
          <User size={18} strokeWidth={2.2} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
