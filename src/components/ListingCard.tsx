import { Link } from "react-router-dom";
import { formatUsdc, type Listing } from "../services/api";
import { LISTING_CATEGORIES } from "../constants/categories";
import { useLocale } from "../hooks/useLocale";
import { ListingCardPreview } from "./ListingCardPreview";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { msg } = useLocale();
  const categoryLabel =
    LISTING_CATEGORIES.find((c) => c.id === listing.category)?.labelKey ??
    null;

  return (
    <article className="card forge-card">
      <Link
        to={`/forge/${listing.id}`}
        className="forge-card-preview-link"
        aria-label={`${msg("viewDetails")}: ${listing.title}`}
      >
        <ListingCardPreview listing={listing} />
      </Link>
      <div className="forge-card-body">
        <h3>{listing.title}</h3>
        <p className="meta">
          {categoryLabel ? msg(categoryLabel) : listing.category}
        </p>
        <p className="forge-card-desc">{listing.description.slice(0, 120)}</p>
        <p className="price">
          {msg("priceLabel")}: {formatUsdc(listing.priceMicroUsdc)} USDC
        </p>
        <Link to={`/forge/${listing.id}`}>
          <button type="button" className="control-btn primary">
            {msg("viewDetails")}
          </button>
        </Link>
      </div>
    </article>
  );
}
