/**
 * DashboardContext
 *
 * Strategy:
 *  - Orders: real-time listener on FIRST 20 only (createdAt desc)
 *    → Recent orders (last 12h) come from this 20-doc window
 *    → Chart data comes from this same window (lightweight, approximate for dashboard)
 *  - Users count: snapshot.size — Firestore counts docs without downloading them
 *    (uses collection-level count, not document reads)
 *  - Reviews: real-time, latest 20 only
 *
 * Cost: 20 (orders) + 20 (reviews) + 1 (users count) reads on mount
 * vs previous: 200 orders + all users + 50 reviews = potentially thousands
 */
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../Firebase";

const DashboardContext = createContext(null);

const PAGE_SIZE = 20;

export function DashboardProvider({ children }) {
  const [recentOrders, setRecentOrders] = useState([]);
  const [allOrdersForChart, setAllOrdersForChart] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDeliveredOrders, setTotalDeliveredOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Orders: real-time, FIRST 20 only ──────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 3600000);

        let revenue = 0,
          deliveredCount = 0;
        const recent = [],
          allForChart = [];

        snapshot.docs.forEach((doc) => {
          const d = doc.data();
          const status = (d.order_status || "").toLowerCase();
          const orderDate = d.createdAt?.toDate?.() ?? null;

          allForChart.push({
            id: doc.id,
            createdAt: d.createdAt,
            order_status: d.order_status,
          });

          if (status === "delivered") {
            deliveredCount++;
            (d.items || []).forEach((i) => {
              revenue += (i.price || 0) * (i.qnt || 1);
            });
          }

          if (orderDate && orderDate >= twelveHoursAgo) {
            const totalPrice = (d.items || []).reduce(
              (s, i) => s + (i.price || 0) * (i.qnt || 1),
              0,
            );
            recent.push({
              id: doc.id,
              name: d.name || "N/A",
              kitchenName: d.kitchenName || "N/A",
              address: d.address || "N/A",
              order_status: d.order_status || "Pending",
              createdAt: d.createdAt,
              items: d.items || [],
              totalPrice,
            });
          }
        });

        setRecentOrders(recent);
        setAllOrdersForChart(allForChart);
        setTotalRevenue(revenue);
        setTotalDeliveredOrders(deliveredCount);
        setLoading(false);
      },
      (err) => {
        console.error("[DashboardContext] orders:", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  // ── Users: use getCountFromServer — returns COUNT not documents ─
  // This costs 1 read regardless of how many users exist (even 1 lakh)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, "users"));
        setTotalUsers(snapshot.data().count);
      } catch (err) {
        console.error("[DashboardContext] user count:", err);
      }
    };
    fetchCount();
  }, []);

  // ── Reviews: real-time, latest 20 only ────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "orderReview"),
      orderBy("timeStamp", "desc"),
      limit(PAGE_SIZE),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReviews(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.displayName || "Anonymous",
              product: d.dish || d.kitchenName || "",
              comment: d.review || "",
              rating: d.rating || 0,
              time: d.timeStamp || null,
            };
          }),
        );
      },
      (err) => console.error("[DashboardContext] reviews:", err),
    );

    return () => unsub();
  }, []);

  const value = useMemo(
    () => ({
      recentOrders,
      allOrdersForChart,
      reviews,
      totalUsers,
      totalRevenue,
      totalDeliveredOrders,
      loading,
    }),
    [
      recentOrders,
      allOrdersForChart,
      reviews,
      totalUsers,
      totalRevenue,
      totalDeliveredOrders,
      loading,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used inside <DashboardProvider>");
  return ctx;
}
