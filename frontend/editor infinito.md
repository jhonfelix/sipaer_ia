replicar é principalmente a experiência do editor do Grammarly, não necessariamente a IA avançada deles.

Pelas imagens, você já está muito próximo. O que falta é estruturar os componentes certos.

O Grammarly Editor basicamente possui 5 pilares:

1. Editor estilo documento infinito

O Grammarly usa:

ProseMirror internamente
arquitetura semelhante ao TipTap

Para você:

TipTap é a melhor escolha

Você já está no caminho certo.

2. Slash Commands (/)

Você já implementou parcialmente.

O Grammarly usa:

menu contextual
comandos rápidos
inserção dinâmica de blocos

Use:

@tiptap/suggestion
FloatingMenu
SlashCommand extension

Estrutura:

/
↓
Popover
↓
Filtra comandos
↓
Insere node/bloco
3. Floating Toolbar

Sua toolbar já está parecida.

O Grammarly usa:

BubbleMenu
seleção contextual

No TipTap:

<BubbleMenu editor={editor}>
  <Toolbar />
</BubbleMenu>
4. Sistema de comentários/lateral

Você já replicou a UI visual.

Agora falta:

anchors no texto
threads
highlights sincronizados

Estrutura ideal:

type CommentThread = {
  id: string
  from: number
  to: number
  comment: string
  resolved: boolean
}
5. Sugestões inline (O principal)

Esse é o coração do Grammarly.

Você precisa implementar:

Decorations

No ProseMirror/TipTap:

Texto errado
↓
Decoration.inline()
↓
Underline colorido
↓
Tooltip
↓
Aceitar/Rejeitar
Arquitetura REAL do Grammarly
Editor
↓
Detecta mudança
↓
Debounce
↓
Envia trecho
↓
API IA
↓
Retorna spans
↓
Decorations
↓
Popover
O que você precisa implementar AGORA
ETAPA 1 — Base sólida do editor

Use:

npm install @tiptap/react
npm install @tiptap/starter-kit
npm install @tiptap/suggestion
npm install @tiptap/extension-placeholder
npm install @tiptap/extension-link
npm install @tiptap/pm
ETAPA 2 — BubbleMenu

Exemplo:

<BubbleMenu
  editor={editor}
  tippyOptions={{ duration: 100 }}
>
  <Toolbar />
</BubbleMenu>
ETAPA 3 — Slash commands

Você já está quase lá.

Bibliotecas úteis:

cmdk
@floating-ui/react
ETAPA 4 — Decorations

Esse é o mais importante.

Você cria uma extension:

const grammarExtension = Extension.create({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            return DecorationSet.create(state.doc, [
              Decoration.inline(from, to, {
                class: 'grammar-error'
              })
            ])
          }
        }
      })
    ]
  }
})

CSS:

.grammar-error {
  text-decoration: underline wavy red;
}
ETAPA 5 — Tooltip de sugestão

Quando clicar:

Texto sublinhado
↓
Popover
↓
Sugestão
↓
[Aceitar] [Ignorar]

Use:

Tippy.js
Floating UI
ETAPA 6 — Painel lateral

Estrutura igual Grammarly:

[Editor]        [Sugestões]
                - Gramática
                - Clareza
                - Estilo

