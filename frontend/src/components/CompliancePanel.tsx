'use client';

import React from 'react';
import { Shield, Scale, Database, AlertTriangle } from 'lucide-react';
import { DataFreshness } from './DataFreshness';

type Framework = {
  regulation: string;
  region?: string;
  status: string;
  measures?: string;
  disclaimer?: string;
};

type NamedNote = {
  name: string;
  role?: string;
  license?: string;
  provider?: string;
  terms?: string;
};

export type CompliancePayload = {
  jurisdiction?: string;
  product_mode?: string;
  not_legal_advice?: string;
  frameworks_assessed?: Framework[];
  open_source_stack?: NamedNote[];
  free_data_sources?: NamedNote[];
  prohibited_by_design?: string[];
  operator_responsibilities?: string[];
  disclaimer_text?: string;
  short_banner?: string;
};

interface CompliancePanelProps {
  compliance: CompliancePayload | null;
}

export const CompliancePanel: React.FC<CompliancePanelProps> = ({ compliance }) => {
  const frameworks = compliance?.frameworks_assessed || [];
  const oss = compliance?.open_source_stack || [];
  const data = compliance?.free_data_sources || [];
  const banned = compliance?.prohibited_by_design || [];
  const duties = compliance?.operator_responsibilities || [];

  return (
    <section className="space-y-3" aria-labelledby="compliance-heading">
      <div className="panel">
        <div className="panel-head flex-wrap">
          <div>
            <h2 id="compliance-heading" className="text-base md:text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              Disclosures · EU & US research posture
            </h2>
            <p className="text-[12px] md:text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {compliance?.jurisdiction || 'European Union & United States'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DataFreshness
              realtime={Boolean(compliance?.frameworks_assessed?.length)}
              label={compliance?.frameworks_assessed?.length ? 'From API' : 'Offline copy'}
            />
            <span className="chip chip-active text-[11px]">
              {compliance?.short_banner || 'Research only · not advice · free OSS'}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-2 text-[14px] md:text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <p>
            <strong style={{ color: 'var(--text-primary)' }}>Product mode: </strong>
            {compliance?.product_mode ||
              'Personal / educational research terminal — not a broker or paid data vendor.'}
          </p>
          {compliance?.not_legal_advice && (
            <p className="text-[12px] flex gap-2 items-start" style={{ color: 'var(--warn)' }}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{compliance.not_legal_advice}</span>
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Regulatory framing
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {frameworks.map((fw) => (
            <div
              key={fw.regulation}
              className="p-4 border-b md:border-r"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {fw.region || 'EU/US'}
              </div>
              <h4 className="text-sm font-bold mt-0.5">{fw.regulation}</h4>
              <p className="text-[12px] font-semibold mt-1" style={{ color: 'var(--accent)' }}>
                {fw.status}
              </p>
              <p className="text-[13px] md:text-[12.5px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {fw.measures || fw.disclaimer}
              </p>
            </div>
          ))}
          {!frameworks.length && (
            <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>
              Compliance text unavailable — API offline.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="panel">
          <div className="panel-head">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Database className="w-4 h-4" />
              Open-source stack (no paid SaaS required)
            </h3>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {oss.map((row) => (
              <li key={row.name} className="px-4 py-3 text-[13px]">
                <div className="font-semibold">{row.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {row.role}
                  {row.license ? ` · ${row.license}` : ''}
                </div>
              </li>
            ))}
            {!oss.length && (
              <li className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                FastAPI, Next.js, pandas, yfinance, feedparser, Ollama — all free/OSS locally.
              </li>
            )}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="text-sm font-bold">Free / public data sources</h3>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {data.map((row) => (
              <li key={row.name} className="px-4 py-3 text-[13px]">
                <div className="font-semibold">{row.name}</div>
                <div className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {row.provider}
                </div>
                <div className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {row.terms}
                </div>
              </li>
            ))}
            {!data.length && (
              <li className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                Delayed public quotes via yfinance · public RSS · local Ollama.
              </li>
            )}
          </ul>
        </div>
      </div>

      {(banned.length > 0 || duties.length > 0) && (
        <div className="panel">
          <div className="panel-head">
            <h3 className="text-sm font-bold">Boundaries for operators</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'var(--border-color)' }}>
            <div className="p-4">
              <h4 className="text-[11px] font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Not in this product
              </h4>
              <ul className="space-y-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {banned.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
            </div>
            <div className="p-4">
              <h4 className="text-[11px] font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Your responsibilities
              </h4>
              <ul className="space-y-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {duties.map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="panel p-4 text-[13px] md:text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Full disclaimer: </strong>
        {compliance?.disclaimer_text ||
          'Informational research only. Not investment advice. Markets involve risk of loss. Built on open-source software and free public data for personal research.'}
      </div>
    </section>
  );
};
