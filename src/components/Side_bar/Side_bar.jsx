import React from "react";
import {
  Home,
  PieChart,
  Settings,
  Users,
  LogOut,
  ShoppingBag,
  PackageOpen,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Dashboard", icon: Home, href: "/charts" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Orders", icon: ShoppingBag, href: "/orders" },
  { label: "Delivery", icon: PackageOpen, href: "/delivery" },
  { label: "Analytics", icon: PieChart, href: "/analytics" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

const Side_bar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:flex h-[calc(100vh-64px)] w-64 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm top-16 left-0 z-40">
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
            FB
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Foodbnb</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]">
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-200 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-bold text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]">
            Logout
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transform transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}>
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

        <aside className="relative h-full w-72 border-r border-slate-200 bg-white shadow-xl flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              FB
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Foodbnb</p>
              <p className="text-xs text-slate-500">Admin Console</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]">
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-slate-200 p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 active:scale-[0.99]">
              Logout
              <LogOut size={18} />
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Side_bar;
