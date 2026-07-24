import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EXPENSE_CATEGORIES = [
  { name: 'Alimentos', icon: 'UtensilsCrossed', color: '#f97316', subcategories: [
    { name: 'Supermercado', icon: 'ShoppingCart', color: '#f97316' },
    { name: 'Almacén', icon: 'Store', color: '#fb923c' },
    { name: 'Kiosco', icon: 'Newspaper', color: '#fdba74' },
    { name: 'Carnicería', icon: 'Beef', color: '#ea580c' },
    { name: 'Verdulería', icon: 'Carrot', color: '#22c55e' },
    { name: 'Panadería', icon: 'Croissant', color: '#d97706' },
    { name: 'Fiambrería', icon: 'Sandwich', color: '#ca8a04' },
    { name: 'Bebidas', icon: 'Wine', color: '#dc2626' },
    { name: 'Delivery', icon: 'Truck', color: '#8b5cf6' },
    { name: 'Restaurantes', icon: 'Utensils', color: '#ec4899' },
  ]},
  { name: 'Vivienda', icon: 'Home', color: '#3b82f6', subcategories: [
    { name: 'Alquiler', icon: 'Key', color: '#3b82f6' },
    { name: 'Expensas', icon: 'Building2', color: '#6366f1' },
    { name: 'Servicios', icon: 'Zap', color: '#8b5cf6' },
    { name: 'Mantenimiento', icon: 'Wrench', color: '#a855f7' },
    { name: 'Seguro Hogar', icon: 'Shield', color: '#2563eb' },
    { name: 'Amueblamiento', icon: 'Sofa', color: '#7c3aed' },
  ]},
  { name: 'Transporte', icon: 'Car', color: '#14b8a6', subcategories: [
    { name: 'Nafta/Gasolina', icon: 'Fuel', color: '#14b8a6' },
    { name: 'Transporte Público', icon: 'Bus', color: '#0d9488' },
    { name: 'Taxi/Remis', icon: 'PhoneCall', color: '#0f766e' },
    { name: 'Estacionamiento', icon: 'ParkingCircle', color: '#115e59' },
    { name: 'Peajes', icon: 'Receipt', color: '#134e4a' },
    { name: 'Mantenimiento Vehículo', icon: 'Settings', color: '#0d9488' },
  ]},
  { name: 'Salud', icon: 'Heart', color: '#ef4444', subcategories: [
    { name: 'Farmacia', icon: 'Pill', color: '#ef4444' },
    { name: 'Médico', icon: 'Stethoscope', color: '#dc2626' },
    { name: 'Dentista', icon: 'Smile', color: '#f87171' },
    { name: 'Oftalmología', icon: 'Eye', color: '#b91c1c' },
    { name: 'Obra Social', icon: 'Hospital', color: '#991b1b' },
    { name: 'Psicólogo', icon: 'Brain', color: '#e11d48' },
    { name: 'Kinesiología', icon: 'Activity', color: '#be123c' },
  ]},
  { name: 'Educación', icon: 'GraduationCap', color: '#8b5cf6', subcategories: [
    { name: 'Matrícula/Colegio', icon: 'School', color: '#8b5cf6' },
    { name: 'Universidad', icon: 'BookOpen', color: '#7c3aed' },
    { name: 'Cursos', icon: 'Laptop', color: '#6d28d9' },
    { name: 'Libros/Materiales', icon: 'BookMarked', color: '#5b21b6' },
    { name: 'Tutorías', icon: 'Users', color: '#4c1d95' },
  ]},
  { name: 'Entretenimiento', icon: 'Gamepad2', color: '#ec4899', subcategories: [
    { name: 'Streaming', icon: 'Tv', color: '#ec4899' },
    { name: 'Cine/Teatro', icon: 'Clapperboard', color: '#db2777' },
    { name: 'Juegos', icon: 'Gamepad2', color: '#be185d' },
    { name: 'Música', icon: 'Music', color: '#9d174d' },
    { name: 'Libros/Ocio', icon: 'BookHeart', color: '#831843' },
    { name: 'Deportes', icon: 'Trophy', color: '#f43f5e' },
    { name: 'Salidas', icon: 'PartyPopper', color: '#e11d48' },
  ]},
  { name: 'Ropa y Calzado', icon: 'Shirt', color: '#f59e0b', subcategories: [
    { name: 'Ropa', icon: 'Shirt', color: '#f59e0b' },
    { name: 'Calzado', icon: 'Footprints', color: '#d97706' },
    { name: 'Accesorios', icon: 'Glasses', color: '#b45309' },
    { name: 'Lavandería', icon: 'WashingMachine', color: '#92400e' },
  ]},
  { name: 'Servicios Digitales', icon: 'Smartphone', color: '#06b6d4', subcategories: [
    { name: 'Teléfono Móvil', icon: 'Smartphone', color: '#06b6d4' },
    { name: 'Internet', icon: 'Wifi', color: '#0891b2' },
    { name: 'Hosting/Dominios', icon: 'Globe', color: '#0e7490' },
    { name: 'Suscripciones', icon: 'CreditCard', color: '#155e75' },
    { name: 'Software', icon: 'Code', color: '#164e63' },
  ]},
  { name: 'Mascotas', icon: 'PawPrint', color: '#a78bfa', subcategories: [
    { name: 'Alimento Mascota', icon: 'Dog', color: '#a78bfa' },
    { name: 'Veterinaria', icon: 'HeartPulse', color: '#8b5cf6' },
    { name: 'Accesorios', icon: 'CircleDot', color: '#7c3aed' },
    { name: 'Paseador', icon: 'Footprints', color: '#6d28d9' },
  ]},
  { name: 'Impuestos y Tarjetas', icon: 'Landmark', color: '#64748b', subcategories: [
    { name: 'Impuestos', icon: 'Landmark', color: '#64748b' },
    { name: 'Tarjeta de Crédito', icon: 'CreditCard', color: '#475569' },
    { name: 'Préstamos', icon: 'Banknote', color: '#334155' },
    { name: 'Cuotas', icon: 'CalendarDays', color: '#1e293b' },
  ]},
  { name: 'Regalos y Eventos', icon: 'Gift', color: '#f43f5e', subcategories: [
    { name: 'Regalos', icon: 'Gift', color: '#f43f5e' },
    { name: 'Cumpleaños', icon: 'Cake', color: '#e11d48' },
    { name: 'Navidad', icon: 'TreePine', color: '#be123c' },
    { name: 'Otros Eventos', icon: 'CalendarHeart', color: '#9f1239' },
  ]},
  { name: 'Personal', icon: 'User', color: '#78716c', subcategories: [
    { name: 'Peluquería', icon: 'Scissors', color: '#78716c' },
    { name: 'Gimnasio', icon: 'Dumbbell', color: '#57534e' },
    { name: 'Spa/Relajación', icon: 'Sparkles', color: '#44403c' },
    { name: 'Ropa de Cama', icon: 'Bed', color: '#292524' },
  ]},
];

const INCOME_CATEGORIES = [
  { name: 'Salario', icon: 'Briefcase', color: '#22c55e', subcategories: [
    { name: 'Salario Mensual', icon: 'Briefcase', color: '#22c55e' },
    { name: 'Aguinaldo', icon: 'Gift', color: '#16a34a' },
    { name: 'Horas Extras', icon: 'Clock', color: '#15803d' },
    { name: 'Bonos', icon: 'TrendingUp', color: '#166534' },
  ]},
  { name: 'Freelance', icon: 'Laptop', color: '#3b82f6', subcategories: [
    { name: 'Desarrollo Web', icon: 'Code', color: '#3b82f6' },
    { name: 'Diseño', icon: 'Palette', color: '#2563eb' },
    { name: 'Consultoría', icon: 'MessageSquare', color: '#1d4ed8' },
    { name: 'Otros Freelance', icon: 'Globe', color: '#1e40af' },
  ]},
  { name: 'Inversiones', icon: 'TrendingUp', color: '#10b981', subcategories: [
    { name: 'Intereses', icon: 'Percent', color: '#10b981' },
    { name: 'Dividendos', icon: 'Coins', color: '#059669' },
    { name: 'Renta', icon: 'Home', color: '#047857' },
    { name: 'Ganancia Capital', icon: 'ArrowUpRight', color: '#065f46' },
    { name: 'Plazo Fijo', icon: 'Lock', color: '#064e3b' },
  ]},
  { name: 'Ventas', icon: 'ShoppingBag', color: '#f59e0b', subcategories: [
    { name: 'Mercado Libre', icon: 'ShoppingBag', color: '#f59e0b' },
    { name: 'Garage Sale', icon: 'Tag', color: '#d97706' },
    { name: 'Ventas Online', icon: 'Globe', color: '#b45309' },
  ]},
  { name: 'Alquileres', icon: 'Key', color: '#8b5cf6', subcategories: [
    { name: 'Inmueble', icon: 'Building2', color: '#8b5cf6' },
    { name: 'Cochera', icon: 'Car', color: '#7c3aed' },
    { name: 'Otros Alquileres', icon: 'Warehouse', color: '#6d28d9' },
  ]},
  { name: 'Otros Ingresos', icon: 'PlusCircle', color: '#64748b', subcategories: [
    { name: 'Regalos Recibidos', icon: 'Gift', color: '#64748b' },
    { name: 'Reembolsos', icon: 'RotateCcw', color: '#475569' },
    { name: 'Juegos de Azar', icon: 'Dices', color: '#334155' },
    { name: 'Otros', icon: 'CircleDot', color: '#1e293b' },
  ]},
];

const DEFAULT_ACCOUNTS = [
  { name: 'Efectivo (ARS)', currency: 'ARS', icon: 'Banknote', color: '#22c55e' },
  { name: 'Cuenta Bancaria (ARS)', currency: 'ARS', icon: 'Landmark', color: '#3b82f6' },
  { name: 'Efectivo (USD)', currency: 'USD', icon: 'DollarSign', color: '#10b981' },
  { name: 'Cuenta Bancaria (USD)', currency: 'USD', icon: 'PiggyBank', color: '#8b5cf6' },
];

async function seedHousehold(name: string, adminEmail: string, adminPassword: string, adminName: string) {
  const hashed = await bcrypt.hash(adminPassword, 10);
  const household = await prisma.household.create({
    data: {
      name,
      users: { create: { email: adminEmail, password: hashed, name: adminName, role: 'admin' } },
      accounts: { create: DEFAULT_ACCOUNTS },
    },
    include: { users: true },
  });

  for (const cat of [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]) {
    const type = EXPENSE_CATEGORIES.includes(cat) ? 'expense' : 'income';
    const category = await prisma.category.create({
      data: {
        name: cat.name, type, icon: cat.icon, color: cat.color, isDefault: true, householdId: household.id,
        subcategories: { create: cat.subcategories.map(s => ({ name: s.name, icon: s.icon, color: s.color, isDefault: true })) },
      },
    });
  }

  return household;
}

async function main() {
  console.log('🌱 Seeding multi-household database...');
  await seedHousehold('Mi Hogar', 'admin@hogar.com', 'admin123', 'Administrador');
  console.log('✅ Seed completed! (admin@hogar.com / admin123)');
}

main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
