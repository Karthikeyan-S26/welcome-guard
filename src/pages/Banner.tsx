import bannerBg from "@/assets/tezario-banner.png";
import itLogo from "@/assets/it-logo.jpg";
import kLogo from "@/assets/k-logo.png";

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

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[#0a1628]/30 rounded-lg" />

        {/* Top & bottom accent lines */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00FFD0] to-transparent rounded-t-lg" />
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00FFD0] to-transparent rounded-b-lg" />

        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Left – K Logo */}
          <div className="absolute top-[10%] left-[2.5%] w-[10%] h-[80%] flex items-center justify-center">
            <img
              src={kLogo}
              alt="Kongunadu College Logo"
              className="max-w-full max-h-full object-contain drop-shadow-[0_0_15px_rgba(0,255,200,0.3)]"
            />
          </div>

          {/* Right – IT Department Logo */}
          <div className="absolute top-[8%] right-[2.5%] w-[11%] h-[84%] flex items-center justify-center">
            <img
              src={itLogo}
              alt="IT Department Logo"
              className="max-w-full max-h-full object-contain rounded-lg drop-shadow-[0_0_15px_rgba(0,255,200,0.3)]"
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
              className="tracking-[0.2em] text-amber-300 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mt-1 font-bold"
              style={{ fontSize: "clamp(10px, 1.8vw, 28px)", fontFamily: "'Orbitron', sans-serif" }}
            >
              FACE RECOGNITION SYSTEM
            </p>
            <p
              className="text-[#99CCDD] tracking-[0.12em] mt-2"
              style={{ fontSize: "clamp(5px, 0.8vw, 11px)" }}
            >
              KONGUNADU COLLEGE OF ENGINEERING AND TECHNOLOGY &nbsp;•&nbsp; DEPARTMENT OF INFORMATION TECHNOLOGY
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
