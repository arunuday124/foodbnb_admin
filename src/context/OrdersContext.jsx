/**
 * OrdersContext
 *
 * Strategy:
 *  - Real-time listener on the FIRST 20 orders only (createdAt desc)
 *  - loadMore() fetches the next 20 using startAfter cursor (getDocs, not onSnapshot)
 *  - Firestore never reads more than (20 × pages loaded) documents
 *  - If DB has 1 lakh orders, only 20 are ever read until user explicitly clicks "Load More"
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
  onSnapshot,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../Firebase";
import { formatDistanceToNow } from "date-fns";

const OrdersContext = createContext(null);

const PAGE_SIZE = 20;

const normaliseOrder = (doc) => {
  const d = doc.data();
  return {
    id: doc.id,
    name: d.name || "",
    address: d.address || "",
    kitchenName: d.kitchenName || "",
    kitchen_id: d.kitchen_id || "",
    riderId: d.riderId || "",
    uId: d.uId || "",
    duration: d.duration || "",
    items: Array.isArray(d.items) ? d.items : [],
    createdAt: d.createdAt || null,
    order_id: d.order_id || doc.id,
    // order_status in DB is "Delivered" (capital) — normalise to lowercase
    status: (d.order_status || "").toLowerCase(),
    timeAgo: d.createdAt?.toDate
      ? formatDistanceToNow(d.createdAt.toDate(), { addSuffix: true })
      : "N/A",
  };
};

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Keep a ref to the last Firestore doc for cursor pagination
  const lastDocRef = useRef(null);
  // Track snapshot unsubscribe so we can clean up
  const unsubRef = useRef(null);

  useEffect(() => {
    // Real-time listener on FIRST 20 only
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(normaliseOrder);
        setOrders(list);
        // Save cursor — the last doc of this page
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
        // If we got fewer than PAGE_SIZE, there's nothing more to load
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error("[OrdersContext]", err);
        setLoading(false);
      },
    );

    unsubRef.current = unsub;
    return () => unsub();
  }, []);

  /**
   * loadMore — fetches the next PAGE_SIZE orders after the last cursor.
   * Uses getDocs (one-time read) not onSnapshot — no extra listener cost.
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE),
      );
      const snapshot = await getDocs(q);
      const newOrders = snapshot.docs.map(normaliseOrder);

      setOrders((prev) => [...prev, ...newOrders]);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("[OrdersContext] loadMore:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  const value = useMemo(
    () => ({ orders, loading, loadingMore, hasMore, loadMore }),
    [orders, loading, loadingMore, hasMore, loadMore],
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside <OrdersProvider>");
  return ctx;
}
