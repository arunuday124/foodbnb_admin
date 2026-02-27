import { useState, useRef, useEffect, useMemo } from "react";
import { Mail, Phone, MapPin, Star, Zap, Award, Search } from "lucide-react";
import { useDelivery } from "../../context/Deliverycontext";

const COLORS = [
  "bg-purple-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-indigo-500",
];

const initials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const Delivery = () => {
  const {
    activeDrivers,
    inactiveDrivers,
    activeOrdersCount,
    loading,
    loadingMore,
    hasMoreInactive,
    loadMoreInactive,
  } = useDelivery();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");
  const [showMap, setShowMap] = useState(false);

  const stats = useMemo(() => {
    const all = [...activeDrivers, ...inactiveDrivers];
    const avgRating = all.length
      ? (
          all.reduce((s, d) => s + (parseFloat(d.rating) || 0), 0) / all.length
        ).toFixed(1)
      : "0.0";
    return {
      active: activeDrivers.length,
      total: all.length,
      avgRating,
      orders: activeOrdersCount,
    };
  }, [activeDrivers, inactiveDrivers, activeOrdersCount]);

  const filterDrivers = (list) =>
    search.trim()
      ? list.filter((d) =>
          (d.name || "").toLowerCase().includes(search.toLowerCase()),
        )
      : list;

  const filteredActive = filterDrivers(activeDrivers);
  const filteredInactive = filterDrivers(inactiveDrivers);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          <p className="mt-4 text-slate-500">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-1">
          Delivery Drivers
        </h1>
        <p className="text-slate-500">Manage your delivery team</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Active Drivers",
            value: stats.active,
            icon: MapPin,
            bg: "bg-green-50",
            ic: "text-green-600",
          },
          {
            label: "Total Drivers",
            value: stats.total,
            icon: Zap,
            bg: "bg-blue-50",
            ic: "text-blue-600",
          },
          {
            label: "Avg Rating",
            value: stats.avgRating,
            icon: Award,
            bg: "bg-yellow-50",
            ic: "text-yellow-600",
          },
          {
            label: "Active Orders",
            value: stats.orders,
            icon: Star,
            bg: "bg-orange-50",
            ic: "text-orange-600",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-slate-800">{s.value}</p>
              </div>
              <div className={`p-2.5 ${s.bg} rounded-lg`}>
                <s.icon className={s.ic} size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <button
          onClick={() => setTab("active")}
          className={`px-5 py-3 rounded-lg font-medium text-sm transition ${tab === "active" ? "bg-green-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
          Active ({activeDrivers.length})
        </button>
        <button
          onClick={() => setTab("inactive")}
          className={`px-5 py-3 rounded-lg font-medium text-sm transition ${tab === "inactive" ? "bg-red-500 text-white" : "bg-white text-slate600 border border-slate-200 hover:bg-slate-50"}`}>
          Inactive ({inactiveDrivers.length}
          {hasMoreInactive ? "+" : ""})
        </button>
        <button
          onClick={() => setShowMap((p) => !p)}
          className={`px-5 py-3 rounded-lg font-medium text-sm transition ${showMap ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
          {showMap ? "Hide Map" : "Show Map"}
        </button>
      </div>

      {/* Map */}
      {showMap && (
        <div className="mb-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <DeliveryMap drivers={activeDrivers} />
        </div>
      )}

      {/* Active tab */}
      {tab === "active" && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Active Drivers ({filteredActive.length})
          </h2>
          {filteredActive.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredActive.map((d) => (
                <DriverCard key={d.id} driver={d} />
              ))}
            </div>
          ) : (
            <Empty text="No active drivers" />
          )}
        </div>
      )}

      {/* Inactive tab */}
      {tab === "inactive" && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Inactive Drivers ({filteredInactive.length}
            {hasMoreInactive ? "+" : ""})
          </h2>
          {filteredInactive.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredInactive.map((d) => (
                <DriverCard key={d.id} driver={d} />
              ))}
            </div>
          ) : (
            <Empty text="No inactive drivers" />
          )}
          {/* Load next 10 from Firestore */}
          {hasMoreInactive && !search && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreInactive}
                disabled={loadingMore}
                className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed transition text-sm font-medium">
                {loadingMore ? "Loading..." : "Load Next 10 Drivers"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Empty = ({ text }) => (
  <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200">
    {text}
  </div>
);

const DriverCard = ({ driver }) => {
  const color = COLORS[driver.name?.charCodeAt(0) % COLORS.length] || COLORS[0];
  const isActive = (driver.activeOrders || 0) > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`${color} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow`}>
            {initials(driver.name)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">{driver.name}</h3>
            <p className="text-sm text-slate-500">
              {driver.vechicleType || "N/A"}
            </p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 text-xs font-medium rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {driver.rating > 0 && (
        <div className="flex items-center gap-1 mb-3">
          <Star className="text-yellow-400 fill-yellow-400" size={14} />
          <span className="text-sm font-semibold text-slate-700">
            {parseFloat(driver.rating).toFixed(1)}
          </span>
        </div>
      )}

      <div className="space-y-1.5 text-sm text-slate-600 mb-4">
        {driver.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-slate-400" />
            <span className="truncate">{driver.email}</span>
          </div>
        )}
        {driver.phone && (
          // phone is a number in DB
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-slate-400" />
            <span>{String(driver.phone)}</span>
          </div>
        )}
        {driver.address && (
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-slate-400" />
            <span className="truncate">{driver.address}</span>
          </div>
        )}
        {driver.licencePlate && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              {driver.licencePlate}
            </span>
          </div>
        )}
      </div>

      <div
        className={`p-3 rounded-lg ${isActive ? "bg-orange-50 border border-orange-100" : "bg-slate-50 border border-slate-100"}`}>
        <p
          className={`text-sm font-medium ${isActive ? "text-orange-700" : "text-slate-400"}`}>
          {driver.activeOrders || 0} active{" "}
          {(driver.activeOrders || 0) === 1 ? "order" : "orders"}
        </p>
      </div>
    </div>
  );
};

// Leaflet map for active drivers — currentLocation is a GeoPoint
const DeliveryMap = ({ drivers }) => {
  const container = useRef(null);
  const map = useRef(null);

  useEffect(() => {
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
      if (!container.current || map.current) return;

      // currentLocation is a GeoPoint — confirmed: [23.83605° N, 91.27939° E]
      const valid = drivers
        .map((d) => {
          const loc = d.currentLocation;
          if (!loc) return null;
          const lat = loc.latitude ?? loc.lat ?? null;
          const lng = loc.longitude ?? loc.lng ?? null;
          if (lat == null || lng == null) return null;
          return { ...d, lat: parseFloat(lat), lng: parseFloat(lng) };
        })
        .filter(Boolean);

      const centerLat = valid.length ? valid[0].lat : 23.735;
      const centerLng = valid.length ? valid[0].lng : 91.746;

      map.current = window.L.map(container.current).setView(
        [centerLat, centerLng],
        valid.length ? 13 : 10,
      );
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map.current);

      valid.forEach((driver) => {
        const icon = window.L.divIcon({
          html: `<div style="background:#22c55e;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;color:white;font-weight:bold;font-size:12px;">${initials(driver.name)}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          className: "",
        });
        window.L.marker([driver.lat, driver.lng], { icon })
          .bindPopup(
            `<strong>${driver.name}</strong><br>${driver.activeOrders || 0} active orders`,
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
  }, [drivers]);

  return (
    <div ref={container} className="w-full" style={{ minHeight: "400px" }} />
  );
};

export default Delivery;
