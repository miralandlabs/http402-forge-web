import { FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Buffer } from "buffer";
import { AgentToolingPanel } from "../components/AgentToolingPanel";
import { FileUploadPreview } from "../components/FileUploadPreview";
import { SellerVaultGate } from "../components/SellerVaultGate";
import {
  LISTING_CATEGORIES,
  MAX_ASSET_BYTES,
  MAX_PREVIEW_BYTES,
  formatBytes,
  type ListingCategoryId,
} from "../constants/categories";
import {
  createListing,
  createListingPresigned,
  fetchCapabilities,
  fetchSellerChallenge,
  type ForgeCapabilities,
} from "../services/api";
import type { SellerStatus } from "../services/sellerVault";
import { useLocale } from "../hooks/useLocale";

export function SellPage() {
  const { msg } = useLocale();
  const navigate = useNavigate();
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();
  const [title, setTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListingCategoryId>("art");
  const [price, setPrice] = useState("0.05");
  const [agentFriendly, setAgentFriendly] = useState(false);
  const [tags, setTags] = useState("");
  const [license, setLicense] = useState("");
  const [asset, setAsset] = useState<File | null>(null);
  const [preview, setPreview] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canSell, setCanSell] = useState(false);
  const [capabilities, setCapabilities] = useState<ForgeCapabilities | null>(null);

  useEffect(() => {
    fetchCapabilities().then(setCapabilities);
  }, []);

  const onVaultStatusChange = useCallback((status: SellerStatus | null) => {
    setCanSell(status?.canSell ?? false);
  }, []);

  const escrowThreshold =
    capabilities?.escrowSizeThresholdBytes ?? MAX_ASSET_BYTES;
  const assetTooLarge = asset ? asset.size > MAX_ASSET_BYTES : false;
  const assetEscrowBlocked =
    asset && capabilities?.escrowLaneEnabled === false
      ? asset.size >= escrowThreshold
      : false;
  const previewTooLarge = preview ? preview.size > MAX_PREVIEW_BYTES : false;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSell) {
      setError(msg("sellerVaultRequired"));
      return;
    }
    if (!asset) {
      setError(msg("assetRequired"));
      return;
    }
    if (assetTooLarge || previewTooLarge || assetEscrowBlocked) {
      setError(
        assetEscrowBlocked
          ? msg("escrowSizeWarning").replace("{max}", formatBytes(escrowThreshold))
          : msg("fileTooLarge"),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!publicKey) {
        setVisible(true);
        throw new Error(msg("walletConnectRequired"));
      }
      if (!signMessage) {
        throw new Error(msg("walletSignRequired"));
      }
      const wallet = publicKey.toBase58();
      const challenge = await fetchSellerChallenge(wallet);
      const challengeMessage = challenge.message.replace(/\r\n/g, "\n");
      const signature = await signMessage(
        new TextEncoder().encode(challengeMessage),
      );
      const form = new FormData();
      form.set("seller_wallet", wallet);
      form.set("seller_challenge", challengeMessage);
      form.set(
        "seller_signature",
        Buffer.from(signature).toString("base64"),
      );
      form.set("title", title);
      form.set("description", description);
      if (displayName.trim()) form.set("display_name", displayName.trim());
      form.set("category", category);
      form.set("price_usdc", price);
      form.set("agent_friendly", agentFriendly ? "true" : "false");
      if (agentFriendly && tags.trim()) form.set("tags", tags.trim());
      if (agentFriendly && license) form.set("license", license);
      form.set("asset", asset, asset.name);
      if (preview) form.set("preview", preview, preview.name);

      const caps = await fetchCapabilities();
      let listing;
      if (caps?.presignedUpload) {
        listing = await createListingPresigned({
          sellerWallet: wallet,
          sellerChallenge: challengeMessage,
          sellerSignature: Buffer.from(signature).toString("base64"),
          title,
          description,
          category,
          priceUsdc: price,
          agentFriendly,
          displayName: displayName.trim() || undefined,
          tags: agentFriendly && tags.trim() ? tags.trim() : undefined,
          license: agentFriendly && license ? license : undefined,
          asset,
          preview,
        });
      } else {
        listing = await createListing(form);
      }
      navigate(`/forge/${listing.id}`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const vaultBlocked =
        /splitvault|pr402-activated|pr402 splitvault/i.test(raw);
      setError(vaultBlocked ? msg("sellerVaultRequired") : raw);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sell-page">
      <header className="sell-header">
        <h1>{msg("sellTitle")}</h1>
        <p className="meta">{msg("sellHint")}</p>
        <p className="meta">
          <a href="/forge/manage">{msg("manageListingsTitle")}</a>
        </p>
      </header>

      <SellerVaultGate onStatusChange={onVaultStatusChange} />

      <AgentToolingPanel />

      <form
        className={`sell-form${canSell ? "" : " sell-form--locked"}`}
        onSubmit={onSubmit}
        aria-disabled={!canSell}
      >
        <fieldset
          className="sell-fieldset sell-grid"
          disabled={!canSell}
        >
          <div className="card sell-details">
            <h2>{msg("sellDetailsTitle")}</h2>

            <div className="field">
              <label htmlFor="title">{msg("fieldTitle")}</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={msg("fieldTitlePlaceholder")}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="displayName">{msg("fieldDisplayName")}</label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={msg("fieldDisplayNamePlaceholder")}
              />
            </div>

            <div className="field">
              <label htmlFor="description">{msg("fieldDescription")}</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={msg("fieldDescriptionPlaceholder")}
              />
            </div>

            <fieldset className="category-fieldset">
              <legend>{msg("fieldCategory")}</legend>
              <div className="category-grid">
                {LISTING_CATEGORIES.map((c) => (
                  <label
                    key={c.id}
                    className={`category-option${category === c.id ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={c.id}
                      checked={category === c.id}
                      onChange={() => setCategory(c.id)}
                    />
                    <span className="category-option-title">{msg(c.labelKey)}</span>
                    <span className="category-option-desc">{msg(c.descKey)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="price">{msg("fieldPrice")}</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agentFriendly}
                  onChange={(e) => setAgentFriendly(e.target.checked)}
                />
                {msg("agentFriendly")}
              </label>
            </div>

            {agentFriendly && (
              <>
                <div className="field">
                  <label htmlFor="tags">{msg("fieldTags")}</label>
                  <input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="prompt, agent, workflow"
                  />
                </div>
                <div className="field">
                  <label htmlFor="license">{msg("fieldLicense")}</label>
                  <select
                    id="license"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="personal">{msg("licensePersonal")}</option>
                    <option value="commercial">{msg("licenseCommercial")}</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="sell-uploads">
            <FileUploadPreview
              id="asset"
              label={msg("fieldAsset")}
              hint={
                capabilities?.escrowLaneEnabled === false
                  ? msg("fieldAssetHintEscrow").replace(
                      "{max}",
                      formatBytes(escrowThreshold),
                    )
                  : msg("fieldAssetHint")
              }
              file={asset}
              maxBytes={MAX_ASSET_BYTES}
              required
              emptyLabel={msg("uploadAssetEmpty")}
              clearLabel={msg("clearFile")}
              onChange={setAsset}
            />
            {assetEscrowBlocked && (
              <p className="error">
                {msg("escrowSizeWarning").replace("{max}", formatBytes(escrowThreshold))}
              </p>
            )}
            <FileUploadPreview
              id="preview"
              label={msg("fieldPreview")}
              hint={msg("fieldPreviewHint")}
              file={preview}
              maxBytes={MAX_PREVIEW_BYTES}
              emptyLabel={msg("uploadPreviewEmpty")}
              clearLabel={msg("clearFile")}
              onChange={setPreview}
            />
          </div>

          <div className="sell-actions">
            <button type="submit" className="control-btn primary" disabled={busy || !canSell}>
              {busy ? msg("loading") : msg("submitListing")}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        </fieldset>
      </form>
    </div>
  );
}
