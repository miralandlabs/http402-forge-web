/** Must load before @solana/web3.js (browser has no Node Buffer). */
import { Buffer } from "buffer";

globalThis.Buffer = Buffer;
