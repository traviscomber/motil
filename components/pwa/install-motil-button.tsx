'use client';

import { useEffect, useState } from 'react';
import { Download, Share2, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Locale } from '@/lib/i18n/dictionaries';

type InstallPlatform = 'ios-safari' | 'ios-other' | 'android' | 'other';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type MotilInstallWindow = Window & {
  __motilInstallPrompt?: BeforeInstallPromptEvent | null;
};

function detectStandalone() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

function detectPlatform(): InstallPlatform {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  if (ios) return safari ? 'ios-safari' : 'ios-other';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

export function InstallMotilButton({ locale }: { locale: Locale }) {
  const es = locale !== 'en';
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('other');
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    setInstalled(detectStandalone());
    setPlatform(detectPlatform());

    const motilWindow = window as MotilInstallWindow;
    if (motilWindow.__motilInstallPrompt) {
      setInstallPrompt(motilWindow.__motilInstallPrompt);
    }

    const media = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => setInstalled(detectStandalone());
    const syncInstallPrompt = () => {
      setInstallPrompt(motilWindow.__motilInstallPrompt || null);
    };
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      motilWindow.__motilInstallPrompt = event as BeforeInstallPromptEvent;
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      motilWindow.__motilInstallPrompt = null;
      setInstalled(true);
      setInstallPrompt(null);
      setInstructionsOpen(false);
    };

    media.addEventListener?.('change', onDisplayModeChange);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('motil-install-prompt-ready', syncInstallPrompt);
    window.addEventListener('motil-app-installed', onInstalled);

    return () => {
      media.removeEventListener?.('change', onDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('motil-install-prompt-ready', syncInstallPrompt);
      window.removeEventListener('motil-app-installed', onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    const motilWindow = window as MotilInstallWindow;
    const prompt = installPrompt || motilWindow.__motilInstallPrompt || null;

    if (!prompt) {
      setInstructionsOpen(true);
      return;
    }

    await prompt.prompt();
    const choice = await prompt.userChoice;
    motilWindow.__motilInstallPrompt = null;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') setInstalled(true);
  };

  const title = es ? 'Instalar MOTIL' : 'Install MOTIL';

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-2.5 text-sidebar-foreground/80"
        onClick={() => void install()}
      >
        <Download className="h-4 w-4" />
        {title}
      </Button>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {es
                ? 'MOTIL puede quedar en la pantalla de inicio y abrirse como una app.'
                : 'MOTIL can stay on your Home Screen and open like an app.'}
            </DialogDescription>
          </DialogHeader>

          {platform === 'ios-safari' ? (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{es ? 'En iPhone o iPad:' : 'On iPhone or iPad:'}</p>
              <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
                <li>{es ? 'Toca Compartir en Safari.' : 'Tap Share in Safari.'}</li>
                <li>{es ? 'Elige Agregar a Inicio.' : 'Choose Add to Home Screen.'}</li>
                <li>{es ? 'Activa Abrir como app web y toca Agregar.' : 'Enable Open as Web App and tap Add.'}</li>
              </ol>
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Share2 className="h-4 w-4 shrink-0" />
                {es ? 'Safari instala MOTIL desde el menú Compartir.' : 'Safari installs MOTIL from the Share menu.'}
              </div>
            </div>
          ) : platform === 'ios-other' ? (
            <div className="space-y-3 text-sm">
              <p>{es ? 'Para instalar MOTIL en iPhone o iPad, abre motil.app en Safari.' : 'To install MOTIL on iPhone or iPad, open motil.app in Safari.'}</p>
              <p className="text-muted-foreground">
                {es ? 'Luego usa Compartir → Agregar a Inicio → Abrir como app web.' : 'Then use Share → Add to Home Screen → Open as Web App.'}
              </p>
            </div>
          ) : platform === 'android' ? (
            <div className="space-y-3 text-sm">
              <p>{es ? 'Si el navegador no mostró la instalación automática:' : 'If the browser did not show the install prompt:'}</p>
              <p className="text-muted-foreground">
                {es ? 'Abre el menú del navegador y elige Instalar app o Agregar a pantalla principal.' : 'Open the browser menu and choose Install app or Add to Home screen.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {es ? 'Abre el menú del navegador y elige Instalar app. En iPhone o iPad, hazlo desde Safari con Compartir → Agregar a Inicio.' : 'Open the browser menu and choose Install app. On iPhone or iPad, use Safari → Share → Add to Home Screen.'}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
