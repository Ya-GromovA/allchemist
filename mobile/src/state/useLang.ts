import { useEffect, useState, useCallback } from "react";
import { AppLang, getLang, setLang } from "./settings";

export function useLang() {
  const [lang, setLangState] = useState<AppLang>("ru");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const l = await getLang();
      setLangState(l);
      setReady(true);
    })();
  }, []);

  const updateLang = useCallback(async (l: AppLang) => {
    setLangState(l);
    await setLang(l);
  }, []);

  return { lang, ready, setLang: updateLang };
}
