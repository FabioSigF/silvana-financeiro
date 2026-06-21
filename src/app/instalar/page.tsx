"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { getPWAStatus, PWAStatus } from "@/lib/pwa/pwa-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Compass,
} from "lucide-react";

export default function InstalarPwaPage() {
  const [status, setStatus] = useState<PWAStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateStatus = async () => {
    const currentStatus = await getPWAStatus();
    setStatus(currentStatus);
    setIsLoading(false);
  };

  useEffect(() => {
    updateStatus();

    // Atualiza status ao disparar o prompt
    const handlePromptAvailable = () => {
      updateStatus();
    };

    window.addEventListener("pwa-install-prompt-available", handlePromptAvailable);
    
    // Intervalo de segurança para checar se o service worker ativou
    const interval = setInterval(updateStatus, 3000);

    return () => {
      window.removeEventListener("pwa-install-prompt-available", handlePromptAvailable);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;

    // Mostra o prompt de instalação
    promptEvent.prompt();

    // Aguarda a escolha do usuário
    const { outcome } = await promptEvent.userChoice;
    console.log(`Escolha do usuário: ${outcome}`);

    // Limpa o prompt diferido (só pode ser usado uma vez)
    (window as any).deferredPrompt = null;
    
    // Atualiza status local
    updateStatus();
  };

  const getStatusBadge = (active: boolean, activeLabel: string, inactiveLabel: string) => {
    return active ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
        {activeLabel}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {inactiveLabel}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Instalar Aplicativo</h2>
          <p className="text-sm text-slate-500">
            Adicione o Silvana Financeiro à tela inicial para acesso rápido e melhor desempenho
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="text-sm font-medium">Verificando status de instalação...</span>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-12 items-start">
            {/* Seção Principal de Ação */}
            <div className="md:col-span-7 space-y-6">
              {status?.isStandalone ? (
                /* Cenário 2 - Aplicativo Já Instalado */
                <Card className="border-emerald-100 bg-emerald-50/10 shadow-sm overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg font-bold text-emerald-800">Aplicativo já instalado</CardTitle>
                    <CardDescription className="text-emerald-700 font-medium">
                      O Silvana Financeiro já está instalado e rodando como um aplicativo nativo neste dispositivo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-slate-655 text-sm leading-relaxed space-y-2 border-t border-emerald-100/50 pt-4 bg-emerald-50/5">
                    <p>
                      Você já pode fechar o navegador e usar o ícone criado na área de trabalho ou tela de aplicativos do seu celular.
                    </p>
                    <p className="font-semibold text-emerald-800 text-xs">
                      ✓ Desempenho otimizado • ✓ Sem barras de endereço • ✓ Atualizações silenciosas
                    </p>
                  </CardContent>
                </Card>
              ) : (
                /* Cenário 1 & 3 - Exibe o Botão de Instalação e os Manuais se necessário */
                <>
                  <Card className="border-blue-150 shadow-sm bg-gradient-to-br from-white to-blue-50/10">
                    <CardHeader className="pb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
                        <Download className="w-6 h-6 animate-bounce" />
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900">Instale o Silvana Financeiro</CardTitle>
                      <CardDescription className="text-slate-500">
                        Tenha acesso rápido ao sistema diretamente na tela inicial do seu dispositivo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Utilize o aplicativo em tela cheia sem barras de navegação do navegador, funcionando com maior fluidez e desempenho de app nativo.
                      </p>
                      <Button 
                        onClick={handleInstallClick} 
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto gap-2 text-sm font-semibold h-11 px-6 rounded-lg animate-pulse"
                      >
                        <Download className="w-4 h-4" />
                        Instalar Aplicativo
                      </Button>
                      
                      {!status?.isInstallAvailable && (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 p-2.5 rounded-lg flex items-center gap-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Instalação direta não disponível automaticamente neste navegador. Use o botão acima para tentar, ou siga as instruções abaixo.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {!status?.isInstallAvailable && (
                    <Card className="border-slate-150 shadow-sm bg-white">
                      <CardHeader className="pb-3 border-b border-slate-100">
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <Info className="w-4.5 h-4.5 text-slate-400" />
                          Instruções de Instalação Manual
                        </CardTitle>
                        <CardDescription>
                          Seu navegador atual não disparou o prompt automático de instalação. Siga os passos abaixo:
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-6">
                        {/* iPhone / Safari */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-blue-600" />
                            Dispositivos Apple / iPhone (Safari)
                          </h4>
                          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1.5">
                            <li>Abra esta página no navegador <strong className="text-slate-800 font-semibold">Safari</strong></li>
                            <li>Toque no botão <strong className="text-slate-800 font-semibold">Compartilhar</strong> (ícone de seta para cima em um quadrado)</li>
                            <li>Role a lista e escolha <strong className="text-slate-850 font-bold">"Adicionar à Tela de Início"</strong></li>
                            <li>Defina o nome e confirme clicando em <strong className="text-blue-600 font-bold">Adicionar</strong></li>
                          </ol>
                        </div>

                        {/* Android */}
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Compass className="w-4 h-4 text-emerald-600" />
                            Dispositivos Android (Chrome)
                          </h4>
                          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1.5">
                            <li>Toque no menu do navegador (ícone de <strong className="text-slate-800 font-semibold">três pontinhos</strong> no canto superior direito)</li>
                            <li>Escolha a opção <strong className="text-slate-850 font-bold">"Instalar aplicativo"</strong> ou <strong className="text-slate-850 font-bold">"Adicionar à tela inicial"</strong></li>
                            <li>Confirme a instalação no pop-up</li>
                          </ol>
                        </div>

                        {/* Desktop */}
                        <div className="space-y-2 border-t border-slate-100 pt-4">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-purple-600" />
                            Computadores (Chrome, Edge ou Opera)
                          </h4>
                          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 pl-1.5">
                            <li>Clique no menu do navegador no topo superior direito (<strong className="text-slate-800 font-semibold">três pontinhos</strong>)</li>
                            <li>Procure pela opção <strong className="text-slate-850 font-bold">"Instalar Silvana Financeiro..."</strong> ou o ícone de monitor na barra de endereços</li>
                            <li>Confirme a instalação no diálogo exibido</li>
                          </ol>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Cards Informativos UX */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-slate-100 shadow-sm bg-slate-50/50">
                  <CardHeader className="p-4 pb-2">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-xs font-bold text-slate-900 mt-2">Instalação Mobile</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Acesse o painel financeiro rapidamente pelo celular sem precisar digitar o endereço no navegador.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-slate-50/50">
                  <CardHeader className="p-4 pb-2">
                    <Laptop className="w-5 h-5 text-purple-600" />
                    <CardTitle className="text-xs font-bold text-slate-900 mt-2">Instalação Desktop</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      Utilize o Silvana Financeiro como um aplicativo nativo no computador, com atalho na área de trabalho.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-slate-100 shadow-sm bg-slate-50/50">
                  <CardHeader className="p-4 pb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-xs font-bold text-slate-900 mt-2">Atualizações Automáticas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      O aplicativo é atualizado automaticamente em segundo plano sempre que novas versões forem lançadas.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Painel Lateral: PWA Status */}
            <div className="md:col-span-5 space-y-6">
              <Card className="border-slate-150 shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">Status da Instalação (PWA)</CardTitle>
                  <CardDescription className="text-xs">Validações estruturais e de rede da aplicação</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Status Item: Manifest */}
                  <div className="flex items-center justify-between text-xs py-1">
                    <span className="font-semibold text-slate-600">Manifesto Web</span>
                    {getStatusBadge(!!status?.hasManifest, "Manifesto detectado", "Manifesto não encontrado")}
                  </div>

                  {/* Status Item: Service Worker */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-50 pt-3">
                    <span className="font-semibold text-slate-600">Service Worker</span>
                    {getStatusBadge(!!status?.hasServiceWorker, "Ativo", "Não registrado")}
                  </div>

                  {/* Status Item: Modo de Exibição */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-50 pt-3">
                    <span className="font-semibold text-slate-600">Instalação</span>
                    {getStatusBadge(!!status?.isStandalone, "Instalado (Standalone)", "Não instalado")}
                  </div>

                  {/* Status Item: Suporte Geral */}
                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-50 pt-3">
                    <span className="font-semibold text-slate-600">Compatibilidade do Navegador</span>
                    {status?.isSupported ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">Suportado</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Limitado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Dica de Segurança */}
              <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex gap-3 text-xs text-slate-600 leading-relaxed shadow-sm">
                <Compass className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong className="text-slate-800 block mb-1">Dica de Acesso PWA</strong>
                  Após instalado, o aplicativo lembrará seu login do Supabase, evitando a necessidade de digitar suas credenciais constantemente a cada acesso.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
