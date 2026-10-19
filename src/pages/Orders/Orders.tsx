import { OrderStatusEnum } from "../../dtos/enums/orders-status.enum";
import type { OrderResponseDto } from "../../dtos/response/orders-response.dto";
import styles from "./Orders.module.css";
import { FiChevronLeft, FiChevronRight, FiMoreHorizontal } from "react-icons/fi";
import { OrderCard } from "../../components/OrderCard";
import { useEffect, useRef, useState } from "react";
import { OrderService } from "../../service/order.service";
import { formatOrderCode } from "../../utils/formatOrderCode";
import { useOrderCount } from "../../contexts/OrderCountContext";

type BoardOrder = {
  id: string;
  mesaId?: string | null;
  number: string;
  customerName: string;
  minutes: number;
  total: number;
  status: OrderStatusEnum;
  items: { name: string; quantity: number }[];
};

type ColumnTone = "yellow" | "blue" | "orange" | "green" | "red";

const ORDER_COLUMNS: {
  title: string;
  status: OrderStatusEnum;
  tone: ColumnTone;
}[] = [
  {
    title: "NOVOS",
    status: OrderStatusEnum.RECEIVED,
    tone: "yellow",
  },
  {
    title: "EM PREPARO",
    status: OrderStatusEnum.PREPARING,
    tone: "blue",
  },
  {
    title: "EM ROTA",
    status: OrderStatusEnum.ON_ROUTE,
    tone: "orange",
  },
  {
    title: "ENTREGUES",
    status: OrderStatusEnum.DELIVERED,
    tone: "green",
  },
  {
    title: "CANCELADOS",
    status: OrderStatusEnum.CANCELED,
    tone: "red",
  },
];

function getMinutesAgo(createdAt: Date | string) {
  const createdAtTime = new Date(createdAt).getTime();
  const diff = Date.now() - createdAtTime;

  if (Number.isNaN(createdAtTime) || diff < 0) {
    return 0;
  }

  return Math.floor(diff / 60000);
}

function getBoardStatus(status: OrderResponseDto["status"]): OrderStatusEnum {
  if (status === "KITCHEN_ACCEPTED" || status === OrderStatusEnum.PREPARING) {
    return OrderStatusEnum.PREPARING;
  }

  if (status === "OUT_FOR_DELIVERY" || status === OrderStatusEnum.ON_ROUTE) {
    return OrderStatusEnum.ON_ROUTE;
  }

  return status as OrderStatusEnum;
}

function mapOrderToBoardOrder(order: OrderResponseDto): BoardOrder {
  return {
    id: order.id,
    mesaId: order.mesaId,
    number: formatOrderCode(order.code),
    customerName: order.customerName,
    minutes: getMinutesAgo(order.createdAt),
    total: Number(order.total),
    status: getBoardStatus(order.status),
    items: (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
    })),
  };
}

function ColumnHeader({
  title,
  count,
  tone,
}: {
  title: string;
  count: number;
  tone: ColumnTone;
}) {
  return (
    <div className={styles.columnHeader}>
      <div className={styles.columnTitle}>
        <span className={`${styles.dot} ${styles[`dot_${tone}`]}`} />
        <span className={styles.columnTitleText}>{title}</span>
        <span className={`${styles.count} ${styles[`count_${tone}`]}`}>
          {String(count).padStart(2, "0")}
        </span>
      </div>

      <button className={styles.kebab} type="button" aria-label="Menu">
        <FiMoreHorizontal />
      </button>
    </div>
  );
}

export function Orders() {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { refreshOrderCount } = useOrderCount();

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    function updateScrollState() {
      if (!board) return;
      setCanScrollPrevious(board.scrollLeft > 1);
      setCanScrollNext(board.scrollLeft + board.clientWidth < board.scrollWidth - 1);
    }

    const frameId = window.requestAnimationFrame(updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(board);
    board.addEventListener("scroll", updateScrollState);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      board.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  function scrollColumns(direction: number) {
    const board = boardRef.current;
    if (!board) return;

    const columnWidth = board.firstElementChild?.getBoundingClientRect().width;
    if (!columnWidth) return;

    const gap = Number.parseFloat(window.getComputedStyle(board).columnGap) || 0;
    board.scrollBy({ left: direction * (columnWidth + gap) });
  }

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const data = await OrderService.findAll();
        if (!active) return;

        setOrders(data.map(mapOrderToBoardOrder));
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
      }
    }

    void loadOrders();
    const intervalId = window.setInterval(loadOrders, 10000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function alterStatus(
    id: string,
    status: OrderStatusEnum,
  ): Promise<void> {
    const updatedOrder = await OrderService.alterStatus(id, status);
    const boardOrder = mapOrderToBoardOrder(updatedOrder);

    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === id ? boardOrder : order)),
    );
    void refreshOrderCount();
  }

  return (
    <div className={styles.page}>
      <div ref={boardRef} id="orders-board" className={styles.board}>
        {ORDER_COLUMNS.map((column) => {
          const columnOrders = orders.filter((o) => o.status === column.status);

          return (
            <section className={styles.column} key={column.status}>
              <ColumnHeader
                title={column.title}
                count={columnOrders.length}
                tone={column.tone}
              />
              <div className={styles.list}>
                {columnOrders.map((o) => (
                  <div
                    key={o.id}
                    className={`${styles.cardWrapper} ${
                      styles[`cardWrapper_${column.tone}`]
                    }`}
                  >
                    <OrderCard
                      navigateTo={`/orders-details/${o.id}`}
                      mesaId={o.mesaId}
                      status={o.status}
                      orderNumber={o.number}
                      customerName={o.customerName}
                      minutesAgo={o.minutes}
                      items={o.items}
                      total={o.total}
                      onAccept={
                        o.status === OrderStatusEnum.DELIVERED ||
                        o.status === OrderStatusEnum.CANCELED
                          ? undefined
                          : () => alterStatus(o.id, o.status)
                      }
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className={styles.carouselControls}>
        <button
          className={styles.carouselButton}
          type="button"
          aria-label="Colunas anteriores"
          title="Colunas anteriores"
          aria-controls="orders-board"
          disabled={!canScrollPrevious}
          onClick={() => scrollColumns(-1)}
        >
          <FiChevronLeft />
        </button>
        <button
          className={styles.carouselButton}
          type="button"
          aria-label="Próximas colunas"
          title="Próximas colunas"
          aria-controls="orders-board"
          disabled={!canScrollNext}
          onClick={() => scrollColumns(1)}
        >
          <FiChevronRight />
        </button>
      </div>
    </div>
  );
}
