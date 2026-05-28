import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SimpleChartProps = {
  title: string;
  values: number[];
  labels: string[];
};

export function SimpleChart({ title, values, labels }: SimpleChartProps) {
  const max = Math.max(...values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-48 items-end gap-3">
          {values.map((value, index) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={`${labels[index]}-${value}`}>
              <div className="flex h-36 w-full items-end rounded-xl bg-[#F7F7F5]">
                {value > 0 ? (
                  <div
                    className="w-full rounded-xl bg-[#B08968]"
                    style={{ height: `${Math.max((value / Math.max(max, 1)) * 100, 8)}%` }}
                  />
                ) : null}
              </div>
              <div className="text-center">
                <span className="block text-xs text-[#6B7280]">{labels[index]}</span>
                <span className="block text-xs font-medium text-[#111111]">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
