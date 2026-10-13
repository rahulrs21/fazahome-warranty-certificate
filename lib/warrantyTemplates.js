// Administrative wording only. Replace with approved, model-specific terms
// before issuing certificates; no warranty duration or coverage is promised here.
// Edit each template's terms array separately; both outputs display it in full.
const provisionalTerms = [
  "Keep this certificate with the original invoice, product identification for any warranty enquiry.",
];

export const WARRANTY_TEMPLATES = [
  {
    id: "ariston-solar",
    name: "Ariston Solar Water Heater",
    brand: "Ariston",
    category: "Solar water heater",
    image: "/ariston.png",
    accent: "#B91C1C",
    modelDescription: "Ariston solar water heater - exact model and capacity as invoiced",
    guidance: "Ensure professional installation and regular cleaning of solar panels and the storage tank. Inspect the magnesium anode every 18 months and retain maintenance records for warranty claims.",
    terms: [
      ...provisionalTerms,
      "Warranty Coverage: The Ariston solar water heater is covered against manufacturing defects for 5 years on the tank, 5 years on the solar panel, and 1 year on electrical components from the invoice date. Every 2 years need to do the periodical maintenance.",
      "Exclusions: Normal wear and tear, routine servicing, improper installation, misuse, incorrect electrical voltage, and damage caused by external factors are not covered.",
      "Maintenance Requirements: Solar panels and storage tanks must be maintained regularly. The magnesium anode must be inspected every 18 months, and service records must be retained.",
      "Warranty Validity: Coverage is subject to proper installation and maintenance in accordance with the manufacturer's instructions. Failure to meet these requirements may invalidate claims.",
      "Claims and Repairs: Approved warranty claims cover the supply of defective replacement materials only. Labour, installation, and additional service charges may apply.",
      "Claim Documentation: Customers must provide the original invoice, product details, and fault description when contacting Ariston Service at 800 2747866.",
    ],
  },

  {
    id: "ariston-stab",
    name: "Ariston Stab Water Heater",
    brand: "Ariston",
    category: "Electric stab water heater",
    image: "/ariston.png",
    accent: "#991B1B",
    modelDescription: "Ariston Stab water heater - exact model and capacity as invoiced",
    guidance: "Ensure installation by a qualified technician in accordance with Ariston guidelines. Carry out regular safety inspections, check the magnesium anode, and retain service records.",

    terms: [
      ...provisionalTerms,
      "Warranty Coverage: The Ariston STAB water heater is covered against manufacturing defects for 5 years on tank leakage and 1 year on electrical components from the invoice date. Every 2 years need to do the periodical maintenance.",
      "Exclusions: Normal wear and tear, periodic maintenance, improper electrical voltage, natural disasters, misuse, and unauthorised modifications or repairs are excluded.",
      "Property Damage: Warranty does not cover consequential property damage caused by water leakage or damage arising during servicing in difficult-to-access locations.",
      "Service and Repairs: Out-of-warranty visits, labour and replacement parts may incur charges. Customers must provide reasonable access to the installed heater.",
      "Warranty Claims: Contact Ariston Customer Service at 800 2747866 with the model number, warranty details, and original proof of purchase."
    ],

  },
  {
    id: "ariston-pro1r",
    name: "Ariston Pro1R Water Heater",
    brand: "Ariston",
    category: "Water heater",
    image: "/ariston.png",
    accent: "#991B1B",
    modelDescription: "Ariston Pro1R water heater - exact model and capacity as invoiced",
    guidance: "Ensure installation by a qualified technician in accordance with Ariston guidelines. Carry out regular safety inspections, check the magnesium anode, and retain service records.",

    terms: [
      ...provisionalTerms,
      "Warranty Coverage: The Ariston PRO1 R water heater is covered against manufacturing defects for 7 years on tank leakage and 1 year on electrical components from the invoice date. Every 2 years need to do the periodical maintenance.",
      "Exclusions: Normal wear and tear, periodic maintenance, improper electrical voltage, natural disasters, misuse, and unauthorised modifications or repairs are excluded.",
      "Property Damage: Warranty does not cover consequential property damage caused by water leakage or damage arising during servicing in difficult-to-access locations.",
      "Service and Repairs: Out-of-warranty visits, labour and replacement parts may incur charges. Customers must provide reasonable access to the installed heater.",
      "Warranty Claims: Contact Ariston Customer Service at 800 2747866 with the model number, warranty details, and original proof of purchase."
    ],

  },
  {
    id: "ariston-blur",
    name: "Ariston Blu R Water Heater",
    brand: "Ariston",
    category: "Water heater",
    image: "/ariston.png",
    accent: "#7F1D1D",
    modelDescription: "Ariston Blu R water heater - exact model and capacity as invoiced",
    guidance: "Follow Ariston's installation and operating instructions. Check the safety valve, electrical connections, and magnesium anode periodically. Keep maintenance records for warranty support.",
    terms: [
      ...provisionalTerms,
      "Warranty Coverage: The Ariston BLU R water heater is covered against manufacturing defects for 5 years on tank leakage and 1 year on electrical components from the invoice date. Every 2 years need to do the periodical maintenance.",
      "Exclusions: Normal wear and tear, periodic maintenance, improper electrical voltage, natural disasters, misuse, and unauthorised modifications or repairs are excluded.",
      "Property Damage: Warranty does not cover consequential property damage caused by water leakage or damage arising during servicing in difficult-to-access locations.",
      "Service and Repairs: Out-of-warranty visits, labour and replacement parts may incur charges. Customers must provide reasonable access to the installed heater.",
      "Warranty Claims: Contact Ariston Customer Service at 800 2747866 with the model number, warranty details, and original proof of purchase."
    ],
  },
  {
    id: "atlantic",
    name: "Atlantic Water Heater",
    brand: "Atlantic",
    category: "Water heater",
    image: "/atlantic.png",
    accent: "#C2410C",
    modelDescription: "Atlantic water heater - exact model and capacity as invoiced",
    guidance: "Install and operate the heater according to Atlantic's instructions. Perform periodic safety and maintenance checks, including applicable anode inspection, and retain service documentation.",
    terms: [
      ...provisionalTerms,
      "Warranty Coverage: The Atlantic water heater is covered against manufacturing defects for 5 years on tank leakage and 1 year on electrical components from the invoice date.",
      "Exclusions: Normal wear and tear, periodic maintenance, improper electrical voltage, natural disasters, misuse, and unauthorised modifications or repairs are excluded.",
      "Property Damage: Warranty does not cover consequential property damage caused by water leakage or damage arising during servicing in difficult-to-access locations.",
      "Service and Repairs: Out-of-warranty visits, labour and replacement parts may incur charges. Customers must provide reasonable access to the installed heater.",
      "Warranty Claims: Contact Ariston Customer Service at 800 2747866 with the model number, warranty details, and original proof of purchase."
    ],
  },

  {
    id: "bradford",
    name: "Bradford White Water Heater",
    brand: "Bradford White",
    category: "Water heater",
    image: "/bradford-white.png",
    accent: "#C2410C",
    modelDescription: "Bradford White water heater - exact model and capacity as invoiced",
    guidance: "Ensure proper installation and protect the water heater from rain and flooding. Replace anode rods every 2 years, service heating elements regularly, and retain maintenance records for warranty support.",

    terms: [
      "Warranty Coverage: Bradford White Water Heaters are covered for 5 years against tank leakage and 1 year for defective spare parts, subject to warranty conditions.",
      "Parts and Repairs: Defective parts identified within the first year will be repaired or replaced without charge, at the supplier's discretion, provided the heater has been properly maintained and operated.",
      "Tank Replacement: Only one tank replacement is permitted for leakage within the 5-year warranty period. Labour and service charges apply after the first year.",
      "Installation Protection: Warranty coverage requires adequate shelter or protective covering to prevent exposure to rain, flooding, and other external environmental damage.",
      "Warranty Exclusions: Dry-fired heating elements, misuse, improper operation, and damage resulting from failure to follow installation instructions are not covered.",
      "Maintenance Requirements: Anode rods must be replaced every 2 years, and heating elements must be serviced regularly according to the manufacturer's guidelines to maintain warranty validity."
    ],

  },

  {
    id: "calpak",
    name: "Calpak Water Heater",
    brand: "Calpak",
    category: "Solar water heater",
    image: "/calpak.png",
    accent: "#262626",
    modelDescription: "Calpak water heater - exact model and system configuration as invoiced",
    guidance: "Ensure proper installation and regular cleaning of solar collectors. Inspect the storage tank and system connections periodically, and retain maintenance records for warranty support.",

    terms: [
      ...provisionalTerms,
      "Warranty Coverage: The Calpak Solar Water Heater is covered against manufacturing defects for 5 years on tank leakage, 5 years on solar panel and 1 year on the heating element from the invoice date.",
      "Operating Conditions: Warranty coverage applies only when the equipment operates within the manufacturer's recommended parameters and operating conditions.",
      "Maintenance Requirements: Regular inspection and maintenance are required to ensure safe operation and prevent equipment failure.",
      "Electrical & Anode Inspection: Electrical components and the magnesium anode must be checked periodically. Tank damage resulting from a non-functional anode is not covered.",
      "Maintenance Records: The facility management team must maintain inspection and maintenance logs in accordance with the manufacturer's training and instructions.",
      "Warranty Validity: Claims are limited to manufacturing defects. Failures caused by inadequate maintenance or operation outside recommended parameters are not covered."
    ],

  },
  {
    id: "espa",
    name: "Espa Water Pump",
    brand: "Espa",
    category: "Water pump",
    image: "/espa.png",
    accent: "#003B71",
    modelDescription: "Espa water pump - exact model and pump configuration as invoiced",
    guidance: "Ensure professional installation according to ESPA specifications. Maintain adequate water supply, avoid dry running, and operate within recommended electrical and pressure limits. Retain product details and service records for warranty support.",

    terms: [
      "Warranty Coverage: ESPA Water Pump are covered by a 1-year repair warranty against manufacturing defects from the original invoice date.",
      "Warranty Eligibility: Coverage is subject to the product being installed, operated, and maintained in accordance with ESPA's official warranty conditions.",
      "Operating Conditions: Pumps must operate within the manufacturer's specified electrical, pressure, temperature, and performance limits.",
      "Warranty Exclusions: Damage caused by improper installation, misuse, dry running, incorrect voltage, or unauthorised modifications is excluded, subject to the manufacturer's applicable terms.",
      "Warranty Claims: Customers should provide the original invoice, delivery details, pump model for warranty assessment and verification."
    ],

  },
  {
    id: "grundfos",
    name: "Grundfos Water Pump",
    brand: "Grundfos",
    category: "Water pump",
    image: "/grundfos.png",
    accent: "#003B71",
    modelDescription: "Grundfos water pump - exact model and pump configuration as invoiced",
    guidance: "Ensure professional installation according to Grundfos specifications. Avoid dry running, maintain proper water supply and electrical conditions, and retain product identification and service records for warranty support.",

    terms: [
      "Warranty Coverage: Grundfos Water Pump is covered against manufacturing defects in materials and workmanship for 1 year from the original invoice date.",
      "Warranty Eligibility: Coverage applies to the product supplied under the stated invoice, subject to proper installation, operation, and maintenance in accordance with Grundfos guidelines.",
      "Warranty Exclusions: Normal wear and tear, misuse, improper installation, incorrect voltage, external damage, and unauthorised repairs or modifications are excluded.",
      "Operating Conditions: The pump must operate within its specified pressure, temperature, and electrical limits. Damage caused by dry running, cavitation, or unsuitable operating conditions is excluded.",
      "Warranty Claims: Customers must provide the original invoice, pump model, serial number, and fault details. Warranty claims are subject to inspection and verification of manufacturing defects."
    ],
  },
];
