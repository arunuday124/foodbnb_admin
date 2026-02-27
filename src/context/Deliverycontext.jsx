/**
 * DeliveryContext
 *
 * Strategy:
 *  - Active drivers: fetch once (usually a very small set)
 *  - Inactive drivers: 10 at a time via cursor pagination
 *  - No real-time — delivery page doesn't need live updates currently
 *  - Firestore reads: only active drivers + 10 inactive on mount
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
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../Firebase";

const DeliveryContext = createContext(null);

const PAGE_SIZE = 10;

export function DeliveryProvider({ children }) {
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [inactiveDrivers, setInactiveDrivers] = useState([]);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreInactive, setHasMoreInactive] = useState(true);

  const lastDocRef = useRef(null);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        // Active drivers: activeOrders > 0 — typically a very small set
        const activeSnap = await getDocs(
          query(
            collection(db, "riders"),
            where("activeOrders", ">", 0),
            orderBy("activeOrders", "desc"),
          ),
        );
        const activeList = activeSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setActiveDrivers(activeList);
        setActiveOrdersCount(
          activeList.reduce((s, d) => s + (d.activeOrders || 0), 0),
        );

        // Inactive: first 10 only
        const inactiveSnap = await getDocs(
          query(
            collection(db, "riders"),
            where("activeOrders", "==", 0),
            orderBy("name"),
            limit(PAGE_SIZE),
          ),
        );
        const inactiveList = inactiveSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInactiveDrivers(inactiveList);
        lastDocRef.current =
          inactiveSnap.docs[inactiveSnap.docs.length - 1] ?? null;
        setHasMoreInactive(inactiveSnap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("[DeliveryContext]", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  // Load next 10 inactive drivers from where cursor left off
  const loadMoreInactive = useCallback(async () => {
    if (!hasMoreInactive || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "riders"),
          where("activeOrders", "==", 0),
          orderBy("name"),
          startAfter(lastDocRef.current),
          limit(PAGE_SIZE),
        ),
      );
      const newList = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInactiveDrivers((prev) => [...prev, ...newList]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMoreInactive(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("[DeliveryContext] loadMore:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMoreInactive, loadingMore]);

  const value = useMemo(
    () => ({
      activeDrivers,
      inactiveDrivers,
      activeOrdersCount,
      loading,
      loadingMore,
      hasMoreInactive,
      loadMoreInactive,
    }),
    [
      activeDrivers,
      inactiveDrivers,
      activeOrdersCount,
      loading,
      loadingMore,
      hasMoreInactive,
      loadMoreInactive,
    ],
  );

  return (
    <DeliveryContext.Provider value={value}>
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const ctx = useContext(DeliveryContext);
  if (!ctx)
    throw new Error("useDelivery must be used inside <DeliveryProvider>");
  return ctx;
}
