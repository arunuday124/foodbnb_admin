import { MapPin, Star, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const RestaurantDisplay = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const hasLoadedRef = useRef(false);

  // Fetch restaurants from Firebase with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;

    const fetchRestaurants = async () => {
      // Prevent multiple fetches
      if (hasLoadedRef.current) return;

      try {
        setLoading(true);
        setError(null);

        const querySnapshot = await getDocs(collection(db, "moms_kitchens"));

        // Only update state if component is still mounted
        if (!isMountedRef.current) return;

        const restaurantsList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            ownerName: data.ownerName || "",
            cuisine: data.cuisine || "",
            specialties: Array.isArray(data.specialties)
              ? data.specialties
              : [],
            description: data.description || "",
            locationName: data.locationName || "",
            profileImage:
              data.profileImage || "https://i.pravatar.cc/150?img=1",
            featuredDishImage:
              data.featuredDishImage ||
              "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400",
            rating: parseFloat(data.rating) || 0,
            priceForOne: data.priceForOne || 0,
            deliveryTime: data.deliveryTime || 0,
            totalOrders: data.totalOrders || 0,
            isVeg: data.isVeg || false,
            status: (data.status || "closed").toLowerCase(),
            openTime: data.openTime || "N/A",
            closeTime: data.closeTime || "N/A",
            phone: data.phone || "N/A",
            email: data.email || "N/A",
            revenue: parseFloat(data.revenue) || 0,
          };
        });

        if (isMountedRef.current) {
          setAllRestaurants(restaurantsList);
          setLoading(false);
          hasLoadedRef.current = true;
          // console.log("Fetched restaurants:", restaurantsList);
        }
      } catch (err) {
        // Only handle error if component is mounted and it's not an abort error
        if (isMountedRef.current) {
          if (err.name === "AbortError" || err.code === "cancelled") {
            console.log("Request was cancelled - this is normal");
          } else {
            console.error("Error fetching restaurants:", err);
            setError(err.message);
            setLoading(false);
          }
        }
      }
    };

    fetchRestaurants();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - only run once

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-700";
      case "closed":
        return "bg-red-100 text-red-700";
      case "temporarily closed":
        return "bg-yellow-100 text-yellow-700";
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

  const filteredRestaurants =
    activeFilter === "all"
      ? allRestaurants
      : allRestaurants.filter(
          (restaurant) => restaurant.status === activeFilter
        );

  const getFilterCount = (status) => {
    if (status === "all") return allRestaurants.length;
    return allRestaurants.filter((restaurant) => restaurant.status === status)
      .length;
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading kitchens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error Loading Data</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Mom's Kitchen Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage all registered Kitchens
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
                  ? "bg-gray-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              All Restaurants ({getFilterCount("all")})
            </button>
            <button
              onClick={() => setActiveFilter("open")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "open"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              Open ({getFilterCount("open")})
            </button>
            <button
              onClick={() => setActiveFilter("closed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "closed"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              Closed ({getFilterCount("closed")})
            </button>
            <button
              onClick={() => setActiveFilter("temporarily closed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "temporarily closed"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              Temporarily Closed ({getFilterCount("temporarily closed")})
            </button>
          </div>
        </div>

        {/* Restaurants Grid */}
        {filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                {/* Featured Image */}
                <div className="relative h-40 bg-gray-200 overflow-hidden">
                  <img
                    src={restaurant.featuredDishImage}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400";
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Restaurant Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <img
                        src={restaurant.profileImage}
                        alt={restaurant.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://i.pravatar.cc/150?img=1";
                        }}
                      />
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">
                          {restaurant.name || "Unknown Kitchen"}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {restaurant.ownerName
                            ? `by ${restaurant.ownerName}`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase whitespace-nowrap ml-2 ${getStatusColor(
                        restaurant.status
                      )}`}>
                      {getStatusLabel(restaurant.status)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {restaurant.description || "No description available"}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <Star
                      size={16}
                      className={`${getRatingColor(restaurant.rating)}`}
                      fill="currentColor"
                    />
                    <span
                      className={`font-semibold text-sm ${getRatingColor(
                        restaurant.rating
                      )}`}>
                      {restaurant.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({restaurant.totalOrders} orders)
                    </span>
                  </div>

                  {/* Cuisine & Specialties */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                      {restaurant.cuisine
                        ? `Cuisine: ${restaurant.cuisine}`
                        : "Cuisine: N/A"}
                    </p>
                    {restaurant.specialties.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {restaurant.specialties.map((specialty, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No specialties listed
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <p>{restaurant.locationName || "N/A"}</p>
                  </div>

                  {/* Info Row */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-y border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Price per Order</p>
                      <p className="text-sm font-bold text-gray-900">
                        ₹{restaurant.priceForOne || "0"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Delivery Time</p>
                      <p className="text-sm font-bold text-gray-900">
                        {restaurant.deliveryTime || "0"} mins
                      </p>
                    </div>
                  </div>

                  {/* Veg/Non-Veg Badge */}
                  <div className="flex items-center gap-2 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        restaurant.isVeg
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                      {restaurant.isVeg ? "🥗 Vegetarian" : "🍗 Non-Vegetarian"}
                    </span>
                    {restaurant.revenue > 0 && (
                      <span className="text-xs text-gray-600 ml-auto">
                        Revenue: ₹{restaurant.revenue.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Hours & Contact */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Clock size={14} />
                      <span className="text-xs">
                        {restaurant.openTime} - {restaurant.closeTime}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      📞 {restaurant.phone}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      📧 {restaurant.email}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No restaurants found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDisplay;