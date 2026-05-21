import UploadZone from "@/components/UploadZone";
import ProductPicker from "@/components/ProductPicker";

export default function UploadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Envie sua arte</h1>
        <p className="text-muted-foreground">
          Faça upload da sua imagem e escolha em qual produto deseja estampar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            1. Sua imagem
          </h2>
          <UploadZone />
        </div>
        <div>
          <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            2. Escolha o produto
          </h2>
          <ProductPicker />
        </div>
      </div>
    </div>
  );
}
