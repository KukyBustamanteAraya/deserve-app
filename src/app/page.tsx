export default function Home() {
  return (
    <div className="w-full min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-black mb-6 sm:mb-8 leading-tight">
          <span className="text-red-500" style={{ color: '#e21c21' }}>
            Uniformes
          </span>
          <br />
          <span className="text-black">Profesionales</span>
        </h1>
        
        <p className="text-xl sm:text-2xl md:text-3xl text-gray-700 leading-relaxed">
          Diseños únicos, telas premium y entregas puntuales.
        </p>
      </div>
    </div>
  );
}
