"use client";

import React, { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useMovements } from "@/hooks/useMovements";
import { useCategories } from "@/hooks/useCategories";
import { Movement } from "@/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Search, FilterX, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const movementSchema = z.object({
  description: z.string().min(3, "Descrição é muito curta"),
  amount: z.coerce.number().gt(0, "O valor deve ser maior que zero"),
  date: z.string().min(10, "Data inválida"),
  type: z.enum(["entrada", "saída"] as const),
  category: z.string().min(2, "Categoria inválida"),
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function MovimentacoesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Filter States
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterCategory, setFilterCategory] = useState<string>("todos");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { movements, totalCount, loading, reload, create, update, remove } = useMovements({
    page: currentPage,
    pageSize,
    search,
    type: filterType,
    category: filterCategory,
    startDate,
    endDate,
  });

  const { categories } = useCategories();

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      type: "entrada",
      category: "",
    },
  });

  const watchCategory = watch("category");

  // Reload dynamically when pagination or filters change
  useEffect(() => {
    reload({
      page: currentPage,
      pageSize,
      search,
      type: filterType,
      category: filterCategory,
      startDate,
      endDate,
    });
  }, [currentPage, pageSize, search, filterType, filterCategory, startDate, endDate, reload]);

  // Reset page to 1 when filters change to avoid empty pages
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterCategory, startDate, endDate]);

  const handleOpenCreate = () => {
    setEditingMovement(null);
    setFormError(null);
    reset({
      description: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      type: "entrada",
      category: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: Movement) => {
    setEditingMovement(m);
    setFormError(null);
    reset({
      description: m.description,
      amount: m.amount,
      date: m.date,
      type: m.type,
      category: m.category,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (data: MovementFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingMovement) {
        await update(editingMovement.id, data);
      } else {
        await create(data);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await remove(deletingId);
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterType("todos");
    setFilterCategory("todos");
    setStartDate("");
    setEndDate("");
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Movimentações</h2>
            <p className="text-sm text-slate-500">Histórico detalhado e controle de entradas e saídas</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Nova Movimentação
          </Button>
        </div>

        {/* Filters Card */}
        <Card className="border-slate-150 shadow-sm">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Descrição ou categoria..."
                    className="pl-10 h-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={filterType} onValueChange={(val) => setFilterType(val ?? "todos")}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saída">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val ?? "todos")}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Start */}
              <div className="space-y-1.5">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  className="h-10"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* Date End */}
              <div className="space-y-1.5">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  className="h-10"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {(search || filterType !== "todos" || filterCategory !== "todos" || startDate || endDate) && (
              <div className="flex justify-end pt-2">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500 gap-1.5 h-8">
                  <FilterX className="w-3.5 h-3.5" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Movimentações */}
        <Card className="border-slate-150 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</TableHead>
                  <TableHead className="text-right w-[150px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</TableHead>
                  <TableHead className="text-right w-[120px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando movimentações...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                      Nenhuma movimentação financeira cadastrada ou encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow 
                      key={m.id} 
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button") || target.closest("input") || target.closest("a")) {
                          return;
                        }
                        handleOpenEdit(m);
                      }}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <TableCell className="font-medium text-slate-600 text-sm whitespace-nowrap">
                        {m.date.split("-").reverse().join("/")}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 text-sm max-w-[200px] truncate">
                        {m.description}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{m.category}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            m.type === "entrada"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-orange-50/70 text-orange-700"
                          }`}
                        >
                          {m.type === "entrada" ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {m.type === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold text-sm ${
                          m.type === "entrada" ? "text-emerald-650" : "text-slate-900"
                        }`}
                      >
                        {m.type === "entrada" ? "+" : "-"}{formatCurrency(m.amount)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(m)}
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(m.id)}
                            className="h-8 w-8 text-slate-500 hover:text-red-650 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Server-Side Pagination Controls */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-150 text-sm text-slate-500 bg-white">
              <div>
                Mostrando {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}–
                {Math.min(totalCount, currentPage * pageSize)} de {totalCount} registros
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  type="button"
                >
                  &lt;&lt;
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  type="button"
                >
                  &lt;
                </Button>
                <span className="mx-2 text-slate-700 font-medium">
                  Página {currentPage} de {Math.ceil(totalCount / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                  disabled={currentPage === Math.ceil(totalCount / pageSize)}
                  className="h-8 w-8 p-0"
                  type="button"
                >
                  &gt;
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                  disabled={currentPage === Math.ceil(totalCount / pageSize)}
                  className="h-8 w-8 p-0"
                  type="button"
                >
                  &gt;&gt;
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Modal: Form Criar/Editar */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleSubmit(handleSave)}>
              <DialogHeader>
                <DialogTitle>{editingMovement ? "Editar Movimentação" : "Nova Movimentação"}</DialogTitle>
                <DialogDescription>
                  Informe os dados detalhados da movimentação financeira para registro.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Type Selection */}
                  <div className="space-y-1.5 col-span-2">
                    <Label>Tipo de Lançamento</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 border border-slate-200 p-3 rounded-lg hover:bg-slate-50">
                        <input
                          type="radio"
                          value="entrada"
                          className="accent-blue-600"
                          {...register("type")}
                        />
                        <span className="text-sm font-semibold text-emerald-650 flex items-center gap-1">
                          <ArrowUpRight className="w-4 h-4" /> Entrada
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer flex-1 border border-slate-200 p-3 rounded-lg hover:bg-slate-50">
                        <input
                          type="radio"
                          value="saída"
                          className="accent-blue-600"
                          {...register("type")}
                        />
                        <span className="text-sm font-semibold text-orange-655 flex items-center gap-1">
                          <ArrowDownRight className="w-4 h-4" /> Saída
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Compra de Tecidos, Venda Uniforme..."
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-650 font-medium">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Amount */}
                  <div className="space-y-1.5">
                    <Label htmlFor="amount">Valor (R$)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register("amount")}
                    />
                    {errors.amount && (
                      <p className="text-xs text-red-650 font-medium">{errors.amount.message}</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" type="date" {...register("date")} />
                    {errors.date && (
                      <p className="text-xs text-red-650 font-medium">{errors.date.message}</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={watchCategory || ""}
                    onValueChange={(val) => setValue("category", val || "", { shouldValidate: true })}
                  >
                    <SelectTrigger id="category" className="h-10 bg-white">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c.active).map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-xs text-red-650 font-medium">{errors.category.message}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    editingMovement ? "Salvar Alterações" : "Registrar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Exclusão */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-red-600">Excluir Lançamento</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover esta movimentação financeira? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-750 text-white" disabled={isDeleting}>
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </span>
                ) : (
                  "Excluir Definitivamente"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
