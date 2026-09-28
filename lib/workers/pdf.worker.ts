import { generateSettlementInvoiceBlob, generateSettlementInvoicesBatchBlob } from '../utils/pdf';

self.onmessage = async (event) => {
  const { type, payload, id } = event.data;
  const intlLocale = payload.intlLocale as string | undefined;
  
  try {
    let result;
    if (type === 'SINGLE') {
      result = await generateSettlementInvoiceBlob(payload.settlement, payload.merchant, intlLocale);
    } else if (type === 'BATCH') {
      result = await generateSettlementInvoicesBatchBlob(payload.settlements, payload.merchant, intlLocale);
    }
    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
