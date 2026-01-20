import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, TrendingDown, Users, ChevronRight } from "lucide-react";
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

// --- User Location Map Component with Hotspots ---
const UserLocationMap = ({ users }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    // Dynamically load Leaflet CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    // Dynamically load Leaflet JS
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.async = true;
    script.onload = () => {
      if (mapContainer.current && !map.current) {
        // Default center (India)
        let centerLat = 20.5937;
        let centerLng = 78.9629;
        let zoomLevel = 5;

        // Get all valid user locations
        const validLocations = users
          .filter((user) => user.location && user.noOfOrders > 0)
          .map((user) => {
            let lat, lng;

            if (typeof user.location === "object") {
              lat = user.location.latitude || user.location.lat;
              lng = user.location.longitude || user.location.lng;
            } else if (typeof user.location === "string") {
              const coords = user.location.split(",");
              lat = parseFloat(coords[0]);
              lng = parseFloat(coords[1]);
            }

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
              return { ...user, lat: parseFloat(lat), lng: parseFloat(lng) };
            }
            return null;
          })
          .filter(Boolean);

        // Adjust map center if users exist
        if (validLocations.length > 0) {
          const avgLat =
            validLocations.reduce((sum, u) => sum + u.lat, 0) /
            validLocations.length;
          const avgLng =
            validLocations.reduce((sum, u) => sum + u.lng, 0) /
            validLocations.length;

          centerLat = avgLat;
          centerLng = avgLng;
          zoomLevel = validLocations.length > 1 ? 10 : 12;
        }

        // Initialize map
        map.current = window.L.map(mapContainer.current).setView(
          [centerLat, centerLng],
          zoomLevel,
        );

        // Add OpenStreetMap tile layer
        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          },
        ).addTo(map.current);

        if (validLocations.length === 0) {
          return;
        }

        // Add hotspot circles and pins for each individual user
        validLocations.forEach((user) => {
          // Calculate opacity and radius based on user's order count
          const maxOrders = Math.max(
            ...validLocations.map((u) => u.noOfOrders || 0),
            1,
          );
          const minOrders = Math.min(
            ...validLocations.map((u) => u.noOfOrders || 0),
            1,
          );

          let opacity;
          if (maxOrders === minOrders) {
            opacity = 0.6;
          } else {
            opacity =
              0.2 +
              (((user.noOfOrders || 0) - minOrders) / (maxOrders - minOrders)) *
                0.6;
          }

          // Calculate circle radius based on orders
          const radius = 20 + ((user.noOfOrders || 0) / maxOrders) * 80;

          // Draw multiple concentric circles for hotspot effect
          const radiusLayers = [
            { radius: radius, opacity: opacity * 0.3 },
            { radius: radius * 0.7, opacity: opacity * 0.6 },
            { radius: radius * 0.4, opacity: opacity * 0.9 },
          ];

          radiusLayers.forEach((layer) => {
            window.L.circleMarker([user.lat, user.lng], {
              radius: layer.radius,
              fillColor: "#FF5A5F",
              color: "#FF5A5F",
              weight: 0,
              opacity: 0,
              fillOpacity: layer.opacity,
            }).addTo(map.current);
          });

          // Add main clickable hotspot circle
          window.L.circleMarker([user.lat, user.lng], {
            radius: radius * 0.5,
            fillColor: "#FF5A5F",
            color: "#CC4449",
            weight: 2,
            opacity: opacity,
            fillOpacity: opacity * 0.7,
          })
            .bindPopup(
              `<div class="p-3 text-center">
                <h4 class="font-bold text-sm text-gray-900">${user.name}</h4>
                <p class="text-xs text-gray-600 mt-1">Orders: ${user.noOfOrders || 0}</p>
              </div>`,
            )
            .addTo(map.current);
        });

        // Add individual user markers on top
        validLocations.forEach((user) => {
          const colors = ["#ef4444"];
          const userColor = colors[Math.floor(Math.random() * colors.length)];

          const initials = user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();

          // Create map pin style marker with initials
          const markerHTML = `
            <div class="relative flex items-center justify-center" style="width: 60px; height: 70px;">
              <svg viewBox="0 0 32 40" width="40" height="50" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C8.27 0 2 6.27 2 14c0 7.73 14 26 14 26s14-18.27 14-26c0-7.73-6.27-14-14-14z" fill="${userColor}" stroke="white" stroke-width="2"/>
                <circle cx="16" cy="14" r="6" fill="white"/>
              </svg>
              <div class="absolute text-white font-bold text-xs" style="top: 8px;">
                ${initials}
              </div>
            </div>
          `;

          const customIcon = window.L.divIcon({
            html: markerHTML,
            iconSize: [40, 50],
            iconAnchor: [20, 50],
            popupAnchor: [0, -50],
            className: "custom-marker-pin",
          });

          window.L.marker([user.lat, user.lng], { icon: customIcon })
            .bindPopup(
              `<div class="p-3 min-w-max">
                <h4 class="font-bold text-sm text-gray-900">${user.name}</h4>
                <p class="text-xs text-gray-600 mt-1">${user.email || "N/A"}</p>
                <p class="text-xs font-semibold text-blue-600 mt-2">Orders: ${user.noOfOrders || 0}</p>
                <p class="text-xs text-gray-500 mt-1">📍 ${user.lat.toFixed(4)}, ${user.lng.toFixed(4)}</p>
              </div>`,
            )
            .addTo(map.current);
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [users]);

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-lg"
      style={{ minHeight: "500px" }}
    />
  );
};

const Analytics = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [firstTimeCustomers, setFirstTimeCustomers] = useState(0);
  const [firstTimeOrders, setFirstTimeOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [cancelledOrders, setCancelledOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [revenueData, setRevenueData] = useState([
    {
      month: "Jan",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Feb",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Mar",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Apr",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "May",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Jun",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Jul",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Aug",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Sep",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Oct",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Nov",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
    {
      month: "Dec",
      revenue: "₹0",
      orders: "0 orders",
      percentage: 0,
      delivered: 0,
    },
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
          Jan: { delivered: 0, count: 0 },
          Feb: { delivered: 0, count: 0 },
          Mar: { delivered: 0, count: 0 },
          Apr: { delivered: 0, count: 0 },
          May: { delivered: 0, count: 0 },
          Jun: { delivered: 0, count: 0 },
          Jul: { delivered: 0, count: 0 },
          Aug: { delivered: 0, count: 0 },
          Sep: { delivered: 0, count: 0 },
          Oct: { delivered: 0, count: 0 },
          Nov: { delivered: 0, count: 0 },
          Dec: { delivered: 0, count: 0 },
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

          // Count cancelled orders
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
          100,
        );
        const monthlyPercentage = Math.min(
          (monthlyOrdersCount / baseValue) * 100,
          100,
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

        const totalDeliveredRevenue = Object.values(monthData).reduce(
          (sum, month) => sum + month.delivered,
          0,
        );

        setTotalRevenue(Math.round(totalDeliveredRevenue));

        // Update revenue data with actual values
        const baseRevenue = 10000; // ₹1 Lakh base value
        const maxRevenue = Math.max(
          ...Object.values(monthData).map((m) => m.delivered),
          baseRevenue,
        );

        const updatedRevenueData = Object.keys(monthData).map((monthKey) => {
          const monthInfo = monthData[monthKey];
          const percentage =
            maxRevenue > 0 ? (monthInfo.delivered / maxRevenue) * 100 : 0;

          return {
            month: monthKey,
            revenue: `₹${Math.round(monthInfo.delivered).toLocaleString()}`,
            orders: `${monthInfo.count} orders`,
            percentage: percentage,
            delivered: monthInfo.delivered,
          };
        });

        setRevenueData(updatedRevenueData);
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

  // Real-time listener for users
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        if (!isMounted) return;

        const totalCount = snapshot.size;
        const usersData = [];

        let zeroOrderCustomers = 0; // First Time Customers (noOfOrders === 0)
        let oneOrderCustomers = 0; // First Time Orders (noOfOrders === 1)

        snapshot.forEach((doc) => {
          const userData = doc.data();
          const noOfOrders = userData.noOfOrders || 0;

          usersData.push({
            id: doc.id,
            ...userData,
          });

          // ✅ First Time Customers → 0 orders (never ordered)
          if (noOfOrders === 0) {
            zeroOrderCustomers++;
          }

          // ✅ First Time Orders → exactly 1 order
          if (noOfOrders === 1) {
            oneOrderCustomers++;
          }
        });

        setUsers(usersData);
        setTotalCustomers(totalCount);
        setFirstTimeCustomers(zeroOrderCustomers); // Customers with 0 orders
        setFirstTimeOrders(oneOrderCustomers); // Customers with 1 order
        setLoading(false);
        setIsLoaded(true);
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

  const usersWithOrders = users.filter((u) => u.noOfOrders > 0);

  // Pagination logic
  const itemsPerPage = 6;
  const totalPages = Math.ceil(revenueData.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMonthsData = revenueData.slice(startIndex, endIndex);

  const handleViewMore = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleViewLess = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

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

        {/* Stats Cards */}
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

        {/* User Location Map */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Customer Locations & Hotspots
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {usersWithOrders.length} customers with orders
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
          <UserLocationMap users={usersWithOrders} />
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
              {currentMonthsData.map((item, index) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                {currentPage > 0 && (
                  <button
                    onClick={handleViewLess}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors">
                    <ChevronRight size={14} className="rotate-180" />
                    Previous
                  </button>
                )}

                <span className="text-xs text-gray-500">
                  {currentPage + 1} / {totalPages}
                </span>

                {currentPage < totalPages - 1 && (
                  <button
                    onClick={handleViewMore}
                    className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors font-medium">
                    View More
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Total Revenue (All Months)
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
                +{loading ? "0" : firstTimeOrders.toString()} first time orders
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <p className="text-sm text-blue-700 font-medium mb-2">
                  First Time Orders
                </p>
                <p className="text-3xl font-bold text-blue-900 mb-1">
                  <AnimatedNumber
                    value={loading ? "0" : firstTimeOrders.toString()}
                  />
                </p>

                <p className="text-sm text-blue-600">
                  {loading || totalCustomers === 0
                    ? "0"
                    : ((firstTimeOrders / totalCustomers) * 100).toFixed(1)}
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