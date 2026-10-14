import styles from "./Product.module.css";
import { useEffect, useMemo, useRef, useState } from "react";
import ProductCard from "../../components/ProductCard";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { CgFileAdd } from "react-icons/cg";
import type { CategoryKey } from "../../types/Product-type";
import { ProductService } from "../../service/product.service";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import { ProductCategoryEnum } from "../../dtos/enums/product-category.enum";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export function Products() {
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductResponse | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteInProgress = useRef(false);
  const navigate = useNavigate();
  const categoryFromKey = (key: CategoryKey) => {
    switch (key) {
      case "hamburgers":
        return ProductCategoryEnum.FOOD;
      case "sides":
        return ProductCategoryEnum.ADDON;
      case "drinks":
        return ProductCategoryEnum.DRINK;
      case "desserts":
        return ProductCategoryEnum.DESSERT;
      default:
        return null;
    }
  };

  const filtered = useMemo(() => {
    if (activeCat === "all") return products;
    const category = categoryFromKey(activeCat);
    if (!category) return products;
    return products.filter((p) => p.category === category);
  }, [activeCat, products]);

  const total = filtered.length;

  const counts = useMemo(() => {
    const countBy = (category: ProductCategoryEnum) =>
      products.filter((p) => p.category === category).length;

    return {
      all: products.length,
      hamburgers: countBy(ProductCategoryEnum.FOOD),
      sides: countBy(ProductCategoryEnum.ADDON),
      drinks: countBy(ProductCategoryEnum.DRINK),
      desserts: countBy(ProductCategoryEnum.DESSERT),
    };
  }, [products]);

  const CATEGORIES: { key: CategoryKey; label: string }[] = useMemo(
    () => [
      { key: "all", label: `Todos ${counts.all}` },
      { key: "hamburgers", label: "Comidas" },
      { key: "sides", label: "Acompanhamentos " },
      { key: "drinks", label: "Bebidas" },
      { key: "desserts", label: "Sobremesas" },
    ],
    [counts],
  );

  // const getPrimaryImageUrl = (images: ImageResponse[]) => {
  //   const primary = (images || []).find((img: any) => img?.isPrimary);
  //   return primary?.url || (images?.[0] as any)?.url || "";
  // };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ProductService.findAll();
        setProducts(data);
      } catch (err: unknown) {
        console.error(err);
        setError("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  function handleDelete(id: string): void {
    if (deleteInProgress.current) return;
    const product = products.find((product) => product.id === id);
    if (!product) return;
    setDeleteError(null);
    setProductToDelete(product);
  }

  async function confirmDelete(): Promise<void> {
    if (!productToDelete || deleteInProgress.current) return;

    deleteInProgress.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await ProductService.remove(productToDelete.id);
      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productToDelete.id),
      );
      setProductToDelete(null);
      toast.success("Produto excluído do cardápio");
    } catch (error: unknown) {
      console.error(error);
      const message = "Erro ao excluir produto. Tente novamente.";
      setDeleteError(message);
      toast.error(message);
    } finally {
      deleteInProgress.current = false;
      setDeleting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div className={styles.tabs}>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCat(c.key)}
              className={`${styles.tab} ${activeCat === c.key ? styles.tabActive : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <button
          style={{
            width: 150,
            height: 40,
            borderRadius: 10,
            backgroundColor: "#ffd400",
            color: "#000",
            fontWeight: "600",
            border: "none",
            alignItems: "center",
            display: "flex",
            gap: 5,
            justifyContent: "center",
          }}
          onClick={() => navigate("/product-details")}
        >
          <CgFileAdd size={20} />
          Novo Produto
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 12 }}>Carregando...</div>
      ) : error ? (
        <div style={{ padding: 12 }}>{error}</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              description={p.description}
              category={p.category}
              price={p.price}
              imageUrl={p.images}
              isActive={p.isActive}
              stockEnabled={p.stockEnabled}
              stock={p.stock}
              available
              onEdit={() => {}}
              onDelete={handleDelete}
              onToggleAvailable={() => {}}
              navigateTo="/product-details"
            />
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        <div className={styles.counter}>
          Exibindo {total} produtos cadastrados
        </div>
      </div>

      {productToDelete && (
        <ConfirmModal
          title="Excluir produto"
          description={`Excluir "${productToDelete.name}" do cardápio? Esta ação não pode ser desfeita.`}
          loading={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!deleteInProgress.current) setProductToDelete(null);
          }}
        />
      )}
    </div>
  );
}
