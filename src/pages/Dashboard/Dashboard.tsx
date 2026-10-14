import styles from "./Dashboard.module.css";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { FiChevronLeft, FiChevronRight, FiDollarSign, FiEye, FiShoppingBag } from "react-icons/fi";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OrderService } from "../../service/order.service";
import type { OrderResponseDto } from "../../dtos/response/orders-response.dto";
import { OrderStatusEnum } from "../../dtos/enums/orders-status.enum";
import { formatOrderCode } from "../../utils/formatOrderCode";

type PeriodKey = "day" | "week" | "month";
type DateRange = { start: string; end: string };
type SalesPoint = { label: string; tooltipLabel: string; value: number };

type RecentSale = {
  orderId: string;
  id: string;
  date: string;
  time: string;
  client: { initials: string };
  clientName: string;
  products: string;
  total: string;
  status: OrderStatusEnum;
  statusLabel: string;
  statusTone: "new" | "preparing" | "route" | "done" | "canceled";
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: { value?: number | string; payload?: SalesPoint }[];
  label?: string;
};

type StatusFilter = "all" | RecentSale["statusTone"];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "new", label: "Novos" },
  { value: "preparing", label: "Em preparo" },
  { value: "route", label: "Em rota" },
  { value: "done", label: "Concluídos" },
  { value: "canceled", label: "Cancelados" },
];

const PAGE_SIZE = 8;

function getDateKey(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(period: PeriodKey): DateRange {
  const end = new Date();
  const start = new Date(end);
  if (period === "week") start.setDate(start.getDate() - 6);
  if (period === "month") start.setDate(start.getDate() - 29);
  return { start: getDateKey(start), end: getDateKey(end) };
}

function isInsideDateRange(order: OrderResponseDto, range: DateRange): boolean {
  const date = new Date(order.createdAt);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) return false;
  const key = getDateKey(date);
  return key >= range.start && key <= range.end;
}

function parseMoneyInCents(value: string | number): number {
  let normalized = value;
  if (typeof value === "string" && value.includes(",")) {
    normalized = value.replace(/\./g, "").replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function getSalesChartData(orders: OrderResponseDto[], range: DateRange): SalesPoint[] {
  const hourly = range.start === range.end;
  const totals = new Map<string, number>();
  for (const order of orders) {
    if (order.status === OrderStatusEnum.CANCELED) continue;
    const date = new Date(order.createdAt);
    const key = hourly ? String(date.getHours()) : getDateKey(date);
    totals.set(key, (totals.get(key) ?? 0) + parseMoneyInCents(order.total));
  }

  if (hourly) {
    return Array.from({ length: 24 }, (_, hour) => {
      const label = `${String(hour).padStart(2, "0")}:00`;
      const date = new Date(`${range.start}T${label}:00`);
      return {
        label,
        tooltipLabel: date.toLocaleString("pt-BR", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        }),
        value: (totals.get(String(hour)) ?? 0) / 100,
      };
    });
  }

  const points: SalesPoint[] = [];
  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    points.push({
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      tooltipLabel: date.toLocaleDateString("pt-BR"),
      value: (totals.get(getDateKey(date)) ?? 0) / 100,
    });
  }
  return points;
}

function formatDate(date: string | Date): { date: string; time: string } {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return { date: "Sem data", time: "--:--" };
  return {
    date: parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
    time: parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2) || "CL";
}

function formatMoney(value: string | number): string {
  return (parseMoneyInCents(value) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getStatusInfo(status: OrderStatusEnum): {
  label: string;
  tone: RecentSale["statusTone"];
} {
  if (status === "RECEIVED") return { label: "NOVO", tone: "new" };
  if (status === "KITCHEN_ACCEPTED" || status === "PREPARING") {
    return { label: "EM PREPARO", tone: "preparing" };
  }
  if (status === "OUT_FOR_DELIVERY" || status === "ON_ROUTE") {
    return { label: "EM ROTA", tone: "route" };
  }
  if (status === "DELIVERED") return { label: "CONCLUÍDO", tone: "done" };
  if (status === "CANCELED") return { label: "CANCELADO", tone: "canceled" };
  return { label: String(status), tone: "new" };
}

function mapOrderToRecentSale(order: OrderResponseDto): RecentSale {
  const { date, time } = formatDate(order.createdAt);
  const statusInfo = getStatusInfo(order.status);
  const productsText = (order.items || [])
    .map(item => `${item.quantity}x ${item.name}`)
    .join(", ");

  return {
    orderId: order.id,
    id: formatOrderCode(order.code),
    date,
    time,
    client: { initials: getInitials(order.customerName) },
    clientName: order.customerName,
    products: productsText || "Sem itens",
    total: formatMoney(order.total),
    status: order.status,
    statusLabel: statusInfo.label,
    statusTone: statusInfo.tone,
  };
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{payload[0]?.payload?.tooltipLabel ?? label}</div>
      <div className={styles.tooltipValue}>{formatMoney(value)}</div>
    </div>
  );
}

export function Dashboard() {
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey | null>("week");
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRange("week"));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let requestInProgress = false;

    async function loadOrders() {
      if (requestInProgress) return;
      requestInProgress = true;
      try {
        const data = await OrderService.findAll();
        if (!active) return;
        setOrders(data);
        setError(null);
      } catch (error) {
        console.error("Erro ao carregar painel:", error);
        if (active) setError("Não foi possível carregar o painel. Tentaremos novamente em instantes.");
      } finally {
        requestInProgress = false;
        if (active) setLoading(false);
      }
    }

    void loadOrders();
    const intervalId = window.setInterval(loadOrders, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const today = getDateKey(new Date());
  const invalidDateRange = !dateRange.start || !dateRange.end ||
    dateRange.start > dateRange.end || dateRange.end > today;

  const filteredOrders = useMemo(() => {
    if (invalidDateRange) return [];
    return orders.filter((order) => {
      if (!isInsideDateRange(order, dateRange)) return false;
      return statusFilter === "all" || getStatusInfo(order.status).tone === statusFilter;
    }).sort((first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    );
  }, [orders, dateRange, statusFilter, invalidDateRange]);

  const validOrders = filteredOrders.filter((order) => order.status !== OrderStatusEnum.CANCELED);
  const revenueInCents = validOrders.reduce((total, order) => total + parseMoneyInCents(order.total), 0);
  const chartData = invalidDateRange ? [] : getSalesChartData(filteredOrders, dateRange);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const recentSales = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE).map(mapOrderToRecentSale);

  function selectPeriod(value: PeriodKey) {
    setPeriod(value);
    setDateRange(getDateRange(value));
    setPage(1);
  }

  function changeDateRange(field: keyof DateRange, value: string) {
    setDateRange((current) => ({ ...current, [field]: value }));
    setPeriod(null);
    setPage(1);
  }

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Relatórios de Vendas</h1>
        </div>

        <div className={styles.filters}>
          <label className={styles.filterField}>
            Início
            <input
              className={styles.filterInput}
              type="date"
              value={dateRange.start}
              max={dateRange.end || today}
              aria-invalid={invalidDateRange}
              aria-describedby={invalidDateRange ? "dashboard-date-error" : undefined}
              onChange={(event) => changeDateRange("start", event.target.value)}
            />
          </label>
          <label className={styles.filterField}>
            Fim
            <input
              className={styles.filterInput}
              type="date"
              value={dateRange.end}
              min={dateRange.start}
              max={today}
              aria-invalid={invalidDateRange}
              aria-describedby={invalidDateRange ? "dashboard-date-error" : undefined}
              onChange={(event) => changeDateRange("end", event.target.value)}
            />
          </label>
          <label className={styles.filterField}>
            Status
            <select
              className={styles.filterInput}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {invalidDateRange && (
        <div id="dashboard-date-error" className={styles.alert} role="alert">
          Informe datas válidas, com início até o fim e término até hoje.
        </div>
      )}

      {loading ? (
        <div className={styles.state} role="status">Carregando painel...</div>
      ) : error ? (
        <div className={styles.alert} role="alert">{error}</div>
      ) : !invalidDateRange ? (
        <>
          <div className={styles.metrics}>
            <div className={styles.metricCard}>
              <span className={styles.metricIcon}><FiDollarSign /></span>
              <div className={styles.metricLabel}>FATURAMENTO TOTAL</div>
              <div className={styles.metricValue}>{formatMoney(revenueInCents / 100)}</div>
              <div className={styles.metricSub}>{validOrders.length} pedidos não cancelados</div>
            </div>
            <div className={styles.metricCard}>
              <span className={styles.metricIcon}><FiShoppingBag /></span>
              <div className={styles.metricLabel}>NÚMERO DE PEDIDOS</div>
              <div className={styles.metricValue}>{filteredOrders.length}</div>
              <div className={styles.metricSub}>
                {filteredOrders.filter((order) => order.status === OrderStatusEnum.DELIVERED).length} entregues
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.panelTitle}>Desempenho de Vendas</div>
                <div className={styles.panelSub}>
                  Faturamento no período selecionado
                </div>
              </div>

              <div className={styles.tabs}>
                {PERIODS.map((item) => (
                  <button
                    key={item.key}
                    className={`${styles.tab} ${period === item.key ? styles.tabActive : ""}`}
                    type="button"
                    aria-pressed={period === item.key}
                    onClick={() => selectPeriod(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.chartWrap}>
              {validOrders.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillYellow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffd400" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#ffd400" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis hide domain={[0, "auto"]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#ffd400"
                      strokeWidth={3}
                      fill="url(#fillYellow)"
                      dot={{ r: 3, fill: "#ffd400" }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.state}>Sem faturamento no período selecionado.</div>
              )}
            </div>
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>Vendas Recentes</div>

            </div>

            <div className={styles.table}>
              <div className={`${styles.row} ${styles.thead}`}>
                <div>ID PEDIDO</div>
                <div>DATA/HORA</div>
                <div>CLIENTE</div>
                <div>PRODUTOS</div>
                <div>VALOR TOTAL</div>
                <div>STATUS</div>
                <div>AÇÕES</div>
              </div>

              {recentSales.length ? recentSales.map((r) => (
                <div key={r.orderId} className={styles.row}>
                  <div className={styles.idCell}>{r.id}</div>

                  <div className={styles.dateCell}>
                    <div>{r.date}</div>
                    <div className={styles.muted}>{r.time}</div>
                  </div>

                  <div className={styles.clientCell}>
                    <div className={styles.avatar}>{r.client.initials}</div>
                    <div className={styles.clientName}>{r.clientName}</div>
                  </div>

                  <div className={styles.productsCell}>{r.products}</div>

                  <div className={styles.totalCell}>{r.total}</div>

                  <div>
                    <span
                      className={
                        `${styles.statusPill} ${styles[`status_${r.statusTone}`]}`
                      }
                    >
                      {r.statusLabel}
                    </span>
                  </div>

                  <div className={styles.actionsCell}>
                    <button
                      className={styles.eyeBtn}
                      type="button"
                      aria-label={`Ver pedido ${r.id}`}
                      title="Ver pedido"
                      onClick={() => navigate(`/orders-details/${r.orderId}`)}
                    >
                      <FiEye />
                    </button>
                  </div>
                </div>
              )) : (
                <div className={styles.state}>Nenhum pedido encontrado.</div>
              )}
            </div>

            <div className={styles.tableFooter}>
              <div className={styles.muted}>
                {filteredOrders.length
                  ? `Mostrando ${startIndex + 1} a ${startIndex + recentSales.length} de ${filteredOrders.length} pedidos`
                  : "0 pedidos"}
              </div>

              <nav className={styles.pagination} aria-label="Paginação de pedidos">
                <button
                  className={styles.pageBtn}
                  type="button"
                  aria-label="Página anterior"
                  title="Página anterior"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <FiChevronLeft />
                </button>
                <span className={styles.muted}>{currentPage} de {totalPages}</span>
                <button
                  className={styles.pageBtn}
                  type="button"
                  aria-label="Próxima página"
                  title="Próxima página"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <FiChevronRight />
                </button>
              </nav>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
