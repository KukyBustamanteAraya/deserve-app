'use client';

import { useEffect, useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

type TeamBranding = {
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
};

type TwoPhaseProgressTrackerProps = {
  teamId: string;
  teamSlug?: string;
  onShareDesign?: () => void;
  isManager?: boolean;
};

type OrderPlacementStats = {
  designRequested: boolean;
  designConfirmed: boolean;
  designCreated?: boolean; // Alternative property for design creation tracking
  playersAdded: boolean;
  addressSet: boolean;
  paymentComplete: boolean;
};

type ProductionStats = {
  currentStage: string | null;
  orderStatus: string | null;
};

const TwoPhaseProgressTracker = memo(function TwoPhaseProgressTracker({
  teamId,
  teamSlug,
  onShareDesign,
  isManager
}: TwoPhaseProgressTrackerProps) {
  const router = useRouter();
  const [orderStats, setOrderStats] = useState<OrderPlacementStats>({
    designRequested: false,
    designConfirmed: false,
    designCreated: false,
    playersAdded: false,
    addressSet: false,
    paymentComplete: false,
  });
  const [productionStats, setProductionStats] = useState<ProductionStats>({
    currentStage: null,
    orderStatus: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const supabase = getBrowserClient();

        // ========================================
        // PHASE 1: ORDER PLACEMENT PROGRESS
        // ========================================

        // 1. Check design request status
        const { data: designRequests } = await supabase
          .from('design_requests')
          .select('mockup_urls, status')
          .eq('team_id', teamId);

        // Step 1: Design requested (design request exists)
        const designRequested = designRequests && designRequests.length > 0;

        // Step 2: Design confirmed (mockups uploaded OR status indicates ready/approved)
        const designConfirmed = designRequests && designRequests.length > 0 &&
          designRequests.some((d: any) =>
            (d.mockup_urls && d.mockup_urls.length > 0) ||
            ['ready', 'design_ready', 'approved'].includes(d.status)
          );

        // 2. Check if players step is complete
        // Players step is complete when:
        // - At least one player exists, AND
        // - All players have confirmed their information (confirmed_by_player = true)
        const { data: allPlayers } = await supabase
          .from('player_info_submissions')
          .select('confirmed_by_player')
          .eq('team_id', teamId);

        const hasPlayers = allPlayers && allPlayers.length > 0;
        const allPlayersConfirmed = hasPlayers && allPlayers.every((p: any) => p.confirmed_by_player === true);

        const playersAdded = hasPlayers && allPlayersConfirmed;

        // 3. Check if shipping address set
        // Query shipping_addresses table for team addresses
        let addressSet = false;
        try {
          const { count: addressCount } = await supabase
            .from('shipping_addresses')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);

          addressSet = (addressCount || 0) > 0;
        } catch (err) {
          console.log('[TwoPhaseProgressTracker] Shipping address check failed:', err);
        }

        // 4. Check if payment complete
        const { data: orders } = await supabase
          .from('orders')
          .select('payment_status, status, current_stage')
          .eq('team_id', teamId);

        const paymentComplete = orders && orders.length > 0 &&
          orders.every((order: any) => order.payment_status === 'paid');

        setOrderStats({
          designRequested,
          designConfirmed,
          playersAdded,
          addressSet,
          paymentComplete,
        });

        // ========================================
        // PHASE 2: PRODUCTION PROGRESS
        // ========================================

        // Get current production stage from the most recent order
        if (orders && orders.length > 0 && paymentComplete) {
          const latestOrder = orders[0]; // Assuming first is most recent
          setProductionStats({
            currentStage: latestOrder.current_stage,
            orderStatus: latestOrder.status,
          });
        }

      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [teamId]);

  // Calculate Phase 1 completion percentage
  const calculatePhase1Completion = () => {
    const totalSteps = 4;
    let completedSteps = 0;

    if (orderStats.designRequested) completedSteps++;
    if (orderStats.designConfirmed) completedSteps++;
    if (orderStats.playersAdded) completedSteps++;
    if (orderStats.paymentComplete) completedSteps++;

    return Math.round((completedSteps / totalSteps) * 100);
  };

  // Calculate Phase 2 completion percentage
  const calculatePhase2Completion = () => {
    const stages = [
      'printing',
      'cutting',
      'sewing',
      'metal_detection',
      'ironing',
      'quality_control',
      'packaging',
      'shipping',
      'delivered'
    ];

    if (!productionStats.currentStage && !productionStats.orderStatus) {
      return 0;
    }

    // Map order status to stage
    let currentStageIndex = -1;

    if (productionStats.orderStatus === 'delivered') {
      currentStageIndex = 8; // Last stage
    } else if (productionStats.orderStatus === 'shipped') {
      currentStageIndex = 7; // Shipping stage
    } else if (productionStats.currentStage) {
      currentStageIndex = stages.indexOf(productionStats.currentStage);
    }

    if (currentStageIndex === -1) return 0;

    return Math.round(((currentStageIndex + 1) / stages.length) * 100);
  };

  const phase1Complete = orderStats.paymentComplete;
  const phase1Completion = calculatePhase1Completion();
  const phase2Completion = calculatePhase2Completion();

  // Helper component: Action Button
  const ActionButton = ({
    label,
    onClick,
    variant = 'primary',
  }: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }) => {
    const variantClasses = {
      primary: 'bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 border-blue-600/50 hover:shadow-lg hover:shadow-blue-600/30',
      secondary: 'bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 border-gray-600/50 hover:shadow-lg hover:shadow-gray-600/30'
    }[variant];

    return (
      <button
        onClick={onClick}
        className={`relative w-full px-3 py-2 text-white rounded-lg text-xs font-medium overflow-hidden border transition-all ${variantClasses}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
        <span className="relative">{label}</span>
      </button>
    );
  };

  // Helper component: Step Card
  const StepCard = ({
    label,
    stepNumber,
    isComplete,
    isActive,
    isLocked,
    onActionClick,
    actionLabel,
  }: {
    label: string;
    stepNumber: number;
    isComplete: boolean;
    isActive: boolean;
    isLocked: boolean;
    onActionClick?: () => void;
    actionLabel?: string;
  }) => {
    const bgClass = isComplete
      ? 'bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 border-green-500/50'
      : isLocked
      ? 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700 opacity-60'
      : 'bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border-gray-700';

    const badgeClass = isComplete
      ? 'bg-green-500 border-green-400'
      : isLocked
      ? 'bg-black/40 border-gray-600'
      : 'bg-black/40 border-gray-600';

    const textClass = isComplete
      ? 'text-green-400'
      : isLocked
      ? 'text-gray-500'
      : 'text-gray-400';

    return (
      <div className="flex flex-col gap-2">
        <div className={`relative rounded-lg p-3 py-8 border overflow-hidden group/step transition-all ${bgClass}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex flex-col items-center gap-2 relative">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${badgeClass}`}>
              <span className={`text-base font-bold ${isComplete ? 'text-white' : 'text-gray-400'}`}>
                {isComplete ? '✓' : stepNumber}
              </span>
            </div>
            <span className={`text-xs font-medium text-center ${textClass}`}>
              {label}
            </span>
          </div>
        </div>
        {isActive && !isComplete && onActionClick && actionLabel && (
          <ActionButton label={actionLabel} onClick={onActionClick} variant="primary" />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 animate-pulse">
          <div className="h-8 bg-gray-700/50 rounded mb-4"></div>
          <div className="h-4 bg-gray-700/50 rounded mb-6"></div>
          <div className="grid grid-cols-4 gap-2">
            <div className="h-20 bg-gray-700/50 rounded"></div>
            <div className="h-20 bg-gray-700/50 rounded"></div>
            <div className="h-20 bg-gray-700/50 rounded"></div>
            <div className="h-20 bg-gray-700/50 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ========================================
          PHASE 1: ORDER PLACEMENT PROGRESS
          ======================================== */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <div>
            <h2 className="text-2xl font-bold text-white">Progreso del Pedido</h2>
            <p className="text-sm text-gray-400 mt-1">Pasos para completar tu orden</p>
          </div>
          <div className="text-xl font-bold text-white">{phase1Completion}%</div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 relative">
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden border border-gray-700">
            <div
              className="h-full transition-all duration-700 ease-out rounded-full shadow-lg bg-blue-600"
              style={{ width: `${phase1Completion}%` }}
            />
          </div>
        </div>

        {/* Step Grid - 4 columns */}
        <div className="grid grid-cols-4 gap-2 relative">
          {/* Step 1: Pedir Diseño */}
          <StepCard
            label="Pedir Diseño"
            stepNumber={1}
            isComplete={orderStats.designRequested}
            isActive={!orderStats.designRequested && isManager === true}
            isLocked={false}
            onActionClick={() => router.push(`/mi-equipo/${teamSlug}/design-request/new`)}
            actionLabel="Crear"
          />

          {/* Step 2: Diseño Confirmado */}
          <StepCard
            label="Diseño Confirmado"
            stepNumber={2}
            isComplete={orderStats.designConfirmed}
            isActive={!orderStats.designConfirmed && orderStats.designRequested && isManager === true}
            isLocked={!orderStats.designRequested}
            onActionClick={() => router.push(`/mi-equipo/${teamSlug}/design-requests`)}
            actionLabel="Ver estado"
          />

          {/* Step 3: Info de Jugadores */}
          <StepCard
            label="Info de Jugadores"
            stepNumber={3}
            isComplete={orderStats.playersAdded}
            isActive={!orderStats.playersAdded && orderStats.designConfirmed && isManager === true}
            isLocked={!orderStats.designConfirmed}
            onActionClick={onShareDesign || (() => router.push(`/mi-equipo/${teamSlug}/players`))}
            actionLabel="Agregar"
          />

          {/* Step 4: Pago */}
          <StepCard
            label="Pago"
            stepNumber={4}
            isComplete={orderStats.paymentComplete}
            isActive={!orderStats.paymentComplete && orderStats.designConfirmed && orderStats.playersAdded && isManager === true}
            isLocked={!orderStats.playersAdded}
            onActionClick={() => router.push(`/mi-equipo/${teamSlug}/payments`)}
            actionLabel="Gestionar"
          />
        </div>
      </div>

      {/* ========================================
          PHASE 2: PRODUCTION PROGRESS
          Only show after payment is complete
          ======================================== */}
      {phase1Complete && (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative">
          <div>
            <h2 className="text-2xl font-bold text-white">Progreso de Producción</h2>
            <p className="text-sm text-gray-400 mt-1">
              {phase1Complete ? 'Deserve está creando tus uniformes' : 'Se activa después del pago'}
            </p>
          </div>
          <div className="text-xl font-bold text-white">{phase2Completion}%</div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 relative">
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden border border-gray-700">
            <div
              className="h-full transition-all duration-700 ease-out rounded-full shadow-lg bg-purple-600"
              style={{ width: `${phase2Completion}%` }}
            />
          </div>
        </div>

        {/* Step Grid - 3x3 grid for 9 steps */}
        <div className="grid grid-cols-3 gap-2 relative">
          {/* Step 1: Impresión */}
          <StepCard
            label="Impresión"
            stepNumber={1}
            isComplete={
              productionStats.currentStage &&
              ['cutting', 'sewing', 'metal_detection', 'ironing', 'quality_control', 'packaging', 'shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'printing'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 2: Corte */}
          <StepCard
            label="Corte"
            stepNumber={2}
            isComplete={
              productionStats.currentStage &&
              ['sewing', 'metal_detection', 'ironing', 'quality_control', 'packaging', 'shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'cutting'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 3: Costura */}
          <StepCard
            label="Costura"
            stepNumber={3}
            isComplete={
              productionStats.currentStage &&
              ['metal_detection', 'ironing', 'quality_control', 'packaging', 'shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'sewing'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 4: Detección de Metal */}
          <StepCard
            label="Detección"
            stepNumber={4}
            isComplete={
              productionStats.currentStage &&
              ['ironing', 'quality_control', 'packaging', 'shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'metal_detection'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 5: Planchado */}
          <StepCard
            label="Planchado"
            stepNumber={5}
            isComplete={
              productionStats.currentStage &&
              ['quality_control', 'packaging', 'shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'ironing'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 6: Control de Calidad */}
          <StepCard
            label="Calidad"
            stepNumber={6}
            isComplete={
              productionStats.currentStage &&
              ['packaging', 'shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'quality_control'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 7: Empaque */}
          <StepCard
            label="Empaque"
            stepNumber={7}
            isComplete={
              productionStats.currentStage &&
              ['shipping', 'delivered'].includes(productionStats.currentStage) ||
              productionStats.orderStatus === 'shipped' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={productionStats.currentStage === 'packaging'}
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 8: Envío */}
          <StepCard
            label="Envío"
            stepNumber={8}
            isComplete={
              productionStats.currentStage === 'delivered' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={
              productionStats.currentStage === 'shipping' ||
              productionStats.orderStatus === 'shipped'
            }
            isLocked={!phase1Complete}
            actionLabel=""
          />

          {/* Step 9: Entregado */}
          <StepCard
            label="Entregado"
            stepNumber={9}
            isComplete={
              productionStats.currentStage === 'delivered' ||
              productionStats.orderStatus === 'delivered'
            }
            isActive={false}
            isLocked={!phase1Complete}
            actionLabel=""
          />
        </div>
      </div>
      )}
    </div>
  );
});

export default TwoPhaseProgressTracker;
