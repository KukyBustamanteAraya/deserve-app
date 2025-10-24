export const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved':
      return 'bg-green-500/20 text-green-400 border-green-500/50';
    case 'design_ready':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    case 'in_review':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'changes_requested':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    case 'rejected':
      return 'bg-red-500/20 text-red-400 border-red-500/50';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'approved':
      return 'Aprobado';
    case 'design_ready':
      return 'Listo para Producción';
    case 'pending':
      return 'Pendiente';
    case 'in_review':
      return 'En Revisión';
    case 'changes_requested':
      return 'Cambios Solicitados';
    case 'rejected':
      return 'Rechazado';
    case 'ready':
      return 'Listo para Aprobar';
    default:
      return status;
  }
};
