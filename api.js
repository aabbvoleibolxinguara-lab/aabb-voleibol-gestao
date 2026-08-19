window.AABBApi = (() => {
  const config = window.AABB_CONFIG;
  const TOKEN_KEY = "aabb_voleibol_session_token";

  const isDemo = () =>
    Boolean(config.demoMode) ||
    !config.apiUrl ||
    config.apiUrl.includes("COLE_AQUI");

  const getToken = () =>
    isDemo()
      ? window.AABBMockApi.getStoredToken()
      : sessionStorage.getItem(TOKEN_KEY) || "";

  const setToken = token => {
    if (isDemo()) {
      window.AABBMockApi.setStoredToken(token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  };

  const clearToken = () => {
    if (isDemo()) {
      window.AABBMockApi.clearStoredToken();
    }

    sessionStorage.removeItem(TOKEN_KEY);
  };

  async function call(action, payload = {}, options = {}) {
    const token =
      options.token !== undefined
        ? options.token
        : getToken();

    if (isDemo()) {
      return window.AABBMockApi.call(action, payload, token);
    }

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs || 35000
    );

    try {
      const response = await fetch(config.apiUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action,
          payload,
          token
        }),
        signal: controller.signal
      });

      const text = await response.text();

      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch (_) {
        throw new Error(
          "A API não retornou JSON válido. Confirme a URL da implantação do Apps Script."
        );
      }

      if (!response.ok || parsed.ok === false) {
        throw new Error(
          parsed.error ||
          `Falha na comunicação (${response.status}).`
        );
      }

      return parsed.data !== undefined
        ? parsed.data
        : parsed;

    } catch (error) {

      if (error.name === "AbortError") {
        throw new Error(
          "A solicitação demorou demais. Tente novamente."
        );
      }

      throw error;

    } finally {
      clearTimeout(timeout);
    }
  }

  async function health() {
    try {
      if (isDemo()) {
        return {
          online: true,
          demo: true
        };
      }

      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        config.requestTimeoutMs || 35000
      );

      try {
        const response = await fetch(config.apiUrl, {
          method: "GET",
          redirect: "follow",
          cache: "no-store",
          signal: controller.signal
        });

        const text = await response.text();

        let parsed;

        try {
          parsed = JSON.parse(text);
        } catch (_) {
          throw new Error(
            "A API não retornou JSON válido."
          );
        }

        if (!response.ok || parsed.ok === false) {
          throw new Error(
            parsed.error ||
            `Falha na comunicação (${response.status}).`
          );
        }

        const data =
          parsed.data !== undefined
            ? parsed.data
            : parsed;

        return {
          online: true,
          ...data
        };

      } finally {
        clearTimeout(timeout);
      }

    } catch (error) {

      return {
        online: false,
        error:
          error.name === "AbortError"
            ? "A API demorou demais para responder."
            : error.message
      };
    }
  }

  return {
    call,
    health,
    isDemo,
    getToken,
    setToken,
    clearToken
  };
})();
