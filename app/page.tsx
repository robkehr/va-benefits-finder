import { USMap } from "@/components/us-map";

export default function HomePage() {
  return (
    <main className="page">
      <header className="intro">
        <h1>You served. You earned these benefits. Find them.</h1>
        <p>Pick your state to start. Free, no signup, nothing stored.</p>
      </header>
      <USMap />
    </main>
  );
}
