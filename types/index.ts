export interface Project {
  id: string;
  title: string;
  description: string;
  year: number;
  thumbnail: string;
  participants: number;
  tags: string[];
  markerOffset: { lat: number; lng: number };
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  lat: number;
  lng: number;
  color: string;
  country: string;
  disciplines: string[];
  projects: Project[];
  logo?: string;
  status?: "active" | "inactive";
}

export interface Member {
  id: string;
  name: string;
  title: string;
  university: string;
  country: string;
  city: string;
  bio: string;
  image?: string;
  profileUrl?: string;
  websiteUrl?: string;
}
