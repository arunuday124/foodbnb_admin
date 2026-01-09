import {
  Mail,
  Phone,
  MapPin,
  Star,
  MapPinned,
  Zap,
  Award,
  CreditCard,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../../Firebase";

const Delivery = () => {
  const [drivers, setDrivers] = useState([]);
  const [activeOrders, setActiveOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data function
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch drivers - only once
      const driversQuery = query(collection(db, "riders"), limit(50));
      const driversSnapshot = await getDocs(driversQuery);
      const driversList = driversSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDrivers(driversList);

      // Fetch orders - only once
      const ordersQuery = query(collection(db, "orders"), limit(100));
      const ordersSnapshot = await getDocs(ordersQuery);
      const activeOrdersCount = ordersSnapshot.docs.filter((doc) => {
        const status = doc.data().order_status;
        return status === "In Transit" || status === "Preparing";
      }).length;
      setActiveOrders(activeOrdersCount);

      // Save to sessionStorage to persist across navigation
      sessionStorage.setItem("drivers_data", JSON.stringify(driversList));
      sessionStorage.setItem(
        "active_orders_data",
        activeOrdersCount.toString()
      );
      sessionStorage.setItem("last_fetch_time", Date.now().toString());

      setLastFetch(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load data only once on mount
  useEffect(() => {
    // Check if we have cached data in sessionStorage
    const cachedDrivers = sessionStorage.getItem("drivers_data");
    const cachedOrders = sessionStorage.getItem("active_orders_data");
    const cachedTime = sessionStorage.getItem("last_fetch_time");

    if (cachedDrivers && cachedOrders && cachedTime) {
      // Use cached data
      setDrivers(JSON.parse(cachedDrivers));
      setActiveOrders(parseInt(cachedOrders));
      setLastFetch(new Date(parseInt(cachedTime)));
      setLoading(false);
    } else {
      // Fetch fresh data only if no cache exists
      fetchData();
    }
  }, []); // Only run once on mount

  // Manual refresh function
  const handleRefresh = () => {
    fetchData();
  };

  // Filter drivers based on search term
  const filteredDrivers = drivers.filter((driver) =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats based on actual DB fields
  const activeDrivers =
    drivers && drivers.length > 0
      ? drivers.filter((d) => (d.activeOrders || 0) > 0).length
      : 0;

  const totalDeliveries = drivers.length;

  // Calculate average rating from database (rating is stored as string)
  const avgRating =
    drivers && drivers.length > 0
      ? (
          drivers.reduce((sum, d) => sum + (parseFloat(d.rating) || 0), 0) /
          drivers.length
        ).toFixed(1)
      : "0.0";

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-slate-600">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      {/* Header Section */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Delivery Drivers
          </h1>
          <p className="text-slate-600">
            Manage your delivery team and track performance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {lastFetch && (
        <div className="mb-4 text-sm text-slate-500">
          Last updated: {lastFetch.toLocaleTimeString()}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Drivers</p>
              <p className="text-3xl font-bold text-slate-800">
                {activeDrivers}
              </p>
              <p className="text-xs text-green-600 mt-1">With active orders</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <MapPinned className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Drivers</p>
              <p className="text-3xl font-bold text-slate-800">
                {totalDeliveries}
              </p>
              <p className="text-xs text-slate-600 mt-1">Registered</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Zap className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Average Rating</p>
              <p className="text-3xl font-bold text-slate-800">{avgRating}</p>
              <p className="text-xs text-slate-600 mt-1">Out of 5.0</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Award className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Orders</p>
              <p className="text-3xl font-bold text-slate-800">
                {activeOrders}
              </p>
              <p className="text-xs text-orange-600 mt-1">In delivery</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <MapPin className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search delivery partners by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-stone-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {!filteredDrivers || filteredDrivers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center text-slate-600">
            No Drivers found matching your search.
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <div
              key={driver.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {/* Driver Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`${
                      driver.color || "bg-purple-500"
                    } w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md`}>
                    {driver.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                      {driver.name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {driver.vechicleType || "N/A"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 ${
                    (driver.activeOrders || 0) > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  } text-xs font-medium rounded-full`}>
                  {(driver.activeOrders || 0) > 0 ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Rating Section */}
              {driver.rating && (
                <div className="flex items-center gap-1 mb-4">
                  <Star className="text-yellow-500 fill-yellow-500" size={16} />
                  <span className="font-semibold text-slate-800">
                    {parseFloat(driver.rating).toFixed(1)}
                  </span>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail size={14} />
                  <span>{driver.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard size={14} />
                  <span>{driver.licencePlate || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={14} />
                  <span>{driver.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin size={14} />
                  <span>{driver.address}</span>
                </div>
              </div>

              {/* Rider License Info */}
              {driver.riderLicence && (
                <div className="text-xs text-slate-500 mt-2 mb-5">
                  License: {driver.riderLicence}
                </div>
              )}

              {/* Current Orders Alert */}
              <div
                className={
                  (driver.activeOrders || 0) > 0
                    ? "mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    : "mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg"
                }>
                <p
                  className={
                    (driver.activeOrders || 0) > 0
                      ? "text-sm text-orange-700 font-medium"
                      : "text-sm text-gray-400 font-medium"
                  }>
                  Currently delivering {driver.activeOrders || 0}{" "}
                  {(driver.activeOrders || 0) === 1 ? "order" : "orders"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Delivery;