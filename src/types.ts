export interface Part {
  id: string;
  name: string;
  price: number;
}

export interface Expenses {
  gasoline: number;
  toll: number;
  other: number;
}

export interface ServiceItem {
  id: string;
  description: string;
  value?: number;
  photoBefore?: string;
  photoAfter?: string;
}

export interface Receipt {
  id?: string;
  type: 'estimate' | 'service';
  companyName: string;
  companyDetails: string;
  companyLogo?: string;
  clientName: string;
  services: ServiceItem[];
  laborCost: number;
  parts: Part[];
  expenses: Expenses;
  total: number;
  mileageInitial?: number;
  mileageFinal?: number;
  dashboardPhoto?: string;
  createdAt: string;
  serviceDate: string;
  osNumber: string;
  pixKey?: string;
  userId: string;
}
