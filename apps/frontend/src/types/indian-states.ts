export enum IndianState {
  ANDHRA_PRADESH = 'Andhra Pradesh',
  ARUNACHAL_PRADESH = 'Arunachal Pradesh',
  ASSAM = 'Assam',
  BIHAR = 'Bihar',
  CHHATTISGARH = 'Chhattisgarh',
  GOA = 'Goa',
  GUJARAT = 'Gujarat',
  HARYANA = 'Haryana',
  HIMACHAL_PRADESH = 'Himachal Pradesh',
  JHARKHAND = 'Jharkhand',
  KARNATAKA = 'Karnataka',
  KERALA = 'Kerala',
  MADHYA_PRADESH = 'Madhya Pradesh',
  MAHARASHTRA = 'Maharashtra',
  MANIPUR = 'Manipur',
  MEGHALAYA = 'Meghalaya',
  MIZORAM = 'Mizoram',
  NAGALAND = 'Nagaland',
  ODISHA = 'Odisha',
  PUNJAB = 'Punjab',
  RAJASTHAN = 'Rajasthan',
  SIKKIM = 'Sikkim',
  TAMIL_NADU = 'Tamil Nadu',
  TELANGANA = 'Telangana',
  TRIPURA = 'Tripura',
  UTTAR_PRADESH = 'Uttar Pradesh',
  UTTARAKHAND = 'Uttarakhand',
  WEST_BENGAL = 'West Bengal',

  // Union Territories
  DELHI = 'Delhi',
  JAMMU_AND_KASHMIR = 'Jammu and Kashmir',
  LADAKH = 'Ladakh',
  LAKSHADWEEP = 'Lakshadweep',
  PUDUCHERRY = 'Puducherry',
  ANDAMAN_AND_NICOBAR_ISLANDS = 'Andaman and Nicobar Islands',
  CHANDIGARH = 'Chandigarh',
  DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU = 'Dadra and Nagar Haveli and Daman and Diu'
}

// Helper to get all state values as array
export const INDIAN_STATES = Object.values(IndianState);

// Helper to get state code mapping
export const STATE_CODE_MAP: Record<IndianState, string> = {
  [IndianState.ANDHRA_PRADESH]: 'AP',
  [IndianState.ARUNACHAL_PRADESH]: 'AR',
  [IndianState.ASSAM]: 'AS',
  [IndianState.BIHAR]: 'BR',
  [IndianState.CHHATTISGARH]: 'CG',
  [IndianState.GOA]: 'GA',
  [IndianState.GUJARAT]: 'GJ',
  [IndianState.HARYANA]: 'HR',
  [IndianState.HIMACHAL_PRADESH]: 'HP',
  [IndianState.JHARKHAND]: 'JH',
  [IndianState.KARNATAKA]: 'KA',
  [IndianState.KERALA]: 'KL',
  [IndianState.MADHYA_PRADESH]: 'MP',
  [IndianState.MAHARASHTRA]: 'MH',
  [IndianState.MANIPUR]: 'MN',
  [IndianState.MEGHALAYA]: 'ML',
  [IndianState.MIZORAM]: 'MZ',
  [IndianState.NAGALAND]: 'NL',
  [IndianState.ODISHA]: 'OR',
  [IndianState.PUNJAB]: 'PB',
  [IndianState.RAJASTHAN]: 'RJ',
  [IndianState.SIKKIM]: 'SK',
  [IndianState.TAMIL_NADU]: 'TN',
  [IndianState.TELANGANA]: 'TG',
  [IndianState.TRIPURA]: 'TR',
  [IndianState.UTTAR_PRADESH]: 'UP',
  [IndianState.UTTARAKHAND]: 'UK',
  [IndianState.WEST_BENGAL]: 'WB',

  // Union Territories
  [IndianState.DELHI]: 'DL',
  [IndianState.JAMMU_AND_KASHMIR]: 'JK',
  [IndianState.LADAKH]: 'LA',
  [IndianState.LAKSHADWEEP]: 'LD',
  [IndianState.PUDUCHERRY]: 'PY',
  [IndianState.ANDAMAN_AND_NICOBAR_ISLANDS]: 'AN',
  [IndianState.CHANDIGARH]: 'CH',
  [IndianState.DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU]: 'DN'
};

// Helper function to get state code
export const getStateCode = (state: IndianState): string => {
  return STATE_CODE_MAP[state];
};

// Helper function to validate if a string is a valid state
export const isValidIndianState = (state: string): state is IndianState => {
  return Object.values(IndianState).includes(state as IndianState);
};