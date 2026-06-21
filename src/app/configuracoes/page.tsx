"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useSettings } from "@/hooks/useSettings";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Building, Bell, CheckCircle, Loader2, AlertCircle } from "lucide-react";

export default function ConfiguracoesPage() {
  const { settings, setSettings, loading, saving, save } = useSettings();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-2xl animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded-lg" />
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="h-48 bg-slate-200 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      await save(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar as configurações. Tente novamente.");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h2>
          <p className="text-sm text-slate-500">Configure os dados da empresa e preferências do sistema</p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            {/* Empresa */}
            <Card className="border-slate-150 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Building className="w-4.5 h-4.5 text-blue-600" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>Informações de registro de sua empresa no sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="logoUrl">Link do Logotipo (URL)</Label>
                  <Input
                    id="logoUrl"
                    placeholder="https://exemplo.com/logo.png"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Usuário */}
            <Card className="border-slate-150 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4.5 h-4.5 text-blue-600" />
                  Perfil do Usuário
                </CardTitle>
                <CardDescription>Gerencie suas informações de acesso e contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="userName">Nome Completo</Label>
                  <Input
                    id="userName"
                    value={settings.userName}
                    onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="userEmail">E-mail de Login</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={settings.userEmail}
                    disabled
                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400">O e-mail é gerenciado pelo Supabase Auth e não pode ser alterado aqui.</p>
                </div>
              </CardContent>
            </Card>

            {/* Preferências do Sistema */}
            <Card className="border-slate-150 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4.5 h-4.5 text-blue-600" />
                  Preferências do Sistema
                </CardTitle>
                <CardDescription>Opções gerais para notificações e uso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Notificações no Celular</p>
                    <p className="text-xs text-slate-500">Enviar lembretes de contas vencendo hoje</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Backup Automático</p>
                    <p className="text-xs text-slate-500">Dados sincronizados automaticamente com Supabase</p>
                  </div>
                  <input type="checkbox" defaultChecked disabled className="w-4 h-4 accent-blue-600" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-4 border-t border-slate-100">
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    "Salvar Todas as Configurações"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
