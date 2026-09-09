import { ServiceOrderStatus } from "@oficina/types";

/**
 * Máquina de estados da OS (spec §5). O status nunca é editável livremente —
 * toda transição passa por `isTransitionAllowed` e é registrada em
 * `service_order_status_history`.
 */
export const ALLOWED_TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  [ServiceOrderStatus.AGENDADO]: [ServiceOrderStatus.RECEBIDO],
  [ServiceOrderStatus.RECEBIDO]: [ServiceOrderStatus.DIAGNOSTICO],
  [ServiceOrderStatus.DIAGNOSTICO]: [ServiceOrderStatus.ORCAMENTO],
  [ServiceOrderStatus.ORCAMENTO]: [ServiceOrderStatus.AGUARDANDO_APROVACAO],
  [ServiceOrderStatus.AGUARDANDO_APROVACAO]: [
    ServiceOrderStatus.APROVADO,
    ServiceOrderStatus.ORCAMENTO,
    ServiceOrderStatus.ENCERRADO,
  ],
  [ServiceOrderStatus.APROVADO]: [ServiceOrderStatus.EM_EXECUCAO],
  [ServiceOrderStatus.EM_EXECUCAO]: [
    ServiceOrderStatus.AGUARDANDO_PECA,
    ServiceOrderStatus.CONTROLE_QUALIDADE,
  ],
  [ServiceOrderStatus.AGUARDANDO_PECA]: [ServiceOrderStatus.EM_EXECUCAO],
  [ServiceOrderStatus.CONTROLE_QUALIDADE]: [
    ServiceOrderStatus.PRONTO,
    ServiceOrderStatus.EM_EXECUCAO,
  ],
  [ServiceOrderStatus.PRONTO]: [ServiceOrderStatus.ENTREGUE],
  [ServiceOrderStatus.ENTREGUE]: [ServiceOrderStatus.ENCERRADO],
  [ServiceOrderStatus.ENCERRADO]: [],
};

export function isTransitionAllowed(from: ServiceOrderStatus, to: ServiceOrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
