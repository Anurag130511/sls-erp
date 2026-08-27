// Enforcing valid status jumps here (not just via the DB enum) stops
// invalid transitions like draft -> closed being written by a buggy
// or malicious API call.

const QUOTATION_TRANSITIONS = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: ['draft'],
  expired: ['draft'],
};

const PO_TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'cancelled'],
  confirmed: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: ['closed'],
  closed: [],
  cancelled: [],
};

function canTransition(table, from, to) {
  if (from === to) return true;
  return Boolean(table[from] && table[from].includes(to));
}

module.exports = {
  canTransitionQuotation: (from, to) => canTransition(QUOTATION_TRANSITIONS, from, to),
  canTransitionPO: (from, to) => canTransition(PO_TRANSITIONS, from, to),
};
