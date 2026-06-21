"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { uploadsService } from "@/services/uploads.service";
import { movementsService } from "@/services/movements.service";
import {
  runOCRPipeline,
  reprocessOCR,
  type OCRPipelineResult,
  type ParsedOCRRow,
  type OCRProgressState,
} from "@/lib/ocr/pipeline";
import { useMovements } from "@/hooks/useMovements";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UploadCloud,
  Camera,
  Trash2,
  Plus,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  FileImage,
} from "lucide-react";

// ============================================================
// Demo data — caderno simulado
// ============================================================
const DEMO_IMAGE =
  "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&q=80&w=800";

const DEMO_ROWS: ParsedOCRRow[] = [
  {
    date: new Date().toISOString().split("T")[0],
    description: "Venda Uniforme Colégio Objetivo",
    category: "Venda",
    type: "entrada",
    amount: 1550,
    confidence: 88,
    confidenceLevel: "high",
    rawText: "12/06 Venda Uniforme Colégio Objetivo R$ 1.550,00",
  },
  {
    date: new Date().toISOString().split("T")[0],
    description: "Compra de Linhas e Agulhas",
    category: "Matéria Prima",
    type: "saída",
    amount: 120,
    confidence: 75,
    confidenceLevel: "high",
    rawText: "Compra de Linhas e Agulhas 120,00",
  },
  {
    date: new Date().toISOString().split("T")[0],
    description: "Venda Uniforme Kit Esportivo",
    category: "Venda",
    type: "entrada",
    amount: 890,
    confidence: 52,
    confidenceLevel: "medium",
    rawText: "Venda uniforme kit esportivo 890",
  },
  {
    date: new Date().toISOString().split("T")[0],
    description: "Conserto Máquina de Costura",
    category: "Manutenção",
    type: "saída",
    amount: 250,
    confidence: 35,
    confidenceLevel: "low",
    rawText: "conserto maquina 250,00",
  },
];

// ============================================================
// Componente de badge de confiança
// ============================================================
function ConfidenceBadge({ level, score }: { level: ParsedOCRRow["confidenceLevel"]; score: number }) {
  const config = {
    high: {
      label: "Alta",
      icon: ShieldCheck,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    medium: {
      label: "Média",
      icon: Info,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    low: {
      label: "Baixa",
      icon: ShieldAlert,
      className: "bg-red-50 text-red-700 border-red-200",
    },
  }[level];

  const Icon = config.icon;
  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold cursor-default select-none ${config.className}`}
          >
            <Icon className="w-2.5 h-2.5" />
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Confiança OCR: {score}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================
// Indicador de progresso por fase
// ============================================================
const PHASE_LABELS: Record<OCRProgressState["phase"], string> = {
  idle: "",
  preprocessing: "Processando imagem...",
  ocr_loading: "Carregando motor OCR...",
  ocr_reading: "Extraindo texto...",
  parsing: "Organizando dados...",
  done: "Leitura concluída!",
  error: "Erro no processamento",
};

function OCRProgressCard({ state }: { state: OCRProgressState }) {
  const phaseIcons: Record<OCRProgressState["phase"], React.ReactNode> = {
    idle: null,
    preprocessing: <FileImage className="w-5 h-5 text-blue-500" />,
    ocr_loading: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
    ocr_reading: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />,
    parsing: <Sparkles className="w-5 h-5 text-blue-500" />,
    done: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertTriangle className="w-5 h-5 text-red-500" />,
  };

  const steps = [
    { phase: "preprocessing", label: "Imagem" },
    { phase: "ocr_loading", label: "Motor" },
    { phase: "ocr_reading", label: "Leitura" },
    { phase: "parsing", label: "Parsing" },
  ];

  const stepOrder = ["preprocessing", "ocr_loading", "ocr_reading", "parsing", "done"];
  const currentIndex = stepOrder.indexOf(state.phase);

  return (
    <Card className="border-slate-150 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin absolute" />
          <div className="z-10">
            {phaseIcons[state.phase] ?? phaseIcons["ocr_loading"]}
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-semibold text-slate-900 text-base">
            {PHASE_LABELS[state.phase]}
          </h3>
          {state.label && (
            <p className="text-sm text-slate-500">{state.label}</p>
          )}
        </div>

        {/* Stepper visual */}
        <div className="flex items-center gap-0 w-full max-w-sm">
          {steps.map((step, i) => {
            const stepIndex = stepOrder.indexOf(step.phase);
            const isDone = currentIndex > stepIndex;
            const isActive = currentIndex === stepIndex;
            const isPending = currentIndex < stepIndex;
            return (
              <React.Fragment key={step.phase}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone
                      ? "bg-blue-600 text-white"
                      : isActive
                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400"
                        : "bg-slate-100 text-slate-400"
                      }`}
                  >
                    {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-medium ${isDone || isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mb-4 transition-colors ${isDone ? "bg-blue-600" : "bg-slate-200"
                      }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Barra de progresso */}
        <div className="w-full max-w-md">
          <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 transition-all duration-500 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-slate-400 mt-1">{state.progress}%</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Componente Principal
// ============================================================
export default function UploadsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // File & Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [showProcessed, setShowProcessed] = useState(false);

  const { movements } = useMovements();
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Categoria Suggestions
  const dbCategories = React.useMemo(() => {
    if (!movements) return [];
    return Array.from(new Set(movements.map((m) => m.category).filter(Boolean)));
  }, [movements]);

  const suggestedCategories = React.useMemo(() => {
    const defaults = ["Venda", "Matéria Prima", "Manutenção", "Utilidades", "Pessoal", "Compras", "Geral"];
    return Array.from(new Set([...dbCategories, ...defaults])).slice(0, 8);
  }, [dbCategories]);

  const getCategorySuggestionsForRow = useCallback((row: ParsedOCRRow) => {
    if (row.type === "entrada") {
      const entries = suggestedCategories.filter((c) =>
        ["Venda", "Receitas", "Serviços", "Faturamento", "Geral"].includes(c) ||
        movements.some((m) => m.category === c && m.type === "entrada")
      );
      return entries.length > 0 ? entries.slice(0, 3) : ["Venda", "Geral"];
    } else {
      const expenses = suggestedCategories.filter((c) =>
        !["Venda", "Receitas", "Serviços", "Faturamento"].includes(c) ||
        movements.some((m) => m.category === c && m.type === "saída")
      );
      return expenses.length > 0 ? expenses.slice(0, 3) : ["Matéria Prima", "Utilidades", "Compras"];
    }
  }, [suggestedCategories, movements]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // OCR State
  const [progressState, setProgressState] = useState<OCRProgressState>({
    phase: "idle",
    progress: 0,
    label: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<OCRPipelineResult | null>(null);
  const [rows, setRows] = useState<ParsedOCRRow[]>([]);

  // Import State
  const [isImported, setIsImported] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);

  // ── Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) handleFileSelected(files[0]);
  };

  // ── File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFileSelected(e.target.files[0]);
  };

  const handleFileSelected = (file: File) => {
    setImageFile(file);
    setIsImported(false);
    setImportError(null);
    setProcessedPreview(null);
    setShowProcessed(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      runPipeline(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── Run OCR Pipeline
  const runPipeline = useCallback(async (source: File | Blob | string) => {
    setIsProcessing(true);
    setProgressState({ phase: "preprocessing", progress: 5, label: "Iniciando..." });
    setPipelineResult(null);
    setRows([]);

    try {
      const result = await runOCRPipeline(
        source,
        {
          upscaleFactor: 2,
          binarize: false,   // ← false = melhor para cadernos manuscritos
          psmMode: 6,
          exportPreview: true
        },
        (state) => setProgressState(state)
      );

      console.log("[OCR Page] Pipeline result:", {
        rows: result.rows.length,
        confidence: result.overallConfidence,
        rawText: result.rawText?.slice(0, 200),
      });

      setPipelineResult(result);

      if (result.rows.length > 0) {
        setRows(result.rows);
      } else {
        // Não há linhas válidas: deixa tabela vazia para o usuário corrigir
        // (não usa getFallbackRows para não confundir com dados reais)
        console.warn("[OCR Page] Nenhuma linha extraída. Texto bruto:", result.rawText);
        setRows([]);
      }

      if (result.preprocessedImageUrl) {
        setProcessedPreview(result.preprocessedImageUrl);
      }
      setProgressState({ phase: "done", progress: 100, label: "Concluído!" });
    } catch (err) {
      console.error("[OCR Page] Erro no pipeline:", err);
      setProgressState({ phase: "error", progress: 0, label: "Erro no processamento" });
      setRows([]);
    } finally {
      setTimeout(() => setIsProcessing(false), 600);
    }
  }, []);

  // ── Reprocess (melhorar leitura)
  const handleReprocess = async () => {
    if (!imageFile && !imagePreview) return;
    setIsReprocessing(true);
    setProgressState({ phase: "preprocessing", progress: 5, label: "Reprocessando com parâmetros avançados..." });

    try {
      const source = imagePreview ?? imageFile!;
      const newResult = pipelineResult
        ? await reprocessOCR(source, pipelineResult, (state) =>
          setProgressState(state)
        )
        : await runOCRPipeline(
          source,
          { upscaleFactor: 3, binarize: false, psmMode: 11, exportPreview: true },
          (state) => setProgressState(state)
        );

      setPipelineResult(newResult);
      setRows(newResult.rows.length > 0 ? newResult.rows : getFallbackRows());
      if (newResult.preprocessedImageUrl) {
        setProcessedPreview(newResult.preprocessedImageUrl);
      }
    } finally {
      setIsReprocessing(false);
      setTimeout(
        () => setProgressState({ phase: "idle", progress: 0, label: "" }),
        1000
      );
    }
  };

  // ── Demo
  const loadDemo = () => {
    setIsImported(false);
    setImportError(null);
    setImageFile(null);
    setImagePreview(DEMO_IMAGE);
    setProcessedPreview(null);
    setShowProcessed(false);
    setIsProcessing(true);
    setProgressState({ phase: "preprocessing", progress: 10, label: "Simulando pipeline..." });

    const steps = [
      { delay: 300, p: 30, phase: "preprocessing" as const, label: "Otimizando imagem..." },
      { delay: 700, p: 50, phase: "ocr_loading" as const, label: "Carregando motor OCR..." },
      { delay: 1100, p: 75, phase: "ocr_reading" as const, label: "Extraindo texto manuscrito..." },
      { delay: 1500, p: 90, phase: "parsing" as const, label: "Organizando lançamentos..." },
      { delay: 1900, p: 100, phase: "done" as const, label: "Concluído!" },
    ];

    steps.forEach(({ delay, p, phase, label }) => {
      setTimeout(() => setProgressState({ phase, progress: p, label }), delay);
    });

    setTimeout(() => {
      setRows(DEMO_ROWS);
      setPipelineResult({
        rows: DEMO_ROWS,
        rawText: "Demo OCR text",
        overallConfidence: 63,
        durationMs: 1900,
      });
      setIsProcessing(false);
    }, 2100);
  };

  // ── Row Manipulation
  const handleUpdateRow = (index: number, field: keyof ParsedOCRRow, value: any) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: field === "amount" ? Number(value) : value,
      // Quando o usuário edita, aumenta a confiança para indicar revisão manual
      confidence: field === "description" || field === "amount" ? Math.max(updated[index].confidence, 80) : updated[index].confidence,
      confidenceLevel: field === "description" || field === "amount" ? "high" : updated[index].confidenceLevel,
    };
    setRows(updated);
  };

  const handleAddRow = () => {
    setRows([
      ...rows,
      {
        date: new Date().toISOString().split("T")[0],
        description: "",
        category: "Geral",
        type: "entrada",
        amount: 0,
        confidence: 100,
        confidenceLevel: "high",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  // ── Import
  const handleConfirmImport = async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      await movementsService.createBatch(
        rows.map((row) => ({
          description: row.description || "Importado do Caderno",
          amount: row.amount || 0.01,
          date: row.date,
          type: row.type,
          category: row.category,
        }))
      );

      let imageUrl = imagePreview ?? DEMO_IMAGE;
      let storagePath: string | undefined;

      if (imageFile) {
        try {
          const uploaded = await uploadsService.uploadImage(imageFile);
          imageUrl = uploaded.url;
          storagePath = uploaded.path;
        } catch {
          console.warn("Storage upload falhou, usando preview local");
        }
      }

      await uploadsService.createRecord({
        image_url: imageUrl,
        storage_path: storagePath,
        ocr_text: pipelineResult?.rawText ?? rows.map((r) => r.description).join("; "),
        processing_status: "completed",
      });

      setIsImported(true);
      setRows([]);
      setImageFile(null);
      setImagePreview(null);
      setProcessedPreview(null);
      setPipelineResult(null);
    } catch (err: any) {
      setImportError(err?.message ?? "Erro ao importar. Verifique sua conexão e tente novamente.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setProcessedPreview(null);
    setRows([]);
    setPipelineResult(null);
    setIsImported(false);
    setImportError(null);
    setProgressState({ phase: "idle", progress: 0, label: "" });
    setShowProcessed(false);
  };

  // ── Helpers
  const getFallbackRows = (): ParsedOCRRow[] => [
    {
      date: new Date().toISOString().split("T")[0],
      description: "Ajuste manual necessário",
      category: "Geral",
      type: "entrada",
      amount: 0,
      confidence: 15,
      confidenceLevel: "low",
    },
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const overallConf = pipelineResult?.overallConfidence ?? 0;
  const confLabel =
    overallConf >= 70 ? "Alta" : overallConf >= 40 ? "Média" : "Baixa";
  const confClass =
    overallConf >= 70
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : overallConf >= 40
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";

  const highConfRows = rows.filter((r) => r.confidenceLevel === "high").length;
  const lowConfRows = rows.filter((r) => r.confidenceLevel === "low").length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Upload e OCR de Cadernos
          </h2>
          <p className="text-sm text-slate-500">
            Pipeline avançado de reconhecimento óptico com pré-processamento e correção automática
          </p>
        </div>

        {/* Success Banner */}
        {isImported && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Importação concluída!</p>
                <p className="text-sm text-emerald-700">
                  Todos os registros foram salvos nas movimentações.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push("/movimentacoes")}
                variant="outline"
                className="text-slate-700 bg-white"
              >
                Ver Movimentações
              </Button>
              <Button
                onClick={handleReset}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              >
                Digitalizar Outro
              </Button>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {importError && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm">
            <p className="font-semibold">Erro na importação</p>
            <p>{importError}</p>
          </div>
        )}

        {/* Upload Area — inicial */}
        {!imagePreview && !isProcessing && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card
              className={`md:col-span-2 border-2 border-dashed transition-all duration-200 cursor-pointer ${isDragging
                ? "border-blue-500 bg-blue-50/20 scale-[1.01]"
                : "border-slate-300 hover:border-blue-400 bg-white hover:bg-blue-50/5"
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <CardContent
                className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-5"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isDragging ? "bg-blue-100" : "bg-slate-100"
                    }`}
                >
                  <UploadCloud
                    className={`w-7 h-7 transition-colors ${isDragging ? "text-blue-500" : "text-slate-400"
                      }`}
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-base">
                    {isDragging
                      ? "Solte para processar!"
                      : "Arraste a foto ou toque para enviar"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    JPG, PNG, WEBP — até 15MB. O sistema aplica pré-processamento
                    automático para melhorar a leitura.
                  </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                  <UploadCloud className="w-4 h-4" />
                  Escolher Arquivo
                </Button>

                {/* Pipeline badges */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {["Correção de inclinação", "Binarização adaptativa", "Contraste automático", "OCR Neural (LSTM)"].map((f) => (
                    <span
                      key={f}
                      className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full"
                    >
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="border-slate-150 shadow-sm flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
                <CardDescription>
                  Use no celular para fotografar o caderno diretamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col justify-center">
                <input
                  type="file"
                  ref={cameraInputRef}
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                />
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  variant="outline"
                  className="w-full h-12 gap-3 justify-center text-slate-700 font-semibold border-slate-200"
                >
                  <Camera className="w-5 h-5 text-blue-600" />
                  Abrir Câmera
                </Button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-150" />
                  <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase">
                    Ou demonstração
                  </span>
                  <div className="flex-grow border-t border-slate-150" />
                </div>

                <Button
                  onClick={loadDemo}
                  variant="ghost"
                  className="w-full h-12 gap-3 justify-center text-blue-600 hover:bg-blue-50 border border-blue-100"
                >
                  <Sparkles className="w-5 h-5" />
                  Carregar Caderno Demo
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Processing Screen */}
        {isProcessing && <OCRProgressCard state={progressState} />}

        {/* Review Layout */}
        {!isProcessing && imagePreview && rows.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left: Image Panel */}
            <Card className="lg:col-span-5 border-slate-150 shadow-sm overflow-hidden sticky top-6">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-semibold">Imagem do Caderno</CardTitle>
                <div className="flex items-center gap-1.5">
                  {processedPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProcessed(!showProcessed)}
                      className="text-xs text-slate-500 gap-1.5 h-7 px-2"
                    >
                      {showProcessed ? (
                        <>
                          <EyeOff className="w-3 h-3" /> Original
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Processada
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-slate-500 gap-1.5 h-7 px-2"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Trocar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-slate-950 flex items-center justify-center min-h-[280px] max-h-[480px] overflow-hidden">
                <div className="relative w-fit max-w-full mx-auto overflow-hidden">
                  <img
                    src={showProcessed && processedPreview ? processedPreview : imagePreview}
                    alt="Caderno"
                    className="max-h-[480px] w-auto max-w-full object-contain block select-none"
                    onLoad={handleImageLoad}
                  />
                  {/* Highlight overlay */}
                  {hoveredRowIndex !== null && rows[hoveredRowIndex]?.bbox && imageDimensions && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500/25 pointer-events-none transition-all duration-150 animate-pulse rounded-[1px] shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                      style={{
                        left: `${(rows[hoveredRowIndex].bbox!.x0 / imageDimensions.width) * 100}%`,
                        top: `${(rows[hoveredRowIndex].bbox!.y0 / imageDimensions.height) * 100}%`,
                        width: `${((rows[hoveredRowIndex].bbox!.x1 - rows[hoveredRowIndex].bbox!.x0) / imageDimensions.width) * 100}%`,
                        height: `${((rows[hoveredRowIndex].bbox!.y1 - rows[hoveredRowIndex].bbox!.y0) / imageDimensions.height) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </CardContent>

              {/* OCR Summary */}
              {pipelineResult && (
                <div className="p-4 space-y-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Resultado do Pipeline
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500">Confiança Geral</p>
                      <p className={`text-sm font-bold mt-0.5 ${overallConf >= 70 ? "text-emerald-600" : overallConf >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {overallConf}% — {confLabel}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-slate-500">Linhas extraídas</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">
                        {rows.length} linhas
                      </p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-emerald-600">Alta confiança</p>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">
                        {highConfRows}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-red-600">Precisa revisar</p>
                      <p className="text-sm font-bold text-red-700 mt-0.5">
                        {lowConfRows}
                      </p>
                    </div>
                  </div>

                  {pipelineResult.durationMs > 0 && (
                    <p className="text-[10px] text-slate-400 text-center">
                      Processado em {(pipelineResult.durationMs / 1000).toFixed(1)}s
                    </p>
                  )}

                  {pipelineResult.rawText && (
                    <details className="text-left border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                      <summary className="text-[10px] font-semibold text-slate-500 cursor-pointer uppercase tracking-wide select-none">
                        Texto Bruto do OCR
                      </summary>
                      <pre className="text-[9px] text-slate-600 mt-2 whitespace-pre-wrap break-all font-mono max-h-[120px] overflow-y-auto">
                        {pipelineResult.rawText}
                      </pre>
                    </details>
                  )}

                  {/* Botão Melhorar Leitura */}
                  {imageFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReprocess}
                      disabled={isReprocessing}
                      className="w-full gap-2 text-xs h-8 text-slate-600 border-slate-200"
                    >
                      {isReprocessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Reprocessando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                          Melhorar Leitura
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </Card>

            {/* Right: Review Table */}
            <Card className="lg:col-span-7 border-slate-150 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Revisão dos Dados Extraídos</CardTitle>
                    <CardDescription className="mt-0.5">
                      Confira, corrija e ajuste os valores antes de importar. Linhas com
                      confiança{" "}
                      <span className="text-red-600 font-semibold">baixa</span>{" "}
                      precisam de revisão especial.
                    </CardDescription>
                  </div>
                  {pipelineResult && (
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${confClass}`}
                    >
                      {overallConf}% confiança
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="w-[120px] text-xs">Data</TableHead>
                      <TableHead className="text-xs">Descrição</TableHead>
                      <TableHead className="w-[110px] text-xs">Categoria</TableHead>
                      <TableHead className="w-[90px] text-xs">Tipo</TableHead>
                      <TableHead className="w-[105px] text-right text-xs">Valor</TableHead>
                      <TableHead className="w-[80px] text-center text-xs">Conf.</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && pipelineResult && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center">
                          <div className="space-y-3 max-w-sm mx-auto">
                            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                            <p className="text-sm font-semibold text-slate-700">
                              Nenhuma linha estruturada foi detectada
                            </p>
                            <p className="text-xs text-slate-500">
                              O OCR leu a imagem mas não conseguiu identificar linhas de tabela válidas.
                              Clique em <strong>Melhorar Leitura</strong> ou adicione linhas manualmente.
                            </p>
                            {pipelineResult.rawText && (
                              <details className="text-left bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <summary className="text-[10px] font-semibold text-slate-500 cursor-pointer uppercase tracking-wide">
                                  Texto bruto detectado pelo OCR
                                </summary>
                                <pre className="text-[10px] text-slate-600 mt-2 whitespace-pre-wrap break-all font-mono">
                                  {pipelineResult.rawText}
                                </pre>
                              </details>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAddRow}
                              className="gap-1.5 text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" /> Adicionar linha manualmente
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {rows.map((row, index) => (
                      <TableRow
                        key={index}
                        onMouseEnter={() => setHoveredRowIndex(index)}
                        onMouseLeave={() => setHoveredRowIndex(null)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-default ${row.confidenceLevel === "low" ? "bg-red-50/20" : ""
                          } ${hoveredRowIndex === index ? "bg-blue-50/40" : ""}`}
                      >
                        {/* Data */}
                        <TableCell className="p-1.5">
                          <Input
                            type="date"
                            value={row.date}
                            onChange={(e) => handleUpdateRow(index, "date", e.target.value)}
                            className="h-8 px-2 text-xs"
                          />
                        </TableCell>

                        {/* Descrição */}
                        <TableCell className="p-1.5">
                          <div className="space-y-1">
                            <Input
                              value={row.description}
                              onChange={(e) => handleUpdateRow(index, "description", e.target.value)}
                              placeholder="Descrição..."
                              className="h-8 px-2 text-xs font-medium"
                            />
                            {row.rawText && row.confidenceLevel !== "high" && (
                              <p className="text-[9px] text-slate-400 px-1 truncate max-w-[180px]" title={row.rawText}>
                                OCR: {row.rawText}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Categoria */}
                        <TableCell className="p-1.5">
                          <div className="space-y-1 min-w-[110px]">
                            <Input
                              value={row.category}
                              onChange={(e) => handleUpdateRow(index, "category", e.target.value)}
                              placeholder="Categoria..."
                              className="h-8 px-2 text-xs"
                            />
                            <div className="flex flex-wrap gap-1">
                              {getCategorySuggestionsForRow(row).map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => handleUpdateRow(index, "category", cat)}
                                  className={`text-[9px] px-1 py-0.5 rounded transition-colors font-medium border border-slate-200 ${row.category === cat
                                    ? "bg-blue-100 text-blue-700 border-blue-200"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                                    }`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        </TableCell>

                        {/* Tipo */}
                        <TableCell className="p-1.5">
                          <select
                            value={row.type}
                            onChange={(e) => handleUpdateRow(index, "type", e.target.value as any)}
                            className={`flex h-8 w-full rounded-md border border-input bg-background px-1.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${row.type === "entrada"
                              ? "text-emerald-700 font-semibold"
                              : "text-orange-700 font-semibold"
                              }`}
                          >
                            <option value="entrada">↑ Entrada</option>
                            <option value="saída">↓ Saída</option>
                          </select>
                        </TableCell>

                        {/* Valor */}
                        <TableCell className="p-1.5">
                          <div className="space-y-1 min-w-[105px]">
                            <Input
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => handleUpdateRow(index, "amount", e.target.value)}
                              className={`h-8 px-2 text-xs text-right font-semibold ${row.amount === 0 ? "border-red-300 bg-red-50/30" : ""
                                }`}
                            />
                            {row.suggestedAmounts && row.suggestedAmounts.length > 1 && (
                              <div className="flex flex-wrap gap-1 justify-end">
                                {row.suggestedAmounts.map((amt) => (
                                  <button
                                    key={amt}
                                    type="button"
                                    onClick={() => handleUpdateRow(index, "amount", amt)}
                                    className={`text-[9px] px-1 py-0.5 rounded transition-colors font-medium border border-slate-200 ${row.amount === amt
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                                      }`}
                                    title={`Sugerido: ${formatCurrency(amt)}`}
                                  >
                                    {amt}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Confiança */}
                        <TableCell className="p-1.5 text-center">
                          <ConfidenceBadge
                            level={row.confidenceLevel}
                            score={row.confidence}
                          />
                        </TableCell>

                        {/* Ação */}
                        <TableCell className="p-1.5 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(index)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>

              <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 p-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="gap-1.5 w-full sm:w-auto h-9"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Linha
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="w-full sm:w-auto text-slate-600"
                  >
                    Descartar
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto gap-2"
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirmar Importação
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
