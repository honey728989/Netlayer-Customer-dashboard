import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import { format } from 'date-fns'
import { useBandwidthStore } from '@/store'

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded border border-border bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-mono text-[10px] text-muted">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-mono font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(2)} Gbps
        </p>
      ))}
    </div>
  )
}

interface BandwidthChartProps {
  height?: number
}

export function BandwidthChart({ height = 160 }: BandwidthChartProps) {
  const { history } = useBandwidthStore()

  const data = useMemo(
    () =>
      history.map((pt) => ({
        time: format(new Date(pt.timestamp), 'HH:mm:ss'),
        Inbound: +pt.inboundGbps.toFixed(2),
        Outbound: +pt.outboundGbps.toFixed(2),
      })),
    [history],
  )

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted"
        style={{ height }}
      >
        Awaiting live data…
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c7bff" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#9c7bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#3d4860', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#3d4860', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}G`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="Inbound"
          stroke="#00d4ff"
          strokeWidth={1.5}
          fill="url(#inboundGrad)"
          dot={false}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="Outbound"
          stroke="#9c7bff"
          strokeWidth={1.5}
          fill="url(#outboundGrad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
