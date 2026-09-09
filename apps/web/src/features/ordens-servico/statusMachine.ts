// Espelha apps/api/src/service-orders/status-machine.ts — usado só para
// desenhar os botões de próximo status; a validação real acontece no backend.
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  AGENDADO: ["RECEBIDO"],
  RECEBIDO: ["DIAGNOSTICO"],
  DIAGNOSTICO: ["ORCAMENTO"],
  ORCAMENTO: ["AGUARDANDO_APROVACAO"],
  AGUARDANDO_APROVACAO: ["APROVADO", "ORCAMENTO", "ENCERRADO"],
  APROVADO: ["EM_EXECUCAO"],
  EM_EXECUCAO: ["AGUARDANDO_PECA", "CONTROLE_QUALIDADE"],
  AGUARDANDO_PECA: ["EM_EXECUCAO"],
  CONTROLE_QUALIDADE: ["PRONTO", "EM_EXECUCAO"],
  PRONTO: ["ENTREGUE"],
  ENTREGUE: ["ENCERRADO"],
  ENCERRADO: [],
};
