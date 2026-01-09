// DashboardOverview.jsx
import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Star,
} from "lucide-react";

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";
import { formatDistanceToNow } from "date-fns";

// Global cache to prevent redundant Firebase calls
let dataCache = {
  revenue: null,
  orders: null,
  users: null,
  recentOrders: null,
  reviews: null,
  lastFetch: null,
};

// ============================================
// AnimatedNumber Component
// ============================================
const AnimatedNumber = ({
  value,
  duration = 4000,
  prefix = "",
  suffix = "",
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime;
    let animationId;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const currentValue = Math.floor(progress * value);
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

// ============================================
// Main Dashboard Component
// ============================================
export default function DashboardOverview() {
  // State for star filter
  const [starFilter, setStarFilter] = React.useState("all");
  const [recentOrders, setRecentOrders] = useState([]);
  const [topReviews, setTopReviews] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  // ============================================
  // StatCard Component (Nested Inside)
  // ============================================
  const StatCard = ({
    title,
    change,
    icon: Icon,
    isNegative,
    numericValue,
  }) => {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-black text-sm font-medium">{title}</h3>
          <div className="bg-stone-200/50 p-2 rounded-lg hover:bg-slate-700 transition-colors duration-300">
            <Icon className="w-5 h-5 text-black" />
          </div>
        </div>

        {/* Card Content */}
        <div className="flex flex-col gap-2">
          <p className="text-black text-3xl font-bold">
            {title === "Total Revenue" ? (
              <>
                ₹
                <AnimatedNumber value={numericValue} duration={1000} />
              </>
            ) : (
              <AnimatedNumber value={numericValue} duration={1000} />
            )}
          </p>

          {/* Stats Change */}
          <div className="flex items-center gap-2">
            {isNegative ? (
              <TrendingDown className="w-4 h-4 text-red-800" />
            ) : (
              <TrendingUp className="w-4 h-4 text-green-800" />
            )}
            <span
              className={`text-sm font-medium ${
                isNegative ? "text-red-800" : "text-green-800"
              }`}>
              {change}
            </span>
            <span className="text-black text-sm">vs last month</span>
          </div>
        </div>
      </div>
    );
  };

  // Fetch all data from Firebase with caching
  useEffect(() => {
    const fetchAllData = async () => {
      // Check if data is already cached
      if (dataCache.lastFetch) {
        setTotalRevenue(dataCache.revenue);
        setTotalOrders(dataCache.orders);
        setTotalUsers(dataCache.users);
        setRecentOrders(dataCache.recentOrders);
        setTopReviews(dataCache.reviews);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch orders data (single call)
        const ordersDocs = await getDocs(collection(db, "orders"));
        const ordersData = ordersDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Calculate total revenue (only from delivered orders)
        let revenue = 0;
        let totalOrderQuantity = 0;

        ordersData.forEach((order) => {
          if (
            order.orderStatus === "delivered" &&
            order.items &&
            Array.isArray(order.items)
          ) {
            order.items.forEach((item) => {
              revenue += (item.price || 0) * (item.qnt || 1);
              totalOrderQuantity += item.qnt || 1;
            });
          }
        });

        // Filter recent orders (last 12 hours)
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

        const recentOrdersList = ordersData
          .filter((order) => {
            if (!order.time) return false;
            const orderTime = order.time.toDate();
            return orderTime >= twelveHoursAgo;
          })
          .map((order) => ({
            id: order.id,
            name: order.name || "N/A",
            kitchenName: order.kitchenName || "N/A",
            address: order.address || "N/A",
            orderStatus: order.orderStatus || "pending",
            time: order.time,
            items: order.items || [],
            totalPrice: order.items
              ? order.items.reduce(
                  (sum, item) => sum + (item.price || 0) * (item.qnt || 1),
                  0
                )
              : 0,
          }))
          .sort((a, b) => b.time.toDate() - a.time.toDate()); // Sort by most recent

        // Fetch users data (single call)
        const usersDocs = await getDocs(collection(db, "users"));
        const usersCount = usersDocs.docs.length;

        // Fetch reviews data (single call)
        const reviewsDocs = await getDocs(collection(db, "reviews"));
        const reviewsData = reviewsDocs.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Cache the data
        dataCache = {
          revenue,
          orders: totalOrderQuantity,
          users: usersCount,
          recentOrders: recentOrdersList,
          reviews: reviewsData,
          lastFetch: new Date(),
        };

        // Update state
        setTotalRevenue(revenue);
        setTotalOrders(totalOrderQuantity);
        setTotalUsers(usersCount);
        setRecentOrders(recentOrdersList);
        setTopReviews(reviewsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Dashboard Statistics Data (removed Active Users card)
  const stats = [
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString()}`,
      numericValue: totalRevenue,
      change: "20.1%",
      icon: IndianRupee,
      isNegative: false,
    },
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      numericValue: totalOrders,
      change: "4.2%",
      icon: ShoppingCart,
      isNegative: true,
    },
    {
      title: "Total Users",
      value: totalUsers.toString(),
      numericValue: totalUsers,
      change: "8.7%",
      icon: UserPlus,
      isNegative: true,
    },
  ];

  //for time ago format
  const OrderTime = ({ timestamp }) => {
    if (!timestamp || !timestamp.toDate) return <span>N/A</span>;
    const date = timestamp.toDate();
    return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
  };

  //for time ago format
  const Time = ({ timestamp }) => {
    if (!timestamp || !timestamp.toDate) return <span>N/A</span>;
    const date = timestamp.toDate();
    return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
  };

  // Filter reviews based on selected star rating
  const filteredReviews =
    starFilter === "all"
      ? topReviews
      : topReviews.filter((review) => review.rating === parseInt(starFilter));

  // Status badge color helper
  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "text-green-600 font-semibold";
      case "pending":
        return "text-yellow-600 font-semibold";
      case "processing":
        return "text-blue-600 font-semibold";
      case "canceled":
        return "text-red-600 font-semibold";
      default:
        return "text-slate-600 font-semibold";
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-slate-900 text-3xl sm:text-4xl font-bold mb-2">
            Dashboard Overview
          </h1>
          <p className="text-slate-600 text-base sm:text-lg">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>

        {/* Statistics Grid - Now 3 cards instead of 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              numericValue={stat.numericValue}
              change={stat.change}
              icon={stat.icon}
              isNegative={stat.isNegative}
            />
          ))}
        </div>

        {/* Orders and Reviews Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders Box */}
          <div className="bg-white from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg border-2 border-gray-300">
            <h2 className="text-black text-xl font-bold mb-6">
              All Recent Orders (Last 12 Hours)
            </h2>

            {/* Scrollable Orders List */}
            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-black text-sm">Loading orders...</p>
                </div>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border-b border-slate-300 pb-4 last:border-b-0 hover:bg-slate-100 rounded-lg p-3 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-black font-semibold text-base">
                          {order.name}
                        </h3>
                        <p className="text-slate-600 text-sm font-medium">
                          {order.kitchenName}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {order.address}
                        </p>
                      </div>
                      <span className="text-black font-bold text-lg">
                        ₹{order.totalPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Order Items */}
                    <div className="mb-2 ml-2">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-slate-700 text-sm">
                          • {item.name} × {item.qnt}  ₹{item.price}
                        </p>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm ${getStatusColor(
                          order.orderStatus
                        )}`}>
                        {order.orderStatus.toUpperCase()}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">
                        <OrderTime timestamp={order.time} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600 text-sm">
                    No recent orders in the last 12 hours
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Reviews Box */}
          <div className="bg-white from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border-2 border-gray-300">
            {/* Header with Filter Dropdown */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-black text-xl font-bold">Top Reviews</h2>

              {/* Star Filter Dropdown */}
              <div className="relative">
                <select
                  value={starFilter}
                  onChange={(e) => setStarFilter(e.target.value)}
                  className="bg-white text-black border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-stone-400 transition-colors duration-200 focus:outline-none appearance-none pr-8">
                  <option value="all">All Stars</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                  <option value="3">⭐⭐⭐ 3 Stars</option>
                  <option value="2">⭐⭐ 2 Stars</option>
                  <option value="1">⭐ 1 Star</option>
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Scrollable Reviews List */}
            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-black text-sm">Loading reviews...</p>
                </div>
              ) : filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-slate-300 pb-4 last:border-b-0 hover:bg-slate-100 rounded-lg p-3 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-black font-semibold text-lg mb-1">
                          {review.name}
                        </h3>
                        <p className="text-black text-sm mb-2 font-medium">
                          {review.kitchenName}
                        </p>
                        <p className="text-black text-sm mb-2">
                          {review.product}
                        </p>

                        {/* Star Rating */}
                        <div className="flex gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-black text-sm mb-2 font-bold">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-black text-xs">
                        <Time timestamp={review.time} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-black text-sm">
                    No reviews found for this rating
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.7);
        }
      `}</style>
    </div>
  );
}
