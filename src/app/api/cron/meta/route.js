import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Retorna a data considerando o fuso horário do Brasil (UTC-3 / America/Sao_Paulo)
const getBrazilDateStr = (daysOffset = 0) => {
  // Pega a data atual em UTC
  const date = new Date();
  
  // Converte para uma string no fuso horário do Brasil
  const spDateStr = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  
  // Cria um objeto Date baseado no horário do Brasil
  const localDate = new Date(spDateStr);
  
  // Adiciona/remove os dias (ex: -1 para ontem)
  localDate.setDate(localDate.getDate() + daysOffset);
  
  // Formata no padrão YYYY-MM-DD
  const yyyy = localDate.getFullYear();
  const mm = String(localDate.getMonth() + 1).padStart(2, '0');
  const dd = String(localDate.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
};

const getTodayDate = () => getBrazilDateStr(0);
const getYesterdayDate = () => getBrazilDateStr(-1);

export async function GET(request) {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID;

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ error: 'Credenciais do Meta não configuradas no Vercel' }, { status: 500 });
    }

    // Determina qual dia puxar com base no modo (preview = hoje, final = ontem)
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'preview';
    const targetDate = mode === 'final' ? getYesterdayDate() : getTodayDate();

    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range={'since':'${targetDate}','until':'${targetDate}'}&level=campaign&fields=campaign_name,spend&access_token=${accessToken}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.error) {
      console.error('Erro na API do Meta:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const campaignsData = result.data || [];
    let recordsUpdated = 0;

    for (const campaign of campaignsData) {
      const campaignName = campaign.campaign_name;
      const spend = parseFloat(campaign.spend || '0');

      if (supabase && spend > 0) {
        const { data: existingRecord } = await supabase
          .from('campaign_daily_performance')
          .select('*')
          .eq('date', targetDate)
          .eq('campaign_name', campaignName)
          .single();

        if (existingRecord) {
          await supabase
            .from('campaign_daily_performance')
            .update({ meta_spend: spend })
            .eq('id', existingRecord.id);
        } else {
          await supabase
            .from('campaign_daily_performance')
            .insert([{
              date: targetDate,
              campaign_name: campaignName,
              meta_spend: spend,
              hotmart_revenue: 0,
              purchases: 0
            }]);
        }
        recordsUpdated++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `[${mode.toUpperCase()}] Gastos de ${recordsUpdated} campanhas sincronizados para ${targetDate}.`
    }, { status: 200 });

  } catch (error) {
    console.error('Erro no Cron do Meta:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar Meta Ads' }, { status: 500 });
  }
}
