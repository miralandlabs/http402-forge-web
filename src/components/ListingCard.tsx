import { Link } from "react-router-dom";
import { formatUsdc, type Listing } from "../services/api";
import { LISTING_CATEGORIES } from "../constants/categories";
import { useLocale } from "../hooks/useLocale";
import { ListingCardPreview } from "./ListingCardPreview";
import { SellerWalletChip } from "./SellerWalletChip";

interface ListingCardProps {
  listing: Listing;
  hideSellerWallet?: boolean;
}

export function ListingCard({ listing, hideSellerWallet = false }: ListingCardProps) {
  const { msg } = useLocale();
  const categoryLabel =
    LISTING_CATEGORIES.find((c) => c.id === listing.category)?.labelKey ??
    null;

  return (
    <article className="card forge-card">
      <ListingCardPreview listing={listing} />
      <div className="forge-card-body">
        <h3>
          <Link to={`/forge/${listing.id}`} className="forge-card-title-link">
            {listing.title}
          </Link>
        </h3>
        <p className="meta">
          {categoryLabel ? msg(categoryLabel) : listing.category}
          {listing.verifiedFeedbackCount != null && listing.verifiedFeedbackCount > 0 && (
            <>
              {" · "}
              <span className="quality-score" title={msg("qualityTooltip")}>
                {msg("qualityFromPurchases")}: {listing.qualityScore ?? "—"} (
                {listing.verifiedFeedbackCount})
              </span>{" "}
              <Link
                to={`/forge/${listing.id}#quality-trust`}
                className="quality-learn-more"
              >
                {msg("qualityLearnMore")}
              </Link>
            </>
          )}
        </p>
        {!hideSellerWallet && (
          <p className="meta forge-card-seller">
            <SellerWalletChip wallet={listing.sellerWallet} linkToSeller subtle />
          </p>
        )}
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
