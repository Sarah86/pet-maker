import UploadZone from "@/components/UploadZone";
import ProductPicker from "@/components/ProductPicker";
import { getDictionary } from "@/lib/i18n";

export default function UploadPage() {
  const { pages: { upload } } = getDictionary();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">{upload.title}</h1>
        <p className="text-muted-foreground">{upload.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            {upload.stepImage}
          </h2>
          <UploadZone />
        </div>
        <div>
          <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            {upload.stepProduct}
          </h2>
          <ProductPicker />
        </div>
      </div>
    </div>
  );
}
