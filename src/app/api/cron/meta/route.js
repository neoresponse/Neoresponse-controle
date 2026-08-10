import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};

export async function GET(request) {
  // Vercel Cron envia um cabeçalho de autorização.
  // Em produção, você deve verificar esse cabeçalho para segurança:
  // if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    const adAccountId = process.env.META_AD_ACCOUNT_ID; // ex: act_123456789

    if (!accessToken || !adAccountId) {
      return NextResponse.json({ error: 'Credenciais do Meta não configuradas no Vercel' }, { status: 500 });
    }

    // A URL da API do Meta Ads para pegar o gasto (spend) diário agrupado por campanha
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?time_range={'since':'${getTodayDate()}','until':'${getTodayDate()}'}&level=campaign&fields=campaign_name,spend&access_token=${accessToken}`;

    const response = await fetch(url);
    const result = await response.json();

    if (result.error) {
      console.error('Erro na API do Meta:', result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const campaignsData = result.data || [];
    const today = getTodayDate();

    let recordsUpdated = 0;

    for (const campaign of campaignsData) {
      const campaignName = campaign.campaign_name;
      const spend = parseFloat(campaign.spend || '0');

      if (supabase && spend > 0) {
        // Tenta encontrar o registro de hoje
        const { data: existingRecord } = await supabase
          .from('campaign_daily_performance')
          .select('*')
          .eq('date', today)
          .eq('campaign_name', campaignName)
          .single();

        if (existingRecord) {
          // Atualiza o gasto
          await supabase
            .from('campaign_daily_performance')
            .update({ meta_spend: spend })
            .eq('id', existingRecord.id);
        } else {
          // Cria o registro se não tiver tido venda ainda hoje
          await supabase
            .from('campaign_daily_performance')
            .insert([{
              date: today,
              campaign_name: campaignName,
              meta_spend: spend,
              hotmart_revenue: 0,
              purchases: 0
            }]);
        }
        recordsUpdated++;
      }
    }

    return NextResponse.json({ success: true, message: `Gastos de ${recordsUpdated} campanhas sincronizados com sucesso.` }, { status: 200 });

  } catch (error) {
    console.error('Erro no Cron do Meta:', error);
    return NextResponse.json({ error: 'Erro interno ao sincronizar Meta Ads' }, { status: 500 });
  }
}
