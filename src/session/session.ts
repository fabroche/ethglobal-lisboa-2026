import {
  buildExpiryMessage,
  type ExpiryMessage,
  type Side,
} from "./messages";
import {
  createRoomInputSchema,
  assertFutureDeadline,
  generateRoomId,
  buildJoinUrl,
  type CreateRoomInput,
} from "./room";
import { USE_CASES, type UseCaseId } from "./usecases";

/**
 * `session` orchestrates opening a room: validate input, publish the expiry to the HCS
 * topic BEFORE anything else, then issue the join links. It never touches the Hedera SDK
 * directly — it depends on a {@link RegistryPort} implemented by `src/registry/write`
 * (M4). This keeps the ordering invariant (expiry-before-commitment, RNF-M1-001) and the
 * "UI/domain never calls the SDK" convention honest, and makes the flow unit-testable.
 */

/** The registry write path (M4/S1.3) implements this. `publishExpiry` appends the expiry
 * message to the topic and returns its consensus sequence number. */
export interface RegistryPort {
  publishExpiry(
    message: ExpiryMessage,
  ): Promise<{ topicId: string; sequenceNumber: number }>;
}

/** Injected collaborators — real ones in production, fakes in tests. */
export interface CreateRoomDeps {
  registry: RegistryPort;
  /** Absolute base URL for join links, e.g. `https://seam.app` (from `env.APP_URL`). */
  baseUrl: string;
  /** Current time; injected so tests are deterministic. Defaults to wall clock. */
  now?: () => Date;
  /** Room id generator; injected for determinism. Defaults to `crypto.randomUUID`. */
  newRoomId?: () => string;
}

export interface Room {
  roomId: string;
  topicId: string;
  /** Consensus sequence number of the expiry message on the topic. */
  expirySeq: number;
  deadlineIso: string;
  /** D16 preset id, as recorded on the expiry message. */
  useCase: UseCaseId;
  /** Preset labels unless the input overrode them. */
  sideLabels: Record<Side, string>;
  gapOptIn: boolean;
  joinUrls: Record<Side, string>;
}

/**
 * Open a room. Order matters and is enforced here:
 *  1. validate input + deadline is in the future (throws before any side-effect),
 *  2. publish the expiry message to the topic,
 *  3. only then return the room with its join links.
 * If validation fails, `registry.publishExpiry` is never called (nothing is written).
 */
export async function createRoom(
  rawInput: CreateRoomInput,
  deps: CreateRoomDeps,
): Promise<Room> {
  const input = createRoomInputSchema.parse(rawInput);
  const now = (deps.now ?? (() => new Date()))();
  assertFutureDeadline(input.deadlineIso, now);

  const roomId = generateRoomId(deps.newRoomId ?? (() => crypto.randomUUID()));

  // Publish the clock BEFORE anyone can write a position (D4/D6, RNF-M1-001).
  const expiry = buildExpiryMessage({
    roomId,
    useCase: input.useCase,
    ...(input.about ? { about: input.about } : {}),
    deadline: input.deadlineIso,
    createdAt: now.toISOString(),
  });
  const { topicId, sequenceNumber } = await deps.registry.publishExpiry(expiry);

  return {
    roomId,
    topicId,
    expirySeq: sequenceNumber,
    deadlineIso: input.deadlineIso,
    useCase: input.useCase,
    sideLabels: input.sideLabels ?? USE_CASES[input.useCase].sideLabels,
    gapOptIn: input.gapOptIn,
    joinUrls: {
      A: buildJoinUrl(deps.baseUrl, roomId, "A"),
      B: buildJoinUrl(deps.baseUrl, roomId, "B"),
    },
  };
}
