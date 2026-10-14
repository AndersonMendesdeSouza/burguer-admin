import { useEffect, useId, useRef } from "react";
import { FiLoader, FiTrash2, FiX } from "react-icons/fi";
import Colors from "../../themes/Colors";
import styles from "./ConfirmModal.module.css";

type Props = {
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmModal({
  title,
  description,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    cancelRef.current?.focus();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      style={{
        backgroundColor: Colors.Background.primary,
        color: Colors.Texts.primary,
      }}
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={loading}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
    >
      <div className={styles.header}>
        <h2 id={`${id}-title`} className={styles.title}>
          {title}
        </h2>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Fechar"
          title="Fechar"
          onClick={onCancel}
          disabled={loading}
        >
          <FiX aria-hidden="true" />
        </button>
      </div>

      <p
        id={`${id}-description`}
        className={styles.description}
        style={{ color: Colors.Texts.secondary }}
      >
        {description}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button
          ref={cancelRef}
          type="button"
          className={styles.cancelButton}
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.confirmButton}
          style={{
            backgroundColor: Colors.Highlight.primary,
            color: Colors.Background.secondary,
          }}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <FiLoader className={styles.spinner} aria-hidden="true" />
          ) : (
            <FiTrash2 aria-hidden="true" />
          )}
          {loading ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </dialog>
  );
}
