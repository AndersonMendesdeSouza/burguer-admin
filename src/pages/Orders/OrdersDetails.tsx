import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UtensilsCrossed } from "lucide-react";
import styles from "./OrderDetails.module.css";
import Colors from "../../themes/Colors";
import { OrderService } from "../../service/order.service";
import { ChatService } from "../../service/chat.service";
import { ChatMessageSenderType } from "../../dtos/enums/chat-message-sender-type.enum";
import type { OrderResponseDto } from "../../dtos/response/orders-response.dto";
import type { OrderStatusEnum } from "../../dtos/enums/orders-status.enum";
import type { PaymentMethodEnum } from "../../dtos/enums/payment-method.enum";
import { formatOrderCode } from "../../utils/formatOrderCode";
import type { ChatMessageResponseDto } from "../../dtos/response/chat-message-response.dto";

type TimelineStatus = "done" | "current" | "pending";

type OrderDetailsCssVars = CSSProperties & {
  "--bgPrimary": string;
  "--bgSecondary": string;
  "--textPrimary": string;
  "--textSecondary": string;
  "--highlight": string;
};

const CHAT_POLLING_INTERVAL_MS = 10_000;

const statusLabel: Record<OrderStatusEnum, string> = {
  RECEIVED: "RECEBIDO",
  KITCHEN_ACCEPTED: "ACEITO NA COZINHA",
  OUT_FOR_DELIVERY: "SAIU PARA ENTREGA",
  PREPARING: "EM PREPARO",
  ON_ROUTE: "EM ROTA",
  DELIVERED: "ENTREGUE",
  CANCELED: "CANCELADO",
};

const paymentLabel: Record<PaymentMethodEnum, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartao de credito",
  DEBIT_CARD: "Cartao de debito",
  CASH: "Dinheiro",
};

function formatBRL(value: number | string | undefined) {
  const parsed = Number(value ?? 0);
  const safeValue = Number.isFinite(parsed) ? parsed : 0;
  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value?: Date | string) {
  if (!value) return "Data nao informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data nao informada";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatChatTime(value?: Date | string) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReceivedAt(value?: Date | string) {
  if (!value) return "Recebimento nao informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recebimento nao informado";

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  const elapsed =
    diffMinutes < 1
      ? "Agora"
      : diffMinutes === 1
        ? "Ha 1 minuto"
        : `Ha ${diffMinutes} minutos`;

  return `Recebido em ${formatDateTime(value)} • ${elapsed}`;
}

function formatAddressLine(order: OrderResponseDto) {
  if (!order.address) return "Endereco nao informado";
  return `${order.address.street}, ${order.address.number}`;
}

function formatAddressDetails(order: OrderResponseDto) {
  if (!order.address) return "";

  return [
    order.address.neighborhood,
    `${order.address.city}/${order.address.state}`,
    `CEP ${order.address.zipCode}`,
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatAddressComplement(order: OrderResponseDto) {
  if (!order.address) return "";

  return [order.address.complement, order.address.reference]
    .filter(Boolean)
    .join(" | ");
}

function getTimelineStatus(
  historyStatus: OrderStatusEnum,
  currentStatus: OrderStatusEnum,
  index: number,
  historyLength: number,
): TimelineStatus {
  if (historyStatus === currentStatus || index === historyLength - 1) {
    return "current";
  }

  return "done";
}

function sortChatMessages(messages: ChatMessageResponseDto[]) {
  return [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessageResponseDto[]>(
    [],
  );
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Pedido nao informado.");
      setIsLoading(false);
      return;
    }

    let active = true;
    const orderId = id;

    async function loadOrder() {
      try {
        setIsLoading(true);
        const data = await OrderService.findById(orderId);
        if (active) {
          setOrder(data);
          setError("");
        }
      } catch {
        if (active) {
          setOrder(null);
          setError("Nao foi possivel carregar o pedido.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadOrder();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setChatMessages(sortChatMessages(order?.chat?.messages || []));
  }, [order?.chat?.messages]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    let timeoutId: number | undefined;

    async function loadChat() {
      try {
        const chat = await ChatService.findByOrderId(id as string);
        if (!active) return;

        const messages = sortChatMessages(chat.messages || []);

        setOrder((current) =>
          current
            ? {
                ...current,
                chatId: chat.id,
                chat: {
                  ...chat,
                  messages,
                },
              }
            : current,
        );
        setChatMessages(messages);
      } catch (error) {
        if (active) {
          console.error("Nao foi possivel carregar o chat do pedido:", error);
        }
      } finally {
        if (active) {
          timeoutId = window.setTimeout(loadChat, CHAT_POLLING_INTERVAL_MS);
        }
      }
    }

    void loadChat();

    return () => {
      active = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [id]);

  useEffect(() => {
    chatMessagesRef.current?.scrollTo({
      top: chatMessagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages]);

  const total = useMemo(() => Number(order?.total ?? 0), [order?.total]);
  const tableNumber = order?.mesaId?.trim();
  const history = useMemo(() => {
    if (!order?.history?.length) return [];

    return order.history.map((item, index) => ({
      label: item.label || statusLabel[item.status] || item.status,
      timeLabel: formatDateTime(item.createdAt || item.time),
      status: getTimelineStatus(
        item.status,
        order.status,
        index,
        order.history.length,
      ),
    }));
  }, [order]);

  const pageStyle = {
    "--bgPrimary": Colors.Background.primary,
    "--bgSecondary": Colors.Background.secondary,
    "--textPrimary": Colors.Texts.primary,
    "--textSecondary": Colors.Texts.secondary,
    "--highlight": Colors.Highlight.primary,
  } as OrderDetailsCssVars;

  async function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = chatDraft.trim();
    if (!text || !order || isSendingChatMessage) return;

    setIsSendingChatMessage(true);

    try {
      const chat = order.chat?.id
        ? order.chat
        : await ChatService.create({ orderId: order.id });
      const createdMessage = await ChatService.createMessage({
        chatId: chat.id,
        text,
      });
      const nextMessages = sortChatMessages([
        ...(chat.messages || []),
        createdMessage,
      ]);

      setOrder((current) =>
        current
          ? {
              ...current,
              chatId: chat.id,
              chat: {
                ...chat,
                messages: nextMessages,
              },
            }
          : current,
      );
      setChatMessages(nextMessages);
      setChatDraft("");
    } catch {
      alert("Nao foi possivel enviar a mensagem.");
    } finally {
      setIsSendingChatMessage(false);
    }
  }

  if (isLoading) {
    return (
      <div className={styles.page} style={pageStyle}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.iconBtn}
              aria-label="Voltar"
              onClick={() => navigate(-1)}
            >
              ←
            </button>
            <div className={styles.topbarTitleWrap}>
              <h1 className={styles.title}>Carregando pedido</h1>
              <div className={styles.subtitle}>Buscando dados na API...</div>
            </div>
          </div>
        </header>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page} style={pageStyle}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.iconBtn}
              aria-label="Voltar"
              onClick={() => navigate(-1)}
            >
              ←
            </button>
            <div className={styles.topbarTitleWrap}>
              <h1 className={styles.title}>Pedido nao encontrado</h1>
              <div className={styles.subtitle}>
                {error || "Pedido indisponivel."}
              </div>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className={styles.page} style={pageStyle}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            className={styles.iconBtn}
            aria-label="Voltar"
            onClick={() => navigate(-1)}
          >
            ←
          </button>

          <div className={styles.topbarTitleWrap}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                Pedido {formatOrderCode(order.code)}
              </h1>
              <span className={styles.statusPill}>
                {statusLabel[order.status] || order.status}
              </span>
              {tableNumber ? (
                <span className={styles.tableBadge}>
                  <UtensilsCrossed aria-hidden="true" />
                  <span>Mesa <strong>{tableNumber}</strong></span>
                </span>
              ) : null}
            </div>
            <div className={styles.subtitle}>
              {formatReceivedAt(order.createdAt)}
            </div>
          </div>
        </div>

        <div className={styles.topbarRight}>
          <button
            className={styles.btnGhost}
            type="button"
            onClick={() => window.print()}
          >
            Imprimir Pedido
          </button>
        </div>
      </header>

      <main className={styles.content}>
        <section className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.headerDot}>!</span>
                <span className={styles.cardTitle}>ITENS DO PEDIDO</span>
              </div>
              <span className={styles.cardMeta}>
                {order.items?.length ?? 0} itens
              </span>
            </div>

            <div className={styles.itemsList}>
              {order.items?.length ? (
                order.items.map((item) => (
                  <div key={item.id} className={styles.itemRow}>
                    <div className={styles.itemIcon}>
                      {item.imageUrl ? (
                        <img
                          className={styles.itemImage}
                          src={item.imageUrl}
                          alt={item.name}
                        />
                      ) : (
                        <span>{item.quantity}x</span>
                      )}
                    </div>

                    <div className={styles.itemInfo}>
                      <div className={styles.itemTop}>
                        <div className={styles.itemName}>
                          {item.quantity}x {item.name}
                        </div>
                        <div className={styles.itemPrice}>
                          {formatBRL(
                            item.totalPrice ||
                              Number(item.unitPrice) * item.quantity,
                          )}
                        </div>
                      </div>

                      {item.description ? (
                        <div className={styles.itemDesc}>
                          {item.description}
                        </div>
                      ) : null}

                      {item.addons?.length ? (
                        <div className={styles.itemDesc}>
                          {item.addons
                            .map(
                              (addon) =>
                                `${addon.quantity ?? 1}x ${addon.name}`,
                            )
                            .join(", ")}
                        </div>
                      ) : null}

                      {item.observations ? (
                        <div className={styles.obsBox}>
                          <div className={styles.obsTitle}>OBSERVACOES:</div>
                          <div className={styles.obsText}>
                            {item.observations}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.itemDesc}>Nenhum item encontrado.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.headerDot}>R$</span>
                <span className={styles.cardTitle}>RESUMO DE VALORES</span>
              </div>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span className={styles.summaryValue}>
                  {formatBRL(order.subtotal)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Taxa de Entrega</span>
                <span className={styles.summaryValue}>
                  {formatBRL(order.deliveryFee)}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Descontos</span>
                <span className={styles.summaryValueNegative}>
                  - {formatBRL(order.discount)}
                </span>
              </div>

              <div className={styles.summaryDivider} />

              <div className={styles.totalRow}>
                <div className={styles.totalLabel}>TOTAL DO PEDIDO</div>
                <div className={styles.totalValue}>{formatBRL(total)}</div>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.cardTitleMuted}>DADOS DO CLIENTE</span>
              </div>
            </div>

            <div className={styles.customerRow}>
              <div className={styles.avatar}>
                {(order.customerName || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.customerInfo}>
                <div className={styles.customerName}>
                  {order.customerName || "Nao informado"}
                </div>
                <div className={styles.customerPhone}>
                  {order.customerPhone || "Telefone nao informado"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.headerDot}>#</span>
                <span className={styles.cardTitleMuted}>CHAT DO PEDIDO</span>
              </div>
              <span className={styles.cardMeta}>
                {chatMessages.length} mensagens
              </span>
            </div>

            <div
              ref={chatMessagesRef}
              className={styles.chatMessages}
              aria-label="Mensagens do pedido"
            >
              {chatMessages.length ? (
                chatMessages.map((message) => {
                  const isAdmin =
                    message.senderType === ChatMessageSenderType.ADMIN;

                  return (
                    <article
                      key={message.id}
                      className={`${styles.chatBubble} ${
                        isAdmin
                          ? styles.chatBubbleAdmin
                          : styles.chatBubbleCustomer
                      }`}
                    >
                      <div className={styles.chatAuthor}>
                        {message.senderType === ChatMessageSenderType.SYSTEM
                          ? "Loja"
                          : isAdmin
                            ? "Atendimento"
                            : message.sender?.name || order.customerName}
                      </div>
                      <div className={styles.chatText}>{message.text}</div>
                      <span className={styles.chatTime}>
                        {formatChatTime(message.createdAt)}
                      </span>
                    </article>
                  );
                })
              ) : (
                <div className={styles.chatEmpty}>
                  Nenhuma mensagem encontrada.
                </div>
              )}
            </div>

            <form className={styles.chatForm} onSubmit={handleChatSubmit}>
              <input
                className={styles.chatInput}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                disabled={isSendingChatMessage}
                placeholder={
                  isSendingChatMessage
                    ? "Enviando mensagem..."
                    : "Responder ao cliente"
                }
              />
              <button
                type="submit"
                className={styles.chatSendButton}
                disabled={isSendingChatMessage || !chatDraft.trim()}
              >
                Enviar
              </button>
            </form>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.cardTitleMuted}>
                  ENDERECO DE ENTREGA
                </span>
              </div>
            </div>

            <div className={styles.addressBlock}>
              <div className={styles.addressLine1}>
                {formatAddressLine(order)}
              </div>
              {formatAddressDetails(order) ? (
                <div className={styles.addressLine2}>
                  {formatAddressDetails(order)}
                </div>
              ) : null}
              {formatAddressComplement(order) ? (
                <div className={styles.addressLine3}>
                  {formatAddressComplement(order)}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.cardTitleMuted}>
                  FORMA DE PAGAMENTO
                </span>
              </div>
            </div>

            <div className={styles.paymentBlock}>
              <div className={styles.paymentMethod}>
                {paymentLabel[order.paymentMethod] || "Nao informado"}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <span className={styles.cardTitleMuted}>
                  HISTORICO DO PEDIDO
                </span>
              </div>
            </div>

            <div className={styles.timeline}>
              {history.length ? (
                history.map((h, idx) => {
                  const isLast = idx === history.length - 1;
                  return (
                    <div
                      key={`${h.label}-${idx}`}
                      className={styles.timelineRow}
                    >
                      <div className={styles.tlLeft}>
                        <div
                          className={`${styles.tlDot} ${
                            h.status === "done"
                              ? styles.tlDotDone
                              : h.status === "current"
                                ? styles.tlDotCurrent
                                : styles.tlDotPending
                          }`}
                        />
                        {!isLast ? (
                          <div
                            className={`${styles.tlLine} ${
                              h.status === "done"
                                ? styles.tlLineDone
                                : styles.tlLinePending
                            }`}
                          />
                        ) : null}
                      </div>

                      <div className={styles.tlContent}>
                        <div
                          className={`${styles.tlLabel} ${
                            h.status === "pending" ? styles.tlLabelPending : ""
                          }`}
                        >
                          {h.label}
                        </div>
                        <div className={styles.tlTime}>{h.timeLabel}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.tlTime}>Historico nao informado.</div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
