// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

/**
 * S3.23 — the write screen must not offer a form to a side that already committed.
 * The commitment on the topic is binding (one per side); a blank form invites the user to
 * rewrite their whole position, pass the Selfie Check and seal, only to be rejected by the
 * seat claim at the very last step.
 */
const readSession = vi.fn();

vi.mock("@/config/env", () => ({
  env: { OG_ENCLAVE_SEAL_PUBKEY: null, WORLD_APP_ID: null },
  requireEnv: () => "0.0.12345",
}));
vi.mock("@/registry", () => ({
  createReader: () => ({ readSession }),
  hederaMirrorClient: () => ({}),
}));
vi.mock("./actions", () => ({
  submitCommitmentAction: vi.fn(),
  roomHasExpiry: vi.fn(async () => false),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import WritePage from "./page";

const EXPIRY = {
  v: 1,
  type: "expiry",
  roomId: "r_test",
  deadline: "2099-01-01T00:00:00Z",
  useCase: "property",
};

function commitmentFor(side: "A" | "B") {
  return { v: 1, type: "commitment", roomId: "r_test", side, gapOptIn: false };
}

async function renderPage(side?: string) {
  const page = await WritePage({
    params: Promise.resolve({ roomId: "r_test" }),
    searchParams: Promise.resolve({ side }),
  });
  return render(page);
}

beforeEach(() => {
  readSession.mockReset();
});

describe("WritePage — side already committed (S3.23)", () => {
  it("replaces the form with the already-sent notice and a link to the verdict", async () => {
    readSession.mockResolvedValue({
      expiry: EXPIRY,
      commitments: [commitmentFor("A")],
      verdict: undefined,
    });
    await renderPage("A");

    expect(screen.getByText(/already sent your position/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /verdict/i })).toHaveAttribute(
      "href",
      "/room/r_test/verdict",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("still offers the form to the side that has NOT committed", async () => {
    readSession.mockResolvedValue({
      expiry: EXPIRY,
      commitments: [commitmentFor("A")],
      verdict: undefined,
    });
    await renderPage("B");

    expect(screen.queryByText(/already sent your position/i)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("offers the form when nobody has committed yet", async () => {
    readSession.mockResolvedValue({ expiry: EXPIRY, commitments: [], verdict: undefined });
    await renderPage("A");

    expect(screen.queryByText(/already sent your position/i)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows the catching-up state (not the form) when the expiry isn't readable yet", async () => {
    // No readable expiry = Mirror lag on a fresh room (S3.26): the page shows the
    // auto-retrying "catching up" state, never the blank form or the already-committed view.
    readSession.mockResolvedValue({
      expiry: undefined,
      commitments: [commitmentFor("A")],
      verdict: undefined,
    });
    await renderPage("A");

    expect(screen.getByText(/network is catching up/i)).toBeInTheDocument();
    expect(screen.queryByText(/already sent your position/i)).not.toBeInTheDocument();
  });
});
