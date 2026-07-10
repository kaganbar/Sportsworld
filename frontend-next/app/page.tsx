import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">SportsWorld</h1>
      <p className="text-muted-foreground">
        Next.js frontend — Phase 2 scaffold. Pages/routing/3D scenes/i18n come in Phase 3.
      </p>
      <Button>shadcn/ui smoke test</Button>
    </main>
  );
}
