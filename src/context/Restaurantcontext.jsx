/**
 * RestaurantContext
 *
 * Strategy:
 *  - Fetch once (getDocs) — restaurant list doesn't change every second
 *  - limit(20) — admin dashboard only needs a paginated overview
 *  - loadMore() fetches next 20 via cursor
 *  - No orderBy — avoids Firestore composite index requirement
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  collection,
  getDocs,
  query,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../Firebase";

const RestaurantContext = createContext(null);

const PAGE_SIZE = 20;

const normalise = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.kitchen_name || "Unnamed Kitchen",
    ownerName: d.owner_name || "",
    cuisine: d.cuisine || "",
    specialties: Array.isArray(d.specialties) ? d.specialties : [],
    description: d.description || "",
    locationName: d.kitchen_address || "",
    profileImage: d.profile_image || "https://i.pravatar.cc/150?img=1",
    featuredDishImage:
      d.featured_dish_image ||
      "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400",
    rating: parseFloat(d.rating) || 0,
    priceForOne: d.price_for_one || "N/A",
    deliveryTime: d.delivery_time || "N/A",
    totalOrders: d.total_orders || 0,
    isVeg: (d.food_preference || "").toLowerCase() === "veg",
    status: d.isActive ? "open" : "closed",
    openTime: d.open_time || "N/A",
    closeTime: d.close_time || "N/A",
    phone: d.phone || "N/A",
    email: d.email || "N/A",
    revenue: parseFloat(d.lifetime_earnings) || 0,
  };
};

export function RestaurantProvider({ children }) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const lastDocRef = useRef(null);

  useEffect(() => {
    const fetchFirst = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "moms_kitchens"), limit(PAGE_SIZE)),
        );
        setRestaurants(snap.docs.map(normalise));
        lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("[RestaurantContext]", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFirst();
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "moms_kitchens"),
          startAfter(lastDocRef.current),
          limit(PAGE_SIZE),
        ),
      );
      setRestaurants((prev) => [...prev, ...snap.docs.map(normalise)]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("[RestaurantContext] loadMore:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  const value = useMemo(
    () => ({ restaurants, loading, loadingMore, hasMore, loadMore, error }),
    [restaurants, loading, loadingMore, hasMore, loadMore, error],
  );

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx)
    throw new Error("useRestaurant must be used inside <RestaurantProvider>");
  return ctx;
}
