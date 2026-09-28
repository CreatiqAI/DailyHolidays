export const site = {
  name: "Daily Holidays",
  legalName: "Daily Holidays Sdn Bhd",
  chineseName: "鑫天旅游有限公司",
  companyNo: "1119572-K",
  licence: "KPK/LN 7901",
  tagline: "Holidays planned day by day",
  description:
    "Daily Holidays Sdn Bhd is a Malaysian travel agency in Batu Caves, Selangor offering group tours, ground tours, cruises, Malaysia holidays, air ticketing, visa and travel insurance.",
  address: ["22A(B), Jalan SJ6", "Taman Selayang Jaya", "68100 Batu Caves", "Selangor, Malaysia"],
  phone: "+603-6127 0508",
  phoneHref: "tel:+60361270508",
  fax: "+603-6128 0507",
  email: "enquiry@dailyholidays.com.my",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "60122186990",
  facebook: "https://www.facebook.com/dailyholidaysmy/",
  tiktok: "https://www.tiktok.com/@dailyholidayssdnbhd",
  hotelBooking: "https://www.booking.com/index.html?aid=841342",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function whatsappLink(message?: string) {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${site.whatsapp}${text}`;
}

export const tourTypeLabels: Record<string, string> = {
  group: "Group Tour",
  ground: "Ground Tour",
  cruise: "Cruise",
  malaysia: "Malaysia Tour",
  other: "Tour",
};

export const regions = ["Asia", "Europe", "Middle East", "Africa", "Oceania", "Americas", "Malaysia"] as const;
