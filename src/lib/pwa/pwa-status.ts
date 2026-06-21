export interface PWAStatus {
  isStandalone: boolean;
  hasServiceWorker: boolean;
  hasManifest: boolean;
  isInstallAvailable: boolean;
  isSupported: boolean;
}

export async function getPWAStatus(): Promise<PWAStatus> {
  if (typeof window === "undefined") {
    return {
      isStandalone: false,
      hasServiceWorker: false,
      hasManifest: false,
      isInstallAvailable: false,
      isSupported: false,
    };
  }

  // 1. Detectar display-mode standalone (instalado)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://");

  // 2. Detectar se o Service Worker está registrado e ativo
  let hasServiceWorker = false;
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      hasServiceWorker = registrations.some(
        (reg) => reg.active && (reg.active.state === "activated" || reg.active.state === "activating")
      );
    } catch (e) {
      console.warn("Erro ao buscar registros de service worker:", e);
    }
  }

  // 3. Detectar Manifest buscando a tag link rel="manifest" no DOM
  const hasManifest = !!document.querySelector('link[rel="manifest"]');

  // 4. Detectar se o evento beforeinstallprompt está disponível
  const isInstallAvailable = !!(window as any).deferredPrompt;

  // 5. Detectar compatibilidade geral
  const isSupported = "serviceWorker" in navigator && typeof window.addEventListener !== "undefined";

  return {
    isStandalone,
    hasServiceWorker,
    hasManifest,
    isInstallAvailable,
    isSupported,
  };
}
