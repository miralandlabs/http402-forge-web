import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchListings, type Listing } from "../services/api";
import { LISTING_CATEGORIES } from "../constants/categories";
import { ListingCard } from "../components/ListingCard";
import { SellerWalletChip } from "../components/SellerWalletChip";
import { useLocale } from "../hooks/useLocale";
import { isSolanaWalletAddress, resolveBrowseSearch } from "../utils/browseSearch";

const FILTER_CATEGORIES = [{ id: "", labelKey: "filterAll" as const }, ...LISTING_CATEGORIES];

export function ForgePage() {
  const { msg } = useLocale();
  const [searchParams] = useSearchParams();
  const sellerWallet = searchParams.get("seller_wallet")?.trim() || undefined;
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<Listing[]>([]);
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
    })
      .then((r) => {
        setItems(r.items);
        setError(null);
      })
      .catch(() => setError(msg("errorLoad")))
      .finally(() => setLoading(false));
  }, [category, debouncedSearch, sellerWallet, msg]);

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
        <div className="browse-filters">
          {FILTER_CATEGORIES.map((c) => (
            <button
              key={c.id || "all"}
              type="button"
              className={`control-btn${category === c.id ? " primary" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {msg(c.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {effectiveSellerWallet && (
        <div className="seller-filter-banner">
          <SellerWalletChip wallet={effectiveSellerWallet} hideLabel />
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
