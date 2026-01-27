// DashboardOverview.jsx
import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Star,
  ChevronDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../Firebase";
import { formatDistanceToNow } from "date-fns";

// AnimatedNumber Component
const AnimatedNumber = ({
  value,
  duration = 1000,
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
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

// Main Dashboard Component
export default function DashboardOverview() {
  const [starFilter, setStarFilter] = useState("all");
  const [riderStarFilter, setRiderStarFilter] = useState("all");
  const [recentOrders, setRecentOrders] = useState([]);
  const [topReviews, setTopReviews] = useState([]);
  const [riderReviews, setRiderReviews] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("week");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [allOrders, setAllOrders] = useState([]);

  // Process orders for chart based on timeframe
  const processOrdersForChart = (orders, timeframe) => {
    const now = new Date();

    if (timeframe === "day") {
      const hours = Array.from({ length: 12 }, (_, i) => i * 2);
      return hours.map((hour) => {
        const label =
          hour === 0
            ? "12 AM"
            : hour < 12
              ? `${hour} AM`
              : hour === 12
                ? "12 PM"
                : `${hour - 12} PM`;

        const currentDayStart = new Date(now);
        currentDayStart.setHours(hour, 0, 0, 0);
        const currentDayEnd = new Date(now);
        currentDayEnd.setHours(hour + 2, 0, 0, 0);

        const prevDayStart = new Date(currentDayStart);
        prevDayStart.setDate(prevDayStart.getDate() - 1);
        const prevDayEnd = new Date(currentDayEnd);
        prevDayEnd.setDate(prevDayEnd.getDate() - 1);

        const thisday = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= currentDayStart && orderTime < currentDayEnd;
        }).length;

        const lastday = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= prevDayStart && orderTime < prevDayEnd;
        }).length;

        return { label, thisday, lastday };
      });
    }

    if (timeframe === "week") {
      const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - now.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      return days.map((day, index) => {
        const currentDayStart = new Date(currentWeekStart);
        currentDayStart.setDate(currentWeekStart.getDate() + index);
        const currentDayEnd = new Date(currentDayStart);
        currentDayEnd.setDate(currentDayEnd.getDate() + 1);

        const prevDayStart = new Date(currentDayStart);
        prevDayStart.setDate(prevDayStart.getDate() - 7);
        const prevDayEnd = new Date(currentDayEnd);
        prevDayEnd.setDate(prevDayEnd.getDate() - 7);

        const thisWeek = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= currentDayStart && orderTime < currentDayEnd;
        }).length;

        const lastWeek = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= prevDayStart && orderTime < prevDayEnd;
        }).length;

        return { label: day, thisWeek, lastWeek };
      });
    }

    if (timeframe === "month") {
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weeksInMonth = 4;

      return Array.from({ length: weeksInMonth }, (_, weekIndex) => {
        const currentWeekStart = new Date(currentMonthStart);
        currentWeekStart.setDate(1 + weekIndex * 7);
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 7);

        const prevWeekStart = new Date(currentWeekStart);
        prevWeekStart.setMonth(prevWeekStart.getMonth() - 1);
        const prevWeekEnd = new Date(currentWeekEnd);
        prevWeekEnd.setMonth(prevWeekEnd.getMonth() - 1);

        const thismonth = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= currentWeekStart && orderTime < currentWeekEnd;
        }).length;

        const lastmonth = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= prevWeekStart && orderTime < prevWeekEnd;
        }).length;

        return { label: `Week ${weekIndex + 1}`, thismonth, lastmonth };
      });
    }

    if (timeframe === "year") {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      return months.map((month, index) => {
        const currentMonthStart = new Date(now.getFullYear(), index, 1);
        const currentMonthEnd = new Date(now.getFullYear(), index + 1, 1);

        const prevMonthStart = new Date(now.getFullYear() - 1, index, 1);
        const prevMonthEnd = new Date(now.getFullYear() - 1, index + 1, 1);

        const thisyear = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= currentMonthStart && orderTime < currentMonthEnd;
        }).length;

        const lastyear = orders.filter((order) => {
          if (!order.time) return false;
          const orderTime = order.time.toDate();
          return orderTime >= prevMonthStart && orderTime < prevMonthEnd;
        }).length;

        return { label: month, thisyear, lastyear };
      });
    }

    return [];
  };

  // Get dynamic dataKey based on timeframe
  const getDataKeys = () => {
    switch (timeframe) {
      case "day":
        return { current: "thisday", previous: "lastday" };
      case "week":
        return { current: "thisWeek", previous: "lastWeek" };
      case "month":
        return { current: "thismonth", previous: "lastmonth" };
      case "year":
        return { current: "thisyear", previous: "lastyear" };
      default:
        return { current: "thisWeek", previous: "lastWeek" };
    }
  };

  // StatCard Component
  const StatCard = ({
    title,
    change,
    icon: Icon,
    isNegative,
    numericValue,
  }) => {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-black text-sm font-medium">{title}</h3>
          <div className="bg-stone-200/50 p-2 rounded-lg hover:bg-slate-700 transition-colors duration-300">
            <Icon className="w-5 h-5 text-black" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-black text-3xl font-bold">
            {title === "Total Revenue" ? (
              <>
                ₹<AnimatedNumber value={numericValue} duration={1000} />
              </>
            ) : (
              <AnimatedNumber value={numericValue} duration={1000} />
            )}
          </p>

          <div className="flex items-center gap-2">
            {isNegative ? (
              <TrendingDown className="w-4 h-4 text-red-800" />
            ) : (
              <TrendingUp className="w-4 h-4 text-green-800" />
            )}
            <span
              className={`text-sm font-medium ${isNegative ? "text-red-800" : "text-green-800"}`}>
              {change}
            </span>
            <span className="text-black text-sm">vs last month</span>
          </div>
        </div>
      </div>
    );
  };

  // Real-time listener for orders
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        if (!isMounted) return;

        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAllOrders(ordersData);

        let revenue = 0;
        let deliveredOrdersCount = 0;

        ordersData.forEach((order) => {
          const orderStatus = (order.orderStatus || "").toLowerCase();

          if (
            orderStatus === "delivered" &&
            order.items &&
            Array.isArray(order.items)
          ) {
            deliveredOrdersCount++;
            order.items.forEach((item) => {
              revenue += (item.price || 0) * (item.qnt || 1);
            });
          }
        });

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
                  0,
                )
              : 0,
          }))
          .sort((a, b) => b.time.toDate() - a.time.toDate());

        setTotalRevenue(revenue);
        setTotalOrders(deliveredOrdersCount);
        setRecentOrders(recentOrdersList);
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error fetching orders:", error);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Process chart data when orders or timeframe changes
  useEffect(() => {
    if (allOrders.length > 0) {
      const processedData = processOrdersForChart(allOrders, timeframe);
      setChartData(processedData);
    }
  }, [allOrders, timeframe]);

  // Real-time listener for users
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        if (!isMounted) return;
        setTotalUsers(snapshot.size);
        setLoading(false);
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error fetching users:", error);
        setLoading(false);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time listener for reviews
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "orderReview"),
      (snapshot) => {
        if (!isMounted) return;

        const reviewsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setTopReviews(reviewsData);
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error fetching reviews:", error);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time listener for rider reviews
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "riderReview"),
      (snapshot) => {
        if (!isMounted) return;

        const reviewsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRiderReviews(reviewsData);
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error fetching rider reviews:", error);
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

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

  const OrderTime = ({ timestamp }) => {
    if (!timestamp || !timestamp.toDate) return <span>N/A</span>;
    const date = timestamp.toDate();
    return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
  };

  const Time = ({ timestamp }) => {
    if (!timestamp || !timestamp.toDate) return <span>N/A</span>;
    const date = timestamp.toDate();
    return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>;
  };

  const filteredReviews =
    starFilter === "all"
      ? topReviews
      : topReviews.filter((review) => review.rating === parseInt(starFilter));

  const filteredRiderReviews =
    riderStarFilter === "all"
      ? riderReviews
      : riderReviews.filter((review) => review.rating === parseInt(riderStarFilter));

  const getStatusColor = (status) => {
    const normalizedStatus = (status || "").toLowerCase();
    switch (normalizedStatus) {
      case "delivered":
        return "text-green-600 font-semibold";
      case "pending":
        return "text-yellow-600 font-semibold";
      case "preparing":
        return "text-blue-600 font-semibold";
      case "cancelled":
        return "text-red-600 font-semibold";
      default:
        return "text-slate-600 font-semibold";
    }
  };

  const dataKeys = getDataKeys();

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-slate-900 text-3xl sm:text-4xl font-bold mb-2">
            Dashboard Overview
          </h1>
          <p className="text-slate-600 text-base sm:text-lg">
            Welcome back! Here's what's happening with your business today.
          </p>
        </div>

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

        <div className="w-full bg-white rounded-xl shadow-lg p-8 mb-5 border border-slate-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Order Activity Timeline
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Real-time view of order frequency and activity trends.
              </p>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
                {timeframe === "day" && "This day"}
                {timeframe === "week" && "This week"}
                {timeframe === "month" && "This month"}
                {timeframe === "year" && "This year"}
                <ChevronDown size={18} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-10">
                  {[
                    { value: "day", label: "This day" },
                    { value: "week", label: "This week" },
                    { value: "month", label: "This month" },
                    { value: "year", label: "This year" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimeframe(option.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors ${
                        timeframe === option.value
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-700"
                      }`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-sm font-medium text-slate-700">
                Current
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
              <span className="text-sm font-medium text-slate-700">
                Previous
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "none",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: "#fff" }}
                formatter={(value) => value.toLocaleString()}
              />
              <Area
                type="monotone"
                dataKey={dataKeys.current}
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCurrent)"
              />
              <Area
                type="monotone"
                dataKey={dataKeys.previous}
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrevious)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg border-2 border-gray-300">
            <h2 className="text-black text-xl font-bold mb-6">
              Recent Orders (Last 12 Hours)
            </h2>

            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-black text-sm">Loading orders...</p>
                </div>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border-b border-slate-300 mb-4 last:mb-0 hover:bg-slate-100 rounded-lg p-3 transition-colors duration-200">
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

                    <div className="mb-2 ml-2">
                      {order.items.map((item, idx) => (
                        <p key={idx} className="text-slate-700 text-sm">
                          • {item.name} × {item.qnt} - ₹{item.price}
                        </p>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm ${getStatusColor(order.orderStatus)}`}>
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
              {/* order review section */}
          <div className="bg-white from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border-2 border-gray-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-black text-xl font-bold">Order Reviews</h2>

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

            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-black text-sm">Loading reviews...</p>
                </div>
              ) : filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-slate-300 pb-4 hover:bg-slate-100 rounded-lg p-2 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-black font-bold text-xl mb-1">
                          {review.displayName}
                        </h3>
                        <p className="text-black mb-2 text-l">
                          {review.dish}
                        </p>
                        <p className="text-black mb-2 text-l">
                          {review.kitchenName}
                        </p>

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

                        <p className="text-black text-xl mb-2 font-bold">
                          {`"${review.review}"`}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end ">
                      <span className="text-black text-xs">
                        <Time timestamp={review.timeStamp} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-black text-xl">
                    No reviews found for this rating
                  </p>
                </div>
              )}
            </div>
          </div>

            {/* this is rider reviews page */}
          <div className="bg-white from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl border-2 border-gray-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-black text-xl font-bold">Rider Reviews</h2>

              <div className="relative">
                <select
                  value={riderStarFilter}
                  onChange={(e) => setRiderStarFilter(e.target.value)}
                  className="bg-white text-black border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-stone-400 transition-colors duration-200 focus:outline-none appearance-none pr-8">
                  <option value="all">All Stars</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                  <option value="3">⭐⭐⭐ 3 Stars</option>
                  <option value="2">⭐⭐ 2 Stars</option>
                  <option value="1">⭐ 1 Star</option>
                </select>
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

            <div className="space-y-4 max-h-125 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-black text-sm">Loading reviews...</p>
                </div>
              ) : filteredRiderReviews.length > 0 ? (
                filteredRiderReviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-slate-300 pb-4 hover:bg-slate-100 rounded-lg p-2 transition-colors duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-black font-semibold text-xl mb-1">
                          {review.riderName}
                        </h3>
                        <p className="text-black mb-2 text-l">
                          {review.kitchenName}
                        </p>

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

                        <p className="text-black text-xl mb-2 font-bold">
                          {`"${review.review}"`}
                        </p>
                        <p className="text-black mb-2 text-l font-semibold ml-40">
                          by - {review.userName}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end ">
                      <span className="text-black text-xs">
                        <Time timestamp={review.timeStamp} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-black text-xl">
                    No reviews found for this rating
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
