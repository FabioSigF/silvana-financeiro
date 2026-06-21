"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/useAccounts";
import { useRecurringAccounts } from "@/hooks/useRecurringAccounts";
import { useCategories } from "@/hooks/useCategories";
import { AccountPayable, AccountStatus, RecurringAccount } from "@/types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Calendar, DollarSign, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const accountSchema = z.object({
  accountType: z.enum(["pontual", "recorrente"]),
  description: z.string().min(3, "Descrição é muito curta"),
  amount: z.coerce.number().gt(0, "O valor deve ser maior que zero"),
  due_date: z.string().optional(),
  status: z.enum(["pendente", "pago", "atrasado"] as const).optional(),
  day_of_month: z.coerce.number().optional(),
  category_id: z.string().optional().nullable(),
  active: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === "pontual") {
    if (!data.due_date || data.due_date.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data inválida",
        path: ["due_date"],
      });
    }
    if (!data.status) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione o status",
        path: ["status"],
      });
    }
  } else {
    if (data.day_of_month === undefined || isNaN(data.day_of_month) || data.day_of_month < 1 || data.day_of_month > 31) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dia inválido (1-31)",
        path: ["day_of_month"],
      });
    }
    if (!data.category_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione uma categoria",
        path: ["category_id"],
      });
    }
  }
});

type AccountFormData = z.infer<typeof accountSchema>;

export default function ContasAPagarPage() {
  const { accounts, loading: loadingPontual, create: createPontual, update: updatePontual, remove: removePontual } = useAccounts();
  const { recurringAccounts, loading: loadingRecurring, create: createRecurring, update: updateRecurring, remove: removeRecurring } = useRecurringAccounts();
  const { categories } = useCategories();

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringAccount | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<"pontual" | "recorrente" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      accountType: "pontual",
      description: "",
      amount: 0,
      due_date: new Date().toISOString().split("T")[0],
      status: "pendente",
      day_of_month: 5,
      category_id: "",
      active: true,
    },
  });

  const watchAccountType = watch("accountType");
  const watchCategoryId = watch("category_id");

  // Calculando indicadores resumidos (apenas de contas pontuais)
  const totalPendente = accounts
    .filter((a) => a.status === "pendente")
    .reduce((sum, a) => sum + a.amount, 0);

  const totalPago = accounts
    .filter((a) => a.status === "pago")
    .reduce((sum, a) => sum + a.amount, 0);

  const totalAtrasado = accounts
    .filter((a) => a.status === "atrasado")
    .reduce((sum, a) => sum + a.amount, 0);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setEditingRecurring(null);
    setFormError(null);
    reset({
      accountType: "pontual",
      description: "",
      amount: 0,
      due_date: new Date().toISOString().split("T")[0],
      status: "pendente",
      day_of_month: 5,
      category_id: "",
      active: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (a: AccountPayable) => {
    setEditingAccount(a);
    setEditingRecurring(null);
    setFormError(null);
    reset({
      accountType: "pontual",
      description: a.description,
      amount: a.amount,
      due_date: a.due_date,
      status: a.status,
      day_of_month: 5,
      category_id: "",
      active: true,
    });
    setIsFormOpen(true);
  };

  const handleOpenEditRecurring = (r: RecurringAccount) => {
    setEditingAccount(null);
    setEditingRecurring(r);
    setFormError(null);
    reset({
      accountType: "recorrente",
      description: r.description,
      amount: r.amount,
      due_date: new Date().toISOString().split("T")[0],
      status: "pendente",
      day_of_month: r.day_of_month,
      category_id: r.category_id || "",
      active: r.active,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (data: AccountFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      if (data.accountType === "pontual") {
        const payload = {
          description: data.description,
          amount: data.amount,
          due_date: data.due_date!,
          status: data.status!,
        };
        if (editingAccount) {
          await updatePontual(editingAccount.id, payload);
        } else {
          await createPontual(payload);
        }
      } else {
        const payload = {
          description: data.description,
          amount: data.amount,
          day_of_month: Number(data.day_of_month),
          category_id: data.category_id || null,
          active: data.active ?? true,
        };
        if (editingRecurring) {
          await updateRecurring(editingRecurring.id, payload);
        } else {
          await createRecurring(payload);
        }
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message ?? "Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (id: string, type: "pontual" | "recorrente") => {
    setDeletingId(id);
    setDeletingType(type);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId || !deletingType) return;
    setIsDeleting(true);
    try {
      if (deletingType === "pontual") {
        await removePontual(deletingId);
      } else {
        await removeRecurring(deletingId);
      }
      setIsDeleteOpen(false);
    } catch (err: any) {
      console.error("Erro ao excluir:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const getStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case "pago":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Pago</span>;
      case "atrasado":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">Atrasado</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Pendente</span>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Contas a Pagar</h2>
            <p className="text-sm text-slate-500">Gestão e acompanhamento de obrigações e compromissos</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        {/* Indicadores Resumidos */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-slate-150 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Pendente
              </CardTitle>
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-slate-900">{formatCurrency(totalPendente)}</div>
              <p className="text-xs text-slate-455 mt-1">Contas aguardando vencimento</p>
            </CardContent>
          </Card>

          <Card className="border-slate-150 shadow-sm bg-emerald-50/10 border-emerald-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Total Pago
              </CardTitle>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-700">{formatCurrency(totalPago)}</div>
              <p className="text-xs text-emerald-650 font-medium mt-1">Obrigações quitadas</p>
            </CardContent>
          </Card>

          <Card className="border-slate-150 shadow-sm bg-red-50/10 border-red-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                Total Atrasado
              </CardTitle>
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-650">
                <AlertCircle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-650">{formatCurrency(totalAtrasado)}</div>
              <p className="text-xs text-red-600 font-medium mt-1">
                {totalAtrasado > 0 ? "Necessita pagamento imediato" : "Sem atrasos"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seção 1: Contas Recorrentes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Contas Recorrentes (Mensais)</h3>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
              {recurringAccounts.length} contas cadastradas
            </span>
          </div>
          <Card className="border-slate-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right w-[150px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</TableHead>
                    <TableHead className="text-right w-[120px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRecurring ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando contas recorrentes...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : recurringAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-slate-400">
                        Nenhuma conta recorrente cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recurringAccounts.map((r) => {
                      const cat = categories.find((c) => c.id === r.category_id);
                      return (
                        <TableRow 
                          key={r.id} 
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest("button") || target.closest("input") || target.closest("a")) {
                              return;
                            }
                            handleOpenEditRecurring(r);
                          }}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                        >
                          <TableCell className="font-semibold text-slate-900 text-sm">{r.description}</TableCell>
                          <TableCell className="font-medium text-slate-600 text-sm whitespace-nowrap">
                            Todo dia {String(r.day_of_month).padStart(2, "0")}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {cat ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color || "#64748B" }} />
                                {cat.name}
                              </span>
                            ) : "Outros"}
                          </TableCell>
                          <TableCell>
                            {r.active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                Inativa
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-sm">
                            {formatCurrency(r.amount)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditRecurring(r)}
                                className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                type="button"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDelete(r.id, "recorrente")}
                                className="h-8 w-8 text-slate-500 hover:text-red-650 hover:bg-red-50"
                                type="button"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Seção 2: Contas Pontuais */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Contas Pontuais</h3>
            <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
              {accounts.length} contas pendentes/pagas
            </span>
          </div>
          <Card className="border-slate-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vencimento</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right w-[150px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor</TableHead>
                    <TableHead className="text-right w-[120px] text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPontual ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando contas pontuais...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-400">
                        Nenhuma conta pontual cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((a) => (
                      <TableRow 
                        key={a.id} 
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest("button") || target.closest("input") || target.closest("a")) {
                            return;
                          }
                          handleOpenEdit(a);
                        }}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <TableCell className="font-semibold text-slate-900 text-sm">{a.description}</TableCell>
                        <TableCell className="font-medium text-slate-600 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 animate-none" />
                            {a.due_date.split("-").reverse().join("/")}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(a.status)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 text-sm">
                          {formatCurrency(a.amount)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(a)}
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              type="button"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(a.id, "pontual")}
                              className="h-8 w-8 text-slate-500 hover:text-red-650 hover:bg-red-50"
                              type="button"
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
          </Card>
        </div>

        {/* Modal: Form Criar/Editar */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleSubmit(handleSave)}>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount || editingRecurring ? "Editar Lançamento" : "Nova Obrigação"}
                </DialogTitle>
                <DialogDescription>
                  Informe os detalhes e configurações da conta a pagar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

                {/* Selection of Account Type (Desabilitado ao editar) */}
                <div className="space-y-1.5">
                  <Label>Tipo de Obrigação</Label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2 cursor-pointer flex-1 border border-slate-200 p-2.5 rounded-lg hover:bg-slate-50 ${(editingAccount || editingRecurring) ? "opacity-60 cursor-not-allowed" : ""}`}>
                      <input
                        type="radio"
                        value="pontual"
                        className="accent-blue-600"
                        disabled={!!editingAccount || !!editingRecurring}
                        {...register("accountType")}
                      />
                      <span className="text-sm font-semibold text-slate-700">Conta Pontual</span>
                    </label>
                    <label className={`flex items-center gap-2 cursor-pointer flex-1 border border-slate-200 p-2.5 rounded-lg hover:bg-slate-50 ${(editingAccount || editingRecurring) ? "opacity-60 cursor-not-allowed" : ""}`}>
                      <input
                        type="radio"
                        value="recorrente"
                        className="accent-blue-600"
                        disabled={!!editingAccount || !!editingRecurring}
                        {...register("accountType")}
                      />
                      <span className="text-sm font-semibold text-slate-700">Recorrente (Mensal)</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Fornecedor de tecidos, Conta de Luz..."
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-650 font-medium">{errors.description.message}</p>
                  )}
                </div>

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

                {/* Conditional Fields based on AccountType */}
                {watchAccountType === "pontual" ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Due Date */}
                    <div className="space-y-1.5">
                      <Label htmlFor="due_date">Vencimento</Label>
                      <Input id="due_date" type="date" {...register("due_date")} />
                      {errors.due_date && (
                        <p className="text-xs text-red-650 font-medium">{errors.due_date.message}</p>
                      )}
                    </div>

                    {/* Status Selection */}
                    <div className="space-y-1.5">
                      <Label htmlFor="status">Status</Label>
                      <select
                        id="status"
                        {...register("status")}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed bg-white"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="atrasado">Atrasado</option>
                      </select>
                      {errors.status && (
                        <p className="text-xs text-red-650 font-medium">{errors.status.message}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Day of Month */}
                    <div className="space-y-1.5">
                      <Label htmlFor="day_of_month">Vencimento (Dia)</Label>
                      <Input 
                        id="day_of_month" 
                        type="number" 
                        min="1" 
                        max="31"
                        placeholder="Ex: 5, 10, 20"
                        {...register("day_of_month")} 
                      />
                      {errors.day_of_month && (
                        <p className="text-xs text-red-650 font-medium">{errors.day_of_month.message}</p>
                      )}
                    </div>

                    {/* Category Select */}
                    <div className="space-y-1.5">
                      <Label htmlFor="category_id">Categoria</Label>
                      <Select
                        value={watchCategoryId || ""}
                        onValueChange={(val) => setValue("category_id", val || "", { shouldValidate: true })}
                      >
                        <SelectTrigger id="category_id" className="h-10 bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.filter(c => c.active).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category_id && (
                        <p className="text-xs text-red-650 font-medium">{errors.category_id.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Recurring Active Toggle */}
                {watchAccountType === "recorrente" && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="active"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500"
                      {...register("active")}
                    />
                    <Label htmlFor="active" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                      Conta Recorrente Ativa (Gerar cobranças mensais)
                    </Label>
                  </div>
                )}
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
                    editingAccount || editingRecurring ? "Salvar Alterações" : "Cadastrar"
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
                Deseja realmente excluir este lançamento de conta a pagar?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-750 text-white" disabled={isDeleting}>
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </span>
                ) : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
