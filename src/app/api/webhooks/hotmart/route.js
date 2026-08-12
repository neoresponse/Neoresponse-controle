import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Função para tratar a data
const getTodayDate = () => {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
};

export async function POST(request) {
  try {
    const payload = await request.json();

    // A Hotmart envia um token (hottok) para validar que a requisição é deles
    // const hottok = request.headers.get('x-hotmart-hottok');
    // if (hottok !== process.env.HOTMART_HOTTOK) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Verifica se é uma venda aprovada (status APPROVED ou PURCHASE_APPROVED)
    const event = payload.event || payload.status;
    if (event !== 'PURCHASE_APPROVED' && event !== 'APPROVED' && event !== 'COMPLETED') {
       // Ignora outros eventos (como boleto gerado, carrinho abandonado, etc)
       return NextResponse.json({ message: 'Evento ignorado (não é venda aprovada)' }, { status: 200 });
    }

    // Extrair dados da venda (a estrutura do payload da Hotmart pode variar, ajustando para o padrão 2.0)
    const data = payload.data || payload;
    
    // Lucro / Comissão recebida (Garante que vai pegar a comissão do PRODUTOR)
    let commission = 0;
    if (data.commissions && Array.isArray(data.commissions)) {
      // Procura a comissão que pertence a você (PRODUCER)
      const myCommission = data.commissions.find(c => c.source === 'PRODUCER');
      
      if (myCommission) {
        commission = myCommission.value;
      } else {
        // Fallback: se por acaso não achar, tenta pegar a primeira, mas evita a taxa da Hotmart se puder
        const anyValidCommission = data.commissions.find(c => c.source !== 'HOTMART');
        commission = anyValidCommission ? anyValidCommission.value : (data.commissions[0]?.value || 0);
      }
    } else {
      // Estrutura legada da Hotmart
      commission = data.purchase?.price?.value || 0;
    }
    
    // Nome do produto
    const productName = data.product?.name || 'Produto Desconhecido';

    // Rastreamento (UTM / SRC)
    // A Hotmart coloca isso no tracking ou no sck/src
    const tracking = data.tracking || {};
    const src = tracking.source || data.purchase?.source || 'Orgânico';
    
    // O nome da campanha deve ser o 'src' (source) se configurado corretamente no Meta
    const campaignName = src;
    const today = getTodayDate();

    // Conectar ao Supabase e usar Upsert (Inserir se não existir, atualizar se existir)
    if (supabase) {
      // 1. Tentar buscar se já existe registro para hoje e para essa campanha
      const { data: existingRecord } = await supabase
        .from('campaign_daily_performance')
        .select('*')
        .eq('date', today)
        .eq('campaign_name', campaignName)
        .single();

      if (existingRecord) {
        // Atualiza somando o valor e as compras
        await supabase
          .from('campaign_daily_performance')
          .update({
            hotmart_revenue: existingRecord.hotmart_revenue + commission,
            purchases: existingRecord.purchases + 1
          })
          .eq('id', existingRecord.id);
      } else {
        // Insere um novo registro
        await supabase
          .from('campaign_daily_performance')
          .insert([{
            date: today,
            campaign_name: campaignName,
            product_name: productName,
            hotmart_revenue: commission,
            purchases: 1,
            meta_spend: 0 // Será preenchido pelo Cron do Meta
          }]);
      }
    }

    return NextResponse.json({ success: true, message: 'Venda registrada com sucesso no painel de ROI' }, { status: 200 });

  } catch (error) {
    console.error('Erro no Webhook da Hotmart:', error);
    return NextResponse.json({ error: 'Erro interno no processamento do webhook' }, { status: 500 });
  }
}
