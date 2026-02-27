/**
 * CustomersContext
 *
 * Strategy:
 *  - Real-time listener on the FIRST 20 users only
 *  - loadMore() uses startAfter cursor to fetch next 20
 *  - No orderBy (avoids composite index requirement on users collection)
 *  - Firestore reads stay at 20 until user explicitly loads more
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
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../Firebase";

const CustomersContext = createContext(null);

const PAGE_SIZE = 20;

const COLORS = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
];

const normaliseUser = (doc) => {
  const d = doc.data();
  const parts = (d.name || "U").split(" ");
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();

  return {
    id: doc.id,
    name: d.name || "Unknown",
    email: d.email || "No email",
    phone: d.phone ? String(d.phone) : "No phone", // phone is number in DB
    address: d.address || "No address",
    photoURL: d.photoURL || null,
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
    walletBalance: d.walletBalance || 0,
    noOfOrders: d.noOfOrders || 0,
    location: d.location || null, // GeoPoint
    initials,
    color: COLORS[doc.id.charCodeAt(0) % COLORS.length],
    // Save the raw doc snapshot for cursor pagination
    _snapshot: doc,
  };
};

export function CustomersProvider({ children }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastDocRef = useRef(null);

  useEffect(() => {
    // No orderBy — avoids Firestore composite index requirement
    const q = query(collection(db, "users"), limit(PAGE_SIZE));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(normaliseUser);
        setCustomers(list);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
        setHasMore(snapshot.docs.length === PAGE_SIZE);
        setLoading(false);
      },
      (err) => {
        console.error("[CustomersContext]", err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, "users"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE),
      );
      const snapshot = await getDocs(q);
      const newCustomers = snapshot.docs.map(normaliseUser);

      setCustomers((prev) => [...prev, ...newCustomers]);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("[CustomersContext] loadMore:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  const value = useMemo(
    () => ({ customers, loading, loadingMore, hasMore, loadMore }),
    [customers, loading, loadingMore, hasMore, loadMore],
  );

  return (
    <CustomersContext.Provider value={value}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx)
    throw new Error("useCustomers must be used inside <CustomersProvider>");
  return ctx;
}
