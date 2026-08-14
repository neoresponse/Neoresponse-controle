import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Retorna a data de HOJE já no fuso de Brasília (corte à meia-noite local), não em UTC
function getTodayDateBR(baseDate = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(baseDate); // 'en-CA' formata direto como YYYY-MM-DD
}

// Busca a cotação USD -> BRL do momento (AwesomeAPI, gratuita, sem chave)
async function getUsdToBrlRate() {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      cache: 'no-store'
    });
    const json = await res.json();
    const rate = parseFloat(json?.USDBRL?.bid);
    return Number.isFinite(rate) ? rate : null;
  } catch (err) {
    console.error('Falha ao buscar cotação USD-BRL:', err);
    return null;
  }
}

export async function POST(request) {
  try {
    const payload = await request.json();

    // const hottok = request.headers.get('x-hotmart-hottok');
    // if (hottok !== process.env.HOTMART_HOTTOK) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const event = payload.event || payload.status;
    if (event !== 'PURCHASE_APPROVED' && event !== 'APPROVED' && event !== 'COMPLETED') {
      return NextResponse.json({ message: 'Evento ignorado (não é venda aprovada)' }, { status: 200 });
    }

    const data = payload.data || payload;

    // Comissão do PRODUTOR (o valor a somar no relatório)
    let commission = 0;
    if (data.commissions && Array.isArray(data.commissions)) {
      const myCommission = data.commissions.find(c => c.source === 'PRODUCER');
      const chosen = myCommission
        || data.commissions.find(c => c.source !== 'HOTMART')
        || data.commissions[0];
      commission = chosen?.value || 0;
    } else {
      commission = data.purchase?.price?.value || 0;
    }

    // A MOEDA da venda inteira vem daqui — campo oficial documentado pela Hotmart
    const saleCurrency = (data.purchase?.price?.currency_code || 'BRL').toUpperCase();

    // Converte para BRL se a venda não foi feita em reais
    let commissionBRL = commission;
    if (saleCurrency !== 'BRL') {
      const rate = await getUsdToBrlRate();
      if (rate) {
        commissionBRL = commission * rate;
      } else {
        // Se a cotação falhar, não perde a venda — grava o valor original
        // e loga pra conferência manual depois.
        console.error(`Não foi possível converter ${commission} ${saleCurrency} para BRL. Salvando valor original sem conversão.`);
      }
    }

    const productName = data.product?.name || 'Produto Desconhecido';
    const tracking = data.tracking || {};
    const src = tracking.source || data.purchase?.source || 'Orgânico';
    const campaignName = src;

    // Usa a data real da compra (convertida pro fuso BR); cai para "agora" só se faltar no payload
    const purchaseTimestamp = data.purchase?.approved_date || data.purchase?.order_date || data.creation_date;
    const baseDate = purchaseTimestamp ? new Date(purchaseTimestamp) : new Date();
    const today = getTodayDateBR(baseDate);

    if (supabase) {
      const { data: existingRecord } = await supabase
        .from('campaign_daily_performance')
        .select('*')
        .eq('date', today)
        .eq('campaign_name', campaignName)
        .single();

      if (existingRecord) {
        await supabase
          .from('campaign_daily_performance')
          .update({
            hotmart_revenue: existingRecord.hotmart_revenue + commissionBRL,
            purchases: existingRecord.purchases + 1
          })
          .eq('id', existingRecord.id);
      } else {
        await supabase
          .from('campaign_daily_performance')
          .insert([{
            date: today,
            campaign_name: campaignName,
            product_name: productName,
            hotmart_revenue: commissionBRL,
            purchases: 1,
            meta_spend: 0
          }]);
      }
    }

    return NextResponse.json({ success: true, message: 'Venda registrada com sucesso no painel de ROI' }, { status: 200 });
  } catch (error) {
    console.error('Erro no Webhook da Hotmart:', error);
    return NextResponse.json({ error: 'Erro interno no processamento do webhook' }, { status: 500 });
  }
}
