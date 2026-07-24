import { z } from "zod";
import { env } from "@/config/env";

/**
 * The Mirror Node REST boundary (the read half of `registry`, M4). Mirror Node is the
 * public, operator-independent read path — anyone can replay the topic without our server,
 * which is what makes the "public receipt" demo credible. No private key here (public data).
 *
 * External responses are validated with Zod at this boundary (D11); `read.ts` depends only
 * on the narrow {@link MirrorClient} interface, so it is unit-testable without the network.
 */

/** One Mirror Node topic message. `message` is base64 of our serialised topic message. */
export const mirrorMessageSchema = z.object({
  consensus_timestamp: z.string(),
  message: z.string(),
  sequence_number: z.number().int().positive(),
  topic_id: z.string(),
});
export type MirrorMessage = z.infer<typeof mirrorMessageSchema>;

const mirrorResponseSchema = z.object({
  messages: z.array(mirrorMessageSchema),
  links: z.object({ next: z.string().nullable() }).optional(),
});

export interface MirrorClient {
  /** Fetch the full ordered message history of a topic (following pagination). */
  fetchTopicMessages(topicId: string): Promise<MirrorMessage[]>;
}

const MIRROR_BASE: Record<typeof env.HEDERA_NETWORK, string> = {
  testnet: "https://testnet.mirrornode.hedera.com",
  mainnet: "https://mainnet.mirrornode.hedera.com",
};

/** Real Mirror Node client for the configured network. */
export function hederaMirrorClient(): MirrorClient {
  const base = MIRROR_BASE[env.HEDERA_NETWORK];
  return {
    async fetchTopicMessages(topicId: string) {
      const out: MirrorMessage[] = [];
      let path: string | null =
        `/api/v1/topics/${encodeURIComponent(topicId)}/messages?limit=100&order=asc`;
      while (path) {
        const res = await fetch(base + path);
        if (!res.ok) {
          throw new Error(`Mirror Node ${res.status} reading topic ${topicId}`);
        }
        const json = mirrorResponseSchema.parse(await res.json());
        out.push(...json.messages);
        path = json.links?.next ?? null;
      }
      return out;
    },
  };
}
