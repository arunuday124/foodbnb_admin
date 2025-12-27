import React from "react";
import { TrendingUp, TrendingDown, Users } from "lucide-react";

const Analytics = () => {
  const statsCards = [
    {
      label: "New Customers",
      value: "142",
      change: "12.5% vs last month",
      isPositive: true,
    },
    {
      label: "Repeat Customers",
      value: "876",
      change: "8.3% vs last month",
      isPositive: true,
    },
    {
      label: "Customer Retention",
      value: "86%",
      change: "4.2% vs last month",
      isPositive: true,
    },
    {
      label: "Avg. Order Value",
      value: "$36.42",
      change: "2.1% vs last month",
      isPositive: false,
    },
  ];

  const revenueData = [
    { month: "Jan", revenue: "$12,500", orders: "342 orders", percentage: 55 },
    { month: "Feb", revenue: "$15,200", orders: "398 orders", percentage: 65 },
    { month: "Mar", revenue: "$18,900", orders: "456 orders", percentage: 80 },
    { month: "Apr", revenue: "$16,300", orders: "412 orders", percentage: 70 },
    { month: "May", revenue: "$21,500", orders: "523 orders", percentage: 90 },
    { month: "Jun", revenue: "$24,800", orders: "602 orders", percentage: 100 },
  ];

  const orderFrequency = [
    { label: "Weekly", percentage: 65, color: "bg-purple-500" },
    { label: "Monthly", percentage: 25, color: "bg-purple-500" },
    { label: "Occasional", percentage: 10, color: "bg-purple-500" },
  ];

  return (
   <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8 shadow-sm">

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Analytics Dashboard Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your business performance and insights
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4  ">
          {statsCards.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-xl">
              <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stat.value}
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

        {/* Revenue Trend */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Revenue Trend</h2>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-lg font-bold">$</span>
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
                    className="bg-green-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200" >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Total Revenue (6 months)
              </span>
              <span className="text-2xl font-bold text-green-600">
                $109,200
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

          {/* Total Customers */}
          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <p className="text-sm text-purple-700 font-medium mb-2">
              Total Customers
            </p>
            <p className="text-4xl font-bold text-purple-900 mb-2">1,265</p>
            <p className="text-sm text-purple-600">+142 new this month</p>
          </div>

          {/* First Time vs Returning */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <p className="text-sm text-blue-700 font-medium mb-2">
                First Time
              </p>
              <p className="text-3xl font-bold text-blue-900 mb-1">234</p>
              <p className="text-sm text-blue-600">18.5%</p>
            </div>
            <div className="bg-green-50 rounded-lg p-6">
              <p className="text-sm text-green-700 font-medium mb-2">
                Returning
              </p>
              <p className="text-3xl font-bold text-green-900 mb-1">1,031</p>
              <p className="text-sm text-green-600">81.5%</p>
            </div>
          </div>

          {/* Order Frequency */}
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
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${item.color} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${item.percentage}%` }}
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
