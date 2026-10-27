export const metadata = { title: { absolute: 'Admin' }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }) {
  return <div className="admin-root">{children}</div>;
}
