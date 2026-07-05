import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  FiClock,
  FiExternalLink,
  FiLock,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiToggleRight,
  FiUser,
} from "react-icons/fi";
import { SystemSettingsService } from "../../service/system-settings.service";
import { UserService } from "../../service/user.service";
import type { SystemSettingsResponse } from "../../dtos/response/system-settings-response.dto";
import type { UserResponseDto } from "../../dtos/response/user-response.dto";
import styles from "./Config.module.css";

const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Belem"];

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "AD";
}

function formatDate(value?: string | Date) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPhone(phone?: string | null) {
  if (!phone) return "Não informado";

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

export function Config() {
  const [settings, setSettings] = useState<SystemSettingsResponse | null>(null);
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("17:00");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<Feedback | null>(
    null,
  );

  const [adminUser, setAdminUser] = useState<UserResponseDto | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountFeedback, setAccountFeedback] = useState<Feedback | null>(null);

  const statusText = useMemo(() => {
    if (!settings) return "Carregando";
    return settings.available ? "Loja aberta" : "Loja fechada";
  }, [settings]);

  const operatingWindow = useMemo(() => {
    return `${openingTime} - ${closingTime}`;
  }, [closingTime, openingTime]);

  useEffect(() => {
    async function loadSettings() {
      try {
        setSettingsFeedback(null);
        const data = await SystemSettingsService.findSettings();

        setSettings(data);
        setOpeningTime(normalizeTime(data.openingTime));
        setClosingTime(normalizeTime(data.closingTime));
        setTimezone(data.timezone);
        setOrdersEnabled(data.ordersEnabled);
      } catch {
        setSettingsFeedback({
          type: "error",
          message: "Não foi possível carregar as configurações da loja.",
        });
      } finally {
        setLoadingSettings(false);
      }
    }

    async function loadAccount() {
      try {
        setAccountFeedback(null);
        const authenticatedUser = await UserService.me();
        const user = await UserService.findOne(authenticatedUser.id);

        setAdminUser(user);
        setAccountName(user.name ?? "");
        setAccountPhone(user.phone ?? "");
      } catch {
        setAccountFeedback({
          type: "error",
          message: "Não foi possível carregar a conta do administrador.",
        });
      } finally {
        setLoadingAccount(false);
      }
    }

    void loadSettings();
    void loadAccount();
  }, []);

  async function handleSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savingSettings) return;

    if (openingTime >= closingTime) {
      setSettingsFeedback({
        type: "error",
        message: "O horário de abertura deve ser menor que o de fechamento.",
      });
      return;
    }

    try {
      setSavingSettings(true);
      setSettingsFeedback(null);

      const data = await SystemSettingsService.updateSettings({
        openingTime,
        closingTime,
        timezone,
        ordersEnabled,
      });

      setSettings(data);
      setOpeningTime(normalizeTime(data.openingTime));
      setClosingTime(normalizeTime(data.closingTime));
      setTimezone(data.timezone);
      setOrdersEnabled(data.ordersEnabled);
      window.dispatchEvent(
        new CustomEvent<SystemSettingsResponse>("system-settings:updated", {
          detail: data,
        }),
      );
      setSettingsFeedback({
        type: "success",
        message: "Operação da loja atualizada.",
      });
    } catch {
      setSettingsFeedback({
        type: "error",
        message: "Não foi possível salvar as configurações da loja.",
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!adminUser || savingAccount) return;

    const trimmedName = accountName.trim();
    const trimmedPhone = accountPhone.trim();
    const password = newPassword.trim();

    if (!trimmedName) {
      setAccountFeedback({
        type: "error",
        message: "Informe o nome do administrador.",
      });
      return;
    }

    if (password && password.length < 8) {
      setAccountFeedback({
        type: "error",
        message: "A nova senha deve ter pelo menos 8 caracteres.",
      });
      return;
    }

    if (password !== confirmPassword.trim()) {
      setAccountFeedback({
        type: "error",
        message: "A confirmação de senha não confere.",
      });
      return;
    }

    const payload = {
      ...(trimmedName !== adminUser.name ? { name: trimmedName } : {}),
      ...(trimmedPhone && trimmedPhone !== (adminUser.phone ?? "")
        ? { phone: trimmedPhone }
        : {}),
      ...(password ? { password } : {}),
    };

    if (!Object.keys(payload).length) {
      setAccountFeedback({
        type: "info",
        message: "Nenhuma alteração para salvar.",
      });
      return;
    }

    try {
      setSavingAccount(true);
      setAccountFeedback(null);

      const updatedUser = await UserService.update(adminUser.id, payload);

      setAdminUser(updatedUser);
      setAccountName(updatedUser.name ?? "");
      setAccountPhone(updatedUser.phone ?? "");
      setNewPassword("");
      setConfirmPassword("");
      window.dispatchEvent(
        new CustomEvent<UserResponseDto>("admin-profile:updated", {
          detail: updatedUser,
        }),
      );
      setAccountFeedback({
        type: "success",
        message: "Conta do administrador atualizada.",
      });
    } catch {
      setAccountFeedback({
        type: "error",
        message: "Não foi possível atualizar a conta do administrador.",
      });
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Configurações</p>
          <h2 className={styles.title}>Controle da unidade</h2>
          <p className={styles.subtitle}>
            Operação, acesso administrativo e dados principais da loja.
          </p>
        </div>

        <a
          className={styles.siteLink}
          href="https://amburgueria-site.vercel.app/main"
          target="_blank"
          rel="noreferrer"
        >
          Acessar site
          <FiExternalLink aria-hidden />
        </a>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <FiToggleRight />
          </span>
          <span className={styles.summaryLabel}>Status</span>
          <strong
            className={`${styles.summaryValue} ${
              settings?.available ? styles.summaryValueOpen : styles.summaryValueClosed
            }`}
          >
            {statusText}
          </strong>
        </div>

        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <FiClock />
          </span>
          <span className={styles.summaryLabel}>Funcionamento</span>
          <strong className={styles.summaryValue}>{operatingWindow}</strong>
        </div>

        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>
            <FiUser />
          </span>
          <span className={styles.summaryLabel}>Administrador</span>
          <strong className={styles.summaryValue}>
            {adminUser?.name ?? "Carregando"}
          </strong>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.accountPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Conta</p>
              <h3 className={styles.panelTitle}>Administrador</h3>
            </div>

            <span className={styles.roleBadge}>
              <FiShield />
              Acesso admin
            </span>
          </div>

          <div className={styles.profileBox}>
            <div className={styles.profileAvatar}>
              {getInitials(accountName || adminUser?.name || "")}
            </div>
            <div className={styles.profileInfo}>
              <strong>{adminUser?.name ?? "Administrador"}</strong>
              <span>{adminUser?.email ?? "E-mail não informado"}</span>
            </div>
          </div>

          <div className={styles.accountMeta}>
            <div>
              <span>Cadastrado em</span>
              <strong>{formatDate(adminUser?.dateRegistration)}</strong>
            </div>
            <div>
              <span>Telefone</span>
              <strong>{formatPhone(adminUser?.phone)}</strong>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleAccountSubmit}>
            {loadingAccount ? (
              <p className={`${styles.feedback} ${styles.feedbackInfo}`}>
                Carregando conta...
              </p>
            ) : null}

            {accountFeedback ? (
              <p
                className={`${styles.feedback} ${
                  styles[`feedback_${accountFeedback.type}`]
                }`}
              >
                {accountFeedback.message}
              </p>
            ) : null}

            <label className={styles.field}>
              <span className={styles.label}>Nome do administrador</span>
              <div className={styles.inputIcon}>
                <FiUser />
                <input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Nome completo"
                  disabled={loadingAccount}
                  required
                />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>E-mail de acesso</span>
              <div className={`${styles.inputIcon} ${styles.inputReadonly}`}>
                <FiMail />
                <input value={adminUser?.email ?? ""} disabled readOnly />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Telefone</span>
              <div className={styles.inputIcon}>
                <FiPhone />
                <input
                  value={accountPhone}
                  onChange={(event) => setAccountPhone(event.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={loadingAccount}
                />
              </div>
            </label>

            <div className={styles.passwordGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Nova senha</span>
                <div className={styles.inputIcon}>
                  <FiLock />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    disabled={loadingAccount}
                  />
                </div>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Confirmar senha</span>
                <div className={styles.inputIcon}>
                  <FiLock />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repita a nova senha"
                    disabled={loadingAccount}
                  />
                </div>
              </label>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.button}
                type="submit"
                disabled={loadingAccount || savingAccount}
              >
                <FiSave />
                {savingAccount ? "Salvando..." : "Salvar conta"}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.operationPanel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Operação</p>
              <h3 className={styles.panelTitle}>Horário de funcionamento</h3>
            </div>

            <span
              className={`${styles.statusPill} ${
                settings?.available ? "" : styles.statusPillClosed
              }`}
            >
              <span className={styles.statusDot} />
              {statusText}
            </span>
          </div>

          <form className={styles.form} onSubmit={handleSettingsSubmit}>
            {loadingSettings ? (
              <p className={`${styles.feedback} ${styles.feedbackInfo}`}>
                Carregando operação...
              </p>
            ) : null}

            {settingsFeedback ? (
              <p
                className={`${styles.feedback} ${
                  styles[`feedback_${settingsFeedback.type}`]
                }`}
              >
                {settingsFeedback.message}
              </p>
            ) : null}

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Abertura</span>
                <input
                  className={styles.input}
                  type="time"
                  value={openingTime}
                  onChange={(event) => setOpeningTime(event.target.value)}
                  required
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Fechamento</span>
                <input
                  className={styles.input}
                  type="time"
                  value={closingTime}
                  onChange={(event) => setClosingTime(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Fuso horário</span>
              <select
                className={styles.select}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                {TIMEZONES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.toggleLine}>
              <div>
                <strong className={styles.toggleTitle}>Aceitar pedidos</strong>
                <span className={styles.toggleText}>
                  {ordersEnabled ? "Cardápio liberado" : "Pedidos pausados"}
                </span>
              </div>

              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={ordersEnabled}
                  onChange={(event) => setOrdersEnabled(event.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>

            {settings?.reason ? (
              <p className={`${styles.feedback} ${styles.feedbackInfo}`}>
                {settings.reason}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button
                className={styles.button}
                type="submit"
                disabled={loadingSettings || savingSettings}
              >
                <FiSave />
                {savingSettings ? "Salvando..." : "Salvar operação"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
