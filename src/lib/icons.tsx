import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

const ALL_ICONS = [
  'Wallet','PiggyBank','Landmark','Banknote','DollarSign','Coins','CreditCard','Receipt','TrendingUp','TrendingDown',
  'ArrowUpRight','ArrowDownRight','PlusCircle','MinusCircle','Home','Key','Building2','Warehouse','DoorOpen',
  'Utensils','UtensilsCrossed','ShoppingCart','ShoppingBag','Store','Car','Bus','Fuel','Bike','TrainFront',
  'Plane','Ship','ParkingCircle','Heart','HeartPulse','Stethoscope','Pill','Syringe','Thermometer','Activity',
  'Brain','Eye','Smile','Hospital','GraduationCap','School','BookOpen','BookMarked','Laptop','Pencil',
  'Gamepad2','Tv','Music','Film','Clapperboard','Camera','Palette','Brush','Theater','PartyPopper',
  'Shirt','Footprints','Glasses','Watch','Scissors','Sparkles','Star','Award','Trophy','Medal',
  'Smartphone','Wifi','Globe','Monitor','Headphones','Speaker','Printer','Keyboard','Mouse','Usb',
  'PawPrint','Dog','Cat','Fish','Bird','Bug','Rabbit','Turtle','Horse','Squirrel',
  'Gift','Cake','TreePine','Bell','Confetti','Balloon','Firework','Candy','IceCream','Pizza',
  'Beef','Carrot','Croissant','Sandwich','Wine','Beer','Coffee','Milk','Apple','Egg',
  'Dumbbell','Bike','Mountain','Sun','Moon','Cloud','Umbrella','Snowflake','Flower','Leaf',
  'Briefcase','Calculator','Calendar','CalendarDays','Clock','Timer','AlarmClock','Stopwatch','Hourglass','History',
  'Settings','Wrench','Hammer','Screwdriver','Tool','Cog','Shield','Lock','Unlock','KeyRound',
  'User','Users','UserPlus','UserMinus','UserCheck','UserX','Baby','PersonStanding','PersonStanding',
  'MessageSquare','Phone','PhoneCall','Mail','Send','Inbox','Archive','FileText','Folder','FolderOpen',
  'Search','Filter','SortAsc','SortDesc','List','LayoutGrid','LayoutList','Table','Tags','Tag',
  'CircleDot','SquareDot','Triangle','Hexagon','Diamond','Target','Crosshair','Compass','MapPin','Map',
  'Trash2','Edit','Copy','Share','Download','Upload','Link','ExternalLink','MoreHorizontal','MoreVertical',
  'ChevronLeft','ChevronRight','ChevronUp','ChevronDown','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
  'Check','X','AlertCircle','AlertTriangle','Info','HelpCircle','Ban','CheckCircle','XCircle','Minus',
  'Sofa','Bed','Bath','Lamp','Armchair','Refrigerator','WashingMachine','Microwave','Plug','Lightbulb',
  'Percent','BarChart3','PieChart','LineChart','AreaChart','ScatterChart','Activity','Zap','Thunder','Battery',
];

export const AVAILABLE_ICONS = ALL_ICONS;

interface DynamicIconProps extends LucideProps {
  name: string;
}

export const DynamicIcon = forwardRef<SVGSVGElement, DynamicIconProps>(({ name, ...props }, ref) => {
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  if (!IconComponent) {
    return <LucideIcons.CircleDot ref={ref} {...props} />;
  }
  return <IconComponent ref={ref} {...props} />;
});

DynamicIcon.displayName = 'DynamicIcon';

export const ICON_COLORS = [
  '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6',
  '#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899',
  '#f43f5e','#78716c','#64748b','#475569','#334155','#1e293b','#18181b','#000000',
];
