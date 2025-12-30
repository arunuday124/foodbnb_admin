import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Mail, Phone, MapPin, IdCard } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const Customer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from Firestore
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customerCollection = collection(db, "Users");
        const customerSnapshot = await getDocs(customerCollection);
        const customerList = customerSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomers(customerList);
        // console.log("Fetched customers:", customerList);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Calculate stats
  const totalCustomers = customers.length;
  // const activeCustomers = customers.filter((c) => c.status).length;
  // const totalOrders = customers.reduce((sum, c) => sum + (c. || 0), 0);
  // const totalRevenue = customers.reduce((sum, c) => sum + (c.spent || 0), 0);

  // Filter customers based on search query
  const query = searchQuery.trim().toLowerCase();
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.ph_no?.toString().includes(query)
    // customer.id.toString().includes(query)
  );

  // console.log("filered customer" + filteredCustomers);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-slate-600">Loading customers...</p>
      </div>
    );
  }

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                {/* {activeCustomers} */}
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
              {/* <p className="text-3xl font-bold text-slate-800">{totalOrders}</p> */}
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <ShoppingBag className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-slate-800">
                {/* ${totalRevenue} */}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <ShoppingBag className="text-purple-600" size={24} />
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

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {/* Customer Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`${
                      customer.color || "bg-gray-500"
                    } w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                    {customer.name
                      ?.split(" ")
                      .map((initial) => initial[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {customer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <Mail size={14} />
                      <span>{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <IdCard size={14} />
                      <span>Customer Id:-{customer.id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <Phone size={14} />
                      <span>{customer.ph_no}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                      <MapPin size={14} />
                      <span>{customer.address}</span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {customer.status || "active"}
                </span>
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Orders</p>
                  <p className="text-lg font-bold text-slate-800">
                    {customer.orders || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Spent</p>
                  <p className="text-lg font-bold text-slate-800">
                    ${customer.spent || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Last Order</p>
                  <p className="text-lg font-bold text-slate-800">
                    {customer.lastOrder || "-"}
                  </p>
                </div>
              </div>

              {/* View Details Button */}
              <button className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors active:scale-[0.99]">
                View Details
              </button>
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
