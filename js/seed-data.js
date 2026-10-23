// =============================================================================
// Produits de démonstration
// -----------------------------------------------------------------------------
// Insérés depuis la page Administration (bouton « Insérer les produits de démo »).
// Les prix sont indicatifs et les liens pointent vers des fournisseurs courants.
// =============================================================================

export const DEMO_PRODUCTS = [
  {
    name: "Arduino Uno R3",
    description: "Carte microcontrôleur ATmega328P, idéale pour le prototypage.",
    category: "Électronique",
    price: 24.0,
    supplierUrl: "https://store.arduino.cc/products/arduino-uno-rev3",
    available: true,
  },
  {
    name: "ESP32 DevKit V1",
    description: "Microcontrôleur Wi-Fi + Bluetooth, 2 cœurs, 38 broches.",
    category: "Électronique",
    price: 9.9,
    supplierUrl: "https://www.gotronic.fr/",
    available: true,
  },
  {
    name: "Raspberry Pi 5 (4 Go)",
    description: "Ordinateur monocarte pour vision, serveur embarqué, IA légère.",
    category: "Électronique",
    price: 64.0,
    supplierUrl: "https://www.kubii.com/",
    available: false,
  },
  {
    name: "Capteur ultrason HC-SR04",
    description: "Mesure de distance de 2 cm à 4 m.",
    category: "Capteurs",
    price: 3.5,
    supplierUrl: "https://www.gotronic.fr/",
    available: true,
  },
  {
    name: "Centrale inertielle MPU-6050",
    description: "Accéléromètre + gyroscope 6 axes, bus I2C.",
    category: "Capteurs",
    price: 5.9,
    supplierUrl: "",
    available: true,
  },
  {
    name: "Capteur de température DS18B20 étanche",
    description: "Sonde 1-Wire avec câble de 1 m, -55 à +125 °C.",
    category: "Capteurs",
    price: 4.2,
    supplierUrl: "",
    available: true,
  },
  {
    name: "Servomoteur SG90",
    description: "Micro servo 9 g, rotation 180°.",
    category: "Moteurs",
    price: 2.8,
    supplierUrl: "",
    available: true,
  },
  {
    name: "Moteur pas à pas NEMA 17",
    description: "1,8° par pas, 0,4 N·m, pour imprimantes 3D et axes linéaires.",
    category: "Moteurs",
    price: 14.5,
    supplierUrl: "https://www.123roulement.com/",
    available: true,
  },
  {
    name: "Bobine de filament PLA 1 kg",
    description: "Diamètre 1,75 mm, plusieurs couleurs disponibles (préciser dans la justification).",
    category: "Impression 3D",
    price: 21.0,
    supplierUrl: "",
    available: true,
  },
  {
    name: "Plaque de plexiglas 3×200×300 mm",
    description: "Acrylique transparent, compatible découpe laser.",
    category: "Matériaux",
    price: 8.0,
    supplierUrl: "",
    available: true,
  },
  {
    name: "Roulement à billes 608ZZ (lot de 10)",
    description: "8×22×7 mm, flasques métalliques.",
    category: "Mécanique",
    price: 6.5,
    supplierUrl: "https://www.123roulement.com/",
    available: true,
  },
  {
    name: "Kit de fils Dupont (120 pièces)",
    description: "Mâle-mâle, mâle-femelle et femelle-femelle, 20 cm.",
    category: "Outillage",
    price: 6.0,
    supplierUrl: "",
    available: true,
  },
];
