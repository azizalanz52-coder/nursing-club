import Hero from "./components/Hero";
import About from "./components/home/About";
import LeadershipPreview from "./components/home/LeadershipPreview";
import CommitteesPreview from "./components/home/CommitteesPreview";
import EventsPreview from "./components/home/EventsPreview";
import CaseStudyCard from "./components/home/CaseStudyCard";
import WhatsAppCommunity from "./components/home/WhatsAppCommunity";
import Footer from "./components/Footer";

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <Hero />
      <About />
      <LeadershipPreview />
      <CommitteesPreview />
      <EventsPreview />
      <CaseStudyCard />
      <WhatsAppCommunity />
      <Footer />
    </main>
  );
}