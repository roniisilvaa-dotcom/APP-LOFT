import React, { useRef, useState, useEffect } from "react";
import { Pen, Trash2, Check, User } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string, receiverName: string, isThirdParty: boolean, thirdPartyName?: string) => void;
  onCancel: () => void;
  defaultReceiverName: string;
  residentsList: Array<{ id: string; nome: string }>;
}

export default function SignaturePad({ onSave, onCancel, defaultReceiverName, residentsList }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [receiverName, setReceiverName] = useState(defaultReceiverName);
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [thirdPartyName, setThirdPartyName] = useState("");
  const [canvasHasContent, setCanvasHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = "#F59E0B"; // Sophisticated Dark Amber stroke
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Handle drawing events for Canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if Touch event
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e.nativeEvent as any);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setCanvasHasContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e.nativeEvent as any);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHasContent(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!canvasHasContent) {
      alert("Por favor, recolha a assinatura do morador na tela.");
      return;
    }

    const finalName = isThirdParty ? thirdPartyName : receiverName;
    if (!finalName.trim()) {
      alert("Por favor, preencha o nome de quem está retirando.");
      return;
    }

    // Convert canvas content to Data URL (base64 PNG)
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl, finalName, isThirdParty, isThirdParty ? thirdPartyName : undefined);
  };

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
            <Pen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Assinatura Digital</h3>
            <p className="text-xs text-white/40">Recolha a assinatura na tela</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Toggle Third Party */}
        <div className="flex items-center justify-between bg-black p-3 rounded-xl border border-white/5">
          <span className="text-sm font-medium text-white/80">Retirado por outra pessoa (Terceiro)?</span>
          <button
            type="button"
            onClick={() => setIsThirdParty(!isThirdParty)}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
              isThirdParty ? "bg-amber-500" : "bg-[#222222]"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                isThirdParty ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Receiver input */}
        {!isThirdParty ? (
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Nome do Morador Recebedor
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <select
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full bg-black text-white border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
              >
                {residentsList.map((res) => (
                  <option key={res.id} value={res.nome} className="bg-[#0A0A0A]">
                    {res.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Nome do Terceiro Autorizado
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={thirdPartyName}
                onChange={(e) => setThirdPartyName(e.target.value)}
                placeholder="Ex: Mãe, Primo, Motoboy, João da Silva"
                className="w-full bg-black text-white border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div>
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 flex justify-between">
            <span>Desenhe a Assinatura Abaixo</span>
            {canvasHasContent && (
              <span className="text-amber-500 flex items-center gap-1 font-normal text-[11px]">
                <Check className="w-3 h-3" /> Assinando...
              </span>
            )}
          </label>
          <div className="bg-black border-2 border-dashed border-white/10 rounded-xl overflow-hidden relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-40 bg-black cursor-crosshair touch-none"
            />
            {!canvasHasContent && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/20 space-y-1">
                <Pen className="w-6 h-6 stroke-[1.5]" />
                <span className="text-xs">Assine usando o dedo ou mouse</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex-1 flex items-center justify-center space-x-2 py-3 border border-white/10 rounded-xl hover:bg-white/5 text-white/60 hover:text-white font-medium transition-all cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Limpar</span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="py-3 px-5 border border-white/10 rounded-xl hover:bg-white/5 text-white/60 font-medium transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center space-x-2 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Confirmar</span>
        </button>
      </div>
    </div>
  );
}
