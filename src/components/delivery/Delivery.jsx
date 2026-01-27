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
  Map as MapIcon,
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
  allActiveDrivers: [],
  activeOrdersCount: 0,
  lastFetch: null,
  listenersInitialized: false,
  unsubscribers: [],
};

const Delivery = () => {
  const [drivers, setDrivers] = useState(deliveryCache.drivers);
  const [allActiveDrivers, setAllActiveDrivers] = useState(
    deliveryCache.allActiveDrivers,
  );
  const [activeOrdersCount, setActiveOrdersCount] = useState(
    deliveryCache.activeOrdersCount,
  );
  const [loading, setLoading] = useState(deliveryCache.drivers.length === 0);
  const [lastFetch, setLastFetch] = useState(deliveryCache.lastFetch);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [showMap, setShowMap] = useState(false);

  const [lastVisibleActive, setLastVisibleActive] = useState(null);
  const [lastVisibleInactive, setLastVisibleInactive] = useState(null);
  const [hasMoreActive, setHasMoreActive] = useState(true);
  const [hasMoreInactive, setHasMoreInactive] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showingAllActive, setShowingAllActive] = useState(false);
  const [showingAllInactive, setShowingAllInactive] = useState(false);

  const ITEMS_PER_PAGE = 5;
  const isMounted = useRef(true);

  // Sync state with cache
  const syncToCache = useCallback(
    (newDrivers, newAllActiveDrivers, newOrdersCount, newLastFetch) => {
      if (newDrivers !== undefined) deliveryCache.drivers = newDrivers;
      if (newAllActiveDrivers !== undefined)
        deliveryCache.allActiveDrivers = newAllActiveDrivers;
      if (newOrdersCount !== undefined)
        deliveryCache.activeOrdersCount = newOrdersCount;
      if (newLastFetch !== undefined) deliveryCache.lastFetch = newLastFetch;
    },
    [],
  );

  // Memoized calculations - use allActiveDrivers for accurate count
  const stats = useMemo(() => {
    const activeDrivers = allActiveDrivers.length;
    const totalDeliveries = drivers.length;
    const avgRating =
      drivers.length > 0
        ? (
            drivers.reduce((sum, d) => sum + (parseFloat(d.rating) || 0), 0) /
            drivers.length
          ).toFixed(1)
        : "0.0";

    return { activeDrivers, totalDeliveries, avgRating };
  }, [allActiveDrivers, drivers]);

  // Fetch all active drivers for accurate stats and map
  const fetchAllActiveDrivers = useCallback(async () => {
    try {
      const allActiveQuery = query(
        collection(db, "riders"),
        where("activeOrders", ">", 0),
        orderBy("activeOrders", "desc"),
      );
      const snapshot = await getDocs(allActiveQuery);
      const activeDriversList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllActiveDrivers(activeDriversList);
      syncToCache(undefined, activeDriversList, undefined, undefined);
    } catch (error) {
      console.error("Error fetching all active drivers:", error);
    }
  }, [syncToCache]);

  // Fetch initial drivers
  const fetchInitialDrivers = useCallback(async () => {
    if (deliveryCache.drivers.length > 0) {
      return;
    }

    try {
      setLoading(true);
      const allDrivers = [];

      // Fetch all active drivers for stats/map
      await fetchAllActiveDrivers();

      // Fetch active drivers for UI (paginated)
      const activeQuery = query(
        collection(db, "riders"),
        where("activeOrders", ">", 0),
        orderBy("activeOrders", "desc"),
        limit(ITEMS_PER_PAGE),
      );
      const activeSnapshot = await getDocs(activeQuery);
      const activeDriversList = activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      allDrivers.push(...activeDriversList);

      if (activeSnapshot.docs.length > 0) {
        setLastVisibleActive(
          activeSnapshot.docs[activeSnapshot.docs.length - 1],
        );
        setHasMoreActive(activeSnapshot.docs.length === ITEMS_PER_PAGE);
      } else {
        setHasMoreActive(false);
      }

      // Fetch inactive drivers
      const inactiveQuery = query(
        collection(db, "riders"),
        orderBy("name"),
        limit(ITEMS_PER_PAGE * 3),
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
          (doc) => doc.id === lastInactiveDriver.id,
        );
        setLastVisibleInactive(lastDoc);
        setHasMoreInactive(inactiveSnapshot.docs.length === ITEMS_PER_PAGE * 3);
      } else {
        setHasMoreInactive(false);
      }

      const now = new Date();
      setDrivers(allDrivers);
      setLastFetch(now);
      syncToCache(allDrivers, undefined, undefined, now);
    } catch (error) {
      console.error("Error fetching initial drivers:", error);
    } finally {
      setLoading(false);
    }
  }, [syncToCache, fetchAllActiveDrivers]);

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
                d.id === driverData.id ? driverData : d,
              );
            } else if (change.type === "removed") {
              updatedDrivers = updatedDrivers.filter(
                (d) => d.id !== driverData.id,
              );
            }
          });

          syncToCache(updatedDrivers, undefined, undefined, new Date());
          return updatedDrivers;
        });

        // Update allActiveDrivers
        fetchAllActiveDrivers();

        const now = new Date();
        setLastFetch(now);
        syncToCache(undefined, undefined, undefined, now);
      },
      (error) => {
        console.error("Error in riders listener:", error);
      },
    );

    // Orders listener with compound query
    const ordersUnsubscribe = onSnapshot(
      query(
        collection(db, "orders"),
        where("orderStatus", "in", ["preparing", "in transit", "transit"]),
      ),
      (snapshot) => {
        const count = snapshot.size;
        setActiveOrdersCount(count);
        syncToCache(undefined, undefined, count, undefined);

        const now = new Date();
        setLastFetch(now);
        syncToCache(undefined, undefined, undefined, now);
      },
      (error) => {
        console.error("Error in orders listener:", error);
      },
    );

    deliveryCache.unsubscribers = [ridersUnsubscribe, ordersUnsubscribe];
    deliveryCache.listenersInitialized = true;
  }, [syncToCache, fetchAllActiveDrivers]);

  // Initialize data and listeners
  useEffect(() => {
    isMounted.current = true;

    if (deliveryCache.drivers.length > 0) {
      setDrivers(deliveryCache.drivers);
      setAllActiveDrivers(deliveryCache.allActiveDrivers);
      setActiveOrdersCount(deliveryCache.activeOrdersCount);
      setLastFetch(deliveryCache.lastFetch);
      setLoading(false);
    }

    setupListeners();

    if (deliveryCache.drivers.length === 0) {
      fetchInitialDrivers();
    }

    return () => {
      isMounted.current = false;
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
        limit(ITEMS_PER_PAGE),
      );
      const activeSnapshot = await getDocs(activeQuery);
      const newDrivers = activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (newDrivers.length > 0) {
        setDrivers((prev) => {
          const updated = [...prev, ...newDrivers];
          syncToCache(updated, undefined, undefined, undefined);
          return updated;
        });
        setLastVisibleActive(
          activeSnapshot.docs[activeSnapshot.docs.length - 1],
        );
        setHasMoreActive(newDrivers.length === ITEMS_PER_PAGE);
      } else {
        setHasMoreActive(false);
      }
      setShowingAllActive(false);
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
        limit(ITEMS_PER_PAGE * 3),
      );
      const inactiveSnapshot = await getDocs(inactiveQuery);
      const newDrivers = inactiveSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((driver) => (driver.activeOrders || 0) === 0)
        .slice(0, ITEMS_PER_PAGE);

      if (newDrivers.length > 0) {
        setDrivers((prev) => {
          const updated = [...prev, ...newDrivers];
          syncToCache(updated, undefined, undefined, undefined);
          return updated;
        });
        const lastInactiveDriver = newDrivers[newDrivers.length - 1];
        const lastDoc = inactiveSnapshot.docs.find(
          (doc) => doc.id === lastInactiveDriver.id,
        );
        setLastVisibleInactive(lastDoc);
        setHasMoreInactive(inactiveSnapshot.docs.length === ITEMS_PER_PAGE * 3);
      } else {
        setHasMoreInactive(false);
      }
      setShowingAllInactive(false);
    } catch (error) {
      console.error("Error loading more inactive drivers:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreInactive, loadingMore, lastVisibleInactive, syncToCache]);

  // View less active drivers
  const viewLessActive = useCallback(async () => {
    setLoadingMore(true);
    try {
      const activeQuery = query(
        collection(db, "riders"),
        where("activeOrders", ">", 0),
        orderBy("activeOrders", "desc"),
        limit(ITEMS_PER_PAGE),
      );
      const activeSnapshot = await getDocs(activeQuery);
      const activeDriversList = activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setDrivers((prev) => {
        const inactiveDrivers = prev.filter((d) => (d.activeOrders || 0) === 0);
        const updated = [...activeDriversList, ...inactiveDrivers];
        syncToCache(updated, undefined, undefined, undefined);
        return updated;
      });

      if (activeSnapshot.docs.length > 0) {
        setLastVisibleActive(
          activeSnapshot.docs[activeSnapshot.docs.length - 1],
        );
        setHasMoreActive(activeSnapshot.docs.length === ITEMS_PER_PAGE);
      }
      setShowingAllActive(false);
    } catch (error) {
      console.error("Error resetting active drivers view:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [syncToCache]);

  // View less inactive drivers
  const viewLessInactive = useCallback(async () => {
    setLoadingMore(true);
    try {
      const inactiveQuery = query(
        collection(db, "riders"),
        orderBy("name"),
        limit(ITEMS_PER_PAGE * 3),
      );
      const inactiveSnapshot = await getDocs(inactiveQuery);
      const inactiveDriversList = inactiveSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((driver) => (driver.activeOrders || 0) === 0)
        .slice(0, ITEMS_PER_PAGE);

      setDrivers((prev) => {
        const activeDrivers = prev.filter((d) => (d.activeOrders || 0) > 0);
        const updated = [...activeDrivers, ...inactiveDriversList];
        syncToCache(updated, undefined, undefined, undefined);
        return updated;
      });

      if (inactiveDriversList.length > 0) {
        const lastInactiveDriver =
          inactiveDriversList[inactiveDriversList.length - 1];
        const lastDoc = inactiveSnapshot.docs.find(
          (doc) => doc.id === lastInactiveDriver.id,
        );
        setLastVisibleInactive(lastDoc);
        setHasMoreInactive(inactiveSnapshot.docs.length === ITEMS_PER_PAGE * 3);
      }
      setShowingAllInactive(false);
    } catch (error) {
      console.error("Error resetting inactive drivers view:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [syncToCache]);

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
    [filteredDrivers],
  );

  const inactiveFilteredDrivers = useMemo(
    () => filteredDrivers.filter((d) => (d.activeOrders || 0) === 0),
    [filteredDrivers],
  );

  // Track if showing more than initial page
  useEffect(() => {
    const activeCount = drivers.filter((d) => (d.activeOrders || 0) > 0).length;
    const inactiveCount = drivers.filter(
      (d) => (d.activeOrders || 0) === 0,
    ).length;

    setShowingAllActive(activeCount > ITEMS_PER_PAGE);
    setShowingAllInactive(inactiveCount > ITEMS_PER_PAGE);
  }, [drivers]);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-slate-600">Loading drivers...</div>
      </div>
    );
  }

  // CONTINUE IN PART 2...
  // CONTINUATION FROM PART 1...
  // This is the return JSX and components

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

      {/* Search Bar & Map Toggle */}
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
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus("inactive")}
            className={`px-4 py-3 rounded-lg font-medium transition-colors ${
              filterStatus === "inactive"
                ? "bg-red-500 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Inactive
          </button>
          <button
            onClick={() => setShowMap(!showMap)}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showMap
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <MapIcon size={18} />
            Map
          </button>
        </div>
      </div>

      {/* Map Section - Uses allActiveDrivers */}
      {showMap && (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <DeliveryMap drivers={allActiveDrivers} />
        </div>
      )}

      {filterStatus === "active" && activeFilteredDrivers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Active Drivers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeFilteredDrivers.map((driver) => (
              <DriverCard key={driver.id} driver={driver} />
            ))}
          </div>
          {!searchTerm && (
            <div className="mt-6 text-center flex gap-4 justify-center">
              {hasMoreActive && !showingAllActive && (
                <button
                  onClick={loadMoreActive}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? "Loading..." : "View More Active Drivers"}
                </button>
              )}
              {showingAllActive && (
                <button
                  onClick={viewLessActive}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? "Loading..." : "View Less"}
                </button>
              )}
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
          {!searchTerm && (
            <div className="mt-6 text-center flex gap-4 justify-center">
              {hasMoreInactive && !showingAllInactive && (
                <button
                  onClick={loadMoreInactive}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? "Loading..." : "View More Inactive Drivers"}
                </button>
              )}
              {showingAllInactive && (
                <button
                  onClick={viewLessInactive}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMore ? "Loading..." : "View Less"}
                </button>
              )}
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

// Delivery Map Component with Bike Icon
const DeliveryMap = ({ drivers }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.async = true;
    script.onload = () => {
      if (mapContainer.current && !map.current) {
        let centerLat = 23.735;
        let centerLng = 92.076;
        let zoomLevel = 10;

        if (drivers.length > 0) {
          const driverWithCoords = drivers.find(
            (d) => d.currentLocation || (d.latitude && d.longitude),
          );
          if (driverWithCoords) {
            if (driverWithCoords.currentLocation) {
              const loc = driverWithCoords.currentLocation;
              if (typeof loc === "object") {
                centerLat = loc.latitude || loc.lat;
                centerLng = loc.longitude || loc.lng;
              } else if (typeof loc === "string") {
                const coords = loc.split(",");
                centerLat = parseFloat(coords[0]);
                centerLng = parseFloat(coords[1]);
              }
            } else {
              centerLat = parseFloat(driverWithCoords.latitude);
              centerLng = parseFloat(driverWithCoords.longitude);
            }
            zoomLevel = 13;
          }
        }

        map.current = window.L.map(mapContainer.current).setView(
          [centerLat, centerLng],
          zoomLevel,
        );

        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          },
        ).addTo(map.current);

        drivers.forEach((driver) => {
          let lat, lng;

          if (driver.currentLocation) {
            if (typeof driver.currentLocation === "object") {
              lat =
                driver.currentLocation.latitude || driver.currentLocation.lat;
              lng =
                driver.currentLocation.longitude || driver.currentLocation.lng;
            } else if (typeof driver.currentLocation === "string") {
              const coords = driver.currentLocation.split(",");
              lat = parseFloat(coords[0]);
              lng = parseFloat(coords[1]);
            }
          } else if (driver.latitude && driver.longitude) {
            lat = parseFloat(driver.latitude);
            lng = parseFloat(driver.longitude);
          }

          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            const markerColor = driver.color || "bg-green-500";
            const colorClass = markerColor.replace("bg-", "");

            const markerHTML = `
              <div class="flex items-center justify-center w-10 h-10 rounded-full shadow-lg" style="background-color: ${getColorValue(colorClass)};">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18.5" cy="17.5" r="3.5"/>
                  <circle cx="5.5" cy="17.5" r="3.5"/>
                  <circle cx="15" cy="5" r="1"/>
                  <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                </svg>
              </div>
            `;

            const customIcon = window.L.divIcon({
              html: markerHTML,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              className: "custom-marker",
            });

            window.L.marker([lat, lng], { icon: customIcon })
              .bindPopup(
                `<div class="p-2">
                  <h4 class="font-bold text-sm">${driver.name}</h4>
                  <p class="text-xs text-gray-600">${driver.id || "N/A"}</p>
                  <p class="text-xs text-gray-600">${driver.vechicleType || "N/A"}</p>
                  <p class="text-xs font-semibold mt-1">Delivering: ${driver.activeOrders || 0} orders</p>
                  <p class="text-xs text-gray-500 mt-1">📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                </div>`,
              )
              .addTo(map.current);
          }
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
  }, [drivers]);

  return (
    <div ref={mapContainer} className="w-full" style={{ minHeight: "400px" }} />
  );
};

// Helper function to convert Tailwind color classes to actual colors
const getColorValue = (colorClass) => {
  const colorMap = {
    "purple-500": "#a855f7",
    "blue-500": "#3b82f6",
    "green-500": "#22c55e",
    "red-500": "#ef4444",
    "yellow-500": "#eab308",
    "pink-500": "#ec4899",
    "indigo-500": "#6366f1",
    "orange-500": "#f97316",
    "teal-500": "#14b8a6",
  };
  return colorMap[colorClass] || "#22c55e";
};

// Driver Card Component
const DriverCard = ({ driver }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div
          className={`${
            driver.color || "bg-purple-500"
          } w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md`}
        >
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
        } text-xs font-medium rounded-full`}
      >
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
      }
    >
      <p
        className={
          (driver.activeOrders || 0) > 0
            ? "text-sm text-orange-700 font-medium"
            : "text-sm text-gray-400 font-medium"
        }
      >
        Currently delivering {driver.activeOrders || 0}{" "}
        {(driver.activeOrders || 0) === 1 ? "order" : "orders"}
      </p>
    </div>
  </div>
);

export default Delivery;
