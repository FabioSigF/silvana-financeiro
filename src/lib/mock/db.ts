import { Movement, AccountPayable, UploadRecord } from "@/types";

const INITIAL_MOVEMENTS: Movement[] = [
  { id: "m1", type: "entrada", description: "Venda Uniformes Escolares", amount: 4500, date: "2026-06-15", category: "Venda", created_at: new Date().toISOString() },
  { id: "m2", type: "saída", description: "Compra de Tecido Sarja", amount: 1200, date: "2026-06-12", category: "Massa Prima", created_at: new Date().toISOString() },
  { id: "m3", type: "entrada", description: "Orçamento Uniforme Empresa X", amount: 3200, date: "2026-06-10", category: "Venda", created_at: new Date().toISOString() },
  { id: "m4", type: "saída", description: "Manutenção Máquina Costura", amount: 350, date: "2026-06-05", category: "Manutenção", created_at: new Date().toISOString() },
  { id: "m5", type: "saída", description: "Conta de Energia Elétrica", amount: 480, date: "2026-06-02", category: "Utilidades", created_at: new Date().toISOString() },
  { id: "m6", type: "entrada", description: "Venda Avulsa Camisas", amount: 800, date: "2026-06-01", category: "Venda", created_at: new Date().toISOString() },
];

const INITIAL_ACCOUNTS: AccountPayable[] = [
  { id: "a1", description: "Fornecedor de Zíper e Linhas", amount: 750, due_date: "2026-06-25", status: "pendente", created_at: new Date().toISOString() },
  { id: "a2", description: "Aluguel do Galpão", amount: 2200, due_date: "2026-06-05", status: "pago", created_at: new Date().toISOString() },
  { id: "a3", description: "Pagamento Costureira Auxiliar", amount: 1500, due_date: "2026-06-10", status: "atrasado", created_at: new Date().toISOString() },
  { id: "a4", description: "Compra de Agulhas e Tesouras", amount: 180, due_date: "2026-06-28", status: "pendente", created_at: new Date().toISOString() },
];

const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export const mockDB = {
  getMovements: (): Movement[] => {
    return getLocalStorage("silvana_movements", INITIAL_MOVEMENTS);
  },
  saveMovement: (movement: Omit<Movement, "id" | "created_at"> & { id?: string }): Movement => {
    const list = mockDB.getMovements();
    const newMovement: Movement = {
      ...movement,
      id: movement.id || `m_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const index = list.findIndex(m => m.id === newMovement.id);
    if (index >= 0) {
      list[index] = newMovement;
    } else {
      list.push(newMovement);
    }
    setLocalStorage("silvana_movements", list);
    return newMovement;
  },
  deleteMovement: (id: string): void => {
    const list = mockDB.getMovements();
    const filtered = list.filter(m => m.id !== id);
    setLocalStorage("silvana_movements", filtered);
  },

  getAccounts: (): AccountPayable[] => {
    return getLocalStorage("silvana_accounts", INITIAL_ACCOUNTS);
  },
  saveAccount: (account: Omit<AccountPayable, "id" | "created_at"> & { id?: string }): AccountPayable => {
    const list = mockDB.getAccounts();
    const newAccount: AccountPayable = {
      ...account,
      id: account.id || `a_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const index = list.findIndex(a => a.id === newAccount.id);
    if (index >= 0) {
      list[index] = newAccount;
    } else {
      list.push(newAccount);
    }
    setLocalStorage("silvana_accounts", list);
    return newAccount;
  },
  deleteAccount: (id: string): void => {
    const list = mockDB.getAccounts();
    const filtered = list.filter(a => a.id !== id);
    setLocalStorage("silvana_accounts", filtered);
  },

  getUploads: (): UploadRecord[] => {
    return getLocalStorage("silvana_uploads", []);
  },
  saveUpload: (upload: UploadRecord): void => {
    const list = mockDB.getUploads();
    const index = list.findIndex(u => u.id === upload.id);
    if (index >= 0) {
      list[index] = upload;
    } else {
      list.push(upload);
    }
    setLocalStorage("silvana_uploads", list);
  },

  getSettings: () => {
    return getLocalStorage("silvana_settings", {
      companyName: "Silvana Uniformes",
      logoUrl: "",
      userName: "Silvana Souza",
      userEmail: "silvana@uniformes.com.br",
    });
  },
  saveSettings: (settings: any) => {
    setLocalStorage("silvana_settings", settings);
  }
};
