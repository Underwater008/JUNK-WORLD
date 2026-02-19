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
}
