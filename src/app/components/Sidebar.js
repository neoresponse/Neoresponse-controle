"use client";

import React from "react";
import { 
  LayoutDashboard, 
  CreditCard, 
  BarChart3, 
  ArrowDownRight, 
  ArrowUpRight, 
  Database, 
  RotateCcw,
  LogOut
} from "lucide-react";
import styles from "@/app/page.module.css";
import { useStore } from "@/lib/store";

export default function Sidebar({ activeTab, setActiveTab }) {
  const { usingSupabase, resetLocalDatabase, logout } = useStore();

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "cards", label: "Cartões", icon: CreditCard },
    { id: "campaigns", label: "Campanhas", icon: BarChart3 },
    { id: "expenses", label: "Gastos (Ad Spend)", icon: ArrowDownRight },
    { id: "revenues", label: "Receitas (Vendas)", icon: ArrowUpRight }
  ];

  const handleReset = () => {
    if (confirm("Tem certeza que deseja redefinir os dados locais para os dados iniciais de teste? Todas as suas alterações manuais locais serão perdidas.")) {
      resetLocalDatabase();
      window.location.reload();
    }
  };

  return (
    <aside className={styles.sidebar}>
      {/* Exibição do Logo Oficial Dourado */}
      <div className={styles.logoArea} style={{ justifyContent: "center", marginBottom: "2rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.5rem" }}>
        <img 
          src="/logo.svg" 
          alt="NEORESPONSE Logo" 
          style={{ width: "140px", height: "140px", filter: "drop-shadow(0 4px 15px rgba(223, 193, 138, 0.08))" }} 
        />
      </div>

      <nav style={{ flexGrow: 1 }}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <button
                  className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ""}`}
                  onClick={() => setActiveTab(item.id)}
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              </li>
            );
          })}
          
          {/* Botão Sair da Conta */}
          <li style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <button
              className={styles.menuItem}
              onClick={logout}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", color: "var(--color-danger)" }}
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </li>
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.dbStatus}>
          <Database size={14} className={usingSupabase ? "text-success" : "text-warning"} />
          <span>Banco:</span>
          {usingSupabase ? (
            <span className={styles.dbStatus}>
              <span className={`${styles.statusDot} ${styles.statusDotOnline}`}></span>
              Supabase (Nuvem)
            </span>
          ) : (
            <span className={styles.dbStatus}>
              <span className={`${styles.statusDot} ${styles.statusDotLocal}`}></span>
              Local (Demo)
            </span>
          )}
        </div>

        {!usingSupabase && (
          <button onClick={handleReset} className={styles.resetBtn}>
            <RotateCcw size={10} style={{ marginRight: "3px" }} />
            Redefinir Demo
          </button>
        )}
      </div>
    </aside>
  );
}
