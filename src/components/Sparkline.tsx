type Props = {
  values: number[];
  positive: boolean;
  width?: number;
  height?: number;
};

export function Sparkline({ values, positive, width = 72, height = 28 }: Props) {
  const data = values.slice(-40);
  if (data.length < 2) {
    return <div style={{ width, height }} aria-hidden />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const stroke = positive ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden focusable="false">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
