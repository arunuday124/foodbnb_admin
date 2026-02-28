import { useState } from "react";
import {
  MapPin,
  Star,
  Clock,
  X,
  Phone,
  Mail,
  CreditCard,
  Wallet,
  ChefHat,
  Info,
} from "lucide-react";
import { useRestaurant } from "../../context/Restaurantcontext";

const STATUSES = ["all", "open", "closed"];

// ── Details Modal ────────────────────────────────────────────────
function DetailsModal({ restaurant: r, onClose }) {
  if (!r) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-[fadeInUp_0.2s_ease]"
        onClick={(e) => e.stopPropagation()}>
        {/* Header image */}
        <div className="relative h-32 bg-gray-100 ">
          <img
            src={r.featuredDishImage}
            alt={r.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src =
                "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400";
            }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full p-1 transition">
            <X size={16} className="text-gray-700" />
          </button>
          {/* Avatar */}
          <div className="absolute -bottom-6 left-4">
            <img
              src={r.profileImage}
              alt={r.name}
              className="w-12 h-12 rounded-full border-4 border-white object-cover shadow-md"
              onError={(e) => {
                e.target.src = "https://i.pravatar.cc/150?img=1";
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="pt-8 px-4 pb-4">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">
                {r.name}
              </h2>
              {r.ownerName && (
                <p className="text-xs text-gray-500">by {r.ownerName}</p>
              )}
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                r.status === "open"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}>
              {r.status}
            </span>
          </div>

          {r.description && (
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {r.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <Detail icon={<Phone size={12} />} label="Phone" value={r.phone} />
            <Detail
              icon={<Mail size={12} />}
              label="Email"
              value={r.email}
              truncate
            />
            <Detail
              icon={<MapPin size={12} />}
              label="Address"
              value={r.locationName}
            />
            <Detail
              icon={<ChefHat size={12} />}
              label="Cuisine"
              value={r.cuisine || "N/A"}
            />
            <Detail
              icon={<Clock size={12} />}
              label="Hours"
              value={`${r.openTime} – ${r.closeTime}`}
            />
            <Detail
              icon={<Star size={12} />}
              label="Rating"
              value={`${r.rating.toFixed(1)} (${r.totalOrders} orders)`}
            />
            <Detail
              icon={<Wallet size={12} />}
              label="Lifetime Earnings"
              value={`₹${r.revenue.toLocaleString()}`}
            />
            <Detail
              icon={<CreditCard size={12} />}
              label="Price / Order"
              value={r.priceForOne ? `₹${r.priceForOne}` : "N/A"}
            />
          </div>

          {r.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.specialties.map((s, i) => (
                <span
                  key={i}
                  className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ icon, label, value, truncate }) {
  return (
    <div className="bg-gray-50 rounded-lg px-2.5 py-2">
      <div className="flex items-center gap-1 text-gray-400 mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-xs font-medium text-gray-700 ${truncate ? "truncate" : ""}`}>
        {value || "N/A"}
      </p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────
const Restaurant = () => {
  const { restaurants, loading, loadingMore, hasMore, loadMore, error } =
    useRestaurant();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const filtered = restaurants.filter((r) => {
    const matchStatus = activeFilter === "all" || r.status === activeFilter;
    const matchSearch =
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getCount = (s) =>
    s === "all"
      ? restaurants.length
      : restaurants.filter((r) => r.status === s).length;

  if (error)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-3">⚠️ Error</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Mom's Kitchen Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing {restaurants.length} kitchens
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setActiveFilter(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  activeFilter === s
                    ? s === "open"
                      ? "bg-green-500 text-white"
                      : s === "closed"
                        ? "bg-red-500 text-white"
                        : "bg-gray-700 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} (
                {getCount(s)})
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by kitchen or owner name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
            <p className="mt-4 text-gray-500">Loading kitchens...</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow hover:shadow-xl transition-shadow">
                  <div className="h-36 bg-gray-100 overflow-hidden">
                    <img
                      src={r.featuredDishImage}
                      alt={r.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400";
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={r.profileImage}
                        alt={r.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        onError={(e) => {
                          e.target.src = "https://i.pravatar.cc/150?img=1";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">
                          {r.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {r.ownerName ? `by ${r.ownerName}` : ""}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${r.status === "open" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {r.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {r.description || "No description"}
                    </p>

                    <div className="flex items-center gap-2 mb-3">
                      <Star
                        size={15}
                        className={
                          r.rating >= 4
                            ? "text-green-600 fill-green-600"
                            : "text-yellow-500 fill-yellow-500"
                        }
                      />
                      <span className="font-semibold text-sm">
                        {r.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({r.totalOrders} orders)
                      </span>
                    </div>

                    {r.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {r.specialties.slice(0, 3).map((s, i) => (
                          <span
                            key={i}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">
                        {r.locationName || "N/A"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-100 mb-3">
                      <div>
                        <p className="text-xs text-gray-400">Price/Order</p>
                        <p className="text-sm font-bold">₹{r.priceForOne}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Delivery</p>
                        <p className="text-sm font-bold">
                          {r.deliveryTime} mins
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded font-semibold ${r.isVeg ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {r.isVeg ? "🥗 Veg" : "🍗 Non-Veg"}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          {r.openTime} – {r.closeTime}
                        </div>
                        {/* ── Details Button ── */}
                        <button
                          onClick={() => setSelectedRestaurant(r)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition">
                          <Info size={12} />
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-lg">No kitchens found</p>
              </div>
            )}

            {hasMore && !search && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition font-medium shadow">
                  {loadingMore ? "Loading..." : "Load Next 20 Kitchens"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      <DetailsModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />

      {/* Animation keyframe */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Restaurant;
