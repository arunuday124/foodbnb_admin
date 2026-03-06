import { useState, useEffect, useRef, useCallback } from "react";
import { CircleX, Copy, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  getCountFromServer,
  doc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { db } from "../../Firebase";

const PAGE_SIZE = 5;
const RESOLVED_TTL_MS = 48 * 60 * 60 * 1000;

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
    _rawTime: d.time,
    _resolvedAt: d.resolvedAt ?? null,
  };
}

function buildBaseQuery(col, activeFilter) {
  if (activeFilter === "Pending")
    return query(col, where("status", "==", false), orderBy("time", "desc"));
  if (activeFilter === "Resolved")
    return query(col, where("status", "==", true), orderBy("time", "desc"));
  return query(col, orderBy("time", "desc"));
}

// ── Status badge ──────────────────────────────────────────────────────────────
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

// ── Modal ─────────────────────────────────────────────────────────────────────
function MessageModal({ row, onClose, onResolve }) {
  const [resolving, setResolving] = useState(false);
  const [localResolved, setLocalResolved] = useState(false);

  useEffect(() => {
    setLocalResolved(row?.status === "Resolved");
    setResolving(false);
  }, [row?.docId]);

  useEffect(() => {
    if (!row) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
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
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 flex-wrap">
          <StatusBadge status={isResolved ? "Resolved" : row.status} />
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {row.issue}
          </span>
          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
            {row.datetime}
          </span>
        </div>
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed shadow-sm">
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
                  Mark Resolved
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
      <style>{`@keyframes fadeInScale { from { opacity:0; transform:scale(0.95) translateY(6px);} to { opacity:1; transform:scale(1) translateY(0);}}`}</style>
    </div>
  );
}

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

function CopyEmailBtn({ email }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy email"
      className="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition shrink-0">
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

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

// ── Main Component ────────────────────────────────────────────────────────────
export default function SupportRequests() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Requests");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [error, setError] = useState(null);

  // ── THE FIX: useState drives re-renders ───────────────────────────────────
  // Root cause of the stuck-loading bug:
  //   queryClient.getQueryData() is a plain synchronous read — NOT reactive.
  //   When onSnapshot fires and calls setQueryData(), React has no idea the
  //   cache changed, so the component stays on the loading spinner forever.
  //
  // Fix: useState holds the rows and count. onSnapshot updates useState
  //   (triggers re-render) AND setQueryData (writes cache for re-visit).
  //   On re-visit: useState initializer seeds from cache → instant display.
  const pageKey = ["support-page", activeFilter, currentPage];
  const countKey = ["support-count", activeFilter];

  const [pageData, setPageData] = useState(
    () => queryClient.getQueryData(pageKey) ?? [],
  );
  const [totalCount, setTotalCount] = useState(
    () => queryClient.getQueryData(countKey) ?? 0,
  );

  // Reset local page data when filter or page changes
  // (so stale data from previous filter doesn't flash while new data loads)
  const prevFilterRef = useRef(activeFilter);
  const prevPageRef = useRef(currentPage);
  useEffect(() => {
    const filterChanged = prevFilterRef.current !== activeFilter;
    const pageChanged = prevPageRef.current !== currentPage;
    prevFilterRef.current = activeFilter;
    prevPageRef.current = currentPage;

    if (filterChanged || pageChanged) {
      // Seed from cache if available (re-visit), else reset to empty (first visit)
      const cached = queryClient.getQueryData(pageKey);
      setPageData(cached ?? []);
    }
  }, [activeFilter, currentPage]);

  const cursorsCache = useRef({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 1500);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page + cursors when filter changes
  useEffect(() => {
    cursorsCache.current = {};
    setCurrentPage(1);
  }, [activeFilter]);

  // ── Count ─────────────────────────────────────────────────────────────────
  const refreshCount = useCallback(
    async (filter) => {
      try {
        const col = collection(db, "supportRequest");
        let cq;
        if (filter === "Pending") cq = query(col, where("status", "==", false));
        else if (filter === "Resolved")
          cq = query(col, where("status", "==", true));
        else cq = col;
        const snap = await getCountFromServer(cq);
        const count = snap.data().count;
        // ✅ Both: update local state (re-render) + cache (re-visit)
        setTotalCount(count);
        queryClient.setQueryData(["support-count", filter], count);
      } catch (e) {
        console.error("Count fetch failed:", e);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    const cached = queryClient.getQueryData(countKey);
    if (cached != null) {
      setTotalCount(cached); // seed local state from cache on re-visit
    } else {
      refreshCount(activeFilter);
    }
  }, [activeFilter]);

  // ── onSnapshot → feeds useState + TanStack cache ──────────────────────────
  useEffect(() => {
    let unsub = null;

    async function attachListener() {
      try {
        const col = collection(db, "supportRequest");
        const baseQ = buildBaseQuery(col, activeFilter);
        let q;

        if (currentPage === 1) {
          q = query(baseQ, limit(PAGE_SIZE));
        } else {
          const prevKey = `${activeFilter}|${currentPage - 1}`;
          const prevCursor = cursorsCache.current[prevKey];
          if (!prevCursor) {
            setCurrentPage(1);
            return;
          }
          q = query(baseQ, startAfter(prevCursor), limit(PAGE_SIZE));
        }

        unsub = onSnapshot(
          q,
          (snapshot) => {
            const rows = snapshot.docs.map(mapDoc);
            const lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;

            cursorsCache.current[`${activeFilter}|${currentPage}`] = lastDoc;

            // ✅ Both: update local state (triggers re-render) + cache (survives routing)
            setPageData(rows);
            queryClient.setQueryData(pageKey, rows);

            refreshCount(activeFilter);
          },
          (err) => {
            console.error("onSnapshot error:", err);
            setError("Failed to load data. Check your connection.");
          },
        );
      } catch (e) {
        console.error("Listener setup error:", e);
        setError("Failed to load data.");
      }
    }

    attachListener();
    return () => {
      if (unsub) unsub();
    };
  }, [currentPage, activeFilter]);

  const isLoading = pageData.length === 0 && !error;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Resolve ───────────────────────────────────────────────────────────────
  const handleResolve = useCallback(async (row) => {
    const now = new Date();
    const resolvedAt = now.toISOString();
    const docRef = doc(db, "supportRequest", row.docId);
    await updateDoc(docRef, { status: true, resolvedAt });

    const resolvedSnap = await getDocs(
      query(
        collection(db, "supportRequest"),
        where("status", "==", true),
        orderBy("time", "asc"),
      ),
    );
    const cutoff = new Date(now.getTime() - RESOLVED_TTL_MS);
    const toDelete = resolvedSnap.docs.filter((d) => {
      const ra = d.data().resolvedAt;
      if (!ra) {
        const t = d.data().time;
        return (t?.toDate ? t.toDate() : new Date(t)) < cutoff;
      }
      return new Date(ra) < cutoff;
    });
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
    }
    // onSnapshot fires automatically → setPageData → re-render
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (!search) {
      setSearchResults(null);
      return;
    }
    async function runSearch() {
      setSearchLoading(true);
      try {
        const col = collection(db, "supportRequest");
        const q = query(buildBaseQuery(col, activeFilter), limit(200));
        const snapshot = await getDocs(q);
        const lq = search.toLowerCase();
        setSearchResults(
          snapshot.docs
            .map(mapDoc)
            .filter(
              (r) =>
                r.id.toLowerCase().includes(lq) ||
                r.name.toLowerCase().includes(lq) ||
                r.email.toLowerCase().includes(lq) ||
                r.issue.toLowerCase().includes(lq),
            ),
        );
      } catch (e) {
        console.error("Search error:", e);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }
    runSearch();
  }, [search, activeFilter]);

  // ── Display ───────────────────────────────────────────────────────────────
  const displayRows = search ? (searchResults ?? []) : pageData;
  const showingStart = search
    ? displayRows.length > 0
      ? 1
      : 0
    : (currentPage - 1) * PAGE_SIZE + 1;
  const showingEnd = search
    ? displayRows.length
    : (currentPage - 1) * PAGE_SIZE + pageData.length;
  const showingOf = search ? displayRows.length : totalCount;
  const isLoadingAny = (isLoading && !search) || searchLoading;

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

      <div className="mb-5 sm:mb-7 xl:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-gray-900 tracking-tight">
          Support Requests
        </h1>
        <p className="text-gray-500 mt-1 text-xs sm:text-sm xl:text-base">
          Manage and respond to customer inquiries
        </p>
      </div>

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
                placeholder="Search by ID, name, email or issue…"
                className="w-full pl-9 sm:pl-10 pr-8 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs sm:text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition"
              />
              {(searchInput !== search || searchLoading) && (
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
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition cursor-pointer whitespace-nowrap ${activeFilter === f ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${activeFilter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search banner */}
        {search && !searchLoading && (
          <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <p className="text-xs text-blue-600 font-medium">
              {displayRows.length === 0
                ? `No results for "${search}"`
                : `${displayRows.length} result${displayRows.length !== 1 ? "s" : ""} for "${search}"`}
            </p>
            <CircleX
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
              className="text-xs text-blue-400 hover:text-blue-600 transition cursor-pointer"
            />
          </div>
        )}

        {/* Loading */}
        {isLoadingAny && (
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

        {error && !isLoadingAny && (
          <p className="px-6 py-12 text-center text-sm text-red-400">{error}</p>
        )}

        {/* Mobile Cards */}
        {!isLoadingAny && !error && (
          <div className="block md:hidden divide-y divide-gray-50">
            {displayRows.length > 0 ? (
              displayRows.map((row) => (
                <MobileCard
                  key={row.docId}
                  row={row}
                  onDetails={setSelectedRow}
                />
              ))
            ) : (
              <p className="px-6 py-12 text-center text-sm text-gray-400">
                No requests found.
              </p>
            )}
          </div>
        )}

        {/* Desktop Table */}
        {!isLoadingAny && !error && (
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
                      className={`px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap ${i === 4 ? "hidden xl:table-cell" : ""}`}>
                      {h}
                    </th>
                  ))}
                  <th className="hidden lg:table-cell px-4 lg:px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Email
                  </th>
                  <th className="px-4 lg:px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, i) => (
                  <tr
                    key={row.docId}
                    className={`hover:bg-gray-50 transition ${i < displayRows.length - 1 ? "border-b border-gray-50" : ""}`}>
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
                    <td className="hidden lg:table-cell px-4 lg:px-6 py-4 lg:py-5 max-w-50 xl:max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs lg:text-sm text-blue-500 truncate">
                          {row.email}
                        </span>
                        {activeFilter === "Pending" && (
                          <CopyEmailBtn email={row.email} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 lg:py-5">
                      <DetailsBtn onClick={() => setSelectedRow(row)} />
                    </td>
                  </tr>
                ))}
                {displayRows.length === 0 && (
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
        {!search && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-gray-100">
            <p className="text-xs sm:text-sm text-gray-400 order-2 sm:order-1">
              {displayRows.length > 0
                ? `Showing ${showingStart}–${showingEnd} of ${showingOf} requests`
                : "No requests found"}
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
                  className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${currentPage === p ? "border-2 border-blue-600 text-blue-600 font-semibold" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
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
        )}
      </div>
    </div>
  );
}
