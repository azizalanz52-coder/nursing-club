import Hero from "./components/Hero";
import About from "./components/home/About";
import LeadershipPreview from "./components/home/LeadershipPreview";
import CommitteesPreview from "./components/home/CommitteesPreview";
import EventsPreview from "./components/home/EventsPreview";
import WhatsAppCommunity from "./components/home/WhatsAppCommunity";
import SuggestionBox from "./components/home/SuggestionBox";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <LeadershipPreview />
      <CommitteesPreview />
      <EventsPreview />
      <WhatsAppCommunity />
      <SuggestionBox />
      <Footer />
    </main>
  );
}