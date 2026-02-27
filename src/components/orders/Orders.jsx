import { useState } from "react";
import {
  MapPin,
  Clock,
  UtensilsCrossed,
  Copy,
  Search,
  Bike,
} from "lucide-react";
import { useOrders } from "../../context/OrdersContext";

const FILTERS = ["all", "preparing", "in transit", "delivered", "cancelled"];

const STATUS_COLORS = {
  delivered: "bg-green-100 text-green-700",
  preparing: "bg-blue-100 text-blue-700",
  "in transit": "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const calcTotal = (items) =>
  (Array.isArray(items)
    ? items.reduce((s, i) => s + (i.price || 0) * (i.qnt || 1), 0)
    : 0
  ).toFixed(2);

const Orders = () => {
  const { orders, loading, loadingMore, hasMore, loadMore } = useOrders();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  };

  // Filter runs on already-loaded docs — no extra Firestore reads
  const filtered = orders.filter((o) => {
    if (activeFilter !== "all" && o.status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.name?.toLowerCase().includes(q) || o.uId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCount = (f) =>
    f === "all" ? orders.length : orders.filter((o) => o.status === f).length;

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      {toast && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          Copied!
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Orders Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing {orders.length} most recent orders
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                  activeFilter === f
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} (
                {getCount(f)})
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by customer name or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">
                        #{order.id.substring(0, 10)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.timeAgo}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status || "unknown"}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-900 mb-2">
                    {order.name}
                  </p>

                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono truncate">
                        UID: {order.uId}
                      </span>
                      <Copy
                        size={12}
                        className="cursor-pointer text-gray-400 hover:text-black shrink-0"
                        onClick={() => copy(order.uId)}
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={14}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <p className="line-clamp-1">{order.address}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <UtensilsCrossed
                        size={14}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <p className="line-clamp-1">{order.kitchenName}</p>
                    </div>
                    {order.riderId && (
                      <div className="flex items-start gap-2">
                        <Bike
                          size={14}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />
                        <p className="text-xs font-mono">{order.riderId}</p>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Items
                    </p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.name} × {item.qnt}
                        </span>
                        <span className="font-medium text-gray-900">
                          ₹{item.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={13} />
                      <span>{order.duration || "—"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="text-base font-bold text-gray-900">
                        ₹{calcTotal(order.items)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-lg">No orders found</p>
              </div>
            )}

            {/* DB-level pagination: fetches next 20 from Firestore cursor, never re-reads old docs */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition shadow">
                  {loadingMore ? "Loading..." : "Load Next 20 Orders"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Orders;
