import { useEffect, useRef } from "react";
import { API_BASE } from "../services/api";

export interface ForgeSaleEvent {
  listingId: string;
  sellerWallet: string;
  buyerWallet: string;
  amountMicroUsdc: number;
}

function parseSaleEvent(raw: unknown): ForgeSaleEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const listingId = String(o.listing_id ?? o.listingId ?? "");
  const buyerWallet = String(o.buyer_wallet ?? o.buyerWallet ?? "");
  const sellerWallet = String(o.seller_wallet ?? o.sellerWallet ?? "");
  const amount = Number(o.amount_micro_usdc ?? o.amountMicroUsdc ?? 0);
  if (!listingId || !buyerWallet) return null;
  return { listingId, buyerWallet, sellerWallet, amountMicroUsdc: amount };
}

export function useForgeEvents(onSale: (sale: ForgeSaleEvent) => void) {
  const handlerRef = useRef(onSale);
  handlerRef.current = onSale;

  useEffect(() => {
    const eventsUrl = `${API_BASE || ""}/api/v1/events`;
    const source = new EventSource(eventsUrl);
    source.addEventListener("sale", (ev) => {
      try {
        const sale = parseSaleEvent(JSON.parse(ev.data));
        if (sale) handlerRef.current(sale);
      } catch {
        /* ignore malformed events */
      }
    });
    return () => source.close();
  }, []);
}
