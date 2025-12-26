import React from "react";
import { Home, PieChart, Settings, Users, X, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: Home, href: "/info" },
  { label: "Users", icon: Users, href: "/users" },
  { label: "Analytics", icon: PieChart, href: "/analytics" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const Side_bar = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Desktop sidebar (always open on large screens) */}
      <aside className="hidden lg:flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            FB
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Foodbnb</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                to={item.href} // navigate to the page
                key={item.label}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]">
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
          <button className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99] cursor-pointer hover:bg-slate-300 ">
            Logout
            <LogOut size={18} className="mr-2" />
          </button>
        </div>
      </aside>

      {/* Mobile / tablet sidebar (slide-in) */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}>
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

        <aside className="relative h-full w-72 max-w-[80vw] border-r border-slate-200 bg-white shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                FB
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Foodbnb</p>
                <p className="text-xs text-slate-500">Admin Console</p>
              </div>
            </div>
            <button
              aria-label="Close sidebar"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:text-slate-800">
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  to={item.href} // navigate to the page
                  key={item.label}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]"
                  onClick={onClose} // closes mobile sidebar
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
            <button className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]">
              Logout
              <LogOut size={18} className="mr-2" />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Side_bar;
