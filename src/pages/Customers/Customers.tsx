import { useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiMail,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUsers,
} from "react-icons/fi";
import type { UserResponseDto } from "../../dtos/response/user-response.dto";
import { UserService } from "../../service/user.service";
import styles from "./Customers.module.css";

const PAGE_SIZE = 8;

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "CL";
}

function formatDate(value: string | Date): string {
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

function formatPhone(phone?: string | null): string {
  if (!phone) {
    return "Não informado";
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isCurrentMonth(value: string | Date): boolean {
  const date = new Date(value);
  const now = new Date();

  return (
    !Number.isNaN(date.getTime()) &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function Customers() {
  const [customers, setCustomers] = useState<UserResponseDto[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCustomers() {
    try {
      setLoading(true);
      setError(null);

      const data = await UserService.findCustomers();
      setCustomers(data);
      setPage(1);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setError("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = normalizeSearch(search.trim());

    if (!term) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableText = normalizeSearch(
        [customer.name, customer.email, customer.phone || ""].join(" "),
      );

      return searchableText.includes(term);
    });
  }, [customers, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const customersWithPhone = customers.filter((customer) => customer.phone).length;
  const newCustomersThisMonth = customers.filter((customer) =>
    isCurrentMonth(customer.dateRegistration),
  ).length;

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>Clientes</h1>
          <p className={styles.subtitle}>
            Cadastro completo dos usuários com perfil de cliente.
          </p>
        </div>

        <button
          className={styles.refreshButton}
          type="button"
          onClick={() => void loadCustomers()}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? styles.spin : undefined} />
          Atualizar
        </button>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <FiUsers />
          </div>
          <span className={styles.metricLabel}>CLIENTES</span>
          <strong className={styles.metricValue}>{customers.length}</strong>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <FiPhone />
          </div>
          <span className={styles.metricLabel}>COM TELEFONE</span>
          <strong className={styles.metricValue}>{customersWithPhone}</strong>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <FiCalendar />
          </div>
          <span className={styles.metricLabel}>NOVOS NO MÊS</span>
          <strong className={styles.metricValue}>{newCustomersThisMonth}</strong>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Lista de clientes</h2>
            <span className={styles.panelSubtitle}>
              {filteredCustomers.length} resultado
              {filteredCustomers.length === 1 ? "" : "s"} encontrado
              {filteredCustomers.length === 1 ? "" : "s"}
            </span>
          </div>

          <label className={styles.search}>
            <FiSearch className={styles.searchIcon} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome, e-mail ou telefone"
            />
          </label>
        </div>

        {error ? <div className={styles.alert}>{error}</div> : null}

        <div className={styles.table}>
          <div className={`${styles.row} ${styles.thead}`}>
            <span>Cliente</span>
            <span>E-mail</span>
            <span>Telefone</span>
            <span>Cadastro</span>
            <span>Status</span>
          </div>

          {loading ? (
            <div className={styles.state}>Carregando clientes...</div>
          ) : visibleCustomers.length ? (
            visibleCustomers.map((customer) => (
              <div className={styles.row} key={customer.id}>
                <div className={styles.customerCell}>
                  <div className={styles.avatar}>{getInitials(customer.name)}</div>
                  <div>
                    <strong className={styles.customerName}>{customer.name}</strong>
                    <span className={styles.customerId}>
                      ID {customer.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                <div className={styles.infoCell}>
                  <FiMail />
                  <span>{customer.email}</span>
                </div>

                <div
                  className={`${styles.infoCell} ${
                    customer.phone ? "" : styles.muted
                  }`}
                >
                  <FiPhone />
                  <span>{formatPhone(customer.phone)}</span>
                </div>

                <div className={styles.dateCell}>
                  {formatDate(customer.dateRegistration)}
                </div>

                <div>
                  <span className={styles.statusPill}>Cliente</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <FiUsers />
              </div>
              <strong>Nenhum cliente encontrado</strong>
              <span>Os cadastros com perfil customer aparecerão aqui.</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span>
            Página {currentPage} de {totalPages}
          </span>

          <div className={styles.pager}>
            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
            >
              <FiChevronLeft />
            </button>

            <button
              type="button"
              className={styles.pagerButton}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Próxima página"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
