export interface Morada {
  id: string;
  zona: string;
  categoria: string;
  nome: string;
  codigo_bruto: string;
  circuito: string;
  criado_em: string;
  atualizado_em: string;
}

export interface MoradaInput {
  zona: string;
  categoria: string;
  nome: string;
  codigo_bruto: string;
  circuito: string;
}
