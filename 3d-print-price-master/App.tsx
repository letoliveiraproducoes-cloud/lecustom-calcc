import { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  getDoc, writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { 
  Printer, Settings, History, Calculator, Plus, Trash2, Download, 
  Save, Info, Copy, Check, Box, Layers, Cpu, AlertTriangle, 
  Share2, Search, Filter, Package, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProjectData, BaseSettings, Filament, Hardware, PrinterProfile, ProjectHardware } from './types';
import { cn } from '@/lib/utils';

const COLORS = ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#8E24AA', '#00ACC1', '#FF7043'];

const DEFAULT_SETTINGS: BaseSettings = {
  custoKgDefault: 110,
  custoMaqDefault: 0.75,
  valorMaoObraDefault: 20,
  taxaPlatDefault: 10,
  taxaIvaDefault: 0,
  energyCostKwhDefault: 0.85,
  margemCompetitivo: 35,
  margemPadrao: 40,
  margemPremium: 65,
  margemLuxo: 85,
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [settings, setSettingsState] = useState<BaseSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<ProjectData[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [hardwareLibrary, setHardwareLibrary] = useState<Hardware[]>([]);
  const [printers, setPrinters] = useState<PrinterProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // ── Firestore: carregar dados em tempo real ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    setDataLoading(true);
    let loaded = 0;
    const total = 5;
    const checkDone = () => { if (++loaded >= total) setDataLoading(false); };

    // Settings (documento único)
    const unsubSettings = onSnapshot(doc(db, 'users', uid, 'data', 'settings'), snap => {
      if (snap.exists()) setSettingsState(snap.data() as BaseSettings);
      checkDone();
    });

    // Coleções
    const unsubHistory = onSnapshot(collection(db, 'users', uid, 'history'), snap => {
      setHistory(snap.docs.map(d => d.data() as ProjectData).sort((a, b) => b.date.localeCompare(a.date)));
      checkDone();
    });
    const unsubFilaments = onSnapshot(collection(db, 'users', uid, 'filaments'), snap => {
      setFilaments(snap.docs.map(d => d.data() as Filament));
      checkDone();
    });
    const unsubHardware = onSnapshot(collection(db, 'users', uid, 'hardware'), snap => {
      setHardwareLibrary(snap.docs.map(d => d.data() as Hardware));
      checkDone();
    });
    const unsubPrinters = onSnapshot(collection(db, 'users', uid, 'printers'), snap => {
      setPrinters(snap.docs.map(d => d.data() as PrinterProfile));
      checkDone();
    });

    return () => {
      unsubSettings(); unsubHistory(); unsubFilaments();
      unsubHardware(); unsubPrinters();
    };
  }, [user]);

  // ── Helpers de escrita no Firestore ─────────────────────────────────────
  const setSettings = useCallback(async (newSettings: BaseSettings) => {
    if (!user) return;
    setSettingsState(newSettings);
    await setDoc(doc(db, 'users', user.uid, 'data', 'settings'), newSettings);
  }, [user]);

  const addFilament = useCallback(async (f: Filament) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'filaments', f.id), f);
  }, [user]);

  const removeFilament = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'filaments', id));
  }, [user]);

  const updateFilament = useCallback(async (f: Filament) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'filaments', f.id), f);
  }, [user]);

  const addHardware = useCallback(async (h: Hardware) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'hardware', h.id), h);
  }, [user]);

  const removeHardware = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'hardware', id));
  }, [user]);

  const updateHardware = useCallback(async (h: Hardware) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'hardware', h.id), h);
  }, [user]);

  const addPrinter = useCallback(async (p: PrinterProfile) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'printers', p.id), p);
  }, [user]);

  const removePrinter = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'printers', id));
  }, [user]);

  const saveProject = useCallback(async (project: ProjectData) => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid, 'history', project.id), project);
  }, [user]);

  const removeProject = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'history', id));
  }, [user]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(db);
    history.forEach(item => batch.delete(doc(db, 'users', user.uid, 'history', item.id)));
    await batch.commit();
  }, [user, history]);
  
  // Sync calculator defaults when settings change
  useEffect(() => {
    setManualCustoKg(settings.custoKgDefault);
    setValorMaoObra(settings.valorMaoObraDefault);
    setManualCustoMaq(settings.custoMaqDefault);
    setTaxaPlat(settings.taxaPlatDefault);
    setTaxaIva(settings.taxaIvaDefault);
  }, [settings]);

  const [activeTab, setActiveTab] = useState('calculator');
  const [copiedPrice, setCopiedPrice] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form State
  const [projectName, setProjectName] = useState('');
  const [selectedFilamentId, setSelectedFilamentId] = useState<string>('manual');
  const [manualCustoKg, setManualCustoKg] = useState(settings.custoKgDefault);
  const [pesoPeca, setPesoPeca] = useState(100);
  
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('manual');
  const [tempoImpH, setTempoImpH] = useState(1);
  const [tempoImpM, setTempoImpM] = useState(20);
  const [manualCustoMaq, setManualCustoMaq] = useState(settings.custoMaqDefault);
  
  const [tempoMaoObra, setTempoMaoObra] = useState(30);
  const [valorMaoObra, setValorMaoObra] = useState(settings.valorMaoObraDefault);
  
  const [selectedHardware, setSelectedHardware] = useState<ProjectHardware[]>([]);
  const [custoEmbalagem, setCustoEmbalagem] = useState(4);
  const [taxaIva, setTaxaIva] = useState(settings.taxaIvaDefault);
  const [taxaPlat, setTaxaPlat] = useState(settings.taxaPlatDefault);
  const [batchQuantity, setBatchQuantity] = useState(1);

  // History Filter
  const [historySearch, setHistorySearch] = useState('');

  // Edit states
  const [editingFilament, setEditingFilament] = useState<Filament | null>(null);
  const [editingHardware, setEditingHardware] = useState<Hardware | null>(null);
  const [editingPrinter, setEditingPrinter] = useState<PrinterProfile | null>(null);

  // Derived Values
  const currentFilament = useMemo(() => filaments.find(f => f.id === selectedFilamentId), [filaments, selectedFilamentId]);
  const currentPrinter = useMemo(() => printers.find(p => p.id === selectedPrinterId), [printers, selectedPrinterId]);
  
  const effectiveCustoKg = currentFilament ? currentFilament.custoKg : manualCustoKg;
  const effectiveCustoMaq = useMemo(() => {
    if (currentPrinter) {
      const energyCost = (currentPrinter.energyConsumption / 1000) * currentPrinter.energyCostKwh;
      return energyCost + currentPrinter.maintenanceCostHour + currentPrinter.hourlyRate;
    }
    return manualCustoMaq;
  }, [currentPrinter, manualCustoMaq]);

  const hardwareCostTotal = useMemo(() => {
    return selectedHardware.reduce((acc, item) => {
      const h = hardwareLibrary.find(hl => hl.id === item.hardwareId);
      return acc + (h ? h.costPerUnit * item.quantity : 0);
    }, 0);
  }, [selectedHardware, hardwareLibrary]);

  const results = useMemo(() => {
    const mat = (effectiveCustoKg / 1000) * pesoPeca;
    const horaImp = tempoImpH + (tempoImpM / 60);
    const maq = horaImp * effectiveCustoMaq;
    const maoObra = (tempoMaoObra / 60) * valorMaoObra;
    const extras = hardwareCostTotal + custoEmbalagem;
    
    // Unit Cost
    const unitCustoBase = mat + maq + maoObra + extras;
    
    // Total Batch Cost
    const totalCustoBase = unitCustoBase * batchQuantity;

    const taxasDecimais = (taxaIva + taxaPlat) / 100;
    const divisorTaxas = 1 - taxasDecimais;
    
    const calcPreco = (margem: number) => 
      divisorTaxas > 0 ? (totalCustoBase * (1 + margem)) / divisorTaxas : 0;

    return {
      mat: mat * batchQuantity,
      maq: maq * batchQuantity,
      maoObra: maoObra * batchQuantity,
      extras: extras * batchQuantity,
      unitCustoBase,
      totalCustoBase,
      precos: {
        competitivo: calcPreco(settings.margemCompetitivo / 100),
        padrao: calcPreco(settings.margemPadrao / 100),
        premium: calcPreco(settings.margemPremium / 100),
        luxo: calcPreco(settings.margemLuxo / 100),
      },
      chartData: [
        { name: 'Material', value: mat * batchQuantity },
        { name: 'Máquina', value: maq * batchQuantity },
        { name: 'Mão de Obra', value: maoObra * batchQuantity },
        { name: 'Hardware', value: hardwareCostTotal * batchQuantity },
        { name: 'Embalagem', value: custoEmbalagem * batchQuantity },
      ].filter(d => d.value > 0)
    };
  }, [effectiveCustoKg, pesoPeca, tempoImpH, tempoImpM, effectiveCustoMaq, tempoMaoObra, valorMaoObra, hardwareCostTotal, custoEmbalagem, taxaIva, taxaPlat, batchQuantity]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const copyToClipboard = useCallback((value: number, label: string) => {
    const text = `${formatCurrency(value)}`;
    navigator.clipboard.writeText(text);
    setCopiedPrice(label);
    setTimeout(() => setCopiedPrice(null), 2000);
  }, []);

  const handleSave = async () => {
    const newProject: ProjectData = {
      id: crypto.randomUUID(),
      name: projectName || `Projeto ${history.length + 1}`,
      date: new Date().toLocaleString('pt-BR'),
      filamentId: selectedFilamentId !== 'manual' ? selectedFilamentId : undefined,
      custoKg: effectiveCustoKg,
      pesoPeca,
      printerId: selectedPrinterId !== 'manual' ? selectedPrinterId : undefined,
      tempoImpH,
      tempoImpM,
      custoMaq: effectiveCustoMaq,
      tempoMaoObra,
      valorMaoObra,
      hardwareUsed: selectedHardware,
      custoHardwareTotal: hardwareCostTotal,
      custoEmbalagem,
      taxaIva,
      taxaPlat,
      quantity: batchQuantity,
      custoBase: results.totalCustoBase,
      precos: results.precos,
    };

    // Atualizar estoque do filamento
    if (currentFilament) {
      const usedAmount = pesoPeca * batchQuantity;
      const updated = { ...currentFilament, stockGrams: Math.max(0, currentFilament.stockGrams - usedAmount) };
      await updateFilament(updated);
      if (updated.stockGrams < currentFilament.minStockGrams) {
        toast.warning(`Estoque baixo: ${currentFilament.name}`);
      }
    }

    // Atualizar estoque do hardware
    for (const sh of selectedHardware) {
      const h = hardwareLibrary.find(hl => hl.id === sh.hardwareId);
      if (h) {
        const used = sh.quantity * batchQuantity;
        await updateHardware({ ...h, stockUnits: Math.max(0, h.stockUnits - used) });
      }
    }

    await saveProject(newProject);
    toast.success("Orçamento salvo com sucesso!");
    setProjectName('');
    setActiveTab('history');
  };

  const exportToCSV = useCallback(() => {
    const headers = "Nome,Data,Quantidade,Custo Total,Preço Padrão,Preço Competitivo,Preço Premium,Preço Luxo\n";
    const csv = history.map(item =>
      [
        `"${item.name}"`,
        item.date,
        item.quantity,
        formatCurrency(item.custoBase),
        formatCurrency(item.precos.padrao),
        formatCurrency(item.precos.competitivo),
        formatCurrency(item.precos.premium),
        formatCurrency(item.precos.luxo),
      ].join(',')
    ).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + headers + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'historico_precos.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("CSV exportado com sucesso!");
  }, [history]);

  const deleteHistoryItem = (id: string) => {
    removeProject(id);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#23395d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f2c94c]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#23395d] flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f2c94c]"></div>
        <p className="text-white/60 text-sm">Carregando seus dados...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden">

      {/* Sidebar — escondida no mobile, visível no desktop */}
      <aside className="hidden lg:flex lg:w-64 bg-[#23395d] flex-col border-r border-[#1a2d4a] shadow-xl shrink-0">
          <div className="p-6 flex flex-col items-center border-b border-[#1a2d4a]/50">
            {/* Logo SVG */}
            <div className="relative w-24 h-24 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                {/* Yellow top part */}
                <path d="M50 15 L80 30 L50 45 L20 30 Z" fill="#f2c94c" />
                {/* Teal left part */}
                <path d="M20 30 L50 45 L50 80 L20 65 Z" fill="#69bfa8" />
                {/* Red right part */}
                <path d="M80 30 L50 45 L50 80 L80 65 Z" fill="#d94855" />
                {/* Inner cutouts to make it look like ribbons */}
                <path d="M50 30 L65 37.5 L50 45 L35 37.5 Z" fill="#23395d" />
                <path d="M35 37.5 L50 45 L50 60 L35 52.5 Z" fill="#23395d" />
                <path d="M65 37.5 L50 45 L50 60 L65 52.5 Z" fill="#23395d" />
              </svg>
            </div>
            <div className="w-full h-0.5 bg-[#f2c94c] mb-3"></div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-[#69bfa8]">Le</span>
              <span className="text-[#f2c94c]">Custom</span>
            </h1>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-3">
            <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-2">
              <TabsTrigger 
                value="calculator" 
                className="w-full justify-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:bg-[#f2c94c] data-[state=active]:text-[#23395d] rounded-lg transition-all"
              >
                <Calculator className="mr-3 h-5 w-5" />
                <span className="font-medium text-base">Calculadora</span>
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="w-full justify-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:bg-[#f2c94c] data-[state=active]:text-[#23395d] rounded-lg transition-all"
              >
                <Layers className="mr-3 h-5 w-5" />
                <span className="font-medium text-base">Materiais</span>
              </TabsTrigger>
              <TabsTrigger 
                value="hardware" 
                className="w-full justify-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:bg-[#f2c94c] data-[state=active]:text-[#23395d] rounded-lg transition-all"
              >
                <Box className="mr-3 h-5 w-5" />
                <span className="font-medium text-base">Hardware</span>
              </TabsTrigger>
              <TabsTrigger 
                value="printers" 
                className="w-full justify-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:bg-[#f2c94c] data-[state=active]:text-[#23395d] rounded-lg transition-all"
              >
                <Cpu className="mr-3 h-5 w-5" />
                <span className="font-medium text-base">Impressoras</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="w-full justify-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:bg-[#f2c94c] data-[state=active]:text-[#23395d] rounded-lg transition-all"
              >
                <History className="mr-3 h-5 w-5" />
                <span className="font-medium text-base">Histórico</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="w-full justify-start px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 data-[state=active]:bg-[#f2c94c] data-[state=active]:text-[#23395d] rounded-lg transition-all"
              >
                <Settings className="mr-3 h-5 w-5" />
                <span className="font-medium text-base">Ajustes</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="p-4 border-t border-[#1a2d4a]/50 space-y-2">
            <Button 
              variant="outline" 
              className="w-full bg-transparent border-[#f2c94c]/30 text-[#f2c94c] hover:bg-[#f2c94c] hover:text-[#23395d] transition-colors" 
              onClick={exportToCSV} 
              disabled={history.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-white/50 hover:text-white hover:bg-white/5 transition-colors" 
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
      </aside>

      {/* Main Content — sempre ocupa toda a largura no mobile */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSidebarOpen(false); }} orientation="vertical" className="flex-1 min-w-0 flex flex-col h-full">
        <main className="flex-1 min-w-0 overflow-y-auto bg-zinc-50 p-4 pb-24 lg:pb-8 lg:p-8">

          <AnimatePresence mode="wait">
            <TabsContent value="calculator" className="mt-0 outline-none h-full">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid gap-8 lg:grid-cols-12"
              >
                {/* Inputs Section */}
                <div className="space-y-6 lg:col-span-7">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle className="text-xl">Entradas do Projeto</CardTitle>
                      <CardDescription>Defina os parâmetros da sua impressão</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="projectName">Nome do Projeto</Label>
                          <Input 
                            id="projectName" 
                            placeholder="Ex: Vaso Articulado" 
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="bg-zinc-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="batchQuantity">Quantidade em Lote</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="batchQuantity" 
                              type="number" 
                              min="1"
                              value={batchQuantity}
                              onChange={(e) => setBatchQuantity(Math.max(1, Number(e.target.value)))}
                              className="bg-zinc-50"
                            />
                            <Badge variant="outline" className="whitespace-nowrap">
                              {batchQuantity} un.
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Material</h3>
                            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setActiveTab('materials')}>Gerenciar</Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Selecionar Filamento</Label>
                            <Select value={selectedFilamentId} onValueChange={setSelectedFilamentId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Escolha um filamento" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Entrada Manual</SelectItem>
                                {filaments.map(f => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.name} ({f.type}) - {formatCurrency(f.custoKg)}/kg
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {selectedFilamentId === 'manual' && (
                            <div className="space-y-2">
                              <Label>Custo do Filamento (R$/kg)</Label>
                              <Input type="number" value={manualCustoKg} onChange={(e) => setManualCustoKg(Number(e.target.value))} />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label>Peso da Peça (gramas)</Label>
                            <Input type="number" value={pesoPeca} onChange={(e) => setPesoPeca(Number(e.target.value))} />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Impressora</h3>
                            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setActiveTab('printers')}>Gerenciar</Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Selecionar Perfil</Label>
                            <Select value={selectedPrinterId} onValueChange={setSelectedPrinterId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Escolha uma impressora" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Entrada Manual</SelectItem>
                                {printers.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label>Horas</Label>
                              <Input type="number" value={tempoImpH} onChange={(e) => setTempoImpH(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Minutos</Label>
                              <Input type="number" value={tempoImpM} onChange={(e) => setTempoImpM(Number(e.target.value))} />
                            </div>
                          </div>
                          {selectedPrinterId === 'manual' && (
                            <div className="space-y-2">
                              <Label>Custo Máquina/Hora (R$)</Label>
                              <Input type="number" value={manualCustoMaq} onChange={(e) => setManualCustoMaq(Number(e.target.value))} />
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-4">
                          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Mão de Obra</h3>
                          <div className="space-y-2">
                            <Label>Tempo Gasto (Minutos)</Label>
                            <Input type="number" value={tempoMaoObra} onChange={(e) => setTempoMaoObra(Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Valor da sua Hora (R$)</Label>
                            <Input type="number" value={valorMaoObra} onChange={(e) => setValorMaoObra(Number(e.target.value))} />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Hardware & Extras</h3>
                            <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setActiveTab('hardware')}>Estoque</Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Adicionar Hardware</Label>
                            <div className="grid gap-2">
                              {hardwareLibrary.map(h => (
                                <div key={h.id} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`hw-${h.id}`} 
                                    checked={selectedHardware.some(sh => sh.hardwareId === h.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedHardware([...selectedHardware, { hardwareId: h.id, quantity: 1 }]);
                                      } else {
                                        setSelectedHardware(selectedHardware.filter(sh => sh.hardwareId !== h.id));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`hw-${h.id}`} className="text-xs flex-1 truncate">{h.name}</label>
                                  {selectedHardware.some(sh => sh.hardwareId === h.id) && (
                                    <Input 
                                      type="number" 
                                      className="h-7 w-12 text-xs px-1" 
                                      value={selectedHardware.find(sh => sh.hardwareId === h.id)?.quantity || 1}
                                      onChange={(e) => {
                                        const qty = Math.max(1, Number(e.target.value));
                                        setSelectedHardware(selectedHardware.map(sh => 
                                          sh.hardwareId === h.id ? { ...sh, quantity: qty } : sh
                                        ));
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                              {hardwareLibrary.length === 0 && <p className="text-[10px] text-zinc-400 italic">Nenhum hardware cadastrado</p>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Embalagem (R$)</Label>
                            <Input type="number" value={custoEmbalagem} onChange={(e) => setCustoEmbalagem(Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-zinc-50/50 border-t p-4">
                      <Button className="w-full bg-zinc-900 hover:bg-zinc-800" onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar no Histórico
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                {/* Results Section */}
                <div className="space-y-6 lg:col-span-5">
                  <Card className="border-none shadow-md overflow-hidden">
                    <div className="bg-zinc-900 p-6 text-white">
                      <h3 className="text-sm font-medium opacity-80 uppercase tracking-widest">Custo Base Total</h3>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-4xl font-bold font-mono">{formatCurrency(results.totalCustoBase)}</span>
                        <span className="text-xs opacity-60">Sem lucro/taxas</span>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-zinc-50 p-3 border">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Material</p>
                          <p className="text-sm font-semibold">{formatCurrency(results.mat)}</p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3 border">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Máquina</p>
                          <p className="text-sm font-semibold">{formatCurrency(results.maq)}</p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3 border">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Mão de Obra</p>
                          <p className="text-sm font-semibold">{formatCurrency(results.maoObra)}</p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 p-3 border">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase">Extras</p>
                          <p className="text-sm font-semibold">{formatCurrency(results.extras)}</p>
                        </div>
                      </div>

                      <div className="mt-8 space-y-4">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <Info className="h-4 w-4 text-zinc-400" />
                          Preços Sugeridos de Venda
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Competitivo', margin: `${settings.margemCompetitivo}%`, value: results.precos.competitivo, color: 'green' },
                            { label: 'Padrão', margin: `${settings.margemPadrao}%`, value: results.precos.padrao, color: 'blue' },
                            { label: 'Premium', margin: `${settings.margemPremium}%`, value: results.precos.premium, color: 'amber' },
                            { label: 'Luxo', margin: `${settings.margemLuxo}%`, value: results.precos.luxo, color: 'purple' },
                          ].map((price) => (
                            <button
                              key={price.label}
                              onClick={() => copyToClipboard(price.value, price.label)}
                              className={cn(
                                "relative flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                                price.color === 'green' && "border-green-100 bg-green-50/30 hover:border-green-200",
                                price.color === 'blue' && "border-blue-100 bg-blue-50/30 hover:border-blue-200",
                                price.color === 'amber' && "border-amber-100 bg-amber-50/30 hover:border-amber-200",
                                price.color === 'purple' && "border-purple-100 bg-purple-50/30 hover:border-purple-200"
                              )}
                            >
                              <div className="flex w-full items-center justify-between">
                                <p className={cn(
                                  "text-[10px] font-bold uppercase",
                                  price.color === 'green' && "text-green-700",
                                  price.color === 'blue' && "text-blue-700",
                                  price.color === 'amber' && "text-amber-700",
                                  price.color === 'purple' && "text-purple-700"
                                )}>
                                  {price.label} ({price.margin})
                                </p>
                                {copiedPrice === price.label ? (
                                  <Check className="h-3 w-3 text-zinc-400" />
                                ) : (
                                  <Copy className="h-3 w-3 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
                                )}
                              </div>
                              <p className={cn(
                                "text-lg font-bold font-mono",
                                price.color === 'green' && "text-green-900",
                                price.color === 'blue' && "text-blue-900",
                                price.color === 'amber' && "text-amber-900",
                                price.color === 'purple' && "text-purple-900"
                              )}>
                                {formatCurrency(price.value)}
                              </p>
                              {copiedPrice === price.label && (
                                <motion.span 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-zinc-900 px-2 py-0.5 text-[10px] text-white"
                                >
                                  Copiado!
                                </motion.span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={results.chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {results.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="materials" className="mt-0 outline-none">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Biblioteca de Filamentos</h2>
                    <p className="text-sm text-zinc-500">Gerencie seus materiais e estoque</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-zinc-900">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Filamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Filamento</DialogTitle>
                        <DialogDescription>Cadastre um novo material para usar nos seus orçamentos.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newFilament: Filament = {
                          id: crypto.randomUUID(),
                          name: formData.get('name') as string,
                          brand: formData.get('brand') as string,
                          type: formData.get('type') as string,
                          color: formData.get('color') as string,
                          custoKg: Number(formData.get('custoKg')),
                          stockGrams: Number(formData.get('stockGrams')),
                          minStockGrams: Number(formData.get('minStockGrams')),
                          maxStockGrams: Number(formData.get('maxStockGrams')) || Number(formData.get('stockGrams')) || 1000,
                        };
                        addFilament(newFilament);
                        toast.success("Filamento adicionado!");
                      }}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nome</Label>
                            <Input id="name" name="name" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="brand" className="text-right">Marca</Label>
                            <Input id="brand" name="brand" className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor="type" className="text-right">Tipo</Label>
                              <Input id="type" name="type" placeholder="PLA" />
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor="color" className="text-right">Cor</Label>
                              <Input id="color" name="color" />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="custoKg" className="text-right">Custo/kg</Label>
                            <Input id="custoKg" name="custoKg" type="number" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor="stockGrams" className="text-right">Estoque (g)</Label>
                              <Input id="stockGrams" name="stockGrams" type="number" />
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor="minStockGrams" className="text-right">Mínimo (g)</Label>
                              <Input id="minStockGrams" name="minStockGrams" type="number" />
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="maxStockGrams" className="text-right">Máximo (g)</Label>
                            <Input id="maxStockGrams" name="maxStockGrams" type="number" placeholder="Ex: 1000" className="col-span-3" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Salvar</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filaments.map(f => (
                    <Card key={f.id} className="relative overflow-hidden">
                      {f.stockGrams <= f.minStockGrams && (
                        <div className="absolute top-0 right-0 p-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{f.name}</CardTitle>
                          <Badge variant="secondary">{f.type}</Badge>
                        </div>
                        <CardDescription>{f.brand} • {f.color}</CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Custo/kg:</span>
                          <span className="font-bold">{formatCurrency(f.custoKg)}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500">Estoque:</span>
                            <span className={cn(f.stockGrams <= f.minStockGrams ? "text-amber-600 font-bold" : "")}>
                              {f.stockGrams}g
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all", f.stockGrams <= f.minStockGrams ? "bg-amber-500" : "bg-zinc-900")}
                              style={{ width: `${Math.min(100, (f.stockGrams / (f.maxStockGrams || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingFilament(f)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeFilament(f.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Dialog edição filamento */}
            <Dialog open={!!editingFilament} onOpenChange={(open) => !open && setEditingFilament(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Filamento</DialogTitle>
                </DialogHeader>
                {editingFilament && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const updated: Filament = {
                      ...editingFilament,
                      name: fd.get('name') as string,
                      brand: fd.get('brand') as string,
                      type: fd.get('type') as string,
                      color: fd.get('color') as string,
                      custoKg: Number(fd.get('custoKg')),
                      stockGrams: Number(fd.get('stockGrams')),
                      minStockGrams: Number(fd.get('minStockGrams')),
                      maxStockGrams: Number(fd.get('maxStockGrams')) || editingFilament.maxStockGrams,
                    };
                    updateFilament(updated);
                    setEditingFilament(null);
                    toast.success("Filamento atualizado!");
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Nome</Label>
                        <Input name="name" defaultValue={editingFilament.name} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Marca</Label>
                        <Input name="brand" defaultValue={editingFilament.brand} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 items-center gap-4">
                          <Label className="text-right">Tipo</Label>
                          <Input name="type" defaultValue={editingFilament.type} />
                        </div>
                        <div className="grid grid-cols-2 items-center gap-4">
                          <Label className="text-right">Cor</Label>
                          <Input name="color" defaultValue={editingFilament.color} />
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Custo/kg</Label>
                        <Input name="custoKg" type="number" defaultValue={editingFilament.custoKg} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Estoque (g)</Label>
                          <Input name="stockGrams" type="number" defaultValue={editingFilament.stockGrams} />
                        </div>
                        <div className="space-y-1">
                          <Label>Mínimo (g)</Label>
                          <Input name="minStockGrams" type="number" defaultValue={editingFilament.minStockGrams} />
                        </div>
                        <div className="space-y-1">
                          <Label>Máximo (g)</Label>
                          <Input name="maxStockGrams" type="number" defaultValue={editingFilament.maxStockGrams} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingFilament(null)}>Cancelar</Button>
                      <Button type="submit">Salvar</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Configurações Padrão</CardTitle>
                    <CardDescription>Estes valores serão usados como base para novos cálculos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Custo Filamento (R$/kg)</Label>
                        <Input 
                          type="number" 
                          value={settings.custoKgDefault}
                          onChange={(e) => setSettings({ ...settings, custoKgDefault: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Máquina/Hora (R$)</Label>
                        <Input 
                          type="number" 
                          value={settings.custoMaqDefault}
                          onChange={(e) => setSettings({ ...settings, custoMaqDefault: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Mão de Obra/Hora (R$)</Label>
                        <Input 
                          type="number" 
                          value={settings.valorMaoObraDefault}
                          onChange={(e) => setSettings({ ...settings, valorMaoObraDefault: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Custo Energia (kWh)</Label>
                        <Input 
                          type="number" 
                          value={settings.energyCostKwhDefault}
                          onChange={(e) => setSettings({ ...settings, energyCostKwhDefault: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa Plataforma (%)</Label>
                        <Input 
                          type="number" 
                          value={settings.taxaPlatDefault}
                          onChange={(e) => setSettings({ ...settings, taxaPlatDefault: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IVA / Impostos (%)</Label>
                        <Input 
                          type="number" 
                          value={settings.taxaIvaDefault}
                          onChange={(e) => setSettings({ ...settings, taxaIvaDefault: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <Separator className="my-2" />
                    <p className="text-sm font-semibold text-zinc-600">Margens de Lucro (%)</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Margem Competitivo (%)</Label>
                        <Input 
                          type="number" 
                          value={settings.margemCompetitivo}
                          onChange={(e) => setSettings({ ...settings, margemCompetitivo: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Padrão (%)</Label>
                        <Input 
                          type="number" 
                          value={settings.margemPadrao}
                          onChange={(e) => setSettings({ ...settings, margemPadrao: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Premium (%)</Label>
                        <Input 
                          type="number" 
                          value={settings.margemPremium}
                          onChange={(e) => setSettings({ ...settings, margemPremium: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margem Luxo (%)</Label>
                        <Input 
                          type="number" 
                          value={settings.margemLuxo}
                          onChange={(e) => setSettings({ ...settings, margemLuxo: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-zinc-50 flex justify-between">
                    <Button variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)}>
                      Resetar para Padrão
                    </Button>
                    <Button className="bg-zinc-900" onClick={() => { setSettings(settings); toast.success("Configurações salvas!"); }}>
                      Salvar Alterações
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="hardware" className="mt-0 outline-none">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Hardware & Peças</h2>
                    <p className="text-sm text-zinc-500">Parafusos, imãs e outros componentes</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-zinc-900">
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Hardware
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Hardware</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newItem: Hardware = {
                          id: crypto.randomUUID(),
                          name: formData.get('name') as string,
                          category: formData.get('category') as string,
                          costPerUnit: Number(formData.get('costPerUnit')),
                          stockUnits: Number(formData.get('stockUnits')),
                          minStockUnits: Number(formData.get('minStockUnits')),
                        };
                        addHardware(newItem);
                        toast.success("Hardware adicionado!");
                      }}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hw-name" className="text-right">Nome</Label>
                            <Input id="hw-name" name="name" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hw-cat" className="text-right">Categoria</Label>
                            <Input id="hw-cat" name="category" className="col-span-3" placeholder="Ex: Parafusos" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hw-cost" className="text-right">Custo/Un</Label>
                            <Input id="hw-cost" name="costPerUnit" type="number" step="0.01" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor="hw-stock" className="text-right">Estoque</Label>
                              <Input id="hw-stock" name="stockUnits" type="number" />
                            </div>
                            <div className="grid grid-cols-2 items-center gap-4">
                              <Label htmlFor="hw-min" className="text-right">Mínimo</Label>
                              <Input id="hw-min" name="minStockUnits" type="number" />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Salvar</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {hardwareLibrary.map(h => (
                    <Card key={h.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{h.name}</CardTitle>
                          <Badge variant="outline">{h.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-500">Custo Unitário:</span>
                          <span className="font-bold">{formatCurrency(h.costPerUnit)}</span>
                        </div>
                        <div className="mt-2 flex justify-between text-xs">
                          <span className="text-zinc-500">Estoque:</span>
                          <span className={cn(h.stockUnits <= h.minStockUnits ? "text-amber-600 font-bold" : "")}>
                            {h.stockUnits} un.
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingHardware(h)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => removeHardware(h.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Dialog edição hardware */}
            <Dialog open={!!editingHardware} onOpenChange={(open) => !open && setEditingHardware(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Hardware</DialogTitle>
                </DialogHeader>
                {editingHardware && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const updated: Hardware = {
                      ...editingHardware,
                      name: fd.get('name') as string,
                      category: fd.get('category') as string,
                      costPerUnit: Number(fd.get('costPerUnit')),
                      stockUnits: Number(fd.get('stockUnits')),
                      minStockUnits: Number(fd.get('minStockUnits')),
                    };
                    updateHardware(updated);
                    setEditingHardware(null);
                    toast.success("Hardware atualizado!");
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Nome</Label>
                        <Input name="name" defaultValue={editingHardware.name} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Categoria</Label>
                        <Input name="category" defaultValue={editingHardware.category} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Custo/Un</Label>
                        <Input name="costPerUnit" type="number" step="0.01" defaultValue={editingHardware.costPerUnit} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label>Estoque</Label>
                          <Input name="stockUnits" type="number" defaultValue={editingHardware.stockUnits} />
                        </div>
                        <div className="space-y-1">
                          <Label>Mínimo</Label>
                          <Input name="minStockUnits" type="number" defaultValue={editingHardware.minStockUnits} />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingHardware(null)}>Cancelar</Button>
                      <Button type="submit">Salvar</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            <TabsContent value="printers" className="mt-0 outline-none">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Perfis de Impressoras</h2>
                    <p className="text-sm text-zinc-500">Configure consumo e taxas por máquina</p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-zinc-900">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Impressora
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Impressora</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newPrinter: PrinterProfile = {
                          id: crypto.randomUUID(),
                          name: formData.get('name') as string,
                          energyConsumption: Number(formData.get('energyConsumption')),
                          energyCostKwh: Number(formData.get('energyCostKwh')),
                          maintenanceCostHour: Number(formData.get('maintenanceCostHour')),
                          hourlyRate: Number(formData.get('hourlyRate')),
                        };
                        addPrinter(newPrinter);
                        toast.success("Impressora adicionada!");
                      }}>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="p-name" className="text-right">Nome</Label>
                            <Input id="p-name" name="name" className="col-span-3" required />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="p-cons" className="text-right">Consumo (W)</Label>
                            <Input id="p-cons" name="energyConsumption" type="number" className="col-span-3" placeholder="Ex: 150" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="p-kwh" className="text-right">Custo kWh</Label>
                            <Input id="p-kwh" name="energyCostKwh" type="number" step="0.01" className="col-span-3" defaultValue={settings.energyCostKwhDefault} />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="p-maint" className="text-right">Manut./h</Label>
                            <Input id="p-maint" name="maintenanceCostHour" type="number" step="0.01" className="col-span-3" />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="p-rate" className="text-right">Taxa/h (R$)</Label>
                            <Input id="p-rate" name="hourlyRate" type="number" step="0.01" className="col-span-3" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Salvar</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {printers.map(p => (
                    <Card key={p.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Consumo:</span>
                          <span>{p.energyConsumption}W</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Manutenção/h:</span>
                          <span>{formatCurrency(p.maintenanceCostHour)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-1 mt-1">
                          <span className="text-zinc-500">Custo Total/h:</span>
                          <span>{formatCurrency((p.energyConsumption/1000 * p.energyCostKwh) + p.maintenanceCostHour + p.hourlyRate)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingPrinter(p)}>
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 text-destructive" onClick={() => removePrinter(p.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Dialog edição impressora */}
            <Dialog open={!!editingPrinter} onOpenChange={(open) => !open && setEditingPrinter(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Impressora</DialogTitle>
                </DialogHeader>
                {editingPrinter && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const updated: PrinterProfile = {
                      ...editingPrinter,
                      name: fd.get('name') as string,
                      energyConsumption: Number(fd.get('energyConsumption')),
                      energyCostKwh: Number(fd.get('energyCostKwh')),
                      maintenanceCostHour: Number(fd.get('maintenanceCostHour')),
                      hourlyRate: Number(fd.get('hourlyRate')),
                    };
                    addPrinter(updated);
                    setEditingPrinter(null);
                    toast.success("Impressora atualizada!");
                  }}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Nome</Label>
                        <Input name="name" defaultValue={editingPrinter.name} className="col-span-3" required />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Consumo (W)</Label>
                        <Input name="energyConsumption" type="number" defaultValue={editingPrinter.energyConsumption} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Custo kWh</Label>
                        <Input name="energyCostKwh" type="number" step="0.01" defaultValue={editingPrinter.energyCostKwh} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Manut./h</Label>
                        <Input name="maintenanceCostHour" type="number" step="0.01" defaultValue={editingPrinter.maintenanceCostHour} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Taxa/h (R$)</Label>
                        <Input name="hourlyRate" type="number" step="0.01" defaultValue={editingPrinter.hourlyRate} className="col-span-3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setEditingPrinter(null)}>Cancelar</Button>
                      <Button type="submit">Salvar</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            <TabsContent value="history" className="mt-0 outline-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Histórico de Orçamentos</h2>
                    <p className="text-sm text-zinc-500">Consulte e gerencie seus cálculos anteriores</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input 
                        placeholder="Buscar projeto..." 
                        className="pl-9"
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" onClick={exportToCSV} disabled={history.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar
                    </Button>
                  </div>
                </div>

                <Card className="border-none shadow-md overflow-hidden">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader className="bg-zinc-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead>Projeto</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Custo Total</TableHead>
                          <TableHead>Preço Sugerido</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history
                          .filter(item => item.name.toLowerCase().includes(historySearch.toLowerCase()))
                          .map((item) => (
                          <TableRow key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span>{item.name}</span>
                                <span className="text-[10px] text-zinc-400">{item.id.slice(0, 8)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-500 text-xs">{item.date}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{item.quantity}x</Badge>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(item.custoBase)}</TableCell>
                            <TableCell className="text-zinc-900 font-bold">{formatCurrency(item.precos.padrao)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-zinc-500 hover:text-zinc-900"
                                  onClick={() => {
                                    const texto = `📦 ${item.name}\n💰 Custo: ${formatCurrency(item.custoBase)}\n🏷️ Preço sugerido: ${formatCurrency(item.precos.padrao)}\n📅 ${item.date}`;
                                    navigator.clipboard.writeText(texto);
                                    toast.success('Resumo copiado para a área de transferência!');
                                  }}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteHistoryItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {history.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                              Nenhum orçamento encontrado. Comece a calcular!
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
                
                {history.length > 0 && (
                  <div className="flex justify-end">
                    <Button variant="ghost" className="text-destructive" onClick={clearHistory}>
                      Limpar Todo o Histórico
                    </Button>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
          
          <footer className="mt-12 border-t border-zinc-200 pt-8 pb-4">
            <div className="text-center">
              <p className="text-sm text-zinc-500">
                © {new Date().getFullYear()} LeCustom. Todos os direitos reservados.
              </p>
            </div>
          </footer>
        </main>
      </Tabs>
      {/* Bottom Navigation — só no mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#23395d] border-t border-[#1a2d4a] flex lg:hidden">
        {[
          { value: 'calculator', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2"/><path d="M8 9h8M8 12h5M8 15h3" strokeWidth="2" strokeLinecap="round"/></svg>
          ), label: 'Calcular' },
          { value: 'materials', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ), label: 'Materiais' },
          { value: 'hardware', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeWidth="2"/></svg>
          ), label: 'Hardware' },
          { value: 'history', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="2"/><path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/></svg>
          ), label: 'Histórico' },
          { value: 'settings', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="2"/></svg>
          ), label: 'Ajustes' },
        ].map(({ value, icon, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors",
              activeTab === value ? "text-[#f2c94c]" : "text-white/50"
            )}
          >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>

      <Toaster position="top-right" richColors />
    </div>
  );
}
