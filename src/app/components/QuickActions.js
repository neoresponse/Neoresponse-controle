"use client";

import React, { useState } from "react";
import { Plus, ArrowDownRight, ArrowUpRight } from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

export default function QuickActions() {
  const { cards, campaigns, addExpense, addRevenue } = useStore();
  const [activeModal, setActiveModal] = useState(null); // 'expense' ou 'revenue' ou null

  // Estados do Formulário de Gasto
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expPlatform, setExpPlatform] = useState("Meta");
  const [expAdAccount, setExpAdAccount] = useState("");
  const [expCampaignId, setExpCampaignId] = useState("");
  const [expCreative, setExpCreative] = useState("");
  const [expCardId, setExpCardId] = useState("");
  const [expAmount, setExpAmount] = useState("");

  // Estados do Formulário de Receita
  const [revDate, setRevDate] = useState(new Date().toISOString().split("T")[0]);
  const [revProduct, setRevProduct] = useState("");
  const [revCampaignId, setRevCampaignId] = useState("");
  const [revAmount, setRevAmount] = useState("");
  const [revQuantity, setRevQuantity] = useState("1");

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expAdAccount || !expCampaignId || !expCardId || !expAmount) return;

    addExpense({
      date: expDate,
      platform: expPlatform,
      ad_account: expAdAccount,
      campaign_id: expCampaignId,
      creative: expCreative || "Padrão",
      card_id: expCardId,
      amount: parseFloat(expAmount)
    });

    // Reset e fechar
    setExpDate(new Date().toISOString().split("T")[0]);
    setExpAdAccount("");
    setExpCampaignId("");
    setExpCreative("");
    setExpCardId("");
    setExpAmount("");
    setActiveModal(null);
  };

  const handleRevenueSubmit = (e) => {
    e.preventDefault();
    if (!revProduct || !revCampaignId || !revAmount || !revQuantity) return;

    addRevenue({
      date: revDate,
      product: revProduct,
      campaign_id: revCampaignId,
      amount: parseFloat(revAmount),
      quantity: parseInt(revQuantity)
    });

    // Reset e fechar
    setRevDate(new Date().toISOString().split("T")[0]);
    setRevProduct("");
    setRevCampaignId("");
    setRevAmount("");
    setRevQuantity("1");
    setActiveModal(null);
  };

  return (
    <>
      {/* Botões Flutuantes Rápidos */}
      <div className={styles.quickActionsPanel}>
        <button
          className={`${styles.quickBtn} ${styles.quickBtnRevenue}`}
          onClick={() => setActiveModal("revenue")}
        >
          <ArrowUpRight size={18} />
          <span>+ Receita</span>
        </button>
        <button
          className={styles.quickBtn}
          onClick={() => setActiveModal("expense")}
        >
          <ArrowDownRight size={18} />
          <span>+ Gasto</span>
        </button>
      </div>

      {/* 1. MODAL ADICIONAR GASTO */}
      {activeModal === "expense" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Registrar Gasto Rápido (Ad Spend)</h2>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <form onSubmit={handleExpenseSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Data</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Plataforma</label>
                  <select className={styles.select} value={expPlatform} onChange={(e) => setExpPlatform(e.target.value)}>
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
                  placeholder="ex: BM 01 - Conta de Anúncios 01"
                  value={expAdAccount}
                  onChange={(e) => setExpAdAccount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Campanha Atribuída</label>
                <select
                  className={styles.select}
                  value={expCampaignId}
                  onChange={(e) => setExpCampaignId(e.target.value)}
                  required
                >
                  <option value="">Selecione a Campanha...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.product})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Criativo (Opcional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Ad_V1_Video"
                  value={expCreative}
                  onChange={(e) => setExpCreative(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Cartão de Débito/Crédito</label>
                  <select
                    className={styles.select}
                    value={expCardId}
                    onChange={(e) => setExpCardId(e.target.value)}
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
                    placeholder="0.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL ADICIONAR RECEITA */}
      {activeModal === "revenue" && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Registrar Faturamento Rápido</h2>
              <button className={styles.closeBtn} onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <form onSubmit={handleRevenueSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label>Data</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={revDate}
                    onChange={(e) => setRevDate(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    className={styles.input}
                    value={revQuantity}
                    onChange={(e) => setRevQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Produto</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ex: Produto X, Mentoria Scale"
                  value={revProduct}
                  onChange={(e) => setRevProduct(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Campanha de Tráfego de Origem</label>
                <select
                  className={styles.select}
                  value={revCampaignId}
                  onChange={(e) => setRevCampaignId(e.target.value)}
                  required
                >
                  <option value="">Selecione a Campanha Origem...</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.product})</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Valor Faturado Bruto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  placeholder="0.00"
                  value={revAmount}
                  onChange={(e) => setRevAmount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btn} onClick={() => setActiveModal(null)}>
                  Cancelar
                </button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                  Registrar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
