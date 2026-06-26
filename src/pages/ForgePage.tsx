import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchListings, type Listing } from "../services/api";
import { LISTING_CATEGORIES } from "../constants/categories";
import { ListingCard } from "../components/ListingCard";
import { useLocale } from "../hooks/useLocale";

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
    fetchListings({
      category: category || undefined,
      q: debouncedSearch || undefined,
      sellerWallet,
    })
      .then((r) => {
        setItems(r.items);
        setError(null);
      })
      .catch(() => setError(msg("errorLoad")))
      .finally(() => setLoading(false));
  }, [category, debouncedSearch, sellerWallet, msg]);

  const emptyMessage =
    debouncedSearch.length > 0 || sellerWallet
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

      {loading && <p>{msg("loading")}</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && items.length === 0 && <p>{emptyMessage}</p>}
      <div className="grid forge-grid">
        {items.map((item) => (
          <ListingCard key={item.id} listing={item} />
        ))}
      </div>
    </>
  );
}
