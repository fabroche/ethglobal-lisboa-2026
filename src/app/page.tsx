export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        ETHGlobal · Lisbon 2026
      </p>
      <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
        One line. <span className="serif-accent text-primary">No leaks.</span>
      </h1>
      <p className="text-pretty text-muted-foreground">
        Sealed two-party negotiation. Scaffold in progress — see{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">docs/</code> and{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">docs/backlog.md</code>.
      </p>
    </main>
  );
}
