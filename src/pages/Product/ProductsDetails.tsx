import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProductDetails.module.css";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheck,
  FiDollarSign,
  FiEye,
  FiImage,
  FiLoader,
  FiPackage,
  FiPlus,
  FiSave,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Colors from "../../themes/Colors";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { ProductService } from "../../service/product.service";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import type { ImageResponse } from "../../dtos/response/image-response.dto";
import type {
  ProductAddonRequest,
  ProductRequest,
} from "../../dtos/request/product-request.dto";
import { ProductCategoryEnum } from "../../dtos/enums/product-category.enum";
import { ProductStatusEnum } from "../../dtos/enums/product-status.enum";
import { API_BASE_URL } from "../../service/api";

type Media = {
  id: string;
  url: string;
  imagePublicId?: string | null;
  isPrimary?: boolean;
  file?: File;
};

type Addon = {
  id: string;
  name: string;
  description?: string;
  price: number;
  isActive?: boolean;
};

type FieldErrors = {
  media?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  promoPrice?: string;
  stock?: string;
};

type AddonErrors = {
  name?: string;
  price?: string;
};

type ProductDetailsCssVars = CSSProperties & {
  "--bgPrimary": string;
  "--bgSecondary": string;
  "--highlight": string;
  "--textPrimary": string;
  "--textSecondary": string;
};

const categoryOptions = [
  { value: ProductCategoryEnum.FOOD, label: "Comidas" },
  { value: ProductCategoryEnum.DRINK, label: "Bebidas" },
  { value: ProductCategoryEnum.ADDON, label: "Acompanhamentos" },
  { value: ProductCategoryEnum.DESSERT, label: "Sobremesas" },
];

function currencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function toDot(value: string) {
  return value.replace(/\./g, "").replace(",", ".").trim();
}

function toCurrencyInput(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "";
  return String(value).replace(".", ",");
}

function parseDecimal(value: string) {
  return Number(toDot(value));
}

function getImageUrl(image: ImageResponse) {
  const url = image.imageUrl || image.url;
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data &&
    "message" in error.response.data
  ) {
    const message = error.response.data.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

export function ProductsDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deleteInProgress = useRef(false);
  const mediaDeleteInProgress = useRef(false);

  const [media, setMedia] = useState<Media[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonName, setAddonName] = useState("");
  const [addonDescription, setAddonDescription] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [addonErrors, setAddonErrors] = useState<AddonErrors>({});
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [product, setProduct] = useState<ProductResponse | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategoryEnum>(
    ProductCategoryEnum.FOOD,
  );
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [isActive, setActive] = useState<ProductStatusEnum>(
    ProductStatusEnum.ACTIVED,
  );
  const [stockEnabled, setStockEnabled] = useState(false);
  const [stock, setStock] = useState("0");

  const [loadingProduct, setLoadingProduct] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    const resetCreateForm = () => {
      setProduct(null);
      setMedia([]);
      setName("");
      setDescription("");
      setCategory(ProductCategoryEnum.FOOD);
      setPrice("");
      setPromoPrice("");
      setActive(ProductStatusEnum.ACTIVED);
      setStockEnabled(false);
      setStock("0");
      setAddons([]);
      setAddonName("");
      setAddonDescription("");
      setAddonPrice("");
      setAddonErrors({});
      setShowAddonForm(false);
      setErrors({});
      setSubmitted(false);
      setLoadError(null);
    };

    const fetchProduct = async () => {
      if (!isEdit || !id) {
        resetCreateForm();
        setLoadingProduct(false);
        return;
      }

      try {
        setLoadingProduct(true);
        setLoadError(null);
        const data = await ProductService.findOne(id);
        if (!active) return;

        setProduct(data);
        setActive(data.isActive || ProductStatusEnum.DISABLED);
        setStockEnabled(!!data.stockEnabled);
        setMedia(
          (data.images || []).map((image: ImageResponse) => ({
            id: String(image.id),
            url: getImageUrl(image),
            imagePublicId: image.imagePublicId,
            isPrimary: !!image.isPrimary,
          })),
        );
        setName(data.name || "");
        setDescription(data.description || "");
        setCategory(
          (data.category as ProductCategoryEnum) || ProductCategoryEnum.FOOD,
        );
        setPrice(toCurrencyInput(data.price));
        setPromoPrice(toCurrencyInput(data.promoPrice));
        setStock(String(data.stock ?? 0));
        setAddons(
          (data.addons || []).map((addon) => ({
            id: String(addon.id),
            name: addon.name,
            description: addon.description || "",
            price: Number(addon.price || 0),
            isActive: addon.isActive ?? true,
          })),
        );
        setAddonName("");
        setAddonDescription("");
        setAddonPrice("");
        setAddonErrors({});
        setShowAddonForm(false);
        setErrors({});
        setSubmitted(false);
      } catch (error: unknown) {
        if (!active) return;
        const message = getErrorMessage(error, "Erro ao carregar produto.");
        setLoadError(message);
        toast.error(message);
      } finally {
        if (active) setLoadingProduct(false);
      }
    };

    void fetchProduct();

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const primaryId = useMemo(
    () => media.find((item) => item.isPrimary)?.id ?? media[0]?.id,
    [media],
  );

  const primaryMedia = useMemo(
    () => media.find((item) => item.id === primaryId) ?? media[0],
    [media, primaryId],
  );

  const parsedPrice = parseDecimal(price);
  const parsedPromoPrice = promoPrice.trim() ? parseDecimal(promoPrice) : null;
  const hasPromoPrice =
    parsedPromoPrice !== null && Number.isFinite(parsedPromoPrice);
  const previewPrice = hasPromoPrice
    ? parsedPromoPrice
    : Number.isFinite(parsedPrice)
      ? parsedPrice
      : 0;

  const selectedCategoryLabel =
    categoryOptions.find((option) => option.value === category)?.label ||
    "Categoria";

  const saveLabel = isEdit ? "Salvar alterações" : "Criar produto";

  const clearFieldError = (key: keyof FieldErrors) => {
    if (!submitted && !errors[key]) return;
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const setPrimary = (mediaId: string) => {
    setMedia((prev) =>
      prev.map((item) => ({ ...item, isPrimary: item.id === mediaId })),
    );
  };

  const removeMedia = async (mediaId: string) => {
    if (saving || deleting || mediaDeleteInProgress.current) return;

    const removed = media.find((item) => item.id === mediaId);
    if (!removed) return;

    mediaDeleteInProgress.current = true;
    setDeletingMediaId(mediaId);

    try {
      if (!removed.file && removed.imagePublicId) {
        await ProductService.removeImg(removed.imagePublicId);
      }

      if (removed.file) URL.revokeObjectURL(removed.url);

      setMedia((prev) => {
        const next = prev.filter((item) => item.id !== mediaId);
        if (next.length && !next.some((item) => item.isPrimary)) {
          next[0] = { ...next[0], isPrimary: true };
        }
        return next;
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Erro ao excluir imagem.");
      toast.error(message);
    } finally {
      mediaDeleteInProgress.current = false;
      setDeletingMediaId(null);
    }
  };

  const removeAddon = (addonId: string) => {
    setAddons((prev) => prev.filter((addon) => addon.id !== addonId));
  };

  const createAddonId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const resetAddonDraft = () => {
    setAddonName("");
    setAddonDescription("");
    setAddonPrice("");
    setAddonErrors({});
    setShowAddonForm(false);
  };

  const addAddon = () => {
    const cleanName = addonName.trim();
    const cleanDescription = addonDescription.trim();
    const priceNumber = parseDecimal(addonPrice);
    const nextErrors: AddonErrors = {};

    if (!cleanName) nextErrors.name = "Informe o nome do adicional";
    if (!addonPrice.trim()) nextErrors.price = "Informe o preço";
    else if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      nextErrors.price = "Preço inválido";
    }

    setAddonErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setAddons((prev) => [
      ...prev,
      {
        id: createAddonId(),
        name: cleanName,
        description: cleanDescription || undefined,
        price: priceNumber,
        isActive: true,
      },
    ]);
    resetAddonDraft();
  };

  const toggleProductStatus = () => {
    setActive((current) =>
      current === ProductStatusEnum.ACTIVED
        ? ProductStatusEnum.DISABLED
        : ProductStatusEnum.ACTIVED,
    );
  };

  const toggleStockEnabled = () => {
    setStockEnabled((current) => !current);
    setErrors((prev) => ({ ...prev, stock: undefined }));
  };

  const onPickFilesClick = () => {
    fileInputRef.current?.click();
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const nextMedia = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      url: URL.createObjectURL(file),
      isPrimary: false,
      file,
    }));

    setMedia((prev) => {
      const merged = [...prev, ...nextMedia];
      if (!merged.some((item) => item.isPrimary) && merged.length) {
        merged[0] = { ...merged[0], isPrimary: true };
      }
      return merged;
    });

    clearFieldError("media");
    event.target.value = "";
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const priceNumber = parseDecimal(price);

    if (!media.length) next.media = "Adicione ao menos uma imagem";
    if (!name.trim()) next.name = "Preencha o nome do produto";
    if (!description.trim()) next.description = "Preencha a descrição";
    if (!category) next.category = "Selecione uma categoria";
    if (!price.trim()) next.price = "Preencha o preço";
    else if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      next.price = "Preço inválido";
    }

    if (promoPrice.trim()) {
      const promoNumber = parseDecimal(promoPrice);
      if (!Number.isFinite(promoNumber) || promoNumber < 0) {
        next.promoPrice = "Preço promocional inválido";
      } else if (Number.isFinite(priceNumber) && promoNumber > priceNumber) {
        next.promoPrice = "Promoção não pode ser maior que o preço base";
      }
    }

    if (stockEnabled) {
      const stockNumber = Number(String(stock ?? "").trim());
      if (!String(stock ?? "").trim()) next.stock = "Informe o estoque";
      else if (!Number.isInteger(stockNumber) || stockNumber < 0) {
        next.stock = "Estoque inválido";
      }
    }

    return next;
  };

  async function onSave(): Promise<void> {
    if (saving || loadingProduct || mediaDeleteInProgress.current) return;

    setSubmitted(true);
    setLoadError(null);

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      const firstKey = Object.keys(nextErrors)[0] as keyof FieldErrors;
      const element = document.querySelector(`[data-field="${firstKey}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const payload: ProductRequest = {
      name: name.trim(),
      description: description.trim(),
      category,
      price: parseDecimal(price),
      promoPrice: promoPrice.trim() ? parseDecimal(promoPrice) : undefined,
      isActive,
      stockEnabled,
      stock: stockEnabled ? Number(stock || 0) : 0,
      addons: addons.map<ProductAddonRequest>((addon) => ({
        id: addon.id,
        name: addon.name,
        description: addon.description,
        price: addon.price,
        isActive: addon.isActive ?? true,
      })),
      ...(isEdit
        ? {
          existingImageIds: media
            .filter((item) => !item.file)
            .map((item) => item.id),
          primaryImageId: primaryId,
        }
        : {}),
    };

    const orderedMedia = [...media].sort((a, b) => {
      if (a.id === primaryId) return -1;
      if (b.id === primaryId) return 1;
      return 0;
    });
    const filesToUpload = orderedMedia
      .filter((item) => item.file instanceof File)
      .map((item) => item.file as File);

    try {
      setSaving(true);

      if (isEdit && id) {
        await ProductService.update(id, payload, filesToUpload);
        toast.success("Produto atualizado com sucesso");
        navigate(-1);
        return;
      }

      await ProductService.create(payload, filesToUpload);
      toast.success("Produto criado com sucesso");
      navigate(-1);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Erro ao salvar produto.");
      setLoadError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(): Promise<void> {
    if (
      !product?.id ||
      !showDeleteModal ||
      saving ||
      deleteInProgress.current ||
      mediaDeleteInProgress.current
    ) {
      return;
    }

    deleteInProgress.current = true;
    try {
      setDeleting(true);
      setDeleteError(null);
      await ProductService.remove(product.id);
      setShowDeleteModal(false);
      toast.success("Produto excluído do cardápio");
      navigate(-1);
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Erro ao excluir produto.");
      setDeleteError(message);
      setLoadError(message);
      toast.error(message);
    } finally {
      deleteInProgress.current = false;
      setDeleting(false);
    }
  }

  const inputClass = (key: keyof FieldErrors) =>
    submitted && errors[key]
      ? `${styles.input} ${styles.inputError}`
      : styles.input;

  const textareaClass = (key: keyof FieldErrors) =>
    submitted && errors[key]
      ? `${styles.textarea} ${styles.inputError}`
      : styles.textarea;

  const selectClass = (key: keyof FieldErrors) =>
    submitted && errors[key]
      ? `${styles.select} ${styles.inputError}`
      : styles.select;

  const fieldClass = (key: keyof FieldErrors) =>
    submitted && errors[key]
      ? `${styles.field} ${styles.fieldInvalid}`
      : styles.field;

  if (loadingProduct) {
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
          } as ProductDetailsCssVars
        }
      >
        <div className={styles.loadingState}>
          <FiLoader className={styles.spinner} />
          <strong>Carregando produto</strong>
          <span>Buscando informações, imagens e adicionais.</span>
        </div>
      </div>
    );
  }

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
        } as ProductDetailsCssVars
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className={styles.fileInput}
        onChange={onFilesSelected}
      />

      <header className={styles.header}>
        <div className={styles.heading}>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
          >
            <FiArrowLeft />
          </button>

          <div>
            <div className={styles.eyebrow}>
              {isEdit ? "Edição de item" : "Novo item do cardápio"}
            </div>
            <h1 className={styles.title}>
              {isEdit ? "Editar produto" : "Criar produto"}
            </h1>
            <p className={styles.subtitle}>
              Cadastre imagem, descrição, preço, estoque e adicionais em uma
              única tela.
            </p>
          </div>
        </div>

        <div className={styles.topActions}>
          <button
            className={styles.secondaryBtn}
            type="button"
            disabled={!isEdit || saving || deleting}
            onClick={() => window.open("http://localhost:5174", "_blank")}
          >
            <FiEye />
            Ver no app
          </button>
          <button
            className={styles.secondaryBtn}
            type="button"
            disabled={saving || deleting || deletingMediaId !== null}
            onClick={() => navigate(-1)}
          >
            Descartar
          </button>
          <button
            className={styles.saveBtn}
            type="button"
            onClick={onSave}
            disabled={saving || deleting || deletingMediaId !== null}
          >
            {saving ? (
              <FiLoader className={styles.spinner} />
            ) : (
              <FiSave />
            )}
            {saving ? "Salvando..." : saveLabel}
          </button>
        </div>
      </header>

      {loadError ? (
        <div className={styles.alert}>
          <FiAlertCircle />
          <span>{loadError}</span>
        </div>
      ) : null}

      <div className={styles.heroGrid}>
        <section
          className={`${styles.galleryPanel} ${submitted && errors.media ? styles.panelError : ""
            }`}
          data-field="media"
        >
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionKicker}>Galeria</span>
              <h2 className={styles.sectionTitle}>Imagens do produto</h2>
              <p className={styles.galleryDescription}>
                Escolha a foto principal e mostre outros ângulos do produto.
              </p>
            </div>
            {media.length > 0 && (
              <button
                className={styles.smallAction}
                type="button"
                onClick={onPickFilesClick}
                disabled={saving || deleting || deletingMediaId !== null}
              >
                <FiUploadCloud />
                Adicionar fotos
              </button>
            )}
          </div>

          {submitted && errors.media ? (
            <div className={styles.fieldError}>{errors.media}</div>
          ) : null}

          <div className={styles.gallery}>
            {media.map((item) => (
              <div
                key={item.id}
                className={`${styles.mediaCard} ${item.id === primaryId ? styles.mediaCardActive : ""
                  }`}
              >
                {item.id === primaryId ? (
                  <span className={styles.primaryTag}>Principal</span>
                ) : null}

                <img
                  src={item.url}
                  alt={item.file?.name || name || "Foto do produto"}
                  className={styles.mediaImg}
                />

                <div className={styles.mediaActions}>
                  <button
                    className={`${styles.mediaBtn} ${styles.primaryMediaBtn} ${
                      item.id === primaryId ? styles.mediaBtnActive : ""
                    }`}
                    type="button"
                    onClick={() => setPrimary(item.id)}
                    disabled={saving || deleting || deletingMediaId !== null}
                    aria-label="Definir como principal"
                    aria-pressed={item.id === primaryId}
                    title="Definir como principal"
                  >
                    <FiCheck />
                    <span>
                      {item.id === primaryId ? "Principal" : "Definir capa"}
                    </span>
                  </button>
                  <button
                    className={`${styles.mediaBtn} ${styles.deleteMediaBtn}`}
                    type="button"
                    onClick={() => void removeMedia(item.id)}
                    disabled={saving || deleting || deletingMediaId !== null}
                    aria-label="Excluir imagem"
                    title="Excluir imagem"
                    aria-busy={deletingMediaId === item.id}
                  >
                    {deletingMediaId === item.id ? (
                      <FiLoader className={styles.spinner} />
                    ) : (
                      <FiTrash2 />
                    )}
                  </button>
                </div>
              </div>
            ))}

            <button
              className={`${styles.uploadCard} ${
                media.length === 0 ? styles.uploadCardEmpty : ""
              }`}
              type="button"
              onClick={onPickFilesClick}
              disabled={saving || deleting || deletingMediaId !== null}
            >
              {media.length === 0 ? (
                <FiUploadCloud className={styles.uploadIcon} />
              ) : (
                <FiPlus className={styles.uploadIcon} />
              )}
              <strong>
                {media.length === 0
                  ? "Adicione as fotos do produto"
                  : "Adicionar foto"}
              </strong>
              {media.length === 0 && (
                <span>Clique aqui para selecionar as imagens</span>
              )}
              <span>PNG, JPG ou WEBP</span>
            </button>
          </div>
        </section>

        <aside className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <span className={styles.sectionKicker}>Prévia</span>
            <span
              className={`${styles.statusBadge} ${isActive === ProductStatusEnum.ACTIVED
                ? styles.statusOn
                : styles.statusOff
                }`}
            >
              {isActive === ProductStatusEnum.ACTIVED
                ? "Disponível"
                : "Indisponível"}
            </span>
          </div>

          <div className={styles.previewImage}>
            {primaryMedia ? (
              <img src={primaryMedia.url} alt={name || "Produto"} />
            ) : (
              <div className={styles.previewPlaceholder}>
                <FiImage />
                <span>Sem imagem</span>
              </div>
            )}
          </div>

          <div className={styles.previewBody}>
            <h2>{name.trim() || "Nome do produto"}</h2>
            <strong>{currencyBRL(previewPrice)}</strong>
            <p>{description.trim() || "Descrição do produto no cardápio."}</p>
          </div>

          <div className={styles.previewMeta}>
            <div>
              <FiPackage />
              <span>{selectedCategoryLabel}</span>
            </div>
            <div>
              <FiPlus />
              <span>{addons.length} adicionais</span>
            </div>
            <div>
              <FiDollarSign />
              <span>{stockEnabled ? `${stock || 0} em estoque` : "Sem estoque"}</span>
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.formGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>
              <FiPackage />
            </span>
            <div>
              <h2 className={styles.panelTitle}>Informações principais</h2>
              <p className={styles.panelSubtitle}>
                Nome, categoria, descrição e disponibilidade.
              </p>
            </div>
          </div>

          <div className={styles.form}>
            <div className={fieldClass("name")} data-field="name">
              <label className={styles.label}>Nome do produto</label>
              <input
                className={inputClass("name")}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clearFieldError("name");
                }}
                placeholder="Ex: Ambug duplo"
              />
              {submitted && errors.name ? (
                <div className={styles.fieldError}>{errors.name}</div>
              ) : null}
            </div>

            <div className={styles.row2}>
              <div className={fieldClass("category")} data-field="category">
                <label className={styles.label}>Categoria</label>
                <select
                  className={selectClass("category")}
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value as ProductCategoryEnum);
                    clearFieldError("category");
                  }}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {submitted && errors.category ? (
                  <div className={styles.fieldError}>{errors.category}</div>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Status no cardápio</label>
                <div className={styles.toggleRow}>
                  <button
                    type="button"
                    className={`${styles.pill} ${isActive === ProductStatusEnum.ACTIVED
                      ? styles.pillOn
                      : styles.pillOff
                      }`}
                    aria-pressed={isActive === ProductStatusEnum.ACTIVED}
                    onClick={toggleProductStatus}
                  >
                    <span className={styles.pillDot} />
                  </button>
                  <span className={styles.toggleText}>
                    {isActive === ProductStatusEnum.ACTIVED
                      ? "Disponível"
                      : "Indisponível"}
                  </span>
                </div>
              </div>
            </div>

            <div className={fieldClass("description")} data-field="description">
              <label className={styles.label}>Descrição detalhada</label>
              <textarea
                className={textareaClass("description")}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFieldError("description");
                }}
                placeholder="Descreva ingredientes, tamanho e diferenciais."
              />
              {submitted && errors.description ? (
                <div className={styles.fieldError}>{errors.description}</div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>
              <FiDollarSign />
            </span>
            <div>
              <h2 className={styles.panelTitle}>Precificação</h2>
              <p className={styles.panelSubtitle}>
                Valores e controle de estoque.
              </p>
            </div>
          </div>

          <div className={styles.form}>
            <div className={fieldClass("price")} data-field="price">
              <label className={styles.label}>Preço base</label>
              <div className={styles.moneyInput}>
                <span className={styles.moneyPrefix}>R$</span>
                <input
                  className={inputClass("price")}
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    clearFieldError("price");
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
              {submitted && errors.price ? (
                <div className={styles.fieldError}>{errors.price}</div>
              ) : null}
            </div>

            <div className={fieldClass("promoPrice")} data-field="promoPrice">
              <label className={styles.label}>Preço promocional</label>
              <div className={styles.moneyInput}>
                <span className={styles.moneyPrefix}>R$</span>
                <input
                  className={`${inputClass("promoPrice")} ${styles.inputMuted}`}
                  value={promoPrice}
                  onChange={(event) => {
                    setPromoPrice(event.target.value);
                    clearFieldError("promoPrice");
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
              {submitted && errors.promoPrice ? (
                <div className={styles.fieldError}>{errors.promoPrice}</div>
              ) : (
                <div className={styles.help}>
                  Deixe em branco para não aplicar promoção.
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Inventário</label>
              <div className={styles.inventory}>
                <span>Controle de estoque</span>
                <div className={styles.toggleRow}>
                  <button
                    type="button"
                    className={`${styles.pill} ${stockEnabled ? styles.pillOn : styles.pillOff
                      }`}
                    aria-pressed={stockEnabled}
                    onClick={toggleStockEnabled}
                  >
                    <span className={styles.pillDot} />
                  </button>
                  <span className={styles.toggleText}>
                    {stockEnabled ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </div>

            {stockEnabled ? (
              <div className={fieldClass("stock")} data-field="stock">
                <label className={styles.label}>Estoque</label>
                <input
                  className={inputClass("stock")}
                  value={stock}
                  onChange={(event) => {
                    setStock(event.target.value);
                    clearFieldError("stock");
                  }}
                  inputMode="numeric"
                  placeholder="0"
                />
                {submitted && errors.stock ? (
                  <div className={styles.fieldError}>{errors.stock}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <section className={styles.addonsPanel}>
        <div className={styles.addonsHeader}>
          <div>
            <span className={styles.sectionKicker}>Complementos</span>
            <h2 className={styles.sectionTitle}>Adicionais do produto</h2>
          </div>
          <button
            className={styles.smallAction}
            type="button"
            onClick={() => setShowAddonForm((current) => !current)}
          >
            <FiPlus />
            {showAddonForm ? "Fechar" : "Novo adicional"}
          </button>
        </div>

        {showAddonForm ? (
          <div className={styles.addonForm}>
            <div
              className={`${styles.field} ${addonErrors.name ? styles.fieldInvalid : ""
                }`}
            >
              <label className={styles.label}>Nome do adicional</label>
              <input
                className={`${styles.input} ${addonErrors.name ? styles.inputError : ""
                  }`}
                value={addonName}
                onChange={(event) => {
                  setAddonName(event.target.value);
                  setAddonErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Ex: Bacon extra"
              />
              {addonErrors.name ? (
                <div className={styles.fieldError}>{addonErrors.name}</div>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Descrição</label>
              <input
                className={styles.input}
                value={addonDescription}
                onChange={(event) => setAddonDescription(event.target.value)}
                placeholder="Ex: Fatia extra crocante"
              />
            </div>

            <div
              className={`${styles.field} ${addonErrors.price ? styles.fieldInvalid : ""
                }`}
            >
              <label className={styles.label}>Preço</label>
              <div className={styles.moneyInput}>
                <span className={styles.moneyPrefix}>R$</span>
                <input
                  className={`${styles.input} ${addonErrors.price ? styles.inputError : ""
                    }`}
                  value={addonPrice}
                  onChange={(event) => {
                    setAddonPrice(event.target.value);
                    setAddonErrors((prev) => ({ ...prev, price: undefined }));
                  }}
                  inputMode="decimal"
                  placeholder="0,00"
                />
              </div>
              {addonErrors.price ? (
                <div className={styles.fieldError}>{addonErrors.price}</div>
              ) : null}
            </div>

            <div className={styles.addonFormActions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={resetAddonDraft}
              >
                Cancelar
              </button>
              <button className={styles.saveBtnCompact} type="button" onClick={addAddon}>
                <FiCheck />
                Adicionar
              </button>
            </div>
          </div>
        ) : null}

        <div className={styles.addonsList}>
          {addons.length ? (
            addons.map((addon) => (
              <div key={addon.id} className={styles.addonChip}>
                <div className={styles.addonLeft}>
                  <span className={styles.addonIcon}>
                    <FiPlus />
                  </span>
                  <div>
                    <strong>{addon.name}</strong>
                    {addon.description ? <p>{addon.description}</p> : null}
                    <span>{currencyBRL(addon.price)}</span>
                  </div>
                </div>

                <button
                  className={styles.addonRemove}
                  type="button"
                  onClick={() => removeAddon(addon.id)}
                  aria-label="Remover adicional"
                >
                  <FiX />
                </button>
              </div>
            ))
          ) : (
            <div className={styles.addonsEmpty}>
              Nenhum adicional vinculado a este produto.
            </div>
          )}
        </div>

        {isEdit ? (
          <div className={styles.dangerZone}>
            <div>
              <strong>Excluir produto</strong>
              <span>Remove o item do cardápio e das listagens do admin.</span>
            </div>
            <button
              className={styles.deleteBtn}
              type="button"
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              disabled={saving || deleting}
            >
              {deleting ? <FiLoader className={styles.spinner} /> : <FiTrash2 />}
              {deleting ? "Excluindo..." : "Excluir produto"}
            </button>
          </div>
        ) : null}
      </section>

      {showDeleteModal && product && (
        <ConfirmModal
          title="Excluir produto"
          description={`Excluir "${product.name}" do cardápio? Esta ação não pode ser desfeita.`}
          loading={deleting}
          error={deleteError}
          onConfirm={deleteProduct}
          onCancel={() => {
            if (!deleteInProgress.current) setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  );
}
