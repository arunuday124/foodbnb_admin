import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Mail, Phone, MapPin, IdCard } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const Customer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);

  // Fetch customer data from Firestore
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log("Fetching customers from Firestore...");
        const querySnapshot = await getDocs(collection(db, "Users"));
        console.log("Total documents found:", querySnapshot.docs.length);

        const customerData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          const nameParts = data.name?.split(" ") || ["U"];
          const initials =
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : nameParts[0][0].toUpperCase();

          const colors = [
            "bg-orange-500",
            "bg-blue-500",
            "bg-green-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-indigo-500",
          ];
          const color = colors[Math.floor(Math.random() * colors.length)];

          return {
            id: doc.id,
            name: data.name || "Unknown",
            initials,
            color,
            email: data.email || "N/A",
            phone: data.ph_no || "N/A",
            address: data.address || "N/A",
            orders: data.total_orders || 0,
            spent: 0,
            lastOrder: "N/A",
            status: "active",
          };
        });

        setCustomers(customerData);
      } catch (error) {
        console.error("Error fetching customers:", error);
      }
    };

    fetchCustomers();
  }, []);

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const totalOrders = customers.reduce((sum, c) => sum + c.orders, 0);

  // Filter customers based on search query
  const query = searchQuery.trim().toLowerCase();

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.id.toLowerCase().includes(query)
  );

  return (
    <div className="min-h-full bg-slate-50 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Customer Management
        </h1>
        <p className="text-slate-600">View and manage your customer base</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-slate-800">
                {totalCustomers}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ShoppingBag className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Customers</p>
              <p className="text-3xl font-bold text-slate-800">
                {activeCustomers}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <ShoppingBag className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-slate-800">{totalOrders}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <ShoppingBag className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`${customer.color} w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                    {customer.initials}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <Mail size={14} /> {customer.email}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <IdCard size={14} /> Customer Id: {customer.id}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <Phone size={14} /> {customer.phone}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                      <MapPin size={14} /> {customer.address}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {customer.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Orders</p>
                  <p className="text-lg font-bold text-slate-800">
                    {customer.orders}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Spent</p>
                  <p className="text-lg font-bold text-slate-800">
                    ₹{customer.spent}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Last Order</p>
                  <p className="text-lg font-bold text-slate-800">
                    {customer.lastOrder}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12">
            <p className="text-slate-500 text-lg">
              No customers found matching your search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customer;
