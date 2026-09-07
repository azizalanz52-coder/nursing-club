import Hero from "./components/Hero";
import About from "./components/home/About";
import Statistics from "./components/home/Statistics";
import LeadershipPreview from "./components/home/LeadershipPreview";
import CommitteesPreview from "./components/home/CommitteesPreview";
import EventsPreview from "./components/home/EventsPreview";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Statistics />
      <LeadershipPreview />
      <CommitteesPreview />
      <EventsPreview />
      <Footer />
    </main>
  );
}