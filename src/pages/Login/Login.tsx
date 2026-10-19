import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import styles from "./Login.module.css";
import Colors from "../../themes/Colors";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import { IoRestaurant } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { UserService } from "../../service/user.service";
import { UserRole } from "../../dtos/enums/user-role.enum";
type Props = {
  backgroundImageUrl?: string;
  onSubmit?: (data: {
    email: string;
    password: string;
    remember: boolean;
  }) => void;
};

type LoginCssVars = CSSProperties & {
  "--bgPrimary": string;
  "--bgSecondary": string;
  "--highlight": string;
  "--textPrimary": string;
  "--textSecondary": string;
  "--heroImage": string;
};

export default function Login({
  backgroundImageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQx5T1LvEjeIQBt-UxZLODbdXIF-tr7NXUvdQ&s",
  onSubmit,
}: Props) {
  const [email, setEmail] = useState("admin@maisburguer.com");
  const [password, setPassword] = useState("admin.maisburguer");
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const { login: contextLogin } = useAuth();

  async function login() {
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);

    try {
      const payload = { email, password };

      // const data = await UserService.login(payload);
      const data = await UserService.login(payload);

      if (data.role === UserRole.ADMIN) {
        // Salva token no storage
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id);

        // Atualiza estado global
        contextLogin(data.token);

        // Redireciona para dashboard
        navigate("/dashboard");
      } else {
        alert("Acesso negado");
      }
    } catch {
      alert("Email ou senha inválidos");
    } finally {
      setIsLoggingIn(false);
    }
  }
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit?.({ email, password, remember });
    await login();
  }

  //   async function login() {
  //   try {
  //     const fakeToken = "fake-token-dev-123456";

  //     localStorage.setItem("token", fakeToken);

  //     contextLogin(fakeToken);

  //     navigate("/dashboard");
  //   } catch (error) {
  //     alert("Erro no login fake");
  //   }
  // }

  return (
    <div
      className={styles.page}
      style={
        {
          "--bgPrimary": Colors.Background.primary,
          "--bgSecondary": Colors.Background.secondary,
          "--highlight": Colors.Highlight.primary,
          "--textPrimary": Colors.Texts.primary,
          "--textSecondary": Colors.Texts.secondary,
          "--heroImage": `url(${backgroundImageUrl})`,
        } as LoginCssVars
      }
    >
      <div className={styles.left}>
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />

        <div className={styles.leftInner}>
          <div className={styles.brandRow}>
            <span className={styles.brandMark}>
              <IoRestaurant color="#000" size={22} />
            </span>
            <span className={styles.brandName}>BURGUER ADMIN</span>
          </div>

          <h1 className={styles.heroTitle}>
            CONTROLE
            <br />
            SEU
            <br />
            <span className={styles.heroTitleHighlight}>IMPÉRIO</span>
          </h1>

          <p className={styles.heroDesc}>
            Gerencie pedidos, estoque e performance em tempo real com a
            plataforma administrativa mais robusta do setor.
          </p>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>2.4k+</div>
              <div className={styles.statLabel}>PEDIDOS HOJE</div>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <div className={styles.statValue}>98%</div>
              <div className={styles.statLabel}>EFICIÊNCIA</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.loginWrap}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>Admin - Login de Acesso</div>
            <div className={styles.panelSub}>
              Bem-vindo de volta ao centro de comando.
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label}>E-mail Corporativo</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon} aria-hidden>
                <FiMail />
              </span>
              <input
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@empresa.com"
                type="email"
                autoComplete="email"
              />
            </div>

            <label className={styles.label} style={{ marginTop: 18 }}>
              Senha de Segurança
            </label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon} aria-hidden>
                <FiLock />
              </span>
              <input
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className={styles.rowBetween}>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Manter conectado</span>
              </label>

              <button type="button" className={styles.linkBtn}>
                Esqueci minha senha
              </button>
            </div>

            <button
              className={styles.submit}
              type="submit"
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
            >
              {isLoggingIn ? (
                <span className={styles.loader} aria-hidden />
              ) : (
                <>
                  ENTRAR NO PAINEL
                  <span className={styles.submitIcon} aria-hidden>
                    <FiArrowRight />
                  </span>
                </>
              )}
            </button>

            <div className={styles.hr} />

            <div className={styles.secureLabel}>SISTEMA DE GESTÃO SEGURA</div>
          </form>
        </div>
      </div>
    </div>
  );
}
