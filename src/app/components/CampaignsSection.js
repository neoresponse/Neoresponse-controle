"use client";

import React, { useState } from "react";
import { Plus, BarChart3, Trash2, Edit2, Play, Pause, TrendingUp, HelpCircle } from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

export default function CampaignsSection() {
  const { campaignMetrics, addCampaign, updateCampaignStatus, deleteCampaign } = useStore();
  const [showModal, setShowModal] = useState(false);

  // Estados do Formulário
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [platform, setPlatform] = useState("Meta");
  const [status, setStatus] = useState("teste");
  const [dailyBudget, setDailyBudget] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !product || !dailyBudget) return;

    addCampaign({
      name,
      product,
      platform,
      status,
      daily_budget: parseFloat(dailyBudget)
    });

    // Reset
    setName("");
    setProduct("");
    setPlatform("Meta");
    setStatus("teste");
    setDailyBudget("");
    setShowModal(false);
  };

  const handleStatusChange = (id, newStatus) => {
    updateCampaignStatus(id, newStatus);
  };

  const handleDelete = (id, name) => {
    if (confirm(`Deseja realmente excluir a campanha "${name}"? Todos os gastos e receitas atribuídos a ela serão removidos!`)) {
      deleteCampaign(id);
    }
  };

  // Cores visuais para as plataformas
  const platformColors = {
    Meta: "#1877F2",
    Google: "#EA4335",
    TikTok: "#FE2C55"
  };

  return (
    <div className="fade-in">
      <div className={styles.tableHeaderActions}>
        <div>
          <h2 className={styles.sectionTitle}>
            <BarChart3 size={20} className="text-brand" />
            Gestão de Campanhas
          </h2>
          <p className={styles.kpiSubtext} style={{ marginTop: "-8px" }}>
            Controle de campanhas de tráfego, orçamentos diários e atribuição direta de conversão
          </p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Nova Campanha
        </button>
      </div>

      {/* TABELA DE CAMPANHAS */}
      <div className={`${styles.glassCard} ${styles.tableCard}`}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Campanha / Produto</th>
                <th>Plataforma</th>
                <th>Status</th>
                <th>Orç. Diário</th>
                <th>Gasto total</th>
                <th>Receita total</th>
                <th>Lucro Líquido</th>
                <th>ROAS</th>
                <th>CPA Médio</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {campaignMetrics.map((camp) => {
                const hasSpend = camp.spend > 0;
                return (
                  <tr key={camp.id}>
                    <td>
                      <div>
                        <strong style={{ display: "block", fontSize: "0.9rem" }}>{camp.name}</strong>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          Produto: {camp.product}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          backgroundColor: `${platformColors[camp.platform]}15`,
                          color: platformColors[camp.platform],
                          border: `1px solid ${platformColors[camp.platform]}30`,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "600"
                        }}
                      >
                        {camp.platform}
                      </span>
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        value={camp.status}
                        onChange={(e) => handleStatusChange(camp.id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.75rem",
                          width: "auto",
                          fontWeight: "600",
                          backgroundColor: "var(--bg-app)",
                          borderColor: "var(--border-color)",
                          color:
                            camp.status === "escalada"
                              ? "var(--color-success)"
                              : camp.status === "ativa"
                              ? "var(--color-brand)"
                              : camp.status === "teste"
                              ? "var(--color-warning)"
                              : "var(--text-muted)"
                        }}
                      >
                        <option value="teste" className="text-warning">Teste</option>
                        <option value="ativa" className="text-brand">Ativa</option>
                        <option value="escalada" className="text-success">Escalada</option>
                        <option value="pausada" className="text-muted">Pausada</option>
                      </select>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                        R$ {camp.daily_budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: "0.85rem" }}>
                        R$ {camp.spend.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.85rem" }}>
                      R$ {camp.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td
                      className={camp.profit >= 0 ? "text-success" : "text-danger"}
                      style={{ fontWeight: "700", fontSize: "0.85rem" }}
                    >
                      {camp.profit >= 0 ? "+" : ""}R$ {camp.profit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span
                        className={
                          camp.roas >= 2.0
                            ? "bg-success-badge"
                            : camp.roas >= 1.0
                            ? "bg-warning-badge"
                            : hasSpend
                            ? "bg-danger-badge"
                            : "bg-neutral-badge"
                        }
                      >
                        {camp.roas > 0 ? `${camp.roas.toFixed(2)}x` : "0.00x"}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.85rem" }}>
                      {camp.cpa > 0 ? `R$ ${camp.cpa.toFixed(2)}` : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className={`${styles.btn} ${styles.btnIcon} ${styles.btnDanger}`}
                        onClick={() => handleDelete(camp.id, camp.name)}
                        data-tooltip="Excluir Campanha"
                        style={{ display: "inline-flex" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {campaignMetrics.length === 0 && (
                <tr>
                  <td colSpan="10" className="text-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Nenhuma campanha cadastrada. Clique em "+ Nova Campanha" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO DE CAMPANHA */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Adicionar Nova Campanha</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label>Nome da Campanha</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: MTR - Lookalike 1% - Escala"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Produto Anunciado</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Produto X, Assinatura Premium"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Plataforma</label>
                  <select className={styles.select} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    <option value="Meta">Meta Ads (Facebook)</option>
                    <option value="Google">Google Ads</option>
                    <option value="TikTok">TikTok Ads</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Status Inicial</label>
                  <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="teste">Em Teste</option>
                    <option value="ativa">Ativa</option>
                    <option value="escalada">Escalada</option>
                    <option value="pausada">Pausada</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Orçamento Diário (R$)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="ex: 200"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Salvar Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
