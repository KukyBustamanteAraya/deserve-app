export default function Home() {
  return (
    <div className="w-full min-h-screen bg-white flex items-start justify-center pt-16">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-black mb-6 sm:mb-8 leading-tight font-montserrat">
          <span className="text-[#e21c21]">
            UNIFORMES
          </span>
          <br />
          <span className="text-black">PROFESIONALES</span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-12 font-montserrat">
          Diseños únicos, telas premium y entregas puntuales.
        </p>
        
        {/* Sports Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            { name: 'FÚTBOL', icon: '⚽' },
            { name: 'BÁSQUETBOL', icon: '🏀' },
            { name: 'VOLEIBOL', icon: '🏐' },
            { name: 'RUGBY', icon: '🏉' },
            { name: 'GOLF', icon: '⛳' },
            { name: 'EQUIPO', icon: '👥' }
          ].map((sport, index) => (
            <button
              key={index}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-red-500 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <div className="text-center">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {sport.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-red-600 transition-colors duration-300">
                  {sport.name}
                </h3>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
