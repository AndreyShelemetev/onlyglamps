import { ObjectListItem } from "@/lib/api";
import { ObjectCard } from "./ObjectCard";

interface Props {
  objects: ObjectListItem[];
  total: number;
  basePath?: string;
  emptyMessage?: string;
}

export function ObjectGrid({ objects, total, basePath, emptyMessage }: Props) {
  if (objects.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">{emptyMessage || "Объекты не найдены"}</p>
        <p className="text-sm mt-2">Попробуйте изменить параметры поиска</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Найдено: {total} {pluralize(total, "объект", "объекта", "объектов")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {objects.map((obj, index) => (
          <ObjectCard
            key={obj.id}
            obj={obj}
            basePath={basePath}
            imageLoading={index < 3 ? "eager" : "lazy"}
            imageFetchPriority={index === 0 ? "high" : "auto"}
          />
        ))}
      </div>
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const lastDigit = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (lastDigit > 1 && lastDigit < 5) return few;
  if (lastDigit === 1) return one;
  return many;
}
