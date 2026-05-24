Estrutura de Banco de Dados (Prisma + MySQL 8)
1️⃣ Usuários (básico para autoria e auditoria)
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  role      UserRole

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  reportsCreated   Report[] @relation("ReportsCreated")
  reportsEdited    Report[] @relation("ReportsEdited")
}

enum UserRole {
  INVESTIGATOR
  REVIEWER
  ADMIN
}

2️⃣ Relatórios (entidade central)
model Report {
  id             String        @id @default(uuid())
  type           ReportType
  status         ReportStatus
  version        Int           @default(1)
  schemaVersion  Int           @default(1)

  structure      Json          // definição das seções e subseções
  content        Json          // conteúdo Tiptap por subsectionId
  progress       Json          // progresso calculado

  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  createdById    String
  lastEditedById String

  createdBy      User @relation("ReportsCreated", fields: [createdById], references: [id])
  lastEditedBy   User @relation("ReportsEdited", fields: [lastEditedById], references: [id])

  versions       ReportVersion[]
}

enum ReportType {
  AEROAGRICOLA
  TAXI_AEREO
  REGULAR
  HELICOPTERO
}

enum ReportStatus {
  DRAFT
  IN_REVIEW
  FINAL
  ARCHIVED
}

3️⃣ Templates de Relatório (por tipo de operação)
model ReportTemplate {
  id         String     @id @default(uuid())
  type       ReportType
  version    Int

  structure  Json       // estrutura base do relatório

  createdAt  DateTime   @default(now())
  createdBy  String
}


🔹 Uso:
Quando criar um relatório novo, copie structure do template correspondente.

4️⃣ Versionamento (snapshot de conteúdo)
model ReportVersion {
  id        String   @id @default(uuid())
  reportId  String
  version   Int

  content   Json     // snapshot completo do conteúdo
  progress  Json

  createdAt DateTime @default(now())
  createdBy String

  report    Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@unique([reportId, version])
}

5️⃣ Eventos de Auditoria (opcional, mas recomendado)
model AuditLog {
  id         String   @id @default(uuid())
  entity     String   // "report", "template", etc.
  entityId   String
  action     String   // CREATED, UPDATED, SUBMITTED, APPROVED
  payload    Json?

  performedBy String
  createdAt  DateTime @default(now())
}

6️⃣ Comentários / Revisões (opcional)
model ReportComment {
  id          String   @id @default(uuid())
  reportId    String
  sectionId   String?
  subsectionId String?

  content     String
  createdAt   DateTime @default(now())
  createdBy   String

  report      Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
}