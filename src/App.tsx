import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layouts/DashboardLayout";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { Orders } from "./pages/Orders/Orders";
import { Products } from "./pages/Product/Products";
import { ProductsDetails } from "./pages/Product/ProductsDetails";
import OrderDetails from "./pages/Orders/OrdersDetails";
import Login from "./pages/Login/Login";
import { Customers } from "./pages/Customers/Customers";
import { Reports } from "./pages/Reports/Reports";
import { useAuth } from "./contexts/AuthContext";
import { useOrderCount } from "./contexts/OrderCountContext";
import { Config } from "./pages/Config/Config";
import { useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { OrderService } from "./service/order.service";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "./utils/notificationSound";

const ORDER_POLLING_INTERVAL_MS = 10_000;

function showNewOrderAlert(newOrdersCount: number) {
  toast.success(
    newOrdersCount > 1
      ? `${newOrdersCount} novos pedidos recebidos`
      : "Novo pedido recebido",
    {
      toastId: "new-order-alert",
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      theme: "dark",
    },
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();
  const { refreshOrderCount } = useOrderCount();
  const previousOrderIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const unlockSound = () => {
      void unlockNotificationSound();
    };

    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (!isAuthenticated || loading) {
      previousOrderIdsRef.current = null;
      return;
    }

    let active = true;

    async function checkForNewOrders() {
      try {
        const orders = await OrderService.findAll();
        if (!active) return;

        const currentOrderIds = new Set(orders.map((order) => order.id));
        const previousOrderIds = previousOrderIdsRef.current;

        if (previousOrderIds) {
          const newOrdersCount = orders.filter(
            (order) => !previousOrderIds.has(order.id),
          ).length;

          if (orders.length > previousOrderIds.size || newOrdersCount > 0) {
            void playNotificationSound();
            showNewOrderAlert(Math.max(newOrdersCount, 1));
            void refreshOrderCount();
          }
        }

        previousOrderIdsRef.current = currentOrderIds;
      } catch (error) {
        console.error("Erro ao verificar novos pedidos:", error);
      }
    }

    void checkForNewOrders();
    const intervalId = window.setInterval(
      checkForNewOrders,
      ORDER_POLLING_INTERVAL_MS,
    );

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, loading, refreshOrderCount]);

  if (loading) {
    return null;
  }

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />

        <Route
          element={
            isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/produtos" element={<Products />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/relatorios" element={<Reports />} />
          <Route path="/configuracoes" element={<Config />} />
          <Route path="/product-details/:id?" element={<ProductsDetails />} />
          <Route path="/orders-details/:id" element={<OrderDetails />} />
        </Route>
      </Routes>
    </>
  );
}
