import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  doc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";

// ── Firebase config – replace with your own ──────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const PAGE_SIZE = 5;
const MAX_RESOLVED = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function mapDoc(docSnap) {
  const d = docSnap.data();
  return {
    id: d.requestId ?? docSnap.id,
    docId: docSnap.id,
    name: d.customerName ?? "—",
    email: d.email ?? "—",
    issue: d.issueType ?? "—",
    message: d.message ?? "",
    status:
      typeof d.status === "boolean"
        ? d.status
          ? "Resolved"
          : "Pending"
        : (d.status ?? "Pending"),
    datetime: formatTimestamp(d.time),
    _docRef: docSnap,
  };
}

// ── Status badge config ───────────────────────────────────────────────────────
const statusConfig = {
  Pending: {
    dot: "bg-yellow-400",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  Resolved: {
    dot: "bg-green-400",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

const filters = ["All Requests", "Pending", "Resolved"];

function StatusBadge({ status }) {
  const s = statusConfig[status] ?? statusConfig["Pending"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ── Message Detail Modal ──────────────────────────────────────────────────────
function MessageModal({ row, onClose, onResolve }) {
  const [resolving, setResolving] = useState(false);
  const [localResolved, setLocalResolved] = useState(false);

  // Reset local state whenever a new row opens
  useEffect(() => {
    setLocalResolved(row?.status === "Resolved");
    setResolving(false);
  }, [row?.docId]);

  useEffect(() => {
    if (!row) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [row, onClose]);

  if (!row) return null;

  const isResolved = localResolved || row.status === "Resolved";

  async function handleResolve() {
    if (isResolved || resolving) return;
    setResolving(true);
    try {
      await onResolve(row);
      setLocalResolved(true);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm z-10"
        style={{ animation: "fadeInScale 0.15s ease-out" }}
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-mono text-gray-400">#{row.id}</p>
            <h3 className="text-sm font-semibold text-gray-900 mt-0.5">
              {row.name}
            </h3>
            <p className="text-xs text-blue-500 truncate">{row.email}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 flex-wrap">
          <StatusBadge status={isResolved ? "Resolved" : row.status} />
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {row.issue}
          </span>
          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
            {row.datetime}
          </span>
        </div>

        {/* Message bubble */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
            Customer Message
          </p>
          {row.message ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {row.message}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 italic">
                No message provided.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-2">
          {isResolved ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Resolved
            </div>
          ) : (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
              {resolving ? (
                <>
                  <svg
                    className="w-3 h-3 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Resolving…
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Resolved
                </>
              )}
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 transition">
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ── Details Button ────────────────────────────────────────────────────────────
function DetailsBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-lg transition whitespace-nowrap">
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      Details
    </button>
  );
}

// ── Mobile Card ───────────────────────────────────────────────────────────────
function MobileCard({ row, onDetails }) {
  return (
    <div className="p-4 border-b border-gray-100 last:border-none hover:bg-gray-50 transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs font-semibold text-gray-900">
          #{row.id}
        </span>
        <StatusBadge status={row.status} />
      </div>
      <p className="text-sm font-medium text-gray-800">{row.name}</p>
      <p className="text-xs text-blue-500 mt-0.5 truncate">{row.email}</p>
      <div className="flex flex-wrap items-center justify-between mt-2.5 gap-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          {row.issue}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{row.datetime}</span>
          <DetailsBtn onClick={() => onDetails(row)} />
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SupportRequests() {
  const [searchInput, setSearchInput] = useState(""); // raw typed value
  const [search, setSearch] = useState(""); // debounced value
  const [activeFilter, setActiveFilter] = useState("All Requests");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const pagesCache = useRef({});
  const currentPageRef = useRef(1);
  const [pageData, setPageData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // ── Debounce: wait 400ms after user stops typing ─────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 2000);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Fetch total count ────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchCount() {
      try {
        const col = collection(db, "supportRequest");
        const snap = await getCountFromServer(col);
        setTotalCount(snap.data().count);
      } catch (e) {
        console.error("Count fetch failed:", e);
      }
    }
    fetchCount();
  }, []);

  // ── Fetch page ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (pagesCache.current[currentPage]) {
      setPageData(pagesCache.current[currentPage].rows);
      return;
    }

    async function fetchPage() {
      setLoading(true);
      setError(null);
      try {
        const col = collection(db, "supportRequest");
        let q;
        if (currentPage === 1) {
          q = query(col, orderBy("time", "desc"), limit(PAGE_SIZE));
        } else {
          const prevPage = pagesCache.current[currentPage - 1];
          if (!prevPage) {
            setError("Please navigate pages sequentially.");
            setLoading(false);
            return;
          }
          q = query(
            col,
            orderBy("time", "desc"),
            startAfter(prevPage.lastDoc),
            limit(PAGE_SIZE),
          );
        }

        const snapshot = await getDocs(q);
        const rows = snapshot.docs.map(mapDoc);
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        pagesCache.current[currentPage] = { rows, lastDoc };
        setPageData(rows);
      } catch (e) {
        console.error("Fetch error:", e);
        setError("Failed to load data. Check your Firebase config.");
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [currentPage]);

  // ── Resolve handler ──────────────────────────────────────────────────────
  const handleResolve = useCallback(async (row) => {
    // 1. Mark doc as resolved in Firestore
    const docRef = doc(db, "supportRequest", row.docId);
    await updateDoc(docRef, { status: true });

    // 2. Fetch all resolved docs (oldest first) to enforce max 5
    const resolvedSnap = await getDocs(
      query(
        collection(db, "supportRequest"),
        where("status", "==", true),
        orderBy("time", "asc"),
      ),
    );

    // 3. Delete oldest excess resolved docs
    if (resolvedSnap.docs.length > MAX_RESOLVED) {
      const excess = resolvedSnap.docs.slice(
        0,
        resolvedSnap.docs.length - MAX_RESOLVED,
      );
      await Promise.all(excess.map((d) => deleteDoc(d.ref)));
    }

    // 4. Update local state optimistically — change status so it moves sections
    //    Also update the cache so the change survives without a re-fetch
    setPageData((prev) => {
      const updated = prev.map((r) =>
        r.docId === row.docId ? { ...r, status: "Resolved" } : r,
      );
      // Keep cache in sync so pagination doesn't revert the change
      if (pagesCache.current[currentPageRef.current]) {
        pagesCache.current[currentPageRef.current] = {
          ...pagesCache.current[currentPageRef.current],
          rows: updated,
        };
      }
      return updated;
    });

    // 5. Refresh total count (deletions may have reduced it)
    try {
      const countSnap = await getCountFromServer(
        collection(db, "supportRequest"),
      );
      setTotalCount(countSnap.data().count);
    } catch (_) {}
  }, []);

  // ── Filter rows ──────────────────────────────────────────────────────────
  const filtered = pageData.filter((row) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      row.id.toLowerCase().includes(q) ||
      row.name.toLowerCase().includes(q) ||
      row.email.toLowerCase().includes(q) ||
      row.issue.toLowerCase().includes(q);
    const matchesFilter =
      activeFilter === "All Requests" || row.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  function handlePageChange(p) {
    if (p < 1 || p > totalPages || p === currentPage) return;
    setCurrentPage(p);
  }

  function getPageNumbers() {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  return (
    <div className="min-h-screen bg-gray-100 px-3 py-6 sm:px-6 sm:py-8 md:px-8 lg:px-12 xl:px-16 2xl:px-24 2xl:py-12">
      <MessageModal
        row={selectedRow}
        onClose={() => setSelectedRow(null)}
        onResolve={handleResolve}
      />

      {/* Page Header */}
      <div className="mb-5 sm:mb-7 xl:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 tracking-tight">
          Support Requests
        </h1>
        <p className="text-gray-500 mt-1 text-xs sm:text-sm xl:text-base">
          Manage and respond to customer inquiries
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-4 sm:px-5 sm:py-4 md:px-6 md:py-5 border-b border-gray-100 space-y-3 sm:space-y-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ID, name, or issue type..."
                className="w-full pl-9 sm:pl-10 pr-8 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition"
              />
              {/* Subtle spinner while debounce is pending */}
              {searchInput !== search && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-3.5 h-3.5 text-gray-300 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition shrink-0">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24">
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
              {activeFilter === "All Requests" ? "Filter" : activeFilter}
            </button>

            <div className="hidden sm:flex gap-1 ml-auto flex-wrap justify-end">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                    activeFilter === f
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {mobileFilterOpen && (
            <div className="flex flex-wrap gap-2 sm:hidden pt-1">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setActiveFilter(f);
                    setMobileFilterOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    activeFilter === f
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <svg
              className="w-6 h-6 text-blue-500 animate-spin"
              fill="none"
              viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="ml-3 text-sm text-gray-400">Loading...</span>
          </div>
        )}

        {error && !loading && (
          <p className="px-6 py-12 text-center text-sm text-red-400">{error}</p>
        )}

        {/* Mobile Cards */}
        {!loading && !error && (
          <div className="block md:hidden divide-y divide-gray-50">
            {filtered.length > 0 ? (
              filtered.map((row) => (
                <MobileCard key={row.id} row={row} onDetails={setSelectedRow} />
              ))
            ) : (
              <p className="px-6 py-12 text-center text-sm text-gray-400">
                No requests found.
              </p>
            )}
          </div>
        )}

        {/* Desktop Table */}
        {!loading && !error && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Request ID",
                    "Customer Name",
                    "Issue Type",
                    "Status",
                    "Date/Time",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap ${i === 1 ? "" : i === 4 ? "hidden xl:table-cell" : ""}`}>
                      {h}
                    </th>
                  ))}
                  <th className="hidden lg:table-cell px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    Email
                  </th>
                  <th className="px-4 lg:px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 transition ${i < filtered.length - 1 ? "border-b border-gray-50" : ""}`}>
                    <td className="px-4 lg:px-6 py-4 lg:py-5 font-mono text-xs lg:text-sm font-semibold text-gray-900 whitespace-nowrap">
                      #{row.id}
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm font-medium text-gray-800 whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm text-gray-600 whitespace-nowrap">
                      {row.issue}
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="hidden xl:table-cell px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm text-gray-500 whitespace-nowrap">
                      {row.datetime}
                    </td>
                    <td className="hidden lg:table-cell px-4 lg:px-6 py-4 lg:py-5 text-xs lg:text-sm text-blue-500 hover:underline cursor-pointer max-w-[200px] xl:max-w-xs truncate">
                      {row.email}
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5">
                      <DetailsBtn onClick={() => setSelectedRow(row)} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm text-gray-400">
                      No requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
          <p className="text-xs sm:text-sm text-gray-400 order-2 sm:order-1">
            {filtered.length > 0
              ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${(currentPage - 1) * PAGE_SIZE + filtered.length} of ${totalCount} requests`
              : `No requests found`}
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {getPageNumbers().map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
                  currentPage === p
                    ? "border-2 border-blue-600 text-blue-600 font-semibold"
                    : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}>
                {p}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
