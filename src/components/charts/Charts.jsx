/**
 * Charts.jsx — Production Dashboard
 *
 * Data fetching fully powered by TanStack Query (useQuery / useQueries).
 * No manual useEffect for any remote data — only onSnapshot (real-time feeds)
 * still uses useEffect since TanStack Query doesn't natively wrap Firestore listeners.
 *
 * Query responsibilities:
 *  • summaryQuery       — getDoc("analytics/summary")          [1 read, stale 5 min]
 *  • usersCountQuery    — getCountFromServer("users")           [1 aggregation read]
 *  • chartQuery         — getDocs filtered by timeframe range   [cached per timeframe]
 *  • userNamesQuery     — getDoc per uid seen in feed           [enabled after feed loads]
 *
 * Real-time (still useEffect + onSnapshot):
 *  • recentOrders feed  — onSnapshot limit 50, filtered 12 h
 *  • reviews feed       — onSnapshot limit 20
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IndianRupee,
  ShoppingCart,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Star,
  ChevronDown,
  RefreshCw,
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
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getDoc,
  doc,
  getCountFromServer,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../Firebase";

// ─────────────────────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────────────────────
const QK = {
  summary: ["dashboard-summary"],
  usersCount: ["dashboard-users-count"],
  chart: (tf) => ["dashboard-chart", tf],
  userName: (uid) => ["dashboard-user-name", uid],
};

// ─────────────────────────────────────────────────────────────────────────────
// getRangeForTimeframe
// ─────────────────────────────────────────────────────────────────────────────
function getRangeForTimeframe(tf) {
  const now = new Date();
  let curStart, prevStart;

  if (tf === "day") {
    curStart = new Date(now);
    curStart.setHours(0, 0, 0, 0);
    prevStart = new Date(curStart);
    prevStart.setDate(prevStart.getDate() - 1);
  } else if (tf === "week") {
    curStart = new Date(now);
    curStart.setDate(now.getDate() - now.getDay());
    curStart.setHours(0, 0, 0, 0);
    prevStart = new Date(curStart);
    prevStart.setDate(prevStart.getDate() - 7);
  } else if (tf === "month") {
    curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  } else {
    curStart = new Date(now.getFullYear(), 0, 1);
    prevStart = new Date(now.getFullYear() - 1, 0, 1);
  }

  return {
    rangeStart: Timestamp.fromDate(prevStart),
    rangeEnd: Timestamp.fromDate(now),
    curStart,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// buildChart — O(n), correct boundaries
// ─────────────────────────────────────────────────────────────────────────────
function buildChart(orders, tf) {
  const now = new Date();

  const getBucket = (date) => {
    if (tf === "day") return Math.floor(date.getHours() / 2);
    if (tf === "week") return date.getDay();
    if (tf === "month") {
      const dom = date.getDate() - 1;
      return Math.min(Math.floor(dom / 7), 3);
    }
    return date.getMonth();
  };

  const { curStart } = getRangeForTimeframe(tf);
  const curMap = {};
  const prevMap = {};

  orders.forEach((o) => {
    const date = o.createdAt?.toDate?.();
    if (!date) return;
    const isCur = date >= curStart;
    const bucket = getBucket(date);
    if (isCur) curMap[bucket] = (curMap[bucket] || 0) + 1;
    else prevMap[bucket] = (prevMap[bucket] || 0) + 1;
  });

  if (tf === "day") {
    return Array.from({ length: 12 }, (_, i) => {
      const h = i * 2;
      const label =
        h === 0
          ? "12AM"
          : h < 12
            ? `${h}AM`
            : h === 12
              ? "12PM"
              : `${h - 12}PM`;
      return { label, current: curMap[i] || 0, previous: prevMap[i] || 0 };
    });
  }
  if (tf === "week") {
    return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
      (label, i) => ({
        label,
        current: curMap[i] || 0,
        previous: prevMap[i] || 0,
      }),
    );
  }
  if (tf === "month") {
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    return [0, 1, 2, 3].map((w) => {
      const dayStart = 1 + w * 7;
      const dayEnd = Math.min(dayStart + 6, daysInMonth);
      return {
        label: `${dayStart}–${dayEnd}`,
        current: curMap[w] || 0,
        previous: prevMap[w] || 0,
      };
    });
  }
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
  return months.slice(0, now.getMonth() + 1).map((label, i) => ({
    label,
    current: curMap[i] || 0,
    previous: prevMap[i] || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetcher functions (pure async — easy to test, easy to cache)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchSummary() {
  // Directly scan orders — reliable, cached by TanStack after first load.
  // Swap for a getDoc("analytics/summary") once a Cloud Function maintains it.
  const allSnap = await getDocs(collection(db, "orders"));
  let totalRevenue = 0;
  allSnap.docs.forEach((d) => {
    totalRevenue += Number(d.data().total_amount) || 0;
  });
  return { totalRevenue, totalOrders: allSnap.size };
}

async function fetchUsersCount() {
  const snap = await getCountFromServer(collection(db, "users"));
  return snap.data().count;
}

async function fetchChartData(tf) {
  const { rangeStart, rangeEnd } = getRangeForTimeframe(tf);
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("created_at", ">=", rangeStart),
      where("created_at", "<=", rangeEnd),
      orderBy("created_at", "asc"),
    ),
  );
  const orders = snap.docs.map((d) => ({
    id: d.id,
    createdAt: d.data().created_at,
  }));
  return buildChart(orders, tf);
}

async function fetchUserName(uid) {
  if (!uid) return "N/A";
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data().name || "Unknown" : "Unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// useDashboard
// ─────────────────────────────────────────────────────────────────────────────
function useDashboard(timeframe) {
  // ── Real-time feed state (onSnapshot — TanStack doesn't cover listeners) ──
  const [rawFeed, setRawFeed] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // ── 1. Summary ────────────────────────────────────────────────────────────
  const summaryQuery = useQuery({
    queryKey: QK.summary,
    queryFn: fetchSummary,
    staleTime: 0, // always re-fetch on mount so stale 0s never show
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  // ── 2. Users count ────────────────────────────────────────────────────────
  const usersCountQuery = useQuery({
    queryKey: QK.usersCount,
    queryFn: fetchUsersCount,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ── 3. Chart data (per timeframe) ─────────────────────────────────────────
  const chartQuery = useQuery({
    queryKey: QK.chart(timeframe),
    queryFn: () => fetchChartData(timeframe),
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // ── 4. User names — one query per unique uid seen in the feed ─────────────
  //    useQueries fires them in parallel; each is individually cached.
  const uniqueUids = [...new Set(rawFeed.map((o) => o.userId).filter(Boolean))];

  const userNameQueries = useQueries({
    queries: uniqueUids.map((uid) => ({
      queryKey: QK.userName(uid),
      queryFn: () => fetchUserName(uid),
      staleTime: Infinity, // names don't change mid-session
      gcTime: Infinity,
      enabled: uniqueUids.length > 0,
    })),
  });

  // Build uid→name map from settled queries
  const userNameMap = Object.fromEntries(
    uniqueUids.map((uid, i) => [uid, userNameQueries[i]?.data ?? uid]),
  );

  // Resolve names into the feed rows
  const recentOrders = rawFeed.map((o) => ({
    ...o,
    name: userNameMap[o.userId] || o.userId || "N/A",
  }));

  // ── 5. Recent orders feed — live onSnapshot ───────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      orderBy("created_at", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const cutoff = new Date(Date.now() - 12 * 3600_000);
        const feed = [];
        snap.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const odt = d.created_at?.toDate?.();
          if (!odt || odt < cutoff) return;
          const userId = d.user_id || "";
          feed.push({
            id: docSnap.id,
            userId,
            name: userId, // resolved above via userNameMap
            kitchenName: d.kitchen_name || "N/A",
            address: d.delivery_address || "N/A",
            order_status: d.order_status || "Pending",
            createdAt: d.created_at,
            totalPrice: d.total_amount ?? 0,
            items: (d.items || []).map((i) => ({
              name: i.dish_name || i.name || "Item",
              price: i.price ?? 0,
              qnt: i.quantity ?? 1,
            })),
          });
        });
        setRawFeed(feed);
        setLoadingFeed(false);
      },
      (err) => {
        console.error("[dashboard] feed:", err);
        setLoadingFeed(false);
      },
    );
    return () => unsub();
  }, []);

  // ── 6. Reviews — live onSnapshot ─────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "orderReview"),
      orderBy("timeStamp", "desc"),
      limit(20),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(
          snap.docs.map((d) => {
            const r = d.data();
            return {
              id: d.id,
              name: r.displayName || "Anonymous",
              product: r.dish || r.kitchenName || "",
              comment: r.review || "",
              rating: r.rating || 0,
              time: r.timeStamp || null,
            };
          }),
        );
      },
      (err) => console.error("[dashboard] reviews:", err),
    );
    return () => unsub();
  }, []);

  // ── Dynamic % change ──────────────────────────────────────────────────────
  const chartData = chartQuery.data ?? [];
  const pctChange = useCallback((data) => {
    const cur = data.reduce((s, p) => s + (p.current || 0), 0);
    const prev = data.reduce((s, p) => s + (p.previous || 0), 0);
    if (prev === 0) return cur > 0 ? "+100%" : "—";
    const d = ((cur - prev) / prev) * 100;
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
  }, []);

  const orderChange = pctChange(chartData);
  const isOrderNeg = orderChange.startsWith("-");

  return {
    summary: summaryQuery.data ?? { totalRevenue: 0, totalOrders: 0 },
    totalUsers: usersCountQuery.data ?? 0,
    reviews,
    recentOrders,
    chartData,
    orderChange,
    isOrderNeg,
    loading: {
      summary: summaryQuery.isLoading,
      chart: chartQuery.isLoading,
      feed: loadingFeed,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedNumber
// ─────────────────────────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, duration = 900 }) => {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;
    let id, start;
    const run = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({
  title,
  icon: Icon,
  isNegative,
  numericValue,
  change,
  loading,
}) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-black text-sm font-medium">{title}</h3>
      <div className="bg-stone-200/50 p-2 rounded-lg">
        <Icon className="w-5 h-5 text-black" />
      </div>
    </div>
    <div className="flex flex-col gap-2">
      {loading ? (
        <Skeleton className="h-9 w-32 mb-1" />
      ) : (
        <p className="text-black text-3xl font-bold">
          {title === "Total Revenue" ? (
            <>
              ₹<AnimatedNumber value={numericValue} />
            </>
          ) : (
            <AnimatedNumber value={numericValue} />
          )}
        </p>
      )}
      <div className="flex items-center gap-2">
        {isNegative ? (
          <TrendingDown className="w-4 h-4 text-red-800" />
        ) : (
          <TrendingUp className="w-4 h-4 text-green-800" />
        )}
        <span
          className={`text-sm font-medium ${isNegative ? "text-red-800" : "text-green-800"}`}>
          {loading ? "…" : change}
        </span>
        <span className="text-black text-sm">vs previous period</span>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  delivered: "text-green-600",
  pending: "text-yellow-600",
  preparing: "text-blue-600",
  cancelled: "text-red-600",
};

const TF_LABELS = {
  day: "Today",
  week: "This week",
  month: "This month",
  year: "This year",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function Charts() {
  const [starFilter, setStarFilter] = useState("all");
  const [timeframe, setTimeframe] = useState("week");
  const [dropdown, setDropdown] = useState(false);

  const {
    summary,
    totalUsers,
    reviews,
    recentOrders,
    chartData,
    orderChange,
    isOrderNeg,
    loading,
  } = useDashboard(timeframe);

  const filteredReviews =
    starFilter === "all"
      ? reviews
      : reviews.filter((r) => r.rating === parseInt(starFilter));

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-slate-900 text-3xl sm:text-4xl font-bold mb-2">
            Dashboard Overview
          </h1>
          <p className="text-slate-600">
            Welcome back! Here's what's happening.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            numericValue={summary.totalRevenue}
            change={orderChange}
            icon={IndianRupee}
            isNegative={isOrderNeg}
            loading={loading.summary}
          />
          <StatCard
            title="Total Orders"
            numericValue={summary.totalOrders}
            change={orderChange}
            icon={ShoppingCart}
            isNegative={isOrderNeg}
            loading={loading.summary}
          />
          <StatCard
            title="Total Users"
            numericValue={totalUsers}
            change="—"
            icon={UserPlus}
            isNegative={false}
            loading={totalUsers === 0}
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
                Showing all orders for the selected window
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setDropdown((p) => !p)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                {TF_LABELS[timeframe]} <ChevronDown size={18} />
              </button>
              {dropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-10">
                  {Object.entries(TF_LABELS).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => {
                        setTimeframe(val);
                        setDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-100 transition text-sm ${
                        timeframe === val
                          ? "bg-blue-50 text-blue-600 font-semibold"
                          : "text-slate-700"
                      }`}>
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
              <span className="text-sm text-slate-700">Current period</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full" />
              <span className="text-sm text-slate-700">Previous period</span>
            </div>
          </div>

          {loading.chart ? (
            <div className="h-[300px] flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
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
                <YAxis
                  stroke="#94a3b8"
                  style={{ fontSize: "12px" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#94a3b8" }}
                />
                <Area
                  type="monotone"
                  dataKey="current"
                  name="Current"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gc)"
                />
                <Area
                  type="monotone"
                  dataKey="previous"
                  name="Previous"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Feed + Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-black text-xl font-bold">Recent Orders</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                Last 12 hours
              </span>
            </div>
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {loading.feed ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="space-y-2 pb-3 border-b border-slate-100">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))
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
