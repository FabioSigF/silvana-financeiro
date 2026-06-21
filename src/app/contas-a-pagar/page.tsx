"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useAccounts } from "@/hooks/useAccounts";
import { AccountPayable, AccountStatus } from "@/types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Calendar, DollarSign, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const accountSchema = z.object({
  description: z.string().min(3, "Descrição é muito curta"),
  amount: z.coerce.number().gt(0, "O valor deve ser maior que zero"),
  due_date: z.string().min(10, "Data inválida"),
  status: z.enum(["pendente", "pago", "atrasado"] as const),
});

type AccountFormData = z.infer<typeof accountSchema>;

export default function ContasAPagarPage() {
  const { accounts, loading, create, update, remove } = useAccounts();

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
      due_date: new Date().toISOString().split("T")[0],
      status: "pendente",
    },
  });

  // Calculando indicadores resumidos
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
    setFormError(null);
    reset({
      description: "",
      amount: 0,
      due_date: new Date().toISOString().split("T")[0],
      status: "pendente",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (a: AccountPayable) => {
    setEditingAccount(a);
    setFormError(null);
    reset({
      description: a.description,
      amount: a.amount,
      due_date: a.due_date,
      status: a.status,
    });
    setIsFormOpen(true);
  };

  const handleSave = async (data: AccountFormData) => {
    setIsSaving(true);
    setFormError(null);
    try {
      if (editingAccount) {
        await update(editingAccount.id, data);
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
              <p className="text-xs text-slate-450 mt-1">Contas aguardando vencimento</p>
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
              <p className="text-xs text-emerald-600 font-medium mt-1">Obrigações quitadas</p>
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

        {/* Tabela de Contas a Pagar */}
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando contas...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-450">
                      Nenhuma conta cadastrada para controle.
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((a) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-semibold text-slate-900 text-sm">{a.description}</TableCell>
                      <TableCell className="font-medium text-slate-650 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {a.due_date.split("-").reverse().join("/")}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(a.status)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900 text-sm">
                        {formatCurrency(a.amount)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(a)}
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(a.id)}
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
        </Card>

        {/* Modal: Form Criar/Editar */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleSubmit(handleSave)}>
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Cadastrar Nova Conta"}</DialogTitle>
                <DialogDescription>
                  Informe os detalhes da despesa ou conta a pagar no sistema.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm">
                    {formError}
                  </div>
                )}

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

                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="due_date">Vencimento</Label>
                    <Input id="due_date" type="date" {...register("due_date")} />
                    {errors.due_date && (
                      <p className="text-xs text-red-650 font-medium">{errors.due_date.message}</p>
                    )}
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5">
                  <Label>Status de Pagamento</Label>
                  <select
                    {...register("status")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    editingAccount ? "Salvar" : "Cadastrar"
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
              <DialogTitle className="text-red-600">Excluir Conta</DialogTitle>
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
