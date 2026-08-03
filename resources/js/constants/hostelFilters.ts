import type {
  AvailabilityStatus,
  BedCountFilter,
  GenderScope,
  ManagementType,
  RoomType,
} from '@/types/hostels';

export const MANAGEMENT_OPTIONS: { value: ManagementType; label: string }[] = [
  { value: 'campus-managed', label: 'Campus Managed' },
  { value: 'affiliated', label: 'Affiliated' },
];

export const ROOM_TYPE_OPTIONS: {
  value: RoomType;
  label: string;
  helper?: string;
}[] = [
  { value: 'self-contained', label: 'Self-Contained Room' },
  { value: 'standard', label: 'Standard Room' },
  {
    value: 'apartment',
    label: 'Apartment',
    helper: 'Includes a private kitchen and bathroom',
  },
];

export const BED_OPTIONS: { value: BedCountFilter; label: string }[] = [
  { value: 'single', label: 'Single Room' },
  { value: 'double', label: 'Shared Room' },
];

export const GENDER_OPTIONS: { value: GenderScope; label: string }[] = [
  { value: 'male', label: 'Gentlemen Only' },
  { value: 'female', label: 'Ladies Only' },
  { value: 'mixed', label: 'Mixed' },
];

export const AVAILABILITY_OPTIONS: {
  value: AvailabilityStatus;
  label: string;
}[] = [
  { value: 'available', label: 'Available' },
  { value: 'limited', label: 'Limited' },
  { value: 'full', label: 'Full' },
];

export const LOCATION_OPTIONS = ['On-Campus', 'Off-Campus'] as const;
