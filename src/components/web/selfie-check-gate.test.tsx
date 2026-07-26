// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

// The widget is World's own bundle — mock it; what we test is OUR wiring: the per-room
// action string, the proof pass-through, and the gated states.
vi.mock("idkit2", () => ({
  VerificationLevel: { Device: "device", Orb: "orb" },
  IDKitWidget: ({
    action,
    onSuccess,
    children,
  }: {
    action: string;
    onSuccess: (r: unknown) => void;
    children: (args: { open: () => void }) => ReactNode;
  }) =>
    children({
      open: () =>
        onSuccess({
          merkle_root: "0xroot",
          nullifier_hash: `0xnull-${action}`,
          proof: "0xproof",
          verification_level: "device",
        }),
    }),
}));

import { SelfieCheckGate } from "./selfie-check-gate";

describe("SelfieCheckGate", () => {
  it("shows the config-gated state without WORLD_APP_ID", () => {
    render(
      <SelfieCheckGate roomId="r_1" side="A" appId={null} verified={false} onVerified={vi.fn()} />,
    );
    expect(screen.getByText(/isn’t configured yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("passes the proof up with the action scoped per ROOM, side excluded (RF-M3-001, D12)", () => {
    // The mock derives the nullifier from the action string, so this assertion is really
    // about which action the widget mounts. It must carry no side: with a per-side action
    // the same person got a valid nullifier for each seat and could hold both (D12).
    const onVerified = vi.fn();
    render(
      <SelfieCheckGate
        roomId="r_1"
        side="B"
        appId="app_demo"
        verified={false}
        onVerified={onVerified}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /run selfie check/i }));
    expect(onVerified).toHaveBeenCalledWith(
      expect.objectContaining({ nullifier_hash: "0xnull-overlap-r_1" }),
    );
  });

  it("mounts the SAME action for both sides — that is what makes the seats compete (D12)", () => {
    const seen: string[] = [];
    for (const side of ["A", "B"] as const) {
      const onVerified = vi.fn();
      const { unmount } = render(
        <SelfieCheckGate
          roomId="r_1"
          side={side}
          appId="app_demo"
          verified={false}
          onVerified={onVerified}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /run selfie check/i }));
      seen.push(onVerified.mock.calls[0]![0].nullifier_hash);
      unmount();
    }
    expect(seen[0]).toBe(seen[1]);
  });

  it("shows the reserved-seat state once verified", () => {
    render(
      <SelfieCheckGate roomId="r_1" side="A" appId="app_demo" verified onVerified={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/selfie check passed/i);
  });
});
