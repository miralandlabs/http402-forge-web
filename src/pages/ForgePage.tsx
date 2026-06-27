import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchListings, type Listing } from "../services/api";
import { LISTING_CATEGORIES } from "../constants/categories";
import { ListingCard } from "../components/ListingCard";
import { LiveSalesTicker } from "../components/LiveSalesTicker";
import { AgentToolingPanel } from "../components/AgentToolingPanel";
import { SellerWalletChip } from "../components/SellerWalletChip";
import { useLocale } from "../hooks/useLocale";
import { isSolanaWalletAddress, resolveBrowseSearch } from "../utils/browseSearch";

const FILTER_CATEGORIES = [{ id: "", labelKey: "filterAll" as const }, ...LISTING_CATEGORIES];

type SortMode = "trending" | "newest" | "price_asc" | "price_desc" | "quality";

export function ForgePage() {
  const { msg } = useLocale();
  const [searchParams] = useSearchParams();
  const sellerWallet = searchParams.get("seller_wallet")?.trim() || undefined;
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortMode>("trending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const { q, sellerWallet: searchSellerWallet } = resolveBrowseSearch(
      debouncedSearch,
      sellerWallet,
    );
    fetchListings({
      category: category || undefined,
      q,
      sellerWallet: searchSellerWallet,
      sort,
    })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setError(null);
      })
      .catch(() => setError(msg("errorLoad")))
      .finally(() => setLoading(false));
  }, [category, debouncedSearch, sellerWallet, sort, msg]);

  const effectiveSellerWallet =
    sellerWallet ??
    (isSolanaWalletAddress(debouncedSearch) ? debouncedSearch.trim() : undefined);

  const emptyMessage =
    debouncedSearch.length > 0 || effectiveSellerWallet
      ? msg("noSearchResults")
      : msg("noListings");

  return (
    <>
      <h1>{msg("browseTitle")}</h1>

      <AgentToolingPanel />

      <LiveSalesTicker sellerFilter={sellerWallet} />

      <div className="browse-toolbar">
        <input
          type="search"
          className="browse-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={msg("searchPlaceholder")}
          aria-label={msg("searchPlaceholder")}
          enterKeyHint="search"
        />
        <div className="browse-toolbar-controls">
          <div className="browse-toolbar-section browse-toolbar-section--category">
            <span className="browse-toolbar-label" id="browse-category-label">
              {msg("browseCategory")}
            </span>
            <div
              className="browse-chip-group"
              role="group"
              aria-labelledby="browse-category-label"
            >
              {FILTER_CATEGORIES.map((c) => (
                <button
                  key={c.id || "all"}
                  type="button"
                  className={`browse-chip${category === c.id ? " is-active" : ""}`}
                  onClick={() => setCategory(c.id)}
                >
                  {msg(c.labelKey)}
                </button>
              ))}
            </div>
          </div>
          <div className="browse-toolbar-section browse-toolbar-section--sort">
            <span className="browse-toolbar-label" id="browse-sort-label">
              {msg("browseSort")}
            </span>
            <div
              className="browse-chip-group browse-chip-group--compact"
              role="group"
              aria-labelledby="browse-sort-label"
            >
              <button
                type="button"
                className={`browse-chip${sort === "trending" ? " is-active" : ""}`}
                onClick={() => setSort("trending")}
              >
                {msg("sortTrending")}
              </button>
              <button
                type="button"
                className={`browse-chip${sort === "newest" ? " is-active" : ""}`}
                onClick={() => setSort("newest")}
              >
                {msg("sortNewest")}
              </button>
              <button
                type="button"
                className={`browse-chip${sort === "price_asc" ? " is-active" : ""}`}
                onClick={() => setSort("price_asc")}
              >
                {msg("sortPrice")}
              </button>
              <button
                type="button"
                className={`browse-chip${sort === "quality" ? " is-active" : ""}`}
                onClick={() => setSort("quality")}
              >
                {msg("sortQuality")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {effectiveSellerWallet && (
        <div className="seller-filter-banner">
          <SellerWalletChip wallet={effectiveSellerWallet} hideLabel />
          {sellerWallet && (
            <span className="seller-storefront-count">
              {total} {msg("sellerListings")}
            </span>
          )}
          {!sellerWallet && (
            <button
              type="button"
              className="seller-filter-clear"
              onClick={() => setSearch("")}
            >
              {msg("sellerFilterClear")}
            </button>
          )}
          {sellerWallet && (
            <Link to="/forge" className="seller-filter-clear">
              {msg("sellerFilterClear")}
            </Link>
          )}
        </div>
      )}

      {loading && <p>{msg("loading")}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && items.length === 0 && <p>{emptyMessage}</p>}
      <div className="grid forge-grid">
        {items.map((item) => (
          <ListingCard
            key={item.id}
            listing={item}
            hideSellerWallet={!!effectiveSellerWallet}
          />
        ))}
      </div>
    </>
  );
}
