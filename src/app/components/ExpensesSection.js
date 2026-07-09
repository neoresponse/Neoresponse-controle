"use client";

import React, { useState, useMemo } from "react";
import { ArrowDownRight, Plus, Filter, CreditCard, BarChart3, Calendar, Trash2 } from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

export default function ExpensesSection() {
  const { expenses, cards, campaigns, addExpense } = useStore();
  const [showModal, setShowModal] = useState(false);

  // Estados dos Filtros Locais
  const [selectedCard, setSelectedCard] = useState("todos");
  const [selectedCampaign, setSelectedCampaign] = useState("todas");

  // Estados do Formulário
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [platform, setPlatform] = useState("Meta");
  const [adAccount, setAdAccount] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [creative, setCreative] = useState("");
  const [cardId, setCardId] = useState("");
  const [amount, setAmount] = useState("");

  // Mapeamentos para exibição na tabela
  const cardNames = useMemo(() => {
    return cards.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }, [cards]);

  const campaignNames = useMemo(() => {
    return campaigns.reduce((acc, c) => {
      acc[c.id] = c.name;
      return acc;
    }, {});
  }, [campaigns]);

  // Filtragem dos gastos com base nos filtros locais (Card, Campanha)
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const cardMatch = selectedCard === "todos" || exp.card_id === selectedCard;
      const campaignMatch = selectedCampaign === "todas" || exp.campaign_id === selectedCampaign;
      return cardMatch && campaignMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Mais recentes primeiro
  }, [expenses, selectedCard, selectedCampaign]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adAccount || !campaignId || !cardId || !amount) return;

    addExpense({
      date,
      platform,
      ad_account: adAccount,
      campaign_id: campaignId,
      creative: creative || "Padrão",
      card_id: cardId,
      amount: parseFloat(amount)
    });

    // Reset
    setDate(new Date().toISOString().split("T")[0]);
    setAdAccount("");
    setCampaignId("");
    setCreative("");
    setCardId("");
    setAmount("");
    setShowModal(false);
  };

  return (
    <div className="fade-in">
      <div className={styles.tableHeaderActions}>
        <div>
          <h2 className={styles.sectionTitle}>
            <ArrowDownRight size={20} className="text-danger" />
            Gastos com Anúncios (Ad Spend)
          </h2>
          <p className={styles.kpiSubtext} style={{ marginTop: "-8px" }}>
            Histórico completo de investimentos e débito direto nos cartões
          </p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Registrar Gasto
        </button>
      </div>

      {/* PAINEL DE FILTROS DA TABELA */}
      <div className={`${styles.glassCard}`} style={{ padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)" }}>
          <Filter size={16} className="text-brand" />
          <span>Filtros Rápidos:</span>
        </div>

        {/* Filtrar por Cartão */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Cartão</label>
          <select
            className={styles.select}
            value={selectedCard}
            onChange={(e) => setSelectedCard(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
          >
            <option value="todos">Todos os Cartões</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Filtrar por Campanha */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600" }}>Campanha</label>
          <select
            className={styles.select}
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            style={{ padding: "6px 12px", fontSize: "0.8rem", width: "auto" }}
          >
            <option value="todas">Todas as Campanhas</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          Mostrando <strong>{filteredExpenses.length}</strong> lançamentos
        </span>
      </div>

      {/* TABELA DE GASTOS */}
      <div className={`${styles.glassCard} ${styles.tableCard}`}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Plataforma</th>
                <th>Conta de Anúncio</th>
                <th>Campanha Atribuída</th>
                <th>Criativo</th>
                <th>Cartão Usado</th>
                <th style={{ textAlign: "right" }}>Valor Gasto</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => {
                const parts = exp.date.split("-");
                const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                return (
                  <tr key={exp.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                        <Calendar size={14} className="text-muted" />
                        {formattedDate}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem", fontWeight: "600" }}>{exp.platform}</span>
                    </td>
                    <td className="text-secondary" style={{ fontSize: "0.85rem" }}>{exp.ad_account}</td>
                    <td>
                      <strong style={{ display: "block", fontSize: "0.85rem" }}>
                        {campaignNames[exp.campaign_id] || "Campanha Excluída"}
                      </strong>
                    </td>
                    <td className="text-muted" style={{ fontSize: "0.8rem" }}>{exp.creative || "—"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                        <CreditCard size={12} className="text-brand" />
                        {cardNames[exp.card_id] || "Sem Cartão"}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <strong className="text-danger" style={{ fontSize: "0.9rem" }}>
                        R$ {parseFloat(exp.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-muted" style={{ textAlign: "center", padding: "3rem" }}>
                    Nenhum gasto encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE REGISTRO DE GASTO */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Registrar Gasto de Anúncio</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Data do Gasto</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Plataforma</label>
                  <select className={styles.select} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    <option value="Meta">Meta Ads</option>
                    <option value="Google">Google Ads</option>
                    <option value="TikTok">TikTok Ads</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Conta de Anúncio</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: BM 01 - Conta 02"
                  value={adAccount}
                  onChange={(e) => setAdAccount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Campanha Atribuída</label>
                <select
                  className={styles.select}
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  required
                >
                  <option value="">Selecione a Campanha...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.product})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Nome do Criativo (Opcional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Ad_meta_v1"
                  value={creative}
                  onChange={(e) => setCreative(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Cartão Utilizado</label>
                  <select
                    className={styles.select}
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    required
                  >
                    <option value="">Selecione o Cartão...</option>
                    {cards.filter(c => c.status === "ativo").map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Valor Gasto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={styles.input}
                    placeholder="ex: 150.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
