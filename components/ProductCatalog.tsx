"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PrintfulProduct } from "@/lib/printful/printful";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDesignSession } from "@/store/useDesignSession";

interface Props {
  products: PrintfulProduct[];
}

export default function ProductCatalog({ products }: Props) {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const { printfulFileUrl } = useDesignSession();

  const types = useMemo(
    () => products.map((p) => p.type_name).sort(),
    [products]
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesSearch = p.title
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesType = activeType ? p.type_name === activeType : true;
        return matchesSearch && matchesType;
      }),
    [products, search, activeType]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={activeType === null ? "default" : "secondary"}
            className="cursor-pointer"
            onClick={() => setActiveType(null)}
          >
            Todos
          </Badge>
          {types.map((type) => (
            <Badge
              key={type}
              variant={activeType === type ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setActiveType(type)}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Nenhum produto encontrado.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={printfulFileUrl ? `/mockup?product=${product.id}` : "/upload"}
          >
            <Card className="group overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <div className="aspect-square relative bg-muted">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-contain p-3 group-hover:scale-105 transition-transform"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <Skeleton className="w-full h-full" />
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium line-clamp-2 leading-tight">
                  {product.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {product.type_name}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
