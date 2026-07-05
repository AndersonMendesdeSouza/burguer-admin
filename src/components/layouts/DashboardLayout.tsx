import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../Sidebar/Sidebar";
import { Header } from "../Header/Header";
import styles from "./DashboardLayout.module.css";

function getHeaderTitle(pathname: string) {
  if (pathname.startsWith("/pedidos")) return "Pedidos";
  if (pathname.startsWith("/produtos")) return "Produtos";
  if (pathname.startsWith("/clientes")) return "Clientes";
  if (pathname.startsWith("/relatorios")) return "Relatórios";
  if (pathname.startsWith("/configuracoes")) return "Configurações";
  if (pathname.startsWith("/product-details")) return "Detalhes do produto";
  if (pathname.startsWith("/orders-details")) return "Detalhes do pedido";

  return "Dashboard";
}

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className={styles.container}>
      <Sidebar />

      <div className={styles.main}>
        <Header title={getHeaderTitle(location.pathname)} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
