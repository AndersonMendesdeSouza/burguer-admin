import { useEffect, useMemo, useState } from "react";
import styles from "./Header.module.css";
import { FiBell } from "react-icons/fi";
import { SystemSettingsService } from "../../service/system-settings.service";
import type { SystemSettingsResponse } from "../../dtos/response/system-settings-response.dto";

type HeaderProps = {
  title: string;
};

const STATUS_REFRESH_INTERVAL_MS = 60_000;

export function Header({ title }: HeaderProps) {
  const [settings, setSettings] = useState<SystemSettingsResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState(false);

  const statusText = useMemo(() => {
    if (loadingStatus && !settings) return "CARREGANDO";
    if (statusError && !settings) return "INDISPONÍVEL";
    return settings?.available ? "ABERTA" : "FECHADA";
  }, [loadingStatus, settings, statusError]);

  const statusClassName = useMemo(() => {
    if (statusError && !settings) {
      return `${styles.badge} ${styles.badgeUnavailable}`;
    }

    if (loadingStatus && !settings) {
      return `${styles.badge} ${styles.badgeLoading}`;
    }

    if (!settings?.available) {
      return `${styles.badge} ${styles.badgeClosed}`;
    }

    return styles.badge;
  }, [loadingStatus, settings, statusError]);

  useEffect(() => {
    let active = true;

    async function loadStoreStatus() {
      try {
        const data = await SystemSettingsService.findSettings();

        if (!active) return;

        setSettings(data);
        setStatusError(false);
      } catch {
        if (!active) return;

        setStatusError(true);
      } finally {
        if (active) {
          setLoadingStatus(false);
        }
      }
    }

    function handleSettingsUpdated(event: Event) {
      const updatedSettings = (event as CustomEvent<SystemSettingsResponse>)
        .detail;

      if (updatedSettings) {
        setSettings(updatedSettings);
        setStatusError(false);
        setLoadingStatus(false);
        return;
      }

      void loadStoreStatus();
    }

    void loadStoreStatus();

    const refreshInterval = window.setInterval(
      loadStoreStatus,
      STATUS_REFRESH_INTERVAL_MS,
    );

    window.addEventListener("focus", loadStoreStatus);
    window.addEventListener("system-settings:updated", handleSettingsUpdated);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", loadStoreStatus);
      window.removeEventListener(
        "system-settings:updated",
        handleSettingsUpdated,
      );
    };
  }, []);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.right}>
        <button className={styles.notification}>
          <FiBell />
        </button>

        <div className={styles.status}>
          <span>Status da Loja:</span>
          <span className={statusClassName}>{statusText}</span>
        </div>
      </div>
    </header>
  );
}
