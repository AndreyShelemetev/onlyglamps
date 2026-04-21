// Shared types for the object editor form
export interface ObjectFormData {
  name: string;
  objectTypeId: number;
  regionId: number;
  cityOrDistrictId: number;
  shortDescription: string;
  fullDescription: string;
  settlement: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  beds: number | null;
  rooms: number | null;
  area: number | null;
  isWhole: boolean;
  minRentalDays: number | null;
  maxRentalDays: number | null;
  checkInTime: string;
  checkOutTime: string;
  childrenAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  eventsAllowed: boolean;
  deposit: string;
  rules: string;
  amenityIds: number[];
  tagIds: number[];
  sourceName: string;
  sourceUrl: string;
  sourceType: string;
  seoTitle: string;
  seoDescription: string;
}

export interface TariffItem {
  id?: number;
  name: string;
  price: number;
  description: string;
  isActive: boolean;
}

export interface PhotoItem {
  id?: number;
  url: string;
  alt: string;
  sortOrder: number;
}

export interface CalendarItem {
  date: string;
  status: string;
}

export interface CatalogOption {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  disabledBuiltinFields?: string;
}

export interface RegionOption {
  id: number;
  name: string;
  slug: string;
  cities?: { id: number; name: string; slug: string }[];
}

export const INITIAL_FORM_DATA: ObjectFormData = {
  name: "",
  objectTypeId: 0,
  regionId: 0,
  cityOrDistrictId: 0,
  shortDescription: "",
  fullDescription: "",
  settlement: "",
  address: "",
  latitude: null,
  longitude: null,
  capacity: 1,
  beds: null,
  rooms: null,
  area: null,
  isWhole: true,
  minRentalDays: null,
  maxRentalDays: null,
  checkInTime: "14:00",
  checkOutTime: "12:00",
  childrenAllowed: true,
  petsAllowed: false,
  smokingAllowed: false,
  eventsAllowed: false,
  deposit: "",
  rules: "",
  amenityIds: [],
  tagIds: [],
  sourceName: "",
  sourceUrl: "",
  sourceType: "",
  seoTitle: "",
  seoDescription: "",
};
