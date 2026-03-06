import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Clock,
  UtensilsCrossed,
  Copy,
  Search,
  Bike,
  Info,
  X,
  CreditCard,
  Star,
  FileText,
  Package,
  Timer,
  Receipt,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../../Firebase";
import { formatDistanceToNow, format } from "date-fns";

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const FILTERS = ["all", "preparing", "in transit", "delivered", "cancelled"];
const STATUS_COLORS = {
  delivered: "bg-green-100 text-green-700",
  preparing: "bg-blue-100 text-blue-700",
  "in transit": "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── Normalise Firestore doc → clean shape ───────────────────────────────────
const normaliseOrder = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    order_id: d.order_id || doc.id,

    // customer
    user_id: d.user_id || "",

    // address
    address: d.delivery_address || "",
    delivery_instructions: d.delivery_instructions || "",

    // kitchen
    kitchenName: d.kitchen_name || "",
    kitchen_id: d.kitchen_id || "",

    // rider
    riderId: d.rider_id || "",
    riderName: d.rider_name || "",

    // items
    items: Array.isArray(d.items)
      ? d.items.map((item) => ({
          name: item.dish_name || item.name || "",
          quantity: item.quantity ?? 1,
          price: item.price || 0,
          total_price: item.total_price || 0,
          image_url: item.image_url || "",
          kitchen_name: item.kitchen_name || "",
          dish_id: item.dish_id || "",
        }))
      : [],

    // financials
    subtotal: d.subtotal || 0,
    delivery_fee: d.delivery_fee || 0,
    tax: d.tax || 0,
    total_amount: d.total_amount || 0,

    // payment
    payment_method: d.payment_method || "",

    // status — normalise "Delivered" → "delivered"
    status: (d.order_status || "").toLowerCase(),

    // misc
    notes: d.notes || "",
    rating: d.rating || 0,
    review: d.review || "",
    deliveryMessage: d.deliveryMessage || "",

    // timestamps
    created_at: d.created_at || null,
    estimated_delivery_time: d.estimated_delivery_time || null,
    actual_delivery_time: d.actual_delivery_time || null,

    timeAgo: d.created_at?.toDate
      ? formatDistanceToNow(d.created_at.toDate(), { addSuffix: true })
      : "N/A",
    createdAtFormatted: d.created_at?.toDate
      ? format(d.created_at.toDate(), "dd MMM yyyy, hh:mm a")
      : "N/A",
    estimatedFormatted: d.estimated_delivery_time?.toDate
      ? format(d.estimated_delivery_time.toDate(), "hh:mm a")
      : null,
    actualFormatted: d.actual_delivery_time?.toDate
      ? format(d.actual_delivery_time.toDate(), "hh:mm a")
      : null,
  };
};

// ─── Firestore fetcher (returns unsub + first snapshot promise) ───────────────
let _lastDoc = null; // module-level cursor

const fetchFirstPage = () =>
  new Promise((resolve, reject) => {
    const q = query(
      collection(db, "orders"),
      orderBy("created_at", "desc"),
      limit(PAGE_SIZE),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        _lastDoc = snap.docs[snap.docs.length - 1] ?? null;
        resolve({
          orders: snap.docs.map(normaliseOrder),
          hasMore: snap.docs.length === PAGE_SIZE,
          unsub,
        });
      },
      reject,
    );
  });

// ─── Details Modal ────────────────────────────────────────────────────────────
const DetailsModal = ({ order, onClose }) => {
  if (!order) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-104 h-[70vh] max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        onClick={(e) => e.stopPropagation()}>
        {/* Sticky top: colored strip + header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl">
          {/* Colored top strip */}
          <div
            className={`h-1.5 w-full rounded-t-2xl ${
              order.status === "delivered"
                ? "bg-green-400"
                : order.status === "preparing"
                  ? "bg-blue-400"
                  : order.status === "in transit"
                    ? "bg-orange-400"
                    : order.status === "cancelled"
                      ? "bg-red-400"
                      : "bg-gray-300"
            }`}
          />

          {/* Header */}
          <div className="px-3.5 pt-3 pb-2 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-gray-800 leading-tight">
                #{order.id.substring(0, 8)}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {order.timeAgo}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                {order.status || "—"}
              </span>
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-gray-600 transition">
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
        {/* end sticky */}

        <div className="px-3.5 pb-3.5 space-y-2.5">
          {/* Order ID */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5">
            <p className="text-[15px] text-gray-400">Order ID</p>
            <p className="text-[12px] font-mono text-gray-600 truncate max-w-[120px]">
              {order.order_id}
            </p>
          </div>

          {/* Kitchen */}
          <div className="flex items-center gap-1.5">
            <UtensilsCrossed size={15} className="text-orange-400 shrink-0" />
            <p className="text-xs font-semibold text-gray-700 truncate">
              {order.kitchenName || "—"}
            </p>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5">
            <MapPin size={11} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[13px] text-gray-500 leading-tight">
              {order.address || "—"}
            </p>
          </div>

          {/* Delivery Instructions */}
          {order.delivery_instructions && (
            <div className="flex items-start gap-1.5">
              <FileText size={11} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[13px] text-gray-500 italic leading-tight">
                {order.delivery_instructions}
              </p>
            </div>
          )}

          {/* Rider */}
          <div className="flex items-center gap-1.5">
            <Bike size={11} className="text-gray-400 shrink-0" />
            {order.riderId ? (
              <p className="text-[11px] text-gray-500 truncate">
                {order.riderName || order.riderId}
              </p>
            ) : (
              <p className="text-[11px] text-gray-300">No rider assigned</p>
            )}
          </div>

          {/* User ID */}
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-400">User ID</p>
            <p className="text-[13px] font-mono text-gray-500 truncate max-w-[130px]">
              {order.user_id}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-100" />

          {/* Items */}
          <div className="space-y-1.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center shrink-0">
                      <UtensilsCrossed size={9} className="text-orange-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] text-gray-700 truncate">
                      {item.name}
                    </p>
                    <p className="text-[13px] text-gray-400">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="text-[13px] font-semibold text-gray-800 shrink-0">
                  ₹{item.total_price}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-100" />

          {/* Bill */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {order.delivery_fee > 0 ? (
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Delivery</span>
                <span>₹{order.delivery_fee}</span>
              </div>
            ) : (
              <div className="flex justify-between text-[13px] text-green-400">
                <span>Delivery</span>
                <span>Free</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-[13px] text-gray-400">
                <span>Tax</span>
                <span>₹{order.tax}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-100" />

          {/* Payment */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[13px] text-gray-400">
              <CreditCard size={12} />
              <span className="text-[13px]">Payment</span>
            </div>
            <span className="text-[13px] font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              {order.payment_method || "—"}
            </span>
          </div>

          {/* Timestamps */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Ordered</span>
              <span className="text-gray-600">{order.createdAtFormatted}</span>
            </div>
            {order.estimatedFormatted && (
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">ETA</span>
                <span className="text-gray-600">
                  {order.estimatedFormatted}
                </span>
              </div>
            )}
            {order.actualFormatted && (
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-400">Delivered at</span>
                <span className="text-green-500 font-medium">
                  {order.actualFormatted}
                </span>
              </div>
            )}
          </div>

          {/* Rating & Review */}
          {order.rating > 0 && (
            <>
              <div className="border-t border-dashed border-gray-100" />
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={10}
                      className={
                        s <= order.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200 fill-gray-200"
                      }
                    />
                  ))}
                  <span className="text-[10px] text-gray-400 ml-0.5">
                    {order.rating}/5
                  </span>
                </div>
                {order.review && (
                  <p className="text-[13px] text-gray-500 italic">
                    "{order.review}"
                  </p>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {order.notes && (
            <p className="text-[13px] text-gray-500 italic bg-yellow-50 rounded px-2 py-1.5 border border-yellow-100">
              📝 {order.notes}
            </p>
          )}

          {/* Delivery Message */}
          {order.deliveryMessage && (
            <p className="text-[13px] text-green-600 bg-green-50 rounded px-2 py-1.5 border border-green-100">
              ✓ {order.deliveryMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Orders = () => {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState("");
  const [detailOrder, setDetailOrder] = useState(null);

  // Extra pages loaded via "Load More"
  const [extraOrders, setExtraOrders] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // TanStack Query — first page via real-time onSnapshot
  const { data, isLoading } = useQuery({
    queryKey: ["orders", "first-page"],
    queryFn: fetchFirstPage,
    staleTime: Infinity, // onSnapshot keeps it fresh
    gcTime: 5 * 60 * 1000,
  });

  const allOrders = [...(data?.orders ?? []), ...extraOrders];
  const pageHasMore = data?.hasMore ?? true;

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !_lastDoc) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("created_at", "desc"),
        startAfter(_lastDoc),
        limit(PAGE_SIZE),
      );
      const snap = await getDocs(q);
      _lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      setExtraOrders((prev) => [...prev, ...snap.docs.map(normaliseOrder)]);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("[Orders] loadMore:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  const filtered = allOrders.filter((o) => {
    if (activeFilter !== "all" && o.status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.kitchenName?.toLowerCase().includes(q) ||
        o.user_id?.toLowerCase().includes(q) ||
        o.id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCount = (f) =>
    f === "all"
      ? allOrders.length
      : allOrders.filter((o) => o.status === f).length;

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm animate-pulse">
          Copied!
        </div>
      )}

      {/* Details Modal */}
      <DetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Orders Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing {allOrders.length} most recent orders
          </p>
        </div>

        {/* Filter Tabs */}
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

        {/* Search */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by kitchen, user ID or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
            />
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
            <p className="mt-4 text-gray-500">Loading orders...</p>
          </div>
        )}

        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow hover:shadow-lg transition-shadow">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">
                        #{order.id.substring(0, 10)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.timeAgo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {order.status || "unknown"}
                      </span>
                      {/* Details Button */}
                      <button
                        onClick={() => setDetailOrder(order)}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-orange-100 hover:text-orange-600 transition text-gray-500"
                        title="View details">
                        <Info size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Kitchen Name */}
                  <p className="font-semibold text-gray-900 mb-2">
                    {order.kitchenName || "—"}
                  </p>

                  {/* Basic Info */}
                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono truncate">
                        UID: {order.user_id}
                      </span>
                      <Copy
                        size={12}
                        className="cursor-pointer text-gray-400 hover:text-black shrink-0"
                        onClick={() => copy(order.user_id)}
                      />
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={14}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <p className="line-clamp-1">{order.address}</p>
                    </div>
                    {order.riderId && (
                      <div className="flex items-start gap-2">
                        <Bike
                          size={14}
                          className="mt-0.5 shrink-0 text-gray-400"
                        />
                        <p className="text-xs font-mono">
                          {order.riderName || order.riderId}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Items (compact) */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      Items
                    </p>
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="font-medium text-gray-900">
                          ₹{item.total_price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <CreditCard size={13} />
                      <span>{order.payment_method || "—"}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Total</p>
                      <p className="text-base font-bold text-gray-900">
                        ₹{order.total_amount}
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

            {(pageHasMore || hasMore) && (
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
