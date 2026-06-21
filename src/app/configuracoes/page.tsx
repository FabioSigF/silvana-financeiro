"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useSettings } from "@/hooks/useSettings";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Building, Bell, CheckCircle, Loader2, AlertCircle, Tag, Plus, Edit2, Trash2 } from "lucide-react";
import { Category } from "@/types";

export default function ConfiguracoesPage() {
  const { settings, setSettings, loading, saving, save } = useSettings();
  const { categories, loading: loadingCategories, create: createCategory, update: updateCategory, remove: removeCategory } = useCategories();
  
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Category Form State
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  const [categoryColorInput, setCategoryColorInput] = useState("#3B82F6");
  const [categoryActiveInput, setCategoryActiveInput] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isCategorySaving, setIsCategorySaving] = useState(false);

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

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput("");
    setCategoryColorInput("#3B82F6");
    setCategoryActiveInput(true);
    setCategoryError(null);
    setIsCategoryFormOpen(true);
  };

  const handleOpenEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCategoryNameInput(c.name);
    setCategoryColorInput(c.color || "#3B82F6");
    setCategoryActiveInput(c.active);
    setCategoryError(null);
    setIsCategoryFormOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);
    setIsCategorySaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryNameInput,
          color: categoryColorInput,
          active: categoryActiveInput,
        });
      } else {
        await createCategory({
          name: categoryNameInput,
          color: categoryColorInput,
          active: true,
        });
      }
      setIsCategoryFormOpen(false);
    } catch (err: any) {
      setCategoryError(err?.message ?? "Erro ao salvar categoria.");
    } finally {
      setIsCategorySaving(false);
    }
  };

  const handleRemoveCategory = async (category: Category) => {
    if (confirm(`Deseja realmente excluir a categoria "${category.name}"? Se ela estiver vinculada a alguma transação ou conta, ela será apenas desativada.`)) {
      try {
        const result = await removeCategory(category.id, category.name);
        if (result.action === 'deleted') {
          alert("Categoria excluída com sucesso.");
        } else {
          alert("A categoria está em uso e foi apenas desativada.");
        }
      } catch (err: any) {
        alert(err?.message ?? "Erro ao remover categoria.");
      }
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

        {/* Categorias Financeiras */}
        <Card className="border-slate-150 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Tag className="w-4.5 h-4.5 text-blue-600" />
                Categorias Financeiras
              </CardTitle>
              <CardDescription>Gerencie as categorias de receitas e despesas</CardDescription>
            </div>
            <Button 
              type="button" 
              onClick={handleOpenCreateCategory} 
              variant="outline" 
              size="sm" 
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Categoria
            </Button>
          </CardHeader>
          <CardContent>
            {loadingCategories ? (
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando categorias...</span>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Nenhuma categoria cadastrada.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || "#64748B" }} />
                      <span className={`text-sm font-medium ${c.active ? "text-slate-900" : "text-slate-400 line-through"}`}>
                        {c.name}
                      </span>
                      {!c.active && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Inativa</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-blue-600"
                        onClick={() => handleOpenEditCategory(c)}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-red-650"
                        onClick={() => handleRemoveCategory(c)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Modal: Criar/Editar Categoria */}
        <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <form onSubmit={handleSaveCategory}>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
                <DialogDescription>
                  Defina o nome, a cor e se a categoria está ativa.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {categoryError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-650 shrink-0" />
                    <span>{categoryError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="categoryNameInput">Nome da Categoria</Label>
                  <Input
                    id="categoryNameInput"
                    value={categoryNameInput}
                    onChange={(e) => setCategoryNameInput(e.target.value)}
                    placeholder="Ex: Consultoria, Alimentação"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="categoryColorInput">Cor de Destaque</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="categoryColorInput"
                      type="color"
                      className="w-12 h-10 p-0 cursor-pointer border-slate-200"
                      value={categoryColorInput}
                      onChange={(e) => setCategoryColorInput(e.target.value)}
                    />
                    <Input
                      type="text"
                      className="flex-1"
                      placeholder="#HEX"
                      value={categoryColorInput}
                      onChange={(e) => setCategoryColorInput(e.target.value)}
                    />
                  </div>
                </div>

                {editingCategory && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="categoryActiveInput"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                      checked={categoryActiveInput}
                      onChange={(e) => setCategoryActiveInput(e.target.checked)}
                    />
                    <Label htmlFor="categoryActiveInput" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                      Categoria Ativa (Disponível para novos lançamentos)
                    </Label>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCategoryFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isCategorySaving}>
                  {isCategorySaving ? (
                    <span className="flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </span>
                  ) : "Salvar Categoria"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
