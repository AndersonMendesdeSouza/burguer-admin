import { useNavigate } from "react-router-dom";
import { OrderStatusEnum } from "../dtos/enums/orders-status.enum";
import styles from "./OrderCard.module.css";
import { FiChevronRight } from "react-icons/fi";
import { UtensilsCrossed } from "lucide-react";

type OrderItem = {
  name: string;
  quantity: number;
};

type Props = {
  orderNumber: string;
  mesaId?: string | null;
  customerName: string;
  minutesAgo: number;
  items: OrderItem[];
  total: number;
  onAccept?: () => void;
  status: OrderStatusEnum;
  navigateTo: string;
};

export function OrderCard({
  orderNumber,
  mesaId,
  customerName,
  minutesAgo,
  items,
  total,
  onAccept,
  status,
  navigateTo,
}: Props) {
  const tableNumber = mesaId?.trim();
  const remainingItemsCount = items.length - 2;
  const price = total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  let timeLabel = `${minutesAgo} min`;
  if (minutesAgo >= 24 * 60) {
    const days = Math.floor(minutesAgo / (24 * 60));
    timeLabel = `${days} ${days === 1 ? "dia" : "dias"}`;
  } else if (minutesAgo >= 60) {
    const hours = Math.floor(minutesAgo / 60);
    timeLabel = `${hours} h`;
  }

  const statusClassByStatus: Partial<Record<OrderStatusEnum, string>> = {
    [OrderStatusEnum.RECEIVED]: "btnNew",
    [OrderStatusEnum.ON_ROUTE]: "btnOnRoute",
    [OrderStatusEnum.PREPARING]: "btnPreparing",
  };

  const actionLabelByStatus: Partial<Record<OrderStatusEnum, string>> = {
    [OrderStatusEnum.RECEIVED]: "Aceitar",
    [OrderStatusEnum.PREPARING]: "Finalizar",
    [OrderStatusEnum.ON_ROUTE]: "Concluir",
  };

  const statusClass = statusClassByStatus[status] ?? "btnDefault";
  const actionLabel = actionLabelByStatus[status];

  const navigate = useNavigate();
  return (
    <div className={styles.card} onClick={() => navigate(navigateTo)}>
      <div className={styles.header}>
        <div className={styles.left}>
          <div className={styles.orderNumber}>{orderNumber}</div>
          <div className={styles.customerName}>{customerName}</div>
        </div>

        <div className={styles.timePill}>{timeLabel}</div>
      </div>

      {tableNumber ? (
        <div className={styles.tableBadge}>
          <UtensilsCrossed aria-hidden="true" />
          <span>Mesa <strong>{tableNumber}</strong></span>
        </div>
      ) : null}

      <ul className={styles.items}>
        {items.slice(0, 2).map((it, idx) => (
          <li key={`${it.name}-${idx}`} className={styles.item}>
            <span className={styles.dot} />
            <span className={styles.itemText}>
              {it.quantity}x {it.name}
            </span>
          </li>
        ))}
      </ul>

      {remainingItemsCount > 0 && (
        <span className={styles.moreItems}>
          + {remainingItemsCount} {remainingItemsCount === 1 ? "item" : "itens"}
        </span>
      )}

      <div className={styles.divider} />

      <div className={styles.footer}>
        <div className={styles.price}>{price}</div>

        {actionLabel && (
          <button
            className={styles[statusClass]}
            onClick={(event) => {
              event.stopPropagation();
              onAccept?.();
            }}
          >
            {actionLabel} <FiChevronRight className={styles.acceptIcon} />
          </button>
        )}
      </div>
    </div>
  );
}
