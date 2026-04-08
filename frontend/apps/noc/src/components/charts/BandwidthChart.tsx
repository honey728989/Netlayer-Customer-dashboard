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
    <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-xs shadow-elevated">
      <p className="mb-1.5 font-mono text-[10px] text-dim">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-mono font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(2)} Gbps
        </p>
      ))}
    </div>
  )
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="flex flex-col gap-2" style={{ height }}>
      <div className="flex-1 skeleton rounded-md opacity-50" />
      <div className="flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-2 w-10" />
        ))}
      </div>
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
        time: format(new Date(pt.timestamp), 'HH:mm'),
        Inbound: +pt.inboundGbps.toFixed(2),
        Outbound: +pt.outboundGbps.toFixed(2),
      })),
    [history],
  )

  if (!data.length) {
    return <ChartSkeleton height={height} />
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c7bff" stopOpacity={0.2} />
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
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#252b3a', strokeWidth: 1 }} />
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
