import bannerBg from "@/assets/tezario-banner.png";
import itLogo from "@/assets/it-logo.jpg";

const Banner = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <h1 className="text-white text-2xl font-bold mb-6">TEZARIO Event Banner – Print Preview</h1>

      {/* Banner container – 5:1 aspect ratio */}
      <div className="w-full max-w-[1200px] relative" style={{ aspectRatio: "5 / 1" }}>
        {/* Background image */}
        <img
          src={bannerBg}
          alt="Tezario Banner Background"
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
        />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Top row: logos */}
          <div className="absolute top-[8%] left-[3%] w-[10%]">
            <div className="bg-white rounded-full p-1 aspect-square flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="text-[2.5vw] font-black text-[#0a1628] leading-none" style={{ fontFamily: "serif" }}>
                K
              </span>
            </div>
          </div>

          <div className="absolute top-[5%] right-[3%] w-[12%]">
            <img
              src={itLogo}
              alt="IT Department Logo"
              className="w-full h-auto rounded-lg shadow-lg shadow-cyan-500/30"
            />
          </div>

          {/* Center text */}
          <div className="text-center z-10">
            <h2
              className="font-black tracking-[0.15em] text-white drop-shadow-[0_0_30px_rgba(0,255,200,0.5)]"
              style={{ fontSize: "clamp(24px, 5vw, 72px)", fontFamily: "'Orbitron', sans-serif" }}
            >
              TEZARIO
            </h2>
            <p
              className="tracking-[0.2em] text-amber-300 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mt-1"
              style={{ fontSize: "clamp(10px, 1.8vw, 28px)", fontFamily: "'Orbitron', sans-serif" }}
            >
              NOVA FACE RECOGNITION SYSTEM
            </p>
          </div>
        </div>
      </div>

      <p className="text-gray-400 mt-6 text-sm">
        Banner: 5ft × 1ft (5:1 ratio) · Print at 300 DPI for best quality · Right-click → Save Image
      </p>

      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap"
        rel="stylesheet"
      />
    </div>
  );
};

export default Banner;
