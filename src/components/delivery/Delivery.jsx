import {
  Mail,
  Phone,
  MapPin,
  Star,
  MapPinned,
  Zap,
  Award,
  CreditCard,
  Search,
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../Firebase";

// Singleton cache that persists across component mounts/unmounts
const deliveryCache = {
  drivers: [],
  activeOrdersCount: 0,
  lastFetch: null,
  listenersInitialized: false,
  unsubscribers: [],
};

const Delivery = () => {
  const [drivers, setDrivers] = useState(deliveryCache.drivers);
  const [activeOrdersCount, setActiveOrdersCount] = useState(
    deliveryCache.activeOrdersCount
  );
  const [loading, setLoading] = useState(deliveryCache.drivers.length === 0);
  const [lastFetch, setLastFetch] = useState(deliveryCache.lastFetch);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");

  const [lastVisibleActive, setLastVisibleActive] = useState(null);
  const [lastVisibleInactive, setLastVisibleInactive] = useState(null);
  const [hasMoreActive, setHasMoreActive] = useState(true);
  const [hasMoreInactive, setHasMoreInactive] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const ITEMS_PER_PAGE = 5;
  const isMounted = useRef(true);

  // Sync state with cache
  const syncToCache = useCallback(
    (newDrivers, newOrdersCount, newLastFetch) => {
      if (newDrivers !== undefined) deliveryCache.drivers = newDrivers;
      if (newOrdersCount !== undefined)
        deliveryCache.activeOrdersCount = newOrdersCount;
      if (newLastFetch !== undefined) deliveryCache.lastFetch = newLastFetch;
    },
    []
  );

  // Memoized calculations
  const stats = useMemo(() => {
    const activeDrivers = drivers.filter(
      (d) => (d.activeOrders || 0) > 0
    ).length;
    const totalDeliveries = drivers.length;
    const avgRating =
      drivers.length > 0
        ? (
            drivers.reduce((sum, d) => sum + (parseFloat(d.rating) || 0), 0) /
            drivers.length
          ).toFixed(1)
        : "0.0";

    return { activeDrivers, totalDeliveries, avgRating };
  }, [drivers]);

  // Fetch initial drivers
  const fetchInitialDrivers = useCallback(async () => {
    // Skip if already have data
    if (deliveryCache.drivers.length > 0) {
      return;
    }

    try {
      setLoading(true);
      const allDrivers = [];

      // Fetch active drivers
      const activeQuery = query(
        collection(db, "riders"),
        where("activeOrders", ">", 0),
        orderBy("activeOrders", "desc"),
        limit(ITEMS_PER_PAGE)
      );
      const activeSnapshot = await getDocs(activeQuery);
      const activeDriversList = activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allDrivers.push(...activeDriversList);

      if (activeSnapshot.docs.length > 0) {
        setLastVisibleActive(
          activeSnapshot.docs[activeSnapshot.docs.length - 1]
        );
        setHasMoreActive(activeSnapshot.docs.length === ITEMS_PER_PAGE);
      } else {
        setHasMoreActive(false);
      }

      // Fetch inactive drivers
      const inactiveQuery = query(
        collection(db, "riders"),
        orderBy("name"),
        limit(ITEMS_PER_PAGE * 3)
      );
      const inactiveSnapshot = await getDocs(inactiveQuery);
      const inactiveDriversList = inactiveSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((driver) => (driver.activeOrders || 0) === 0)
        .slice(0, ITEMS_PER_PAGE);

      allDrivers.push(...inactiveDriversList);

      if (inactiveDriversList.length > 0) {
        const lastInactiveDriver =
          inactiveDriversList[inactiveDriversList.length - 1];
        const lastDoc = inactiveSnapshot.docs.find(
          (doc) => doc.id === lastInactiveDriver.id
        );
        setLastVisibleInactive(lastDoc);
        setHasMoreInactive(inactiveSnapshot.docs.length === ITEMS_PER_PAGE * 3);
      } else {
        setHasMoreInactive(false);
      }

      const now = new Date();
      setDrivers(allDrivers);
      setLastFetch(now);
      syncToCache(allDrivers, undefined, now);
    } catch (error) {
      console.error("Error fetching initial drivers:", error);
    } finally {
      setLoading(false);
    }
  }, [syncToCache]);

  // Setup real-time listeners (only once globally)
  const setupListeners = useCallback(() => {
    if (deliveryCache.listenersInitialized) {
      return;
    }

    // Riders listener
    const ridersUnsubscribe = onSnapshot(
      collection(db, "riders"),
      (snapshot) => {
        setDrivers((prevDrivers) => {
          let updatedDrivers = [...prevDrivers];

          snapshot.docChanges().forEach((change) => {
            const driverData = { id: change.doc.id, ...change.doc.data() };

            if (change.type === "added") {
              if (!updatedDrivers.some((d) => d.id === driverData.id)) {
                updatedDrivers = [driverData, ...updatedDrivers];
              }
            } else if (change.type === "modified") {
              updatedDrivers = updatedDrivers.map((d) =>
                d.id === driverData.id ? driverData : d
              );
            } else if (change.type === "removed") {
              updatedDrivers = updatedDrivers.filter(
                (d) => d.id !== driverData.id
              );
            }
          });

          syncToCache(updatedDrivers, undefined, new Date());
          return updatedDrivers;
        });

        const now = new Date();
        setLastFetch(now);
        syncToCache(undefined, undefined, now);
      },
      (error) => {
        console.error("Error in riders listener:", error);
      }
    );

    // Orders listener with compound query
    const ordersUnsubscribe = onSnapshot(
      query(
        collection(db, "orders"),
        where("orderStatus", "in", ["preparing", "in transit", "transit"])
      ),
      (snapshot) => {
        const count = snapshot.size;
        setActiveOrdersCount(count);
        syncToCache(undefined, count, undefined);

        const now = new Date();
        setLastFetch(now);
        syncToCache(undefined, undefined, now);
      },
      (error) => {
        console.error("Error in orders listener:", error);
      }
    );

    deliveryCache.unsubscribers = [ridersUnsubscribe, ordersUnsubscribe];
    deliveryCache.listenersInitialized = true;
  }, [syncToCache]);

  // Initialize data and listeners
  useEffect(() => {
    isMounted.current = true;

    // If we have cached data, use it immediately
    if (deliveryCache.drivers.length > 0) {
      setDrivers(deliveryCache.drivers);
      setActiveOrdersCount(deliveryCache.activeOrdersCount);
      setLastFetch(deliveryCache.lastFetch);
      setLoading(false);
    }

    // Setup listeners if not already done
    setupListeners();

    // Fetch initial data if cache is empty
    if (deliveryCache.drivers.length === 0) {
      fetchInitialDrivers();
    }

    return () => {
      isMounted.current = false;
      // Don't unsubscribe - keep listeners active for persistence
    };
  }, [fetchInitialDrivers, setupListeners]);

  // Load more active drivers
  const loadMoreActive = useCallback(async () => {
    if (!hasMoreActive || loadingMore || !lastVisibleActive) return;

    setLoadingMore(true);
    try {
      const activeQuery = query(
        collection(db, "riders"),
        where("activeOrders", ">", 0),
        orderBy("activeOrders", "desc"),
        startAfter(lastVisibleActive),
        limit(ITEMS_PER_PAGE)
      );
      const activeSnapshot = await getDocs(activeQuery);
      const newDrivers = activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (newDrivers.length > 0) {
        setDrivers((prev) => {
          const updated = [...prev, ...newDrivers];
          syncToCache(updated, undefined, undefined);
          return updated;
        });
        setLastVisibleActive(
          activeSnapshot.docs[activeSnapshot.docs.length - 1]
        );
        setHasMoreActive(newDrivers.length === ITEMS_PER_PAGE);
      } else {
        setHasMoreActive(false);
      }
    } catch (error) {
      console.error("Error loading more active drivers:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreActive, loadingMore, lastVisibleActive, syncToCache]);

  // Load more inactive drivers
  const loadMoreInactive = useCallback(async () => {
    if (!hasMoreInactive || loadingMore || !lastVisibleInactive) return;

    setLoadingMore(true);
    try {
      const inactiveQuery = query(
        collection(db, "riders"),
        orderBy("name"),
        startAfter(lastVisibleInactive),
        limit(ITEMS_PER_PAGE * 3)
      );
      const inactiveSnapshot = await getDocs(inactiveQuery);
      const newDrivers = inactiveSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((driver) => (driver.activeOrders || 0) === 0)
        .slice(0, ITEMS_PER_PAGE);

      if (newDrivers.length > 0) {
        setDrivers((prev) => {
          const updated = [...prev, ...newDrivers];
          syncToCache(updated, undefined, undefined);
          return updated;
        });
        const lastInactiveDriver = newDrivers[newDrivers.length - 1];
        const lastDoc = inactiveSnapshot.docs.find(
          (doc) => doc.id === lastInactiveDriver.id
        );
        setLastVisibleInactive(lastDoc);
        setHasMoreInactive(inactiveSnapshot.docs.length === ITEMS_PER_PAGE * 3);
      } else {
        setHasMoreInactive(false);
      }
    } catch (error) {
      console.error("Error loading more inactive drivers:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreInactive, loadingMore, lastVisibleInactive, syncToCache]);

  // Memoized filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch = driver.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const isActive = (driver.activeOrders || 0) > 0;

      if (filterStatus === "active") return matchesSearch && isActive;
      if (filterStatus === "inactive") return matchesSearch && !isActive;
      return matchesSearch;
    });
  }, [drivers, searchTerm, filterStatus]);

  const activeFilteredDrivers = useMemo(
    () => filteredDrivers.filter((d) => (d.activeOrders || 0) > 0),
    [filteredDrivers]
  );

  const inactiveFilteredDrivers = useMemo(
    () => filteredDrivers.filter((d) => (d.activeOrders || 0) === 0),
    [filteredDrivers]
  );

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-slate-600">Loading drivers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
          Delivery Drivers
        </h1>
        <p className="text-slate-600">
          Manage your delivery team and track performance
        </p>
      </div>

      {lastFetch && (
        <div className="mb-4 text-sm text-slate-500 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Live • Last updated: {lastFetch.toLocaleTimeString()}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Drivers</p>
              <p className="text-3xl font-bold text-slate-800">
                {stats.activeDrivers}
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
                {stats.totalDeliveries}
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
              <p className="text-3xl font-bold text-slate-800">
                {stats.avgRating}
              </p>
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
                {activeOrdersCount}
              </p>
              <p className="text-xs text-orange-600 mt-1">In delivery</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <MapPin className="text-orange-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
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
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus("active")}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              filterStatus === "active"
                ? "bg-green-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            Active
          </button>
          <button
            onClick={() => setFilterStatus("inactive")}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              filterStatus === "inactive"
                ? "bg-slate-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}>
            Inactive
          </button>
        </div>
      </div>

      {filterStatus === "active" && activeFilteredDrivers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Active Drivers ({activeFilteredDrivers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeFilteredDrivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>
          {hasMoreActive && !searchTerm && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreActive}
                disabled={loadingMore}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
                {loadingMore ? "Loading..." : "View More Active Drivers"}
              </button>
            </div>
          )}
        </div>
      )}

      {filterStatus === "inactive" && inactiveFilteredDrivers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Inactive Drivers ({inactiveFilteredDrivers.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {inactiveFilteredDrivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>
          {hasMoreInactive && !searchTerm && (
            <div className="mt-6 text-center">
              <button
                onClick={loadMoreInactive}
                disabled={loadingMore}
                className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
                {loadingMore ? "Loading..." : "View More Inactive Drivers"}
              </button>
            </div>
          )}
        </div>
      )}

      {filteredDrivers.length === 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 text-center text-slate-600">
          No drivers found matching your search.
        </div>
      )}
    </div>
  );
};

const DriverCard = ({ driver }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
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

    {driver.rating && (
      <div className="flex items-center gap-1 mb-4">
        <Star className="text-yellow-500 fill-yellow-500" size={16} />
        <span className="font-semibold text-slate-800">
          {parseFloat(driver.rating).toFixed(1)}
        </span>
      </div>
    )}

    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Mail size={14} />
        <span className="truncate">{driver.email}</span>
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
        <span className="truncate">{driver.address}</span>
      </div>
    </div>

    {driver.riderLicence && (
      <div className="text-xs text-slate-500 mt-2 mb-5">
        License: {driver.riderLicence}
      </div>
    )}

    <div
      className={
        (driver.activeOrders || 0) > 0
          ? "p-3 bg-orange-50 border border-orange-200 rounded-lg"
          : "p-3 bg-gray-100 border border-gray-200 rounded-lg"
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
);

export default Delivery;
