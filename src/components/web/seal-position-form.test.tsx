// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { USE_CASES } from "@/session";

vi.mock("@worldcoin/idkit", () => ({
  VerificationLevel: { Device: "device" },
  IDKitWidget: ({
    onSuccess,
    children,
  }: {
    onSuccess: (r: unknown) => void;
    children: (args: { open: () => void }) => ReactNode;
  }) =>
    children({
      open: () =>
        onSuccess({
          merkle_root: "0xroot",
          nullifier_hash: "0xnull",
          proof: "0xproof",
          verification_level: "device",
        }),
    }),
}));

// Sealing itself is unit-tested in src/seal; here it's mocked so the form test stays
// deterministic and never depends on WebCrypto in jsdom.
vi.mock("@/seal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  seal: vi.fn(async () => ({
    sealedPayload: { v: 1, suite: "x25519-aesgcm", epk: "aa", ciphertext: "bb" },
    commitment: "c".repeat(64),
  })),
}));

import { SealPositionForm } from "./seal-position-form";

const PRESET = USE_CASES.property;
const KEY = "a".repeat(64);

function renderForm(over: Partial<Parameters<typeof SealPositionForm>[0]> = {}) {
  const submitCommitment = vi.fn(async () => ({ sequenceNumber: 7 }));
  render(
    <SealPositionForm
      roomId="r_1"
      side="A"
      preset={PRESET}
      enclaveSealKey={KEY}
      worldAppId="app_demo"
      submitCommitment={submitCommitment}
      {...over}
    />,
  );
  return { submitCommitment };
}

describe("SealPositionForm", () => {
  it("shows the preset placeholder and checklist — guidance never blocks (D16/DA8)", () => {
    renderForm();
    expect(screen.getByPlaceholderText(/sell below/i)).toBeInTheDocument();
    expect(screen.getByText(/consider covering/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing here is required/i)).toBeInTheDocument();
  });

  it("submits an incomplete position fine after Selfie Check (checklist is not validation)", async () => {
    const { submitCommitment } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /^position$/i }), { target: { value: "400k. that's it" } });
    fireEvent.click(screen.getByRole("button", { name: /run selfie check/i }));
    fireEvent.click(screen.getByRole("button", { name: /seal and commit/i }));
    await waitFor(() => expect(submitCommitment).toHaveBeenCalledTimes(1));
  });

  it("requires the Selfie Check before sealing (one seat per side)", () => {
    const { submitCommitment } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /^position$/i }), { target: { value: "my terms" } });
    // No proof yet — the submit button is disabled.
    expect(screen.getByRole("button", { name: /seal and commit/i })).toBeDisabled();
    expect(submitCommitment).not.toHaveBeenCalled();
  });

  it("passes this side's gap consent to the action (D9 amended)", async () => {
    const { submitCommitment } = renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /^position$/i }), { target: { value: "my terms" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /run selfie check/i }));
    fireEvent.click(screen.getByRole("button", { name: /seal and commit/i }));
    await waitFor(() =>
      expect(submitCommitment).toHaveBeenCalledWith(expect.objectContaining({ gapOptIn: true })),
    );
  });

  it("is config-gated without the enclave seal key — draft allowed, sealing locked", () => {
    renderForm({ enclaveSealKey: null });
    expect(screen.getByText(/sealing isn’t configured yet/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^position$/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /seal and commit/i })).toBeDisabled();
  });

  it("shows the sealed state with the commitment after success", async () => {
    renderForm();
    fireEvent.change(screen.getByRole("textbox", { name: /^position$/i }), { target: { value: "my terms" } });
    fireEvent.click(screen.getByRole("button", { name: /run selfie check/i }));
    fireEvent.click(screen.getByRole("button", { name: /seal and commit/i }));
    expect(await screen.findByText(/sealed and committed/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp("c".repeat(16)))).toBeInTheDocument();
  });

  it("surfaces a server rejection (e.g. seat already taken)", async () => {
    const submitCommitment = vi.fn(async () => {
      throw new Error("seat already taken for r_1/A");
    });
    render(
      <SealPositionForm
        roomId="r_1"
        side="A"
        preset={PRESET}
        enclaveSealKey={KEY}
        worldAppId="app_demo"
        submitCommitment={submitCommitment}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: /^position$/i }), { target: { value: "my terms" } });
    fireEvent.click(screen.getByRole("button", { name: /run selfie check/i }));
    fireEvent.click(screen.getByRole("button", { name: /seal and commit/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/seat already taken/i);
  });
});
