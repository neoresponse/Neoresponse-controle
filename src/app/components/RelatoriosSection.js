"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, ArrowRight, Activity, Percent, Filter } from "lucide-react";
import styles from "@/app/page.module.css";

export default function RelatoriosSection() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de Datas (Início e Fim)
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [periodType, setPeriodType] = useState("diario"); // diario, semanal, mensal, customizado
  
  const [summary, setSummary] = useState({ spend: 0, revenue: 0, profit: 0, roi: 0, sales: 0 });

  // Atalhos de Período
  const handlePeriodChange = (type) => {
    setPeriodType(type);
    const date = new Date();
    
    if (type === "diario") {
      const t = date.toISOString().split("T")[0];
      setStartDate(t);
      setEndDate(t);
    } else if (type === "semanal") {
      const firstDay = new Date(date.setDate(date.getDate() - date.getDay())).toISOString().split("T")[0];
      const lastDay = new Date(date.setDate(date.getDate() - date.getDay() + 6)).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === "mensal") {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Busca os dados no intervalo de datas selecionado
      const { data: records, error } = await supabase
        .from("campaign_daily_performance")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      // Agrupar e Somar os dados por Campanha (útil para quando for mais de 1 dia)
      const aggregated = {};
      let totalSpend = 0;
      let totalRevenue = 0;
      let totalSales = 0;

      (records || []).forEach(row => {
        const campName = row.campaign_name || "Desconhecida";
        
        if (!aggregated[campName]) {
          aggregated[campName] = {
            id: campName,
            campaign_name: campName,
            product_name: row.product_name,
            meta_spend: 0,
            hotmart_revenue: 0,
            purchases: 0
          };
        }
        
        aggregated[campName].meta_spend += Number(row.meta_spend) || 0;
        aggregated[campName].hotmart_revenue += Number(row.hotmart_revenue) || 0;
        aggregated[campName].purchases += Number(row.purchases) || 0;

        totalSpend += Number(row.meta_spend) || 0;
        totalRevenue += Number(row.hotmart_revenue) || 0;
        totalSales += Number(row.purchases) || 0;
      });

      // Ordenar por receita (maior para menor)
      const finalData = Object.values(aggregated).sort((a, b) => b.hotmart_revenue - a.hotmart_revenue);
      setData(finalData);
      
      // Calculate Summary
      const totalProfit = totalRevenue - totalSpend;
      const totalRoi = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;

      setSummary({
        spend: totalSpend,
        revenue: totalRevenue,
        profit: totalProfit,
        roi: totalRoi,
        sales: totalSales
      });

    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <style>{`
        .roi-card {
          background-color: #08080a;
          border: 1px solid rgba(166, 134, 80, 0.15);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .roi-card-title {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .roi-card-value {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 700;
          color: #f3f4f6;
        }
        .roi-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }
        .roi-table th {
          text-align: left;
          padding: 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: var(--text-muted);
          border-bottom: 1px solid rgba(166, 134, 80, 0.2);
          font-weight: 600;
        }
        .roi-table td {
          padding: 1rem;
          font-size: 0.85rem;
          color: var(--text-primary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .period-btn {
          background: none;
          border: 1px solid rgba(166, 134, 80, 0.2);
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .period-btn-active {
          background: rgba(166, 134, 80, 0.1);
          border-color: #a68650;
          color: #DFC18A;
          font-weight: 600;
        }
      `}</style>

      {/* Header e Filtros */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "#DFC18A", fontWeight: "700" }}>
            Painel de ROI Integrado
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
            Acompanhe o retorno sobre investimento agrupado pelo período desejado.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Botões Rápidos de Período */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button className={`period-btn ${periodType === 'diario' ? 'period-btn-active' : ''}`} onClick={() => handlePeriodChange('diario')}>Hoje</button>
            <button className={`period-btn ${periodType === 'semanal' ? 'period-btn-active' : ''}`} onClick={() => handlePeriodChange('semanal')}>Esta Semana</button>
            <button className={`period-btn ${periodType === 'mensal' ? 'period-btn-active' : ''}`} onClick={() => handlePeriodChange('mensal')}>Este Mês</button>
            <button className={`period-btn ${periodType === 'customizado' ? 'period-btn-active' : ''}`} onClick={() => setPeriodType('customizado')}>Customizado</button>
          </div>

          {/* Seletores de Data */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriodType('customizado'); }}
              className={styles.input}
              style={{ width: "140px", height: "36px", fontSize: "0.8rem", backgroundColor: "#040405" }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriodType('customizado'); }}
              className={styles.input}
              style={{ width: "140px", height: "36px", fontSize: "0.8rem", backgroundColor: "#040405" }}
            />
            <button onClick={fetchData} className={styles.btn} style={{ height: "36px", padding: "0 14px", fontSize: "0.8rem" }}>
              <Filter size={14} style={{ marginRight: "4px" }}/> Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
        <div className="roi-card">
          <span className="roi-card-title"><Target size={16} color="#a68650" /> Gasto Meta Ads</span>
          <span className="roi-card-value text-danger">{formatCurrency(summary.spend)}</span>
        </div>
        
        <div className="roi-card">
          <span className="roi-card-title"><DollarSign size={16} color="#10b981" /> Receita Hotmart</span>
          <span className="roi-card-value text-success">{formatCurrency(summary.revenue)}</span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{summary.sales} vendas aprovadas</span>
        </div>
        
        <div className="roi-card">
          <span className="roi-card-title"><Activity size={16} color={summary.profit >= 0 ? "#10b981" : "#ef4444"} /> Lucro Líquido</span>
          <span className="roi-card-value" style={{ color: summary.profit >= 0 ? "#10b981" : "#ef4444" }}>
            {summary.profit >= 0 ? "+" : ""}{formatCurrency(summary.profit)}
          </span>
        </div>

        <div className="roi-card" style={{ backgroundColor: "rgba(166, 134, 80, 0.05)", borderColor: "#a68650" }}>
          <span className="roi-card-title" style={{ color: "#DFC18A" }}><Percent size={16} /> ROAS</span>
          <span className="roi-card-value" style={{ color: "#DFC18A" }}>
            {summary.roi.toFixed(2)}x
          </span>
        </div>
      </div>

      {/* Tabela de Campanhas */}
      <div style={{ backgroundColor: "#08080a", border: "1px solid rgba(166, 134, 80, 0.15)", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(166, 134, 80, 0.2)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>Detalhamento por Campanha ({startDate === endDate ? 'Dia único' : 'Período Acumulado'})</h3>
        </div>
        
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Carregando dados...</div>
        ) : data.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <TrendingDown size={40} color="#3f3f46" style={{ marginBottom: "1rem" }} />
            <h4 style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>Nenhuma campanha registrada no período selecionado.</h4>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="roi-table">
              <thead>
                <tr>
                  <th>Campanha (UTM)</th>
                  <th>Produto</th>
                  <th>Gasto (Meta)</th>
                  <th>Receita (Hotmart)</th>
                  <th>Vendas</th>
                  <th>Lucro</th>
                  <th>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const lucro = Number(row.hotmart_revenue) - Number(row.meta_spend);
                  const roas = Number(row.meta_spend) > 0 ? (Number(row.hotmart_revenue) / Number(row.meta_spend)).toFixed(2) : "0.00";
                  
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: "500" }}>{row.campaign_name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{row.product_name || "-"}</td>
                      <td className="text-danger">{formatCurrency(row.meta_spend)}</td>
                      <td className="text-success">{formatCurrency(row.hotmart_revenue)}</td>
                      <td>{row.purchases}</td>
                      <td style={{ color: lucro >= 0 ? "#10b981" : "#ef4444", fontWeight: "600" }}>
                        {formatCurrency(lucro)}
                      </td>
                      <td style={{ color: roas >= 2 ? "#10b981" : (roas >= 1 ? "#f59e0b" : "#ef4444") }}>
                        {roas}x
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
