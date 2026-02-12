import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import CategoryIcon from "@mui/icons-material/Category";
import ListIcon from "@mui/icons-material/List";
import LogoutIcon from "@mui/icons-material/Logout";

export type NavActionIconKey = "crear" | "listar" | "categorias" | "logout";

export type NavAction = {
  title: string;
  href: string;
  description: string;
  iconKey: NavActionIconKey;
  isLogout?: boolean;
};

export const NAV_ICONS: Record<NavActionIconKey, React.ReactNode> = {
  crear: <AddShoppingCartIcon />,
  listar: <ListIcon />,
  categorias: <CategoryIcon />,
  logout: <LogoutIcon />,
};

export const NAV_ICONS_LARGE: Record<NavActionIconKey, React.ReactNode> = {
  crear: <AddShoppingCartIcon sx={{ fontSize: 48, color: "primary.main" }} />,
  listar: <ListIcon sx={{ fontSize: 48, color: "primary.main" }} />,
  categorias: <CategoryIcon sx={{ fontSize: 48, color: "primary.main" }} />,
  logout: <LogoutIcon sx={{ fontSize: 48, color: "primary.main" }} />,
};

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
    title: "Gestión de categorías",
    href: "/gestion-categorias",
    description: "Administra las categorías del sistema",
    iconKey: "categorias",
  },
  {
    title: "Cerrar sesión",
    href: "/logout",
    description: "Salir de la aplicación",
    iconKey: "logout",
    isLogout: true,
  },
];
