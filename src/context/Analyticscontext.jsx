/**
 * AnalyticsContext
 *
 * Strategy:
 *  - Fetch once (getDocs, not onSnapshot) — analytics don't need live updates
 *  - Orders: limit(200) — enough to compute meaningful revenue/frequency stats
 *  - Users: getCountFromServer for total count (1 read, not N reads)
 *  - Users with location: limit(200) — enough for heatmap
 *
 * For production with 1 lakh records, you'd move this aggregation
 * to a Cloud Function that runs on a schedule and writes summary docs.
 * For now, limit(200) is safe and gives useful data.
 */
import { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  collection,
  getDocs,
  query,
  limit,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../Firebase";

const AnalyticsContext = createContext(null);

const MONTHS = [
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

export function AnalyticsProvider({ children }) {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        // ── Orders: limit 200 for aggregate stats ───────────────
        const ordersSnap = await getDocs(
          query(collection(db, "orders"), limit(200)),
        );

        const monthBuckets = Object.fromEntries(
          MONTHS.map((m) => [m, { revenue: 0, count: 0 }]),
        );
        let cancelledCount = 0,
          weeklyCount = 0,
          monthlyCount = 0,
          totalRevenue = 0;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);

        ordersSnap.forEach((doc) => {
          const d = doc.data();
          const status = (d.order_status || "").toLowerCase();

          if (status === "cancelled") cancelledCount++;

          const date = d.createdAt?.toDate?.() ?? null;
          if (date) {
            if (date >= oneWeekAgo) weeklyCount++;
            if (date >= oneMonthAgo) monthlyCount++;
          }

          if (status !== "delivered") return;

          let total = 0;
          (d.items || []).forEach((i) => {
            total += (i.price || 0) * (i.qnt || 1);
          });
          totalRevenue += total;

          if (date) {
            const key = MONTHS[date.getMonth()];
            monthBuckets[key].revenue += total;
            monthBuckets[key].count += 1;
          }
        });

        const maxRev = Math.max(
          ...Object.values(monthBuckets).map((b) => b.revenue),
          1,
        );
        const revenueData = MONTHS.map((month) => ({
          month,
          revenue: `₹${Math.round(monthBuckets[month].revenue).toLocaleString()}`,
          orders: `${monthBuckets[month].count} orders`,
          percentage: (monthBuckets[month].revenue / maxRev) * 100,
        }));

        const orderFrequency = [
          {
            label: "Weekly",
            count: weeklyCount,
            percentage: Math.min((weeklyCount / 50) * 100, 100),
            color: "bg-purple-500",
          },
          {
            label: "Monthly",
            count: monthlyCount,
            percentage: Math.min((monthlyCount / 50) * 100, 100),
            color: "bg-blue-500",
          },
        ];

        // ── Total customers: count only, 1 Firestore read ───────
        const countSnap = await getCountFromServer(collection(db, "users"));
        const totalCustomers = countSnap.data().count;

        // ── Users with orders for heatmap: limit 200 ────────────
        const usersSnap = await getDocs(
          query(collection(db, "users"), limit(200)),
        );

        let firstTimeCustomers = 0,
          firstTimeOrders = 0;
        const usersWithOrders = [];

        usersSnap.forEach((doc) => {
          const d = doc.data();
          const n = d.noOfOrders || 0;
          if (n === 0) firstTimeCustomers++;
          if (n === 1) firstTimeOrders++;
          if (n > 0 && d.location) {
            usersWithOrders.push({
              id: doc.id,
              name: d.name || "Unknown",
              noOfOrders: n,
              location: d.location, // GeoPoint — .latitude / .longitude
            });
          }
        });

        setAnalyticsData({
          revenueData,
          totalRevenue: Math.round(totalRevenue),
          cancelledOrders: cancelledCount,
          orderFrequency,
          totalCustomers, // from getCountFromServer — accurate even with 1 lakh users
          firstTimeCustomers, // approximate (based on 200-user sample)
          firstTimeOrders,
          usersWithOrders,
        });
      } catch (err) {
        console.error("[AnalyticsContext]", err);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const value = useMemo(
    () => ({ analyticsData, loading }),
    [analyticsData, loading],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx)
    throw new Error("useAnalytics must be used inside <AnalyticsProvider>");
  return ctx;
}
