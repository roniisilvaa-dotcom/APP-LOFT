import React, { useState, useEffect } from "react";
import {
  Search,
  Building,
  Clock,
  CheckCircle,
  QrCode,
  Bell,
  Smartphone,
  Laptop,
  ChevronRight,
  User,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  AlertTriangle,
  Plus,
  ArrowRight,
  Check,
  Send,
  UserCheck,
  ShieldCheck,
  X,
  SmartphoneIcon,
  Terminal,
  Settings,
  Database,
  Trash2,
  Edit3,
  Save,
  Users,
  Lock,
  Code,
  Copy,
  Home,
  Box,
  Key,
  Calendar,
  Megaphone,
  UserPlus,
  Shield,
  Dumbbell,
  Menu,
  Sparkles,
  DollarSign,
  Coffee
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import SignaturePad from "./components/SignaturePad";
import LabelScanner from "./components/LabelScanner";
import { Apartment, Delivery, Resident, Porteiro } from "./types";

// Helper to generate a high-fidelity digital receipt badge for QR-code authenticated handovers
const generateQrCodeBadgeImage = (residentName: string, aptNumber: string, blocNumber: string, porteiroName: string): string => {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    // Fill deep dark background to match the cool theme
    ctx.fillStyle = "#0A0A0A";
    ctx.fillRect(0, 0, 400, 200);

    // Draw border
    ctx.strokeStyle = "#10B981"; // Emerald green for security
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 384, 184);

    // Subtle emerald glow fill
    ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
    ctx.fillRect(10, 10, 380, 180);

    // Draw Success Circle Badge
    ctx.fillStyle = "#10B981";
    ctx.beginPath();
    ctx.arc(45, 45, 16, 0, Math.PI * 2);
    ctx.fill();

    // Checkmark inside circle
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(38, 45);
    ctx.lineTo(43, 50);
    ctx.lineTo(52, 40);
    ctx.stroke();

    // Text: Header
    ctx.fillStyle = "#10B981";
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("AUTENTICADO VIA QR CODE", 75, 40);

    ctx.fillStyle = "#888888";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillText("Entrega Validada e Liberada por Handshake QR", 75, 55);

    // Details separator line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, 75);
    ctx.lineTo(375, 75);
    ctx.stroke();

    // Details Text
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Unidade: APT ${aptNumber} (Bloco ${blocNumber})`, 25, 98);
    
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Recebido por: ${residentName}`, 25, 120);

    ctx.fillStyle = "#888888";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    ctx.fillText(`Portaria: ${porteiroName}`, 25, 144);

    ctx.fillStyle = "#666666";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText(`DATA/HORA RETIRADA: ${new Date().toLocaleString("pt-BR")}`, 25, 166);
    
    ctx.fillStyle = "#10B981";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillText("✓ SEGURO", 320, 166);
  }
  return canvas.toDataURL("image/png");
};

export default function App() {
  // Application Roles
  const [activeRole, setActiveRole] = useState<"porteiro" | "morador">("porteiro");
  const [currentTab, setCurrentTab] = useState<"portaria" | "apartamentos" | "porteiros" | "adm" | "desenvolvedor">("portaria");

  // Database States
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [porteiros, setPorteiros] = useState<Porteiro[]>([]);
  const [selectedPorteiro, setSelectedPorteiro] = useState<string>("");

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Search & Filter Portaria States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"todos" | "pendentes" | "atrasados" | "entregues">("todos");

  // Multi-criteria filter states (Calendars, Day, Hour)
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterHourSlot, setFilterHourSlot] = useState<string>("todos"); // "todos" | "manha" | "tarde" | "noite"
  const [filterApartment, setFilterApartment] = useState<string>("todos");

  // Export reports state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportPeriod, setExportPeriod] = useState<string>("mes"); // "semana" | "mes" | "ano" | "todos"
  const [exportApt, setExportApt] = useState<string>("todos");
  const [exportedContent, setExportedContent] = useState<string | null>(null);

  // Selected delivery for signature (delivery dispatch)
  const [deliveryToHandover, setDeliveryToHandover] = useState<Delivery | null>(null);
  const [handoverMethod, setHandoverMethod] = useState<"select" | "signature" | "qrcode">("select");
  const [scannedResident, setScannedResident] = useState<Resident | null>(null);

  // Active Morador Profile (for testing notification loop)
  const [selectedResidentId, setSelectedResidentId] = useState<string>("");
  const [moradorQRModal, setMoradorQRModal] = useState<boolean>(false);
  const [viewSignatureDelivery, setViewSignatureDelivery] = useState<Delivery | null>(null);

  // Floating WhatsApp Simulated Message
  const [activeNotificationToast, setActiveNotificationToast] = useState<{
    id: string;
    residentName: string;
    phone: string;
    sender: string;
    courier: string;
    photoUrl?: string;
    type: "new" | "reminder";
  } | null>(null);

  // Register Form State (New Delivery)
  const [newDeliveryStep, setNewDeliveryStep] = useState<1 | 2>(1);
  const [newDeliveryData, setNewDeliveryData] = useState<{
    apartamento_id: string;
    remetente: string;
    transportadora: string;
    foto_url: string;
    confidence?: number;
    urgente?: boolean;
    entregador_nome?: string;
  }>({
    apartamento_id: "",
    remetente: "",
    transportadora: "",
    foto_url: "",
    urgente: false,
    entregador_nome: "",
  });

  // New Porteiro (Doorman) Modal states
  const [showNewPorteiroModal, setShowNewPorteiroModal] = useState(false);
  const [newPorteiroData, setNewPorteiroData] = useState({
    nome: "",
    telefone: "",
    turno: "Diurno",
  });

  // State variables for the fully-structured LOFT Alphaville Resident App Simulator
  const [residentAppTab, setResidentAppTab] = useState<"home" | "encomendas" | "lavanderia" | "academia" | "reservas" | "acesso" | "mural">("home");
  
  // Laundry Physical Token & Requests States (Allowance: 4 per week)
  const [laundryRequests, setLaundryRequests] = useState<Array<{
    id: string;
    residentName: string;
    apt: string;
    bloc: string;
    qty: number;
    status: "pendente" | "aprovado" | "entregue" | "cancelado";
    date: string;
  }>>([
    { id: "req-1", residentName: "Mariana Silva", apt: "204", bloc: "A", qty: 2, status: "entregue", date: "Ontem" },
    { id: "req-2", residentName: "Daniel Souza", apt: "115", bloc: "B", qty: 1, status: "pendente", date: "Hoje às 10:30" }
  ]);

  // Gym (Academia) States
  const [gymIssues, setGymIssues] = useState<Array<{
    id: string;
    equipamento: string;
    descricao: string;
    morador: string;
    data: string;
    status: "pendente" | "resolvido";
  }>>([
    { id: "issue-1", equipamento: "Esteira 2", descricao: "A inclinação não está funcionando.", morador: "Thiago Apto 804", data: "Ontem", status: "pendente" }
  ]);

  const [residentReservations, setResidentReservations] = useState<Array<{
    id: string;
    amenity: string;
    date: string;
    slot: string;
    status: "confirmado" | "pendente";
  }>>([
    { id: "res-1", amenity: "Espaço Gourmet", date: "Hoje", slot: "18:00 - 22:00", status: "confirmado" },
    { id: "res-2", amenity: "Salão de Festas", date: "Amanhã", slot: "14:00 - 22:00", status: "confirmado" }
  ]);
  const [newReservationAmenity, setNewReservationAmenity] = useState<string>("Espaço Gourmet");
  const [newReservationDate, setNewReservationDate] = useState<string>("");
  const [newReservationSlot, setNewReservationSlot] = useState<string>("09:00 - 11:00");

  const [guestPasses, setGuestPasses] = useState<Array<{
    id: string;
    name: string;
    cpf: string;
    date: string;
    status: "ativo" | "expirado";
  }>>([
    { id: "guest-1", name: "Carlos Eduardo Costa", cpf: "123.456.789-00", date: "Hoje (27/06)", status: "ativo" }
  ]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestCpf, setNewGuestCpf] = useState("");
  const [newGuestDate, setNewGuestDate] = useState("");

  const [muralPosts, setMuralPosts] = useState<Array<{
    id: string;
    author: string;
    apartment: string;
    content: string;
    date: string;
    likes: number;
    hasLiked?: boolean;
  }>>([
    {
      id: "post-1",
      author: "Juliana Mendes",
      apartment: "Apto 302 - Bloco B",
      content: "Alguém indica uma boa diarista que atenda aqui em Alphaville quinzenalmente?",
      date: "Ontem às 15:40",
      likes: 4,
      hasLiked: false
    },
    {
      id: "post-2",
      author: "Marcos Ribeiro",
      apartment: "Apto 201 - Bloco A",
      content: "Alugo vaga de garagem extra para carro de passeio. Interessados me chamem no privado.",
      date: "Ontem às 10:15",
      likes: 2,
      hasLiked: false
    },
    {
      id: "post-3",
      author: "Administração do LOFT",
      apartment: "Condomínio",
      content: "📢 Comunicado Importante: No dia 30/06 faremos a manutenção semestral do gerador de energia das 14h às 16h.",
      date: "25 Jun às 09:00",
      likes: 8,
      hasLiked: false
    }
  ]);
  const [newPostContent, setNewPostContent] = useState("");


  // State variables for CRUD of Apartments, Residents, and Porteiros
  const [showAptModal, setShowAptModal] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);
  const [aptForm, setAptForm] = useState({ numero: "", bloco: "", qr_code: "" });

  const [showResidentModal, setShowResidentModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [residentForm, setResidentForm] = useState({ nome: "", telefone: "", email: "", apartamento_id: "" });

  const [editingPorteiro, setEditingPorteiro] = useState<Porteiro | null>(null);
  const [porteiroForm, setPorteiroForm] = useState({ nome: "", telefone: "", turno: "Diurno" });

  // Developer panel raw JSON state
  const [rawDbText, setRawDbText] = useState("");
  const [dbSaving, setDbSaving] = useState(false);
  const [developerLog, setDeveloperLog] = useState<string[]>(["Sessão iniciada como Administrador Desenvolvedor."]);

  // Fetch all core database records from Node backend
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [aptsRes, delivsRes, portRes] = await Promise.all([
        fetch("/api/apartments"),
        fetch("/api/deliveries"),
        fetch("/api/porteiros"),
      ]);

      const apts = await aptsRes.json();
      const delivs = await delivsRes.json();
      const ports = await portRes.json();

      setApartments(apts);
      setDeliveries(delivs);
      setPorteiros(ports);

      if (ports.length > 0 && !selectedPorteiro) {
        setSelectedPorteiro(ports[0].id);
      }

      // Default the morador profile testing to the first resident
      if (apts.length > 0 && apts[0].residents && apts[0].residents.length > 0 && !selectedResidentId) {
        setSelectedResidentId(apts[0].residents[0].id);
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Failed to load backend resources:", error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time synchronization poll (every 5 seconds)
    const interval = setInterval(async () => {
      try {
        const [aptsRes, delivsRes] = await Promise.all([
          fetch("/api/apartments"),
          fetch("/api/deliveries")
        ]);
        if (aptsRes.ok && delivsRes.ok) {
          const apts = await aptsRes.json();
          const delivs = await delivsRes.json();
          setApartments(apts);
          setDeliveries(delivs);
        }
      } catch (err) {
        console.warn("Polled sync paused/failed (likely connection temporary down):", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Filter deliveries based on portaria search, filters, calendars and hours
  const filteredDeliveries = deliveries.filter((del) => {
    const residentMatch = del.residents?.some((r) =>
      r.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const aptMatch = del.apartment?.numero.includes(searchQuery) || del.apartment?.bloco.toLowerCase().includes(searchQuery.toLowerCase());
    const senderMatch = del.remetente.toLowerCase().includes(searchQuery.toLowerCase());
    const courierMatch = del.transportadora.toLowerCase().includes(searchQuery.toLowerCase());

    const queryMatches = residentMatch || aptMatch || senderMatch || courierMatch;

    if (!queryMatches) return false;

    // Active status filters
    if (activeFilter === "pendentes" && del.status !== "AGUARDANDO") {
      return false;
    }

    if (activeFilter === "atrasados") {
      const daysSinceCreation = (Date.now() - new Date(del.criado_em).getTime()) / (1000 * 60 * 60 * 24);
      if (!(del.status === "AGUARDANDO" && daysSinceCreation >= 2)) return false;
    }

    if (activeFilter === "entregues" && del.status !== "ENTREGUE") {
      return false;
    }

    // Calendar Date Filters
    if (filterStartDate) {
      const startMs = new Date(filterStartDate + "T00:00:00").getTime();
      const delMs = new Date(del.criado_em).getTime();
      if (delMs < startMs) return false;
    }

    if (filterEndDate) {
      const endMs = new Date(filterEndDate + "T23:59:59").getTime();
      const delMs = new Date(del.criado_em).getTime();
      if (delMs > endMs) return false;
    }

    // Hour Slot Filter
    if (filterHourSlot !== "todos") {
      const delHour = new Date(del.criado_em).getHours();
      if (filterHourSlot === "manha") {
        if (delHour < 6 || delHour >= 12) return false;
      } else if (filterHourSlot === "tarde") {
        if (delHour < 12 || delHour >= 18) return false;
      } else if (filterHourSlot === "noite") {
        if (delHour < 18 && delHour >= 6) return false;
      }
    }

    // Apartment Specific Filter
    if (filterApartment !== "todos" && del.apartamento_id !== filterApartment) {
      return false;
    }

    return true;
  });

  // Current active resident details (for Resident App simulator)
  const activeResident = apartments
    .flatMap((apt) => apt.residents || [])
    .find((r) => r.id === selectedResidentId);

  const activeResidentApartment = apartments.find(
    (apt) => apt.id === activeResident?.apartamento_id
  );

  // Deliveries associated with the logged-in resident
  const residentDeliveries = deliveries.filter(
    (del) => del.apartamento_id === activeResident?.apartamento_id
  );

  // Handle Scan OCR label complete
  const handleOcrComplete = (data: {
    remetente: string;
    transportadora: string;
    apartamento_id: string | null;
    morador_nome: string | null;
    confianca: number;
    photoUrl: string;
  }) => {
    setNewDeliveryData({
      apartamento_id: data.apartamento_id || "",
      remetente: data.remetente || "Encomenda",
      transportadora: data.transportadora || "Geral",
      foto_url: data.photoUrl,
      confidence: 100,
      urgente: false,
      entregador_nome: "",
    });
    setNewDeliveryStep(2);
  };

  // Submit delivery registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeliveryData.apartamento_id) {
      alert("Por favor, selecione o apartamento correspondente.");
      return;
    }

    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apartamento_id: newDeliveryData.apartamento_id,
          porteiro_id: selectedPorteiro,
          foto_url: newDeliveryData.foto_url,
          remetente: newDeliveryData.remetente || "Encomenda",
          transportadora: newDeliveryData.transportadora || "Geral",
          urgente: !!newDeliveryData.urgente,
          entregador_nome: newDeliveryData.entregador_nome || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao registrar encomenda");
      }

      const created = await response.json();
      
      // Update local deliveries list
      setDeliveries((prev) => [created, ...prev]);

      // Trigger Simulated WhatsApp Alert immediately
      const apt = apartments.find((a) => a.id === newDeliveryData.apartamento_id);
      const mainResident = apt?.residents?.[0];
      
      if (mainResident) {
        setActiveNotificationToast({
          id: `toast-${Date.now()}`,
          residentName: mainResident.nome,
          phone: mainResident.telefone,
          sender: newDeliveryData.remetente || "Encomenda",
          courier: newDeliveryData.transportadora || "Geral",
          photoUrl: newDeliveryData.foto_url,
          type: "new",
        });
      }

      // Reset Form Steps
      setNewDeliveryStep(1);
      setNewDeliveryData({
        apartamento_id: "",
        remetente: "",
        transportadora: "",
        foto_url: "",
        urgente: false,
        entregador_nome: "",
      });

      // Clear toast after 8 seconds
      setTimeout(() => {
        setActiveNotificationToast(null);
      }, 9000);

    } catch (err) {
      console.error(err);
      alert("Falha ao salvar encomenda no backend.");
    }
  };

  // Generate the last 7 days metrics for Recharts
  const getWeeklyStatsData = () => {
    const data = [];
    const daysName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    // Last 7 days counting back
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toDateString();
      
      const count = deliveries.filter((del) => {
        const delDate = new Date(del.criado_em);
        return delDate.toDateString() === dateString;
      }).length;

      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      data.push({
        label: `${daysName[d.getDay()]} (${dayLabel})`,
        "Entregas": count,
      });
    }
    return data;
  };

  // Generate customized spreadsheet-ready CSV data
  const handleGenerateReport = () => {
    const now = new Date();
    const exportList = deliveries.filter((del) => {
      // 1. Apartment Filter
      if (exportApt !== "todos" && del.apartamento_id !== exportApt) {
        return false;
      }

      // 2. Period filter
      const delDate = new Date(del.criado_em);
      const diffTime = Math.abs(now.getTime() - delDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (exportPeriod === "semana" && diffDays > 7) return false;
      if (exportPeriod === "mes" && diffDays > 30) return false;
      if (exportPeriod === "ano" && diffDays > 365) return false;

      return true;
    });

    const headers = [
      "ID da Encomenda",
      "Apartamento",
      "Bloco",
      "Destinatário",
      "Remetente",
      "Transportadora",
      "Data Registro",
      "Status",
      "Entregue em",
      "Quem Recebeu",
      "Assinatura (URL)"
    ];

    const rows = exportList.map((del) => {
      const apt = apartments.find((a) => a.id === del.apartamento_id);
      const mainRes = apt?.residents?.[0]?.nome || "Sem morador";
      return [
        del.id,
        apt?.numero || "N/A",
        apt?.bloco || "N/A",
        mainRes,
        del.remetente,
        del.transportadora,
        new Date(del.criado_em).toLocaleString("pt-BR"),
        del.status,
        del.entregue_em ? new Date(del.entregue_em).toLocaleString("pt-BR") : "Pendente",
        del.recebido_por || "N/A",
        del.assinatura_url ? "Disponivel (Ver Detalhes)" : "Nenhum"
      ];
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    setExportedContent(csvContent);
  };

  // Deliver/Handover confirmation (collect signature)
  const handleSignatureHandover = async (
    signatureDataUrl: string,
    receiverName: string,
    isThirdParty: boolean
  ) => {
    if (!deliveryToHandover) return;

    try {
      const response = await fetch(`/api/deliveries/${deliveryToHandover.id}/deliver`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assinatura_url: signatureDataUrl,
          assinado_por: receiverName,
          autorizado_terceiro: isThirdParty,
          autorizado_terceiro_nome: isThirdParty ? receiverName : "",
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao registrar entrega");
      }

      // Refresh database to keep in sync
      await fetchData();
      setDeliveryToHandover(null);

    } catch (err) {
      console.error(err);
      alert("Erro ao realizar entrega da encomenda.");
    }
  };

  // Resend automatic reminder for stale packages (+2 days)
  const handleSendReminder = async (deliveryId: string) => {
    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/remind`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Falha ao reenviar lembrete");
      }

      const resJson = await response.json();
      
      // Show automated reminder WhatsApp bubble
      const del = deliveries.find((d) => d.id === deliveryId);
      const apt = apartments.find((a) => a.id === del?.apartamento_id);
      const mainResident = apt?.residents?.[0];

      if (mainResident && del) {
        setActiveNotificationToast({
          id: `toast-${Date.now()}`,
          residentName: mainResident.nome,
          phone: mainResident.telefone,
          sender: del.remetente,
          courier: del.transportadora,
          photoUrl: del.foto_url,
          type: "reminder",
        });
      }

      alert(resJson.message);

      // Auto clear reminder toast
      setTimeout(() => {
        setActiveNotificationToast(null);
      }, 9000);

    } catch (err) {
      console.error(err);
      alert("Erro ao enviar notificação de cobrança.");
    }
  };

  // Authorize third-party on resident side
  const handleAuthorizeThirdParty = async (deliveryId: string, name: string) => {
    if (!name.trim()) return;

    try {
      const response = await fetch(`/api/deliveries/${deliveryId}/authorize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terceiro_nome: name }),
      });

      if (!response.ok) throw new Error();

      // Refresh list
      await fetchData();
      alert(`Retirada por ${name} autorizada com sucesso!`);

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar autorização.");
    }
  };

  // Approve physical laundry token request (Portaria side)
  const handleApproveLaundryRequest = (requestId: string) => {
    const req = laundryRequests.find(r => r.id === requestId);
    if (!req) return;

    setLaundryRequests(laundryRequests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: "aprovado" };
      }
      return r;
    }));

    alert(`Sucesso! Solicitação de ${req.qty} fichas para a Unidade ${req.apt} foi APROVADA. O morador pode vir retirá-las fisicamente na portaria.`);
  };

  // Mark physical laundry tokens as handed over (Portaria side)
  const handleDeliverLaundryTokens = (requestId: string) => {
    const req = laundryRequests.find(r => r.id === requestId);
    if (!req) return;

    setLaundryRequests(laundryRequests.map(r => {
      if (r.id === requestId) {
        return { ...r, status: "entregue" };
      }
      return r;
    }));

    alert(`Entrega de ${req.qty} fichas físicas registrada com sucesso para a Unidade ${req.apt}!`);
  };

  // Register a new doorman (porteiro)
  const handleCreatePorteiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPorteiroData.nome.trim() || !newPorteiroData.turno) {
      alert("Por favor, preencha o nome e selecione o turno.");
      return;
    }

    try {
      const response = await fetch("/api/porteiros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPorteiroData),
      });

      if (!response.ok) {
        throw new Error("Erro ao cadastrar porteiro");
      }

      const created = await response.json();
      
      // Update local porteiros state
      setPorteiros((prev) => [...prev, created]);
      
      // Select the newly registered doorman as active
      setSelectedPorteiro(created.id);
      
      // Reset form & close modal
      setNewPorteiroData({ nome: "", telefone: "", turno: "Diurno" });
      setShowNewPorteiroModal(false);
      
      alert(`Porteiro ${created.nome} cadastrado com sucesso e definido como ativo!`);
    } catch (err) {
      console.error(err);
      alert("Falha ao registrar novo porteiro.");
    }
  };

  // ==========================================
  // APARTMENT CRUD OPERATIONS
  // ==========================================
  const handleSaveApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aptForm.numero.trim() || !aptForm.bloco.trim()) {
      alert("Por favor, preencha número e bloco do apartamento.");
      return;
    }

    try {
      const url = editingApt ? `/api/apartments/${editingApt.id}` : "/api/apartments";
      const method = editingApt ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: aptForm.numero,
          bloco: aptForm.bloco,
          qr_code: aptForm.qr_code || undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha na operação");
      }

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Apartamento ${aptForm.numero} (${aptForm.bloco}) ${editingApt ? "atualizado" : "criado"}.`,
        ...prev
      ]);

      await fetchData();
      setShowAptModal(false);
      setEditingApt(null);
      setAptForm({ numero: "", bloco: "", qr_code: "" });
      alert(`Apartamento ${editingApt ? "atualizado" : "cadastrado"} com sucesso!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao salvar apartamento.");
    }
  };

  const handleDeleteApartment = async (id: string, label: string) => {
    if (!confirm(`Tem certeza de que deseja remover o Apartamento ${label}? Todos os moradores vinculados também serão removidos!`)) {
      return;
    }

    try {
      const response = await fetch(`/api/apartments/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erro ao excluir");

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Apartamento ID ${id} removido do sistema.`,
        ...prev
      ]);

      await fetchData();
      alert("Apartamento removido com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Falha ao excluir apartamento.");
    }
  };

  // ==========================================
  // RESIDENT (MORADOR) CRUD OPERATIONS
  // ==========================================
  const handleSaveResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentForm.nome.trim() || !residentForm.apartamento_id) {
      alert("Por favor, preencha o nome e selecione o apartamento correspondente.");
      return;
    }

    try {
      const url = editingResident ? `/api/residents/${editingResident.id}` : "/api/residents";
      const method = editingResident ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(residentForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Falha ao salvar morador");
      }

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Morador "${residentForm.nome}" ${editingResident ? "atualizado" : "cadastrado"}.`,
        ...prev
      ]);

      await fetchData();
      setShowResidentModal(false);
      setEditingResident(null);
      setResidentForm({ nome: "", telefone: "", email: "", apartamento_id: "" });
      alert(`Morador ${editingResident ? "atualizado" : "cadastrado"} com sucesso!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao salvar morador.");
    }
  };

  const handleDeleteResident = async (id: string, name: string) => {
    if (!confirm(`Tem certeza de que deseja remover o morador ${name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/residents/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erro ao excluir");

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Morador ID ${id} (${name}) removido do sistema.`,
        ...prev
      ]);

      await fetchData();
      alert("Morador removido com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Falha ao excluir morador.");
    }
  };

  // ==========================================
  // PORTEIRO EDIT & DELETE OPERATIONS
  // ==========================================
  const handleSavePorteiroEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPorteiro) return;
    if (!porteiroForm.nome.trim()) {
      alert("Nome do porteiro é obrigatório.");
      return;
    }

    try {
      const response = await fetch(`/api/porteiros/${editingPorteiro.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(porteiroForm)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao salvar alterações");

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Porteiro "${porteiroForm.nome}" atualizado.`,
        ...prev
      ]);

      await fetchData();
      setEditingPorteiro(null);
      alert("Dados do porteiro atualizados com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Falha ao atualizar dados do porteiro.");
    }
  };

  const handleDeletePorteiro = async (id: string, name: string) => {
    if (porteiros.length <= 1) {
      alert("Não é possível remover todos os porteiros do sistema. Deve existir pelo menos um porteiro registrado.");
      return;
    }
    if (!confirm(`Tem certeza de que deseja remover o porteiro ${name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/porteiros/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erro ao excluir");

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Porteiro ID ${id} (${name}) removido.`,
        ...prev
      ]);

      // If we deleted the active porteiro, auto select another
      if (selectedPorteiro === id) {
        const remaining = porteiros.filter((p) => p.id !== id);
        if (remaining.length > 0) {
          setSelectedPorteiro(remaining[0].id);
        }
      }

      await fetchData();
      alert("Porteiro removido com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Falha ao excluir porteiro.");
    }
  };

  // ==========================================
  // DEVELOPER DATABASE BACKEND HANDLERS
  // ==========================================
  const handleLoadDevDb = async () => {
    try {
      const response = await fetch("/api/dev/db");
      const dbObj = await response.json();
      setRawDbText(JSON.stringify(dbObj, null, 2));
      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Banco de dados bruto lido com sucesso.`,
        ...prev
      ]);
    } catch (err) {
      console.error(err);
      alert("Falha ao ler o banco de dados.");
    }
  };

  const handleSaveDevDb = async () => {
    if (!rawDbText.trim()) return;
    try {
      setDbSaving(true);
      // Validate JSON syntax first
      const parsed = JSON.parse(rawDbText);
      
      const response = await fetch("/api/dev/db/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao salvar");

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Alterações brutas persistidas com sucesso no db.json.`,
        ...prev
      ]);

      await fetchData();
      alert("Banco de dados atualizado e persistido com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(`JSON Inválido ou erro de persistência: ${err.message}`);
    } finally {
      setDbSaving(false);
    }
  };

  const handleResetDevDb = async () => {
    if (!confirm("AVISO CRÍTICO: Isso redefinirá todas as encomendas, assinaturas, porteiros e apartamentos para as configurações originais de fábrica! Continuar?")) {
      return;
    }

    try {
      setDbSaving(true);
      const response = await fetch("/api/dev/db/reset", { method: "POST" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Falha ao resetar");

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Sistema restaurado para os padrões de fábrica.`,
        ...prev
      ]);

      await fetchData();
      setRawDbText(JSON.stringify(data.db, null, 2));
      alert("O banco de dados foi completamente restaurado para as configurações de fábrica!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao restaurar banco de dados.");
    } finally {
      setDbSaving(false);
    }
  };

  const handleDeleteDeliveryDirect = async (id: string) => {
    if (!confirm("Deseja realmente remover esta encomenda do sistema permanentemente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/deliveries/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();

      setDeveloperLog(prev => [
        `[${new Date().toLocaleTimeString()}] Encomenda ID ${id} deletada permanentemente pelo desenvolvedor.`,
        ...prev
      ]);

      await fetchData();
      alert("Encomenda deletada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao remover encomenda.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* ========================================== */}
      {/* MAIN TOP BAR (CONCIERGE & RESIDENT SWITCHER) */}
      {/* ========================================== */}
      <header className="border-b border-white/10 bg-[#0A0A0A] sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-black font-black tracking-tight text-lg shadow-lg shadow-amber-500/20">
              CA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-light text-base tracking-tighter text-white uppercase">CA.RO <span className="font-bold text-amber-500">— LOFT</span></span>
                <span className="text-amber-500 font-bold text-xs px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">LOFT</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Portaria Inteligente Zero Papel</p>
            </div>
          </div>

          {/* Role Switching Toggles */}
          <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveRole("porteiro")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                activeRole === "porteiro"
                  ? "bg-white/10 text-amber-500 shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Painel Portaria (Porteiro)</span>
            </button>
            <button
              onClick={() => setActiveRole("morador")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                activeRole === "morador"
                  ? "bg-white/10 text-amber-500 shadow-md"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>App Morador (Meu LOFT)</span>
            </button>
          </div>

          {/* Header Actions / Sync */}
          <div className="flex items-center space-x-3 text-xs text-white/60">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center space-x-1.5 bg-[#111111] hover:bg-white/5 py-1.5 px-3 rounded-lg border border-white/10 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
              <span>Sincronizar</span>
            </button>
          </div>

        </div>
      </header>

      {/* ========================================== */}
      {/* SECONDARY TABS BAR (FOR PORTARIA ROLE)     */}
      {/* ========================================== */}
      {activeRole === "porteiro" && (
        <div className="border-b border-white/5 bg-[#070707] py-2.5 sticky top-[61px] z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setCurrentTab("portaria")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                currentTab === "portaria"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/15"
                  : "bg-[#111111] text-white/60 hover:text-white border border-white/5"
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Portaria / Monitor</span>
            </button>

            <button
              onClick={() => setCurrentTab("apartamentos")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                currentTab === "apartamentos"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/15"
                  : "bg-[#111111] text-white/60 hover:text-white border border-white/5"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cadastro Apartamentos</span>
            </button>

            <button
              onClick={() => setCurrentTab("porteiros")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                currentTab === "porteiros"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/15"
                  : "bg-[#111111] text-white/60 hover:text-white border border-white/5"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Cadastro Porteiros</span>
            </button>

            <button
              onClick={() => setCurrentTab("adm")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                currentTab === "adm"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/15"
                  : "bg-[#111111] text-white/60 hover:text-white border border-white/5"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Painel ADM</span>
            </button>

            <button
              onClick={() => setCurrentTab("desenvolvedor")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 sm:ml-auto border border-amber-500/30 ${
                currentTab === "desenvolvedor"
                  ? "bg-red-500 text-white shadow-md shadow-red-500/20 border-red-500/50"
                  : "bg-[#1a0f0f] text-amber-500 hover:text-amber-400"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Painel Desenvolvedor</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* INTERACTIVE WORKSPACE (CONTENT AREA)      */}
      {/* ========================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-white/60 text-xs font-mono">Conectando e carregando dados do condomínio...</p>
          </div>
        ) : activeRole === "porteiro" ? (
          <>
            {currentTab === "portaria" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* BANNER DE INCENTIVO EM DESTAQUE PARA O APP DO MORADOR */}
                <div className="lg:col-span-12 bg-gradient-to-r from-amber-500/10 via-[#0A0A0A] to-[#151109] border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-amber-500/5">
                  <div className="flex items-center space-x-3 text-left">
                    <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 animate-bounce" />
                    </span>
                    <div>
                      <h4 className="font-extrabold text-white text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                        <span>📱 Quer ver o Aplicativo do Morador (Meu LOFT)?</span>
                        <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Novo</span>
                      </h4>
                      <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                        As novas seções de <strong className="text-amber-500">Reservas de Áreas Comuns</strong>, <strong className="text-amber-500">Controle de Acessos (Visitantes)</strong> e <strong className="text-amber-500">Mural de Avisos</strong> estão simuladas no aplicativo móvel do morador. Clique no botão ao lado ou use o botão flutuante para ver!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveRole("morador");
                      setResidentAppTab("home");
                    }}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 shrink-0 border border-amber-400/30"
                  >
                    <span>Abrir App do Morador</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
            
            {/* FULL WIDTH ANALYTICS & FILTERING PANEL (12 cols) */}
            <div className="lg:col-span-12 bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                      <BarChart className="w-4 h-4" />
                    </span>
                    <h2 className="font-black tracking-tight text-white uppercase text-sm">Painel Analítico & Filtros Avançados</h2>
                  </div>
                  <p className="text-xs text-white/40 mt-1">Estatísticas automáticas dos últimos 7 dias de entregas e pesquisa avançada por data/hora.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setFilterHourSlot("todos");
                      setFilterApartment("todos");
                      setSearchQuery("");
                    }}
                    className="flex items-center space-x-1.5 bg-black hover:bg-white/5 border border-white/10 text-white/60 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="Limpar todos os filtros operacionais"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </button>

                  <button
                    onClick={() => {
                      setExportedContent(null);
                      setShowExportModal(true);
                    }}
                    className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-black px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Exportar Relatório</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 7-DAY RECHARTS BAR CHART */}
                <div className="lg:col-span-7 bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3.5">Fluxo de Entregas (Últimos 7 Dias)</h3>
                  </div>
                  
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getWeeklyStatsData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="label" 
                          stroke="rgba(255,255,255,0.4)" 
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.4)" 
                          fontSize={10} 
                          tickLine={false} 
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                          itemStyle={{ color: "#F59E0B" }}
                          labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: "bold" }}
                        />
                        <Bar 
                          dataKey="Entregas" 
                          fill="#F59E0B" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-right mt-2">
                    <span className="text-[10px] font-mono text-white/30">Atualizado em tempo real</span>
                  </div>
                </div>

                {/* ADVANCED MULTI-CRITERIA FILTER CONSOLE */}
                <div className="lg:col-span-5 bg-black/40 border border-white/5 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Parâmetros de Filtragem</h3>

                  <div className="space-y-3">
                    {/* Apartment Filter */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Filtrar por Unidade (Apartamento)</label>
                      <select
                        value={filterApartment}
                        onChange={(e) => setFilterApartment(e.target.value)}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="todos">-- Todos os Apartamentos --</option>
                        {apartments.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            Apto {apt.numero} ({apt.bloco}) - {apt.residents?.[0]?.nome || "Sem morador"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Filters Grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">A partir de</label>
                        <input
                          type="date"
                          value={filterStartDate}
                          onChange={(e) => setFilterStartDate(e.target.value)}
                          className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Até</label>
                        <input
                          type="date"
                          value={filterEndDate}
                          onChange={(e) => setFilterEndDate(e.target.value)}
                          className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Hour range select */}
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Período do Dia (Hora de Registro)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: "todos", label: "Todos" },
                          { id: "manha", label: "Manhã" },
                          { id: "tarde", label: "Tarde" },
                          { id: "noite", label: "Noite" }
                        ].map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setFilterHourSlot(slot.id)}
                            className={`py-2 text-[11px] font-bold rounded-lg transition-all border cursor-pointer text-center ${
                              filterHourSlot === slot.id
                                ? "bg-amber-500/10 border-amber-500 text-amber-500"
                                : "bg-black border-white/10 text-white/40 hover:text-white"
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-white/30 mt-1.5 font-mono">
                        * Manhã: 06h-12h | Tarde: 12h-18h | Noite: 18h-06h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN LEFT: Dashboard Stats, Filters, Deliveries List (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Quick operational stats */}
              <div className="grid grid-cols-3 gap-3">
                
                <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Aguardando</p>
                    <p className="text-2xl font-light text-white mt-1">
                      {deliveries.filter((d) => d.status === "AGUARDANDO").length}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Atrasadas (+2d)</p>
                    <p className="text-2xl font-light text-red-400 mt-1">
                      {
                        deliveries.filter((d) => {
                          const days = (Date.now() - new Date(d.criado_em).getTime()) / (1000 * 60 * 60 * 24);
                          return d.status === "AGUARDANDO" && days >= 2;
                        }).length
                      }
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Entregues Hoje</p>
                    <p className="text-2xl font-light text-white mt-1">
                      {
                        deliveries.filter((d) => {
                          if (d.status !== "ENTREGUE" || !d.entregue_em) return false;
                          const entregueData = new Date(d.entregue_em);
                          const hoje = new Date();
                          return entregueData.toDateString() === hoje.toDateString();
                        }).length
                      }
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* List Search & Filters Header */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 space-y-3.5">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por apto, morador, transportadora ou remetente..."
                    className="w-full bg-[#050505] border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm text-[#E0E0E0] placeholder-white/30 focus:outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                  {(["todos", "pendentes", "atrasados", "entregues"] as const).map((filter) => {
                    const count = filter === "todos" 
                      ? deliveries.length 
                      : filter === "pendentes" 
                        ? deliveries.filter(d => d.status === "AGUARDANDO").length 
                        : filter === "atrasados"
                          ? deliveries.filter(d => {
                              const days = (Date.now() - new Date(d.criado_em).getTime()) / (1000 * 60 * 60 * 24);
                              return d.status === "AGUARDANDO" && days >= 2;
                            }).length
                          : deliveries.filter(d => d.status === "ENTREGUE").length;

                    return (
                      <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          activeFilter === filter
                            ? "bg-amber-500 text-black font-bold shadow-md shadow-amber-500/10"
                            : "bg-[#111111] text-white/60 hover:text-white border border-white/10"
                        }`}
                      >
                        {filter === "todos" && `Todas Encomendas (${count})`}
                        {filter === "pendentes" && `Aguardando Retirada (${count})`}
                        {filter === "atrasados" && `Pendentes +2 dias (${count})`}
                        {filter === "entregues" && `Entregues (${count})`}
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Deliveries List */}
              <div className="space-y-3.5">
                {filteredDeliveries.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 border-dashed rounded-2xl py-12 text-center text-white/40 space-y-2">
                    <Building className="w-8 h-8 text-white/20 mx-auto" />
                    <p className="text-sm font-medium">Nenhuma encomenda localizada</p>
                    <p className="text-xs">Tente ajustar a busca ou filtre por outra categoria</p>
                  </div>
                ) : (
                  filteredDeliveries.map((delivery) => {
                    const daysStale = (Date.now() - new Date(delivery.criado_em).getTime()) / (1000 * 60 * 60 * 24);
                    const isStale = delivery.status === "AGUARDANDO" && daysStale >= 2;

                    return (
                      <div
                        key={delivery.id}
                        className={`bg-[#0A0A0A] border transition-all rounded-xl overflow-hidden p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isStale 
                            ? "border-red-500/30 bg-red-500/[0.01]" 
                            : delivery.status === "ENTREGUE"
                              ? "border-emerald-500/20 bg-emerald-500/[0.01] opacity-85 hover:opacity-100 hover:border-emerald-500/40"
                              : "border-white/5 hover:border-white/20 bg-[#0A0A0A]"
                        }`}
                      >
                        {/* Package Info */}
                        <div className="flex items-start space-x-3.5">
                          {/* Image preview */}
                          <div className="w-16 h-16 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {delivery.foto_url ? (
                              <img src={delivery.foto_url} alt="Pacote" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-white/20" />
                            )}
                          </div>

                          <div>
                            {/* Destination Apartment Block */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-base text-white">
                                APT {delivery.apartment?.numero || "S/N"} - Bloco {delivery.apartment?.bloco || "-"}
                              </span>
                              {delivery.status === "AGUARDANDO" ? (
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                  isStale ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                }`}>
                                  {isStale ? "ATRASADA 48H+" : "AGUARDANDO"}
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30">
                                  ENTREGUE
                                </span>
                              )}
                              
                              {/* Urgent withdraw warning label */}
                              {delivery.urgente && delivery.status === "AGUARDANDO" && (
                                <span className="text-[10px] font-black bg-red-500/15 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded animate-pulse uppercase tracking-wider flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> RETIRADA URGENTE
                                </span>
                              )}
                            </div>

                            {/* Residents info */}
                            <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                              <User className="w-3 h-3 text-white/40" />
                              {delivery.residents?.map((r) => r.nome).join(", ") || "Sem morador cadastrado"}
                            </p>

                            {/* Package Source */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-white/40 font-mono">
                              <span>Remetente: <strong className="text-white/80">{delivery.remetente}</strong></span>
                              <span className="text-white/10">•</span>
                              <span>Via: <strong className="text-white/80">{delivery.transportadora}</strong></span>
                              {delivery.entregador_nome && (
                                <>
                                  <span className="text-white/10">•</span>
                                  <span>Entregador: <strong className="text-amber-500/90">{delivery.entregador_nome}</strong></span>
                                </>
                              )}
                            </div>

                            {/* Timestamps */}
                            <p className="text-[10px] text-white/40 mt-1">
                              Recebido em: {new Date(delivery.criado_em).toLocaleString("pt-BR")}
                            </p>
                          </div>
                        </div>

                        {/* Handover / Details Action */}
                        <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                          {delivery.status === "AGUARDANDO" ? (
                            <>
                              {/* 1-click Delivery withdrawal action */}
                              <button
                                onClick={() => {
                                  setDeliveryToHandover(delivery);
                                  setHandoverMethod("select");
                                }}
                                className="flex-1 md:flex-initial py-2 px-4 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition-all shadow-md shadow-amber-500/5 cursor-pointer flex items-center justify-center space-x-1.5"
                              >
                                <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Entregar Encomenda</span>
                              </button>

                              {/* Alert resident button */}
                              <button
                                onClick={() => handleSendReminder(delivery.id)}
                                className="py-2 px-3 bg-[#111111] hover:bg-white/5 text-white/80 font-semibold text-xs rounded-lg border border-white/10 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                                title="Notificar morador por WhatsApp"
                              >
                                <Send className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>Lembrete WA</span>
                              </button>
                            </>
                          ) : (
                            /* Delivered Details */
                            <div className="bg-black/40 border border-white/10 p-2 rounded-lg text-right text-[11px] space-y-1 w-full md:w-auto">
                              <p className="text-white/60">
                                Recebido por: <strong className="text-amber-500">{delivery.signature?.assinado_por || "Morador"}</strong>
                              </p>
                              {delivery.signature?.autorizado_terceiro && (
                                <p className="text-amber-500 text-[10px] font-bold flex items-center justify-end gap-1">
                                  <UserCheck className="w-3 h-3" /> Terceiro Autorizado
                                </p>
                              )}
                              <p className="text-white/40 font-mono text-[9px]">
                                {delivery.entregue_em && new Date(delivery.entregue_em).toLocaleString("pt-BR")}
                              </p>
                              
                              {/* Display signature button modal */}
                              {delivery.signature?.assinatura_url && (
                                <div className="pt-1.5 flex justify-end">
                                  <button
                                    onClick={() => setViewSignatureDelivery(delivery)}
                                    className="text-[9px] text-white/60 hover:text-amber-500 flex items-center gap-1 bg-black border border-white/10 px-1.5 py-0.5 rounded cursor-pointer"
                                  >
                                    <FileText className="w-2.5 h-2.5" /> Ver Assinatura
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* COLUMN RIGHT: Scan Label & OCR Registry (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Select Active Porteiro */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Porteiro Ativo</h4>
                      <button
                        onClick={() => setShowNewPorteiroModal(true)}
                        className="text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black border border-amber-500/20 px-2 py-0.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-0.5"
                        title="Cadastrar Novo Porteiro / Dados de quem usa"
                      >
                        <Plus className="w-3 h-3" /> Cadastrar Porteiro
                      </button>
                    </div>
                    <select
                      value={selectedPorteiro}
                      onChange={(e) => setSelectedPorteiro(e.target.value)}
                      className="bg-transparent text-sm font-bold text-white focus:outline-none focus:ring-0 py-0.5 mt-0.5"
                    >
                      {porteiros.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0A0A0A] text-white">
                          {p.nome} ({p.turno})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold bg-black border border-white/10 px-2 py-1 rounded text-white/40">
                    LOFT ALPHAVILLE
                  </span>
                </div>
              </div>

              {/* Package Intake Form Header */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-5">
                
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <Plus className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-white">Entrada de Encomenda</h3>
                  </div>
                  <span className="text-[10px] font-bold text-white/40 bg-black px-2.5 py-1 rounded-full border border-white/5">
                    PASSO {newDeliveryStep} DE 2
                  </span>
                </div>

                {newDeliveryStep === 1 ? (
                  /* STEP 1: Scan and upload */
                  <div className="space-y-4">
                    <p className="text-xs text-white/60 leading-relaxed">
                      Escanear a etiqueta com a IA para extrair automaticamente o remetente, transportadora e identificar o apartamento do morador.
                    </p>

                    <LabelScanner
                      onScanComplete={handleOcrComplete}
                      apartmentsList={apartments}
                      hideQrCodeTab={true}
                    />

                    {/* Informative Note */}
                    <div className="bg-[#111111]/50 border border-white/5 p-3 rounded-xl text-[11px] text-white/50 leading-relaxed space-y-1">
                      <p className="font-bold text-amber-500/90 flex items-center gap-1">
                        📦 Sobre o cadastro de entrada:
                      </p>
                      <p>
                        A entrada da encomenda é feita exclusivamente lendo a etiqueta do pacote externo (Correios, Sedex, Amazon, etc.) ou digitando os dados manualmente. Não há escaneamento de QR Code nesta etapa. O QR Code do morador é utilizado <strong>apenas na retirada</strong> para validação segura e identificação instantânea sem papel.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* STEP 2: Review OCR results */
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    
                    {/* IA Tag feedback */}
                    <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-300">OCR IA Processado</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-500">
                        {newDeliveryData.confidence || 90}% Confiança
                      </span>
                    </div>

                    {/* Image Thumbnail preview */}
                    {newDeliveryData.foto_url && (
                      <div className="rounded-xl overflow-hidden border border-white/10 relative h-32 bg-black">
                        <img
                          src={newDeliveryData.foto_url}
                          alt="Rótulo recortado"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">
                        Remetente / Loja <span className="text-[10px] text-white/20 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={newDeliveryData.remetente}
                        onChange={(e) =>
                          setNewDeliveryData((prev) => ({ ...prev, remetente: e.target.value }))
                        }
                        className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-white/20"
                        placeholder="Ex: Mercado Livre, Amazon, Zara (ou Encomenda)"
                      />
                    </div>

                    {/* Transportadora Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">
                        Transportadora <span className="text-[10px] text-white/20 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={newDeliveryData.transportadora}
                        onChange={(e) =>
                          setNewDeliveryData((prev) => ({ ...prev, transportadora: e.target.value }))
                        }
                        className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-white/20"
                        placeholder="Ex: Correios, Loggi, Sequoia (ou Geral)"
                      />
                    </div>

                    {/* Quem Entregou Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">
                        Quem Entregou / Entregador <span className="text-[10px] text-white/20 font-normal">(Opcional)</span>
                      </label>
                      <input
                        type="text"
                        value={newDeliveryData.entregador_nome || ""}
                        onChange={(e) =>
                          setNewDeliveryData((prev) => ({ ...prev, entregador_nome: e.target.value }))
                        }
                        className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-white/20"
                        placeholder="Nome do entregador, motoboy, documento ou placa"
                      />
                    </div>

                    {/* Urgência de Retirada Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
                      <div className="space-y-0.5">
                        <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">
                          Retirada Urgência
                        </label>
                        <p className="text-[10px] text-white/40">Notificar como item prioritário/urgente</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!newDeliveryData.urgente}
                          onChange={(e) =>
                            setNewDeliveryData((prev) => ({ ...prev, urgente: e.target.checked }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-white/5 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>

                    {/* Apartment Match Choice */}
                    <div>
                      <label className="block text-[11px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">
                        Apartamento Destino (Confirmado)
                      </label>
                      <select
                        value={newDeliveryData.apartamento_id}
                        onChange={(e) =>
                          setNewDeliveryData((prev) => ({ ...prev, apartamento_id: e.target.value }))
                        }
                        className="w-full bg-black border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-amber-500"
                        required
                      >
                        <option value="" className="bg-[#0A0A0A]">-- Selecione o Apartamento --</option>
                        {apartments.map((apt) => (
                          <option key={apt.id} value={apt.id} className="bg-[#0A0A0A]">
                            Apto {apt.numero} (Bloco {apt.bloco}) - {apt.residents?.[0]?.nome || "Sem Morador"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setNewDeliveryStep(1)}
                        className="flex-1 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold text-white/60 transition-all cursor-pointer"
                      >
                        Refazer Scan
                      </button>

                      <button
                        type="submit"
                        className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/15 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Notificar Morador</span>
                      </button>
                    </div>

                  </form>
                )}

              </div>

              {/* GERENCIADOR DE LAVANDERIA & ACADEMIA (PORTARIA) */}
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>🧺 Fichas de Lavanderia & Manutenção</span>
                    <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Portaria</span>
                  </h4>
                  <p className="text-[10px] text-white/40 mt-1">Gerencie a liberação de fichas físicas semanais (limite 4) e problemas relatados na academia.</p>
                </div>

                {/* Laundry Requests section */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center justify-between">
                    <span>Solicitações de Fichas Físicas</span>
                    <span className="bg-amber-500/10 text-amber-500 text-[8px] font-mono px-1.5 rounded-full">
                      {laundryRequests.filter(r => r.status === "pendente").length} Pendentes
                    </span>
                  </h5>

                  {laundryRequests.filter(r => r.status === "pendente" || r.status === "aprovado").length === 0 ? (
                    <p className="text-[10px] text-white/30 text-center py-2 bg-black/45 rounded-lg border border-white/5">Nenhuma solicitação de ficha ativa.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {laundryRequests.filter(r => r.status === "pendente" || r.status === "aprovado").map((req) => (
                        <div key={req.id} className="bg-black/60 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-white">Unid {req.apt} (Bloco {req.bloc})</span>
                              <span className={`text-[8px] font-black px-1 rounded uppercase ${
                                req.status === "pendente" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-400"
                              }`}>
                                {req.status === "pendente" ? "Pendente" : "Pronto para Retirar"}
                              </span>
                            </div>
                            <p className="text-[9px] text-white/40 mt-0.5">{req.residentName} • Pediu: <strong className="text-white">{req.qty} Fichas</strong></p>
                            <p className="text-[8px] text-white/30 font-mono mt-0.5">{req.date}</p>
                          </div>
                          
                          <div className="shrink-0">
                            {req.status === "pendente" ? (
                              <button
                                onClick={() => handleApproveLaundryRequest(req.id)}
                                className="bg-amber-500 hover:bg-amber-600 text-black px-2.5 py-1.5 rounded font-black uppercase text-[9px] cursor-pointer transition-all"
                              >
                                Liberar
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeliverLaundryTokens(req.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded font-black uppercase text-[9px] cursor-pointer transition-all"
                              >
                                Entregar Fichas
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gym Issues section */}
                <div className="pt-2 border-t border-white/5 space-y-3">
                  <h5 className="text-[10px] font-bold text-white/50 uppercase tracking-widest flex items-center justify-between">
                    <span>Manutenção da Academia</span>
                    <span className="bg-red-500/10 text-red-400 text-[8px] font-mono px-1.5 rounded-full">
                      {gymIssues.filter(i => i.status === "pendente").length} Problemas
                    </span>
                  </h5>

                  {gymIssues.length === 0 ? (
                    <p className="text-[10px] text-white/30 text-center py-2 bg-black/45 rounded-lg border border-white/5">Nenhum problema relatado na academia.</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {gymIssues.map((issue) => (
                        <div key={issue.id} className="bg-black/60 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="font-bold text-white">{issue.equipamento}</p>
                            <p className="text-[9px] text-white/60 mt-0.5">{issue.descricao}</p>
                            <p className="text-[8px] text-white/40 mt-1">Por: {issue.morador} • {issue.data}</p>
                          </div>
                          {issue.status === "pendente" ? (
                            <button
                              onClick={() => {
                                setGymIssues(gymIssues.map(i => i.id === issue.id ? { ...i, status: "resolvido" as const } : i));
                                alert("Status atualizado para resolvido!");
                              }}
                              className="bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 px-2 py-1 rounded text-[8px] font-bold uppercase transition-all cursor-pointer"
                            >
                              Resolver
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-[9px] font-bold">✓ Resolvido</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: APARTMENTS & RESIDENTS             */}
          {/* ========================================== */}
          {currentTab === "apartamentos" && (
            <div className="space-y-6">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <span className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                        <Building className="w-4 h-4" />
                      </span>
                      Cadastro de Apartamentos & Moradores
                    </h2>
                    <p className="text-xs text-white/40 mt-1">Gerencie cada apartamento e associe os moradores correspondentes para envio automatizado de notificações.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingApt(null);
                        setAptForm({ numero: "", bloco: "", qr_code: "" });
                        setShowAptModal(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/15 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Novo Apartamento</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingResident(null);
                        setResidentForm({ nome: "", telefone: "", email: "", apartamento_id: apartments[0]?.id || "" });
                        setShowResidentModal(true);
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer transition-all"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Cadastrar Morador</span>
                    </button>
                  </div>
                </div>

                {/* Search input */}
                <div className="mt-4 relative max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Pesquisar por número de apartamento, bloco ou morador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black text-white placeholder-white/30 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Apartments Cards Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apartments
                  .filter((apt) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    const matchAptNum = apt.numero.toLowerCase().includes(q);
                    const matchBlock = apt.bloco.toLowerCase().includes(q);
                    const matchResident = apt.residents && apt.residents.some(r => r.nome.toLowerCase().includes(q));
                    return matchAptNum || matchBlock || matchResident;
                  })
                  .map((apt) => (
                    <div key={apt.id} className="bg-[#0A0A0A] border border-white/10 hover:border-white/25 rounded-2xl p-5 space-y-4 shadow-lg transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-white/5 pb-3">
                          <div>
                            <h3 className="text-sm font-black text-white">Apartamento {apt.numero}</h3>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-500 px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">Bloco {apt.bloco}</span>
                          </div>
                          {/* QR preview */}
                          <button
                            onClick={() => {
                              setSelectedResidentId(apt.residents?.[0]?.id || "");
                              setMoradorQRModal(true);
                            }}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl border border-white/10 transition-all cursor-pointer"
                            title="Visualizar QR Code do Apartamento"
                          >
                            <QrCode className="w-4 h-4 text-amber-500" />
                          </button>
                        </div>

                        {/* Residents list */}
                        <div className="mt-4 space-y-3">
                          <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Moradores Cadastrados ({apt.residents?.length || 0})</h4>
                          {apt.residents && apt.residents.length > 0 ? (
                            <div className="space-y-2">
                              {apt.residents.map((res) => (
                                <div key={res.id} className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-white/90 truncate">{res.nome}</p>
                                    {res.telefone && <p className="text-[10px] text-white/50 truncate font-mono mt-0.5">{res.telefone}</p>}
                                    {res.email && <p className="text-[10px] text-white/40 truncate">{res.email}</p>}
                                  </div>
                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setEditingResident(res);
                                        setResidentForm({
                                          nome: res.nome,
                                          telefone: res.telefone || "",
                                          email: res.email || "",
                                          apartamento_id: apt.id
                                        });
                                        setShowResidentModal(true);
                                      }}
                                      className="p-1.5 hover:bg-white/5 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
                                      title="Editar Morador"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteResident(res.id, res.nome)}
                                      className="p-1.5 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                                      title="Excluir Morador"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-white/30 italic py-2">Nenhum morador registrado nesta unidade. Use o botão abaixo para cadastrar.</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                        <button
                          onClick={() => {
                            setEditingResident(null);
                            setResidentForm({ nome: "", telefone: "", email: "", apartamento_id: apt.id });
                            setShowResidentModal(true);
                          }}
                          className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Adicionar Morador</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingApt(apt);
                              setAptForm({ numero: apt.numero, bloco: apt.bloco, qr_code: apt.qr_code });
                              setShowAptModal(true);
                            }}
                            className="p-1 hover:bg-white/5 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Editar Apartamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteApartment(apt.id, `${apt.numero} (Bloco ${apt.bloco})`)}
                            className="p-1 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                            title="Deletar Apartamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: PORTEIROS                          */}
          {/* ========================================== */}
          {currentTab === "porteiros" && (
            <div className="space-y-6">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h2 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-2">
                      <span className="p-1.5 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20">
                        <UserCheck className="w-4 h-4" />
                      </span>
                      Cadastro de Porteiros
                    </h2>
                    <p className="text-xs text-white/40 mt-1">Gerencie a equipe de portaria autorizada a registrar e despachar as encomendas no sistema.</p>
                  </div>
                  <div>
                    <button
                      onClick={() => {
                        setNewPorteiroData({ nome: "", telefone: "", turno: "Diurno" });
                        setShowNewPorteiroModal(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/15 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Novo Porteiro</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Porteiros Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {porteiros.map((port) => {
                  const isSessionPorteiro = selectedPorteiro === port.id;
                  return (
                    <div key={port.id} className={`bg-[#0A0A0A] border rounded-2xl p-5 space-y-4 shadow-lg transition-all flex flex-col justify-between ${
                      isSessionPorteiro ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-white/10"
                    }`}>
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-black text-white">{port.nome}</h3>
                              {isSessionPorteiro && (
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500 text-black px-1.5 py-0.5 rounded animate-pulse">Ativo</span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/50 font-mono mt-1">{port.telefone || "Telefone não cadastrado"}</p>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-white/5 text-white/80 rounded border border-white/10 uppercase font-mono">{port.turno}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 mt-2">
                        <button
                          onClick={() => {
                            setSelectedPorteiro(port.id);
                            alert(`Porteiro ativo alterado para: ${port.nome}`);
                          }}
                          disabled={isSessionPorteiro}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                            isSessionPorteiro
                              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-default"
                              : "bg-white/5 hover:bg-white/10 text-white/80 border border-white/5"
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isSessionPorteiro ? "Ativo no Console" : "Selecionar Porteiro"}</span>
                        </button>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingPorteiro(port);
                              setPorteiroForm({ nome: port.nome, telefone: port.telefone || "", turno: port.turno });
                            }}
                            className="p-1 hover:bg-white/5 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Editar Dados"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePorteiro(port.id, port.nome)}
                            className="p-1 hover:bg-red-500/10 text-white/40 hover:text-red-500 rounded-lg transition-all cursor-pointer"
                            title="Deletar Porteiro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Porteiro Quick Edit Panel */}
              {editingPorteiro && (
                <div className="bg-[#0A0A0A] border border-amber-500/30 rounded-2xl p-6 shadow-xl max-w-md">
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Editar Porteiro</h3>
                  <form onSubmit={handleSavePorteiroEdit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Nome</label>
                      <input
                        type="text"
                        required
                        value={porteiroForm.nome}
                        onChange={(e) => setPorteiroForm({ ...porteiroForm, nome: e.target.value })}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Telefone</label>
                      <input
                        type="text"
                        value={porteiroForm.telefone}
                        onChange={(e) => setPorteiroForm({ ...porteiroForm, telefone: e.target.value })}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Turno</label>
                      <select
                        value={porteiroForm.turno}
                        onChange={(e) => setPorteiroForm({ ...porteiroForm, turno: e.target.value })}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                      >
                        <option value="Diurno">Diurno</option>
                        <option value="Noturno">Noturno</option>
                        <option value="Misto">Misto</option>
                      </select>
                    </div>
                    <div className="flex space-x-2.5 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                      >
                        Salvar Alterações
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPorteiro(null)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: ADM PANEL & STATS                  */}
          {/* ========================================== */}
          {currentTab === "adm" && (
            <div className="space-y-6">
              
              {/* Stats Counters Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Apartamentos</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">{apartments.length}</span>
                    <span className="text-[10px] font-mono text-amber-500 px-1.5 py-0.5 bg-amber-500/10 rounded">Lofts</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Moradores</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">
                      {apartments.reduce((acc, apt) => acc + (apt.residents?.length || 0), 0)}
                    </span>
                    <span className="text-[10px] font-mono text-white/30">Total</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Porteiros</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">{porteiros.length}</span>
                    <span className="text-[10px] font-mono text-white/30">Equipe</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Total Entregas</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">{deliveries.length}</span>
                    <span className="text-[10px] font-mono text-white/30">Registros</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Aguardando</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-500">
                      {deliveries.filter((d) => d.status === "AGUARDANDO").length}
                    </span>
                    <span className="text-[10px] font-mono text-amber-500/40 animate-pulse">● pendentes</span>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Entregues</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-black text-green-500">
                      {deliveries.filter((d) => d.status === "ENTREGUE").length}
                    </span>
                    <span className="text-[10px] font-mono text-green-500/40">✓ sucesso</span>
                  </div>
                </div>
              </div>

              {/* Weekly Analytics & Export Console Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 7-DAY BAR CHART */}
                <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
                  <div>
                    <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Fluxo de Entregas (Últimos 7 Dias)</h3>
                  </div>
                  
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getWeeklyStatsData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis 
                          dataKey="label" 
                          stroke="rgba(255,255,255,0.4)" 
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.4)" 
                          fontSize={10} 
                          tickLine={false} 
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0A0A0A", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                          itemStyle={{ color: "#F59E0B" }}
                          labelStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", fontWeight: "bold" }}
                        />
                        <Bar 
                          dataKey="Entregas" 
                          fill="#F59E0B" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={40}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-right mt-2">
                    <span className="text-[10px] font-mono text-white/30">Dados em tempo real</span>
                  </div>
                </div>

                {/* EXPORT REPORTS AND DATA */}
                <div className="lg:col-span-5 bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div>
                    <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Relatório & Fechamento de Encomendas</h3>
                    <p className="text-[11px] text-white/40 mt-1">Gere arquivos de auditoria prontos para download em PDF ou CSV com o resumo das entregas.</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1 tracking-wider">Período</label>
                      <select
                        value={exportPeriod}
                        onChange={(e) => setExportPeriod(e.target.value)}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs"
                      >
                        <option value="semana">Últimos 7 dias</option>
                        <option value="mes">Último Mês (30 dias)</option>
                        <option value="ano">Último Ano</option>
                        <option value="todos">Todo o histórico</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1 tracking-wider">Unidade / Filtro de Apartamento</label>
                      <select
                        value={exportApt}
                        onChange={(e) => setExportApt(e.target.value)}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs"
                      >
                        <option value="todos">Todos os Apartamentos</option>
                        {apartments.map((a) => (
                          <option key={a.id} value={a.id}>Apto {a.numero} (Bloco {a.bloco})</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setExportedContent(null);
                        setShowExportModal(true);
                      }}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/15 cursor-pointer transition-all mt-2"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Configurar & Exportar Relatório</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 5: DEVELOPER CONSOLE                  */}
          {/* ========================================== */}
          {currentTab === "desenvolvedor" && (
            <div className="space-y-6">
              
              {/* Warnings Banner */}
              <div className="bg-[#1a0f0f] border border-red-500/30 rounded-xl p-4 flex items-start space-x-3 text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">CONSOLE DE DESENVOLVEDOR ATIVO (Acesso de Baixo Nível)</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed mt-1">
                    Você está acessando a engine de banco de dados do condomínio. Alterações feitas no editor JSON bruto são persistidas diretamente no arquivo de produção <code className="bg-black/40 text-red-400 font-mono px-1 py-0.5 rounded text-[10px]">db.json</code>. Tenha extremo cuidado!
                  </p>
                </div>
              </div>

              {/* Columns: Left JSON Editor, Right Logs & Tools */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: DB JSON Editor */}
                <div className="lg:col-span-7 bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-red-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Editor do Banco de Dados (db.json)</h3>
                    </div>
                    <span className="text-[9px] font-mono text-white/30">Formato JSON</span>
                  </div>

                  <p className="text-[11px] text-white/40">Clique em "Ler Dados" para carregar o banco de dados atual. Edite diretamente e depois clique em "Salvar" para sincronizar com o backend.</p>

                  <textarea
                    value={rawDbText}
                    onChange={(e) => setRawDbText(e.target.value)}
                    placeholder='Clique no botão "Ler Dados Brutos do Banco" abaixo para carregar...'
                    className="w-full h-96 font-mono text-xs bg-black text-green-400 p-4 rounded-xl border border-white/10 focus:outline-none focus:border-red-500/50"
                  />

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={handleLoadDevDb}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-white/10 cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Ler Dados Brutos</span>
                    </button>
                    <button
                      onClick={handleSaveDevDb}
                      disabled={dbSaving || !rawDbText.trim()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/10"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{dbSaving ? "Salvando..." : "Salvar Alterações"}</span>
                    </button>
                    <button
                      onClick={handleResetDevDb}
                      disabled={dbSaving}
                      className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/30 font-bold text-xs rounded-xl ml-auto cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      <span>Resetar para Fábrica</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Event log and API status */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* API integration status */}
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/5 pb-3">Integrações de Inteligência Artificial</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60 font-medium">Gemini OCR Engine (Backend)</span>
                        {process.env.GEMINI_API_KEY ? (
                          <span className="text-[10px] font-mono font-bold uppercase text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">ATIVO (Real)</span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">SIMULADO</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60 font-medium">Canal WhatsApp (Notificações)</span>
                        <span className="text-[10px] font-mono font-bold uppercase text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">SIMULADO COMPLETO</span>
                      </div>

                      <div className="bg-black/50 p-3 rounded-xl border border-white/5 space-y-2">
                        <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Testar Notificação Flutuante (WhatsApp)</h4>
                        <p className="text-[10px] text-white/40">Gere um push-notificação flutuante instantâneo para testar o painel visualizador:</p>
                        <button
                          onClick={() => {
                            setActiveNotificationToast({
                              id: `toast-${Date.now()}`,
                              residentName: "Ronaldo Silva",
                              phone: "+55 (11) 98765-4321",
                              sender: "Amazon Prime BR",
                              courier: "DHL Express",
                              type: "new"
                            });
                            alert("Disparado balão simulador do WhatsApp na tela!");
                          }}
                          className="px-3 py-1.5 bg-green-600/15 hover:bg-green-600/20 text-green-500 border border-green-500/20 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Disparar Mensagem Flutuante
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dev system event log */}
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-amber-500" />
                        Log de Eventos do Sistema
                      </h3>
                      <button
                        onClick={() => setDeveloperLog([`[${new Date().toLocaleTimeString()}] Logs limpos.`])}
                        className="text-[10px] text-white/40 hover:text-white"
                      >
                        Limpar
                      </button>
                    </div>

                    <div className="bg-black text-green-400 font-mono text-[10px] p-3 rounded-xl h-56 overflow-y-auto space-y-1.5 border border-white/5">
                      {developerLog.map((log, index) => (
                        <div key={index} className="leading-normal border-b border-white/5 pb-1">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MAIN OVERLAY MODALS FOR APARTMENTS/RESIDENTS */}
          {/* ========================================== */}
          {showAptModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-black text-white uppercase">{editingApt ? "Editar Apartamento" : "Novo Apartamento"}</h3>
                  <button onClick={() => setShowAptModal(false)} className="p-1 text-white/40 hover:text-white rounded-lg transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveApartment} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Número do Apartamento / Loft</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 101, 402, Loft 12"
                      value={aptForm.numero}
                      onChange={(e) => setAptForm({ ...aptForm, numero: e.target.value })}
                      className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Bloco / Torre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: A, B, Loft"
                      value={aptForm.bloco}
                      onChange={(e) => setAptForm({ ...aptForm, bloco: e.target.value })}
                      className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {editingApt && (
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Custom QR Code ID (Opcional)</label>
                      <input
                        type="text"
                        placeholder="ID gerado automaticamente"
                        value={aptForm.qr_code}
                        onChange={(e) => setAptForm({ ...aptForm, qr_code: e.target.value })}
                        className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                  <div className="flex space-x-2.5 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                    >
                      {editingApt ? "Salvar Alterações" : "Cadastrar Unidade"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAptModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showResidentModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-black text-white uppercase">{editingResident ? "Editar Morador" : "Cadastrar Morador"}</h3>
                  <button onClick={() => setShowResidentModal(false)} className="p-1 text-white/40 hover:text-white rounded-lg transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSaveResident} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Apartamento Associado</label>
                    <select
                      value={residentForm.apartamento_id}
                      onChange={(e) => setResidentForm({ ...residentForm, apartamento_id: e.target.value })}
                      className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Selecione o Apartamento --</option>
                      {apartments.map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          Apto {apt.numero} (Bloco {apt.bloco})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Rony Silva"
                      value={residentForm.nome}
                      onChange={(e) => setResidentForm({ ...residentForm, nome: e.target.value })}
                      className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Celular (WhatsApp)</label>
                    <input
                      type="text"
                      placeholder="Ex: +55 (11) 98765-4321"
                      value={residentForm.telefone}
                      onChange={(e) => setResidentForm({ ...residentForm, telefone: e.target.value })}
                      className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">E-mail</label>
                    <input
                      type="email"
                      placeholder="Ex: rony@exemplo.com"
                      value={residentForm.email}
                      onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
                      className="w-full bg-black text-white border border-white/10 rounded-lg p-2.5 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex space-x-2.5 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
                    >
                      {editingResident ? "Salvar Alterações" : "Cadastrar Morador"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResidentModal(false)}
                      className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          </>
        ) : (
          /* ========================================== */
          /* RESIDENT APP WORKSPACE (IPHONE SIMULATOR)  */
          /* ========================================== */
          <div className="flex flex-col items-center justify-center py-4">
            
            {/* Top Configurator for simulation workspace */}
            <div className="w-full max-w-sm mb-6 bg-[#0A0A0A] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-white/60">
                <Building className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-white/80">Login Único do Apartamento (Simulação)</h4>
              </div>
              <p className="text-[11px] text-white/60 leading-normal">
                No CA.RO LOFT, cada apartamento tem um login único (pelo número da unidade). Altere o apartamento para simular o login de outras residências:
              </p>
              
              <select
                value={activeResidentApartment?.id || ""}
                onChange={(e) => {
                  const aptId = e.target.value;
                  const apt = apartments.find(a => a.id === aptId);
                  if (apt && apt.residents && apt.residents.length > 0) {
                    setSelectedResidentId(apt.residents[0].id);
                  }
                }}
                className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id} className="bg-[#0A0A0A]">
                    Apartamento {apt.numero} (Bloco {apt.bloco})
                  </option>
                ))}
              </select>

              {/* Dica de navegação para as novas abas */}
              <div className="pt-2.5 border-t border-white/5 flex items-start space-x-2 text-[10.5px] text-amber-500/90 leading-relaxed">
                <span className="text-sm">💡</span>
                <p>
                  Toque nos botões do <strong>menu inferior do celular</strong> (Início, Acessos, Reservas, Mural) para visualizar todas as novas seções simuladas!
                </p>
              </div>
            </div>

            {/* Simulated iPhone Frame */}
            <div className="w-full max-w-sm border-8 border-[#1a1a1a] bg-black rounded-[40px] shadow-2xl relative overflow-hidden h-[690px] flex flex-col ring-1 ring-white/10">
              
              {/* Phone Speaker Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-5 w-36 bg-[#1a1a1a] rounded-b-2xl z-50 flex items-center justify-center">
                <div className="w-12 h-1 bg-black rounded-full" />
              </div>

              {/* Status bar */}
              <div className="px-6 pt-6 pb-2 flex justify-between items-center text-[10px] text-white/40 font-bold tracking-wider z-20">
                <span>13:06</span>
                <div className="flex items-center space-x-1.5">
                  <span>5G</span>
                  <div className="w-5 h-2.5 bg-amber-500 rounded-sm" />
                </div>
              </div>

              {/* Resident App Header */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#111111] border border-white/10 flex items-center justify-center text-white/80 font-bold text-xs uppercase overflow-hidden">
                    {activeResident?.nome ? activeResident.nome.substring(0, 2) : "MO"}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{activeResident?.nome || "Morador"}</h3>
                    <p className="text-[10px] text-white/40 font-mono">
                      Apto {activeResidentApartment?.numero} • Bl {activeResidentApartment?.bloco}
                    </p>
                  </div>
                </div>

                {/* QR Code trigger button */}
                <button
                  onClick={() => setMoradorQRModal(true)}
                  className="p-2 bg-[#111111] border border-white/10 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-[#1a1a1a] transition-all flex items-center space-x-1 cursor-pointer"
                  title="Mostrar meu QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>

              {/* Device Owner Selector (Multiple Devices / Residents under the same login) */}
              <div className="px-5 py-2 bg-[#090909] border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
                <span className="text-[9px] font-mono font-bold text-white/40 uppercase tracking-widest">Dispositivo de:</span>
                <select
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-amber-500 focus:outline-none focus:ring-0 py-0.5 max-w-[200px] text-right cursor-pointer"
                >
                  {activeResidentApartment?.residents?.map((res) => (
                    <option key={res.id} value={res.id} className="bg-[#0A0A0A] text-white text-xs">
                      {res.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resident App Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                
                {/* 1. HOME TAB */}
                {residentAppTab === "home" && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Welcome greeting */}
                    <div>
                      <h4 className="text-sm text-white/50">Olá,</h4>
                      <h3 className="text-lg font-black text-white leading-tight">
                        {activeResident?.nome?.split(" ")[0] || "Morador"} 👋
                      </h3>
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-1">
                        Unidade {activeResidentApartment?.numero} • Bloco {activeResidentApartment?.bloco}
                      </p>
                    </div>

                    {/* Status Overview Badges */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setResidentAppTab("encomendas")}
                        className="bg-[#111111] border border-white/5 rounded-xl p-2 text-center hover:border-amber-500/30 transition-all cursor-pointer"
                      >
                        <span className="text-[18px] block">📦</span>
                        <span className="text-[10px] font-bold text-white block mt-1">
                          {residentDeliveries.filter(d => d.status === "AGUARDANDO").length}
                        </span>
                        <span className="text-[8px] text-white/40 block">Aguardando</span>
                      </button>

                      <button
                        onClick={() => setResidentAppTab("reservas")}
                        className="bg-[#111111] border border-white/5 rounded-xl p-2 text-center hover:border-amber-500/30 transition-all cursor-pointer"
                      >
                        <span className="text-[18px] block">📅</span>
                        <span className="text-[10px] font-bold text-white block mt-1">
                          {residentReservations.length}
                        </span>
                        <span className="text-[8px] text-white/40 block">Reservas</span>
                      </button>

                      <button
                        onClick={() => setResidentAppTab("acesso")}
                        className="bg-[#111111] border border-white/5 rounded-xl p-2 text-center hover:border-amber-500/30 transition-all cursor-pointer"
                      >
                        <span className="text-[18px] block">🔑</span>
                        <span className="text-[10px] font-bold text-white block mt-1">
                          {guestPasses.filter(g => g.status === "ativo").length}
                        </span>
                        <span className="text-[8px] text-white/40 block">Acessos</span>
                      </button>
                    </div>

                    {/* Delivery Alert banner (if any) */}
                    {residentDeliveries.filter(d => d.status === "AGUARDANDO").length > 0 ? (
                      <div className="bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/30 p-4 rounded-xl relative overflow-hidden">
                        <div className="absolute -right-2 -bottom-2 text-white/5 text-4xl font-black">📦</div>
                        <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                          <Bell className="w-3 h-3 animate-bounce" /> Atenção
                        </h5>
                        <p className="text-white text-xs font-bold mt-1">
                          Você tem {residentDeliveries.filter(d => d.status === "AGUARDANDO").length} entrega(s) na portaria.
                        </p>
                        <button
                          onClick={() => setResidentAppTab("encomendas")}
                          className="mt-2.5 text-[9px] font-bold bg-amber-500 text-black px-2.5 py-1 rounded hover:bg-amber-600 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Verificar Detalhes</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#111111]/40 border border-white/5 p-4 rounded-xl text-center">
                        <p className="text-white/40 text-[11px]">Nenhuma encomenda pendente de retirada.</p>
                      </div>
                    )}

                    {/* Amenities / Condominium Showcase */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Condomínio LOFT Alphaville</span>
                        <span className="text-[8px] text-amber-500 font-mono">Premium</span>
                      </div>

                      {/* Info cards */}
                      <div className="space-y-2">
                        <button
                          onClick={() => setResidentAppTab("lavanderia")}
                          className="w-full bg-[#111111] border border-white/5 p-3 rounded-xl flex items-center space-x-3 text-left hover:border-amber-500/30 transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shrink-0">
                            🧺
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-white">Lavanderia OMO (Automatizada)</h5>
                              <span className="bg-amber-500 text-black text-[7px] font-black px-1 py-0.2 rounded uppercase">Fichas Digitais</span>
                            </div>
                            <p className="text-[9px] text-white/40">Ative e pague ciclos direto pelo celular.</p>
                          </div>
                        </button>

                        <button
                          onClick={() => setResidentAppTab("academia")}
                          className="w-full bg-[#111111] border border-white/5 p-3 rounded-xl flex items-center space-x-3 text-left hover:border-amber-500/30 transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shrink-0">
                            🏋️‍♂️
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-white">Academia (Fitness LOFT)</h5>
                              <span className="text-[8px] text-emerald-400 font-bold">Livre Acesso</span>
                            </div>
                            <p className="text-[9px] text-white/40">Funcionamento 24h, horários e manutenção.</p>
                          </div>
                        </button>

                        <div className="bg-[#111111] border border-white/5 p-3 rounded-xl flex items-center space-x-3">
                          <div className="w-10 h-10 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg shrink-0">
                            💻
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white">Espaço Coworking Privativo</h5>
                            <p className="text-[9px] text-white/40">Fibra de 1Gbps, ar-condicionado e cabines acústicas.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action shortcuts */}
                    <div className="bg-black border border-white/10 rounded-xl p-3.5 space-y-2">
                      <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Acesso Rápido</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => setResidentAppTab("reservas")}
                          className="bg-[#111111] hover:bg-[#1a1a1a] p-2 rounded-lg text-white font-semibold transition-all text-[11px] text-center cursor-pointer"
                        >
                          Reservar Áreas 📅
                        </button>
                        <button
                          onClick={() => setResidentAppTab("lavanderia")}
                          className="bg-[#111111] hover:bg-[#1a1a1a] p-2 rounded-lg text-white font-semibold transition-all text-[11px] text-center cursor-pointer"
                        >
                          Minhas Fichas 🧺
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ENCOMENDAS TAB */}
                {residentAppTab === "encomendas" && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-base font-black text-white">📦 Minhas Encomendas</h3>
                      <p className="text-[10px] text-white/40">Consulte pacotes pendentes e o histórico de retiradas.</p>
                    </div>

                    {/* Pending Deliveries section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Aguardando Coleta na Portaria</span>
                        <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
                      </div>

                      {residentDeliveries.filter((d) => d.status === "AGUARDANDO").length === 0 ? (
                        <div className="bg-[#111111]/50 border border-white/5 rounded-xl p-6 text-center text-white/40 text-xs">
                          <CheckCircle className="w-6 h-6 text-emerald-500/40 mx-auto mb-2" />
                          <span>Tudo limpo! Você não possui nenhuma entrega na portaria neste momento.</span>
                        </div>
                      ) : (
                        residentDeliveries
                          .filter((d) => d.status === "AGUARDANDO")
                          .map((delivery) => (
                            <div
                              key={delivery.id}
                              className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden p-3 space-y-3"
                            >
                              {/* Image & Delivery brief */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start space-x-3">
                                  <div className="w-12 h-12 rounded bg-black border border-white/10 overflow-hidden shrink-0">
                                    {delivery.foto_url ? (
                                      <img src={delivery.foto_url} alt="Pacote" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-white/20" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-white">{delivery.remetente}</h5>
                                    <p className="text-[10px] text-white/40 font-mono">Via {delivery.transportadora}</p>
                                    <p className="text-[9px] text-white/30 mt-1">
                                      Chegou em: {new Date(delivery.criado_em).toLocaleString("pt-BR")}
                                    </p>
                                  </div>
                                </div>
                                
                                <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded uppercase">
                                  Portaria
                                </span>
                              </div>

                              {/* Autorizar Retirada de Terceiro Section */}
                              <div className="bg-black p-2.5 rounded-lg border border-white/5 space-y-2">
                                <p className="text-[10px] font-bold text-white/60 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-amber-500" />
                                  <span>Autorizar Terceiro para Retirada</span>
                                </p>
                                
                                {delivery.autorizado_terceiro_nome ? (
                                  <div className="flex items-center justify-between text-[10px] bg-amber-500/5 p-1.5 rounded border border-amber-500/10">
                                    <span className="text-white/40">Autorizado:</span>
                                    <strong className="text-amber-500 font-bold">{delivery.autorizado_terceiro_nome}</strong>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-1.5">
                                    <input
                                      type="text"
                                      id={`terc-input-${delivery.id}`}
                                      placeholder="Nome (Ex: Esposa, Motoboy)"
                                      className="flex-1 bg-[#111111] border border-white/10 rounded py-1 px-2 text-[10px] text-white focus:outline-none focus:border-amber-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const input = document.getElementById(`terc-input-${delivery.id}`) as HTMLInputElement;
                                        if (input && input.value) {
                                          handleAuthorizeThirdParty(delivery.id, input.value);
                                        } else {
                                          alert("Preencha o nome antes de autorizar.");
                                        }
                                      }}
                                      className="py-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-bold rounded transition-all cursor-pointer"
                                    >
                                      OK
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                      )}
                    </div>

                    {/* History section */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Histórico de Entregas</span>

                      {residentDeliveries.filter((d) => d.status === "ENTREGUE").length === 0 ? (
                        <p className="text-[11px] text-white/30 text-center py-2">Nenhum histórico disponível</p>
                      ) : (
                        residentDeliveries
                          .filter((d) => d.status === "ENTREGUE")
                          .map((delivery) => (
                            <div
                              key={delivery.id}
                              className="bg-[#111111]/70 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center space-x-2.5">
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                  <p className="font-bold text-white text-xs">{delivery.remetente}</p>
                                  <p className="text-[9px] text-white/40">
                                    Recebido por: {delivery.signature?.assinado_por}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right text-[10px] text-white/40 shrink-0">
                                <p className="font-semibold text-emerald-400">Entregue</p>
                                <p className="text-[8px] font-mono mt-0.5">
                                  {delivery.entregue_em && new Date(delivery.entregue_em).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. ACESSOS TAB */}
                {residentAppTab === "acesso" && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-base font-black text-white">🔑 Controle de Acessos</h3>
                      <p className="text-[10px] text-white/40">Gerencie seu QR Code e pré-autorize convidados.</p>
                    </div>

                    {/* Own QR Code modal shortcut card */}
                    <div className="bg-[#111111] border border-white/10 rounded-xl p-4 text-center space-y-3">
                      <QrCode className="w-12 h-12 text-amber-500 mx-auto" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Meu QR Code de Identificação</h4>
                        <p className="text-[10px] text-white/55 leading-relaxed mt-1">
                          Apresente o QR Code no tablet da Portaria para identificação instantânea e retirada ecológica de pacotes.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMoradorQRModal(true)}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-lg transition-all cursor-pointer"
                      >
                        Exibir QR Code Individual
                      </button>
                    </div>

                    {/* Pre-authorize Visitor Form */}
                    <div className="bg-[#111111] border border-white/5 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
                        <UserPlus className="w-4 h-4 text-amber-500" />
                        <span>Pre-Autorizar Visitante (Passe)</span>
                      </h4>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[9px] text-white/45 uppercase tracking-widest font-bold mb-1">Nome Completo</label>
                          <input
                            type="text"
                            value={newGuestName}
                            onChange={(e) => setNewGuestName(e.target.value)}
                            placeholder="Nome do Visitante / Prestador"
                            className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/45 uppercase tracking-widest font-bold mb-1">CPF</label>
                            <input
                              type="text"
                              value={newGuestCpf}
                              onChange={(e) => setNewGuestCpf(e.target.value)}
                              placeholder="000.000.000-00"
                              className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/45 uppercase tracking-widest font-bold mb-1">Data de Acesso</label>
                            <input
                              type="text"
                              value={newGuestDate}
                              onChange={(e) => setNewGuestDate(e.target.value)}
                              placeholder="Ex: Hoje, Amanhã"
                              className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newGuestName || !newGuestCpf) {
                              alert("Preencha o nome e o CPF do visitante!");
                              return;
                            }
                            const pass = {
                              id: "guest-" + Date.now(),
                              name: newGuestName,
                              cpf: newGuestCpf,
                              date: newGuestDate || "Hoje",
                              status: "ativo" as const
                            };
                            setGuestPasses([pass, ...guestPasses]);
                            setNewGuestName("");
                            setNewGuestCpf("");
                            setNewGuestDate("");
                            alert("Passe gerado com sucesso! Sincronizado com a portaria física.");
                          }}
                          className="w-full py-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Gerar Passe Digital Sincronizado
                        </button>
                      </div>
                    </div>

                    {/* Active visitor passes */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Passes Ativos na Portaria</span>

                      {guestPasses.length === 0 ? (
                        <p className="text-[11px] text-white/30 text-center py-1">Nenhum passe ativo cadastrado.</p>
                      ) : (
                        guestPasses.map((guest) => (
                          <div
                            key={guest.id}
                            className="bg-black border border-white/5 rounded-xl p-3 flex items-center justify-between"
                          >
                            <div>
                              <h5 className="text-xs font-bold text-white">{guest.name}</h5>
                              <p className="text-[9px] text-white/40">CPF: {guest.cpf} • Data: {guest.date}</p>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className="text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                                Ativo
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Deseja revogar o acesso de ${guest.name}?`)) {
                                    setGuestPasses(guestPasses.filter(g => g.id !== guest.id));
                                  }
                                }}
                                className="text-white/40 hover:text-red-500 p-1 cursor-pointer"
                                title="Revogar Passe"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 4. RESERVAS TAB */}
                {residentAppTab === "reservas" && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-base font-black text-white">📅 Reservas de Áreas Comuns</h3>
                      <p className="text-[10px] text-white/40">Reserve as facilidades exclusivas do LOFT Alphaville.</p>
                    </div>

                    {/* Reservation Form */}
                    <div className="bg-[#111111] border border-white/5 p-4 rounded-xl space-y-3.5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span>Novo Agendamento</span>
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] text-white/45 uppercase tracking-widest font-bold mb-1">Selecionar Espaço</label>
                          <select
                            value={newReservationAmenity}
                            onChange={(e) => setNewReservationAmenity(e.target.value)}
                            className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="Espaço Gourmet & Deck" className="bg-[#0A0A0A]">🥩 Espaço Gourmet & Deck</option>
                            <option value="Lavanderia Coletiva OMO" className="bg-[#0A0A0A]">👔 Lavanderia Coletiva OMO (Máquina)</option>
                            <option value="Salão de Jogos & Bar" className="bg-[#0A0A0A]">🎮 Salão de Jogos & Bar</option>
                            <option value="Coworking Privativo" className="bg-[#0A0A0A]">💻 Sala de Reunião Coworking</option>
                            <option value="Salão de Festas Loft" className="bg-[#0A0A0A]">🎉 Salão de Festas Premium</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/45 uppercase tracking-widest font-bold mb-1">Data</label>
                            <input
                              type="text"
                              value={newReservationDate}
                              onChange={(e) => setNewReservationDate(e.target.value)}
                              placeholder="Hoje, Amanhã, 28/06"
                              className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] text-white/45 uppercase tracking-widest font-bold mb-1">Horário (Slot)</label>
                            <select
                              value={newReservationSlot}
                              onChange={(e) => setNewReservationSlot(e.target.value)}
                              className="w-full bg-black text-white border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                            >
                              <option value="09:00 - 11:00">09:00 - 11:00</option>
                              <option value="11:00 - 13:00">11:00 - 13:00</option>
                              <option value="13:00 - 15:00">13:00 - 15:00</option>
                              <option value="15:00 - 17:00">15:00 - 17:00</option>
                              <option value="18:00 - 20:00">18:00 - 20:00</option>
                              <option value="20:00 - 22:00">20:00 - 22:00</option>
                            </select>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const res = {
                              id: "res-" + Date.now(),
                              amenity: newReservationAmenity,
                              date: newReservationDate || "Hoje",
                              slot: newReservationSlot,
                              status: "confirmado" as const
                            };
                            setResidentReservations([res, ...residentReservations]);
                            setNewReservationDate("");
                            alert(`Reserva de ${newReservationAmenity} efetuada com sucesso!`);
                          }}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-lg transition-all cursor-pointer"
                        >
                          Confirmar Reserva
                        </button>
                      </div>
                    </div>

                    {/* Active bookings list */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Minhas Reservas Solicitadas</span>

                      {residentReservations.length === 0 ? (
                        <p className="text-[11px] text-white/30 text-center py-2">Nenhuma reserva ativa.</p>
                      ) : (
                        residentReservations.map((res) => (
                          <div
                            key={res.id}
                            className="bg-black border border-white/5 rounded-xl p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-base">
                                {res.amenity.includes("Gourmet") ? "🥩" : res.amenity.includes("Lavanderia") || res.amenity.includes("Uso da") ? "🧺" : res.amenity.includes("Jogos") ? "🎮" : res.amenity.includes("Coworking") ? "💻" : res.amenity.includes("Festas") ? "🎉" : "🏢"}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-white">{res.amenity}</h5>
                                <p className="text-[9px] text-white/40">{res.date} às {res.slot}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <span className="text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                Confirmada
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Deseja cancelar este agendamento?")) {
                                    setResidentReservations(residentReservations.filter(r => r.id !== res.id));
                                  }
                                }}
                                className="text-white/40 hover:text-red-500 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 5. MURAL / AVISOS TAB */}
                {residentAppTab === "mural" && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-base font-black text-white">📣 Mural & Comunicados</h3>
                      <p className="text-[10px] text-white/40">Fique por dentro das últimas notícias e mantenha contato.</p>
                    </div>

                    {/* Feed of notices */}
                    <div className="space-y-3">
                      <div className="bg-[#111111] border border-white/5 p-4 rounded-xl space-y-2 relative overflow-hidden">
                        <span className="absolute right-3 top-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Urgente
                        </span>
                        <h4 className="text-xs font-bold text-white">Manutenção Preventiva de Elevador</h4>
                        <p className="text-[10px] text-white/60 leading-relaxed">
                          No dia 29/06 (Segunda), das 09:00 às 12:00, o Elevador Social do Bloco A estará interditado para manutenção mecânica preventiva e troca de cabos de tração.
                        </p>
                        <p className="text-[8px] text-white/30">Enviado pela Administração em 26/06</p>
                      </div>

                      <div className="bg-[#111111] border border-white/5 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-white">Dedetização Anual Obrigatória</h4>
                        <p className="text-[10px] text-white/60 leading-relaxed">
                          A dedetização semestral das áreas de garagem, subsolos, hall e lixeiras coletivas será efetuada na próxima sexta-feira. Pedimos atenção especial para animais domésticos.
                        </p>
                        <p className="text-[8px] text-white/30">Enviado pela Portaria em 25/06</p>
                      </div>

                      <div className="bg-[#111111] border border-white/5 p-4 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-white">Novo Roteador Fibra no Coworking</h4>
                        <p className="text-[10px] text-white/60 leading-relaxed">
                          Foi efetuada a atualização do roteador Wi-Fi 6 e cabeamento de fibra de 1Gbps no espaço Coworking (Térreo). Acesso livre para todos os moradores do LOFT Alphaville.
                        </p>
                        <p className="text-[8px] text-white/30">Enviado pelo Síndico em 22/06</p>
                      </div>
                    </div>

                    {/* Contact List */}
                    <div className="bg-black border border-white/10 rounded-xl p-3.5 space-y-2">
                      <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Contatos do Condomínio</h4>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                          <span className="text-white/60">Portaria Física:</span>
                          <strong className="text-amber-500 font-bold">Ramal 1000</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-white/5 text-[11px]">
                          <span className="text-white/60">Recepção / Concierge:</span>
                          <strong className="text-amber-500 font-bold">Ramal 2002</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. LAVANDERIA COLETIVA (FICHAS) */}
                {residentAppTab === "lavanderia" && (() => {
                  const requestedThisWeek = laundryRequests
                    .filter(r => r.apt === activeResidentApartment?.numero && r.status !== "cancelado")
                    .reduce((sum, r) => sum + r.qty, 0);
                  const remainingQuota = Math.max(0, 4 - requestedThisWeek);

                  return (
                    <div className="space-y-5 animate-fade-in">
                      <div>
                        <h3 className="text-base font-black text-white flex items-center gap-2">
                          <span>🧺 Lavanderia Compartilhada</span>
                          <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black tracking-wider uppercase">Fichas Físicas</span>
                        </h3>
                        <p className="text-[10px] text-white/40">Gerenciador de requisição de fichas físicas para moradores do LOFT Alphaville.</p>
                      </div>

                      {/* Quota Wallet Card */}
                      <div className="bg-gradient-to-br from-amber-500/10 via-black to-[#0A0A0A] border border-amber-500/20 rounded-2xl p-4 shadow-xl relative overflow-hidden">
                        <div className="absolute right-4 top-4 text-amber-500/5"><Sparkles className="w-16 h-16" /></div>
                        <span className="text-[8px] font-mono font-bold text-amber-500 uppercase tracking-widest block mb-2">Sua Cota Semanal de Fichas</span>
                        
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <span className="text-2xl font-black text-white">{remainingQuota} <span className="text-xs font-normal text-white/55">restantes</span></span>
                            <p className="text-[10px] text-white/40 mt-1">Limite semanal de 4 fichas por apartamento (incluso no condomínio).</p>
                          </div>
                          <div className="bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-center shrink-0">
                            <span className="text-[11px] text-white/50 block font-bold">Solicitadas</span>
                            <span className="text-xl font-black text-amber-500 block leading-none mt-1">{requestedThisWeek} / 4</span>
                          </div>
                        </div>

                        {remainingQuota > 0 ? (
                          <div className="mt-4 pt-3 border-t border-white/10">
                            <button
                              onClick={() => {
                                const qtyStr = prompt(`Quantas fichas deseja solicitar para esta semana? (Máximo restante: ${remainingQuota})`, remainingQuota.toString());
                                const qty = parseInt(qtyStr || "0");
                                if (isNaN(qty) || qty <= 0) {
                                  return;
                                }
                                if (qty > remainingQuota) {
                                  alert(`Você só pode solicitar no máximo mais ${remainingQuota} fichas esta semana.`);
                                  return;
                                }
                                const newReq = {
                                  id: "req-" + Date.now(),
                                  residentName: activeResident?.nome || "Morador",
                                  apt: activeResidentApartment?.numero || "S/U",
                                  bloc: activeResidentApartment?.bloco || "X",
                                  qty,
                                  status: "pendente" as const,
                                  date: "Hoje às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                };
                                setLaundryRequests([newReq, ...laundryRequests]);
                                alert(`Solicitação de ${qty} fichas físicas enviada para a Portaria! Você poderá ir retirá-las assim que forem liberadas.`);
                              }}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-black py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                            >
                              Solicitar Fichas Físicas
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 text-center bg-red-500/10 border border-red-500/20 rounded-xl p-2.5">
                            <p className="text-[10px] text-red-400 font-bold">Limite semanal atingido! Sua cota de 4 fichas foi totalmente consumida.</p>
                          </div>
                        )}
                      </div>

                      {/* Request History */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Minhas Solicitações de Fichas</span>
                        
                        {laundryRequests.filter(r => r.apt === activeResidentApartment?.numero).length === 0 ? (
                          <p className="text-[10px] text-white/30 text-center py-4 bg-black/35 rounded-xl border border-white/5">Nenhuma solicitação feita recentemente.</p>
                        ) : (
                          <div className="space-y-2">
                            {laundryRequests.filter(r => r.apt === activeResidentApartment?.numero).map((req) => (
                              <div key={req.id} className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-extrabold text-white">Solicitação de {req.qty} {req.qty === 1 ? "Ficha" : "Fichas"}</p>
                                  <p className="text-[8px] text-white/30 mt-0.5">{req.date}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    req.status === "pendente" 
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                                      : req.status === "aprovado" 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse" 
                                        : req.status === "entregue" 
                                          ? "bg-zinc-800 text-white/50 border-white/10" 
                                          : "bg-red-500/10 text-red-400 border-red-500/20"
                                  }`}>
                                    {req.status === "pendente" && "⏳ Pendente"}
                                    {req.status === "aprovado" && "🟢 Pronto para Retirada!"}
                                    {req.status === "entregue" && "✓ Fichas Retiradas"}
                                    {req.status === "cancelado" && "✕ Cancelado"}
                                  </span>
                                  {req.status === "pendente" && (
                                    <button
                                      onClick={() => {
                                        if (confirm("Deseja cancelar esta solicitação?")) {
                                          setLaundryRequests(laundryRequests.map(r => r.id === req.id ? { ...r, status: "cancelado" as const } : r));
                                        }
                                      }}
                                      className="text-white/30 hover:text-red-400 text-[10px] font-bold px-1 py-0.5 cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Explanatory section */}
                      <div className="bg-[#111]/60 border border-white/5 p-3.5 rounded-xl space-y-2 text-[10px] text-white/50 leading-relaxed">
                        <h6 className="font-black text-white text-[11px] flex items-center gap-1">
                          <span>⚠️</span> Como funciona a lavanderia do LOFT Alphaville:
                        </h6>
                        <p>• As lavadoras e secadoras são de **fichas físicas** que devem ser inseridas no painel de cada aparelho.</p>
                        <p>• O morador tem direito a **4 fichas gratuitas por semana** (cota já incluída na taxa padrão do condomínio).</p>
                        <p>• Solicite as fichas através deste painel. Assim que o porteiro liberar, o status mudará para **Pronto para Retirada** e você poderá ir buscá-las pessoalmente na portaria física.</p>
                      </div>
                    </div>
                  );
                })()}

                {/* 7. INFORMATIVO ACADEMIA TAB */}
                {residentAppTab === "academia" && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>🏋️‍♂️ Academia (Fitness LOFT)</span>
                        <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-bold tracking-wider">Térreo</span>
                      </h3>
                      <p className="text-[10px] text-white/40">Guia de funcionamento, horários recomendados e reporte de problemas.</p>
                    </div>

                    {/* Operational Info Card */}
                    <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl p-4 flex justify-between items-center gap-3">
                      <div>
                        <span className="text-[8px] font-mono font-bold text-amber-500 uppercase tracking-widest block">HORÁRIO DE FUNCIONAMENTO</span>
                        <h4 className="text-xl font-black text-white mt-0.5">Disponível 24 Horas</h4>
                        <p className="text-[10px] text-white/40 mt-1">Acesso livre via reconhecimento facial ou chave digital do morador.</p>
                      </div>
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 shrink-0">
                        <Clock className="w-6 h-6 text-amber-500" />
                      </div>
                    </div>

                    {/* Peak Hours Guide */}
                    <div className="bg-black border border-white/5 rounded-xl p-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📊 Estimativa de Movimento Recomendado</span>
                      </h4>
                      <p className="text-[10px] text-white/40 leading-tight">Organize seus treinos evitando horários de pico habituais no condomínio:</p>
                      
                      <div className="space-y-2.5 pt-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70 font-mono">🌅 05:00 - 07:00</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">🟢 Muito Tranquilo</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70 font-mono">🌅 07:00 - 09:00</span>
                          <span className="text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-[10px] border border-amber-500/20">🟡 Fluxo Moderado</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70 font-mono">☀️ 09:00 - 17:00</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">🟢 Muito Tranquilo</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70 font-mono">🌆 17:00 - 21:00</span>
                          <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded text-[10px] border border-red-500/20">🔴 Horário de Pico</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/70 font-mono">🌙 21:00 - 00:00</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] border border-emerald-500/20">🟢 Muito Tranquilo</span>
                        </div>
                      </div>
                    </div>

                    {/* Report Equipment Issue form */}
                    <div className="bg-black border border-white/10 rounded-xl p-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔧 Relatar Problema em Equipamento</span>
                      </h4>
                      <p className="text-[10px] text-white/40">Notifique a portaria caso encontre algum aparelho quebrado ou precisando de reparos.</p>
                      
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const equipamento = formData.get("equipamento") as string;
                          const descricao = formData.get("descricao") as string;
                          if (!equipamento || !descricao) {
                            alert("Por favor, preencha todos os campos.");
                            return;
                          }
                          
                          const newIssue = {
                            id: "issue-" + Date.now(),
                            equipamento,
                            descricao,
                            morador: `${activeResident?.nome || "Morador"} (Apto ${activeResidentApartment?.numero || "S/U"})`,
                            data: "Hoje",
                            status: "pendente" as const
                          };
                          setGymIssues([newIssue, ...gymIssues]);
                          alert(`Seu reporte sobre o equipamento "${equipamento}" foi enviado para a portaria. Obrigado por ajudar a manter o condomínio em ordem!`);
                          e.currentTarget.reset();
                        }}
                        className="space-y-3 text-xs pt-1"
                      >
                        <div>
                          <label className="text-white/50 text-[10px] block mb-1">Qual equipamento possui defeito?</label>
                          <select 
                            name="equipamento"
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white font-bold cursor-pointer focus:outline-none focus:border-amber-500"
                          >
                            <option value="Esteira 1">🏃‍♂️ Esteira 1</option>
                            <option value="Esteira 2">🏃‍♂️ Esteira 2</option>
                            <option value="Bicicleta Ergométrica">🚴‍♂️ Bicicleta Ergométrica</option>
                            <option value="Elíptico">🌀 Elíptico</option>
                            <option value="Multi-estação de Peso">🏋️‍♂️ Multi-estação de Peso</option>
                            <option value="Ar Condicionado">❄️ Ar Condicionado / Climatizador</option>
                            <option value="Outro Acessório">⚙️ Outro acessório / Halteres</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-white/50 text-[10px] block mb-1">Descrição detalhada do problema:</label>
                          <textarea 
                            name="descricao"
                            required
                            placeholder="Descreva aqui o defeito encontrado..."
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white h-16 focus:outline-none focus:border-amber-500 resize-none"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Enviar Reporte de Problema
                        </button>
                      </form>
                    </div>

                    {/* Gym General Rules */}
                    <div className="bg-[#111]/40 border border-white/5 p-3 rounded-xl space-y-1.5 text-[10px] text-white/50 leading-relaxed">
                      <h6 className="font-bold text-white text-[10.5px]">📋 Regras Essenciais da Academia:</h6>
                      <p>• Higienize os estofados e apoios de mão com álcool e toalha de papel após usar.</p>
                      <p>• Guarde os pesos e anilhas nos suportes corretos para evitar acidentes.</p>
                      <p>• Uso obrigatório de calçado fechado (tênis) e toalha de treino.</p>
                    </div>
                  </div>
                )}

                {/* 8. MAIS MENU / SERVICOS TAB */}
                {residentAppTab === "mais" && (
                  <div className="space-y-5 animate-fade-in">
                    <div>
                      <h3 className="text-base font-black text-white">⚙️ Serviços & Configurações</h3>
                      <p className="text-[10px] text-white/40">Outras facilidades do Condomínio LOFT Alphaville.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* 1. Entregas */}
                      <button
                        onClick={() => setResidentAppTab("encomendas")}
                        className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between h-24 group relative overflow-hidden"
                      >
                        <div className="text-xl group-hover:scale-110 transition-transform">📦</div>
                        {residentDeliveries.filter(d => d.status === "AGUARDANDO").length > 0 && (
                          <span className="absolute top-3 right-3 bg-amber-500 text-black font-black text-[8px] px-1.5 py-0.5 rounded-full animate-pulse">
                            {residentDeliveries.filter(d => d.status === "AGUARDANDO").length}
                          </span>
                        )}
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Entregas</h4>
                          <p className="text-[8px] text-white/40">Encomendas pendentes</p>
                        </div>
                      </button>

                      {/* 2. Controle de Acessos */}
                      <button
                        onClick={() => setResidentAppTab("acesso")}
                        className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between h-24 group"
                      >
                        <div className="text-xl group-hover:scale-110 transition-transform">🔑</div>
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Acessos</h4>
                          <p className="text-[8px] text-white/40">Autorizar visitantes</p>
                        </div>
                      </button>

                      {/* 3. Mural de Avisos */}
                      <button
                        onClick={() => setResidentAppTab("mural")}
                        className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between h-24 group"
                      >
                        <div className="text-xl group-hover:scale-110 transition-transform">📣</div>
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Mural</h4>
                          <p className="text-[8px] text-white/40">Avisos e comunicados</p>
                        </div>
                      </button>

                      {/* 4. Finanças & Boletos */}
                      <button
                        onClick={() => {
                          alert("Código de barras copiado! Use o app do seu banco para efetuar o pagamento do boleto simulado:\n\n34191.79001 01043.513184 91020.150008 7 98120000115000");
                        }}
                        className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 rounded-xl p-3 text-left transition-all cursor-pointer flex flex-col justify-between h-24 group"
                      >
                        <div className="text-xl group-hover:scale-110 transition-transform">💳</div>
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Boletos</h4>
                          <p className="text-[8px] text-white/40">Taxa condominial em aberto</p>
                        </div>
                      </button>
                    </div>

                    {/* Simulated Finance section inside Mais directly if shown */}
                    <div className="bg-[#111] border border-white/5 rounded-xl p-3.5 space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-amber-500" />
                          <span>Boleto Aberto</span>
                        </span>
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Venc: 10/07</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <h5 className="text-[10px] font-bold text-white">Taxa Condominial Junho</h5>
                          <p className="text-[8px] text-white/40">Unidade {activeResidentApartment?.numero}</p>
                        </div>
                        <strong className="text-xs font-black text-amber-500">R$ 1.150,00</strong>
                      </div>

                      <button
                        onClick={() => {
                          alert("Código de barras copiado!\n\n34191.79001 01043.513184 91020.150008 7 98120000115000");
                        }}
                        className="w-full py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar Código de Barras</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Navigation Tab Bar */}
              <div className="border-t border-white/10 bg-[#090909] px-1 py-1.5 flex justify-around items-center shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setResidentAppTab("home")}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    residentAppTab === "home" ? "text-amber-500 scale-105" : "text-white/30 hover:text-white"
                  }`}
                >
                  <Home className="w-4 h-4 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Início</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResidentAppTab("lavanderia")}
                  className={`flex flex-col items-center gap-1 transition-all relative cursor-pointer ${
                    residentAppTab === "lavanderia" ? "text-amber-500 scale-105" : "text-white/30 hover:text-white"
                  }`}
                >
                  {laundryRequests.filter(r => r.status === "pendente" && r.apt === activeResidentApartment?.numero).length > 0 && (
                    <span className="absolute -top-1 right-3.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  )}
                  <Coffee className="w-4 h-4 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Lavanderia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResidentAppTab("academia")}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    residentAppTab === "academia" ? "text-amber-500 scale-105" : "text-white/30 hover:text-white"
                  }`}
                >
                  <Dumbbell className="w-4 h-4 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Academia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResidentAppTab("reservas")}
                  className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    residentAppTab === "reservas" ? "text-amber-500 scale-105" : "text-white/30 hover:text-white"
                  }`}
                >
                  <Calendar className="w-4 h-4 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Reservas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResidentAppTab("mais")}
                  className={`flex flex-col items-center gap-1 transition-all relative cursor-pointer ${
                    residentAppTab === "mais" ? "text-amber-500 scale-105" : "text-white/30 hover:text-white"
                  }`}
                >
                  {residentDeliveries.filter(d => d.status === "AGUARDANDO").length > 0 && (
                    <span className="absolute -top-1 right-2.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse border border-[#090909]" />
                  )}
                  <Menu className="w-4 h-4 stroke-[2]" />
                  <span className="text-[8px] font-bold uppercase tracking-wider">Mais</span>
                </button>
              </div>

              {/* iPhone Home Indicator Bar */}
              <div className="h-6 shrink-0 flex items-center justify-center">
                <div className="w-32 h-1 bg-[#1a1a1a] rounded-full" />
              </div>

            </div>

          </div>
        )}

      </main>

      {/* ========================================== */}
      {/* WHATSAPP PUSH SMS BROADCAST CENTER         */}
      {/* ========================================== */}
      {activeNotificationToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-black border border-white/10 rounded-2xl shadow-2xl p-4 animate-slide-up ring-4 ring-amber-500/10">
          
          {/* Header WhatsApp branding */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
              <span className="text-[10px] font-extrabold text-amber-500 tracking-wider uppercase font-mono">
                WhatsApp Cloud API (Meta)
              </span>
            </div>
            <button
              onClick={() => setActiveNotificationToast(null)}
              className="text-white/40 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start space-x-3">
            {/* Contact avatar */}
            <div className="w-9 h-9 bg-amber-500/15 border border-amber-500/20 text-amber-500 font-extrabold flex items-center justify-center text-xs rounded-full shrink-0">
              CR
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-white">CA.RO — Portaria LOFT</h5>
                <span className="text-[8px] text-white/40 font-mono">Agora</span>
              </div>
              <p className="text-[10px] text-white/40">Para: {activeNotificationToast.residentName} ({activeNotificationToast.phone})</p>
              
              {/* Message Bubble styled like WhatsApp dark */}
              <div className="bg-[#0A0A0A] border border-white/5 p-3 rounded-xl rounded-tl-none mt-2 text-xs leading-relaxed space-y-1.5 text-white/80">
                
                {activeNotificationToast.type === "new" ? (
                  <>
                    <p className="font-bold text-white">📦 Olá! Sua encomenda chegou na Portaria.</p>
                    <p>Fizemos o recebimento digital para você:</p>
                    <div className="pl-2.5 border-l-2 border-amber-500 text-[11px] text-white/60 space-y-0.5 my-1">
                      <p><strong>Remetente:</strong> {activeNotificationToast.sender}</p>
                      <p><strong>Via:</strong> {activeNotificationToast.courier}</p>
                      <p><strong>Código:</strong> LOFT-{activeNotificationToast.id.substring(5, 9).toUpperCase()}</p>
                    </div>
                    <p>📍 Por favor, venha retirar na Portaria levando o seu celular.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-amber-500">⚠️ Lembrete de Encomenda Parada!</p>
                    <p>Você tem uma encomenda aguardando retirada há mais de 48 horas:</p>
                    <div className="pl-2.5 border-l-2 border-amber-500 text-[11px] text-white/60 space-y-0.5 my-1">
                      <p><strong>Remetente:</strong> {activeNotificationToast.sender}</p>
                    </div>
                    <p>Ajude-nos a manter a portaria organizada!</p>
                  </>
                )}

                {/* Display Thumbnail in WhatsApp bubble if has url */}
                {activeNotificationToast.photoUrl && (
                  <div className="rounded-lg overflow-hidden border border-white/10 h-20 bg-black mt-2">
                    <img src={activeNotificationToast.photoUrl} alt="Visualização" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: COLLECT HANDOVER / WITHDRAWAL FLOW */}
      {/* ========================================== */}
      {deliveryToHandover && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          
          {/* METHOD SELECTION SCREEN */}
          {handoverMethod === "select" && (
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Como deseja retirar a encomenda?</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">APT {deliveryToHandover.apartment?.numero || "S/N"} — Bloco {deliveryToHandover.apartment?.bloco || "-"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeliveryToHandover(null)}
                  className="text-white/40 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Package Details Preview */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex gap-4 items-center">
                {deliveryToHandover.foto_url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-black shrink-0">
                    <img src={deliveryToHandover.foto_url} alt="Pacote" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Building className="w-6 h-6 text-white/20" />
                  </div>
                )}
                <div className="space-y-1 text-xs text-white/60">
                  <p>Remetente: <strong className="text-white">{deliveryToHandover.remetente}</strong></p>
                  <p>Transportadora: <strong className="text-white">{deliveryToHandover.transportadora}</strong></p>
                  {deliveryToHandover.urgente && (
                    <span className="inline-block mt-1 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded">
                      ⚠️ RETIRADA CRÍTICA / URGENTE
                    </span>
                  )}
                </div>
              </div>

              {/* Options list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* METHOD 1: TRADITIONAL SIGNATURE */}
                <button
                  type="button"
                  onClick={() => setHandoverMethod("signature")}
                  className="bg-black hover:bg-amber-500/[0.02] border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 text-left transition-all cursor-pointer group flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-all">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-amber-500 transition-all">Assinatura Digital</h4>
                      <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                        O morador confirma o recebimento assinando na tela do tablet ou celular de forma clássica.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-500/80 group-hover:text-amber-500 flex items-center gap-1">
                    Continuar para tela <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

                {/* METHOD 2: MODERN QR CODE HANDSHAKE */}
                <button
                  type="button"
                  onClick={() => {
                    setHandoverMethod("qrcode");
                    setScannedResident(null);
                  }}
                  className="bg-black hover:bg-emerald-500/[0.02] border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 text-left transition-all cursor-pointer group flex flex-col justify-between h-44"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-white group-hover:text-emerald-400 transition-all">Autenticação por QR Code</h4>
                      <p className="text-[11px] text-white/50 leading-relaxed mt-1">
                        O morador mostra o QR Code do apartamento gerado pelo aplicativo. O sistema valida e libera instantaneamente.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400/80 group-hover:text-emerald-400 flex items-center gap-1">
                    Abrir leitor QR <ArrowRight className="w-3 h-3" />
                  </span>
                </button>

              </div>

              <div className="flex items-center justify-end pt-3 border-t border-white/5 text-center">
                <button
                  onClick={() => setDeliveryToHandover(null)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#111111] hover:bg-white/5 text-white/80 font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
                >
                  Voltar para Painel
                </button>
              </div>
            </div>
          )}

          {/* MODE: DIGITAL SIGNATURE PAD */}
          {handoverMethod === "signature" && (
            <SignaturePad
              defaultReceiverName={deliveryToHandover.residents?.[0]?.nome || ""}
              residentsList={deliveryToHandover.residents?.map((r) => ({ id: r.id, nome: r.nome })) || []}
              onCancel={() => setHandoverMethod("select")}
              onSave={(signatureDataUrl, receiverName, isThirdParty) =>
                handleSignatureHandover(signatureDataUrl, receiverName, isThirdParty)
              }
            />
          )}

          {/* MODE: RESIDENT QR CODE SCANNER SIMULATOR */}
          {handoverMethod === "qrcode" && (
            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Validação por QR Code</h3>
                </div>
                <button
                  onClick={() => {
                    setDeliveryToHandover(null);
                    setScannedResident(null);
                  }}
                  className="text-white/40 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Animated camera simulation screen */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black flex flex-col items-center justify-center p-4">
                
                {scannedResident ? (
                  // Validation Success Screen
                  <div className="space-y-3 text-center z-10 animate-in fade-in scale-in duration-300">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-emerald-400 font-extrabold text-xs uppercase tracking-widest font-mono">✓ QR CODE AUTENTICADO</p>
                      <h4 className="text-white font-bold text-sm mt-1">{scannedResident.nome}</h4>
                      <p className="text-[10px] text-white/40 mt-0.5">Apartamento Autorizado: APT {deliveryToHandover.apartment?.numero}</p>
                    </div>
                  </div>
                ) : (
                  // Waiting for Scan Screen
                  <div className="space-y-3 text-center z-10">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mx-auto animate-pulse">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white/80">Aponte o QR Code para a câmera</p>
                      <p className="text-[10px] text-white/40 max-w-[260px] mx-auto leading-relaxed">
                        Apresente o QR Code do apartamento gerado no dispositivo móvel do morador.
                      </p>
                    </div>
                  </div>
                )}

                {/* Laser scan lines & camera focus marks */}
                <div className={`absolute inset-0 border-2 ${scannedResident ? 'border-emerald-500/20' : 'border-white/5'} pointer-events-none rounded-xl m-2 transition-all`}>
                  <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${scannedResident ? 'border-emerald-500' : 'border-amber-500'}`} />
                  <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${scannedResident ? 'border-emerald-500' : 'border-amber-500'}`} />
                  <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${scannedResident ? 'border-emerald-500' : 'border-amber-500'}`} />
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${scannedResident ? 'border-emerald-500' : 'border-amber-500'}`} />
                  
                  {!scannedResident && (
                    <div className="absolute left-0 right-0 h-0.5 bg-amber-500/40 shadow-md shadow-amber-500/40 top-1/2 -translate-y-1/2 animate-bounce" />
                  )}
                </div>
              </div>

              {/* Simulation triggers: select from apartment residents to simulate scan */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Dispositivo do Morador (Simulação de Apresentação de QR Code):
                </label>

                {/* AUTOMATED AUTODETECT BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    // Automatically detect the active resident in the smartphone simulator
                    const matchingResident = deliveryToHandover.residents?.find(r => r.id === selectedResidentId);
                    if (matchingResident) {
                      setScannedResident(matchingResident);
                    } else {
                      // If the smartphone simulator has a different apartment logged in
                      const activeRes = apartments.flatMap(a => a.residents || []).find(r => r.id === selectedResidentId);
                      alert(`DIVERGÊNCIA DE UNIDADE!\n\nO QR Code apresentado pertence a ${activeRes?.nome || "outro morador"} do apartamento ${apartments.find(a => a.id === activeRes?.apartamento_id)?.numero || "divergente"}.\n\nEste pacote é destinado ao apartamento ${deliveryToHandover.apartment?.numero}!`);
                    }
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer mb-2"
                >
                  <QrCode className="w-4 h-4 stroke-[2.5]" />
                  <span>📸 Escanear QR Code Ativo na Tela do Celular (Automático)</span>
                </button>

                <div className="text-center py-1 text-[10px] text-white/30 border-b border-white/5 mb-2">
                  Ou selecione manualmente abaixo um dos moradores cadastrados para simular o escaneamento físico:
                </div>
                
                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                  {deliveryToHandover.residents && deliveryToHandover.residents.length > 0 ? (
                    deliveryToHandover.residents.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => setScannedResident(res)}
                        className={`border rounded-xl p-3 text-left transition-all flex items-center justify-between group cursor-pointer ${
                          scannedResident?.id === res.id 
                            ? 'bg-emerald-500/10 border-emerald-500/40' 
                            : 'bg-black border-white/5 hover:border-emerald-500/30'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-xs text-white group-hover:text-emerald-400 transition-all">{res.nome}</p>
                          <p className="text-[9px] text-white/40 mt-0.5">Contato cadastrado: {res.telefone || "Sem telefone"}</p>
                        </div>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                          scannedResident?.id === res.id 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-white/5 text-white/30 border-white/5 group-hover:text-emerald-400'
                        }`}>
                          <QrCode className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 bg-black border border-white/5 rounded-xl text-white/40 text-xs">
                      Nenhum morador cadastrado para este apartamento para simulação.
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setHandoverMethod("select");
                    setScannedResident(null);
                  }}
                  className="px-4 py-2 bg-[#111111] hover:bg-white/5 text-white/70 hover:text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
                >
                  Voltar
                </button>

                {scannedResident ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Retrieve current active doorman's name
                      const activePorteiroObj = porteiros.find((p) => p.id === selectedPorteiro);
                      const activePorteiroName = activePorteiroObj ? activePorteiroObj.nome : "Porteiro de Plantão";
                      
                      // Generate high-fidelity canvas stamp proof
                      const stampUrl = generateQrCodeBadgeImage(
                        scannedResident.nome,
                        deliveryToHandover.apartment?.numero || "S/N",
                        deliveryToHandover.apartment?.bloco || "-",
                        activePorteiroName
                      );

                      // Deliver package immediately
                      handleSignatureHandover(stampUrl, scannedResident.nome, false);
                      setScannedResident(null);
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Liberar Entrega</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-5 py-2.5 bg-white/5 text-white/20 border border-white/10 font-extrabold rounded-xl text-xs cursor-not-allowed"
                  >
                    Aguardando QR Code
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: RESIDENT APARTMENT QR CODE          */}
      {/* ========================================== */}
      {moradorQRModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-white/40 uppercase tracking-widest">QR Code Individual do Morador</span>
              <button
                onClick={() => setMoradorQRModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/60 leading-normal">
              Apresente este QR Code pessoal na câmera do porteiro. O sistema identificará automaticamente você e as encomendas de sua residência, com <strong>Zero Papel</strong>.
            </p>

            {/* QR Code fetched dynamically from free API */}
            <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CAROLOFT-RES-${activeResident?.id || "unknown"}`}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">APT {activeResidentApartment?.numero} - BLOCO {activeResidentApartment?.bloco}</h4>
              <p className="text-sm text-amber-500 mt-1 font-bold">{activeResident?.nome}</p>
              <p className="text-[10px] text-white/40 mt-1 font-mono">ID DISPOSITIVO: CAROLOFT-RES-{activeResident?.id}</p>
            </div>

            <button
              onClick={() => setMoradorQRModal(false)}
              className="w-full py-3 bg-[#111111] hover:bg-white/5 text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
            >
              Fechar QR Code
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: VIEW DIGITAL SIGNATURE (ZERO PAPEL) */}
      {/* ========================================== */}
      {viewSignatureDelivery && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Comprovante Digital (Zero Papel)</span>
              </div>
              <button
                onClick={() => setViewSignatureDelivery(null)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-black rounded-xl border border-white/5 space-y-2">
                <p className="text-xs text-white/60">
                  Apartamento: <strong className="text-white">APT {viewSignatureDelivery.apartment?.numero} (Bloco {viewSignatureDelivery.apartment?.bloco})</strong>
                </p>
                <p className="text-xs text-white/60">
                  Remetente: <strong className="text-white">{viewSignatureDelivery.remetente}</strong>
                </p>
                <p className="text-xs text-white/60">
                  Transportadora: <strong className="text-white">{viewSignatureDelivery.transportadora}</strong>
                </p>
                <p className="text-xs text-white/60">
                  Recebedor Autorizado: <strong className="text-amber-500">{viewSignatureDelivery.signature?.assinado_por}</strong>
                </p>
                <p className="text-[10px] text-white/40 font-mono">
                  Data/Hora Retirada: {viewSignatureDelivery.entregue_em && new Date(viewSignatureDelivery.entregue_em).toLocaleString("pt-BR")}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                  Assinatura Digital Recolhida na Tela
                </label>
                <div className="bg-black border border-white/10 rounded-xl p-4 flex items-center justify-center h-40 relative">
                  {viewSignatureDelivery.signature?.assinatura_url ? (
                    <img
                      src={viewSignatureDelivery.signature.assinatura_url}
                      alt="Assinatura Digital"
                      className="max-h-full max-w-full object-contain filter invert opacity-90"
                    />
                  ) : (
                    <span className="text-xs text-white/20">Sem assinatura cadastrada</span>
                  )}
                  <div className="absolute bottom-2 right-2 text-[9px] uppercase font-mono tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Sincronizado
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewSignatureDelivery(null)}
              className="w-full py-3 bg-[#111111] hover:bg-white/5 text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
            >
              Fechar Comprovante
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EXPORT ADVANCED DATA REPORTS        */}
      {/* ========================================== */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-xl space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Exportador de Relatórios Digitais</h3>
              </div>
              <button
                onClick={() => { setShowExportModal(false); setExportedContent(null); }}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/60 leading-normal">
              Gere relatórios operacionais completos em formato CSV de alta compatibilidade (compatível com Excel, Google Sheets e Numbers).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Período de Tempo</label>
                <select
                  value={exportPeriod}
                  onChange={(e) => { setExportPeriod(e.target.value); setExportedContent(null); }}
                  className="w-full bg-black text-white border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="semana">Últimos 7 dias (Esta Semana)</option>
                  <option value="mes">Últimos 30 dias (Este Mês)</option>
                  <option value="ano">Últimos 12 meses (Este Ano)</option>
                  <option value="todos">Todo o Histórico Gravado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Filtrar por Unidade</label>
                <select
                  value={exportApt}
                  onChange={(e) => { setExportApt(e.target.value); setExportedContent(null); }}
                  className="w-full bg-black text-white border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="todos">Todas as Unidades (Geral)</option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      Apto {apt.numero} ({apt.bloco}) - {apt.residents?.[0]?.nome || "Sem morador"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateReport}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <span>Gerar Relatório Estruturado</span>
            </button>

            {exportedContent && (
              <div className="space-y-3.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                    Relatório CSV Gerado com Sucesso
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportedContent);
                      alert("Relatório CSV copiado para a área de transferência!");
                    }}
                    className="text-[10px] font-bold text-white bg-[#1C1C1C] border border-white/10 px-2.5 py-1 rounded hover:bg-amber-500 hover:text-black transition-all cursor-pointer"
                  >
                    Copiar Dados
                  </button>
                </div>
                
                <textarea
                  readOnly
                  value={exportedContent}
                  rows={6}
                  className="w-full bg-black text-[#888888] font-mono text-[10px] border border-white/10 rounded-xl p-3 focus:outline-none focus:border-amber-500 select-all"
                />
                
                <p className="text-[9px] text-white/30 text-center font-mono">
                  Dica: Salve o texto acima em um arquivo com final ".csv" e abra-o no Excel.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end pt-3 border-t border-white/5">
              <button
                onClick={() => { setShowExportModal(false); setExportedContent(null); }}
                className="px-4 py-2 bg-[#111111] hover:bg-white/5 text-white/70 hover:text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: REGISTER NEW PORTEIRO / DE PLANTAO */}
      {/* ========================================== */}
      {showNewPorteiroModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePorteiro}
            className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">Cadastro de Porteiro (Quem usa)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewPorteiroModal(false)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/60 leading-normal">
              Cadastre e identifique as informações de quem está utilizando o sistema. O novo porteiro será selecionado automaticamente como ativo.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do Porteiro"
                  value={newPorteiroData.nome}
                  onChange={(e) => setNewPorteiroData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full bg-black text-white border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 placeholder-white/25"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ex: +55 (11) 99999-9999"
                  value={newPorteiroData.telefone}
                  onChange={(e) => setNewPorteiroData(prev => ({ ...prev, telefone: e.target.value }))}
                  className="w-full bg-black text-white border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500 placeholder-white/25"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase mb-1.5 tracking-wider">Turno de Trabalho</label>
                <select
                  value={newPorteiroData.turno}
                  onChange={(e) => setNewPorteiroData(prev => ({ ...prev, turno: e.target.value }))}
                  className="w-full bg-black text-white border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Diurno">Diurno (06:00 - 18:00)</option>
                  <option value="Noturno">Noturno (18:00 - 06:00)</option>
                  <option value="Misto">Misto / Flexível</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowNewPorteiroModal(false)}
                className="px-4 py-2 bg-[#111111] hover:bg-white/5 text-white/70 hover:text-white font-bold rounded-xl text-xs border border-white/10 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/10"
              >
                Salvar Cadastro
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FLOATING QUICK ROLE SWITCHER FOR FASTER ACCESS & MAXIMUM VISIBILITY */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setActiveRole(activeRole === "porteiro" ? "morador" : "porteiro");
            if (activeRole === "porteiro") {
              setResidentAppTab("home");
            }
          }}
          className="flex items-center space-x-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider px-4 py-3 rounded-full shadow-2xl shadow-amber-500/35 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-400/30"
          title="Alternar Perfil instantaneamente"
        >
          {activeRole === "porteiro" ? (
            <>
              <Smartphone className="w-4 h-4 animate-pulse" />
              <span>📱 Ver App Morador</span>
            </>
          ) : (
            <>
              <Laptop className="w-4 h-4 animate-pulse" />
              <span>💻 Ver Painel Portaria</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
