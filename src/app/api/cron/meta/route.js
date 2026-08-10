import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Retorna a data de hoje no formato YYYY-MM-DD
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Retorna a data de ontem no formato YYYY-MM-DD
const getYesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

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
