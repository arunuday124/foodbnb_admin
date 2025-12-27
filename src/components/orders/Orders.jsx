import { useState } from "react";
import { MapPin, Clock } from "lucide-react";

const Orders = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const allOrders = [
    {
      id: "#ORD-2341",
      time: "10 mins ago",
      status: "delivered",
      customer: "Sarah Johnson",
      address: "123 Oak Street, Apt 4B, New York, NY 10001",
      items: [
        { name: "2x Chicken Biryani", price: "$15.99" },
        { name: "1x Raita", price: "$3.99" },
      ],
      duration: "45 mins",
      total: "$40.96",
    },
    {
      id: "#ORD-2340",
      time: "25 mins ago",
      status: "preparing",
      customer: "Mike Chen",
      address: "456 Maple Ave, Brooklyn, NY 11201",
      items: [
        { name: "1x Pasta Carbonara", price: "$18.5" },
        { name: "1x Caesar Salad", price: "$8.99" },
      ],
      duration: "30 mins",
      total: "$31.48",
    },
    {
      id: "#ORD-2339",
      time: "35 mins ago",
      status: "in transit",
      customer: "Emma Wilson",
      address: "789 Pine Road, Queens, NY 11354",
      items: [
        { name: "1x Thai Green Curry", price: "$16.99" },
        { name: "1x Spring Rolls", price: "$6.99" },
      ],
      duration: "25 mins",
      total: "$28.97",
    },
    {
      id: "#ORD-2338",
      time: "1 hour ago",
      status: "delivered",
      customer: "James Brown",
      address: "321 Elm Street, Manhattan, NY 10002",
      items: [
        { name: "1x Burger Combo", price: "$14.99" },
        { name: "1x French Fries", price: "$4.99" },
      ],
      duration: "35 mins",
      total: "$22.97",
    },
    {
      id: "#ORD-2337",
      time: "2 hours ago",
      status: "cancelled",
      customer: "Lisa Anderson",
      address: "654 Cedar Lane, Bronx, NY 10451",
      items: [{ name: "1x Sushi Platter", price: "$42.99" }],
      duration: "40 mins",
      total: "$48.98",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-700";
      case "preparing":
        return "bg-blue-100 text-blue-700";
      case "in transit":
        return "bg-orange-100 text-orange-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status) => {
    return status
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const filteredOrders =
    activeFilter === "all"
      ? allOrders
      : allOrders.filter((order) => order.status === activeFilter);

  const getFilterCount = (status) => {
    if (status === "all") return allOrders.length;
    return allOrders.filter((order) => order.status === status).length;
  };

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Orders Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage all customer orders
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter by Status
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "all"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              All Orders ({getFilterCount("all")})
            </button>
            <button
              onClick={() => setActiveFilter("preparing")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "preparing"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              Preparing ({getFilterCount("preparing")})
            </button>
            <button
              onClick={() => setActiveFilter("in transit")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "in transit"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              In Transit ({getFilterCount("in transit")})
            </button>
            <button
              onClick={() => setActiveFilter("delivered")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "delivered"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              Delivered ({getFilterCount("delivered")})
            </button>
            <button
              onClick={() => setActiveFilter("cancelled")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "cancelled"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              Cancelled ({getFilterCount("cancelled")})
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-lg hover:shadow-xl transition-shadow">
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {order.id}
                  </h3>
                  <p className="text-xs text-gray-500">{order.time}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(
                    order.status
                  )}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              {/* Customer Info */}
              <div className="mb-4">
                <p className="font-semibold text-gray-900 mb-1">
                  {order.customer}
                </p>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <p className="line-clamp-2">{order.address}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Items:
                </p>
                <div className="space-y-1">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.name}</span>
                      <span className="font-medium text-gray-900">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration and Total */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock size={16} />
                  <span> Duration: {order.duration}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-bold text-gray-900">
                    {order.total}
                  </p>
                </div>
              </div>

              {/* View Details Button */}
              <button className="w-full mt-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                • View Details
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">
              No orders found for this filter
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
