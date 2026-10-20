import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { CreditCard, LayoutDashboard, LogOut, Settings, ShoppingBag } from "lucide-react";
import { PanelLayout } from "@/components/site/PanelLayout";
import { Button } from "@/components/ui/button";
import { adminLogoutFn, currentAdminFn } from "@/lib/admin-panel.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    const admin = await currentAdminFn();
    if (!admin) throw redirect({ to: "/admin/login" });
    return { admin };
  },
  head: () => ({ meta: [{ title: "Admin — JUJ" }, { name: "robots", content: "noindex" }] }),
  component: Layout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders & sales", icon: ShoppingBag },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function Layout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  if (path === "/admin/login") return <Outlet />;
  const logout = async () => {
    await adminLogoutFn();
    navigate({ to: "/admin/login" });
  };
  return (
    <PanelLayout
      title="Admin panel"
      nav={nav}
      testId="admin-panel"
      footer={
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout} data-testid="admin-logout-button">
          <LogOut className="h-4 w-4" /> Log out
        </Button>
      }
    >
      <Outlet />
    </PanelLayout>
  );
}
