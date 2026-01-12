import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../Firebase";

// --- Sub-component for Number Animation ---
const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0);
  const numericValue = Number(value.replace(/[^0-9.-]+/g, ""));
  const suffix = value.replace(/[0-9.,-]+/g, "");
  const isPrefix = value.startsWith(suffix);

  useEffect(() => {
    let start = 0;
    const end = numericValue;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [numericValue, duration]);

  const formatted = count.toLocaleString(undefined, {
    maximumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
  });

  return isPrefix ? `${suffix}${formatted}` : `${formatted}${suffix}`;
};

const Analytics = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [firstTimeCustomers, setFirstTimeCustomers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [cancelledOrders, setCancelledOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState([
    { month: "Dec", revenue: "₹0", orders: "0 orders", percentage: 0 },
    { month: "Jan", revenue: "₹0", orders: "0 orders", percentage: 0 },
    { month: "Feb", revenue: "₹0", orders: "0 orders", percentage: 0 },
    { month: "Mar", revenue: "₹0", orders: "0 orders", percentage: 0 },
    { month: "Apr", revenue: "₹0", orders: "0 orders", percentage: 0 },
    { month: "May", revenue: "₹0", orders: "0 orders", percentage: 0 },
  ]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [orderFrequency, setOrderFrequency] = useState([
    { label: "Weekly", percentage: 0, count: 0, color: "bg-purple-500" },
    { label: "Monthly", percentage: 0, count: 0, color: "bg-purple-500" },
  ]);

  // Real-time listener for orders
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "orders"),
      (snapshot) => {
        if (!isMounted) return;

        const monthData = {
          Dec: { delivered: 0, count: 0 },
          Jan: { delivered: 0, count: 0 },
          Feb: { delivered: 0, count: 0 },
          Mar: { delivered: 0, count: 0 },
          Apr: { delivered: 0, count: 0 },
          May: { delivered: 0, count: 0 },
        };

        let cancelledCount = 0;
        let weeklyOrdersCount = 0;
        let monthlyOrdersCount = 0;

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        snapshot.forEach((doc) => {
          const orderData = doc.data();
          const orderStatus = (orderData.orderStatus || "").toLowerCase();

          // Count cancelled orders (check for both "cancelled" and "Cancelled")
          if (orderStatus === "cancelled") {
            cancelledCount++;
          }

          // Get order date for frequency calculation
          const time = orderData.time;
          let orderDate = null;
          if (time) {
            orderDate =
              time.toDate instanceof Function ? time.toDate() : new Date(time);

            // Count weekly orders (last 7 days)
            if (orderDate >= oneWeekAgo) {
              weeklyOrdersCount++;
            }

            // Count monthly orders (last 30 days)
            if (orderDate >= oneMonthAgo) {
              monthlyOrdersCount++;
            }
          }

          // Only process delivered orders for revenue
          if (orderStatus !== "delivered") {
            return;
          }

          // Calculate total price for this order
          let totalPrice = 0;

          if (orderData.items && Array.isArray(orderData.items)) {
            orderData.items.forEach((item) => {
              const itemPrice = parseFloat(item.price) || 0;
              const itemQnt = parseFloat(item.qnt) || 1;
              totalPrice += itemPrice * itemQnt;
            });
          }

          // Get month from time field
          let month = "";
          if (orderDate) {
            const monthIndex = orderDate.getMonth();
            const monthNames = [
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
            month = monthNames[monthIndex];
          }

          // Add to month data if month exists in our tracking
          if (monthData[month] !== undefined) {
            monthData[month].delivered += totalPrice;
            monthData[month].count += 1;
          }
        });

        setCancelledOrders(cancelledCount);

        // Calculate order frequency percentages with base value of 50
        const baseValue = 50;
        const weeklyPercentage = Math.min(
          (weeklyOrdersCount / baseValue) * 100,
          100
        );
        const monthlyPercentage = Math.min(
          (monthlyOrdersCount / baseValue) * 100,
          100
        );

        setOrderFrequency([
          {
            label: "Weekly",
            percentage: weeklyPercentage,
            count: weeklyOrdersCount,
            color: "bg-purple-500",
          },
          {
            label: "Monthly",
            percentage: monthlyPercentage,
            count: monthlyOrdersCount,
            color: "bg-purple-500",
          },
        ]);

        // Calculate percentages with base value of 10000
        const revenueBaseValue = 10000;

        const updatedRevenueData = [
          {
            month: "Dec",
            revenue: `₹${Math.round(monthData.Dec.delivered).toLocaleString()}`,
            delivered: monthData.Dec.delivered,
            orders: `${monthData.Dec.count} orders`,
            percentage: Math.min(
              (monthData.Dec.delivered / revenueBaseValue) * 100,
              100
            ),
          },
          {
            month: "Jan",
            revenue: `₹${Math.round(monthData.Jan.delivered).toLocaleString()}`,
            delivered: monthData.Jan.delivered,
            orders: `${monthData.Jan.count} orders`,
            percentage: Math.min(
              (monthData.Jan.delivered / revenueBaseValue) * 100,
              100
            ),
          },
          {
            month: "Feb",
            revenue: `₹${Math.round(monthData.Feb.delivered).toLocaleString()}`,
            delivered: monthData.Feb.delivered,
            orders: `${monthData.Feb.count} orders`,
            percentage: Math.min(
              (monthData.Feb.delivered / revenueBaseValue) * 100,
              100
            ),
          },
          {
            month: "Mar",
            revenue: `₹${Math.round(monthData.Mar.delivered).toLocaleString()}`,
            delivered: monthData.Mar.delivered,
            orders: `${monthData.Mar.count} orders`,
            percentage: Math.min(
              (monthData.Mar.delivered / revenueBaseValue) * 100,
              100
            ),
          },
          {
            month: "Apr",
            revenue: `₹${Math.round(monthData.Apr.delivered).toLocaleString()}`,
            delivered: monthData.Apr.delivered,
            orders: `${monthData.Apr.count} orders`,
            percentage: Math.min(
              (monthData.Apr.delivered / revenueBaseValue) * 100,
              100
            ),
          },
          {
            month: "May",
            revenue: `₹${Math.round(monthData.May.delivered).toLocaleString()}`,
            delivered: monthData.May.delivered,
            orders: `${monthData.May.count} orders`,
            percentage: Math.min(
              (monthData.May.delivered / revenueBaseValue) * 100,
              100
            ),
          },
        ];

        setRevenueData(updatedRevenueData);

        const totalDeliveredRevenue = Object.values(monthData).reduce(
          (sum, month) => sum + month.delivered,
          0
        );

        setTotalRevenue(Math.round(totalDeliveredRevenue));
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error fetching orders:", error);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Real-time listener for users (total customers and first-time customers)
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        if (!isMounted) return;

        const totalCount = snapshot.size;

        // Count users with noOfOrders === 0 or noOfOrders === 1
        let firstTimeCount = 0;
        snapshot.forEach((doc) => {
          const userData = doc.data();
          const noOfOrders = userData.noOfOrders || 0;

          if (noOfOrders === 0 || noOfOrders === 1) {
            firstTimeCount++;
          }
        });

        setTotalCustomers(totalCount);
        setFirstTimeCustomers(firstTimeCount);
        setLoading(false);
        setIsLoaded(true);
      },
      (error) => {
        if (!isMounted) return;
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const statsCards = [
    {
      label: "Total Customers",
      value: loading ? "0" : totalCustomers.toString(),
      change: "12.5% vs last month",
      isPositive: true,
    },
    {
      label: "First Time Customers",
      value: loading ? "0" : firstTimeCustomers.toString(),
      change: "8.3% vs last month",
      isPositive: true,
    },
    {
      label: "Cancelled Orders",
      value: loading ? "0" : cancelledOrders.toString(),
      change: "2.1% vs last month",
      isPositive: false,
    },
  ];

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8 shadow-sm">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your business performance and insights
          </p>
        </div>

        {/* Stats Cards - 3 cards in equal grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-xl">
              <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                <AnimatedNumber value={stat.value} />
              </p>
              <div className="flex items-center gap-1">
                {stat.isPositive ? (
                  <TrendingUp size={16} className="text-green-600" />
                ) : (
                  <TrendingDown size={16} className="text-red-600" />
                )}
                <p
                  className={`text-sm ${
                    stat.isPositive ? "text-green-600" : "text-red-600"
                  }`}>
                  {stat.change}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Revenue Trend</h2>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-lg font-bold">₹</span>
              </div>
            </div>

            <div className="space-y-6">
              {revenueData.map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {item.month}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-900">
                        {item.revenue}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({item.orders})
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: isLoaded ? `${item.percentage}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Total Revenue (Last 6 Months)
                </span>
                <span className="text-2xl font-bold text-green-600">
                  ₹{totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Insights */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Customer Insights
              </h2>
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Users size={18} className="text-purple-600" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-purple-700 font-medium mb-2">
                Total Customers
              </p>
              <p className="text-4xl font-bold text-purple-900 mb-2">
                <AnimatedNumber
                  value={loading ? "0" : totalCustomers.toString()}
                />
              </p>
              <p className="text-sm text-purple-600">
                +{loading ? "0" : firstTimeCustomers.toString()} first time
                customers
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <p className="text-sm text-blue-700 font-medium mb-2">
                  First Time
                </p>
                <p className="text-3xl font-bold text-blue-900 mb-1">
                  <AnimatedNumber
                    value={loading ? "0" : firstTimeCustomers.toString()}
                  />
                </p>
                <p className="text-sm text-blue-600">
                  {loading || totalCustomers === 0
                    ? "0"
                    : ((firstTimeCustomers / totalCustomers) * 100).toFixed(1)}
                  %
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-6">
                <p className="text-sm text-red-700 font-medium mb-2">
                  Cancelled
                </p>
                <p className="text-3xl font-bold text-red-900 mb-1">
                  <AnimatedNumber
                    value={loading ? "0" : cancelledOrders.toString()}
                  />
                </p>
                <p className="text-sm text-red-600">Cancelled Orders</p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Order Frequency
              </h3>
              <div className="space-y-4">
                {orderFrequency.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {item.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {item.count} orders ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`${item.color} h-full rounded-full transition-all duration-1000 ease-out`}
                        style={{
                          width: isLoaded ? `${item.percentage}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
