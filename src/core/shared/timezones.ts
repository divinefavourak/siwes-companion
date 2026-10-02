export type TimezoneOption = { value: string; label: string };
export type TimezoneGroup = { region: string; zones: TimezoneOption[] };

export const DEFAULT_TIMEZONE = "Africa/Lagos";

// Curated list shown in settings. Any valid IANA zone is accepted by the API,
// so this only controls what the picker offers.
export const TIMEZONE_GROUPS: TimezoneGroup[] = [
  {
    region: "West Africa",
    zones: [
      { value: "Africa/Lagos", label: "Lagos, Nigeria (WAT, UTC+1)" },
      { value: "Africa/Accra", label: "Accra, Ghana (GMT, UTC+0)" },
      { value: "Africa/Abidjan", label: "Abidjan, Côte d'Ivoire (GMT, UTC+0)" },
      { value: "Africa/Dakar", label: "Dakar, Senegal (GMT, UTC+0)" },
      { value: "Africa/Freetown", label: "Freetown, Sierra Leone (GMT, UTC+0)" },
      { value: "Africa/Monrovia", label: "Monrovia, Liberia (GMT, UTC+0)" },
      { value: "Africa/Banjul", label: "Banjul, Gambia (GMT, UTC+0)" },
      { value: "Africa/Douala", label: "Douala, Cameroon (WAT, UTC+1)" },
      { value: "Africa/Niamey", label: "Niamey, Niger (WAT, UTC+1)" }
    ]
  },
  {
    region: "East Africa",
    zones: [
      { value: "Africa/Nairobi", label: "Nairobi, Kenya (EAT, UTC+3)" },
      { value: "Africa/Kampala", label: "Kampala, Uganda (EAT, UTC+3)" },
      { value: "Africa/Dar_es_Salaam", label: "Dar es Salaam, Tanzania (EAT, UTC+3)" },
      { value: "Africa/Addis_Ababa", label: "Addis Ababa, Ethiopia (EAT, UTC+3)" },
      { value: "Africa/Mogadishu", label: "Mogadishu, Somalia (EAT, UTC+3)" },
      { value: "Africa/Djibouti", label: "Djibouti (EAT, UTC+3)" },
      { value: "Africa/Asmara", label: "Asmara, Eritrea (EAT, UTC+3)" },
      { value: "Africa/Juba", label: "Juba, South Sudan (CAT, UTC+2)" },
      { value: "Africa/Kigali", label: "Kigali, Rwanda (CAT, UTC+2)" },
      { value: "Africa/Bujumbura", label: "Bujumbura, Burundi (CAT, UTC+2)" }
    ]
  },
  {
    region: "Central & Southern Africa",
    zones: [
      { value: "Africa/Kinshasa", label: "Kinshasa, DR Congo (WAT, UTC+1)" },
      { value: "Africa/Lubumbashi", label: "Lubumbashi, DR Congo (CAT, UTC+2)" },
      { value: "Africa/Luanda", label: "Luanda, Angola (WAT, UTC+1)" },
      { value: "Africa/Lusaka", label: "Lusaka, Zambia (CAT, UTC+2)" },
      { value: "Africa/Harare", label: "Harare, Zimbabwe (CAT, UTC+2)" },
      { value: "Africa/Maputo", label: "Maputo, Mozambique (CAT, UTC+2)" },
      { value: "Africa/Blantyre", label: "Blantyre, Malawi (CAT, UTC+2)" },
      { value: "Africa/Gaborone", label: "Gaborone, Botswana (CAT, UTC+2)" },
      { value: "Africa/Windhoek", label: "Windhoek, Namibia (CAT, UTC+2)" },
      { value: "Africa/Johannesburg", label: "Johannesburg, South Africa (SAST, UTC+2)" }
    ]
  },
  {
    region: "North Africa",
    zones: [
      { value: "Africa/Cairo", label: "Cairo, Egypt (EET)" },
      { value: "Africa/Khartoum", label: "Khartoum, Sudan (CAT, UTC+2)" },
      { value: "Africa/Tripoli", label: "Tripoli, Libya (EET, UTC+2)" },
      { value: "Africa/Tunis", label: "Tunis, Tunisia (CET, UTC+1)" },
      { value: "Africa/Algiers", label: "Algiers, Algeria (CET, UTC+1)" },
      { value: "Africa/Casablanca", label: "Casablanca, Morocco" }
    ]
  },
  {
    region: "Middle East & Asia",
    zones: [
      { value: "Asia/Dubai", label: "Dubai, UAE (GST, UTC+4)" },
      { value: "Asia/Riyadh", label: "Riyadh, Saudi Arabia (AST, UTC+3)" },
      { value: "Asia/Karachi", label: "Karachi, Pakistan (PKT, UTC+5)" },
      { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
      { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
      { value: "Asia/Shanghai", label: "China (CST, UTC+8)" },
      { value: "Asia/Tokyo", label: "Tokyo, Japan (JST, UTC+9)" }
    ]
  },
  {
    region: "Europe",
    zones: [
      { value: "Europe/London", label: "London, UK (GMT/BST)" },
      { value: "Europe/Dublin", label: "Dublin, Ireland (GMT/IST)" },
      { value: "Europe/Paris", label: "Paris, France (CET/CEST)" },
      { value: "Europe/Berlin", label: "Berlin, Germany (CET/CEST)" },
      { value: "Europe/Istanbul", label: "Istanbul, Türkiye (TRT, UTC+3)" }
    ]
  },
  {
    region: "Americas & Oceania",
    zones: [
      { value: "America/New_York", label: "New York (ET)" },
      { value: "America/Chicago", label: "Chicago (CT)" },
      { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
      { value: "America/Toronto", label: "Toronto, Canada (ET)" },
      { value: "America/Sao_Paulo", label: "São Paulo, Brazil (BRT, UTC-3)" },
      { value: "Australia/Sydney", label: "Sydney, Australia (AET)" }
    ]
  },
  {
    region: "Other",
    zones: [{ value: "UTC", label: "UTC (Universal Time)" }]
  }
];

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isListedTimeZone(value: string): boolean {
  return TIMEZONE_GROUPS.some((group) => group.zones.some((zone) => zone.value === value));
}
