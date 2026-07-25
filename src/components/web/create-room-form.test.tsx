// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateRoomForm } from "./create-room-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const ok = () =>
  vi.fn(async () => ({
    roomId: "r_9f3a",
    joinUrl: "https://seam.app/room/r_9f3a?side=B",
    ownUrl: "https://seam.app/room/r_9f3a?side=A",
  }));

beforeEach(() => {
  push.mockClear();
});

describe("CreateRoomForm", () => {
  it("requires a deadline before submitting", async () => {
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/deadline/i);
    expect(createRoom).not.toHaveBeenCalled();
  });

  it("blocks a past deadline via the picker min (native validation stops submit)", async () => {
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    const input = screen.getByLabelText(/deadline/i);
    await waitFor(() => expect(input).toHaveAttribute("min")); // floor set to "now" after mount
    fireEvent.change(input, { target: { value: "2000-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    // Below min ⇒ invalid ⇒ the form never submits, so the action is never called.
    expect(createRoom).not.toHaveBeenCalled();
  });

  it("navigates to the room's share page instead of rendering the QR inline", async () => {
    // The old behaviour rendered RoomQr from this component's state, so a reload
    // destroyed the room's links and there was no URL to return to (S3.8).
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));

    await waitFor(() => expect(createRoom).toHaveBeenCalledTimes(1));
    // `?uc=` rides along so the share screen can label the bookmark (S3.11).
    await waitFor(() => expect(push).toHaveBeenCalledWith("/room/r_9f3a/share?uc=property"));
  });

  it("carries the picked use case on the redirect, and only there", async () => {
    // The creator's own redirect gets the type; the join link they hand over does
    // not, so forwarding it does not forward what kind of deal this is.
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.click(screen.getByRole("radio", { name: /otc trade/i }));
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/room/r_9f3a/share?uc=otc"));
    // The shared link is built server-side from the id + side only.
    expect(createRoom.mock.results[0]!.value).resolves.not.toHaveProperty("useCase");
  });

  it("stays disabled after success so a second room cannot be opened by accident", async () => {
    // Navigation is in flight; re-enabling would cost another Hedera message and
    // leave an orphan room on the topic.
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: /open|ing/i })).toBeDisabled();
  });

  it("re-enables the button when creation fails, so the user can retry", async () => {
    const createRoom = vi.fn(async () => {
      throw new Error("Hedera not configured");
    });
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open room/i })).not.toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });

  it("passes the gap opt-in choice to the action", async () => {
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    await waitFor(() =>
      expect(createRoom).toHaveBeenCalledWith(expect.any(String), true, "property"),
    );
  });

  it("defaults gap opt-in to false and the use case to property", async () => {
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    await waitFor(() =>
      expect(createRoom).toHaveBeenCalledWith(expect.any(String), false, "property"),
    );
  });

  it("passes the picked use case to the action (D16)", async () => {
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.click(screen.getByRole("radio", { name: /otc trade/i }));
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    await waitFor(() => expect(createRoom).toHaveBeenCalledWith(expect.any(String), false, "otc"));
  });

  it("surfaces an action error", async () => {
    const createRoom = vi.fn(async () => {
      throw new Error("Hedera not configured");
    });
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Hedera not configured/i);
  });
});
