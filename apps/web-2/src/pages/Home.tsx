import Hero from '../components/home/Hero'
import Features from '../components/home/Features'
import HowItWorks from '../components/home/HowItWorks'
import Stats from '../components/home/Stats'
import CTA from '../components/home/CTA'
import HomeFooter from '../components/home/HomeFooter'

const Home = () => {
  return (
    <div className="w-full bg-black">
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <CTA />
      <HomeFooter />
    </div>
  )
}

export default Home
