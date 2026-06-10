import {
  Images,
  Landmark,
  LayoutGrid,
  List,
  LogOut,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavActionIconKey =
  | "crear"
  | "listar"
  | "categorias"
  | "clientes"
  | "finanzas"
  | "galeria"
  | "logout";

export type NavAction = {
  title: string;
  href: string;
  description: string;
  iconKey: NavActionIconKey;
  isLogout?: boolean;
};

const NAV_ICON_MAP: Record<NavActionIconKey, LucideIcon> = {
  crear: ShoppingCart,
  listar: List,
  categorias: LayoutGrid,
  clientes: Users,
  finanzas: Landmark,
  galeria: Images,
  logout: LogOut,
};

export const NAV_ICONS: Record<NavActionIconKey, React.ReactNode> = {
  crear: <ShoppingCart className="size-5" />,
  listar: <List className="size-5" />,
  categorias: <LayoutGrid className="size-5" />,
  clientes: <Users className="size-5" />,
  finanzas: <Landmark className="size-5" />,
  galeria: <Images className="size-5" />,
  logout: <LogOut className="size-5" />,
};

export const NAV_ICONS_LARGE: Record<NavActionIconKey, React.ReactNode> =
  Object.fromEntries(
    Object.entries(NAV_ICON_MAP).map(([key, Icon]) => [
      key,
      <Icon key={key} className="size-12 text-primary" />,
    ]),
  ) as Record<NavActionIconKey, React.ReactNode>;

export const NAV_ACTIONS: NavAction[] = [
  {
    title: "Crear pedido",
    href: "/crear-pedido",
    description: "Registra un nuevo pedido en el sistema",
    iconKey: "crear",
  },
  {
    title: "Listar pedidos",
    href: "/listar-pedidos",
    description: "Consulta el listado de pedidos existentes",
    iconKey: "listar",
  },
  {
    title: "Gestión de temáticas",
    href: "/gestion-categorias",
    description: "Administra las temáticas del sistema",
    iconKey: "categorias",
  },
  {
    title: "Clientes",
    href: "/clientes",
    description: "Administra el registro de clientes",
    iconKey: "clientes",
  },
  {
    title: "Finanzas",
    href: "/finanzas",
    description: "Reporte de pedidos completados por mes",
    iconKey: "finanzas",
  },
  {
    title: "Galería",
    href: "/galeria",
    description: "Imágenes referenciales de las decoraciones",
    iconKey: "galeria",
  },
  {
    title: "Cerrar sesión",
    href: "/logout",
    description: "Salir de la aplicación",
    iconKey: "logout",
    isLogout: true,
  },
];
