export interface Resident {
  id: string;
  apartamento_id: string;
  nome: string;
  telefone: string;
  email: string;
  foto_url?: string;
}

export interface Apartment {
  id: string;
  condominio_id: string;
  numero: string;
  bloco: string;
  qr_code: string;
  residents?: Resident[];
}

export interface Porteiro {
  id: string;
  condominio_id: string;
  nome: string;
  telefone: string;
  turno: string;
}

export type DeliveryStatus = "AGUARDANDO" | "ENTREGUE" | "DEVOLVIDA";

export interface Signature {
  id: string;
  encomenda_id: string;
  assinatura_url: string; // base64
  assinado_por: string;
  autorizado_terceiro: boolean;
  criado_em: string;
}

export interface Delivery {
  id: string;
  apartamento_id: string;
  porteiro_id: string;
  foto_url: string;
  remetente: string;
  transportadora: string;
  status: DeliveryStatus;
  criado_em: string;
  entregue_em?: string;
  autorizado_terceiro_nome?: string;
  urgente?: boolean;
  entregador_nome?: string;
  
  // Detailed joined fields from API
  apartment?: Apartment;
  residents?: Resident[];
  porteiro?: Porteiro;
  signature?: Signature;
}

export interface NotificationLog {
  id: string;
  encomenda_id: string;
  morador_id: string;
  canal: "PUSH" | "WHATSAPP";
  status: "ENVIADO" | "LIDO";
  enviado_em: string;
  lido_em?: string;
}
