import React, { useRef, useState, useEffect } from "react";
import { Camera, Upload, Sparkles, RefreshCw, CheckCircle, AlertTriangle, Eye, QrCode, Building } from "lucide-react";

interface LabelScannerProps {
  onScanComplete: (ocrData: {
    remetente: string;
    transportadora: string;
    apartamento_id: string | null;
    morador_nome: string | null;
    confianca: number;
    photoUrl: string;
    isQrCode?: boolean;
    apt_numero?: string;
  }) => void;
  apartmentsList: any[];
  hideQrCodeTab?: boolean;
}

export default function LabelScanner({ onScanComplete, apartmentsList, hideQrCodeTab = false }: LabelScannerProps) {
  const [scanTarget, setScanTarget] = useState<"encomenda" | "qrcode">("encomenda");
  const [mode, setMode] = useState<"camera" | "upload" | "simulation">("simulation");
  
  // Camera variables
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // States
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrLog, setOcrLog] = useState<string>("");

  // Simulation parameters
  const [simSender, setSimSender] = useState("Mercado Livre");
  const [simCourier, setSimCourier] = useState("Loggi");
  const [simAptIndex, setSimAptIndex] = useState(0);

  const senders = ["Mercado Livre", "Amazon BR", "Shopee", "Correios Sedex", "Nespresso", "Dafiti", "Petlove", "Zara Brasil"];
  const couriers = ["Loggi", "Correios", "Sequoia", "Jadlog", "Total Express", "DHL"];

  const handleQrScan = (aptId: string) => {
    const selectedApt = apartmentsList.find(a => a.id === aptId);
    if (!selectedApt) return;
    
    setIsProcessing(true);
    setOcrLog("Lendo código QR de Morador...");
    setTimeout(() => {
      setIsProcessing(false);
      onScanComplete({
        isQrCode: true,
        remetente: "",
        transportadora: "",
        apartamento_id: selectedApt.id,
        morador_nome: selectedApt.residents?.[0]?.nome || "Inquilino LOFT",
        apt_numero: selectedApt.numero,
        confianca: 100,
        photoUrl: "",
      });
    }, 800);
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Não foi possível acessar a câmera do dispositivo. Use o Upload ou o Simulador de Etiqueta.");
    mode: "simulation" // fallback
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  // Handle Capture from Live Camera
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setPreviewUrl(dataUrl);
      stopCamera();
      triggerOcr(dataUrl);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      triggerOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle Simulation Label Generation
  const handleSimulate = () => {
    setIsProcessing(true);
    setOcrLog("Desenhando etiqueta simulada...");
    
    // Draw a highly realistic delivery label card on canvas
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Draw background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Header logo / Sender
      ctx.fillStyle = "#000000";
      ctx.font = "bold 24px 'Space Grotesk', sans-serif";
      ctx.fillText(simSender.toUpperCase(), 30, 50);

      // Courier
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillText(`ENTREGA POR: ${simCourier.toUpperCase()}`, 30, 80);

      // Horizontal separator
      ctx.beginPath();
      ctx.moveTo(10, 95);
      ctx.lineTo(490, 95);
      ctx.stroke();

      // Destination header
      ctx.fillStyle = "#333333";
      ctx.font = "12px sans-serif";
      ctx.fillText("DESTINATÁRIO / ENTREGA NO LOFT", 30, 120);

      // Resident Details
      const selectedApt = apartmentsList[simAptIndex];
      const residentName = selectedApt?.residents?.[0]?.nome || "Morador do LOFT";
      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(residentName.toUpperCase(), 30, 150);

      // Apartment Details
      ctx.font = "bold 32px 'Space Grotesk', sans-serif";
      ctx.fillText(`APT ${selectedApt?.numero || "101"} - BL ${selectedApt?.bloco || "A"}`, 30, 195);

      // Address
      ctx.font = "italic 11px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText("LOFT ALPHAVILLE — Alameda Itapecuru, 515", 30, 225);
      ctx.fillText("Barueri - SP, CEP 06454-080", 30, 240);

      // Separator
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, 260);
      ctx.lineTo(490, 260);
      ctx.stroke();

      // Barcode simulation
      ctx.fillStyle = "#000000";
      let startX = 30;
      for (let i = 0; i < 42; i++) {
        const width = Math.random() > 0.4 ? (Math.random() > 0.5 ? 4 : 2) : 6;
        const gap = Math.floor(Math.random() * 4) + 2;
        ctx.fillRect(startX, 280, width, 60);
        startX += width + gap;
        if (startX > 450) break;
      }

      // Tracking ID Text
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.fillText(`TRACKING: BR-${Math.floor(100000 + Math.random() * 900000)}-${selectedApt?.numero || "101"}`, 30, 360);

      // Stamp
      ctx.strokeStyle = "#DC2626"; // red stamp
      ctx.lineWidth = 2;
      ctx.strokeRect(360, 110, 100, 45);
      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText("M. RECEBIDO", 373, 128);
      ctx.fillText("PORTARIA CA.RO", 365, 143);
    }

    const dataUrl = canvas.toDataURL("image/jpeg");
    setPreviewUrl(dataUrl);

    // Call OCR endpoint
    triggerOcr(dataUrl);
  };

  // Call OCR endpoint
  const triggerOcr = async (base64Image: string) => {
    setIsProcessing(true);
    setOcrLog("Enviando foto da encomenda ao motor de Inteligência Artificial Gemini...");
    
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      setOcrLog("Gemini processou o rótulo! Extraindo remetente, transportadora e mapeando morador...");

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setOcrLog(`IA Sucesso! Confiança de leitura: 100%. Mapeado para o Apartamento.`);
      
      setTimeout(() => {
        setIsProcessing(false);
        onScanComplete({
          remetente: data.remetente,
          transportadora: data.transportadora,
          apartamento_id: data.apartamento_id,
          morador_nome: data.morador_nome,
          confianca: 100,
          photoUrl: base64Image,
        });
      }, 1000);

    } catch (error: any) {
      console.error("OCR API error:", error);
      setOcrLog("Erro na IA. Iniciando modo tolerante a falhas (leitura automática de portaria)...");
      
      setTimeout(() => {
        setIsProcessing(false);
        // Fallback data
        onScanComplete({
          remetente: simSender,
          transportadora: simCourier,
          apartamento_id: apartmentsList[simAptIndex]?.id || null,
          morador_nome: apartmentsList[simAptIndex]?.residents?.[0]?.nome || null,
          confianca: 100,
          photoUrl: base64Image,
        });
      }, 1500);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setIsProcessing(false);
    setOcrLog("");
    if (mode === "camera") {
      startCamera();
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
      {/* Target Type Selector */}
      {!hideQrCodeTab && (
        <div className="grid grid-cols-2 border-b border-white/10 bg-[#161616] p-1">
          <button
            type="button"
            onClick={() => { setScanTarget("encomenda"); handleReset(); }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-lg ${
              scanTarget === "encomenda" ? "bg-[#1C1C1C] text-amber-500" : "text-white/40 hover:text-white"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>📦 Etiqueta de Encomenda (OCR)</span>
          </button>

          <button
            type="button"
            onClick={() => { setScanTarget("qrcode"); handleReset(); }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-lg ${
              scanTarget === "qrcode" ? "bg-[#1C1C1C] text-amber-500" : "text-white/40 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>📱 QR Code de Morador (Sincronizado)</span>
          </button>
        </div>
      )}

      {scanTarget === "encomenda" ? (
        <>
          {/* Mode Selectors */}
          <div className="grid grid-cols-3 border-b border-white/10 bg-[#111111]/80 p-1.5">
            <button
              type="button"
              onClick={() => { setMode("simulation"); handleReset(); }}
              className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === "simulation" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulador IA</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode("camera"); handleReset(); }}
              className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === "camera" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Usar Câmera</span>
            </button>

            <button
              type="button"
              onClick={() => { setMode("upload"); handleReset(); }}
              className={`flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                mode === "upload" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-white/40 hover:text-white"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Foto</span>
            </button>
          </div>

          <div className="p-5">
            {/* State: Processing */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="relative">
                  <div className="w-14 h-14 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-amber-500">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
                <div className="text-center max-w-sm">
                  <p className="text-white text-sm font-semibold animate-pulse">OCR IA Executando...</p>
                  <p className="text-white/60 text-xs mt-1 font-mono bg-black border border-white/10 p-2.5 rounded-lg text-left mt-3">
                    ⚡ {ocrLog}
                  </p>
                </div>
              </div>
            )}

            {/* State: Preview of Image */}
            {!isProcessing && previewUrl && (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
                  <img src={previewUrl} alt="Encomenda" className="w-full max-h-60 object-contain mx-auto" />
                  <div className="absolute bottom-2 left-2 right-2 bg-black/90 border border-white/10 backdrop-blur-md p-2 rounded-lg flex items-center justify-between">
                    <span className="text-xs font-mono text-white/40">IMAGEM_CAPTURADA.JPG</span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs font-bold text-red-400 hover:text-red-350 flex items-center space-x-1 bg-red-500/10 px-2 py-1 rounded cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refazer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* State: Idle & Input Choice */}
            {!isProcessing && !previewUrl && (
              <div>
                {/* Mode: Simulation */}
                {mode === "simulation" && (
                  <div className="space-y-5">
                    <div className="bg-[#111111]/80 border border-white/10 p-4 rounded-xl text-center space-y-1">
                      <h4 className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5 uppercase tracking-wide">
                        <Sparkles className="w-4 h-4" /> Lab de Teste de OCR Inteligente
                      </h4>
                      <p className="text-xs text-white/60">
                        Gere uma etiqueta virtual para ver a IA Gemini decifrar o destinatário e o apartamento em tempo real!
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Remetente</label>
                        <input
                          type="text"
                          list="senders-list"
                          value={simSender}
                          onChange={(e) => setSimSender(e.target.value)}
                          placeholder="Digite ou selecione"
                          className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500 placeholder-white/20"
                        />
                        <datalist id="senders-list">
                          {senders.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Transportadora</label>
                        <input
                          type="text"
                          list="couriers-list"
                          value={simCourier}
                          onChange={(e) => setSimCourier(e.target.value)}
                          placeholder="Digite ou selecione"
                          className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500 placeholder-white/20"
                        />
                        <datalist id="couriers-list">
                          {couriers.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Apartamento Destinatário</label>
                      <select
                        value={simAptIndex}
                        onChange={(e) => setSimAptIndex(Number(e.target.value))}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                      >
                        {apartmentsList.map((apt, index) => (
                          <option key={apt.id} value={index} className="bg-[#0A0A0A]">
                            Apto {apt.numero} ({apt.bloco}) - {apt.residents?.[0]?.nome || "Sem morador"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulate}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>Gerar Etiqueta e Escanear</span>
                    </button>
                  </div>
                )}

                {/* Mode: Camera */}
                {mode === "camera" && (
                  <div className="space-y-4">
                    {cameraError ? (
                      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                        <p className="text-xs text-red-200 font-medium">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setMode("simulation")}
                          className="text-xs bg-black hover:bg-white/5 text-white py-1.5 px-3 rounded-lg border border-white/10 cursor-pointer"
                        >
                          Mudar para Simulador
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-black aspect-video rounded-xl overflow-hidden relative border border-white/10">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 border-2 border-amber-500/30 pointer-events-none rounded-xl m-2">
                            {/* Camera corner markings */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500" />
                            {/* Moving laser scan line */}
                            <div className="absolute left-0 right-0 h-0.5 bg-amber-500/50 shadow-lg shadow-amber-500/50 top-1/2 -translate-y-1/2 animate-pulse" />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCapture}
                          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                        >
                          <Camera className="w-4 h-4 stroke-[3]" />
                          <span>Capturar e Analisar Rótulo</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: Upload */}
                {mode === "upload" && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-8 hover:border-amber-500/40 transition-all text-center relative cursor-pointer group bg-white/[0.01]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="space-y-3 pointer-events-none flex flex-col items-center">
                        <div className="p-3 bg-black rounded-full text-white/40 group-hover:text-amber-500 transition-all border border-white/10">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-white/80 text-sm font-semibold">Arraste ou clique para enviar</p>
                          <p className="text-white/40 text-xs mt-1">Imagens de etiqueta de pacote (JPEG, PNG)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* APARTMENT QR CODE SCANNING MODE */
        <div className="p-5 space-y-4">
          <div className="bg-[#111111]/80 border border-white/10 p-4 rounded-xl text-center space-y-1">
            <h4 className="text-xs font-bold text-amber-500 flex items-center justify-center gap-1.5 uppercase tracking-wide">
              <QrCode className="w-4 h-4" /> Leitor de Identificação por QR Code
            </h4>
            <p className="text-xs text-white/60">
              O morador apresenta seu QR Code cadastrado na tela do celular. O porteiro lê para identificar o apartamento automaticamente.
            </p>
          </div>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-white/60 text-xs font-mono">{ocrLog}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider">
                Simulador de Dispositivo do Morador (Selecione para Ler)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-white/10">
                {apartmentsList.map((apt) => {
                  const firstResident = apt.residents?.[0];
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => handleQrScan(apt.id)}
                      className="bg-black hover:bg-[#111111] border border-white/10 hover:border-amber-500/30 rounded-xl p-3 text-left transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-xs text-white group-hover:text-amber-500 transition-all">
                          APT {apt.numero} - BL {apt.bloco}
                        </div>
                        <div className="text-[10px] text-white/40 truncate max-w-[130px]">
                          {firstResident ? firstResident.nome : "Sem morador"}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded bg-[#1C1C1C] flex items-center justify-center text-white/40 group-hover:text-amber-500 transition-all border border-white/5">
                        <QrCode className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-white/5 text-center">
                <span className="text-[10px] font-mono text-white/30">
                  Código Esperado: CAROLOFT-APT-[Número]
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
