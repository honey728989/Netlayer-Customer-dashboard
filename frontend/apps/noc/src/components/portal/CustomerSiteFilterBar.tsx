import { useMemo } from 'react'
import type { Site } from '@netlayer/api'
import { useCustomerPortalSiteFilterStore } from '@/store'

interface CustomerSiteFilterBarProps {
  sites: Site[]
}

export function CustomerSiteFilterBar({ sites }: CustomerSiteFilterBarProps) {
  const {
    selectedSiteId,
    city,
    status,
    serviceType,
    setSelectedSite,
    setCity,
    setStatus,
    setServiceType,
    resetFilters,
  } = useCustomerPortalSiteFilterStore()

  const cities = useMemo(
    () => [...new Set(sites.map((site) => site.city).filter(Boolean))].sort(),
    [sites],
  )
  const serviceTypes = useMemo(
    () => [...new Set(sites.map((site) => site.type).filter(Boolean))].sort(),
    [sites],
  )

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border p-3 md:grid-cols-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface-2)' }}>
      <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Site
        <select
          value={selectedSiteId ?? ''}
          onChange={(event) => {
            const value = event.target.value
            const selected = sites.find((site) => site.id === value)
            setSelectedSite(value || null, selected?.name ?? null)
          }}
          className="input-field mt-1"
        >
          <option value="">All Sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        City
        <select value={city} onChange={(event) => setCity(event.target.value)} className="input-field mt-1">
          <option value="">All Cities</option>
          {cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Status
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field mt-1">
          <option value="">All Status</option>
          <option value="UP">Online</option>
          <option value="DEGRADED">Degraded</option>
          <option value="DOWN">Offline</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
      </label>

      <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        Service Type
        <select value={serviceType} onChange={(event) => setServiceType(event.target.value)} className="input-field mt-1">
          <option value="">All Services</option>
          {serviceTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <button type="button" className="btn-ghost w-full justify-center" onClick={resetFilters}>
          Reset Filters
        </button>
      </div>
    </div>
  )
}
