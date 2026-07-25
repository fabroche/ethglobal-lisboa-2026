/**
 * M1 · `session` — open a room, publish the deadline to Hedera HCS before anyone writes,
 * issue the join links. Public surface of the module. See `docs/modules/M1-session.md`.
 */
export {
  TOPIC_MESSAGE_VERSION,
  sideSchema,
  expiryMessageSchema,
  commitmentMessageSchema,
  verdictSchema,
  verdictMessageSchema,
  topicMessageSchema,
  buildExpiryMessage,
  buildCommitmentMessage,
  buildVerdictMessage,
  parseTopicMessage,
  type Side,
  type ExpiryMessage,
  type CommitmentMessage,
  type Verdict,
  type VerdictMessage,
  type TopicMessage,
} from "./messages";

export {
  useCaseIdSchema,
  USE_CASES,
  USE_CASE_IDS,
  getUseCase,
  type UseCaseId,
  type UseCasePreset,
} from "./usecases";

export {
  createRoomInputSchema,
  assertFutureDeadline,
  generateRoomId,
  buildJoinUrl,
  type CreateRoomInput,
  type CreateRoomInputParsed,
} from "./room";

export {
  createRoom,
  type RegistryPort,
  type CreateRoomDeps,
  type Room,
} from "./session";

export {
  consentFromCommitments,
  type GapConsent,
} from "./consent";

export {
  initCommitmentState,
  acceptCommitment,
  isRoomComplete,
  type CommitmentState,
} from "./commitments";
