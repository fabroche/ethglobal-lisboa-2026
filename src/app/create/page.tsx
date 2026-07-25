import { CreateRoomForm } from "@/components/web/create-room-form";
import { createRoomAction } from "./actions";

export default function CreatePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Seam</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Open a <span className="serif-accent text-primary">room</span>
        </h1>
      </div>
      <CreateRoomForm createRoom={createRoomAction} />
    </main>
  );
}
