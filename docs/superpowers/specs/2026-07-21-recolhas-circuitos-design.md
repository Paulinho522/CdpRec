# Recolhas CTT — Circuitos: Design

## Contexto e objetivo

O Paulo tem um ficheiro Excel (`codigos_postais_ruas.xlsx`) com 10 folhas, cada uma
representando uma zona de código postal (4100, 4200, 4300, 4435, 4480, 4490,
4450-4460, 4605-4630 Rural, 4000 (parte 1), 4000 (parte 2)). Cada folha lista
ruas, freguesias, clientes ou notas, e a que circuito/giro/volta pertencem.

Objetivo: substituir o Excel por uma aplicação web com base de dados, para que,
ao atribuir uma recolha, seja fácil pesquisar por rua/freguesia/cliente (e
opcionalmente código postal) e obter de imediato o circuito responsável.

## Utilizador e acesso

- Utilizador único (o Paulo). Sem necessidade de múltiplas contas/permissões.
- Acesso a partir de qualquer lado (PC e telemóvel), logo o site tem de estar
  publicamente alojado (não apenas localhost).
- Orçamento: gratuito. Já existem contas Vercel e Supabase.

## Arquitetura

- **Frontend + API routes:** Next.js, alojado no Vercel (tier gratuito, sem
  necessidade de GitHub — deploy direto via Vercel CLI a partir da conta já
  existente do Paulo).
- **Base de dados:** Supabase (Postgres gratuito), escolhida em vez de SQLite
  local porque o Postgres gerido é persistente — evita o risco de perda de
  dados que existiria com SQLite num disco efémero de um serviço gratuito tipo
  Render.
- Justificação da escolha entre as 3 opções consideradas: Next.js+Supabase+Vercel
  foi preferida a (B) Python+SQLite+Render (risco real de perda de dados no
  tier grátis) e a (C) Google Sheets como BD (integração com API do Sheets
  mais lenta e com mais fricção de configuração).

## Modelo de dados

Tabela única `moradas` no Supabase, unificando as 10 folhas do Excel:

| Campo          | Tipo      | Notas                                                                 |
|----------------|-----------|------------------------------------------------------------------------|
| `id`           | uuid/serial | chave primária                                                       |
| `zona`         | text      | nome da folha original (ex: "4100", "4450-4460", "4605-4630 Rural")   |
| `categoria`    | text      | "Rua", "Avenida", "Freguesia", "Cliente", "Nota", "Praceta", etc.      |
| `nome`         | text      | nome da rua/freguesia/cliente, pode incluir intervalo de portas       |
| `codigo_bruto` | text      | valor original da coluna "Código" do Excel (pode ser vazio)           |
| `circuito`     | text      | código final normalizado (ver regra abaixo)                          |
| `criado_em`    | timestamp | default now()                                                         |
| `atualizado_em`| timestamp | atualizado em cada edição                                             |

**Regra de normalização do `circuito`** (aplicada no import e reaplicada
sempre que `zona` ou `codigo_bruto` são editados manualmente):
- Se `codigo_bruto` já parecer um código "completo" (contém dígitos e letras
  misturados, ex: "OPE07", "EV922", "4100A", "RSBS1"), usa-se tal e qual.
- Caso contrário (ex: apenas uma letra "A"), concatena-se `zona + codigo_bruto`
  (ex: zona "4100" + "A" → "4100A").
- Se `codigo_bruto` estiver vazio (ex: linhas "Nota"), `circuito` fica vazio.

Dados "sujos" do Excel (`?`, `N/H`, `B / E (Bragrito)`) são importados tal e
qual — ficam visíveis na pesquisa/admin para correção manual posterior.

## Import inicial

Script único (Node ou Python) que lê `codigos_postais_ruas.xlsx`, percorre as
10 folhas, e insere uma linha em `moradas` por cada linha de dados (exceto o
cabeçalho), preenchendo `zona` a partir do nome da folha. Corrido uma única
vez para popular o Supabase antes de o site ficar pronto. Após o import,
confirma-se que o número de linhas migradas bate certo com o Excel, folha a
folha.

## Páginas e funcionalidades

### 1. Página de Pesquisa (`/`, pública, sem password)
- Campo de pesquisa livre por rua/freguesia/cliente — pesquisa insensível a
  maiúsculas e a acentos (ex: "fundacao" encontra "Fundação").
- Filtro opcional por zona/código postal.
- Resultados em formato de cartão (mobile-friendly): Categoria, Nome, Zona e
  **Circuito** em destaque.
- Ruas com intervalos de porta diferentes (ex: "BOAVISTA - 600 até 2706" vs
  "2706 até 5000") aparecem como entradas separadas, tal como no Excel.

### 2. Página de Administração (`/admin`, protegida por password simples)
- Password única fixa (variável de ambiente), sem contas de utilizador —
  guarda apenas as rotas de escrita (criar/editar/apagar/reimportar). A
  pesquisa pública nunca fica bloqueada.
- Listagem de todas as entradas com pesquisa/filtro.
- Criar nova entrada (zona, categoria, nome, código).
- Editar/apagar entrada existente (recalcula `circuito` automaticamente).
- Botão para reimportar um novo Excel, substituindo todos os dados.

## Fora de âmbito (YAGNI)

- Sem contas de utilizador / múltiplos níveis de permissão.
- Sem histórico de alterações (undo) — apenas `atualizado_em`.
- Sem validação geográfica real de códigos postais (CP7 oficiais) — `zona` é
  apenas a etiqueta herdada do nome da folha Excel, não uma tabela de CTT
  oficial.

## Verificação

- Confirmar contagem de linhas por folha após import.
- Testes manuais de pesquisa (incluindo acentos/maiúsculas) e de
  criar/editar/apagar/reimportar na página de admin, antes de considerar
  concluído.
