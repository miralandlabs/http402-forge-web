import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { VaultProvisionConfirmModal } from "./VaultProvisionConfirmModal";
import { useLocale } from "../hooks/useLocale";
import {
  activateSellerVault,
  fetchSellerStatus,
  isRpcBroadcastForbidden,
  waitForSellerVault,
  type SellerStatus,
} from "../services/sellerVault";
import { buildVaultProvisionConfirmDetails } from "../services/vaultProvisionConfirm";

interface SellerVaultGateProps {
  onStatusChange: (status: SellerStatus | null) => void;
}

export function SellerVaultGate({ onStatusChange }: SellerVaultGateProps) {
  const { msg } = useLocale();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [status, setStatus] = useState<SellerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wallet = publicKey?.toBase58();

  const provisionConfirm = useMemo(() => {
    if (!wallet) return null;
    return buildVaultProvisionConfirmDetails({
      wallet,
      rpcEndpoint: connection.rpcEndpoint,
    });
  }, [wallet, connection.rpcEndpoint]);

  const refresh = useCallback(async () => {
    if (!wallet) {
      setStatus(null);
      onStatusChange(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSellerStatus(wallet);
      setStatus(next);
      onStatusChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      onStatusChange(null);
    } finally {
      setLoading(false);
    }
  }, [wallet, onStatusChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runActivate = async () => {
    if (!wallet || !sendTransaction) return;
    setActivating(true);
    setError(null);
    try {
      await activateSellerVault({
        sellerWallet: wallet,
        connection,
        sendTransaction,
      });
      const ready = await waitForSellerVault(wallet);
      setStatus(ready);
      onStatusChange(ready);
      setConfirmOpen(false);
    } catch (e) {
      setConfirmOpen(false);
      if (isRpcBroadcastForbidden(e)) {
        setError(msg("sellerVaultRpcForbidden"));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setActivating(false);
    }
  };

  const onActivateClick = () => {
    if (!wallet) {
      setVisible(true);
      return;
    }
    if (!sendTransaction) {
      setError(msg("walletSendTxRequired"));
      return;
    }
    setError(null);
    setConfirmOpen(true);
  };

  if (!wallet) {
    return (
      <div className="card seller-vault-gate">
        <h2>{msg("sellerVaultTitle")}</h2>
        <p>{msg("sellerVaultConnectHint")}</p>
        <button type="button" className="control-btn primary" onClick={() => setVisible(true)}>
          {msg("walletConnect")}
        </button>
      </div>
    );
  }

  if (loading && !status) {
    return (
      <div className="card seller-vault-gate">
        <p>{msg("loading")}</p>
      </div>
    );
  }

  if (status?.canSell && status.vaultActivated) {
    return (
      <div className="card seller-vault-gate seller-vault-gate--ready">
        <p className="seller-vault-ready">{msg("sellerVaultReady")}</p>
      </div>
    );
  }

  if (status?.canSell && !status.vaultCheckEnforced) {
    return (
      <div className="card seller-vault-gate seller-vault-gate--dev">
        <p className="seller-vault-ready">{msg("sellerVaultDevBypass")}</p>
      </div>
    );
  }

  return (
    <>
      {provisionConfirm && (
        <VaultProvisionConfirmModal
          open={confirmOpen}
          details={provisionConfirm}
          busy={activating}
          onConfirm={() => void runActivate()}
          onCancel={() => {
            if (!activating) setConfirmOpen(false);
          }}
        />
      )}

      <div className="card seller-vault-gate">
        <h2>{msg("sellerVaultTitle")}</h2>
        <div className="seller-vault-copy">
          <p>{msg("sellerVaultBody")}</p>
          <p>{msg("sellerVaultPointFee")}</p>
          <p>{msg("sellerVaultPointListingFree")}</p>
        </div>
        {status?.protocolFeePercent && (
          <p className="seller-vault-fee meta">
            {msg("sellerVaultFeeRate")}: {status.protocolFeePercent}%
          </p>
        )}
        <div className="seller-vault-actions">
          <button
            type="button"
            className="control-btn primary"
            disabled={activating}
            onClick={onActivateClick}
          >
            {activating ? msg("sellerVaultActivating") : msg("sellerVaultActivate")}
          </button>
          {status?.sellerDashboardUrl && (
            <a
              className="control-btn"
              href={status.sellerDashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {msg("sellerVaultOpenIpay")}
            </a>
          )}
          <button
            type="button"
            className="control-btn"
            disabled={loading || activating}
            onClick={() => void refresh()}
          >
            {msg("sellerVaultRefresh")}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}
