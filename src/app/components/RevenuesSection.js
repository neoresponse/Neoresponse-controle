"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpRight, Plus, Filter, BarChart3, Calendar, Tag, Trash2 } from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

export default function RevenuesSection() {
  const { revenues, campaigns, addRevenue } = useStore();
  const [showModal, setShowModal] = useState(false);

  // Estados dos Filtros Locais
  const [selectedCampaign, setSelectedCampaign] = useState("todas");

  // Estados do Formulário
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [product, setProduct] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");

  // Mapeamento de ids de campanha para nomes
  const campaignNames = useMemo(() => {
    return campaigns.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }, [campaigns]);

  // Filtrar as receitas pelos filtros locais (Campanha)
  const filteredRevenues = useMemo(() => {
    return revenues.filter((rev) => {
      return selectedCampaign === "todas" || rev.campaign_id === selectedCampaign;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Mais recentes primeiro
  }, [revenues, selectedCampaign]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!product || !campaignId || !amount || !quantity) return;

    addRevenue({
      date,
      product,
      campaign_id: campaignId,
      amount: parseFloat(amount),
      quantity: parseInt(quantity)
    });

    // Reset
    setDate(new Date().toISOString().split("T")[0]);
    setProduct("");
    setCampaignId("");
    setAmount("");
    setQuantity("1");
    setShowModal(false);
  };

  return (
    <div className="fade-in">
      <div className={styles.tableHeaderActions}>
        <div>
          <h2 className={styles.sectionTitle}>
            <ArrowUpRight size={20} className="text-success" />
            Receita / Registro de Vendas
          </h2>
          <p className={styles.kpiSubtext} style={{ marginTop: "-8px" }}>
            Lançamento de vendas geradas e atribuição direta a campanhas de tráfego pago
          </p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Registrar Venda
        </button>
      </div>

      {/* PAINEL DE FILTROS DA TABELA */}
      <div className={`${styles.glassCard}`} style={{ padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
          <Filter size={16} className="text-brand" />
          <span>Filtro de Atribuição:</span>
        </div>

        {/* Filtrar por Campanha */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Origem (Campanha)</label>
          <select
            className={styles.select}
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
          >
            <option value="todas">Todas as Campanhas de Origem</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          Mostrando <strong>{filteredRevenues.length}</strong> vendas no período
        </span>
      </div>

      {/* TABELA DE RECEITAS */}
      <div className={`${styles.glassCard} ${styles.tableCard}`}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Campanha de Origem</th>
                <th>Qtd. Vendas</th>
                <th>Ticket Médio</th>
                <th style={{ textAlign: "right" }}>Faturamento Bruto</th>
              </tr>
            </thead>
            <tbody>
              {filteredRevenues.map((rev) => {
                const parts = rev.date.split("-");
                const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                const ticketMedio = rev.quantity > 0 ? rev.amount / rev.quantity : 0;
                return (
                  <tr key={rev.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                        <Calendar size={14} className="text-muted" />
                        {formattedDate}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                        <Tag size={12} className="text-brand" />
                        <strong>{rev.product}</strong>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                        <BarChart3 size={12} className="text-muted" />
                        {campaignNames[rev.campaign_id] || "Campanha Excluída"}
                      </div>
                    </td>
                    <td>
                      <span className="bg-neutral-badge" style={{ fontSize: "0.8rem" }}>
                        {rev.quantity} {rev.quantity === 1 ? "venda" : "vendas"}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.85rem" }}>
                      R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong className="text-success" style={{ fontSize: "0.9rem" }}>
                        R$ {parseFloat(rev.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                  </tr>
                );
              })}
              {filteredRevenues.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-muted" style={{ textAlign: "center", padding: "3rem" }}>
                    Nenhuma receita registrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO DE RECEITA */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Registrar Faturamento / Vendas</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Data da Conversão</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Qtd. Conversões</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Nome do Produto</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Produto X, Mentorias, Assinatura Anual"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Origem de Tráfego (Campanha)</label>
                <select
                  className={styles.select}
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  required
                >
                  <option value="">Selecione a Campanha Origem...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.product})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Valor Total Faturado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  placeholder="ex: 197.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Salvar Faturamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
