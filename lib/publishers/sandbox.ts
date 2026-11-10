import type { Publisher } from "./types";

/** Pretend network: accepts everything, sends nothing. */
export const sandbox: Publisher = {
  async verify() {
    return { handle: "demo" };
  },
  async publish() {
    return { url: null };
  },
};
