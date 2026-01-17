
# 🛩️ SIPAER AI — Plataforma de Apoio à Investigação Aeronáutica

## Visão Geral

A **SIPAER AI** é uma plataforma web destinada a apoiar investigadores do **CENIPA/SERIPA** na elaboração de relatórios técnicos de ocorrências aeronáuticas civis.  
A solução integra **Inteligência Artificial**, automação de processos, padronização normativa e centralização de dados, reduzindo o tempo de produção dos relatórios e aumentando a qualidade técnica.

A plataforma integra dados do sistema **Dédalo**, oferece um **editor técnico avançado**, suporte **multilíngue**, **transcrição de áudios LABDATA (CVR) e imagem espectral**, análise assistida por IA e visualizações técnicas.



## 🎯 Objetivos

- Apoiar a produção de relatórios técnicos padronizados
- Garantir conformidade com **SIPAER** e **ICAO Anexo 13**
- Reduzir tarefas manuais e repetitivas
- Melhorar precisão técnica, linguística e terminológica
- Centralizar dados, anexos, transcrições e análises
- Fornecer suporte decisório com IA explicável

---

> O layout visual deve seguir o modelo da imagem de referência fornecida.
## 🧱 Layout
 - imagem referencia -> layout.png
 - theme Dark 
 - Criar Sidebar e Header (com base na imagem)
 - Sidebar fixa, Header com usuário e Área principal
---

---

## 🧱 Arquitetura e Tecnologias

### Frontend
- Next15.js
- TailwindCSS
- shadcn/ui + lucide-react
- Editor Rich Text/Markdown: **TipTap ou Lexical**

### Backend
- Prisma ORM
- MySQL 8
- Autenticação por e-mail/senha (com possibilidade de SSO)

### Inteligência Artificial
- OpenAI GPT-4o (geração, revisão, tradução, RAG)
- Whisper (transcrição de áudio)
- OCR para imagens e PDFs
- Embeddings + Document Retriever

### Visualizações
- D3.js ou Recharts (ex.: peso e balanceamento / CG)

### Outros
- Upload e gerenciamento de arquivos
- Exportação em PDF
- Registro completo de auditoria

---

## 🖥️ Funcionalidades

### Relatórios Técnicos
- Importação de ocorrências via **API do Dédalo**
- Preview e confirmação antes de salvar
- Editor técnico avançado com visualização em tempo real
- Seções padronizadas:
  - Informações Factuais
  - Histórico do Voo
  - Análise
  - Conclusões
  - Recomendações de Segurança
  - Ações Corretivas/Preventivas
- Templates inteligentes com geração inicial via IA
- Correção ortográfica e técnica
- Interação com IA por comandos contextuais
- Tradução para inglês e espanhol
- Upload de anexos com OCR
- Biblioteca normativa integrada
- Gráficos técnicos interativos
- Exportação em PDF (PT / EN / ES)

---

### Transcrição de Áudio (LABDATA)
- Upload de arquivos WAV/MP3
- Transcrição automática via Whisper
- Identificação de piloto, copiloto, ATC e sons de cabine
- Texto com timestamps
- Reprodução sincronizada texto ↔ áudio
- Edição manual
- Exportação em TXT ou PDF

---

## 🧩 Componentes Principais

- autenticação e validação
- editor técnico com IA integrada
- importação do Dédalo
- configuração de templates
- comandos e sugestões da IA
- tradução assistida
- anexos com OCR
- transcrição LABDATA

---
## Backend

- API REST para frontend
- Banco de dados relacional (MySQL 8)
- Prisma ORM
- Armazenamento de arquivos
- Integração com OpenAI e Whisper
- Auditoria completa:
  - Login
  - Edição
  - Upload
  - Exportação

Interações com IA
---

## 🔐 Funcionalidades Avançadas

### 📌 Controle de Versões do Relatório
- Versionamento automático
- Histórico completo de alterações
- Visualização de **diff técnico**
- Restauração de versões anteriores
- Bloqueio de edição em versões assinadas

---

### 🧠 Modo IA Explicável (Explainable AI)
- Exibição das fontes utilizadas pela IA
- Referências normativas e documentais
- Indicação clara de conteúdo gerado, reescrito ou traduzido
- Logs de interação da IA por relatório

---

### 👥 Perfis de Usuário
- **Investigador**: criação e edição
- **Revisor**: comentários e validações
- **Gestor**: aprovação final e auditoria
- **Administrador**: usuários, templates e parâmetros de IA

Controle de acesso baseado em papéis (Permissão).

---

### ✅ Checklist Normativo Automático
- Validação automática antes da exportação
- Verificação de seções obrigatórias
- Alertas de pendências
- Bloqueio configurável para exportação final

---

### 📚 Treinamento com Base Histórica do CENIPA
- Uso de RAG com relatórios históricos anonimizados
- Sugestão de casos semelhantes
- Evolução contínua da IA
- Separação entre base institucional e dados da ocorrência

---

### ✍️ Assinatura Digital e Cadeia de Custódia
- Assinatura digital das versões finais
- Registro imutável de autor, data e versão
- Garantia de integridade e não repúdio
- Suporte a auditorias e uso jurídico-administrativo

---

>  📡 Modo Offline / Rascunho Local
> - Criação e edição offline
> - Armazenamento local criptografado
> - Sincronização automática ao reconectar
> - Indicado para uso em campo

---

## 🧠 Exemplos de Prompts Internos

### Geração de Análise Técnica
"""
Com base nos dados da ocorrência (JSON) e documentos anexos, gere a seção ANÁLISE em linguagem técnica, impessoal e normativa, conforme o padrão SIPAER, utilizando terminologia aeronáutica adequada.
"""

### Transcrição de Áudio
"""
Transcreva fielmente o áudio fornecido, identificando piloto, copiloto, ATC e sons relevantes da cabine, utilizando timestamps.
"""

---

## 🔒 Considerações Finais
- Priorizar usabilidade para diferentes perfis de investigadores
- Garantir conformidade normativa
- Manter alto nível de segurança da informação
- Evoluir a plataforma com feedback contínuo dos usuários
