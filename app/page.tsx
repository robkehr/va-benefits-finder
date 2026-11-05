import { USMap } from "@/components/us-map";

export default function HomePage() {
  return (
    <main className="page">
      <header className="intro">
        <h1>Find the veteran benefits your state owes you</h1>
        <p>Pick your state to start. Free, no signup, nothing stored.</p>
      </header>
      <USMap />
    </main>
  );
}
