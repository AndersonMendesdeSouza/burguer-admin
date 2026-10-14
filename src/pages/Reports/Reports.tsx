import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiAlertCircle,
  FiCalendar,
  FiDownload,
  FiPackage,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { OrderStatusEnum } from "../../dtos/enums/orders-status.enum";
import { PaymentMethodEnum } from "../../dtos/enums/payment-method.enum";
import { ProductStatusEnum } from "../../dtos/enums/product-status.enum";
import type { OrderResponseDto } from "../../dtos/response/orders-response.dto";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import type { UserResponseDto } from "../../dtos/response/user-response.dto";
import { OrderService } from "../../service/order.service";
import { ProductService } from "../../service/product.service";
import { UserService } from "../../service/user.service";
import { formatOrderCode } from "../../utils/formatOrderCode";
import styles from "./Reports.module.css";

type PeriodKey = "today" | "7d" | "30d" | "all";

type RevenuePoint = {
  label: string;
  revenue: number;
  orders: number;
  sortDate: string;
};

type StatusPoint = {
  name: string;
  value: number;
  color: string;
};

type PaymentPoint = {
  method: PaymentMethodEnum;
  label: string;
  value: number;
  revenue: number;
  color: string;
};

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "all", label: "Tudo" },
];

const STATUS_LABELS: Record<OrderStatusEnum, string> = {
  RECEIVED: "Novos",
  KITCHEN_ACCEPTED: "Cozinha",
  PREPARING: "Preparo",
  OUT_FOR_DELIVERY: "Saiu",
  ON_ROUTE: "Rota",
  DELIVERED: "Entregues",
  CANCELED: "Cancelados",
};

const STATUS_COLORS: Record<OrderStatusEnum, string> = {
  RECEIVED: "#ffd400",
  KITCHEN_ACCEPTED: "#60a5fa",
  PREPARING: "#3b82f6",
  OUT_FOR_DELIVERY: "#fb923c",
  ON_ROUTE: "#f97316",
  DELIVERED: "#00c853",
  CANCELED: "#ef4444",
};

const PAYMENT_LABELS: Record<PaymentMethodEnum, string> = {
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
  PIX: "Pix",
  CASH: "Dinheiro",
};

const PAYMENT_COLORS: Record<PaymentMethodEnum, string> = {
  CREDIT_CARD: "#60a5fa",
  DEBIT_CARD: "#4ade80",
  PIX: "#ffd400",
  CASH: "#fb923c",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function formatChartCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function parseMoneyInCents(value: number | string | undefined): number {
  let normalized = value;
  if (typeof value === "string" && value.includes(",")) {
    normalized = value.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized ?? 0);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function getDateKey(value: Date | string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value: Date | string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function isCanceled(order: OrderResponseDto): boolean {
  return order.status === OrderStatusEnum.CANCELED;
}

function isDelivered(order: OrderResponseDto): boolean {
  return order.status === OrderStatusEnum.DELIVERED;
}

function getPeriodStart(period: PeriodKey): Date | null {
  if (period === "all") return null;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "today") return start;

  start.setDate(start.getDate() - (period === "7d" ? 6 : 29));
  return start;
}

function isInsidePeriod(order: OrderResponseDto, period: PeriodKey): boolean {
  const start = getPeriodStart(period);
  const createdAt = new Date(order.createdAt).getTime();
  if (Number.isNaN(createdAt) || createdAt > Date.now()) return false;
  return !start || createdAt >= start.getTime();
}

function getRevenueByDay(
  orders: OrderResponseDto[],
  period: PeriodKey,
): RevenuePoint[] {
  const map = new Map<string, RevenuePoint>();

  orders.forEach((order) => {
    if (isCanceled(order)) return;

    const sortDate = getDateKey(order.createdAt);
    if (!sortDate) return;
    const current = map.get(sortDate) ?? {
      sortDate,
      label: formatShortDate(order.createdAt),
      revenue: 0,
      orders: 0,
    };

    current.revenue += parseMoneyInCents(order.total);
    current.orders += 1;
    map.set(sortDate, current);
  });

  let start = getPeriodStart(period);
  if (!start) {
    const firstDate = [...map.keys()].sort()[0];
    if (!firstDate) return [];
    start = new Date(`${firstDate}T00:00:00`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const points: RevenuePoint[] = [];

  for (const day = new Date(start); day <= today; day.setDate(day.getDate() + 1)) {
    const sortDate = getDateKey(day);
    const point = map.get(sortDate);
    points.push({
      sortDate,
      label: formatShortDate(day),
      revenue: (point?.revenue ?? 0) / 100,
      orders: point?.orders ?? 0,
    });
  }

  return points;
}

function getStatusData(orders: OrderResponseDto[]): StatusPoint[] {
  return Object.values(OrderStatusEnum)
    .map((status) => ({
      name: STATUS_LABELS[status],
      value: orders.filter((order) => order.status === status).length,
      color: STATUS_COLORS[status],
    }))
    .filter((item) => item.value > 0);
}

function getPaymentData(orders: OrderResponseDto[]): PaymentPoint[] {
  const map = new Map<PaymentMethodEnum, PaymentPoint>();
  for (const method of Object.values(PaymentMethodEnum)) {
    map.set(method, {
      method,
      label: PAYMENT_LABELS[method],
      value: 0,
      revenue: 0,
      color: PAYMENT_COLORS[method],
    });
  }

  orders.forEach((order) => {
    if (isCanceled(order)) return;

    const current = map.get(order.paymentMethod);
    if (!current) return;

    current.value += 1;
    current.revenue += parseMoneyInCents(order.total);
  });

  return [...map.values()].map((point) => ({
    ...point,
    revenue: point.revenue / 100,
  }));
}

function exportOrdersCsv(orders: OrderResponseDto[]) {
  const headers = [
    "Pedido",
    "Cliente",
    "Status",
    "Pagamento",
    "Total",
    "Criado em",
  ];
  const rows = orders.map((order) => [
    formatOrderCode(order.code),
    order.customerName,
    STATUS_LABELS[order.status],
    PAYMENT_LABELS[order.paymentMethod],
    (parseMoneyInCents(order.total) / 100).toFixed(2).replace(".", ","),
    new Date(order.createdAt).toLocaleString("pt-BR"),
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => {
        let text = String(cell);
        if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
      }).join(";"),
    )
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "relatorio-pedidos.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div className={styles.metricCard}>
      <div className={`${styles.metricIcon} ${styles[`metricIcon_${tone}`]}`}>
        <Icon />
      </div>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      <span className={styles.metricDetail}>{detail}</span>
    </div>
  );
}

export function Reports() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [customers, setCustomers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError(null);

        const [ordersData, productsData, customersData] = await Promise.all([
          OrderService.findAll(),
          ProductService.findAll(),
          UserService.findCustomers(),
        ]);

        if (!active) return;

        setOrders(ordersData);
        setProducts(productsData);
        setCustomers(customersData);
      } catch (err) {
        console.error("Erro ao carregar relatórios:", err);
        if (active) setError("Não foi possível carregar os relatórios.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReports();

    return () => {
      active = false;
    };
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => isInsidePeriod(order, period)),
    [orders, period],
  );

  const validOrders = useMemo(
    () => filteredOrders.filter((order) => !isCanceled(order)),
    [filteredOrders],
  );

  const revenueInCents = validOrders.reduce(
    (total, order) => total + parseMoneyInCents(order.total),
    0,
  );
  const revenue = revenueInCents / 100;
  const deliveredOrders = filteredOrders.filter(isDelivered).length;
  const canceledOrders = filteredOrders.filter(isCanceled).length;
  const completionRate = filteredOrders.length
    ? (deliveredOrders / filteredOrders.length) * 100
    : 0;
  const cancellationRate = filteredOrders.length
    ? (canceledOrders / filteredOrders.length) * 100
    : 0;
  const activeProducts = products.filter(
    (product) => product.isActive === ProductStatusEnum.ACTIVED,
  ).length;
  const lowStockProducts = products.filter(
    (product) => product.stockEnabled && Number(product.stock ?? 0) <= 5,
  ).length;
  const revenueByDay = getRevenueByDay(filteredOrders, period);
  const statusData = getStatusData(filteredOrders);
  const paymentData = getPaymentData(filteredOrders);
  const recentOrders = [...filteredOrders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Relatórios</p>
          <h1 className={styles.title}>Performance da hamburgueria</h1>
          <p className={styles.subtitle}>
            Receita, operação, clientes e produtos em um painel único.
          </p>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.periods}>
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.periodButton} ${period === item.key ? styles.periodButtonActive : ""
                  }`}
                onClick={() => setPeriod(item.key)}
                aria-pressed={period === item.key}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.exportButton}
            onClick={() => exportOrdersCsv(filteredOrders)}
            disabled={loading || !!error || !filteredOrders.length}
          >
            <FiDownload />
            Exportar CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.state} role="status">Carregando relatórios...</div>
      ) : error ? (
        <div className={styles.alert} role="alert">{error}</div>
      ) : (
        <>

          <div className={styles.metrics}>
            <MetricCard
              icon={FiTrendingUp}
              label="Faturamento"
              value={formatCurrency(revenue)}
              detail={`${validOrders.length} pedidos não cancelados`}
              tone="success"
            />
            <MetricCard
              icon={FiShoppingBag}
              label="Pedidos"
              value={String(filteredOrders.length)}
              detail={`${formatPercent(completionRate)} concluídos`}
            />
            <MetricCard
              icon={FiUsers}
              label="Clientes"
              value={String(customers.length)}
              detail="Total de clientes cadastrados"
            />
            <MetricCard
              icon={FiPackage}
              label="Produtos ativos"
              value={`${activeProducts}/${products.length}`}
              detail={`${lowStockProducts} itens com estoque baixo`}
              tone={"success"}
            />
            <MetricCard
              icon={FiAlertCircle}
              label="Cancelamentos"
              value={formatPercent(cancellationRate)}
              detail={`${canceledOrders} pedidos cancelados`}
              tone={canceledOrders ? "danger" : "success"}
            />
          </div>

          <div className={styles.mainGrid}>
            <section className={styles.chartPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Faturamento por dia</h2>
                  <span className={styles.panelSubtitle}>
                    Todo o período selecionado
                  </span>
                </div>
                <FiCalendar className={styles.panelIcon} />
              </div>

              <div className={styles.chart}>
                {validOrders.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueByDay}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#ffd400" stopOpacity={0.36} />
                          <stop offset="95%" stopColor="#ffd400" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="sortDate"
                        tickFormatter={(value) => formatShortDate(`${value}T00:00:00`)}
                        stroke="rgba(255,255,255,0.45)"
                        minTickGap={24}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.45)"
                        tickFormatter={(value) => formatChartCurrency(Number(value))}
                        width={72}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#141414",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                        formatter={(value) => formatCurrency(Number(value))}
                        labelFormatter={(value) =>
                          new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Faturamento"
                        stroke="#ffd400"
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        dot={{ r: 3, fill: "#ffd400" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.state}>Sem faturamento no período.</div>
                )}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Status dos pedidos</h2>
                  <span className={styles.panelSubtitle}>Distribuição operacional</span>
                </div>
              </div>

              <div className={styles.pieWrap}>
                {statusData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {statusData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#141414",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.state}>Sem pedidos no período.</div>
                )}
              </div>

              <div className={styles.legend}>
                {statusData.map((item) => (
                  <div className={styles.legendItem} key={item.name}>
                    <span style={{ background: item.color }} />
                    <strong>{item.name}</strong>
                    <em>{item.value}</em>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.paymentPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Formas de pagamento</h2>
                <span className={styles.panelSubtitle}>
                  Faturamento por forma de pagamento
                </span>
              </div>
            </div>

            <div className={styles.paymentChart}>
              <div className={styles.barChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentData} margin={{ top: 28, right: 20, bottom: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="rgba(255,255,255,0.55)"
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.55)"
                      tickFormatter={(value) => formatChartCurrency(Number(value))}
                      width={80}
                      domain={[0, (maximum: number) => maximum || 1]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#141414",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="revenue" name="Faturamento" maxBarSize={64} radius={[6, 6, 0, 0]}>
                      {paymentData.map((payment) => (
                        <Cell key={payment.method} fill={payment.color} />
                      ))}
                      <LabelList
                        dataKey="revenue"
                        position="top"
                        fill="#fff"
                        fontSize={12}
                        formatter={(value) => formatChartCurrency(Number(value))}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className={styles.tablePanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Pedidos recentes</h2>
                <span className={styles.panelSubtitle}>
                  Últimos pedidos dentro do período
                </span>
              </div>
            </div>

            <div className={styles.table}>
              <div className={`${styles.tableRow} ${styles.tableHead}`}>
                <span>Pedido</span>
                <span>Cliente</span>
                <span>Status</span>
                <span>Pagamento</span>
                <span>Total</span>
                <span>Data</span>
              </div>

              {recentOrders.length ? (
                recentOrders.map((order) => (
                  <div className={styles.tableRow} key={order.id}>
                    <strong className={styles.orderCode}>
                      {formatOrderCode(order.code)}
                    </strong>
                    <span>{order.customerName}</span>
                    <span
                      className={styles.statusPill}
                      style={{
                        color: STATUS_COLORS[order.status],
                        borderColor: `${STATUS_COLORS[order.status]}44`,
                        background: `${STATUS_COLORS[order.status]}18`,
                      }}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                    <span>{PAYMENT_LABELS[order.paymentMethod]}</span>
                    <strong>{formatCurrency(parseMoneyInCents(order.total) / 100)}</strong>
                    <span title={new Date(order.createdAt).toLocaleString("pt-BR")}>
                      {formatShortDate(order.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className={styles.state}>Nenhum pedido encontrado.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
