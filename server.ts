import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large JSON bodies for uploading base64 photos and signatures
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini SDK with User-Agent telemetry
const GEMINI_KEY = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (GEMINI_KEY && GEMINI_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: GEMINI_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API successfully initialized on the backend.");
  } catch (error) {
    console.error("Error initializing Gemini API:", error);
  }
} else {
  console.log("Gemini API key not found or using placeholder. Running in fallback OCR simulation mode.");
}

// Database JSON path
const DB_PATH = path.join(process.cwd(), "db.json");

// Initial Database Seed Data
const INITIAL_DATABASE = {
  condominios: [
    {
      id: "condo-1",
      nome: "CA.RO LOFT Alphaville",
      endereco: "Alameda Itapecuru, 515 - Alphaville, Barueri - SP",
      plano: "Premium",
    },
  ],
  apartamentos: [
    { id: "apt-101", condominio_id: "condo-1", numero: "101", bloco: "A", qr_code: "CAROLOFT-APT-101" },
    { id: "apt-102", condominio_id: "condo-1", numero: "102", bloco: "A", qr_code: "CAROLOFT-APT-102" },
    { id: "apt-201", condominio_id: "condo-1", numero: "201", bloco: "A", qr_code: "CAROLOFT-APT-201" },
    { id: "apt-202", condominio_id: "condo-1", numero: "202", bloco: "A", qr_code: "CAROLOFT-APT-202" },
    { id: "apt-301", condominio_id: "condo-1", numero: "301", bloco: "B", qr_code: "CAROLOFT-APT-301" },
    { id: "apt-302", condominio_id: "condo-1", numero: "302", bloco: "B", qr_code: "CAROLOFT-APT-302" },
    { id: "apt-401", condominio_id: "condo-1", numero: "401", bloco: "B", qr_code: "CAROLOFT-APT-401" },
    { id: "apt-402", condominio_id: "condo-1", numero: "402", bloco: "B", qr_code: "CAROLOFT-APT-402" },
  ],
  moradores: [
    { id: "mor-1", apartamento_id: "apt-101", nome: "Ronaldo Silva", telefone: "+55 (11) 98765-4321", email: "ronaldo@exemplo.com" },
    { id: "mor-2", apartamento_id: "apt-101", nome: "Ana Oliveira", telefone: "+55 (11) 98765-1122", email: "ana@exemplo.com" },
    { id: "mor-3", apartamento_id: "apt-102", nome: "Bruno Santos", telefone: "+55 (11) 91234-5678", email: "bruno@exemplo.com" },
    { id: "mor-4", apartamento_id: "apt-201", nome: "Carlos Souza", telefone: "+55 (11) 97777-8888", email: "carlos@exemplo.com" },
    { id: "mor-5", apartamento_id: "apt-202", nome: "Débora Lima", telefone: "+55 (11) 96666-5555", email: "debora@exemplo.com" },
    { id: "mor-6", apartamento_id: "apt-301", nome: "Eduardo Rocha", telefone: "+55 (11) 95555-4444", email: "eduardo@exemplo.com" },
    { id: "mor-7", apartamento_id: "apt-302", nome: "Fernanda Costa", telefone: "+55 (11) 94444-3333", email: "fernanda@exemplo.com" },
    { id: "mor-8", apartamento_id: "apt-401", nome: "Gustavo Santos", telefone: "+55 (11) 93333-2222", email: "gustavo@exemplo.com" },
    { id: "mor-9", apartamento_id: "apt-402", nome: "Isabela Martins", telefone: "+55 (11) 92222-1111", email: "isabela@exemplo.com" },
  ],
  porteiros: [
    { id: "port-1", condominio_id: "condo-1", nome: "Valdir Ramos", telefone: "+55 (11) 99911-2233", turno: "Diurno" },
    { id: "port-2", condominio_id: "condo-1", nome: "Marcos Souza", telefone: "+55 (11) 99922-3344", turno: "Noturno" },
  ],
  encomendas: [
    {
      id: "enc-1",
      apartamento_id: "apt-101",
      porteiro_id: "port-1",
      foto_url: "", // base64 placeholder or mock
      remetente: "Mercado Livre",
      transportadora: "Loggi",
      status: "AGUARDANDO",
      criado_em: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago (Delayed!)
    },
    {
      id: "enc-2",
      apartamento_id: "apt-201",
      porteiro_id: "port-1",
      foto_url: "",
      remetente: "Amazon BR",
      transportadora: "Sequoia",
      status: "AGUARDANDO",
      criado_em: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
    {
      id: "enc-3",
      apartamento_id: "apt-102",
      porteiro_id: "port-2",
      foto_url: "",
      remetente: "Zara Brasil",
      transportadora: "Correios",
      status: "ENTREGUE",
      criado_em: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      entregue_em: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
      autorizado_terceiro_nome: "",
    }
  ],
  assinaturas: [
    {
      id: "ass-1",
      encomenda_id: "enc-3",
      assinatura_url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='50'><path d='M10,25 Q30,5 50,25 T90,25' fill='none' stroke='white' stroke-width='2'/></svg>",
      assinado_por: "Bruno Santos",
      autorizado_terceiro: false,
      criado_em: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    }
  ],
  notificacoes: [
    {
      id: "not-1",
      encomenda_id: "enc-1",
      morador_id: "mor-1",
      canal: "WHATSAPP",
      status: "ENVIADO",
      enviado_em: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "not-2",
      encomenda_id: "enc-2",
      morador_id: "mor-4",
      canal: "PUSH",
      status: "ENVIADO",
      enviado_em: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    }
  ],
};

// Ensure database file exists
function readDb() {
  try {
    let db;
    if (!fs.existsSync(DB_PATH)) {
      db = INITIAL_DATABASE;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
    } else {
      const raw = fs.readFileSync(DB_PATH, "utf8");
      db = JSON.parse(raw);
    }

    // Ensure we have exactly 142 apartments pre-seeded
    if (!db.apartamentos || db.apartamentos.length < 142) {
      console.log("Detectado menos de 142 apartamentos. Gerando lote completo de 142 apartamentos para LOFT Alphaville...");
      const generatedApts = [];
      for (let i = 1; i <= 142; i++) {
        const floor = Math.ceil(i / 10);
        const unitOnFloor = i % 10 === 0 ? 10 : i % 10;
        const numero = `${floor}${unitOnFloor < 10 ? '0' : ''}${unitOnFloor}`;
        // Floors 1-7 are Block A, Floors 8-15 are Block B
        const bloco = floor <= 7 ? "A" : "B";
        const id = `apt-${numero}`;
        generatedApts.push({
          id,
          condominio_id: "condo-1",
          numero,
          bloco,
          qr_code: `CAROLOFT-APT-${numero}-${bloco}`.toUpperCase()
        });
      }
      db.apartamentos = generatedApts;

      // Ensure core moradores are mapped to their apartments
      if (!db.moradores || db.moradores.length === 0) {
        db.moradores = INITIAL_DATABASE.moradores;
      } else {
        // Ensure they still match the correct generated apt IDs
        db.moradores = db.moradores.map((mor: any) => {
          // If the morador refers to old id patterns, map them
          if (mor.apartamento_id === "apt-1") mor.apartamento_id = "apt-101";
          if (mor.apartamento_id === "apt-2") mor.apartamento_id = "apt-102";
          return mor;
        });
      }

      writeDb(db);
    }
    return db;
  } catch (error) {
    console.error("Failed to read database:", error);
    return INITIAL_DATABASE;
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write database:", error);
  }
}

// Initial check to create the db.json
readDb();

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. Get Apartments & Residents
app.get("/api/apartments", (req, res) => {
  const db = readDb();
  // Map apartments with residents
  const mapped = db.apartamentos.map((apt: any) => {
    const residents = db.moradores.filter((m: any) => m.apartamento_id === apt.id);
    return {
      ...apt,
      residents,
    };
  });
  res.json(mapped);
});

// 2. Get Porteiros
app.get("/api/porteiros", (req, res) => {
  const db = readDb();
  res.json(db.porteiros);
});

// Create new Porteiro (doorman registration)
app.post("/api/porteiros", (req, res) => {
  const { nome, telefone, turno } = req.body;
  if (!nome || !turno) {
    return res.status(400).json({ error: "Nome e turno são obrigatórios para cadastro do porteiro." });
  }

  const db = readDb();
  const newPorteiro = {
    id: `port-${Date.now()}`,
    condominio_id: "condo-1",
    nome,
    telefone: telefone || "",
    turno
  };

  db.porteiros.push(newPorteiro);
  writeDb(db);

  res.status(201).json(newPorteiro);
});

// 3. Get Deliveries (with detailed apartment and resident info)
app.get("/api/deliveries", (req, res) => {
  const db = readDb();
  const deliveriesWithDetails = db.encomendas.map((delivery: any) => {
    const apt = db.apartamentos.find((a: any) => a.id === delivery.apartamento_id);
    const residents = apt ? db.moradores.filter((m: any) => m.apartamento_id === apt.id) : [];
    const porteiro = db.porteiros.find((p: any) => p.id === delivery.porteiro_id);
    const signature = db.assinaturas.find((s: any) => s.encomenda_id === delivery.id);

    return {
      ...delivery,
      apartment: apt,
      residents,
      porteiro,
      signature,
    };
  });
  // Sort descending by creation date
  deliveriesWithDetails.sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  res.json(deliveriesWithDetails);
});

// 4. Create new delivery (from portaria)
app.post("/api/deliveries", (req, res) => {
  const { apartamento_id, porteiro_id, foto_url, remetente, transportadora, urgente, entregador_nome } = req.body;

  if (!apartamento_id || !porteiro_id) {
    return res.status(400).json({ error: "Apartamento e porteiro são obrigatórios." });
  }

  const db = readDb();
  const cleanRemetente = remetente || "Encomenda";
  const cleanTransportadora = transportadora || "Geral";

  const newDelivery = {
    id: `enc-${Date.now()}`,
    apartamento_id,
    porteiro_id,
    foto_url: foto_url || "",
    remetente: cleanRemetente,
    transportadora: cleanTransportadora,
    urgente: !!urgente,
    entregador_nome: entregador_nome || "",
    status: "AGUARDANDO" as const,
    criado_em: new Date().toISOString(),
  };

  db.encomendas.push(newDelivery);

  // Trigger simulated notifications for all residents of this apartment
  const residents = db.moradores.filter((m: any) => m.apartamento_id === apartamento_id);
  residents.forEach((resident: any) => {
    // Generate WhatsApp notification
    db.notificacoes.push({
      id: `not-wa-${Date.now()}-${resident.id}`,
      encomenda_id: newDelivery.id,
      morador_id: resident.id,
      canal: "WHATSAPP",
      status: "ENVIADO",
      enviado_em: new Date().toISOString(),
    });

    // Generate Push notification
    db.notificacoes.push({
      id: `not-push-${Date.now()}-${resident.id}`,
      encomenda_id: newDelivery.id,
      morador_id: resident.id,
      canal: "PUSH",
      status: "ENVIADO",
      enviado_em: new Date().toISOString(),
    });
  });

  writeDb(db);

  // Return delivery with details
  const apt = db.apartamentos.find((a: any) => a.id === apartamento_id);
  const porteiro = db.porteiros.find((p: any) => p.id === porteiro_id);

  res.json({
    ...newDelivery,
    apartment: apt,
    residents,
    porteiro,
  });
});

// 5. Deliver package (with signature digital)
app.put("/api/deliveries/:id/deliver", (req, res) => {
  const { id } = req.params;
  const { assinatura_url, assinado_por, autorizado_terceiro, autorizado_terceiro_nome } = req.body;

  if (!assinatura_url || !assinado_por) {
    return res.status(400).json({ error: "Assinatura e nome do recebedor são obrigatórios." });
  }

  const db = readDb();
  const deliveryIndex = db.encomendas.findIndex((e: any) => e.id === id);

  if (deliveryIndex === -1) {
    return res.status(404).json({ error: "Encomenda não encontrada." });
  }

  const nowString = new Date().toISOString();

  db.encomendas[deliveryIndex] = {
    ...db.encomendas[deliveryIndex],
    status: "ENTREGUE",
    entregue_em: nowString,
    autorizado_terceiro_nome: autorizado_terceiro ? autorizado_terceiro_nome || assinado_por : "",
  };

  const newSignature = {
    id: `ass-${Date.now()}`,
    encomenda_id: id,
    assinatura_url,
    assinado_por,
    autorizado_terceiro: !!autorizado_terceiro,
    criado_em: nowString,
  };

  db.assinaturas.push(newSignature);

  writeDb(db);

  res.json({
    success: true,
    delivery: db.encomendas[deliveryIndex],
    signature: newSignature,
  });
});

// 6. Authorize third-party (from Morador side)
app.put("/api/deliveries/:id/authorize", (req, res) => {
  const { id } = req.params;
  const { terceiro_nome } = req.body;

  if (!terceiro_nome) {
    return res.status(400).json({ error: "Nome do terceiro autorizado é obrigatório." });
  }

  const db = readDb();
  const deliveryIndex = db.encomendas.findIndex((e: any) => e.id === id);

  if (deliveryIndex === -1) {
    return res.status(404).json({ error: "Encomenda não encontrada." });
  }

  db.encomendas[deliveryIndex] = {
    ...db.encomendas[deliveryIndex],
    autorizado_terceiro_nome: terceiro_nome,
  };

  writeDb(db);

  res.json({
    success: true,
    delivery: db.encomendas[deliveryIndex],
  });
});

// 7. Manual reminder trigger (simulate auto reminder for stale packages > 2 days)
app.post("/api/deliveries/:id/remind", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const delivery = db.encomendas.find((e: any) => e.id === id);
  if (!delivery) {
    return res.status(404).json({ error: "Encomenda não encontrada." });
  }

  const residents = db.moradores.filter((m: any) => m.apartamento_id === delivery.apartamento_id);
  const nowString = new Date().toISOString();

  residents.forEach((resident: any) => {
    db.notificacoes.push({
      id: `not-remind-wa-${Date.now()}-${resident.id}`,
      encomenda_id: delivery.id,
      morador_id: resident.id,
      canal: "WHATSAPP",
      status: "ENVIADO",
      enviado_em: nowString,
    });
    db.notificacoes.push({
      id: `not-remind-push-${Date.now()}-${resident.id}`,
      encomenda_id: delivery.id,
      morador_id: resident.id,
      canal: "PUSH",
      status: "ENVIADO",
      enviado_em: nowString,
    });
  });

  writeDb(db);

  res.json({
    success: true,
    message: `Lembrete automático reenviado por WhatsApp e Push para ${residents.length} morador(es).`,
  });
});

// 8. OCR using Gemini API to scan parcel labels
app.post("/api/ocr", async (req, res) => {
  const { image } = req.body; // base64 encoded image string (without header prefix usually, or handled)

  if (!image) {
    return res.status(400).json({ error: "Nenhuma imagem de etiqueta foi fornecida." });
  }

  // Remove the prefix if any
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  // Read current apartments list to pass as context so Gemini can do accurate apartment identification
  const db = readDb();
  const apartmentsList = db.apartamentos.map((apt: any) => {
    const residentsNames = db.moradores
      .filter((m: any) => m.apartamento_id === apt.id)
      .map((m: any) => m.nome)
      .join(", ");
    return {
      id: apt.id,
      numero: apt.numero,
      bloco: apt.bloco,
      moradores: residentsNames,
    };
  });

  if (ai) {
    try {
      console.log("Processing label image with Gemini model 'gemini-3.5-flash'...");

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      };

      const promptString = `
      Você é o assistente inteligente de portaria do CA.RO LOFT. Sua tarefa é analisar a imagem de uma etiqueta de encomenda e extrair dados operacionais precisos.
      
      Por favor, extraia:
      1. 'remetente' (Quem enviou? Ex: Mercado Livre, Amazon, Shopee, SHEIN, Zara, Netshoes, ou nome de pessoa física).
      2. 'transportadora' (Qual transportadora entregou? Ex: Correios, Loggi, Sequoia, Total Express, DHL, FedEx, Jadlog, Mercado Envios, etc.).
      3. 'apartamento_id' (Identifique qual apartamento/morador listado abaixo corresponde ao destinatário descrito na etiqueta).
      4. 'morador_nome' (O nome do morador identificado, se encontrado).
      5. 'confianca' (Sua confiança de 0 a 100 na leitura).

      Aqui está o catálogo de moradores e apartamentos cadastrados no condomínio:
      ${JSON.stringify(apartmentsList, null, 2)}

      Responda ESTRITAMENTE em formato JSON contendo os campos:
      - remetente (string)
      - transportadora (string)
      - apartamento_id (string ou nulo se não houver correspondência clara)
      - morador_nome (string ou nulo se não houver correspondência clara)
      - confianca (number)
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: promptString }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              remetente: { type: Type.STRING, description: "O remetente da encomenda." },
              transportadora: { type: Type.STRING, description: "A transportadora que fez a entrega." },
              apartamento_id: { type: Type.STRING, description: "ID do apartamento correspondente da lista se identificado, ou nulo." },
              morador_nome: { type: Type.STRING, description: "Nome do morador identificado se aplicável, ou nulo." },
              confianca: { type: Type.INTEGER, description: "Percentual de certeza da extração de 0 a 100." }
            },
            required: ["remetente", "transportadora", "confianca"]
          }
        }
      });

      const text = response.text;
      if (text) {
        console.log("OCR Result from Gemini:", text);
        const parsed = JSON.parse(text);
        return res.json(parsed);
      } else {
        throw new Error("No response text from Gemini");
      }
    } catch (error: any) {
      console.error("Gemini OCR failed, returning smart fallback:", error.message || error);
      // Fallback below
    }
  }

  // Fallback / Simulated OCR logic if Gemini fails or key is missing
  console.log("Running simulated AI OCR logic...");
  setTimeout(() => {
    // Generate a random high-quality extraction to simulate realistic portaria OCR
    const senders = ["Mercado Livre", "Amazon BR", "Shopee", "Correios Sedex", "Nespresso", "Dafiti", "Petlove"];
    const couriers = ["Loggi", "Correios", "Sequoia", "Jadlog", "Total Express", "DHL"];
    
    const randomSender = senders[Math.floor(Math.random() * senders.length)];
    const randomCourier = couriers[Math.floor(Math.random() * couriers.length)];
    
    // Randomly pick one of our seed apartments as a matches
    const randomAptIndex = Math.floor(Math.random() * db.apartamentos.length);
    const selectedApt = db.apartamentos[randomAptIndex];
    const aptResidents = db.moradores.filter((m: any) => m.apartamento_id === selectedApt.id);
    const selectedResident = aptResidents[0];

    res.json({
      remetente: randomSender,
      transportadora: randomCourier,
      apartamento_id: selectedApt.id,
      morador_nome: selectedResident ? selectedResident.nome : null,
      confianca: 85,
      simulated: true,
    });
  }, 1200);
});

// ==========================================
// DEVELOPER & SYSTEM CONTROL ENDPOINTS
// ==========================================

// Get entire database raw JSON
app.get("/api/dev/db", (req, res) => {
  const db = readDb();
  res.json(db);
});

// Reset database to initial seed values
app.post("/api/dev/db/reset", (req, res) => {
  writeDb(INITIAL_DATABASE);
  res.json({ message: "Banco de dados resetado para as configurações padrão!", db: INITIAL_DATABASE });
});

// Save/Overwrite entire database
app.post("/api/dev/db/save", (req, res) => {
  const newDb = req.body;
  if (!newDb || typeof newDb !== "object") {
    return res.status(400).json({ error: "Dados inválidos." });
  }
  writeDb(newDb);
  res.json({ message: "Banco de dados atualizado com sucesso!", db: newDb });
});

// Create brand new apartment
app.post("/api/apartments", (req, res) => {
  const { numero, bloco } = req.body;
  if (!numero || !bloco) {
    return res.status(400).json({ error: "Número e bloco são obrigatórios." });
  }

  const db = readDb();
  
  // Check if apartment already exists
  const exists = db.apartamentos.some((a: any) => a.numero === numero && a.bloco === bloco);
  if (exists) {
    return res.status(400).json({ error: `O apartamento ${numero} do Bloco ${bloco} já está cadastrado.` });
  }

  const id = `apt-${Date.now()}`;
  const newApt = {
    id,
    condominio_id: "condo-1",
    numero: String(numero),
    bloco: String(bloco),
    qr_code: `CAROLOFT-APT-${numero}-${bloco}`.toUpperCase()
  };

  db.apartamentos.push(newApt);
  writeDb(db);

  // Return with empty residents list
  res.status(201).json({ ...newApt, residents: [] });
});

// Edit existing apartment
app.put("/api/apartments/:id", (req, res) => {
  const { id } = req.params;
  const { numero, bloco, qr_code } = req.body;

  if (!numero || !bloco) {
    return res.status(400).json({ error: "Número e bloco são obrigatórios." });
  }

  const db = readDb();
  const index = db.apartamentos.findIndex((a: any) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Apartamento não encontrado." });
  }

  db.apartamentos[index] = {
    ...db.apartamentos[index],
    numero: String(numero),
    bloco: String(bloco),
    qr_code: qr_code || `CAROLOFT-APT-${numero}-${bloco}`.toUpperCase()
  };

  writeDb(db);
  res.json(db.apartamentos[index]);
});

// Delete apartment (and its residents)
app.delete("/api/apartments/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const aptIndex = db.apartamentos.findIndex((a: any) => a.id === id);
  if (aptIndex === -1) {
    return res.status(404).json({ error: "Apartamento não encontrado." });
  }

  // Remove residents belonging to this apartment
  db.moradores = db.moradores.filter((m: any) => m.apartamento_id !== id);
  
  // Remove apartment
  db.apartamentos.splice(aptIndex, 1);
  
  writeDb(db);
  res.json({ message: "Apartamento e seus moradores correspondentes removidos com sucesso!" });
});

// Create new resident (morador)
app.post("/api/residents", (req, res) => {
  const { apartamento_id, nome, telefone, email } = req.body;
  if (!apartamento_id || !nome) {
    return res.status(400).json({ error: "Apartamento e Nome são obrigatórios para cadastro do morador." });
  }

  const db = readDb();
  
  // Check if apartment exists
  const aptExists = db.apartamentos.some((a: any) => a.id === apartamento_id);
  if (!aptExists) {
    return res.status(404).json({ error: "Apartamento associado não encontrado." });
  }

  const newResident = {
    id: `mor-${Date.now()}`,
    apartamento_id,
    nome,
    telefone: telefone || "",
    email: email || ""
  };

  db.moradores.push(newResident);
  writeDb(db);

  res.status(201).json(newResident);
});

// Edit existing resident (morador)
app.put("/api/residents/:id", (req, res) => {
  const { id } = req.params;
  const { apartamento_id, nome, telefone, email } = req.body;

  if (!apartamento_id || !nome) {
    return res.status(400).json({ error: "Apartamento e Nome são obrigatórios." });
  }

  const db = readDb();
  const index = db.moradores.findIndex((m: any) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Morador não encontrado." });
  }

  db.moradores[index] = {
    ...db.moradores[index],
    apartamento_id,
    nome,
    telefone: telefone || "",
    email: email || ""
  };

  writeDb(db);
  res.json(db.moradores[index]);
});

// Delete resident (morador)
app.delete("/api/residents/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.moradores.findIndex((m: any) => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Morador não encontrado." });
  }

  db.moradores.splice(index, 1);
  writeDb(db);

  res.json({ message: "Morador removido com sucesso!" });
});

// Edit existing Porteiro
app.put("/api/porteiros/:id", (req, res) => {
  const { id } = req.params;
  const { nome, telefone, turno } = req.body;

  if (!nome || !turno) {
    return res.status(400).json({ error: "Nome e turno são obrigatórios." });
  }

  const db = readDb();
  const index = db.porteiros.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Porteiro não encontrado." });
  }

  db.porteiros[index] = {
    ...db.porteiros[index],
    nome,
    telefone: telefone || "",
    turno
  };

  writeDb(db);
  res.json(db.porteiros[index]);
});

// Delete Porteiro
app.delete("/api/porteiros/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.porteiros.findIndex((p: any) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Porteiro não encontrado." });
  }

  db.porteiros.splice(index, 1);
  writeDb(db);

  res.json({ message: "Porteiro removido com sucesso!" });
});

// Edit existing Delivery
app.put("/api/deliveries/:id", (req, res) => {
  const { id } = req.params;
  const { status, remetente, transportadora, urgente, entregador_nome, apartamento_id } = req.body;

  const db = readDb();
  const index = db.encomendas.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Encomenda não encontrada." });
  }

  const existing = db.encomendas[index];
  db.encomendas[index] = {
    ...existing,
    status: status || existing.status,
    remetente: remetente !== undefined ? remetente : existing.remetente,
    transportadora: transportadora !== undefined ? transportadora : existing.transportadora,
    urgente: urgente !== undefined ? !!urgente : existing.urgente,
    entregador_nome: entregador_nome !== undefined ? entregador_nome : existing.entregador_nome,
    apartamento_id: apartamento_id !== undefined ? apartamento_id : existing.apartamento_id,
    entregue_em: status === "ENTREGUE" && existing.status !== "ENTREGUE" ? new Date().toISOString() : existing.entregue_em
  };

  writeDb(db);
  res.json(db.encomendas[index]);
});

// Delete Delivery
app.delete("/api/deliveries/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const index = db.encomendas.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Encomenda não encontrada." });
  }

  // Also clear related signatures or notifications to keep DB clean
  db.assinaturas = db.assinaturas.filter((s: any) => s.encomenda_id !== id);
  db.notificacoes = db.notificacoes.filter((n: any) => n.encomenda_id !== id);

  db.encomendas.splice(index, 1);
  writeDb(db);

  res.json({ message: "Encomenda e seus registros vinculados removidos com sucesso!" });
});

// ==========================================
// VITE AND STATIC ASSETS HANDLING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CA.RO — LOFT] Server listening at http://localhost:${PORT}`);
  });
}

startServer();
