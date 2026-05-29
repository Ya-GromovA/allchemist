import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { AppSessionProvider } from "@app/state/AppSession";
import { I18nProvider } from "@app/i18n";
import WebFallbackShell from "@app/screens/WebFallbackShell";
import { initLocalContent } from "@app/db/seed";
import AppBackground from "@app/components/AppBackground";
import LaunchSplash from "@app/components/LaunchSplash";

const MIN_SPLASH_MS = 1800;
const CONTENT_INIT_WARN_MS = 20000;
const CONTENT_INIT_TIMEOUT_MS = 28000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutAfter(ms: number) {
  return wait(ms).then(() => {
    throw new Error("content_init_timeout");
  });
}

function waitForSplashArt(readyRef: React.MutableRefObject<boolean>, resolversRef: React.MutableRefObject<Array<() => void>>) {
  if (readyRef.current) return Promise.resolve();
  return new Promise<void>((resolve) => {
    resolversRef.current.push(resolve);
  });
}

export default function App() {
  const isWeb = Platform.OS === "web";
  const [ready, setReady] = useState(isWeb);
  const [progress, setProgress] = useState(isWeb ? 1 : 0);
  const [finalBurst, setFinalBurst] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [RootNavigator, setRootNavigator] = useState<React.ComponentType | null>(null);
  const splashArtReadyRef = useRef(isWeb);
  const splashArtResolversRef = useRef<Array<() => void>>([]);

  const handleSplashArtReady = useCallback(() => {
    splashArtReadyRef.current = true;
    setProgress((value) => Math.max(value, 0.3));
    const resolvers = splashArtResolversRef.current.splice(0);
    resolvers.forEach((resolve) => resolve());
  }, []);

  useEffect(() => {
    if (isWeb) return;
    let active = true;
    const startedAt = Date.now();

    (async () => {
      setReady(false);
      setErrorText(null);
      setFinalBurst(false);
      setRootNavigator(null);
      splashArtReadyRef.current = false;
      splashArtResolversRef.current.splice(0);
      setProgress(0.08);
      try {
        setProgress(0.15); // Native JS bundle and root providers are mounted.
        await wait(160);
        if (!active) return;
        setProgress(0.3); // Local storage/session provider is mounting in parallel.
        await wait(180);
        if (!active) return;
        setProgress(0.52); // Session check and navigation modules are being prepared.

        const contentInit = initLocalContent();
        const timeout = timeoutAfter(CONTENT_INIT_TIMEOUT_MS);
        await Promise.race([
          contentInit,
          wait(CONTENT_INIT_WARN_MS).then(() => {
            if (active) setProgress(0.92);
          }),
        ]);
        await Promise.race([contentInit, timeout]);
        if (!active) return;
        setProgress(0.78); // Local chemistry/physics/biology packs are ready.
        await wait(180);
        if (!active) return;
        const LoadedRootNavigator = require("@app/navigation/RootNavigator").default;
        if (!active) return;
        setRootNavigator(() => LoadedRootNavigator);
        setProgress(0.92); // Wait briefly for the splash artwork, but never block app startup forever.
        await Promise.race([waitForSplashArt(splashArtReadyRef, splashArtResolversRef), wait(1200)]);
        if (!active) return;
        setProgress(0.95); // Navigation tree and first screen are almost ready.

        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_SPLASH_MS) await wait(MIN_SPLASH_MS - elapsed);
        if (!active) return;
        setProgress(1);
        setFinalBurst(true);
        await wait(560);
        if (active) setReady(true);
      } catch (error) {
        console.warn("[App] bootstrap failed", error);
        if (!active) return;
        setProgress(0.92);
        setErrorText("Запуск занял слишком много времени. Проверьте соединение, свободное место на устройстве и повторите попытку.");
      }
    })();

    return () => {
      active = false;
      splashArtResolversRef.current.splice(0);
    };
  }, [bootAttempt, isWeb]);

  return (
    <I18nProvider>
      <AppSessionProvider>
        <View style={styles.container}>
          <View style={styles.content}>
            {!ready ? (
              <LaunchSplash progress={progress} finalBurst={finalBurst} errorText={errorText} onRetry={() => setBootAttempt((x) => x + 1)} onArtReady={handleSplashArtReady} />
            ) : isWeb || !RootNavigator ? (
              <WebFallbackShell />
            ) : (
              <RootNavigator />
            )}
          </View>
          {!isWeb && ready ? (
            <View pointerEvents="none" style={styles.globalOverlay}>
              <AppBackground />
            </View>
          ) : null}
        </View>
      </AppSessionProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  globalOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.2 },
});
