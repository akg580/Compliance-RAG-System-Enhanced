const audits = [];

export function addAudit(entry) {
  audits.unshift(entry);
}

export function getAudits() {
  return audits;
}