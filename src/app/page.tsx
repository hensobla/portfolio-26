import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import SelectedWork from "@/components/SelectedWork";
import ServicesCTA from "@/components/ServicesCTA";
import Testimonials from "@/components/Testimonials";
import ClientLogos from "@/components/ClientLogos";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      {/* Navbar is absolute-positioned over the hero */}
      <Navbar />
      <Hero />
      <About />
      <SelectedWork />
      <ServicesCTA />
      <Testimonials />
      <ClientLogos />
      <CTABanner />
      <Footer />
    </>
  );
}
