# Recolhas CTT — Circuitos: Redesign visual + PWA

## Contexto e objetivo

A app funcional (pesquisa pública, login admin, listagem admin) já está no ar
localmente com CRUD completo (Tasks 1-15 do plano original). O Paulo quer que
a interface fique mais dinâmica e prática, com um acabamento mais próximo de
uma app nativa, e que possa ser instalada no telemóvel como PWA.

Feedback específico recolhido: o problema não é falta de funcionalidade nem
dificuldade de uso — é o visual/interação pouco polido (falta de animações,
transições suaves, feedback visual como loading states e toasts em vez de
`alert()`/`confirm()` nativos do browser).

## Âmbito

Aplica-se às três páginas existentes — `/` (pesquisa pública), `/admin/login`,
`/admin` — mais um setup de PWA a nível de toda a app (`app/layout.tsx`,
manifest, ícones, service worker). Não inclui novas funcionalidades de
negócio (pesquisa por voz, favoritos, etc.) nem uma barra de navegação nova —
o link simples para "Administração" mantém-se, por ser um único utilizador.

## Base técnica

- **Tailwind CSS** substitui o `app/globals.css` atual (classes escritas à
  mão como `.search-input`, `.card`, etc.) por utilitários Tailwind aplicados
  diretamente no JSX. `globals.css` passa a conter só a diretiva base do
  Tailwind mais um punhado de `@keyframes` customizados (pulse do skeleton,
  slide-in do toast) que não se conseguem exprimir bem só com utilitários.
- **Componentes próprios pequenos** (sem biblioteca de UI externa), cada um
  num ficheiro em `components/`:
  - `Toast.tsx` + `ToastProvider` (contexto React) — fila simples de
    mensagens temporárias, substitui `alert()`.
  - `ConfirmDialog.tsx` — modal de confirmação estilizado, substitui
    `confirm()` nativo (usado em apagar entrada e reimportar Excel).
  - `Skeleton.tsx` — barras cinza a pulsar, substitui o texto "A carregar...".
  - `Button.tsx`, `Card.tsx` — wrappers finos com as variantes de estilo
    usadas em todo o lado (primário/secundário/perigo para o botão; cartão
    de resultado para o Card), para não repetir classes Tailwind longas.
- Nenhuma destas peças precisa de teste automatizado — são visuais/interação,
  verificadas manualmente no browser, seguindo a convenção já usada nas
  Tasks 13-15 do plano original.

## Visual e interação

- **Cor de destaque:** vermelho CTT (`#E4032E` aproximado — ajustável ao
  implementar), com paleta neutra à volta: cinza claro/branco em modo claro,
  cinza escuro/preto em modo escuro.
- **Modo escuro automático**, via `prefers-color-scheme` (classe `dark:` do
  Tailwind, sem toggle manual — segue sempre a preferência do sistema).
- **Cartões** com cantos arredondados, sombra suave, e transição de
  entrada (fade + slide curto) quando a lista de resultados muda (nova
  pesquisa, criação/edição/remoção no admin).
- **Toques maiores** (mínimo ~44px de altura) em botões e campos — pensado
  para uso a um dedo, em movimento, durante uma recolha.
- **Cabeçalho fixo (sticky)** com a barra de pesquisa sempre visível ao
  fazer scroll pelos resultados, tanto na pesquisa pública como na lista do
  admin.
- **Loading state:** skeleton (3-5 barras a pulsar) enquanto os dados
  carregam, em vez de texto simples.
- **Feedback de ações do admin:** toast discreto no canto do ecrã após
  criar/editar/apagar/reimportar (sucesso ou erro). Apagar uma entrada e
  reimportar o Excel passam a abrir o `ConfirmDialog` em vez do `confirm()`
  nativo do browser.

## PWA

- **`app/manifest.ts`** (formato nativo do Next.js App Router, gera
  `/manifest.webmanifest` automaticamente — não precisa de ficheiro estático
  à parte):
  - `name`: "Recolhas CTT — Circuitos"
  - `short_name`: "Circuitos CTT"
  - `theme_color` / `background_color`: vermelho CTT / branco
  - `display`: `standalone`
  - `start_url`: `/`
  - `icons`: 192×192, 512×512, e uma variante `purpose: maskable` 512×512
- **Ícones:** um SVG simples desenhado à mão (ex.: pin de localização estilo
  "mapa" em vermelho CTT sobre fundo branco/vermelho, coerente com o tema de
  circuitos/moradas), rasterizado para os PNGs necessários — incluindo o
  `apple-touch-icon` (180×180) que o iOS exige via `<link>` no `<head>`
  (Safari ignora o manifest para o ícone do ecrã principal) — usando a
  biblioteca `sharp`, já instalada como dependência do Next.js (usada para
  otimização de imagens), através de um script one-off em `scripts/`
  (não faz parte do build; corre-se uma vez e os PNGs resultantes ficam em
  `public/icons/`, versionados no repo).
- **Service worker mínimo** (`public/sw.js`, registado num pequeno componente
  cliente no `layout.tsx`): cacheia só o "esqueleto" estático da app
  (HTML/CSS/JS gerados pelo build, não os dados). Sem rede, a página ainda
  abre e mostra um estado "sem ligação" em vez de erro em branco. Os dados
  (pesquisa, admin) continuam sempre a vir ao vivo do Supabase — sem cache
  de dados, porque não faz sentido mostrar circuitos desatualizados.

## Verificação

Sem testes automatizados (é trabalho de UI/interação). Verificação manual no
browser, com o `next dev` a correr:
1. **Instalabilidade PWA:** Chrome DevTools → Application → Manifest (sem
   avisos), e o botão de instalar/"Adicionar ao ecrã principal" aparece.
2. **Modo claro/escuro:** alternar a preferência do SO e confirmar que a app
   segue automaticamente.
3. **Mobile:** emulação de dispositivo no DevTools (e no telemóvel real do
   Paulo, se possível) — toques suficientemente grandes, scroll suave,
   cabeçalho fixo funciona.
4. **Cada ação do admin:** criar, editar, apagar (via `ConfirmDialog`),
   reimportar (via `ConfirmDialog`) — todas mostram o toast correto e o
   skeleton aparece durante o carregamento inicial.

## Fora de âmbito

- Pesquisa por voz, favoritos/circuitos frequentes, cópia rápida do
  circuito — não pedidos, ficam para um pedido futuro se fizer sentido.
- Toggle manual de modo escuro — segue sempre o sistema.
- Cache de dados offline — a app depende de dados ao vivo.
- Nova barra de navegação — mantém-se o link simples para admin.
