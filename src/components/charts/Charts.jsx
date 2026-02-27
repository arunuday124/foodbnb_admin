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
import { formatDistanceToNow } from "date-fns";
import { useDashboard } from "../../context/Dashboardcontext";

const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let id, start;
    const run = (now) => {
      if (!start) start = now;
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.floor(p * value));
      if (p < 1) id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
};

const buildChart = (orders, tf) => {
  const now = new Date();
  const inRange = (o, s, e) => {
    const t = o.createdAt?.toDate?.();
    return t && t >= s && t < e;
  };

  if (tf === "day") {
    return Array.from({ length: 12 }, (_, i) => i * 2).map((h) => {
      const label =
        h === 0
          ? "12AM"
          : h < 12
            ? `${h}AM`
            : h === 12
              ? "12PM"
              : `${h - 12}PM`;
      const s = new Date(now);
      s.setHours(h, 0, 0, 0);
      const e = new Date(now);
      e.setHours(h + 2, 0, 0, 0);
      const ps = new Date(s);
      ps.setDate(ps.getDate() - 1);
      const pe = new Date(e);
      pe.setDate(pe.getDate() - 1);
      return {
        label,
        thisday: orders.filter((o) => inRange(o, s, e)).length,
        lastday: orders.filter((o) => inRange(o, ps, pe)).length,
      };
    });
  }
  if (tf === "week") {
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const ws = new Date(now);
    ws.setDate(now.getDate() - now.getDay());
    ws.setHours(0, 0, 0, 0);
    return days.map((label, i) => {
      const s = new Date(ws);
      s.setDate(ws.getDate() + i);
      const e = new Date(s);
      e.setDate(e.getDate() + 1);
      const ps = new Date(s);
      ps.setDate(ps.getDate() - 7);
      const pe = new Date(e);
      pe.setDate(pe.getDate() - 7);
      return {
        label,
        thisWeek: orders.filter((o) => inRange(o, s, e)).length,
        lastWeek: orders.filter((o) => inRange(o, ps, pe)).length,
      };
    });
  }
  if (tf === "month") {
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    return [1, 2, 3, 4].map((w) => {
      const s = new Date(ms);
      s.setDate(1 + (w - 1) * 7);
      const e = new Date(s);
      e.setDate(s.getDate() + 7);
      const ps = new Date(s);
      ps.setMonth(ps.getMonth() - 1);
      const pe = new Date(e);
      pe.setMonth(pe.getMonth() - 1);
      return {
        label: `Week ${w}`,
        thismonth: orders.filter((o) => inRange(o, s, e)).length,
        lastmonth: orders.filter((o) => inRange(o, ps, pe)).length,
      };
    });
  }
  // year
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
  return months.map((label, i) => {
    const s = new Date(now.getFullYear(), i, 1);
    const e = new Date(now.getFullYear(), i + 1, 1);
    const ps = new Date(now.getFullYear() - 1, i, 1);
    const pe = new Date(now.getFullYear() - 1, i + 1, 1);
    return {
      label,
      thisyear: orders.filter((o) => inRange(o, s, e)).length,
      lastyear: orders.filter((o) => inRange(o, ps, pe)).length,
    };
  });
};

const KEYS = {
  day: { cur: "thisday", prev: "lastday" },
  week: { cur: "thisWeek", prev: "lastWeek" },
  month: { cur: "thismonth", prev: "lastmonth" },
  year: { cur: "thisyear", prev: "lastyear" },
};

const STATUS_COLOR = {
  delivered: "text-green-600",
  pending: "text-yellow-600",
  preparing: "text-blue-600",
  cancelled: "text-red-600",
};

const StatCard = ({ title, icon: Icon, isNegative, numericValue, change }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-black text-sm font-medium">{title}</h3>
      <div className="bg-stone-200/50 p-2 rounded-lg">
        <Icon className="w-5 h-5 text-black" />
      </div>
    </div>
    <div className="flex flex-col gap-2">
      <p className="text-black text-3xl font-bold">
        {title === "Total Revenue" ? (
          <>
            ₹<AnimatedNumber value={numericValue} />
          </>
        ) : (
          <AnimatedNumber value={numericValue} />
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

export default function Charts() {
  const {
    recentOrders,
    allOrdersForChart,
    reviews,
    totalUsers,
    totalRevenue,
    totalDeliveredOrders,
    loading,
  } = useDashboard();
  const [starFilter, setStarFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("week");
  const [dropdown, setDropdown] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (allOrdersForChart.length > 0)
      setChartData(buildChart(allOrdersForChart, timeframe));
  }, [allOrdersForChart, timeframe]);

  const filteredReviews =
    starFilter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(starFilter));
  const keys = KEYS[timeframe];
  const TF = {
    day: "This day",
    week: "This week",
    month: "This month",
    year: "This year",
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-slate-900 text-3xl sm:text-4xl font-bold mb-2">
            Dashboard Overview
          </h1>
          <p className="text-slate-600">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            numericValue={totalRevenue}
            change="20.1%"
            icon={IndianRupee}
            isNegative={false}
          />
          <StatCard
            title="Total Orders"
            numericValue={totalDeliveredOrders}
            change="4.2%"
            icon={ShoppingCart}
            isNegative={true}
          />
          <StatCard
            title="Total Users"
            numericValue={totalUsers}
            change="8.7%"
            icon={UserPlus}
            isNegative={true}
          />
        </div>

        {/* Chart */}
        <div className="w-full bg-white rounded-xl shadow-lg p-6 mb-6 border border-slate-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Order Activity Timeline
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Order frequency trends
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setDropdown((p) => !p)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                {TF[timeframe]} <ChevronDown size={18} />
              </button>
              {dropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-10">
                  {Object.entries(TF).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => {
                        setTimeframe(val);
                        setDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-100 transition text-sm ${timeframe === val ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-700"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span className="text-sm text-slate-700">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full" />
              <span className="text-sm text-slate-700">Previous</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
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
                }}
                labelStyle={{ color: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey={keys.cur}
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gc)"
              />
              <Area
                type="monotone"
                dataKey={keys.prev}
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300">
            <h2 className="text-black text-xl font-bold mb-6">
              Recent Orders (Last 12 Hours)
            </h2>
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {loading ? (
                <p className="text-center text-slate-500 py-8">Loading...</p>
              ) : recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border-b border-slate-200 pb-3 hover:bg-slate-50 rounded-lg p-3 transition">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <h3 className="text-black font-semibold">
                          {order.name}
                        </h3>
                        <p className="text-slate-500 text-sm">
                          {order.kitchenName}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {order.address}
                        </p>
                      </div>
                      <span className="text-black font-bold">
                        ₹{order.totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="ml-1 mb-1">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-slate-600 text-xs">
                          • {item.name} × {item.qnt} — ₹{item.price}
                        </p>
                      ))}
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`text-sm font-semibold ${STATUS_COLOR[(order.order_status || "").toLowerCase()] || "text-slate-600"}`}>
                        {order.order_status}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {order.createdAt?.toDate
                          ? formatDistanceToNow(order.createdAt.toDate(), {
                              addSuffix: true,
                            })
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">
                  No orders in the last 12 hours
                </p>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border-2 border-gray-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-black text-xl font-bold">Top Reviews</h2>
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                className="bg-white text-black border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none">
                <option value="all">All Stars</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"⭐".repeat(n)} {n} Stars
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((r) => (
                  <div
                    key={r.id}
                    className="border-b border-slate-200 pb-3 hover:bg-slate-50 rounded-lg p-3 transition">
                    <h3 className="text-black font-semibold">{r.name}</h3>
                    <p className="text-slate-500 text-sm mb-1">{r.product}</p>
                    <div className="flex gap-0.5 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-black text-sm font-medium">
                      {r.comment}
                    </p>
                    <p className="text-slate-400 text-xs text-right mt-1">
                      {r.time?.toDate
                        ? formatDistanceToNow(r.time.toDate(), {
                            addSuffix: true,
                          })
                        : "N/A"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">
                  No reviews found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
