// src/types/index.ts
// Barrel export for types (conflict-safe)

// Canonical API helpers (single source of truth)
export * from './api';

// Catalog types
export type {
  Sport,
  ProductBase,
  ProductImage,
  ProductDetail,
  ProductListItem,
  ProductListResult,
  Team,
  Profile,
  Product,
  ProductWithDetails,
  CatalogPreviewResponse,
  SportSlug,
  ApiError,
  Currency,
  PriceFormat,
} from './catalog';

// Taxonomy (rename Sport to avoid collision with catalog Sport)
export type {
  Sport as TaxonomySport,
  ProductType,
  Bundle,
  FabricRecommendation,
  FabricAlias,
} from './taxonomy';

// Roster
export type {
  RosterMember,
  RosterRow,
  PreviewRow,
  RosterCommitPayload,
  RosterCommitResponse,
  RosterPreviewResponse,
  RosterCommitResult,
  CSVPreview,
  ColumnMapping,
} from './roster';
export { RosterRowSchema, RosterMemberSchema, PreviewRowSchema, RosterCommitPayloadSchema } from './roster';

// Design
export type {
  DesignRequest,
  CreateDesignRequestPayload,
  UpdateDesignRequestStatusPayload,
  DesignRequestResponse,
  DesignRequestListResponse,
} from './design';
export { CreateDesignRequestSchema, UpdateDesignRequestStatusSchema } from './design';

// Orders
export type {
  CartStatus,
  OrderStatus,
  Cart,
  CartItem,
  CartWithItems,
  Order,
  OrderItem,
  OrderWithItems,
  AddToCartRequest,
  UpdateCartItemRequest,
  CheckoutRequest,
  CheckoutResponse,
  CartResponse,
  OrdersListResponse,
  OrderDetailResponse,
} from './orders';
export {
  addToCartSchema,
  updateCartItemSchema,
  checkoutSchema,
  ordersQuerySchema,
  formatCurrency,
  getOrderStatusColor,
  getOrderStatusLabel,
} from './orders';

// Products
export type {
  ProductStatus,
  ApparelCategory,
  Product as CatalogProduct,
  ProductImage as CatalogProductImage,
} from './products';

// User
export type {
  UserProfile,
  TeamMember,
  TeamDetails,
  TeamInvite,
  TeamWithInvites,
  UpdateProfileRequest,
  CreateTeamRequest,
  CreateInviteRequest,
  JoinTeamRequest,
  SetUserRoleRequest,
  TeamMeResponse,
  CreateTeamResponse,
  JoinTeamResponse,
  LeaveTeamResponse,
  CreateInviteResponse,
  UserRole,
} from './user';
