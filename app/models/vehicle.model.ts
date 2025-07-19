export interface VehicleInfo {
  field: string;
  value: string;
}

export interface ContraventionInfo {
  numero: string;
  infraction?: string;
  date: string;
  montant: string;
  statut: string;
  action?: string;
}

export interface VehicleResponse {
  vehicleInfo: VehicleInfo[];
  contraventions: ContraventionInfo[];
  contraventionHeaders: string[];
}
