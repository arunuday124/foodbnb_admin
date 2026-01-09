import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Mail, User } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "../../Firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

const Customer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Check authentication - runs once
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setError("Please log in to view customers.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch customer data - ONLY ONCE per session
  useEffect(() => {
    if (!user || hasFetched) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);

        // Single Firestore query - this is the ONLY request
        const querySnapshot = await getDocs(collection(db, "users"));

        const customerData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          // Generate initials
          const nameParts = data.name?.split(" ") || ["U"];
          const initials =
            nameParts.length > 1
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : nameParts[0][0].toUpperCase();

          // Random color
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
            name: data.name || "Unknown User",
            email: data.email || "No email",
            photoURL: data.photoURL || null,
            createdAt: data.createdAt || null,
            walletBalance: data.walletBalance || null,
            updatedAt: data.updatedAt || null,
            initials,
            color,
          };
        });

        setCustomers(customerData);
        setHasFetched(true); // Prevent refetching
        setError(null);
      } catch (err) {
        setError(`Failed to load customers: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user, hasFetched]);

  // Client-side filtering - NO additional Firestore requests
  const queryLower = searchQuery.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    const name = (customer.name || "").toLowerCase();
    const email = (customer.email || "").toLowerCase();
    const id = (customer.id || "").toLowerCase();

    return (
      name.includes(queryLower) ||
      email.includes(queryLower) ||
      id.includes(queryLower)
    );
  });

  return (
    <div className="min-h-full bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Customer Management
        </h1>
        <p className="text-slate-600">View and manage your customer base</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-slate-800">
                {customers.length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <User className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Registered Users</p>
              <p className="text-3xl font-bold text-slate-800">
                {customers.filter((c) => c.email !== "No email").length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Mail className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">With Photos</p>
              <p className="text-3xl font-bold text-slate-800">
                {customers.filter((c) => c.photoURL).length}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <ShoppingBag className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search customers by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-slate-500 text-lg">Loading customers...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Customer Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {customer.photoURL ? (
                    <img
                      src={customer.photoURL}
                      alt={customer.name}
                      className="w-16 h-16 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div
                      className={`${customer.color} w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md`}>
                      {customer.initials}
                    </div>
                  )}

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {customer.name}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail size={14} className="flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        ID: {customer.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        createdAt:{" "}
                        {customer.createdAt?.toDate().toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">
                        Wallet: {customer.walletBalance ?? 0}
                      </p>

                      <p className="text-xs text-slate-500">
                        Updated:{" "}
                        {customer.updatedAt?.toDate().toLocaleString() || "N/A"}
                      </p>
                    </div>
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
      )}
    </div>
  );
};

export default Customer;