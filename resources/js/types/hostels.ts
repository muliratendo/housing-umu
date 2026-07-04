export type RoomType = 'self-contained' | 'non-self-contained' | 'apartment';
export type ManagementType = 'campus-managed' | 'affiliated';
export type AvailabilityStatus = 'available' | 'limited' | 'full';
export type GenderScope = 'male' | 'female' | 'mixed';
export type BedCountFilter = 'single' | 'double';

export type Hostel = {
  id: number;
  name: string;
  slug: string;
  location: string;
  price_per_semester: number;
  bed_count: number;
  room_types: RoomType[];
  room_type_labels: string[];
  primary_room_type?: RoomType | null;
  primary_room_type_label?: string | null;
  management_type: ManagementType;
  management_type_label: string;
  availability_status: AvailabilityStatus;
  availability_status_label: string;
  gender_scope: GenderScope;
  gender_scope_label: string;
  is_religious_order: boolean;
  religious_notes?: string;
  image_url?: string;
  amenities: string[];
  description?: string;
};

export type HostelListCurrentFilters = {
  search?: string;
  room_type?: RoomType[];
  location?: string[];
  availability?: AvailabilityStatus[];
  gender?: GenderScope[];
  management_type?: ManagementType[];
  is_religious_order?: boolean;
  bed_count?: BedCountFilter | 1 | 2 | null;
};

export type HostelListProps = {
  hostels: Hostel[] | Record<string, Hostel> | null;
  currentFilters?: HostelListCurrentFilters;
};

export type HostelSummary = {
  id: number;
  name: string;
  slug: string;
  location: string | null;
  image_url?: string | null;
  management_type: ManagementType | string;
  management_type_label: string;
  availability_status: AvailabilityStatus;
  availability_status_label: string;
  gender_scope: GenderScope;
  gender_scope_label: string;
  is_religious_order: boolean;
  religious_notes?: string | null;
  amenities?: string[];
  description?: string | null;
  room_type_labels?: string[];
  occupancy_labels?: string[];
  room_count?: number;
  starting_price?: number | null;
  highest_price?: number | null;

  // Student-portal-only fields (optional so public pages still type-check)
  available_beds?: number;
  total_capacity?: number;
  window_open?: boolean;
  already_applied?: boolean;
  requires_renewal?: boolean;
  can_apply?: boolean;
  has_active_allocation?: boolean;
};

export type HostelRoom = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  room_type: RoomType | string;
  room_type_label: string;
  capacity: number;
  bed_count: number;
  bed_count_label: string;
  price_per_semester?: number | null;
  availability_status: AvailabilityStatus | string;
  availability_status_label: string;
  gender_scope: GenderScope | string;
  gender_scope_label: string;
  amenities?: string[];
  image_url?: string | null;
};

export type HostelDetail = HostelSummary & {
  rooms: HostelRoom[];
};

export type HostelQueryParams = {
  search?: string;
  room_type?: RoomType[];
  location?: string[];
  availability?: AvailabilityStatus[];
  gender?: GenderScope[];
  management_type?: ManagementType[];
  is_religious_order?: boolean;
  bed_count?: BedCountFilter;
};
