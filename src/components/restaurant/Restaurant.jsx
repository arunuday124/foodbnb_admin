import { MapPin, Star, TrendingUp, UtensilsCrossed, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../Firebase";

const Restaurant = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [allRestaurants, setAllRestaurants] = useState([]);

  // Restaurant data fetching from firebase
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "Restaurants"));
        const restaurantsList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Normalize status to lowercase
            status: (data.status || "closed").toLowerCase(),
            // Ensure rating is a number
            rating: parseFloat(data.rating) || 0,
            // Ensure revenue is a number
            revenue: parseFloat(data.revenue) || 0,
          };
        });
        setAllRestaurants(restaurantsList);
        console.log("Fetched restaurants:", restaurantsList);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };
    fetchRestaurants();
  }, []);

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

  return (
    <div className="min-h-full bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Restaurants Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track and manage all registered restaurants
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
              }`}
            >
              All Restaurants ({getFilterCount("all")})
            </button>
            <button
              onClick={() => setActiveFilter("open")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "open"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Open ({getFilterCount("open")})
            </button>
            <button
              onClick={() => setActiveFilter("closed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "closed"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Closed ({getFilterCount("closed")})
            </button>
            <button
              onClick={() => setActiveFilter("temporarily closed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === "temporarily closed"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Temporarily Closed ({getFilterCount("temporarily closed")})
            </button>
          </div>
        </div>

        {/* Restaurants Grid */}
        {filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white rounded-lg border border-gray-200 p-5 shadow-lg hover:shadow-xl transition-shadow"
              >
                {/* Restaurant Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {restaurant.name}
                    </h3>
                    <p className="text-xs text-gray-500">id : {restaurant.id}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(
                      restaurant.status
                    )}`}
                  >
                    {getStatusLabel(restaurant.status)}
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <Star
                    size={16}
                    className={`${getRatingColor(restaurant.rating)}`}
                    fill="currentColor"
                  />
                  <span
                    className={`font-semibold ${getRatingColor(
                      restaurant.rating
                    )}`}
                  >
                    {restaurant.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({restaurant.reviews || 0} reviews)
                  </span>
                </div>

                {/* Location & Specialty */}
                <div className="mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                    <MapPin size={16} className="mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{restaurant.address}</p>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                    <UtensilsCrossed size={16} className="mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{restaurant.speciality}</p>
                  </div>
                </div>

                {/* USP */}
                {/* <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 mb-1">
                    USP
                  </p>
                  <p className="text-sm text-blue-800 line-clamp-2">
                    {restaurant.usp || "N/A"}
                  </p>
                </div> */}

                {/* Revenue and Hours */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <TrendingUp size={16} />
                    <span className="font-semibold">
                      ₹{restaurant.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock size={16} />
                    <span className="text-xs">
                      {restaurant.openTime} - {restaurant.closeTime}
                    </span>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-bold text-black-500 mb-1">Contact</p>
                  <p className="text-sm  text-gray-600">
                    phone : {restaurant.phone}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    email : {restaurant.email}
                  </p>
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

export default Restaurant;
