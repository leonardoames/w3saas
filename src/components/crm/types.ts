export interface CRMCardExtended {
  userId: string;
  crmId: string | null;
  stage: string;
  stageUpdatedAt: string | null;
  fullName: string | null;
  email: string | null;
  nomeLoja: string | null;
  site: string | null;
  csName: string | null;
  csId: string | null;
  totalTasks: number;
  completedTasks: number;
  accessExpiresAt: string | null;
  createdAt: string | null;
  // Premium fields
  healthScore: number;
  slaExceeded: boolean;
  slaLabel: string | null;
  slaLimitDays: number | null;
  sparkline: (number | null)[];
  nextContactDate: string | null;
  quickNote: string | null;
  lastLoginDaysAgo: number | null;
  valorContrato: number | null;
  dataFimContrato: string | null;
  lastAuditFaturamento: number | null;
}
