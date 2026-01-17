import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Mail, User } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../Firebase";
import { onAuthStateChanged } from "firebase/auth";

const Customer = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

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

  // Fetch customer data with real-time updates
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (querySnapshot) => {
        if (!isMounted) return;

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
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!isMounted) return;
        setError(`Failed to load customers: ${err.message}`);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

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
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">
          Customer Management
        </h1>
        <p className="text-slate-600">View and manage your customer base</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-slate-800">
                {customers.length}
              </p>
            </div>
            <User className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm mb-1">Registered Users</p>
              <p className="text-3xl font-bold text-slate-800">
                {customers.filter((c) => c.email !== "No email").length}
              </p>
            </div>
            <Mail className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm mb-1">With Photos</p>
              <p className="text-3xl font-bold text-slate-800">
                {customers.filter((c) => c.photoURL).length}
              </p>
            </div>
            <ShoppingBag className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 text-slate-700 rounded-xl border-2 border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="ml-4 text-slate-600 text-lg">Loading customers...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Customer Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-slate-200"
              >
                <div className="flex items-center mb-4">
                  {customer.photoURL ? (
                    <img
                      src={customer.photoURL}
                      alt={customer.name}
                      className="w-16 h-16 rounded-full object-cover mr-4"
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 rounded-full ${customer.color} flex items-center justify-center text-white font-bold text-xl mr-4`}
                    >
                      {customer.initials}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800">
                      {customer.name}
                    </h3>
                    <p className="text-slate-500 text-sm">{customer.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold">ID:</span> {customer.id}
                  </p>
                  <p>
                    <span className="font-semibold">createdAt:</span>{" "}
                    {customer.createdAt?.toDate().toLocaleString()}
                  </p>
                  <p>
                    <span className="font-semibold">Wallet:</span>{" "}
                    {customer.walletBalance ?? 0}
                  </p>
                  <p>
                    <span className="font-semibold">Updated:</span>{" "}
                    {customer.updatedAt?.toDate().toLocaleString() || "N/A"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20">
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
