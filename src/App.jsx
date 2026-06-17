import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import Services from './components/Services'
import WhyUs from './components/WhyUs'
import Process from './components/Process'
import Reviews from './components/Reviews'
import Contact from './components/Contact'
import Footer from './components/Footer'

function App() {
  return (
    <div style={{ backgroundColor: '#06090F' }}>
      <Navbar />
      <Hero />
      <Marquee />
      <Services />
      <WhyUs />
      <Process />
      <Reviews />
      <Contact />
      <Footer />
    </div>
  )
}

export default App
