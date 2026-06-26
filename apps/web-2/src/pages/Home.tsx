import Hero from '../components/home/Hero'
import Features from '../components/home/Features'
import HowItWorks from '../components/home/HowItWorks'
import Stats from '../components/home/Stats'
import CTA from '../components/home/CTA'
import HomeFooter from '../components/home/HomeFooter'

const Home = () => {
  return (
    <div className="w-full bg-black">
      {/* 1 — Hero: full-screen with light rays */}
      <Hero />

      {/* 2 — Stats strip: key numbers */}
      <Stats />

      {/* 3 — Features: Scan, Fix, Review, Protect */}
      <Features />

      {/* 4 — How it works: 3-step flow */}
      <HowItWorks />

      {/* 5 — Final CTA */}
      <CTA />

      {/* Footer */}
      <HomeFooter />
    </div>
  )
}

export default Home