import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navItemsBase = [
  { to: "/dashboard", label: "Home", icon: "🏠" },
  { to: "/billing", label: "New Bill", icon: "🧾" },
  { to: "/bills", label: "Bills", icon: "📋" },
];

const adminExtraItems = [
  { to: "/products", label: "Products", icon: "📦" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/staff", label: "Staff", icon: "👥" },
];

const Layout = ({ children }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const navItems = isAdmin ? [...navItemsBase, ...adminExtraItems] : navItemsBase;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-8 px-2">
          <h1 className="text-xl font-bold text-primary-700">❄️ Frozen Shop</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.name} ({user?.role})</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="btn-secondary mt-4 w-full">
          Logout
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20">
        <h1 className="text-lg font-bold text-primary-700">❄️ Frozen Shop</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 font-medium">
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 pb-24 md:pb-4 md:p-6 max-w-5xl w-full mx-auto">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 z-20 overflow-x-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center px-2 py-1.5 rounded-lg text-xs min-w-[60px] ${
                isActive ? "text-primary-600 font-semibold" : "text-gray-500"
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
