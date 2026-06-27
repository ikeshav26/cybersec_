const Dashboard = () => {
  return (
    <div className="w-full min-h-screen bg-black pt-24 px-6 md:px-12 flex flex-col items-center">
      <div className="max-w-4xl w-full border border-white/10 rounded-2xl bg-white/5 backdrop-blur-md p-8 md:p-12 text-center shadow-lg mt-10">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Project Dashboard
        </h2>
        <p className="text-neutral-400 text-base max-w-md mx-auto">
          Track sprint health, active epics, and automation status in real time.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
