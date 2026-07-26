// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, act } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { PendingRoom } from "./pending-room";

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PendingRoom (S3.26 — Mirror indexing lag)", () => {
  it("shows a live 'catching up' state while polling", () => {
    render(<PendingRoom roomId="r_1" checkExpiry={vi.fn(async () => false)} />);
    expect(screen.getByText(/network is catching up/i)).toBeInTheDocument();
  });

  it("refreshes the page the moment the expiry appears (no manual retry)", async () => {
    const checkExpiry = vi.fn(async () => false);
    render(<PendingRoom roomId="r_1" checkExpiry={checkExpiry} everyMs={1000} capMs={10_000} />);

    // First poll: still not indexed.
    await act(async () => vi.advanceTimersByTime(1000));
    await flush();
    expect(refresh).not.toHaveBeenCalled();

    // Mirror catches up; next poll finds it → refresh, no terminal message.
    checkExpiry.mockResolvedValue(true);
    await act(async () => vi.advanceTimersByTime(1000));
    await flush();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/link is stale/i)).not.toBeInTheDocument();
  });

  it("shows the terminal wrong-link message after the cap, never having refreshed", async () => {
    render(<PendingRoom roomId="r_1" checkExpiry={vi.fn(async () => false)} everyMs={1000} capMs={3000} />);
    await act(async () => vi.advanceTimersByTime(4000));
    await flush();
    expect(screen.getByText(/room id is wrong or the link is stale/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
