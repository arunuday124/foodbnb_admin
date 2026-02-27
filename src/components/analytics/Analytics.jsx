import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Users, ChevronRight } from "lucide-react";
import { useAnalytics } from "../../context/Analyticscontext.jsx";

const AnimatedNumber = ({ value }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.ceil(value / 60);
    const timer = setInterval(() => {
      n = Math.min(n + step, value);
      setCount(n);
      if (n >= value) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count.toLocaleString()}</span>;
};

// Leaflet map — concentric hotspot circles + SVG pin with initials for each customer
const CustomerMap = ({ users }) => {
  const container = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!users || users.length === 0 || !container.current) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.async = true;
    script.onload = () => {
      if (map.current) return;

      const coords = users
        .map((u) => {
          const loc = u.location;
          if (!loc) return null;
          const lat = loc.latitude ?? loc.lat ?? null;
          const lng = loc.longitude ?? loc.lng ?? null;
          if (lat == null || lng == null || isNaN(lat) || isNaN(lng))
            return null;
          return { ...u, lat: parseFloat(lat), lng: parseFloat(lng) };
        })
        .filter(Boolean);

      if (coords.length === 0) return;

      const centerLat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
      const centerLng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;

      map.current = window.L.map(container.current).setView(
        [centerLat, centerLng],
        11,
      );
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map.current);

      const maxOrders = Math.max(...coords.map((c) => c.noOfOrders), 1);
      const minOrders = Math.min(...coords.map((c) => c.noOfOrders), 1);

      coords.forEach((u) => {
        // Opacity based on order count
        let opacity;
        if (maxOrders === minOrders) {
          opacity = 0.6;
        } else {
          opacity =
            0.2 + ((u.noOfOrders - minOrders) / (maxOrders - minOrders)) * 0.6;
        }

        const radius = 20 + (u.noOfOrders / maxOrders) * 80;

        // 1. Three concentric hotspot circles (outer → inner, increasing opacity)
        const layers = [
          { radius: radius, opacity: opacity * 0.3 },
          { radius: radius * 0.7, opacity: opacity * 0.6 },
          { radius: radius * 0.4, opacity: opacity * 0.9 },
        ];

        layers.forEach((layer) => {
          window.L.circleMarker([u.lat, u.lng], {
            radius: layer.radius,
            fillColor: "#FF5A5F",
            color: "#FF5A5F",
            weight: 0,
            opacity: 0,
            fillOpacity: layer.opacity,
          }).addTo(map.current);
        });

        // 2. Main clickable hotspot circle
        window.L.circleMarker([u.lat, u.lng], {
          radius: radius * 0.5,
          fillColor: "#FF5A5F",
          color: "#CC4449",
          weight: 2,
          opacity: opacity,
          fillOpacity: opacity * 0.7,
        })
          .bindPopup(
            `<div style="padding:10px;text-align:center;">
              <strong style="font-size:13px;">${u.name}</strong>
              <p style="font-size:11px;color:#666;margin-top:4px;">Orders: ${u.noOfOrders}</p>
            </div>`,
          )
          .addTo(map.current);

        // 3. SVG pin with user initials on top
        const initials = (u.name || "?")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const pinColors = [
          "#ef4444",
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#ec4899",
          "#06b6d4",
          "#f97316",
          "#84cc16",
          "#6366f1",
        ];
        const pinColor = pinColors[coords.indexOf(u) % pinColors.length];

        const pinHTML = `
          <div style="position:relative;width:60px;height:70px;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 32 40" width="40" height="50" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C8.27 0 2 6.27 2 14c0 7.73 14 26 14 26s14-18.27 14-26c0-7.73-6.27-14-14-14z"
                fill="${pinColor}" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="14" r="6" fill="white"/>
            </svg>
            <div style="position:absolute;top:8px;font-size:9px;font-weight:700;color:${pinColor};letter-spacing:-0.5px;">
              ${initials}
            </div>
          </div>
        `;

        const pinIcon = window.L.divIcon({
          html: pinHTML,
          iconSize: [60, 70],
          iconAnchor: [30, 70],
          popupAnchor: [0, -70],
          className: "",
        });

        window.L.marker([u.lat, u.lng], { icon: pinIcon, zIndexOffset: 200 })
          .bindPopup(
            `<div style="padding:10px;min-width:140px;">
              <strong style="font-size:13px;">${u.name}</strong>
              <p style="font-size:11px;color:#555;margin-top:4px;">Orders: <b>${u.noOfOrders}</b></p>
              <p style="font-size:10px;color:#999;margin-top:2px;">📍 ${u.lat.toFixed(4)}, ${u.lng.toFixed(4)}</p>
            </div>`,
          )
          .addTo(map.current);
      });
    };
    document.body.appendChild(script);
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [users]);

  return (
    <div
      ref={container}
      className="w-full rounded-lg"
      style={{ minHeight: "400px" }}
    />
  );
};

const Analytics = () => {
  const { analyticsData, loading } = useAnalytics();
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading) setLoaded(true);
  }, [loading]);

  if (loading || !analyticsData) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
          <p className="mt-4 text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const {
    revenueData,
    totalRevenue,
    cancelledOrders,
    orderFrequency,
    totalCustomers,
    firstTimeCustomers,
    firstTimeOrders,
    usersWithOrders,
  } = analyticsData;

  const PER_PAGE = 6;
  const totalPages = Math.ceil(revenueData.length / PER_PAGE);
  const pageData = revenueData.slice(
    page * PER_PAGE,
    page * PER_PAGE + PER_PAGE,
  );

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Business performance and customer insights
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Customers", value: totalCustomers, positive: true },
            {
              label: "First Time Customers",
              value: firstTimeCustomers,
              positive: true,
            },
            {
              label: "Cancelled Orders",
              value: cancelledOrders,
              positive: false,
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow">
              <p className="text-sm text-gray-500 mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                <AnimatedNumber value={s.value} />
              </p>
              <div className="flex items-center gap-1">
                {s.positive ? (
                  <TrendingUp size={15} className="text-green-600" />
                ) : (
                  <TrendingDown size={15} className="text-red-600" />
                )}
                <span
                  className={`text-sm ${s.positive ? "text-green-600" : "text-red-600"}`}>
                  vs last month
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Customer Location Heatmap
              </h2>
              <p className="text-sm text-gray-500">
                {usersWithOrders.length} customers plotted
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
          </div>
          {usersWithOrders.length > 0 ? (
            <CustomerMap users={usersWithOrders} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No location data available
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Revenue by Month
            </h2>
            <div className="space-y-5">
              {pageData.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-800">
                      {item.month}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {item.revenue}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({item.orders})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: loaded ? `${item.percentage}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                {page > 0 && (
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800">
                    <ChevronRight size={13} className="rotate-180" /> Prev
                  </button>
                )}
                <span className="text-xs text-gray-400">
                  {page + 1}/{totalPages}
                </span>
                {page < totalPages - 1 && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs text-green-600 flex items-center gap-1 font-medium hover:text-green-700">
                    Next <ChevronRight size={13} />
                  </button>
                )}
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Total Revenue
              </span>
              <span className="text-2xl font-bold text-green-600">
                ₹{totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Customer Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Customer Insights
            </h2>
            <div className="bg-purple-50 rounded-lg p-5 mb-5">
              <p className="text-sm text-purple-700 font-medium mb-1">
                Total Customers
              </p>
              <p className="text-4xl font-bold text-purple-900">
                <AnimatedNumber value={totalCustomers} />
              </p>
              <p className="text-sm text-purple-500 mt-1">
                +{firstTimeOrders} first time orders
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium mb-1">
                  First Time Orders
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  <AnimatedNumber value={firstTimeOrders} />
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  {totalCustomers
                    ? ((firstTimeOrders / totalCustomers) * 100).toFixed(1)
                    : 0}
                  % of total
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-xs text-red-600 font-medium mb-1">
                  Cancelled
                </p>
                <p className="text-2xl font-bold text-red-900">
                  <AnimatedNumber value={cancelledOrders} />
                </p>
                <p className="text-xs text-red-400 mt-1">Cancelled orders</p>
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Order Frequency
            </h3>
            <div className="space-y-4">
              {orderFrequency.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {item.count} orders ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${item.color} h-2 rounded-full transition-all duration-1000`}
                      style={{ width: loaded ? `${item.percentage}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
