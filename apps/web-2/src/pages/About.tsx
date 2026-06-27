const About = () => {
  return (
    <div className="w-full min-h-screen bg-black pt-24 px-6 md:px-12 flex flex-col items-center">
      <div className="max-w-4xl w-full border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md p-8 md:p-12 text-center shadow-lg mt-10">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4 bg-gradient-to-r from-cyan-400 to-amber-300 bg-clip-text text-transparent">
          About Agile
        </h2>
        <p className="text-neutral-400 text-base max-w-md mx-auto">
          We are rebuilding software project coordination from the ground up using
          state-of-the-art AI agents.
        </p>
      </div>
    </div>
  )
}

export default About
