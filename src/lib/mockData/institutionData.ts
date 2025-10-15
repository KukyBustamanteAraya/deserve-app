/**
 * Mock data for Institution Dashboard
 * This will be replaced with real database queries after UI approval
 */

export interface InstitutionTeam {
  id: string;
  name: string;
  slug: string;
  members: number;
  status: 'approved' | 'pending' | 'ready';
  coach: string;
  designStatus: 'approved' | 'pending' | 'ready' | 'none';
}

export interface InstitutionProgram {
  sport: string;
  sportSlug: string;
  emoji: string;
  teams: InstitutionTeam[];
}

export interface InstitutionActivity {
  id: string;
  action: string;
  timestamp: string;
  teamSlug: string;
  type: 'order' | 'approval' | 'roster' | 'payment';
}

export interface InstitutionOrder {
  id: string;
  orderNumber: string;
  teamName: string;
  teamSlug: string;
  sport: string;
  items: number;
  totalCents: number;
  status: 'paid' | 'pending' | 'shipped' | 'delivered';
  date: string;
  coach?: string;
  paidCents?: number;
}

export interface OrderLineItem {
  id: string;
  product_type: 'jersey' | 'shorts' | 'socks' | 'warmup';
  product_name: string;
  quantity: number;
  price_per_item_cents: number;
  total_cents: number;
}

export interface OrderSizeBreakdown {
  product_type: string;
  sizes: {
    size: string;
    male_count: number;
    female_count: number;
    total: number;
    male_numbers?: string[];
    female_numbers?: string[];
  }[];
}

export interface OrderPlayer {
  id: string;
  player_name: string;
  jersey_number: string;
  size: string;
  gender: 'M' | 'F';
  payment_status: 'paid' | 'pending';
  position?: string;
}

export interface OrderTimeline {
  id: string;
  event: string;
  timestamp: string;
  description?: string;
  user?: string;
}

export interface DetailedOrder extends InstitutionOrder {
  line_items: OrderLineItem[];
  size_breakdown: OrderSizeBreakdown[];
  players: OrderPlayer[];
  timeline: OrderTimeline[];
  payment_breakdown: {
    total_cents: number;
    paid_cents: number;
    pending_cents: number;
    payment_method?: string;
  };
}

export interface InstitutionBudget {
  sport: string;
  budgetTotal: number;
  budgetUsed: number;
  percentage: number;
}

export interface InstitutionStats {
  totalTeams: number;
  totalAthletes: number;
  totalSports: number;
  pendingApprovals: number;
  incompleteOrders: number;
  paymentCollected: number;
  paymentTotal: number;
  activeOrders: number;
}

export interface MockInstitutionData {
  id: string;
  name: string;
  stats: InstitutionStats;
  programs: InstitutionProgram[];
  recentActivity: InstitutionActivity[];
  orders: InstitutionOrder[];
  budgets: InstitutionBudget[];
}

export const mockInstitution: MockInstitutionData = {
  id: 'inst-1',
  name: 'Lincoln High Athletics',
  stats: {
    totalTeams: 15,
    totalAthletes: 342,
    totalSports: 8,
    pendingApprovals: 5,
    incompleteOrders: 3,
    paymentCollected: 3200000,
    paymentTotal: 4500000,
    activeOrders: 23,
  },
  programs: [
    {
      sport: 'Fútbol',
      sportSlug: 'futbol',
      emoji: '⚽',
      teams: [
        {
          id: 'team-1',
          name: 'Varsity Masculino',
          slug: 'varsity-men-soccer',
          members: 25,
          status: 'approved',
          coach: 'Juan García',
          designStatus: 'approved',
        },
        {
          id: 'team-2',
          name: 'Varsity Femenino',
          slug: 'varsity-women-soccer',
          members: 22,
          status: 'pending',
          coach: 'María López',
          designStatus: 'pending',
        },
        {
          id: 'team-3',
          name: 'JV Masculino',
          slug: 'jv-men-soccer',
          members: 18,
          status: 'approved',
          coach: 'Carlos Ruiz',
          designStatus: 'approved',
        },
        {
          id: 'team-4',
          name: 'Sub-17',
          slug: 'u17-soccer',
          members: 20,
          status: 'pending',
          coach: 'Pedro Sánchez',
          designStatus: 'pending',
        },
        {
          id: 'team-5',
          name: 'Sub-15',
          slug: 'u15-soccer',
          members: 22,
          status: 'ready',
          coach: 'Luis Fernández',
          designStatus: 'ready',
        },
      ],
    },
    {
      sport: 'Básquetbol',
      sportSlug: 'basquetbol',
      emoji: '🏀',
      teams: [
        {
          id: 'team-6',
          name: 'Varsity Masculino',
          slug: 'varsity-men-basketball',
          members: 15,
          status: 'approved',
          coach: 'Miguel Díaz',
          designStatus: 'approved',
        },
        {
          id: 'team-7',
          name: 'Varsity Femenino',
          slug: 'varsity-women-basketball',
          members: 14,
          status: 'pending',
          coach: 'Ana Martínez',
          designStatus: 'pending',
        },
        {
          id: 'team-8',
          name: 'JV Masculino',
          slug: 'jv-men-basketball',
          members: 13,
          status: 'approved',
          coach: 'Roberto Silva',
          designStatus: 'approved',
        },
      ],
    },
    {
      sport: 'Vóleibol',
      sportSlug: 'voleibol',
      emoji: '🏐',
      teams: [
        {
          id: 'team-9',
          name: 'Varsity Femenino',
          slug: 'varsity-women-volleyball',
          members: 16,
          status: 'approved',
          coach: 'Laura Gómez',
          designStatus: 'approved',
        },
        {
          id: 'team-10',
          name: 'JV Femenino',
          slug: 'jv-women-volleyball',
          members: 14,
          status: 'ready',
          coach: 'Carmen Pérez',
          designStatus: 'ready',
        },
        {
          id: 'team-11',
          name: 'Varsity Masculino',
          slug: 'varsity-men-volleyball',
          members: 15,
          status: 'approved',
          coach: 'Diego Torres',
          designStatus: 'approved',
        },
        {
          id: 'team-12',
          name: 'JV Masculino',
          slug: 'jv-men-volleyball',
          members: 13,
          status: 'pending',
          coach: 'Fernando Ramos',
          designStatus: 'none',
        },
      ],
    },
    {
      sport: 'Rugby',
      sportSlug: 'rugby',
      emoji: '🏉',
      teams: [
        {
          id: 'team-13',
          name: 'Varsity Masculino',
          slug: 'varsity-men-rugby',
          members: 28,
          status: 'approved',
          coach: 'Andrés Morales',
          designStatus: 'approved',
        },
        {
          id: 'team-14',
          name: 'Sub-18',
          slug: 'u18-rugby',
          members: 24,
          status: 'pending',
          coach: 'Javier Herrera',
          designStatus: 'none',
        },
      ],
    },
    {
      sport: 'Atletismo',
      sportSlug: 'atletismo',
      emoji: '🏃',
      teams: [
        {
          id: 'team-15',
          name: 'Equipo Mixto',
          slug: 'mixed-track',
          members: 35,
          status: 'approved',
          coach: 'Gabriela Castro',
          designStatus: 'approved',
        },
      ],
    },
  ],
  recentActivity: [
    {
      id: 'act-1',
      action: 'Varsity Fútbol ordenó 25 camisetas',
      timestamp: 'hace 2h',
      teamSlug: 'varsity-men-soccer',
      type: 'order',
    },
    {
      id: 'act-2',
      action: 'Básquetbol Femenino - diseño necesita aprobación',
      timestamp: 'hace 5h',
      teamSlug: 'varsity-women-basketball',
      type: 'approval',
    },
    {
      id: 'act-3',
      action: 'JV Vóleibol completó lista de jugadores',
      timestamp: 'hace 1d',
      teamSlug: 'jv-women-volleyball',
      type: 'roster',
    },
    {
      id: 'act-4',
      action: 'Varsity Rugby - pago completado',
      timestamp: 'hace 2d',
      teamSlug: 'varsity-men-rugby',
      type: 'payment',
    },
    {
      id: 'act-5',
      action: 'Sub-17 Fútbol - diseño listo para votación',
      timestamp: 'hace 3d',
      teamSlug: 'u17-soccer',
      type: 'approval',
    },
  ],
  orders: [
    {
      id: 'order-1',
      orderNumber: '#1234',
      teamName: 'Varsity Fútbol Masculino',
      teamSlug: 'varsity-men-soccer',
      sport: 'Fútbol',
      coach: 'Juan García',
      items: 25,
      totalCents: 325000,
      paidCents: 325000,
      status: 'paid',
      date: '2025-10-12',
    },
    {
      id: 'order-2',
      orderNumber: '#1234',
      teamName: 'JV Básquetbol',
      teamSlug: 'jv-men-basketball',
      sport: 'Básquetbol',
      coach: 'Roberto Silva',
      items: 18,
      totalCents: 234000,
      paidCents: 234000,
      status: 'paid',
      date: '2025-10-12',
    },
    {
      id: 'order-3',
      orderNumber: '#1234',
      teamName: 'Varsity Vóleibol Femenino',
      teamSlug: 'varsity-women-volleyball',
      sport: 'Vóleibol',
      coach: 'Laura Gómez',
      items: 176,
      totalCents: 1364000,
      paidCents: 1364000,
      status: 'paid',
      date: '2025-10-12',
    },
    {
      id: 'order-4',
      orderNumber: '#1237',
      teamName: 'Varsity Rugby',
      teamSlug: 'varsity-men-rugby',
      sport: 'Rugby',
      coach: 'Andrés Morales',
      items: 28,
      totalCents: 420000,
      paidCents: 420000,
      status: 'delivered',
      date: '2025-10-05',
    },
    {
      id: 'order-5',
      orderNumber: '#1220',
      teamName: 'Varsity Básquetbol Masculino',
      teamSlug: 'varsity-men-basketball',
      sport: 'Básquetbol',
      coach: 'Miguel Díaz',
      items: 15,
      totalCents: 195000,
      paidCents: 195000,
      status: 'delivered',
      date: '2025-09-28',
    },
    {
      id: 'order-6',
      orderNumber: '#1215',
      teamName: 'JV Fútbol Masculino',
      teamSlug: 'jv-men-soccer',
      sport: 'Fútbol',
      coach: 'Carlos Ruiz',
      items: 18,
      totalCents: 234000,
      paidCents: 234000,
      status: 'delivered',
      date: '2025-09-22',
    },
    {
      id: 'order-7',
      orderNumber: '#1210',
      teamName: 'Atletismo Mixto',
      teamSlug: 'mixed-track',
      sport: 'Atletismo',
      coach: 'Gabriela Castro',
      items: 35,
      totalCents: 455000,
      paidCents: 455000,
      status: 'delivered',
      date: '2025-09-15',
    },
    {
      id: 'order-8',
      orderNumber: '#1240',
      teamName: 'Varsity Rugby',
      teamSlug: 'varsity-men-rugby',
      sport: 'Rugby',
      coach: 'Andrés Morales',
      items: 28,
      totalCents: 420000,
      paidCents: 290000,
      status: 'pending',
      date: '2025-10-13',
    },
    {
      id: 'order-9',
      orderNumber: '#1240',
      teamName: 'Varsity Básquetbol Femenino',
      teamSlug: 'varsity-women-basketball',
      sport: 'Básquetbol',
      coach: 'Ana Martínez',
      items: 30,
      totalCents: 390000,
      paidCents: 100000,
      status: 'pending',
      date: '2025-10-13',
    },
  ],
  budgets: [
    {
      sport: 'Fútbol',
      budgetTotal: 20000,
      budgetUsed: 15000,
      percentage: 75,
    },
    {
      sport: 'Básquetbol',
      budgetTotal: 18000,
      budgetUsed: 12000,
      percentage: 67,
    },
    {
      sport: 'Vóleibol',
      budgetTotal: 12000,
      budgetUsed: 8000,
      percentage: 67,
    },
    {
      sport: 'Rugby',
      budgetTotal: 15000,
      budgetUsed: 10000,
      percentage: 67,
    },
  ],
};

// Detailed order data for Orders Manager
export const mockDetailedOrders: Record<string, DetailedOrder> = {
  'order-1': {
    ...mockInstitution.orders[0],
    line_items: [
      {
        id: 'item-1',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 25,
        price_per_item_cents: 13000,
        total_cents: 325000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'XS', male_count: 2, female_count: 0, total: 2, male_numbers: ['17', '19'], female_numbers: [] },
          { size: 'S', male_count: 5, female_count: 0, total: 5, male_numbers: ['7', '11', '14', '18', '21'], female_numbers: [] },
          { size: 'M', male_count: 8, female_count: 0, total: 8, male_numbers: ['3', '5', '8', '10', '13', '16', '20', '23'], female_numbers: [] },
          { size: 'L', male_count: 6, female_count: 0, total: 6, male_numbers: ['2', '4', '6', '9', '12', '15'], female_numbers: [] },
          { size: 'XL', male_count: 4, female_count: 0, total: 4, male_numbers: ['1', '22', '24', '25'], female_numbers: [] },
        ],
      },
    ],
    players: [
      { id: 'p1', player_name: 'Carlos Muñoz', jersey_number: '10', size: 'M', gender: 'M', payment_status: 'paid', position: 'Delantero' },
      { id: 'p2', player_name: 'Diego Fernández', jersey_number: '7', size: 'M', gender: 'M', payment_status: 'paid', position: 'Mediocampista' },
      { id: 'p3', player_name: 'Javier Rojas', jersey_number: '9', size: 'L', gender: 'M', payment_status: 'paid', position: 'Delantero' },
      { id: 'p4', player_name: 'Miguel Torres', jersey_number: '5', size: 'L', gender: 'M', payment_status: 'paid', position: 'Defensa' },
      { id: 'p5', player_name: 'Roberto Silva', jersey_number: '3', size: 'M', gender: 'M', payment_status: 'paid', position: 'Defensa' },
    ],
    timeline: [
      { id: 't1', event: 'Orden Creada', timestamp: '2025-10-10 14:30', description: 'Orden iniciada por Juan García' },
      { id: 't2', event: 'Diseño Aprobado', timestamp: '2025-10-11 09:15', description: 'Diseño aprobado por el equipo' },
      { id: 't3', event: 'Pago Completado', timestamp: '2025-10-12 16:45', description: '$325,000 recibido' },
    ],
    payment_breakdown: {
      total_cents: 325000,
      paid_cents: 325000,
      pending_cents: 0,
      payment_method: 'Mercado Pago',
    },
  },
  'order-2': {
    ...mockInstitution.orders[1],
    line_items: [
      {
        id: 'item-2',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 13,
        price_per_item_cents: 13000,
        total_cents: 169000,
      },
      {
        id: 'item-3',
        product_type: 'shorts',
        product_name: 'Short de Juego',
        quantity: 13,
        price_per_item_cents: 5000,
        total_cents: 65000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'S', male_count: 3, female_count: 0, total: 3, male_numbers: ['11', '15', '21'], female_numbers: [] },
          { size: 'M', male_count: 5, female_count: 0, total: 5, male_numbers: ['4', '7', '23', '33', '44'], female_numbers: [] },
          { size: 'L', male_count: 4, female_count: 0, total: 4, male_numbers: ['10', '22', '32', '55'], female_numbers: [] },
          { size: 'XL', male_count: 1, female_count: 0, total: 1, male_numbers: ['34'], female_numbers: [] },
        ],
      },
      {
        product_type: 'Short de Juego',
        sizes: [
          { size: 'S', male_count: 3, female_count: 0, total: 3, male_numbers: ['11', '15', '21'], female_numbers: [] },
          { size: 'M', male_count: 5, female_count: 0, total: 5, male_numbers: ['4', '7', '23', '33', '44'], female_numbers: [] },
          { size: 'L', male_count: 4, female_count: 0, total: 4, male_numbers: ['10', '22', '32', '55'], female_numbers: [] },
          { size: 'XL', male_count: 1, female_count: 0, total: 1, male_numbers: ['34'], female_numbers: [] },
        ],
      },
    ],
    players: [
      { id: 'p6', player_name: 'Luis Martínez', jersey_number: '23', size: 'M', gender: 'M', payment_status: 'paid', position: 'Alero' },
      { id: 'p7', player_name: 'Pablo Castro', jersey_number: '11', size: 'L', gender: 'M', payment_status: 'paid', position: 'Base' },
      { id: 'p8', player_name: 'Andrés Gómez', jersey_number: '15', size: 'M', gender: 'M', payment_status: 'pending', position: 'Escolta' },
      { id: 'p9', player_name: 'Fernando López', jersey_number: '32', size: 'L', gender: 'M', payment_status: 'pending', position: 'Pívot' },
      { id: 'p10', player_name: 'Sergio Ramírez', jersey_number: '4', size: 'M', gender: 'M', payment_status: 'pending', position: 'Alero' },
    ],
    timeline: [
      { id: 't4', event: 'Orden Creada', timestamp: '2025-10-09 11:20', description: 'Orden iniciada por Roberto Silva' },
      { id: 't5', event: 'Diseño Aprobado', timestamp: '2025-10-10 15:30', description: 'Diseño aprobado por el equipo' },
      { id: 't6', event: 'Pago Parcial', timestamp: '2025-10-11 10:00', description: '$180,000 recibido (77%)' },
    ],
    payment_breakdown: {
      total_cents: 234000,
      paid_cents: 180000,
      pending_cents: 54000,
      payment_method: 'Mercado Pago',
    },
  },
  'order-4': {
    ...mockInstitution.orders[3],
    line_items: [
      {
        id: 'item-4',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 28,
        price_per_item_cents: 15000,
        total_cents: 420000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'S', male_count: 2, female_count: 0, total: 2, male_numbers: ['9', '14'], female_numbers: [] },
          { size: 'M', male_count: 8, female_count: 0, total: 8, male_numbers: ['1', '6', '7', '10', '11', '13', '15', '20'], female_numbers: [] },
          { size: 'L', male_count: 10, female_count: 0, total: 10, male_numbers: ['2', '3', '4', '5', '8', '12', '16', '17', '19', '21'], female_numbers: [] },
          { size: 'XL', male_count: 6, female_count: 0, total: 6, male_numbers: ['18', '22', '23', '24', '25', '26'], female_numbers: [] },
          { size: 'XXL', male_count: 2, female_count: 0, total: 2, male_numbers: ['27', '28'], female_numbers: [] },
        ],
      },
    ],
    players: [
      { id: 'p11', player_name: 'Marco Santana', jersey_number: '8', size: 'L', gender: 'M', payment_status: 'paid', position: 'Centro' },
      { id: 'p12', player_name: 'Eduardo Rivas', jersey_number: '12', size: 'XL', gender: 'M', payment_status: 'paid', position: 'Pilar' },
      { id: 'p13', player_name: 'Gabriel Núñez', jersey_number: '1', size: 'M', gender: 'M', payment_status: 'paid', position: 'Apertura' },
    ],
    timeline: [
      { id: 't7', event: 'Orden Creada', timestamp: '2025-10-01 09:00', description: 'Orden iniciada por Andrés Morales' },
      { id: 't8', event: 'Diseño Aprobado', timestamp: '2025-10-02 14:20', description: 'Diseño aprobado por el equipo' },
      { id: 't9', event: 'Pago Completado', timestamp: '2025-10-03 11:30', description: '$420,000 recibido' },
      { id: 't10', event: 'Enviado', timestamp: '2025-10-04 08:15', description: 'Orden enviada a fabricación' },
      { id: 't11', event: 'Entregado', timestamp: '2025-10-05 16:00', description: 'Orden entregada al equipo' },
    ],
    payment_breakdown: {
      total_cents: 420000,
      paid_cents: 420000,
      pending_cents: 0,
      payment_method: 'Mercado Pago',
    },
  },
  'order-5': {
    ...mockInstitution.orders[4],
    line_items: [
      {
        id: 'item-5',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 15,
        price_per_item_cents: 13000,
        total_cents: 195000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'S', male_count: 3, female_count: 0, total: 3, male_numbers: ['3', '12', '14'], female_numbers: [] },
          { size: 'M', male_count: 6, female_count: 0, total: 6, male_numbers: ['5', '10', '11', '20', '24', '33'], female_numbers: [] },
          { size: 'L', male_count: 4, female_count: 0, total: 4, male_numbers: ['7', '15', '21', '23'], female_numbers: [] },
          { size: 'XL', male_count: 2, female_count: 0, total: 2, male_numbers: ['32', '44'], female_numbers: [] },
        ],
      },
    ],
    players: [
      { id: 'p14', player_name: 'Ricardo Vargas', jersey_number: '24', size: 'M', gender: 'M', payment_status: 'paid', position: 'Alero' },
      { id: 'p15', player_name: 'Tomás Vega', jersey_number: '10', size: 'L', gender: 'M', payment_status: 'paid', position: 'Base' },
    ],
    timeline: [
      { id: 't12', event: 'Orden Creada', timestamp: '2025-09-24 10:00' },
      { id: 't13', event: 'Pago Completado', timestamp: '2025-09-25 15:00', description: '$195,000 recibido' },
      { id: 't14', event: 'Entregado', timestamp: '2025-09-28 14:00', description: 'Orden entregada' },
    ],
    payment_breakdown: {
      total_cents: 195000,
      paid_cents: 195000,
      pending_cents: 0,
      payment_method: 'Transferencia',
    },
  },
  'order-3': {
    ...mockInstitution.orders[2],
    line_items: [
      {
        id: 'item-6',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 22,
        price_per_item_cents: 13000,
        total_cents: 286000,
      },
      {
        id: 'item-7',
        product_type: 'shorts',
        product_name: 'Short de Juego',
        quantity: 22,
        price_per_item_cents: 5000,
        total_cents: 110000,
      },
      {
        id: 'item-8',
        product_type: 'socks',
        product_name: 'Medias de Juego',
        quantity: 44,
        price_per_item_cents: 2000,
        total_cents: 88000,
      },
      {
        id: 'item-9',
        product_type: 'warmup',
        product_name: 'Chaqueta de Calentamiento',
        quantity: 22,
        price_per_item_cents: 18000,
        total_cents: 396000,
      },
      {
        id: 'item-10',
        product_type: 'warmup',
        product_name: 'Pantalón de Calentamiento',
        quantity: 22,
        price_per_item_cents: 15000,
        total_cents: 330000,
      },
      {
        id: 'item-11',
        product_type: 'socks',
        product_name: 'Rodilleras',
        quantity: 44,
        price_per_item_cents: 3500,
        total_cents: 154000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 3, total: 3, male_numbers: [], female_numbers: ['12', '18', '22'] },
          { size: 'S', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['10', '11', '14', '15', '19', '21'] },
          { size: 'M', male_count: 0, female_count: 8, total: 8, male_numbers: [], female_numbers: ['5', '7', '8', '9', '13', '16', '17', '20'] },
          { size: 'L', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['1', '2', '3', '6'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['4'] },
        ],
      },
      {
        product_type: 'Short de Juego',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 3, total: 3, male_numbers: [], female_numbers: ['12', '18', '22'] },
          { size: 'S', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['10', '11', '14', '15', '19', '21'] },
          { size: 'M', male_count: 0, female_count: 8, total: 8, male_numbers: [], female_numbers: ['5', '7', '8', '9', '13', '16', '17', '20'] },
          { size: 'L', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['1', '2', '3', '6'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['4'] },
        ],
      },
      {
        product_type: 'Medias de Juego',
        sizes: [
          { size: 'S', male_count: 0, female_count: 10, total: 10, male_numbers: [], female_numbers: ['10', '11', '12', '14', '15', '18', '19', '21', '22'] },
          { size: 'M', male_count: 0, female_count: 20, total: 20, male_numbers: [], female_numbers: ['5', '7', '8', '9', '13', '16', '17', '20'] },
          { size: 'L', male_count: 0, female_count: 14, total: 14, male_numbers: [], female_numbers: ['1', '2', '3', '4', '6'] },
        ],
      },
      {
        product_type: 'Chaqueta de Calentamiento',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 3, total: 3, male_numbers: [], female_numbers: ['12', '18', '22'] },
          { size: 'S', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['10', '11', '14', '15', '19', '21'] },
          { size: 'M', male_count: 0, female_count: 8, total: 8, male_numbers: [], female_numbers: ['5', '7', '8', '9', '13', '16', '17', '20'] },
          { size: 'L', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['1', '2', '3', '6'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['4'] },
        ],
      },
      {
        product_type: 'Pantalón de Calentamiento',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 3, total: 3, male_numbers: [], female_numbers: ['12', '18', '22'] },
          { size: 'S', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['10', '11', '14', '15', '19', '21'] },
          { size: 'M', male_count: 0, female_count: 8, total: 8, male_numbers: [], female_numbers: ['5', '7', '8', '9', '13', '16', '17', '20'] },
          { size: 'L', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['1', '2', '3', '6'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['4'] },
        ],
      },
      {
        product_type: 'Rodilleras',
        sizes: [
          { size: 'S', male_count: 0, female_count: 10, total: 10, male_numbers: [], female_numbers: ['10', '11', '12', '14', '15', '18', '19', '21', '22'] },
          { size: 'M', male_count: 0, female_count: 20, total: 20, male_numbers: [], female_numbers: ['5', '7', '8', '9', '13', '16', '17', '20'] },
          { size: 'L', male_count: 0, female_count: 14, total: 14, male_numbers: [], female_numbers: ['1', '2', '3', '4', '6'] },
        ],
      },
    ],
    players: [
      { id: 'p16', player_name: 'Ana Martínez', jersey_number: '7', size: 'M', gender: 'F', payment_status: 'paid', position: 'Colocadora' },
      { id: 'p17', player_name: 'Sofía Ramírez', jersey_number: '10', size: 'S', gender: 'F', payment_status: 'paid', position: 'Opuesta' },
      { id: 'p18', player_name: 'Valentina Torres', jersey_number: '5', size: 'M', gender: 'F', payment_status: 'paid', position: 'Central' },
    ],
    timeline: [
      { id: 't15', event: 'Orden Creada', timestamp: '2025-10-06 09:00', description: 'Orden iniciada por Laura Gómez' },
      { id: 't16', event: 'Pago Completado', timestamp: '2025-10-07 14:00', description: '$1,364,000 recibido' },
      { id: 't17', event: 'Enviado', timestamp: '2025-10-08 10:30', description: 'Orden enviada' },
    ],
    payment_breakdown: {
      total_cents: 1364000,
      paid_cents: 1364000,
      pending_cents: 0,
      payment_method: 'Mercado Pago',
    },
  },
  'order-8': {
    ...mockInstitution.orders[7],
    line_items: [
      {
        id: 'item-12',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 28,
        price_per_item_cents: 15000,
        total_cents: 420000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'S', male_count: 3, female_count: 0, total: 3, male_numbers: ['9', '12', '14'], female_numbers: [] },
          { size: 'M', male_count: 8, female_count: 0, total: 8, male_numbers: ['1', '5', '7', '10', '11', '13', '15', '20'], female_numbers: [] },
          { size: 'L', male_count: 10, female_count: 0, total: 10, male_numbers: ['2', '3', '4', '6', '8', '16', '17', '19', '21', '23'], female_numbers: [] },
          { size: 'XL', male_count: 5, female_count: 0, total: 5, male_numbers: ['18', '22', '24', '25', '26'], female_numbers: [] },
          { size: 'XXL', male_count: 2, female_count: 0, total: 2, male_numbers: ['27', '28'], female_numbers: [] },
        ],
      },
    ],
    players: [
      { id: 'p19', player_name: 'Marco Santana', jersey_number: '8', size: 'L', gender: 'M', payment_status: 'paid', position: 'Centro' },
      { id: 'p20', player_name: 'Eduardo Rivas', jersey_number: '7', size: 'M', gender: 'M', payment_status: 'pending', position: 'Pilar' },
      { id: 'p21', player_name: 'Gabriel Núñez', jersey_number: '1', size: 'M', gender: 'M', payment_status: 'pending', position: 'Apertura' },
      { id: 'p22', player_name: 'Sebastián Campos', jersey_number: '15', size: 'XL', gender: 'M', payment_status: 'paid', position: 'Ala' },
      { id: 'p23', player_name: 'Martín Lagos', jersey_number: '10', size: 'M', gender: 'M', payment_status: 'pending', position: 'Medio' },
    ],
    timeline: [
      { id: 't18', event: 'Orden Creada', timestamp: '2025-10-10 11:30', description: 'Orden iniciada por Andrés Morales' },
      { id: 't19', event: 'Diseño Aprobado', timestamp: '2025-10-11 15:00', description: 'Diseño aprobado por el equipo' },
      { id: 't20', event: 'Pago Parcial', timestamp: '2025-10-12 10:30', description: '$290,000 recibido (69%)' },
    ],
    payment_breakdown: {
      total_cents: 420000,
      paid_cents: 290000,
      pending_cents: 130000,
      payment_method: 'Mercado Pago',
    },
  },
  'order-9': {
    ...mockInstitution.orders[8],
    line_items: [
      {
        id: 'item-13',
        product_type: 'jersey',
        product_name: 'Camiseta Titular',
        quantity: 15,
        price_per_item_cents: 13000,
        total_cents: 195000,
      },
      {
        id: 'item-14',
        product_type: 'shorts',
        product_name: 'Short de Juego',
        quantity: 15,
        price_per_item_cents: 5000,
        total_cents: 75000,
      },
      {
        id: 'item-15',
        product_type: 'warmup',
        product_name: 'Chaqueta de Calentamiento',
        quantity: 15,
        price_per_item_cents: 8000,
        total_cents: 120000,
      },
    ],
    size_breakdown: [
      {
        product_type: 'Camiseta Titular',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 2, total: 2, male_numbers: [], female_numbers: ['11', '22'] },
          { size: 'S', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['3', '7', '14', '21'] },
          { size: 'M', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['4', '5', '10', '12', '15', '23'] },
          { size: 'L', male_count: 0, female_count: 2, total: 2, male_numbers: [], female_numbers: ['32', '44'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['33'] },
        ],
      },
      {
        product_type: 'Short de Juego',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 2, total: 2, male_numbers: [], female_numbers: ['11', '22'] },
          { size: 'S', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['3', '7', '14', '21'] },
          { size: 'M', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['4', '5', '10', '12', '15', '23'] },
          { size: 'L', male_count: 0, female_count: 2, total: 2, male_numbers: [], female_numbers: ['32', '44'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['33'] },
        ],
      },
      {
        product_type: 'Chaqueta de Calentamiento',
        sizes: [
          { size: 'XS', male_count: 0, female_count: 2, total: 2, male_numbers: [], female_numbers: ['11', '22'] },
          { size: 'S', male_count: 0, female_count: 4, total: 4, male_numbers: [], female_numbers: ['3', '7', '14', '21'] },
          { size: 'M', male_count: 0, female_count: 6, total: 6, male_numbers: [], female_numbers: ['4', '5', '10', '12', '15', '23'] },
          { size: 'L', male_count: 0, female_count: 2, total: 2, male_numbers: [], female_numbers: ['32', '44'] },
          { size: 'XL', male_count: 0, female_count: 1, total: 1, male_numbers: [], female_numbers: ['33'] },
        ],
      },
    ],
    players: [
      { id: 'p24', player_name: 'Carolina Méndez', jersey_number: '10', size: 'M', gender: 'F', payment_status: 'pending', position: 'Base' },
      { id: 'p25', player_name: 'Daniela Rojas', jersey_number: '23', size: 'M', gender: 'F', payment_status: 'pending', position: 'Alero' },
      { id: 'p26', player_name: 'Francisca Silva', jersey_number: '5', size: 'S', gender: 'F', payment_status: 'paid', position: 'Escolta' },
      { id: 'p27', player_name: 'Javiera Torres', jersey_number: '12', size: 'M', gender: 'F', payment_status: 'pending', position: 'Ala-Pívot' },
      { id: 'p28', player_name: 'Macarena Vega', jersey_number: '32', size: 'L', gender: 'F', payment_status: 'paid', position: 'Pívot' },
    ],
    timeline: [
      { id: 't21', event: 'Orden Creada', timestamp: '2025-10-11 09:00', description: 'Orden iniciada por Ana Martínez' },
      { id: 't22', event: 'Diseño Aprobado', timestamp: '2025-10-12 14:30', description: 'Diseño aprobado por el equipo' },
      { id: 't23', event: 'Pago Parcial', timestamp: '2025-10-13 11:15', description: '$100,000 recibido (26%)' },
    ],
    payment_breakdown: {
      total_cents: 390000,
      paid_cents: 100000,
      pending_cents: 290000,
      payment_method: 'Mercado Pago',
    },
  },
};
