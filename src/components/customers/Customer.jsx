import React, { useState, useEffect } from "react";
import {
  Search,
  Mail,
  User,
  X,
  Clock,
  Package,
  CreditCard,
  MapPin,
  Image,
  ChevronDown,
  ChevronUp,
  Phone,
  Copy,
  Check,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db, auth } from "../../Firebase";
import { onAuthStateChanged } from "firebase/auth";

let recentCustomerIdsCache = null;
let lastFetchTimeCache = null;
let cachedCustomersData = null;

const Customer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setError("Please log in to view customers.");
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let unsubscribeUsers = null;

    const fetchRecentCustomerIds = async () => {
      const now = Date.now();
      const CACHE_DURATION = 30 * 60 * 1000;

      if (
        recentCustomerIdsCache &&
        lastFetchTimeCache &&
        now - lastFetchTimeCache < CACHE_DURATION
      ) {
        return;
      }

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const ordersQuery = query(
        collection(db, "orders"),
        where("time", ">=", oneMonthAgo),
        limit(500),
      );

      const ordersSnapshot = await getDocs(ordersQuery);

      const userOrderMap = new Map();
      ordersSnapshot.docs.forEach((doc) => {
        const orderData = doc.data();
        const orderTime = orderData.time?.toDate();
        if (orderTime && orderData.Uid) {
          const existing = userOrderMap.get(orderData.Uid);
          if (!existing || orderTime > existing) {
            userOrderMap.set(orderData.Uid, orderTime);
          }
        }
      });

      const sortedUsers = Array.from(userOrderMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([uid]) => uid);

      recentCustomerIdsCache = new Set(sortedUsers);
      lastFetchTimeCache = now;
    };

    const setupUserListener = () => {
      unsubscribeUsers = onSnapshot(
        collection(db, "users"),
        (querySnapshot) => {
          if (!isMounted) return;

          const customerData = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const nameParts = data.name?.split(" ") || ["U"];
            const initials =
              nameParts.length > 1
                ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                : nameParts[0][0].toUpperCase();

            const colors = [
              "bg-orange-500",
              "bg-blue-500",
              "bg-green-500",
              "bg-purple-500",
              "bg-pink-500",
              "bg-indigo-500",
            ];
            const color = colors[doc.id.charCodeAt(0) % colors.length];

            return {
              id: doc.id,
              name: data.name || "Unknown User",
              email: data.email || "No email",
              phone: data.phone || "No phone",
              address: data.address || "No address",
              photoURL: data.photoURL || null,
              createdAt: data.createdAt || null,
              walletBalance: data.walletBalance || 0,
              updatedAt: data.updatedAt || null,
              noOfOrders: data.noOfOrders || 0,
              initials,
              color,
              hasRecentOrders: recentCustomerIdsCache?.has(doc.id),
            };
          });

          cachedCustomersData = customerData;
          setAllCustomers(customerData);
          setCustomers(customerData);
          setError(null);
        },
        (err) => {
          if (!isMounted) return;
          setError(`Failed to load customers: ${err.message}`);
        },
      );
    };

    const initializeData = async () => {
      if (cachedCustomersData) {
        setAllCustomers(cachedCustomersData);
        setCustomers(cachedCustomersData);
      }

      await fetchRecentCustomerIds();
      setupUserListener();
    };

    initializeData();

    return () => {
      isMounted = false;
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, [user]);

  const handleViewDetails = async (customer) => {
    setSelectedCustomer(customer);
    setOrdersLoading(true);

    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where("Uid", "==", customer.id),
      );

      const querySnapshot = await getDocs(ordersQuery);
      const orders = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setCustomerOrders(orders);
      setOrdersLoading(false);
    } catch (err) {
      setOrdersLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedCustomer(null);
    setCustomerOrders([]);
  };

  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "delivered") return "bg-green-100 text-green-700";
    if (statusLower === "cancelled") return "bg-red-100 text-red-700";
    if (statusLower === "in transit") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusText = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "delivered") return "RECEIVED";
    if (statusLower === "cancelled") return "CANCELLED";
    if (statusLower === "in transit") return "IN TRANSIT";
    return status?.toUpperCase() || "PENDING";
  };

  const handleViewMore = () => {
    setDisplayLimit((prev) => prev + 5);
  };

  const handleViewLess = () => {
    setDisplayLimit(5);
  };

  const queryLower = searchQuery.trim().toLowerCase();
  const filteredCustomers = queryLower
    ? allCustomers.filter((customer) => {
        const name = (customer.name || "").toLowerCase();
        const email = (customer.email || "").toLowerCase();
        const id = (customer.id || "").toLowerCase();

        return (
          name.includes(queryLower) ||
          email.includes(queryLower) ||
          id.includes(queryLower)
        );
      })
    : customers;

  const displayedCustomers = filteredCustomers.slice(0, displayLimit);
  const hasMore = filteredCustomers.length > displayLimit;
  const showViewLess = displayLimit > 5 && filteredCustomers.length > 5;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">
          Customer Management
        </h1>
        <p className="text-slate-600">View and manage your customer base</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-slate-800">
                {allCustomers?.length || 0}
              </p>
            </div>
            <User className="w-10 h-10 text-blue-500 bg-violet-300 rounded-lg p-2" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm mb-1">New Users</p>
              <p className="text-3xl font-bold text-slate-800">
                {(allCustomers?.filter((c) => c.noOfOrders < 10) || []).length}
              </p>
            </div>
            <Mail className="w-10 h-10 bg-green-300 text-green-700 rounded-lg p-2" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm mb-1">With Photos</p>
              <p className="text-3xl font-bold text-slate-800">
                {allCustomers.filter((c) => !!c.photoURL).length}
              </p>
            </div>
            <Image className="w-9 h-9 text-purple-500 bg-purple-300 rounded-lg p-2" />
          </div>
        </div>
      </div>

      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 text-slate-700 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      {!error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCustomers.length > 0 ? (
              displayedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-slate-200">
                  <div className="flex items-center mb-4">
                    {customer.photoURL ? (
                      <img
                        src={customer.photoURL}
                        alt={customer.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full ${customer.color} flex items-center justify-center text-white font-bold text-xl mr-4`}>
                        {customer.initials}
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-lg text-slate-800 mb-2">
                    {customer.name}
                  </h3>
                  <div className="flex items-center min-w-0 flex-1">
                    <CreditCard className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500 truncate">
                      {customer.id}
                    </span>
                    <button
                      onClick={() => copyToClipboard(customer.id)}
                      className="ml-2 p-1 hover:bg-slate-200 rounded transition-colors shrink-0"
                      title="Copy ID">
                      {copiedId === customer.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600 mb-4">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500">Orders</p>
                      <p className="text-lg font-bold text-slate-800">
                        {customer.noOfOrders}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Spent</p>
                      <p className="text-lg font-bold text-slate-800">
                        ₹{customer.walletBalance}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last Order</p>
                      <p className="text-xs font-semibold text-slate-600">
                        {customer.updatedAt
                          ? new Date(
                              customer.updatedAt.toDate(),
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewDetails(customer)}
                    className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold  rounded-lg transition-colors ">
                    View Details
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <p className="text-slate-500 text-lg">
                  No customers found matching your search.
                </p>
              </div>
            )}
          </div>

          {displayedCustomers.length > 0 && (hasMore || showViewLess) && (
            <div className="flex justify-center gap-4 mt-8">
              {hasMore && (
                <button
                  onClick={handleViewMore}
                  className="flex items-center h-10 gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow-md">
                  View More
                  <ChevronDown className="w-5 h-5" />
                </button>
              )}
              {showViewLess && (
                <button
                  onClick={handleViewLess}
                  className="flex items-center h-10 gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors shadow-md">
                  View Less
                  <ChevronUp className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0  bg-opacity-10 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-stone-100 rounded-2xl shadow-2xl max-w-xl w-[70vh] max-h-[90vh] overflow-y-auto mt-10">
            <div className="sticky top-5 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 mt-5">
                Customer Details
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-4">
                  {selectedCustomer.photoURL ? (
                    <img
                      src={selectedCustomer.photoURL}
                      alt={selectedCustomer.name}
                      className="w-16 h-16 rounded-full object-cover mr-4"
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-full ${selectedCustomer.color} flex items-center justify-center text-white font-bold text-xl mr-4`}>
                      {selectedCustomer.initials}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-xl text-slate-800">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-slate-600">{selectedCustomer.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    <span>{selectedCustomer.address}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg">
                    <div className="flex items-center min-w-0 flex-1">
                      <CreditCard className="w-4 h-4 mr-2 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">
                        {selectedCustomer.id}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedCustomer.id)}
                      className="ml-2 p-1 hover:bg-slate-100 rounded transition-colors id"
                      title="Copy ID">
                      {copiedId === selectedCustomer.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Total Orders</p>
                    <p className="text-lg font-bold text-slate-800">
                      {selectedCustomer.noOfOrders}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Wallet Balance
                    </p>
                    <p className="text-lg font-bold text-slate-800">
                      ₹{selectedCustomer.walletBalance}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Member Since</p>
                    <p className="text-xs font-semibold text-slate-600">
                      {selectedCustomer.createdAt
                        ? new Date(
                            selectedCustomer.createdAt.toDate(),
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
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
                </div>
              ) : customerOrders.length > 0 ? (
                <div className="space-y-4">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            #{order.id.substring(0, 8)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.time
                              ? new Date(order.time.toDate()).toLocaleString()
                              : "N/A"}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            order.orderStatus,
                          )}`}>
                          {getStatusText(order.orderStatus)}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center mb-2">
                          <Package className="w-4 h-4 mr-2 text-slate-600" />
                          <span className="font-semibold text-slate-700">
                            {order.kitchenName || "Unknown Kitchen"}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-slate-600">
                          <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                          <span>{order.address || "No address"}</span>
                        </div>
                        {order.duration && (
                          <div className="flex items-center text-sm text-slate-600 mt-1">
                            <Clock className="w-4 h-4 mr-2 text-slate-400" />
                            <span>ETA: {order.duration}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-600 mb-2">
                          Order Items:
                        </p>
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm">
                              <span className="text-slate-700">
                                {item.name} x {item.qnt}
                              </span>
                              <span className="font-semibold text-slate-800">
                                ₹{item.price * item.qnt}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No items</p>
                        )}

                        {order.items && order.items.length > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-2">
                            <span className="font-bold text-slate-800">
                              Total
                            </span>
                            <span className="font-bold text-lg text-slate-800">
                              ₹
                              {order.items.reduce(
                                (sum, item) => sum + item.price * item.qnt,
                                0,
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    No orders found for this customer
                  </p>
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
