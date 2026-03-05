import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import pptxgen from "pptxgenjs";
import bannerBg from "@/assets/tezario-banner.png";
import kLogo from "@/assets/k-logo.png";
import itLogo from "@/assets/it-logo.jpg";

/** Convert an imported asset URL (or data-uri) to a base64 data string usable by pptxgenjs */
async function toBase64(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const BannerPPT = () => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [bgData, kData, itData] = await Promise.all([
        toBase64(bannerBg),
        toBase64(kLogo),
        toBase64(itLogo),
      ]);

      const pptx = new pptxgen();
      pptx.defineLayout({ name: "BANNER_5x1", width: 15, height: 3 }); // 5:1 ratio (inches)
      pptx.layout = "BANNER_5x1";

      const slide = pptx.addSlide();

      // Background image
      slide.addImage({
        data: bgData,
        x: 0,
        y: 0,
        w: 15,
        h: 3,
      });

      // Semi-transparent dark overlay for text readability
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 15,
        h: 3,
        fill: { color: "0A1628", transparency: 40 },
      });

      // Decorative top line (cyan accent)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 15,
        h: 0.04,
        fill: { color: "00FFD0" },
      });

      // Decorative bottom line (cyan accent)
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 2.96,
        w: 15,
        h: 0.04,
        fill: { color: "00FFD0" },
      });

      // Left logo – K logo
      slide.addImage({
        data: kData,
        x: 0.4,
        y: 0.4,
        w: 1.6,
        h: 2.2,
        rounding: false,
      });

      // Right logo – IT Department dragon
      slide.addImage({
        data: itData,
        x: 12.8,
        y: 0.3,
        w: 1.8,
        h: 2.4,
        rounding: false,
      });

      // Title – TEZARIO
      slide.addText("TEZARIO", {
        x: 3,
        y: 0.3,
        w: 9,
        h: 1.4,
        fontSize: 72,
        fontFace: "Arial Black",
        color: "FFFFFF",
        bold: true,
        align: "center",
        valign: "middle",
        charSpacing: 12,
        shadow: {
          type: "outer",
          blur: 20,
          color: "00FFD0",
          offset: 0,
          angle: 0,
          opacity: 0.6,
        },
      });

      // Subtitle – Face Recognition System
      slide.addText("FACE RECOGNITION SYSTEM", {
        x: 3,
        y: 1.5,
        w: 9,
        h: 0.8,
        fontSize: 28,
        fontFace: "Arial",
        color: "FFD700",
        bold: true,
        align: "center",
        valign: "middle",
        charSpacing: 8,
        shadow: {
          type: "outer",
          blur: 10,
          color: "FFD700",
          offset: 0,
          angle: 0,
          opacity: 0.4,
        },
      });

      // Bottom info text
      slide.addText("KONGUNADU COLLEGE OF ENGINEERING AND TECHNOLOGY  •  DEPARTMENT OF INFORMATION TECHNOLOGY", {
        x: 2,
        y: 2.3,
        w: 11,
        h: 0.5,
        fontSize: 12,
        fontFace: "Arial",
        color: "99CCDD",
        align: "center",
        valign: "middle",
        charSpacing: 3,
      });

      await pptx.writeFile({ fileName: "TEZARIO_Banner_5x1.pptx" });
    } catch (err) {
      console.error("PPT generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 gap-8">
      <h1 className="text-white text-2xl font-bold">TEZARIO Banner – PPT Generator</h1>

      {/* Live preview */}
      <div className="w-full max-w-[1200px] relative" style={{ aspectRatio: "5 / 1" }}>
        <img
          src={bannerBg}
          alt="Banner Background"
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-[#0a1628]/40 rounded-lg" />
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#00FFD0]" />
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#00FFD0]" />

        {/* K Logo */}
        <div className="absolute top-[10%] left-[2.5%] w-[10%] h-[75%]">
          <img src={kLogo} alt="K Logo" className="w-full h-full object-contain" />
        </div>

        {/* IT Logo */}
        <div className="absolute top-[8%] right-[2%] w-[11%] h-[80%]">
          <img src={itLogo} alt="IT Logo" className="w-full h-full object-contain rounded-lg" />
        </div>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2
            className="font-black tracking-[0.15em] text-white drop-shadow-[0_0_30px_rgba(0,255,200,0.5)]"
            style={{ fontSize: "clamp(24px, 5vw, 72px)", fontFamily: "'Arial Black', sans-serif" }}
          >
            TEZARIO
          </h2>
          <p
            className="tracking-[0.2em] text-amber-300 drop-shadow-[0_0_15px_rgba(255,215,0,0.4)] mt-1 font-bold"
            style={{ fontSize: "clamp(10px, 1.8vw, 28px)" }}
          >
            FACE RECOGNITION SYSTEM
          </p>
          <p
            className="text-[#99CCDD] tracking-[0.15em] mt-3"
            style={{ fontSize: "clamp(6px, 0.9vw, 12px)" }}
          >
            KONGUNADU COLLEGE OF ENGINEERING AND TECHNOLOGY &nbsp;•&nbsp; DEPARTMENT OF INFORMATION TECHNOLOGY
          </p>
        </div>
      </div>

      {/* Download button */}
      <Button
        onClick={handleGenerate}
        disabled={generating}
        size="lg"
        className="bg-[#00FFD0] text-black hover:bg-[#00DDC0] font-bold text-lg px-8 py-6"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating PPT…
          </>
        ) : (
          <>
            <Download className="mr-2 h-5 w-5" />
            Download Editable PPT
          </>
        )}
      </Button>

      <p className="text-gray-500 text-sm text-center max-w-lg">
        Downloads an editable PowerPoint file (5:1 ratio, 15"×3"). All text, logos, and shapes are fully editable. Print at 300 DPI for best quality.
      </p>
    </div>
  );
};

export default BannerPPT;
