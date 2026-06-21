"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Mail, AlertCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email("Insira um e-mail válido"),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.signIn(data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("Invalid login credentials")) {
        setError("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.");
      } else {
        setError("Erro ao entrar. Tente novamente em instantes.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordRecovery = async () => {
    const emailVal = getValues("email");
    if (!emailVal || !emailVal.includes("@")) {
      setError("Insira um e-mail válido no campo para recuperar a senha.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await authService.resetPassword(emailVal);
      setRecoverySent(true);
    } catch (err: any) {
      setError("Erro ao enviar e-mail de recuperação. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-screen bg-slate-50">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-blue-200">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Silvana Financeiro</h1>
          <p className="text-sm text-slate-500">Gestão financeira descomplicada para sua confecção</p>
        </div>

        <Card className="border-slate-200/80 shadow-lg shadow-slate-100">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {isRecoveryMode ? "Recuperar senha" : "Acesse sua conta"}
            </CardTitle>
            <CardDescription>
              {isRecoveryMode
                ? "Informe seu e-mail para receber as instruções de recuperação"
                : "Digite seu e-mail e senha cadastrados para entrar"}
            </CardDescription>
          </CardHeader>

          {isRecoveryMode ? (
            <CardContent className="space-y-4">
              {recoverySent ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="font-medium">E-mail de recuperação enviado!</p>
                  </div>
                  <p className="text-emerald-700">
                    Verifique a caixa de entrada do e-mail informado para redefinir sua senha.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="recovery-email"
                        placeholder="nome@empresa.com"
                        className="pl-10"
                        {...register("email")}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handlePasswordRecovery}
                    disabled={isLoading}
                  >
                    {isLoading ? "Processando..." : "Enviar link de recuperação"}
                  </Button>
                </div>
              )}
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@empresa.com"
                      className="pl-10"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setIsRecoveryMode(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...register("password")}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{errors.password.message}</p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Entrando...
                    </div>
                  ) : (
                    "Entrar no sistema"
                  )}
                </Button>
              </CardFooter>
            </form>
          )}

          {isRecoveryMode && (
            <CardFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setRecoverySent(false);
                  setIsRecoveryMode(false);
                }}
                className="w-full text-xs font-semibold text-slate-600"
              >
                Voltar para o Login
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
