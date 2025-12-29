// DashboardOverview.jsx
import React, { use } from "react";
import {
  IndianRupee,
  Users,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";
import { formatDistanceToNow } from "date-fns";

// ============================================
// Main Dashboard Component
// ============================================
export default function DashboardOverview() {
  // State for star filter
  const [starFilter, setStarFilter] = React.useState("all");
  const [recentOrders, setRecentOrders] = useState([]);

  // ============================================
  // StatCard Component (Nested Inside)
  // ============================================
  const StatCard = ({ title, value, change, icon: Icon, isNegative }) => {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-black text-sm font-medium">{title}</h3>
          <div className="bg-stone-200/50 p-2 rounded-lg group-hover:bg-slate-700 transition-colors duration-300">
            <Icon className="w-5 h-5 text-black" />
          </div>
        </div>

        {/* Card Content */}
        <div className="flex flex-col gap-2">
          <p className="text-black text-3xl font-bold">{value}</p>

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
              }`}
            >
              {change}
            </span>
            <span className="text-black text-sm">vs last month</span>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Statistics Data
  const stats = [
    {
      title: "Total Revenue",
      value: "₹45,231.89",
      change: "20.1%",
      icon: IndianRupee,
      isNegative: false,
    },
    {
      title: "Active Users",
      value: "2,350",
      change: "15.3%",
      icon: Users,
      isNegative: false,
    },
    {
      title: "Total Orders",
      value: "1,234",
      change: "4.2%",
      icon: ShoppingCart,
      isNegative: true,
    },
    {
      title: "Total Users",
      value: "487",
      change: "8.7%",
      icon: UserPlus,
      isNegative: false,
    },
  ];

  // Recent Orders Data - Food Delivery App
  // const recentOrders = [];
  useEffect(() => {
    const fetchOrders = async () => {
      const recentOrders = await getDocs(collection(db, "Recent_Orders"));
      setRecentOrders(recentOrders.docs.map((doc) => doc.data()));
    };
    fetchOrders();
  }, []);
  

  //for time ago format
  const OrderTime = ({ timestamp }) => {
    // Convert the Firebase timestamp to a Date first
    const date = timestamp.toDate();
    
    return (
      <span>
        {formatDistanceToNow(date, { addSuffix: true })}
        {/* Outputs: "5 minutes ago" or "2 days ago" */}
      </span>
    );
  };
  

  // Top Products Data - Popular Food Items
  const topProducts = [
    {
      id: 1,
      name: "Margherita Pizza",
      sales: "1234 orders",
      revenue: "$24,680.00",
      change: "12.5%",
      isNegative: false,
    },
    {
      id: 2,
      name: "Chicken Biryani",
      sales: "987 orders",
      revenue: "$18,753.00",
      change: "8.3%",
      isNegative: false,
    },
    {
      id: 3,
      name: "Veggie Burger",
      sales: "856 orders",
      revenue: "$13,254.00",
      change: "3.2%",
      isNegative: true,
    },
    {
      id: 4,
      name: "Sushi Platter",
      sales: "743 orders",
      revenue: "$24,500.00",
      change: "15.7%",
      isNegative: false,
    },
    {
      id: 5,
      name: "Pasta Carbonara",
      sales: "621 orders",
      revenue: "$10,546.00",
      change: "6.4%",
      isNegative: false,
    },
  ];

  // Top Reviews Data - Food Delivery Reviews
  const topReviews = [
    {
      id: 1,
      customer: "Sarah Johnson",
      product: "Margherita Pizza",
      rating: 5,
      comment:
        "Best pizza in town! Fresh ingredients and delivered hot. Will order again!",
      date: "2 days ago",
    },
    {
      id: 2,
      customer: "Michael Chen",
      product: "Chicken Biryani",
      rating: 4,
      comment:
        "Authentic taste and generous portions. Slightly spicy but delicious!",
      date: "3 days ago",
    },
    {
      id: 3,
      customer: "Emily Davis",
      product: "Veggie Burger",
      rating: 5,
      comment:
        "Amazing veggie patty! Fresh veggies and perfect bun. Highly recommend!",
      date: "5 days ago",
    },
    {
      id: 4,
      customer: "David Wilson",
      product: "Sushi Platter",
      rating: 4,
      comment: "Fresh fish and well-prepared. Great value for money!",
      date: "1 week ago",
    },
    {
      id: 5,
      customer: "Lisa Anderson",
      product: "Pasta Carbonara",
      rating: 5,
      comment:
        "Creamy, rich, and perfectly cooked. Restaurant quality at home!",
      date: "1 week ago",
    },
    {
      id: 6,
      customer: "Tom Harris",
      product: "Caesar Salad",
      rating: 3,
      comment:
        "Decent salad but dressing was too tangy for my taste. Fresh lettuce though.",
      date: "2 weeks ago",
    },
    {
      id: 7,
      customer: "Rachel Green",
      product: "Pad Thai Noodles",
      rating: 2,
      comment:
        "Not authentic enough. Too sweet and missing traditional flavors.",
      date: "2 weeks ago",
    },
    {
      id: 8,
      customer: "James Bond",
      product: "Beef Tacos",
      rating: 1,
      comment:
        "Very disappointed. Cold food and missing ingredients. Poor service.",
      date: "3 weeks ago",
    },
  ];

  // Filter reviews based on selected star rating
  const filteredReviews =
    starFilter === "all"
      ? topReviews
      : topReviews.filter((review) => review.rating === parseInt(starFilter));

  // Status badge color helper
  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-emerald-400";
      case "pending":
        return "text-yellow-400";
      case "processing":
        return "text-blue-400";
      case "canceled":
        return "text-red-400";
      default:
        return "text-slate-400";
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

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
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
            <h2 className="text-black text-xl font-bold mb-6">Recent Orders</h2>

            {/* Scrollable Orders List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="border-b border-slate-700 pb-4 last:border-b-0 hover:bg-slate-700/30 rounded-lg p-3 transition-colors duration-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-black font-semibold">{order.name}</h3>
                      <p className="text-black text-sm">
                        {order.order_details}
                      </p>
                    </div>
                    <span className="text-black font-bold">₹{order.price}</span>
                  </div>
                  <div className="flex justify-end">
                    <span
                      className={`text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <span className="flex font-bold">
                    {OrderTime({ timestamp: order.order_at })}
                  </span>
                </div>
              ))}
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
                  className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-stone-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none pr-8"
                >
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
                    viewBox="0 0 24 24"
                  >
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
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-slate-700 pb-4 last:border-b-0 hover:bg-slate-700/30 rounded-lg p-3 transition-colors duration-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-black font-semibold">
                          {review.customer}
                        </h3>
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
                                  : "text-black"
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-black text-sm mb-2">
                          {review.comment}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-black text-xs">{review.date}</span>
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
      <style jsx>{`
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
