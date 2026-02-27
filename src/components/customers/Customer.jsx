import { useState } from "react";
import {
  Search,
  Mail,
  Phone,
  MapPin,
  User,
  X,
  Package,
  CreditCard,
  Copy,
  Check,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";
import { useCustomers } from "../../context/Customerscontext";

const STATUS_COLOR = {
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  "in transit": "bg-blue-100 text-blue-700",
  preparing: "bg-yellow-100 text-yellow-700",
};

const Customer = () => {
  const { customers, loading, loadingMore, hasMore, loadMore } = useCustomers();

  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);
  const [selected, setSelected] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const copy = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // On-demand fetch — only triggered when admin clicks "View Details"
  const viewDetails = async (customer) => {
    setSelected(customer);
    setOrdersLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "orders"), where("uId", "==", customer.id)),
      );
      setOrderHistory(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Failed to load order history:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setOrderHistory([]);
  };

  // Filter runs on already-loaded docs — no extra Firestore reads
  const filtered = search.trim()
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-1">
          Customer Management
        </h1>
        <p className="text-slate-500">
          Showing {customers.length} most recent customers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Loaded Customers", value: customers.length },
          {
            label: "Active (10+ orders)",
            value: customers.filter((c) => c.noOfOrders >= 10).length,
          },
          {
            label: "With Photo",
            value: customers.filter((c) => !!c.photoURL).length,
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow p-6 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-slate-800">{s.value}</p>
            </div>
            <User className="w-10 h-10 text-blue-500 bg-blue-100 rounded-lg p-2" />
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700"
        />
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          <p className="mt-4 text-slate-500">Loading customers...</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl shadow p-6 hover:shadow-xl transition-shadow border border-slate-200">
                <div className="flex items-center mb-4">
                  {c.photoURL ? (
                    <img
                      src={c.photoURL}
                      alt={c.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-full ${c.color} flex items-center justify-center text-white text-xl font-bold`}>
                      {c.initials}
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-1">
                  {c.name}
                </h3>

                <div className="flex items-center gap-1 mb-3">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-mono truncate">
                    {c.id}
                  </span>
                  <button
                    onClick={() => copy(c.id)}
                    className="ml-1 p-0.5 hover:bg-slate-100 rounded shrink-0">
                    {copied === c.id ? (
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 mb-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Orders</p>
                    <p className="font-bold text-slate-800">{c.noOfOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Wallet</p>
                    <p className="font-bold text-slate-800">
                      ₹{c.walletBalance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Updated</p>
                    <p className="text-xs font-semibold text-slate-600">
                      {c.updatedAt
                        ? new Date(c.updatedAt.toDate()).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => viewDetails(c)}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition">
                  View Details
                </button>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-lg">
              No customers found
            </div>
          )}

          {/* DB-level pagination: fetches next 20 from Firestore, never re-reads existing */}
          {hasMore && !search && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed transition shadow">
                {loadingMore ? "Loading..." : "Load Next 20 Customers"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">
                Customer Details
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4 mb-3">
                  {selected.photoURL ? (
                    <img
                      src={selected.photoURL}
                      alt={selected.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 rounded-full ${selected.color} flex items-center justify-center text-white text-xl font-bold`}>
                      {selected.initials}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">
                      {selected.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{selected.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {selected.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {selected.address}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-400">Orders</p>
                    <p className="font-bold">{selected.noOfOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Wallet</p>
                    <p className="font-bold">₹{selected.walletBalance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Since</p>
                    <p className="text-xs font-semibold">
                      {selected.createdAt
                        ? new Date(
                            selected.createdAt.toDate(),
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-lg text-slate-800 mb-4">
                Order History
              </h3>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-blue-500" />
                </div>
              ) : orderHistory.length > 0 ? (
                <div className="space-y-3">
                  {orderHistory.map((order) => {
                    const status = (order.order_status || "").toLowerCase();
                    const total = (order.items || []).reduce(
                      (s, i) => s + (i.price || 0) * (i.qnt || 1),
                      0,
                    );
                    return (
                      <div
                        key={order.id}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-slate-800 text-xs font-mono">
                              #{order.id.substring(0, 10)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {order.createdAt?.toDate
                                ? new Date(
                                    order.createdAt.toDate(),
                                  ).toLocaleString()
                                : "N/A"}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[status] || "bg-gray-100 text-gray-600"}`}>
                            {order.order_status || "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {order.kitchenName}
                        </p>
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              {item.name} × {item.qnt}
                            </span>
                            <span className="font-medium">
                              ₹{item.price * item.qnt}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                          <span className="font-bold text-slate-800">
                            Total
                          </span>
                          <span className="font-bold text-slate-800">
                            ₹{total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Package className="w-14 h-14 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-400">No orders found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customer;
