export interface Filament {
  id: string;
  name: string;
  brand: string;
  type: string; // PLA, PETG, ABS, etc.
  color: string;
  custoKg: number;
  stockGrams: number;
  minStockGrams: number;
  maxStockGrams: number;
}

export interface Hardware {
  id: string;
  name: string;
  category: string; // Screws, Magnets, etc.
  costPerUnit: number;
  stockUnits: number;
  minStockUnits: number;
}

export interface PrinterProfile {
  id: string;
  name: string;
  energyConsumption: number; // Watts
  energyCostKwh: number;
  maintenanceCostHour: number;
  hourlyRate: number; // Additional profit/overhead per hour
}

export interface ProjectHardware {
  hardwareId: string;
  quantity: number;
}

export interface ProjectData {
  id: string;
  name: string;
  date: string;
  
  // Material
  filamentId?: string;
  custoKg: number;
  pesoPeca: number;
  
  // Printer
  printerId?: string;
  tempoImpH: number;
  tempoImpM: number;
  custoMaq: number;
  
  // Labor
  tempoMaoObra: number;
  valorMaoObra: number;
  
  // Hardware used
  hardwareUsed: ProjectHardware[];
  
  // Extras
  custoHardwareTotal: number;
  custoEmbalagem: number;
  
  // Taxes
  taxaIva: number;
  taxaPlat: number;
  
  // Batch
  quantity: number;
  
  // Results
  custoBase: number;
  precos: {
    competitivo: number;
    padrao: number;
    premium: number;
    luxo: number;
  };
}

export interface BaseSettings {
  custoKgDefault: number;
  custoMaqDefault: number;
  valorMaoObraDefault: number;
  taxaPlatDefault: number;
  taxaIvaDefault: number;
  energyCostKwhDefault: number;
  margemCompetitivo: number;
  margemPadrao: number;
  margemPremium: number;
  margemLuxo: number;
}
