// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateRoomForm } from "./create-room-form";

const ok = () =>
  vi.fn(async () => ({ roomId: "r_9f3a", joinUrl: "https://seam.app/room/r_9f3a?side=B" }));

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

  it("creates a room and shows the join link on success", async () => {
    const createRoom = ok();
    render(<CreateRoomForm createRoom={createRoom} />);
    fireEvent.change(screen.getByLabelText(/deadline/i), { target: { value: "2099-01-01T00:00" } });
    fireEvent.click(screen.getByRole("button", { name: /open room/i }));
    await waitFor(() => expect(createRoom).toHaveBeenCalledTimes(1));
    expect(await screen.findByLabelText(/join link/i)).toHaveValue(
      "https://seam.app/room/r_9f3a?side=B",
    );
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
