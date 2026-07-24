export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        ETHGlobal · Lisbon 2026
      </p>
      <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
        Un <span className="serif-accent text-primary">agente</span> que lee la cadena
      </h1>
      <p className="text-pretty text-muted-foreground">
        Scaffold del proyecto. Idea en decisión — ver{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">MEMORIA.md</code> y{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">docs/</code>.
      </p>
    </main>
  );
}
