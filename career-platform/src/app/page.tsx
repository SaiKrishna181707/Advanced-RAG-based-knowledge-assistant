import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import DashboardPreview from '@/components/DashboardPreview';
import FeatureSection from '@/components/FeatureSection';
import Pricing from '@/components/Pricing';
import Testimonials from '@/components/Testimonials';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-accent/20">
      <Navbar />
      <main>
        <Hero />
        <DashboardPreview />
        <FeatureSection />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
