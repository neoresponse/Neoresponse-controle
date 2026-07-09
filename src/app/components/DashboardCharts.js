"use client";

import React, { useMemo } from "react";
import styles from "@/app/page.module.css";

export default function DashboardCharts({ chartTimeline }) {
  
  // DADOS E CÁLCULOS DO GRÁFICO DE LINHA (LUCRO NO TEMPO)
  const lineChartData = useMemo(() => {
    if (!chartTimeline || chartTimeline.length === 0) return null;

    const width = 800; // Maior largura para preencher a tela
    const height = 240;
    const padding = { top: 20, right: 30, bottom: 30, left: 60 };

    const profits = chartTimeline.map(d => d.profit);
    const maxProfit = Math.max(...profits, 100);
    const minProfit = Math.min(...profits, -100);
    const range = maxProfit - minProfit;
    const rangeBuffer = range === 0 ? 100 : range * 1.15; // 15% de respiro
    
    const yMax = maxProfit + (rangeBuffer - range) / 2;
    const yMin = minProfit - (rangeBuffer - range) / 2;

    const getX = (index) => {
      if (chartTimeline.length <= 1) return padding.left;
      return padding.left + (index / (chartTimeline.length - 1)) * (width - padding.left - padding.right);
    };

    const getY = (value) => {
      const scale = height - padding.top - padding.bottom;
      const pct = (value - yMin) / (yMax - yMin);
      return height - padding.bottom - pct * scale;
    };

    let pathD = "";
    let areaD = "";
    
    if (chartTimeline.length > 0) {
      pathD = `M ${getX(0)} ${getY(chartTimeline[0].profit)}`;
      areaD = `M ${getX(0)} ${height - padding.bottom}`;
      
      chartTimeline.forEach((d, i) => {
        const x = getX(i);
        const y = getY(d.profit);
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      });

      areaD += ` L ${getX(chartTimeline.length - 1)} ${height - padding.bottom} Z`;
    }

    // Formatar datas do eixo X (Mostrar ~5 rótulos espaçados)
    const labelIndices = [];
    if (chartTimeline.length > 1) {
      const step = Math.max(1, Math.floor(chartTimeline.length / 4));
      for (let i = 0; i < chartTimeline.length; i += step) {
        labelIndices.push(i);
      }
      if (labelIndices[labelIndices.length - 1] !== chartTimeline.length - 1) {
        labelIndices.push(chartTimeline.length - 1);
      }
    } else if (chartTimeline.length === 1) {
      labelIndices.push(0);
    }

    const xLabels = labelIndices.map(idx => {
      const item = chartTimeline[idx];
      const parts = item.date.split("-");
      return {
        x: getX(idx),
        text: `${parts[2]}/${parts[1]}` // DD/MM
      };
    });

    const zeroY = getY(0);

    return {
      width,
      height,
      padding,
      pathD,
      areaD,
      xLabels,
      yMin,
      yMax,
      zeroY,
      getX,
      getY,
      minProfit,
      maxProfit
    };
  }, [chartTimeline]);

  return (
    <div className={`${styles.glassCard} ${styles.chartCard}`} style={{ marginBottom: "2rem" }}>
      <div>
        <h3 className={styles.sectionTitle}>Curva de Lucro Líquido</h3>
        <p className={styles.kpiSubtext} style={{ marginTop: "-8px" }}>
          Fluxo de lucros acumulados diariamente (Receitas - Gastos)
        </p>
      </div>

      <div className={styles.chartContainer} style={{ height: "260px" }}>
        {lineChartData ? (
          <svg
            viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`}
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Linhas de Grade de Y */}
            <line
              x1={lineChartData.padding.left}
              y1={lineChartData.padding.top}
              x2={lineChartData.width - lineChartData.padding.right}
              y2={lineChartData.padding.top}
              stroke="var(--border-color)"
              strokeDasharray="3 3"
            />
            <line
              x1={lineChartData.padding.left}
              y1={lineChartData.padding.top + (lineChartData.height - lineChartData.padding.top - lineChartData.padding.bottom) / 2}
              x2={lineChartData.width - lineChartData.padding.right}
              y2={lineChartData.padding.top + (lineChartData.height - lineChartData.padding.top - lineChartData.padding.bottom) / 2}
              stroke="var(--border-color)"
              strokeDasharray="3 3"
            />
            <line
              x1={lineChartData.padding.left}
              y1={lineChartData.height - lineChartData.padding.bottom}
              x2={lineChartData.width - lineChartData.padding.right}
              y2={lineChartData.height - lineChartData.padding.bottom}
              stroke="var(--border-color)"
            />

            {/* Linha de Lucro Zero (Eixo X de Referência) */}
            {lineChartData.zeroY >= lineChartData.padding.top && lineChartData.zeroY <= lineChartData.height - lineChartData.padding.bottom && (
              <line
                x1={lineChartData.padding.left}
                y1={lineChartData.zeroY}
                x2={lineChartData.width - lineChartData.padding.right}
                y2={lineChartData.zeroY}
                stroke="var(--text-muted)"
                strokeOpacity="0.25"
                strokeWidth="1.5"
              />
            )}

            {/* Área Sombreada sob a Curva */}
            <path d={lineChartData.areaD} fill="url(#profitAreaGrad)" />

            {/* Linha Principal do Gráfico */}
            <path
              d={lineChartData.pathD}
              fill="none"
              stroke="var(--color-success)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Bolinhas indicadoras */}
            {chartTimeline.map((d, idx) => {
              const x = lineChartData.getX(idx);
              const y = lineChartData.getY(d.profit);
              const isMax = d.profit === lineChartData.maxProfit;
              const isMin = d.profit === lineChartData.minProfit;
              if (isMax || isMin || idx === 0 || idx === chartTimeline.length - 1) {
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill={d.profit >= 0 ? "var(--color-success)" : "var(--color-danger)"}
                    stroke="var(--bg-surface)"
                    strokeWidth="1.8"
                  />
                );
              }
              return null;
            })}

            {/* Eixo Y */}
            <text
              x={lineChartData.padding.left - 10}
              y={lineChartData.padding.top + 4}
              fill="var(--text-muted)"
              fontSize="10"
              textAnchor="end"
            >
              R$ {lineChartData.yMax >= 1000 ? `${(lineChartData.yMax / 1000).toFixed(1)}k` : Math.round(lineChartData.yMax)}
            </text>
            <text
              x={lineChartData.padding.left - 10}
              y={lineChartData.height - lineChartData.padding.bottom + 4}
              fill="var(--text-muted)"
              fontSize="10"
              textAnchor="end"
            >
              R$ {lineChartData.yMin <= -1000 ? `${(lineChartData.yMin / 1000).toFixed(1)}k` : Math.round(lineChartData.yMin)}
            </text>

            {/* Eixo X */}
            {lineChartData.xLabels.map((lbl, idx) => (
              <text
                key={idx}
                x={lbl.x}
                y={lineChartData.height - 10}
                fill="var(--text-muted)"
                fontSize="10"
                textAnchor="middle"
              >
                {lbl.text}
              </text>
            ))}
          </svg>
        ) : (
          <div className={styles.emptyState} style={{ padding: "2rem" }}>
            <p>Carregando histórico do gráfico...</p>
          </div>
        )}
      </div>
    </div>
  );
}
