# 🖤 NEORESPONSE — Media Buying Financial OS

O **NEORESPONSE** é um sistema operacional e micro SaaS de controle financeiro de alta performance e tomada de decisão para tráfego pago (media buying). Desenvolvido com **Next.js** (React 19) e **CSS Vanilla (scoped CSS Modules)** com um design fintech dark premium premium inspirado no Stripe/Vercel.

Ele responde diariamente: **“Onde estou colocando dinheiro com anúncios, quanto está voltando e onde devo escalar ou cortar orçamento?”**

---

## 🚀 Como Executar o Projeto Localmente

1. **Instale as Dependências** (já realizado no ambiente de desenvolvimento):
   ```bash
   npm install
   ```

2. **Inicie o Servidor de Desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse a ferramenta em [http://localhost:3000](http://localhost:3000). O sistema iniciará **instantaneamente com dados de teste ultra-realistas dos últimos 30 dias** salvos no cache do navegador (`localStorage`). Você pode adicionar, editar e gerenciar cartões e campanhas livremente para testar.

---

## 📦 Como Hospedar na Vercel e Conectar ao GitHub

Hospedar o **NEORESPONSE** na Vercel é extremamente simples, pois o projeto foi construído usando Next.js, a estrutura nativa da Vercel.

### Passo 1: Subir o Código no GitHub
Como a máquina local pode não ter o Git no PATH global, você pode fazer isso de qualquer terminal Git ou interface visual (como VS Code ou GitHub Desktop):

1. Inicialize o repositório Git local:
   ```bash
   git init
   ```
2. Adicione os arquivos (o `.gitignore` padrão do Next.js já ignora a pasta `node_modules` e arquivos `.env` confidenciais):
   ```bash
   git add .
   ```
3. Realize o commit inicial:
   ```bash
   git commit -m "feat: inicializando o Neoresponse Financial OS"
   ```
4. Crie um repositório no seu GitHub (ex: `neoresponse-controle`) e associe-o ao repositório local:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/neoresponse-controle.git
   git branch -M main
   git push -u origin main
   ```

### Passo 2: Implantar na Vercel
1. Acesse o painel da [Vercel](https://vercel.com/) e faça login com sua conta do GitHub.
2. Clique em **"Add New..."** → **"Project"**.
3. Importe o repositório `neoresponse-controle` que você acabou de criar.
4. A Vercel detectará automaticamente que é um projeto **Next.js**. Não altere nenhuma configuração de build padrão.
5. Clique em **"Deploy"**. Em menos de 1 minuto, seu sistema estará no ar com um link público seguro HTTPS!

---

## ⚡ Como Configurar e Ativar o Supabase (Banco de Dados)

O NEORESPONSE possui uma **camada de dados híbrida inteligente**. Se as credenciais do Supabase não forem detectadas, ele funciona em modo Demo offline (salvando tudo localmente). Assim que você conectar o Supabase, o sistema migra automaticamente para salvar tudo na nuvem!

### Passo 1: Criar o Banco de Dados no Supabase
1. Acesse o [Supabase](https://supabase.com/) e crie uma conta gratuita.
2. Crie um novo projeto (ex: `Neoresponse OS`).
3. No painel lateral esquerdo, clique em **SQL Editor** → **New Query**.
4. Abra o arquivo [schema.sql](file:///c:/Users/User/Documents/PROJETOS/vibe%20coding/Neoresponse-controle/schema.sql) deste projeto, copie todo o código e cole-o na área de texto do SQL Editor do Supabase.
5. Clique em **Run** (executar). Isso criará todas as tabelas (`cards`, `campaigns`, `expenses`, `revenues`) e as políticas de segurança pública (RLS) para o seu SaaS funcionar de imediato.

### Passo 2: Conectar as Credenciais no Projeto
No Supabase, vá em **Project Settings** (ícone de engrenagem) → **API**. Você precisará de duas informações:
- **Project API URL**
- **anon / public API Key**

#### Para desenvolvimento local:
Crie um arquivo chamado `.env.local` na raiz do projeto e cole as credenciais nele:
```env
NEXT_PUBLIC_SUPABASE_URL=https://sua-url-do-supabase.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-token-anon-key-aqui
```
Reinicie o servidor (`npm run dev`) e o NEORESPONSE mudará o indicador no rodapé esquerdo para **"Supabase (Nuvem)"**, sincronizando com seu banco real!

#### Para produção na Vercel:
1. No painel do seu projeto na Vercel, vá em **Settings** → **Environment Variables**.
2. Adicione as duas variáveis exatamente com os mesmos nomes:
   - Nome: `NEXT_PUBLIC_SUPABASE_URL` | Valor: sua URL do Supabase
   - Nome: `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Valor: sua chave anônima do Supabase
3. Salve as variáveis. A Vercel reconstruirá a aplicação e o seu sistema estará 100% integrado ao banco em nuvem!

---

## 🧠 Arquitetura Inteligente (Pronto para o Futuro SaaS)

A estrutura do NEORESPONSE foi modelada pensando no futuro crescimento de um SaaS:
- **Atribuição Multi-Cartão Proporcional**: Se uma campanha possui gastos debitados em múltiplos cartões durante o período de tempo selecionado, as receitas geradas por essa campanha são distribuídas de forma proporcional aos investimentos feitos por cada cartão! Isso garante que o ROAS e o Lucro de cada cartão reflitam o ROI real de mídia.
- **Gráficos em Vetor (SVG) Nativos**: Sem bibliotecas externas pesadas. Gráficos de linha e barra gerados diretamente pelo React com altíssima performance, renderizados no servidor e ajustáveis a qualquer resolução de tela.
- **Preparado para APIs de Anúncio**: A estrutura de tabela `expenses` está mapeada com `ad_account` e `campaign_id` facilitando o gancho futuro com webhooks ou cron jobs integrados às APIs do Meta Ads e Google Ads para sincronização automática diária!
