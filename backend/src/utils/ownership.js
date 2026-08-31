// Shared across Quotations, Purchase Orders, and Documents: non-admin
// users (manager/viewer) only see and act on records they created;
// admins see and can act on everything. Returning 404 (rather than 403)
// for a non-owned record avoids confirming to a non-admin that a record
// they can't see even exists.

function scopeToOwnerUnlessAdmin(where, req) {
  if (req.user.role !== 'admin') {
    where.createdById = req.user.id;
  }
  return where;
}

function isOwnerOrAdmin(record, req) {
  return req.user.role === 'admin' || record.createdById === req.user.id;
}

module.exports = { scopeToOwnerUnlessAdmin, isOwnerOrAdmin };
